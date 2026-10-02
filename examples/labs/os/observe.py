#!/usr/bin/env python3
"""Bounded Linux observations using only child processes and temporary files we own."""
import json
import os
from pathlib import Path
import resource
import selectors
import subprocess
import sys
import tempfile
import time


def process_state(pid):
    return Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()[0]


def child():
    print('ready', flush=True)
    sys.stdin.readline()
    before = resource.getrusage(resource.RUSAGE_SELF)
    memory = bytearray(8 * 1024 * 1024)
    for offset in range(0, len(memory), 4096):
        memory[offset] = 1
    end = time.monotonic() + .2
    iterations = 0
    while time.monotonic() < end:
        iterations += 1
    after = resource.getrusage(resource.RUSAGE_SELF)
    print(json.dumps({'minor_faults_added': after.ru_minflt - before.ru_minflt,
                      'max_rss_kib': after.ru_maxrss, 'iterations': iterations}), flush=True)


def observe():
    if sys.platform != 'linux' or not Path('/proc/self/stat').exists():
        raise RuntimeError('This lab requires Linux with /proc mounted; WSL is supported.')
    process = subprocess.Popen([sys.executable, __file__, '--child'], stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE, text=True)
    try:
        with selectors.DefaultSelector() as readiness:
            readiness.register(process.stdout, selectors.EVENT_READ)
            if not readiness.select(timeout=3):
                raise RuntimeError('Child startup exceeded three seconds.')
        if process.stdout.readline().strip() != 'ready':
            raise RuntimeError('Child did not become ready.')
        deadline = time.monotonic() + 2
        state = process_state(process.pid)
        while state != 'S' and time.monotonic() < deadline:
            time.sleep(.002)
            state = process_state(process.pid)
        blocked = state
        process.stdin.write('go\n')
        process.stdin.flush()
        saw_running = False
        for _ in range(80):
            try:
                saw_running |= process_state(process.pid) == 'R'
            except FileNotFoundError:
                break
            time.sleep(.003)
        output, _ = process.communicate(timeout=3)
        memory = json.loads(output)
        with tempfile.TemporaryDirectory(prefix='cs-os-lab-') as directory:
            root = Path(directory)
            usage_before = os.statvfs(root)
            for index in range(32):
                (root / f'empty-{index}').touch()
            (root / 'data').write_bytes(bytes(256 * 1024))
            usage_after = os.statvfs(root)
            files = len(list(root.iterdir()))
            filesystem = {'owned_files': files, 'logical_data_bytes': (root / 'data').stat().st_size,
                          'free_blocks_before': usage_before.f_bavail, 'free_blocks_after': usage_after.f_bavail,
                          'free_inodes_before': usage_before.f_favail, 'free_inodes_after': usage_after.f_favail}
        return {'blocked_state': blocked, 'observed_running': saw_running, 'memory': memory,
                'filesystem': filesystem, 'cleanup': 'child exited and temporary directory removed'}
    finally:
        if process.poll() is None:
            process.kill()
            process.communicate(timeout=3)


if __name__ == '__main__':
    if '--child' in sys.argv:
        child()
    else:
        print(json.dumps(observe(), indent=2))
