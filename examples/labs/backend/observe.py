"""Observe only owned Java processes; no PID argument or process discovery."""
import json
import os
from pathlib import Path
import queue
import re
import shutil
import subprocess
import tempfile
import threading

HERE = Path(__file__).resolve().parent


def tools():
    found = {name: shutil.which(name) for name in ('java', 'javac', 'jcmd')}
    if not all(found.values()):
        raise RuntimeError('Install a complete JDK 17+ with java, javac and jcmd on PATH')
    return found


def read_lines(stream, messages):
    try:
        for line in stream:
            messages.put(line)
    finally:
        messages.put(None)


def receive(messages, timeout=5):
    try:
        line = messages.get(timeout=timeout)
    except queue.Empty as error:
        raise RuntimeError('Owned Java target did not become ready before deadline') from error
    if line is None:
        raise RuntimeError('Owned Java target closed its output unexpectedly')
    return json.loads(line)


def byte_array_bytes(histogram):
    for line in histogram.splitlines():
        match = re.match(r'\s*\d+:\s+\d+\s+(\d+)\s+\[B(?:\s|$)', line)
        if match:
            return int(match.group(1))
    raise ValueError('No byte[] class entry in JVM histogram')


def terminate_owned(process):
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=3)
    for stream in (process.stdin, process.stdout, process.stderr):
        if stream:
            stream.close()


def observe_mode(mode, classes, commands):
    if mode not in ('deadlock', 'retained'):
        raise ValueError('Only owned deadlock and retained fixtures are supported')
    environment = {**os.environ, 'LC_ALL': 'C'}
    for option in ('JAVA_TOOL_OPTIONS', 'JDK_JAVA_OPTIONS', '_JAVA_OPTIONS'):
        environment.pop(option, None)
    process = subprocess.Popen(
        [commands['java'], '-Xms32m', '-Xmx64m', '-cp', str(classes), 'DebugTarget', mode],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, encoding='utf-8', env=environment)
    messages = queue.Queue()
    reader = threading.Thread(target=read_lines, args=(process.stdout, messages), daemon=True)
    reader.start()
    try:
        ready = receive(messages)
        if ready != {'pid': process.pid, 'mode': mode, 'ready': True} or process.poll() is not None:
            raise RuntimeError('Readiness did not identify the live owned process')

        def diagnostic(command):
            if process.poll() is not None:
                raise RuntimeError('Owned process exited before diagnostic collection')
            return subprocess.run([commands['jcmd'], str(process.pid), *command],
                                  capture_output=True, text=True, check=True, timeout=8).stdout

        if mode == 'deadlock':
            evidence = diagnostic(['Thread.print', '-l'])
            checks = {'left_thread': '"lab-left"' in evidence,
                      'right_thread': '"lab-right"' in evidence,
                      'blocked': evidence.count('java.lang.Thread.State: BLOCKED') >= 2,
                      'cycle': 'Found one Java-level deadlock' in evidence}
            if not all(checks.values()):
                raise AssertionError(f'Thread dump did not prove the expected deadlock: {checks}')
            return {'owned_pid': process.pid, 'checks': checks, 'thread_dump': evidence}
        before = byte_array_bytes(diagnostic(['GC.class_histogram']))
        process.stdin.write('c\n')
        process.stdin.flush()
        if receive(messages) != {'cleared': True}:
            raise AssertionError('Target did not confirm clearing its owned roots')
        after = byte_array_bytes(diagnostic(['GC.class_histogram']))
        if before - after < 8 * 1024 * 1024:
            raise AssertionError(f'Expected at least 8 MiB retained-byte reduction: {before}, {after}')
        return {'owned_pid': process.pid, 'byte_array_bytes_before': before,
                'byte_array_bytes_after': after, 'released_bytes': before - after,
                'root_change': 'DebugTarget.CACHE.clear()'}
    finally:
        terminate_owned(process)
        reader.join(timeout=1)


def observe():
    commands = tools()
    with tempfile.TemporaryDirectory(prefix='cs-jvm-diagnostics-') as directory:
        classes = Path(directory)
        subprocess.run([commands['javac'], '--release', '17', '-d', str(classes),
                        str(HERE / 'DebugTarget.java')], capture_output=True, text=True,
                       check=True, timeout=15)
        return {'deadlock': observe_mode('deadlock', classes, commands),
                'retained_memory': observe_mode('retained', classes, commands),
                'limits': 'Synthetic 12 MiB retention and two-thread cycle; not a production profile'}


if __name__ == '__main__':
    print(json.dumps(observe(), indent=2))
