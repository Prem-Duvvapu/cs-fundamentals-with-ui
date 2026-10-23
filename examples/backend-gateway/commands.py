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


def _restore_policy(previous, outer):
    # A restored caller handler can raise; every remaining restoration must still run.
    try:
        signal.signal(signal.SIGTERM, previous[signal.SIGTERM])
    finally:
        try:
            signal.signal(signal.SIGINT, previous[signal.SIGINT])
        finally:
            _cancellation.state = outer


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
        _restore_policy(previous, outer)


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
    def start(cls, seconds=600):
        if not 0 < seconds <= 600:
            raise ValueError("Budget must be within 600 seconds")
        return cls(time.monotonic() + seconds)

    def remaining(self):
        remaining = self.deadline - time.monotonic()
        if remaining <= 0:
            raise LabFailure("Owned lab execution deadline exhausted")
        return remaining


def environment():
    env = {key:value for key,value in os.environ.items() if key not in {
        'JAVA_TOOL_OPTIONS','JDK_JAVA_OPTIONS','_JAVA_OPTIONS','PYTHONPATH','PYTHONSTARTUP','PYTHONINSPECT','CLASSPATH'}}
    env['LC_ALL'] = 'C.UTF-8'
    return env


def stop(process, group=True):
    # A completed session leader can leave descendants holding its stdout pipe.
    # The new-session group remains owned even after that leader has exited.
    try:
        if group:
            os.killpg(process.pid, signal.SIGKILL)
        elif process.poll() is None:
            process.kill()
    except ProcessLookupError:
        pass
    try:
        process.wait(timeout=1)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=1)


def run(args, cwd, budget, *, timeout=15, check=True, new_session=True, output_limit=128 * 1024):
    if not 0 < timeout <= 600 or not 1 <= output_limit <= 1048576:
        raise ValueError('finite_command_and_output_bounds_required')
    duration = min(timeout, budget.remaining())
    process = None
    deadline = time.monotonic() + duration
    output = bytearray()
    try:
        with defer_cancellation():
            process = subprocess.Popen([str(x) for x in args], cwd=cwd, env=environment(), stdout=subprocess.PIPE,
                                       stderr=subprocess.STDOUT, start_new_session=new_session)
        with selectors.DefaultSelector() as selector:
            selector.register(process.stdout, selectors.EVENT_READ)
            while selector.get_map():
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise LabFailure(f"Owned {os.path.basename(str(args[0]))} command deadline")
                for key, _ in selector.select(remaining):
                    chunk = os.read(key.fileobj.fileno(), 8192)
                    if not chunk:
                        selector.unregister(key.fileobj)
                    else:
                        if len(output) + len(chunk) > output_limit:
                            raise LabFailure("Owned command output limit")
                        output.extend(chunk)
        try:
            code = process.wait(timeout=max(.001, deadline - time.monotonic()))
        except subprocess.TimeoutExpired as error:
            raise LabFailure("Owned command completion deadline") from error
        text = output.decode('utf-8', errors='replace')
        if check and code:
            raise LabFailure(f"Owned {os.path.basename(str(args[0]))} failed ({code}): {text[-1500:]}")
        return code, text
    finally:
        if process is not None:
            with defer_cancellation():
                stop(process, new_session)
                process.stdout.close()
