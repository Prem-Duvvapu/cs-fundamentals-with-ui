"""Bounded commands operating on synthetic inputs and explicitly owned children."""
import os
import selectors
import signal
import subprocess
import time
from dataclasses import dataclass


class LabFailure(RuntimeError):
    pass


@dataclass
class Budget:
    deadline: float

    @classmethod
    def start(cls, seconds=180):
        if not 0 < seconds <= 180:
            raise ValueError("Budget must be within 180 seconds")
        return cls(time.monotonic() + seconds)

    def remaining(self):
        remaining = self.deadline - time.monotonic()
        if remaining <= 0:
            raise LabFailure("Owned lab execution deadline exhausted")
        return remaining


def environment():
    env = {k: v for k, v in os.environ.items() if not k.startswith('GIT_') and k not in {
        'JAVA_TOOL_OPTIONS', 'JDK_JAVA_OPTIONS', '_JAVA_OPTIONS', 'MAVEN_OPTS', 'MAVEN_ARGS', 'MAVEN_EXT_CLASS_PATH', 'MAVEN_HOME', 'M2_HOME', 'MAVEN_PROJECTBASEDIR', 'PYTHONPATH', 'PYTHONSTARTUP', 'PYTHONINSPECT', 'CLASSPATH'}}
    env.update(GIT_CONFIG_NOSYSTEM='1', GIT_CONFIG_GLOBAL=os.devnull, GIT_TERMINAL_PROMPT='0',
               MAVEN_OPTS='-Xmx128m -Djava.awt.headless=true', MAVEN_SKIP_RC='1', LC_ALL='C.UTF-8')
    return env


def stop(process, group=True):
    if process.poll() is None:
        try:
            if group:
                os.killpg(process.pid, signal.SIGKILL)
            else:
                process.kill()
        except ProcessLookupError:
            pass
    try:
        process.wait(timeout=1)
    except subprocess.TimeoutExpired:
        process.kill()


def run(args, cwd, budget, *, timeout=15, check=True, new_session=True, output_limit=128 * 1024):
    duration = min(timeout, budget.remaining())
    process = subprocess.Popen([str(x) for x in args], cwd=cwd, env=environment(), stdout=subprocess.PIPE,
                               stderr=subprocess.STDOUT, start_new_session=new_session)
    deadline = time.monotonic() + duration
    output = bytearray()
    try:
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
        stop(process, new_session)
        process.stdout.close()
