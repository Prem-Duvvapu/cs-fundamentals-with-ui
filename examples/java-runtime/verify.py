"""Owned Java21 loopback and JFR observations. No skips, global installs or foreign PIDs."""
import json
import os
from pathlib import Path
import queue
import re
import shutil
import subprocess
import threading

ROOT = Path(__file__).resolve().parent


def toolchain(home=None):
    selected = home or os.environ.get('JAVA_RUNTIME_HOME') or os.environ.get('JAVA_HOME')
    if selected:
        base = Path(selected).resolve()
    else:
        executable = shutil.which('java')
        if not executable:
            raise RuntimeError('Set JAVA_RUNTIME_HOME to an installed complete JDK21+')
        base = Path(executable).resolve().parent.parent
    result = {name: str(base / 'bin' / name) for name in ('java', 'javac', 'jcmd', 'jfr')}
    if not all(Path(value).is_file() for value in result.values()):
        raise RuntimeError('A complete selected JDK21+ with java/javac/jcmd/jfr is required')
    version = subprocess.run([result['java'], '-version'], capture_output=True, text=True, check=True, timeout=5)
    match = re.search(r'version "(\d+)', version.stderr)
    if not match or int(match.group(1)) < 21:
        raise RuntimeError('This optional standalone lab needs JDK21+; the platform stays on Java17')
    result['version'] = version.stderr.strip()
    return result


def compile_sources(commands, destination):
    destination.mkdir(parents=True, exist_ok=True)
    subprocess.run([commands['javac'], '--release', '21', '-d', str(destination),
                    str(ROOT / 'VirtualThreadsLab.java'), str(ROOT / 'BusyWorker.java')],
                   capture_output=True, text=True, check=True, timeout=20)


def concurrency(commands, classes, evidence):
    result = subprocess.run([commands['java'], '-Xms16m', '-Xmx96m', '-XX:ActiveProcessorCount=2',
                             '-cp', str(classes), 'VirtualThreadsLab'], capture_output=True,
                            text=True, check=True, timeout=15)
    report = json.loads(result.stdout)
    evidence.mkdir(parents=True, exist_ok=True)
    (evidence / 'concurrency.json').write_text(json.dumps(report, indent=2) + '\n')
    return report


def hot_loop_samples(recording):
    events = recording.get('recording', {}).get('events', [])
    found = []
    for event in events:
        values = event.get('values', {})
        thread = values.get('sampledThread', {})
        if event.get('type') != 'jdk.ExecutionSample' or thread.get('javaName') != 'lab-hotloop':
            continue
        frames = (values.get('stackTrace') or {}).get('frames', [])
        if any(frame.get('method', {}).get('type', {}).get('name') == 'BusyWorker'
               and frame.get('method', {}).get('name') == 'hotLoop' for frame in frames):
            found.append(event)
    return len(found)


def read_lines(stream, messages):
    try:
        for line in stream:
            messages.put(line)
    finally:
        messages.put(None)


def receive(messages, timeout=8):
    try:
        value = messages.get(timeout=timeout)
    except queue.Empty as failure:
        raise RuntimeError('Owned Java readiness deadline') from failure
    if value is None:
        raise RuntimeError('Owned Java exited before its expected observation')
    return json.loads(value)


def busy_worker(commands, classes, evidence):
    evidence.mkdir(parents=True, exist_ok=True)
    recording = evidence / 'owned-cpu.jfr'
    messages = queue.Queue()
    with (evidence / 'worker-stderr.txt').open('w') as errors:
        process = subprocess.Popen([commands['java'], '-Xms16m', '-Xmx96m', '-XX:ActiveProcessorCount=1',
                                    '-cp', str(classes), 'BusyWorker', str(recording)],
                                   stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=errors, text=True)
        reader = threading.Thread(target=read_lines, args=(process.stdout, messages), daemon=True)
        reader.start()
        try:
            ready = receive(messages)
            if ready != {'ready': True, 'pid': process.pid} or process.poll() is not None:
                raise RuntimeError('Diagnostic target must be the live child created by this runner')
            process.stdin.write('g\n')
            process.stdin.flush()
            if receive(messages) != {'running': True}:
                raise RuntimeError('Owned worker did not report its running boundary')
            dump = subprocess.run([commands['jcmd'], str(process.pid), 'Thread.print', '-l'],
                                  capture_output=True, text=True, check=True, timeout=5).stdout
            section = re.search(r'"lab-hotloop".*?(?=\n"|\Z)', dump, re.S)
            if not section or 'java.lang.Thread.State: RUNNABLE' not in section.group():
                raise AssertionError('Thread dump must show the actual owned hot-loop thread RUNNABLE')
            (evidence / 'owned-thread-dump.txt').write_text(dump)
            process.wait(timeout=12)
            if process.returncode != 0:
                raise RuntimeError('Owned CPU worker failed or reached its process watchdog')
            summary = receive(messages)
            if summary.get('cpuNanos', 0) < 200_000_000 or summary.get('batches', 0) < 1:
                raise AssertionError('Actual thread CPU work was not observed')
            printed = subprocess.run([commands['jfr'], 'print', '--json', '--stack-depth', '16',
                                      '--events', 'jdk.ExecutionSample', str(recording)],
                                     capture_output=True, text=True, check=True, timeout=8)
            samples = json.loads(printed.stdout)
            count = hot_loop_samples(samples)
            if count < 1:
                raise AssertionError('Actual JFR execution samples must identify BusyWorker.hotLoop on lab-hotloop')
            summary['hotLoopJfrSamples'] = count
            summary['recordingBytes'] = recording.stat().st_size
            summary['ownedPid'] = process.pid
            summary['jdkVersion'] = commands['version']
            (evidence / 'cpu-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
            (evidence / 'execution-samples.json').write_text(json.dumps(samples, indent=2) + '\n')
            return summary
        finally:
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=2)
            reader.join(timeout=1)
            process.stdin.close()
            process.stdout.close()


if __name__ == '__main__':
    commands = toolchain()
    classes = ROOT / 'build' / 'classes'
    compile_sources(commands, classes)
    evidence = ROOT / 'build' / 'evidence'
    print(json.dumps({'concurrency': concurrency(commands, classes, evidence),
                      'cpu': busy_worker(commands, classes, evidence)}, indent=2))
