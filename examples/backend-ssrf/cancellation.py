"""Executable-boundary cancellation and its Linux-only owned subprocess regression."""
from contextlib import contextmanager
import ctypes
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import tempfile
import threading
import time

sys.path.insert(0, str(Path(__file__).resolve().parent))


class Cancelled(KeyboardInterrupt):
    pass


_cancellation = threading.local()


def _restore_policy(previous, outer):
    # A restored caller handler can raise; every remaining restoration must still run.
    try:
        signal.signal(signal.SIGTERM, previous[signal.SIGTERM])
    finally:
        try:
            signal.signal(signal.SIGINT, previous[signal.SIGINT])
        finally:
            _cancellation.state = outer


class CancellationScope:
    """Executable-only TERM/INT policy; preserve caller handlers and masks."""
    def __enter__(self):
        if threading.current_thread() is not threading.main_thread():
            raise RuntimeError('cancellation_scope_requires_executable_main_thread')
        self.previous = {number:signal.getsignal(number) for number in (signal.SIGTERM, signal.SIGINT)}
        self.outer = getattr(_cancellation, 'state', None)
        self.state = {'depth':0, 'requested':False, 'delivered':False}
        def stop(signum, frame):
            if self.state['requested']:
                return
            self.state['requested'] = True
            if not self.state['depth']:
                self.state['delivered'] = True
                raise Cancelled('termination_requested')
        try:
            _cancellation.state = self.state
            for number in self.previous:
                signal.signal(number, stop)
        except BaseException:
            _restore_policy(self.previous, self.outer)
            raise
        return self

    def __exit__(self, *args):
        _restore_policy(self.previous, self.outer)


@contextmanager
def defer_cancellation():
    # Another unmasked thread can schedule Python's main-thread signal handler;
    # masking only the spawning thread does not establish cleanup ownership.
    state = getattr(_cancellation, 'state', None)
    if state is None:
        yield
        return
    state['depth'] += 1
    try:
        yield
    finally:
        state['depth'] -= 1
        if not state['depth'] and state['requested'] and not state['delivered']:
            state['delivered'] = True
            raise Cancelled('termination_requested')


def victim(directory):
    from fetch import FixturePermit, Limits, Partner, PartnerFetcher, Resolver, secure_context
    from fixtures import Fixture, certificate
    directory = Path(directory)
    resolver, fixture, cancelled = None, None, False
    try:
        with CancellationScope(), tempfile.TemporaryDirectory(prefix='tls-', dir=directory) as certificates:
            cert, key = certificate(certificates, 'partner.example.test')
            with Fixture(cert, key) as fixture:
                partner = Partner('https','partner.example.test',fixture.port)
                resolver = Resolver([{'sleep':5, 'answers':[{'family':socket.AF_INET, 'address':'127.0.0.1'}]}])
                def started(pid):
                    # Handshake is private test state, never a published evidence artifact.
                    start = Path(f'/proc/{pid}/stat').read_text().split()[21]
                    temporary = directory/'ready.tmp'
                    temporary.write_text(json.dumps({'resolverPid':pid, 'processStart':start}))
                    temporary.replace(directory/'ready.json')
                resolver.on_started = started
                fetcher = PartnerFetcher([partner], resolver=resolver, limits=Limits(overall=3, operation=2),
                                         fixture_permits=[FixturePermit(partner,'127.0.0.1')], context=secure_context(cert))
                fetcher.fetch(f'https://{partner.host}:{partner.port}/documents/ok')
    except Cancelled:
        cancelled = True
    report = {'cancelled':cancelled, 'resolverReaped':bool(resolver and resolver.events and resolver.events[-1]['reaped']),
              'resolverExitCode':resolver.events[-1]['returnCode'] if resolver and resolver.events else None,
              'fixtureClosed':bool(fixture and fixture.server.socket.fileno() == -1 and not fixture.thread.is_alive()),
              'temporaryTLSMaterialRemoved':not any(directory.glob('tls-*'))}
    print(json.dumps(report))
    return 130 if cancelled else 1


def supervise():
    # Only this short-lived test supervisor becomes a subreaper, never the test runner/user shell.
    if not sys.platform.startswith('linux') or ctypes.CDLL(None, use_errno=True).prctl(36,1,0,0,0):
        raise RuntimeError('linux_owned_subreaper_required_for_cancellation_regression')
    process, ready = None, None
    with tempfile.TemporaryDirectory(prefix='owned-ssrf-cancellation-') as directory:
        try:
            with defer_cancellation():
                process = subprocess.Popen([sys.executable, '-I', str(Path(__file__).resolve()), '--victim', directory],
                                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, start_new_session=True)
            deadline = time.monotonic()+4
            ready_file = Path(directory)/'ready.json'
            while time.monotonic() < deadline:
                if ready_file.exists():
                    ready = json.loads(ready_file.read_text())
                    break
                if process.poll() is not None:
                    raise RuntimeError('cancellation_victim_exited_before_ready')
                time.sleep(.01)
            if ready is None:
                raise RuntimeError('resolver_not_observed_active_before_termination')
            os.kill(process.pid, signal.SIGTERM)
            output, error = process.communicate(timeout=4)
            if process.returncode != 130 or error or len(output) > 2048:
                raise RuntimeError('verifier_boundary_did_not_cancel_cleanly')
            report = json.loads(output)
            if not all(report.get(key) is True for key in ['cancelled','resolverReaped','fixtureClosed','temporaryTLSMaterialRemoved']) or report.get('resolverExitCode') != -9:
                raise RuntimeError('actual_cancellation_cleanup_evidence_missing')
            if Path(f'/proc/{ready["resolverPid"]}').exists():
                raise RuntimeError('owned_resolver_orphan_or_zombie_after_parent_exit')
            print(json.dumps(report))
        finally:
            if process is not None and process.poll() is None:
                process.send_signal(signal.SIGTERM)
                try:
                    process.communicate(timeout=3)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.communicate(timeout=2)
            if ready is None and (Path(directory)/'ready.json').exists():
                ready = json.loads((Path(directory)/'ready.json').read_text())
            if ready is not None:
                pid = ready['resolverPid']
                stat = Path(f'/proc/{pid}/stat')
                if stat.exists() and stat.read_text().split()[21] == ready['processStart']:
                    os.killpg(pid, signal.SIGKILL)
                    try:
                        os.waitpid(pid, 0)
                    except ChildProcessError:
                        pass


def run_regression():
    process = None
    try:
        with defer_cancellation():
            process = subprocess.Popen([sys.executable, '-I', str(Path(__file__).resolve())],
                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, start_new_session=True)
        output, error = process.communicate(timeout=10)
        if process.returncode or error or len(output) > 2048:
            raise RuntimeError('owned_cancellation_regression_failed')
        return json.loads(output)
    finally:
        if process is not None and process.poll() is None:
            process.send_signal(signal.SIGTERM)
            try:
                process.communicate(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.communicate(timeout=2)


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == '--victim':
        raise SystemExit(victim(sys.argv[2]))
    if len(sys.argv) != 1:
        raise SystemExit('no_destination_arguments_allowed')
    with CancellationScope():
        supervise()
