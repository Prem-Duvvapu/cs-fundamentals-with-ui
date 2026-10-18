"""Real PostgreSQL plan/wait observations in a uniquely owned disposable schema."""
import json
import os
from pathlib import Path
import queue
import re
import shutil
import subprocess
import threading
import time
import uuid


def local_environment(source=None):
    env = dict(os.environ if source is None else source)
    host = env.get('PGHOST', '')
    if ',' in host:
        raise ValueError('Multiple PostgreSQL hosts are refused')
    if host and host not in ('localhost', '127.0.0.1', '::1') and not host.startswith('/'):
        raise ValueError('This lab permits only local sockets or loopback PostgreSQL')
    if env.get('PGHOSTADDR') not in (None, '', '127.0.0.1', '::1'):
        raise ValueError('Remote PGHOSTADDR is refused')
    for name in ('PGSERVICE', 'PGSERVICEFILE'):
        if env.get(name):
            raise ValueError('Service profiles are refused; configure local PGHOST/PGPORT/PGUSER explicitly')
    database = env.get('PGDATABASE', 'postgres')
    if not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_$-]{0,62}', database):
        raise ValueError('PGDATABASE must be a plain local database name, not a URI or connection string')
    if not env.get('PGPORT', '5432').isdigit() or not 1 <= int(env.get('PGPORT', '5432')) <= 65535:
        raise ValueError('Invalid PostgreSQL port')
    env.update(PGDATABASE=database, PGCONNECT_TIMEOUT='3', LC_ALL='C')
    env.pop('PGOPTIONS', None)
    return env


def command():
    executable = shutil.which('psql')
    if not executable:
        raise RuntimeError('Install PostgreSQL psql 16+ before running the database lab')
    return [executable, '-X', '-w', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose']


def sql(statement, env, timeout=8):
    return subprocess.run(command(), input=statement, capture_output=True, text=True,
                          env=env, timeout=timeout, check=True).stdout.strip()


def read_lines(stream, messages):
    try:
        for line in stream:
            messages.put(line)
    finally:
        messages.put(None)


def start_session(env, name):
    process = subprocess.Popen(command(), stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE, text=True,
                               env={**env, 'PGAPPNAME': name})
    messages = queue.Queue()
    reader = threading.Thread(target=read_lines, args=(process.stdout, messages), daemon=True)
    reader.start()
    return process, messages, reader


def send(process, statement):
    process.stdin.write(statement + '\n')
    process.stdin.flush()


def receive(messages, timeout=4):
    try:
        value = messages.get(timeout=timeout)
    except queue.Empty as error:
        raise RuntimeError('Owned PostgreSQL session did not become ready') from error
    if value is None:
        raise RuntimeError('Owned PostgreSQL session exited before readiness')
    return json.loads(value)


def close_session(session):
    process, _, reader = session
    if process.poll() is None:
        try:
            send(process, 'ROLLBACK;\n\\q')
            process.wait(timeout=2)
        except (BrokenPipeError, subprocess.TimeoutExpired):
            process.terminate()
            try:
                process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=2)
    reader.join(timeout=1)
    for stream in (process.stdin, process.stdout, process.stderr):
        stream.close()


def plan_types(node):
    return [node['Node Type']] + [kind for child in node.get('Plans', []) for kind in plan_types(child)]


def lock_observation(schema, env):
    tag = uuid.uuid4().hex
    holder = start_session(env, 'cs-lab-holder-' + tag)
    waiter = None
    try:
        send(holder[0], f"BEGIN; SET LOCAL statement_timeout='5s'; UPDATE {schema}.jobs SET payload='held' WHERE id=1; SELECT json_build_object('pid',pg_backend_pid());")
        holder_pid = receive(holder[1])['pid']
        waiter = start_session(env, 'cs-lab-waiter-' + tag)
        send(waiter[0], "SELECT json_build_object('pid',pg_backend_pid());")
        waiter_pid = receive(waiter[1])['pid']
        send(waiter[0], f"BEGIN; SET LOCAL lock_timeout='3000ms'; SET LOCAL statement_timeout='4000ms'; UPDATE {schema}.jobs SET payload='waiting' WHERE id=1;")
        deadline = time.monotonic() + 2.5
        observation = None
        while time.monotonic() < deadline:
            output = sql(f"SELECT json_build_object('pid',pid,'wait_event_type',wait_event_type,'wait_event',wait_event,'blockers',pg_blocking_pids(pid)) FROM pg_stat_activity WHERE pid={waiter_pid} AND application_name='cs-lab-waiter-{tag}';", env)
            row = json.loads(output) if output else None
            if row and row['wait_event_type'] == 'Lock' and holder_pid in row['blockers']:
                observation = row
                break
            time.sleep(0.03)
        if not observation:
            raise AssertionError('Did not observe the owned waiter blocked by its owned holder')
        waiter[0].wait(timeout=5)
        failure = waiter[0].stderr.read()
        if waiter[0].returncode == 0 or not re.search(r'\b55P03:', failure):
            raise AssertionError('Expected lock_not_available SQLSTATE 55P03 from lock_timeout')
        return {'holder_pid': holder_pid, 'waiter_pid': waiter_pid, 'wait': observation,
                'sqlstate': '55P03', 'holder_resolution': 'ROLLBACK closes the owned transaction'}
    finally:
        if waiter:
            close_session(waiter)
        close_session(holder)


def observe(environment=None):
    env = local_environment(environment)
    schema = 'cs_diag_' + uuid.uuid4().hex
    try:
        # Setup is atomic: failure before COMMIT cannot leave a partially created schema.
        sql(f"BEGIN; SET LOCAL statement_timeout='5s'; CREATE SCHEMA {schema}; CREATE TABLE {schema}.jobs(id int PRIMARY KEY, customer_id int NOT NULL, payload text NOT NULL); INSERT INTO {schema}.jobs SELECT n,n%1000,repeat('x',200) FROM generate_series(1,10000) AS n; ANALYZE {schema}.jobs; COMMIT;", env)
        query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM {schema}.jobs WHERE customer_id=42;"
        before = json.loads(sql("SET statement_timeout='5s'; " + query, env))[0]
        sql(f"SET statement_timeout='5s'; CREATE INDEX ON {schema}.jobs(customer_id); ANALYZE {schema}.jobs;", env)
        after = json.loads(sql("SET statement_timeout='5s'; " + query, env))[0]
        if before['Plan']['Actual Rows'] != 10 or after['Plan']['Actual Rows'] != 10:
            raise AssertionError('Index must preserve the ten matching fixture rows')
        plans = {'before': before, 'after': after,
                 'before_types': plan_types(before['Plan']), 'after_types': plan_types(after['Plan'])}
        locks = lock_observation(schema, env)
        return {'owned_schema': schema, 'plans': plans, 'locking': locks,
                'limits': '10000 synthetic rows, local PostgreSQL; no fixed timing/speedup claim'}
    finally:
        sql(f"SET lock_timeout='2s'; SET statement_timeout='5s'; DROP SCHEMA IF EXISTS {schema} CASCADE;", env)


if __name__ == '__main__':
    print(json.dumps(observe(), indent=2))
