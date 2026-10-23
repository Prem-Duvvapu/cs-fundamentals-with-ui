"""Bounded commands operating on synthetic inputs and explicitly owned children."""
from contextlib import contextmanager
import os
import selectors
import signal
import subprocess
import threading
import time
from dataclasses import dataclass


class LabFailure(RuntimeError):
    pass


_cancellation = threading.local()


@contextmanager
def cancellation_guard(error=LabFailure, message='Owned command cancelled'):
    """Opt-in executable policy; library calls alone leave host signals unchanged."""
    if threading.current_thread() is not threading.main_thread():
        yield
        return
    previous = {number: signal.getsignal(number) for number in (signal.SIGTERM, signal.SIGINT)}
    outer = getattr(_cancellation, 'state', None)
    state = dict(depth=0, requested=False, delivered=False, error=error, message=message)

    def cancel(_number, _frame):
        if state['requested']:
            return  # Repeated cancellation must not interrupt finite owned-child cleanup.
        state['requested'] = True
        if not state['depth']:
            state['delivered'] = True
            raise error(message)

    try:
        _cancellation.state = state
        for number in previous:
            signal.signal(number, cancel)
        yield
    finally:
        try:
            signal.signal(signal.SIGTERM, previous[signal.SIGTERM])
        finally:
            try:
                signal.signal(signal.SIGINT, previous[signal.SIGINT])
            finally:
                _cancellation.state = outer


@contextmanager
def defer_cancellation():
    # A thread mask alone cannot defer Python's handler when another thread receives TERM/INT.
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
            raise state['error'](state['message'])


@dataclass
class Budget:
    deadline: float

    @classmethod
    def start(cls, seconds=180):
        if not 0 < seconds <= 300:
            raise ValueError("Budget must be within 300 seconds")
        return cls(time.monotonic() + seconds)

    def remaining(self):
        remaining = self.deadline - time.monotonic()
        if remaining <= 0:
            raise LabFailure("Owned lab execution deadline exhausted")
        return remaining


def environment():
    env = {k: v for k, v in os.environ.items() if not k.startswith(('GIT_', 'SPRING_', 'SERVER_', 'MANAGEMENT_', 'LOGGING_', 'TASK_TRACKER_', 'OTEL_', 'LAB_')) and k not in {
        'JAVA_TOOL_OPTIONS', 'JDK_JAVA_OPTIONS', '_JAVA_OPTIONS', 'MAVEN_OPTS', 'MAVEN_ARGS', 'MAVEN_EXT_CLASS_PATH', 'MAVEN_HOME', 'M2_HOME', 'MAVEN_PROJECTBASEDIR', 'PYTHONPATH', 'PYTHONSTARTUP', 'PYTHONINSPECT', 'CLASSPATH', 'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy', 'NO_PROXY', 'no_proxy'}}
    env.update(GIT_CONFIG_NOSYSTEM='1', GIT_CONFIG_GLOBAL=os.devnull, GIT_TERMINAL_PROMPT='0',
               MAVEN_OPTS='-Xmx128m -Djava.awt.headless=true', MAVEN_SKIP_RC='1', NO_PROXY='*', no_proxy='*', LC_ALL='C.UTF-8')
    return env


class OwnedProcess:
    def __init__(self, args, cwd, budget, *, env=None, timeout=45, output_limit=131072):
        self.process = None
        self.selector = None
        self.output = bytearray()
        self.output_limit = output_limit
        self.deadline = time.monotonic()+min(timeout, budget.remaining())
        self.args, self.cwd, self.env = args, cwd, env or environment()

    def __enter__(self):
        try:
            with defer_cancellation():
                self.process = subprocess.Popen([str(value) for value in self.args], cwd=self.cwd, env=self.env,
                    stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, start_new_session=True)
            self.selector = selectors.DefaultSelector()
            self.selector.register(self.process.stdout, selectors.EVENT_READ)
            return self
        except BaseException:
            self.close()
            raise

    def pump(self, wait=.05):
        if time.monotonic() >= self.deadline:
            raise LabFailure('Owned child execution deadline')
        if self.selector.get_map():
            for key, _ in self.selector.select(min(wait, max(0, self.deadline-time.monotonic()))):
                chunk = os.read(key.fd, 8192)
                if not chunk:
                    self.selector.unregister(key.fileobj)
                self.output.extend(chunk)
                if len(self.output) > self.output_limit:
                    raise LabFailure('Owned child output limit')
        return self.process.poll()

    def finish(self):
        while self.pump() is None or self.selector.get_map():
            pass
        return self.process.wait(timeout=1), bytes(self.output)

    def close(self):
        with defer_cancellation():
            self._close()

    def _close(self):
        if self.selector is not None:
            self.selector.close()
        if self.process is None:
            return
        # Kill only the new session's group, including descendants after launcher exit.
        try:
            os.killpg(self.process.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            self.process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            pass
        try:
            os.killpg(self.process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        self.process.wait(timeout=2)
        self.process.stdout.close()
        self.process.stdin.close()

    def __exit__(self, *_):
        self.close()


def run(args, cwd, budget, *, env=None, timeout=45, check=True, output_limit=131072):
    with OwnedProcess(args, cwd, budget, env=env, timeout=timeout, output_limit=output_limit) as owned:
        code, output = owned.finish()
        if check and code:
            raise LabFailure('Owned tool failed: '+os.path.basename(str(args[0]))+' ('+str(code)+')')
        return code, output
