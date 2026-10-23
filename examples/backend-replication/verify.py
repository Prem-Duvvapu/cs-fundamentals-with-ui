#!/usr/bin/env python3
"""Actual private PostgreSQL replication histories; no shared server or cloud is controlled."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import signal
import socket
import subprocess
import tempfile
import time
import uuid

from processes import Budget, LabFailure, cancellation_guard, defer_cancellation, environment, run

ROOT = Path(__file__).resolve().parent
REPOSITORY = ROOT.parent.parent
TOOLS = ('postgres', 'initdb', 'psql', 'pg_basebackup')


def require(condition, message):
    if not condition:
        raise LabFailure(message)


def source_hashes():
    files = sorted(ROOT.glob('*.py'))
    require(not any(path.is_symlink() for path in files), 'Reviewed sources cannot be symlinks')
    return {path.name: hashlib.sha256(path.read_text().encode()).hexdigest() for path in files}


def checked_destination(path):
    path = path.absolute()
    require(not path.is_symlink() and path.resolve() == path, 'Evidence must not traverse symlinks')
    require(not path.is_relative_to(REPOSITORY) or path.is_relative_to(ROOT / 'target/evidence'),
            'Repository reports belong only under this module target/evidence')
    return path


def publish_report(path, encoded):
    require(len(encoded.encode()) <= 32768, 'Sanitized evidence byte cap')
    path = checked_destination(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path = checked_destination(path)
    stream = temporary = identity = None
    published = False
    try:
        # Defer through assignment, rename and complete normal staging cleanup.
        with defer_cancellation():
            try:
                stream = tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', prefix='.owned-replication-report-',
                    suffix='.json', dir=path.parent, delete=False)
                temporary = Path(stream.name)
                stat = os.fstat(stream.fileno())
                identity = (stat.st_dev, stat.st_ino)
                stream.write(encoded)
                stream.close()
                temporary.replace(path)
                published = True
            finally:
                try:
                    if stream is not None:
                        stream.close()
                finally:
                    if temporary is not None:
                        temporary.unlink(missing_ok=True)
    except BaseException:
        # A signal deferred across rename must not leave a new apparent success receipt.
        with defer_cancellation():
            if published and path.exists():
                stat = path.lstat()
                if (stat.st_dev, stat.st_ino) == identity:
                    path.unlink()
        raise


def postgres_tools(directory, budget):
    require(directory.is_absolute() and directory.is_dir(), 'An installed absolute PostgreSQL binary directory is required')
    binaries = {name: directory / name for name in TOOLS}
    for name, binary in binaries.items():
        require(binary.is_file() and os.access(binary, os.X_OK), 'Required PostgreSQL tool is unavailable')
        result = run([binary, '--version'], ROOT, budget, timeout=3, output_limit=4096)
        require(result.returncode == 0 and re.search(r'\(PostgreSQL\) 16\.', result.stdout.decode()),
                'Every tool must report actual PostgreSQL major 16')
    return binaries


def free_port():
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        return listener.getsockname()[1]


def wait_until(check, seconds, budget, label):
    deadline = time.monotonic() + min(seconds, budget.remaining())
    while True:
        if check():
            return
        if time.monotonic() >= deadline:
            raise LabFailure('Bounded observation failed: ' + label)
        time.sleep(.05)


class Cluster:
    """A fixed private directory plus exact foreground process handle; no pg_ctl/global services."""
    def __init__(self, owner, name, port):
        require(name in ('primary', 'standby'), 'Only two fixed owned cluster names are allowed')
        self.owner, self.name, self.port = owner, name, port
        self.data = owner.directory / name
        self.process = None
        self.log = None
        self.stopped = True
        self.starts = 0

    def configure(self):
        # Identical hard resource/durability settings on both copies, fresh port after each base backup.
        settings = {
            'listen_addresses': "'127.0.0.1'", 'port': str(self.port), 'unix_socket_directories': "''",
            'shared_buffers': "'16MB'", 'work_mem': "'1MB'", 'maintenance_work_mem': "'8MB'",
            'max_connections': '8', 'max_wal_senders': '2', 'max_replication_slots': '0',
            'wal_level': 'replica', 'hot_standby': 'on', 'synchronous_commit': 'on',
            'synchronous_standby_names': "''", 'fsync': 'on', 'full_page_writes': 'on',
            'wal_keep_size': "'16MB'", 'max_wal_size': "'64MB'", 'min_wal_size': "'32MB'",
            'statement_timeout': "'2s'", 'lock_timeout': "'1s'", 'idle_in_transaction_session_timeout': "'3s'",
            'logging_collector': 'off', 'log_min_messages': 'warning', 'log_connections': 'off',
            'log_disconnections': 'off', 'log_statement': "'none'", 'max_worker_processes': '0',
            'max_parallel_workers': '0', 'max_parallel_workers_per_gather': '0',
            'archive_mode': 'off', 'wal_receiver_timeout': "'3s'", 'wal_sender_timeout': "'3s'",
        }
        # Auto-conf from basebackup retains only fixed generated recovery settings.
        (self.data / 'postgresql.conf').write_text('\n'.join(key + ' = ' + value for key, value in settings.items()) + '\n')
        (self.data / 'pg_hba.conf').write_text(
            'local all all reject\n'
            'host all all 127.0.0.1/32 scram-sha-256\n'
            'host replication all 127.0.0.1/32 scram-sha-256\n')

    def start(self):
        require(self.stopped and (self.process is None or self.process.poll() is not None), 'A live owned cluster cannot be started twice')
        require(self.data.parent == self.owner.directory and not self.data.is_symlink(), 'Exact owned data directory required')
        self.configure()
        try:
            with defer_cancellation():
                self.log = open(self.owner.directory / (self.name + '.log'), 'ab', buffering=0)
                self.process = subprocess.Popen([str(self.owner.tools['postgres']), '-D', str(self.data)],
                    cwd=self.owner.directory, env=environment(), stdin=subprocess.DEVNULL,
                    stdout=self.log, stderr=subprocess.STDOUT, start_new_session=True)
                self.stopped = False
                self.starts += 1
            wait_until(self.ready, 8, self.owner.budget, 'owned cluster readiness')
            require(self.sql('SHOW data_directory') == str(self.data), 'Actual server must use the exact owned data directory')
        except BaseException:
            self.stop()
            raise

    def ready(self):
        self.check_process()
        result = self.owner.command('psql', self, sql='SELECT 1', allow_failure=True)
        return result.returncode == 0 and result.stdout.strip() == b'1'

    def check_process(self):
        require(self.process is not None and self.process.poll() is None, 'Owned postmaster exited unexpectedly')
        require((self.owner.directory / (self.name + '.log')).stat().st_size <= 524288, 'Private server log byte cap')

    def sql(self, text):
        self.check_process()
        result = self.owner.command('psql', self, sql=text)
        return result.stdout.decode().strip()

    def ids(self):
        return [int(value) for value in self.sql('SELECT id FROM replication_events ORDER BY id').splitlines()]

    def stop(self):
        # Includes first TERM/INT during a normal shutdown, not only failure paths or Popen.
        with defer_cancellation():
            if not self.stopped and self.process is not None:
                try:
                    os.killpg(self.process.pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
                try:
                    self.process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    pass
                # Kill remaining owned descendants even if the foreground launcher already exited.
                try:
                    os.killpg(self.process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                self.process.wait(timeout=2)
                self.stopped = True
            if self.log is not None:
                self.log.close()
                self.log = None

    def port_refuses_connection(self):
        with socket.socket() as client:
            client.settimeout(.2)
            return client.connect_ex(('127.0.0.1', self.port)) != 0


class OwnedPair:
    def __init__(self, tools, budget):
        self.tools, self.budget = tools, budget
        self.directory = None
        self.primary = self.standby = None
        self.role = 'lab_owner_' + uuid.uuid4().hex
        self.password = secrets.token_hex(32)
        self.closed = False

    def __enter__(self):
        # Resource installation is rollback-safe even if the first signal arrives before entry returns.
        try:
            with defer_cancellation():
                self.directory = Path(tempfile.mkdtemp(prefix='owned-pg-replication-')).resolve()
            self.directory.chmod(0o700)
            primary_port, standby_port = free_port(), free_port()
            require(standby_port != primary_port, 'Generated ephemeral ports collided; rerun with fresh ports')
            self.primary = Cluster(self, 'primary', primary_port)
            self.standby = Cluster(self, 'standby', standby_port)
            self.passfile = self.directory / 'pgpass'
            self.passfile.write_text('\n'.join(f'127.0.0.1:{port}:*:{self.role}:{self.password}' for port in (primary_port, standby_port)) + '\n')
            self.passfile.chmod(0o600)
            password_file = self.directory / 'init-password'
            password_file.write_text(self.password + '\n'); password_file.chmod(0o600)
            self.command('initdb', self.primary, arguments=('--pgdata', self.primary.data, '--username', self.role,
                '--pwfile', password_file, '--auth', 'scram-sha-256', '--encoding', 'UTF8', '--no-locale'))
            password_file.unlink()
            return self
        except BaseException:
            self.close()
            raise

    def command(self, tool, cluster, *, sql=None, arguments=(), allow_failure=False):
        require(tool in TOOLS and tool != 'postgres', 'Only fixed reviewed client tools are allowed')
        values = environment()
        values.update(PGPASSFILE=str(self.passfile), PGCONNECT_TIMEOUT='1',
                      PGOPTIONS='-c statement_timeout=2000 -c lock_timeout=1000')
        args = [self.tools[tool]]
        if tool in ('psql', 'pg_basebackup'):
            args += ['--host', '127.0.0.1', '--port', str(cluster.port), '--username', self.role, '--no-password']
        if tool == 'psql':
            args += ['--dbname', 'postgres', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1']
        args += list(arguments)
        result = run(args, self.directory, self.budget, env=values,
                     input_bytes=sql.encode() if sql is not None else None,
                     timeout=20 if tool in ('initdb', 'pg_basebackup') else 3,
                     output_limit=65536)
        if not allow_failure:
            require(result.returncode == 0, 'Owned PostgreSQL client failed: ' + tool)
        return result

    def backup(self, source, destination):
        require(destination.stopped and (destination.process is None or destination.process.poll() is not None),
                'Cannot rebuild a live cluster')
        require(source is not destination and source.sql('SELECT pg_is_in_recovery()') == 'f', 'Only the current primary can seed an owned standby')
        if destination.data.exists():
            require(destination.data.parent == self.directory and not destination.data.is_symlink(), 'Exact rebuild directory required')
            shutil.rmtree(destination.data)
        self.command('pg_basebackup', source, arguments=('--pgdata', destination.data, '--wal-method=stream',
                    '--checkpoint=fast', '--write-recovery-conf', '--no-slot'))
        # Pin physical recovery to our private passfile and generated role; never publish this config.
        with (destination.data / 'postgresql.auto.conf').open('a') as config:
            config.write("\nprimary_conninfo = 'host=127.0.0.1 port=" + str(source.port) + ' user=' + self.role
                         + ' passfile=' + str(self.passfile) + " connect_timeout=1 application_name=owned_standby'\n")

    def close(self):
        with defer_cancellation():
            if self.closed:
                return
            errors = []
            for cluster in (self.standby, self.primary):
                if cluster is not None:
                    try:
                        cluster.stop()
                    except BaseException as failure:
                        errors.append(failure)
            if not errors and self.directory is not None:
                require(self.directory.parent == Path(tempfile.gettempdir()).resolve()
                        and self.directory.name.startswith('owned-pg-replication-') and not self.directory.is_symlink(),
                        'Only the exact generated private root can be removed')
                shutil.rmtree(self.directory)
                require(not self.directory.exists(), 'Owned files remain after cleanup')
            self.closed = not errors
            if errors:
                raise LabFailure('Owned postmaster cleanup failed; no success receipt is published')

    def __exit__(self, _type, _value, _traceback):
        self.close()


def lsn_fence(cluster, target, seconds, budget, expected_timeline=1):
    require(0 < seconds <= 8, 'Finite same-timeline fence window required')
    require(re.fullmatch(r'[0-9A-F]+/[0-9A-F]+', target) is not None, 'Actual PostgreSQL LSN required')
    require(cluster.sql('SELECT pg_is_in_recovery()') == 't', 'LSN fence requires the expected physical standby role')
    require(int(cluster.sql('SELECT timeline_id FROM pg_control_checkpoint()')) == expected_timeline,
            'A numeric LSN fence cannot cross an unexpected timeline')
    start = time.monotonic()
    deadline = start + min(seconds, budget.remaining())
    checks = 0
    while True:
        checks += 1
        if cluster.sql("SELECT coalesce(pg_last_wal_replay_lsn()>='" + target + "'::pg_lsn,false)") == 't':
            return {'reached': True, 'checks': checks, 'elapsedMs': round((time.monotonic() - start) * 1000)}
        if time.monotonic() >= deadline:
            return {'reached': False, 'checks': checks, 'elapsedMs': round((time.monotonic() - start) * 1000)}
        time.sleep(.05)


def exercise(pair):
    primary, standby = pair.primary, pair.standby
    primary.start()
    require(primary.sql('SELECT pg_is_in_recovery()') == 'f', 'Original primary role')
    version = int(primary.sql('SHOW server_version_num'))
    require(160000 <= version < 170000, 'Actual PostgreSQL major 16 required')
    for setting in ('synchronous_commit', 'fsync', 'full_page_writes'):
        require(primary.sql('SHOW ' + setting) == 'on', 'Actual local commit durability setting')
    require(primary.sql('SHOW synchronous_standby_names') == '', 'Exercise requires asynchronous replication')
    original_timeline = int(primary.sql('SELECT timeline_id FROM pg_control_checkpoint()'))
    primary.sql('CREATE TABLE replication_events(id INT PRIMARY KEY,value INT NOT NULL); INSERT INTO replication_events VALUES(1,10)')
    pair.backup(primary, standby)
    standby.start()
    require(standby.sql('SELECT pg_is_in_recovery()') == 't' and standby.ids() == [1], 'Actual physical standby base state')
    wait_until(lambda: primary.sql("SELECT count(*) FROM pg_stat_replication WHERE state='streaming'") == '1',
               8, pair.budget, 'actual streaming sender')
    standby.sql('SELECT pg_wal_replay_pause()')
    wait_until(lambda: standby.sql('SELECT pg_get_wal_replay_pause_state()') == 'paused',
               3, pair.budget, 'actual WAL replay paused')
    primary.sql('BEGIN; INSERT INTO replication_events VALUES(2,20); COMMIT;')
    first_lsn = primary.sql('SELECT pg_current_wal_flush_lsn()::text')
    require(primary.ids() == [1, 2] and standby.ids() == [1], 'Acknowledged primary update must be stale on paused standby')
    paused_fence = lsn_fence(standby, first_lsn, .2, pair.budget, original_timeline)
    require(not paused_fence['reached'], 'Bounded read-your-writes fence must fail while replay is paused')
    standby.sql('SELECT pg_wal_replay_resume()')
    resumed_fence = lsn_fence(standby, first_lsn, 8, pair.budget, original_timeline)
    require(resumed_fence['reached'] and standby.ids() == [1, 2], 'Replay resume must recover the acknowledged update')
    replay = {'initialIds': [1], 'acknowledgedPrimaryIds': [1, 2], 'pausedReplicaIds': [1],
              'commitFlushLsn': first_lsn, 'pausedFence': paused_fence, 'resumedFence': resumed_fence,
              'recoveredReplicaIds': [1, 2], 'sameTimelineFenceOnly': True,
              'pauseIsNetworkPartition': False}

    standby.stop()
    require(standby.port_refuses_connection(), 'Stopped standby port must refuse connections')
    primary.sql('BEGIN; INSERT INTO replication_events VALUES(3,30); COMMIT;')
    missing_lsn = primary.sql('SELECT pg_current_wal_flush_lsn()::text')
    require(primary.ids() == [1, 2, 3], 'Unreplicated transaction must be acknowledged and queryable on old primary')
    failover_started = time.monotonic()
    primary.stop()
    require(primary.process.poll() is not None and primary.port_refuses_connection(), 'Authoritative local process fencing must precede promotion')
    old_disk_exists = (primary.data / 'PG_VERSION').is_file() and (primary.data / 'base').is_dir()
    require(old_disk_exists, 'Old data remains on its private disk at failover decision')
    standby.start()
    require(standby.sql('SELECT pg_is_in_recovery()') == 't', 'Restart stale standby in recovery before promotion')
    require(standby.sql('SELECT pg_promote(true,5)') == 't', 'Actual standby promotion must complete')
    require(standby.sql('SELECT pg_is_in_recovery()') == 'f', 'Promoted node must be a primary')
    standby.sql('CHECKPOINT')
    promoted_timeline = int(standby.sql('SELECT timeline_id FROM pg_control_checkpoint()'))
    require(promoted_timeline > original_timeline, 'Promotion must select a new actual timeline')
    require(standby.ids() == [1, 2], 'Promoted asynchronous standby must lack the acknowledged unreplicated row')
    standby.sql('BEGIN; INSERT INTO replication_events VALUES(4,40); COMMIT;')
    require(standby.ids() == [1, 2, 4], 'New timeline accepts a checked write')
    failover = {'oldPrimaryAcknowledgedIds': [1, 2, 3], 'promotedIdsBeforeNewWrite': [1, 2],
                'acknowledgedRowsMissingOnSelectedTimeline': [3], 'oldDiskPresentBeforeRebuild': old_disk_exists,
                'oldPrimaryProcessTerminalBeforePromotion': True, 'oldPrimaryPortRefusedBeforePromotion': True,
                'oldTimeline': original_timeline, 'promotedTimeline': promoted_timeline,
                'unreplicatedCommitFlushLsn': missing_lsn, 'newPrimaryIds': [1, 2, 4],
                'observedStopToCheckedWriteMs': round((time.monotonic() - failover_started) * 1000),
                'automaticFailover': False, 'multiHostFencing': False}

    pair.backup(standby, primary)
    primary.start()
    require(primary.sql('SELECT pg_is_in_recovery()') == 't', 'Former primary must rejoin only after a fresh physical rebuild')
    rebuilt_lsn = standby.sql('SELECT pg_current_wal_flush_lsn()::text')
    rebuild_fence = lsn_fence(primary, rebuilt_lsn, 8, pair.budget, promoted_timeline)
    require(rebuild_fence['reached'] and primary.ids() == [1, 2, 4], 'Rebuilt former primary must follow promoted history')
    standby.sql('BEGIN; INSERT INTO replication_events VALUES(5,50); COMMIT;')
    final_lsn = standby.sql('SELECT pg_current_wal_flush_lsn()::text')
    final_fence = lsn_fence(primary, final_lsn, 8, pair.budget, promoted_timeline)
    require(final_fence['reached'] and primary.ids() == [1, 2, 4, 5], 'Rebuilt node must replay a fresh new-timeline update')
    require(primary.starts == 2 and standby.starts == 2, 'Four actual owned foreground server launches required')
    return {'schemaVersion': 1, 'scenario': 'actual-private-postgresql-replication',
            'postgresVersionNum': version, 'durability': {'synchronousCommit': 'on', 'fsync': 'on',
            'fullPageWrites': 'on', 'synchronousStandbyNames': '', 'replicationMode': 'asynchronous'},
            'replay': replay, 'failover': failover,
            'rebuild': {'fromPromotedPrimary': True, 'recoveryRoleObserved': True,
                        'initialIds': [1, 2, 4], 'freshWriteReplayedIds': [1, 2, 4, 5],
                        'rebuildFence': rebuild_fence, 'freshWriteFence': final_fence},
            'limits': {'ownedClusters': 2, 'maxConnectionsPerCluster': 8, 'sharedBuffersMiBPerCluster': 16,
                       'workBudgetSeconds': 180, 'startupPollSeconds': 8, 'clientSeconds': 3,
                       'sqlMilliseconds': 2000, 'privateLogBytesPerCluster': 524288},
            'actualServerStarts': {'originalDirectory': primary.starts, 'standbyDirectory': standby.starts},
            'scope': 'Two private processes on one host; replay pause is not a network partition; local fencing is not STONITH; observed recovery duration is not an RTO SLA; no production capacity or multi-host HA proof'}


def verify(binary_directory, report_path):
    report_path = checked_destination(report_path)
    report_path.unlink(missing_ok=True)
    require(os.geteuid() != 0, 'Run as an unprivileged local user, never root')
    budget = Budget.start(180)
    before = source_hashes()
    tools = postgres_tools(binary_directory, budget)
    with OwnedPair(tools, budget) as pair:
        report = exercise(pair)
    require(pair.closed and not pair.directory.exists(), 'Private clusters and files must be cleaned before success')
    require(source_hashes() == before, 'Reviewed replication source changed during execution')
    report['ownedResourcesCleaned'] = True
    report['sourceSha256LF'] = before
    encoded = json.dumps(report, indent=2) + '\n'
    publish_report(report_path, encoded)
    print('PASS: actual stale read, bounded replay fence, fenced stale failover and rebuilt replica recovery; exact cleanup.')
    print('Evidence: ' + str(report_path))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--pg-bin', type=Path, default=Path('/usr/lib/postgresql/16/bin'))
    parser.add_argument('--report', type=Path, default=ROOT / 'target/evidence/verification.json')
    try:
        with cancellation_guard():
            args = parser.parse_args()
            verify(args.pg_bin, args.report)
    except Exception as failure:
        # No raw server/client log, config, credential or connection string is published.
        print('FAIL: ' + str(failure) if isinstance(failure, LabFailure) else 'FAIL: owned replication setup or verification failed', file=__import__('sys').stderr)
        raise SystemExit(1)
