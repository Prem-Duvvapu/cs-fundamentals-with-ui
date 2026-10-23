import os
import inspect
import json
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
import processes
from processes import Budget, LabFailure, cancellation_guard, environment, run
from verify import HERE, publish, test_diagnostics


class HarnessTests(unittest.TestCase):
    def test_first_signal_during_successful_cleanup_waits_for_owned_child_and_preserves_other_group(self):
        previous = {number: signal.getsignal(number) for number in (signal.SIGTERM, signal.SIGINT)}
        mask = signal.pthread_sigmask(signal.SIG_BLOCK, set())
        actual = os.killpg
        child_code = 'import signal,time;signal.signal(signal.SIGTERM,signal.SIG_IGN);print("READY",flush=True);time.sleep(30)'
        for number in previous:
            with self.subTest(signal=number), tempfile.TemporaryDirectory(prefix='owned-ws-cleanup-') as directory:
                other = subprocess.Popen([sys.executable, '-c', 'import time;time.sleep(30)'], start_new_session=True,
                                         stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                owned = processes.OwnedProcess([sys.executable, '-c', child_code], directory, Budget.start(8))
                delivered = []
                def interrupt_cleanup(group, value):
                    actual(group, value)
                    if owned.process is not None and group == owned.process.pid and value == signal.SIGTERM and not delivered:
                        delivered.append(number)
                        os.kill(os.getpid(), number)
                try:
                    with self.assertRaises(LabFailure), cancellation_guard(), patch.object(os, 'killpg', interrupt_cleanup):
                        with owned:
                            deadline = time.monotonic()+2
                            while b'READY' not in owned.output and time.monotonic() < deadline:
                                owned.pump()
                            self.assertIn(b'READY', owned.output, 'Child must install TERM-ignore before normal cleanup')
                    self.assertEqual([number], delivered)
                    self.assertEqual(-signal.SIGKILL, owned.process.returncode, 'Direct child must be killed and waited before cancellation escapes')
                    self.assertTrue(owned.process.stdin.closed and owned.process.stdout.closed)
                    with self.assertRaises(ProcessLookupError): os.kill(owned.process.pid, 0)
                    self.assertIsNone(other.poll(), 'Unrelated owned test group must remain alive')
                    self.assertEqual(mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
                    for sig, handler in previous.items(): self.assertIs(handler, signal.getsignal(sig))
                finally:
                    if owned.process is not None:
                        try: actual(owned.process.pid, signal.SIGKILL)
                        except ProcessLookupError: pass
                        owned.process.wait(timeout=2)
                        owned.process.stdin.close(); owned.process.stdout.close()
                    actual(other.pid, signal.SIGKILL); other.wait(timeout=2)

    @unittest.skipUnless(hasattr(signal, 'pthread_sigmask'), 'POSIX thread signals required')
    def test_real_scope_entry_signal_after_state_assignment_restores_caller_and_nested_scope(self):
        signals = (signal.SIGTERM, signal.SIGINT)
        previous = {number: signal.getsignal(number) for number in signals}
        previous_mask = signal.pthread_sigmask(signal.SIG_BLOCK, set())
        previous_state = getattr(processes._cancellation, 'state', None)
        previous_trace = sys.gettrace()
        source, first = inspect.getsourcelines(processes.cancellation_guard.__wrapped__)
        after_assignment = first + next(index for index, line in enumerate(source)
            if line.strip() == '_cancellation.state = state') + 1
        target = processes.cancellation_guard.__wrapped__.__code__
        class CallerCancelled(RuntimeError):
            pass
        def caller_handler(_number, _frame):
            raise CallerCancelled('caller_scope_entry_cancelled')
        def positioned(number, expected, state, handlers, mask):
            delivered, body = [], []
            def trace(frame, event, _argument):
                if frame.f_code is target and event == 'line' and frame.f_lineno == after_assignment and not delivered:
                    delivered.append(number)
                    os.kill(os.getpid(), number)
                return trace
            try:
                sys.settrace(trace)
                with self.assertRaises(expected):
                    with processes.cancellation_guard():
                        body.append(True)
            finally:
                sys.settrace(previous_trace)
            self.assertEqual([number], delivered, 'An actual signal must execute immediately after scope mutation')
            self.assertEqual([], body, 'Scope-entry cancellation must not be swallowed')
            self.assertIs(state, getattr(processes._cancellation, 'state', None))
            for value, handler in handlers.items(): self.assertIs(handler, signal.getsignal(value))
            self.assertEqual(mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
        try:
            mask = (previous_mask | {signal.SIGUSR1}) - set(signals)
            signal.pthread_sigmask(signal.SIG_SETMASK, mask)
            for number in signals: signal.signal(number, caller_handler)
            caller_handlers = {number: caller_handler for number in signals}
            for number in signals:
                with self.subTest(signal=number.name, nested=False):
                    positioned(number, CallerCancelled, previous_state, caller_handlers, mask)
                with self.subTest(signal=number.name, nested=True):
                    with processes.cancellation_guard():
                        outer = processes._cancellation.state
                        outer_handlers = {value: signal.getsignal(value) for value in signals}
                        positioned(number, processes.LabFailure, outer, outer_handlers, mask)
                        self.assertTrue(outer['requested'] and outer['delivered'])
                    self.assertIs(previous_state, getattr(processes._cancellation, 'state', None))
                    for value, handler in caller_handlers.items(): self.assertIs(handler, signal.getsignal(value))
            # Ordinary nested success must preserve the same LIFO state/handler restoration.
            with processes.cancellation_guard():
                outer = processes._cancellation.state
                outer_handlers = {number: signal.getsignal(number) for number in signals}
                with processes.cancellation_guard(): self.assertIsNot(outer, processes._cancellation.state)
                self.assertIs(outer, processes._cancellation.state)
                for number, handler in outer_handlers.items(): self.assertIs(handler, signal.getsignal(number))
            self.assertIs(previous_state, getattr(processes._cancellation, 'state', None))
        finally:
            sys.settrace(previous_trace)
            processes._cancellation.state = previous_state
            for number, handler in previous.items(): signal.signal(number, handler)
            signal.pthread_sigmask(signal.SIG_SETMASK, previous_mask)

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



class DiagnosticTests(unittest.TestCase):
    def test_failure_diagnostics_keep_only_owned_suite_and_source_lines(self):
        with tempfile.TemporaryDirectory(prefix='owned-ws-diagnostics-') as directory:
            root = Path(directory)
            xml = root/'TEST-com.csfundamentals.websocketlab.WebSocketTransportTest.xml'
            xml.write_text('<testsuite name="com.csfundamentals.websocketlab.WebSocketTransportTest"><testcase><failure type="org.opentest4j.AssertionFailedError" message="private-cookie-fixture">private-body-fixture at com.csfundamentals.websocketlab.WebSocketTransportTest.actualAuthenticatedWebSocketLifecycleAndLimits(WebSocketTransportTest.java:123)</failure></testcase></testsuite>')
            value = test_diagnostics(root, 0)
            self.assertEqual([{'suite':'WebSocketTransportTest','kind':'assertion','sourceLines':[123]}], value)
            self.assertNotIn('private', json.dumps(value))
            self.assertEqual([], test_diagnostics(root, time.time_ns()+1_000_000_000))
            xml.write_text('<testsuite name="foreign"><failure>private fixture</failure></testsuite>')
            self.assertEqual([], test_diagnostics(root, 0))

if __name__ == '__main__': unittest.main(verbosity=2)
