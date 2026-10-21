import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
from processes import Budget, LabFailure, cancellation_guard, environment, run
from verify import HERE, publish


class HarnessTests(unittest.TestCase):
    def test_actual_startup_term_int_deferral_reaps_owned_child_before_return(self):
        previous = {number: signal.getsignal(number) for number in (signal.SIGTERM, signal.SIGINT)}
        mask = signal.pthread_sigmask(signal.SIG_BLOCK, set())
        actual = subprocess.Popen
        for number in previous:
            for worker_signal in (False, True):
                with self.subTest(signal=number, worker=worker_signal), tempfile.TemporaryDirectory(prefix='owned-ws-start-') as directory:
                    children, returned = [], []
                    ready, finish = threading.Event(), threading.Event()
                    def worker():
                        signal.pthread_sigmask(signal.SIG_UNBLOCK, {signal.SIGTERM, signal.SIGINT})
                        ready.set(); finish.wait(5)
                    thread = threading.Thread(target=worker, daemon=True); thread.start()
                    self.assertTrue(ready.wait(1))
                    def spawn(*args, **kwargs):
                        child = actual(*args, **kwargs); children.append(child)
                        observed = []
                        installed = signal.getsignal(number)
                        def observe(signum, frame): observed.append(signum); installed(signum, frame)
                        signal.signal(number, observe)
                        if worker_signal: signal.pthread_kill(thread.ident, number); time.sleep(.03)
                        else: os.kill(os.getpid(), number)
                        self.assertEqual([number], observed, 'Actual handler must execute before live Popen returns')
                        returned.append(True)
                        return child
                    try:
                        with self.assertRaises(LabFailure), cancellation_guard(), patch.object(subprocess, 'Popen', spawn):
                            run([sys.executable, '-c', 'import threading;threading.Event().wait()'], directory, Budget.start(5))
                        self.assertEqual([True], returned)
                        self.assertIsNotNone(children[0].returncode)
                        self.assertTrue(children[0].stdout.closed and children[0].stdin.closed)
                        with self.assertRaises(ProcessLookupError): os.kill(children[0].pid, 0)
                        self.assertEqual(mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
                        for sig, handler in previous.items(): self.assertIs(handler, signal.getsignal(sig))
                    finally:
                        finish.set(); thread.join(1)
                        for child in children:
                            if child.poll() is None: os.killpg(child.pid, signal.SIGKILL)
                            child.wait(timeout=2); child.stdout.close(); child.stdin.close()

    def test_real_deadline_output_and_missing_executable_are_bounded(self):
        with tempfile.TemporaryDirectory(prefix='owned-ws-bounds-') as directory:
            with self.assertRaisesRegex(LabFailure, 'deadline'):
                run([sys.executable, '-c', 'import time;time.sleep(10)'], directory, Budget.start(5), timeout=.1)
            with self.assertRaisesRegex(LabFailure, 'output limit'):
                run([sys.executable, '-c', 'print("x"*10000)'], directory, Budget.start(5), output_limit=100)
            with self.assertRaises(FileNotFoundError):
                with cancellation_guard(): run(['/no-such-owned-ws-tool'], directory, Budget.start(5))

    def test_environment_removes_credentials_configuration_options_and_proxies(self):
        with patch.dict(os.environ, SPRING_CONFIG_LOCATION='private', TASK_TRACKER_ALICE_PASSWORD='private', LAB_SESSION_IDLE_SECONDS='2',
                        JAVA_TOOL_OPTIONS='private', HTTP_PROXY='private', https_proxy='private', MAVEN_ARGS='private'):
            env = environment()
        for name in ('SPRING_CONFIG_LOCATION', 'TASK_TRACKER_ALICE_PASSWORD', 'LAB_SESSION_IDLE_SECONDS', 'JAVA_TOOL_OPTIONS', 'HTTP_PROXY', 'https_proxy', 'MAVEN_ARGS'):
            self.assertNotIn(name, env)
        self.assertEqual('*', env['NO_PROXY'])

    def test_atomic_publication_refuses_sources_symlinks_and_oversized_reports(self):
        with tempfile.TemporaryDirectory(prefix='owned-ws-publish-') as directory:
            target = Path(directory)/'existing'; target.write_text('preserve')
            link = Path(directory)/'link'; link.symlink_to(target)
            with self.assertRaises(LabFailure): publish(link, {})
            with self.assertRaises(LabFailure): publish(HERE/'README.md', {})
            with self.assertRaises(LabFailure): publish(Path(directory)/'large', {'value': 'x'*65536})
            self.assertEqual('preserve', target.read_text())
            publish(Path(directory)/'receipt.json', {'status': 'synthetic-guard-case'})
            self.assertTrue((Path(directory)/'receipt.json').exists())

    def test_library_run_does_not_install_signal_policy(self):
        previous = {number: signal.getsignal(number) for number in (signal.SIGTERM, signal.SIGINT)}
        with tempfile.TemporaryDirectory(prefix='owned-ws-library-') as directory:
            code, output = run([sys.executable, '-c', 'print("bounded")'], directory, Budget.start(5))
        self.assertEqual((0, b'bounded\n'), (code, output))
        for number, handler in previous.items(): self.assertIs(handler, signal.getsignal(number))


if __name__ == '__main__': unittest.main(verbosity=2)
