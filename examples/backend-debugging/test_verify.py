import json
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
from processes import Budget, LabFailure, OwnedProcess, cancellation_guard, environment, run
from verify import HERE, publish, verify


class DebuggingTests(unittest.TestCase):
    def test_actual_spring_profile_property_origins_http_bad_startup_and_repair(self):
        observed = []
        result = verify(part='configuration', observe=observed.append)
        cases = {row['name']: row for row in result['configurations']}
        self.assertEqual(6, len(cases))
        sources = ['application.properties', 'application-production.properties', 'environment-variable', 'command-line']
        for name, source in zip(['memory-default', 'production-profile', 'production-environment', 'production-cli'], sources):
            self.assertEqual(source, cases[name]['orderedCandidates'][0]['source'])
            self.assertEqual(200, cases[name]['healthStatus'])
            self.assertTrue(cases[name]['childReaped'])
        cli = cases['production-cli']
        self.assertEqual(['command-line', 'environment-variable', 'application-production.properties', 'application.properties'],
                         [row['source'] for row in cli['orderedCandidates']])
        self.assertEqual(['health', 'metrics'], cli['boundExposure'])
        self.assertEqual('startup-failed', cases['bad-port']['state'])
        self.assertEqual('ready', cases['memory-repaired']['state'])
        self.assertTrue(result['importedSourcesUnchanged']); self.assertTrue(result['ownedWorkspaceRemoved'])
        self.assertFalse(observed[0].exists())
        encoded = json.dumps(result)
        self.assertNotIn(str(observed[0]), encoded)
        for marker in ('TASK_TRACKER_ALICE_PASSWORD', 'jdbc:h2:file:', 'Authorization', 'password='):
            self.assertNotIn(marker, encoded)
        publish(result, HERE/'target/evidence/configuration.json')

    def test_actual_jdi_breakpoint_condition_steps_exception_and_exact_target_cleanup(self):
        observed = []
        result = verify(part='debugger', observe=observed.append)
        actual = result['debugger']
        self.assertEqual((3, 1, 1), (actual['conditionalChecks'], actual['conditionalMatches'], actual['caughtExceptions']))
        self.assertEqual('java.lang.IllegalArgumentException', actual['exceptionType'])
        self.assertEqual('com.csfundamentals.example.TaskService.create', actual['exceptionLocation'])
        self.assertEqual('TaskServiceDebugTarget.main', actual['catchLocation'])
        self.assertTrue(actual['ownedDebuggeeReaped']); self.assertFalse(actual['guiOrHumanSession'])
        self.assertFalse(observed[0].exists()); self.assertTrue(result['importedSourcesUnchanged'])
        publish(result, HERE/'target/evidence/debugger.json')

    def test_real_owned_startup_defers_term_and_int_before_popen_assignment(self):
        previous = {number: signal.getsignal(number) for number in (signal.SIGTERM, signal.SIGINT)}
        previous_mask = signal.pthread_sigmask(signal.SIG_BLOCK, set())
        actual_popen = subprocess.Popen
        for number in previous:
            for another_thread in (False, True):
                with self.subTest(signal=number, another_thread=another_thread), tempfile.TemporaryDirectory(prefix='owned-debug-start-') as temporary:
                    owned, returned = [], []
                    ready, finish = threading.Event(), threading.Event()
                    def worker():
                        signal.pthread_sigmask(signal.SIG_UNBLOCK, {signal.SIGTERM, signal.SIGINT})
                        ready.set(); finish.wait(5)
                    thread = threading.Thread(target=worker, daemon=True); thread.start()
                    self.assertTrue(ready.wait(1))
                    def interrupted_spawn(*args, **kwargs):
                        process = actual_popen(*args, **kwargs); owned.append(process)
                        delivered = []
                        installed = signal.getsignal(number)
                        def observe_delivery(signum, frame):
                            delivered.append(signum); installed(signum, frame)
                        signal.signal(number, observe_delivery)
                        if another_thread:
                            signal.pthread_kill(thread.ident, number); time.sleep(.03)
                        else:
                            os.kill(os.getpid(), number)
                        self.assertEqual([number], delivered, 'Handler must run before Popen returns its live child.')
                        returned.append(True)
                        return process
                    try:
                        with self.assertRaises(LabFailure):
                            with cancellation_guard(), patch.object(subprocess, 'Popen', interrupted_spawn):
                                run([sys.executable, '-c', 'import threading;threading.Event().wait()'], Path(temporary), Budget.start(5))
                        self.assertEqual([True], returned)
                        self.assertIsNotNone(owned[0].returncode); self.assertTrue(owned[0].stdout.closed); self.assertTrue(owned[0].stdin.closed)
                        with self.assertRaises(ProcessLookupError): os.kill(owned[0].pid, 0)
                        self.assertEqual(previous_mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
                        for sig, handler in previous.items(): self.assertIs(handler, signal.getsignal(sig))
                    finally:
                        finish.set(); thread.join(timeout=1)
                        for process in owned:
                            if process.poll() is None: os.killpg(process.pid, signal.SIGKILL)
                            process.wait(timeout=2)
                            process.stdout.close(); process.stdin.close()

    def test_deadline_output_cap_and_spawn_failure_cleanup(self):
        with tempfile.TemporaryDirectory(prefix='owned-debug-bounds-') as temporary:
            root = Path(temporary)
            with self.assertRaisesRegex(LabFailure, 'deadline'):
                run([sys.executable, '-c', 'import time;time.sleep(10)'], root, Budget.start(5), timeout=.1)
            with self.assertRaisesRegex(LabFailure, 'output limit'):
                run([sys.executable, '-c', 'print("x"*10000)'], root, Budget.start(5), output_limit=100)
            with self.assertRaises(FileNotFoundError):
                with cancellation_guard(): run(['/no-such-owned-debugging-tool'], root, Budget.start(5))

    def test_environment_scrubs_private_configuration_and_java_injection(self):
        with patch.dict(os.environ, SPRING_CONFIG_LOCATION='/private', TASK_TRACKER_DATABASE_URL='private',
                        MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE='env', JAVA_TOOL_OPTIONS='private'):
            values = environment()
        for key in ('SPRING_CONFIG_LOCATION', 'TASK_TRACKER_DATABASE_URL', 'MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE', 'JAVA_TOOL_OPTIONS'):
            self.assertNotIn(key, values)

    def test_report_symlink_and_size_are_rejected(self):
        with tempfile.TemporaryDirectory(prefix='owned-debug-report-') as temporary:
            root = Path(temporary); target = root/'target'; target.write_text('keep')
            link = root/'link'; link.symlink_to(target)
            with self.assertRaises(LabFailure): publish({}, link)
            with self.assertRaises(LabFailure): publish(dict(value='x'*65536), root/'large')
            self.assertEqual('keep', target.read_text())


if __name__ == '__main__':
    unittest.main(verbosity=2)
