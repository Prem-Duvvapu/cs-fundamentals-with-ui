"""Actual positioned cancellation regressions; these do not substitute for Spring/JDI verification."""
import inspect
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch
import processes
from processes import Budget, LabFailure, cancellation_guard


class ProcessGuards(unittest.TestCase):
    def test_first_signal_during_successful_cleanup_waits_for_owned_child_and_preserves_other_group(self):
        previous = {number: signal.getsignal(number) for number in (signal.SIGTERM, signal.SIGINT)}
        mask = signal.pthread_sigmask(signal.SIG_BLOCK, set())
        actual = os.killpg
        child_code = 'import signal,time;signal.signal(signal.SIGTERM,signal.SIG_IGN);print("READY",flush=True);time.sleep(30)'
        for number in previous:
            with self.subTest(signal=number), tempfile.TemporaryDirectory(prefix='owned-debug-cleanup-') as directory:
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
            finally:
                # Keep old-code failure probes isolated rather than leaking into another subcase.
                processes._cancellation.state = state
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

    def test_owned_process_without_executable_guard_preserves_library_signal_policy(self):
        previous = {number: signal.getsignal(number) for number in (signal.SIGTERM, signal.SIGINT)}
        mask = signal.pthread_sigmask(signal.SIG_BLOCK, set())
        state = getattr(processes._cancellation, 'state', None)
        with tempfile.TemporaryDirectory(prefix='owned-debug-library-') as directory:
            with processes.OwnedProcess([sys.executable, '-c', 'print("done")'], directory, Budget.start(5)) as owned:
                code, output = owned.finish()
                self.assertEqual((0, b'done\n'), (code, output))
                for number, handler in previous.items(): self.assertIs(handler, signal.getsignal(number))
            self.assertTrue(owned.process.stdin.closed and owned.process.stdout.closed)
        self.assertIs(state, getattr(processes._cancellation, 'state', None))
        self.assertEqual(mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
        for number, handler in previous.items(): self.assertIs(handler, signal.getsignal(number))


policy = processes
IS_SSRF = False
scope = policy.cancellation_guard


RESTORATION_EVIDENCE = []


class ScopeRestorationTests(unittest.TestCase):
    def test_actual_first_term_int_during_restoration_preserve_caller_exception_and_complete_state(self):
        class CallerCancelled(RuntimeError):pass
        class BodyFailed(RuntimeError):pass
        class SetupFailed(RuntimeError):pass
        actual_signal = signal.signal
        for number in (signal.SIGTERM, signal.SIGINT):
            for nested in (False, True):
                for mode in ('normal', 'body-error', 'entry-rollback'):
                    with self.subTest(signal=number.name, nested=nested, mode=mode):
                        original_handlers = {item:signal.getsignal(item) for item in (signal.SIGTERM, signal.SIGINT)}
                        original_state = getattr(policy._cancellation, 'state', None)
                        original_mask = signal.pthread_sigmask(signal.SIG_BLOCK, set())
                        def caller_handler(_number, _frame):raise CallerCancelled('caller cancelled')
                        def exercise():
                            expected_handlers = {item:signal.getsignal(item) for item in original_handlers}
                            expected_state = getattr(policy._cancellation, 'state', None)
                            expected_mask = signal.pthread_sigmask(signal.SIG_BLOCK, set())
                            armed, delivered, raised, setup_failed, entered = [], [], [], [], []
                            def install(item, handler):
                                previous = actual_signal(item, handler)
                                if mode == 'entry-rollback' and item == signal.SIGINT and handler is not expected_handlers[item] and not setup_failed:
                                    setup_failed.append(True); armed.append(True)
                                    raise SetupFailed('fixed entry failure')
                                if armed and item == number and handler is expected_handlers[item] and not delivered:
                                    delivered.append(number.name)
                                    try:os.kill(os.getpid(), number)
                                    except BaseException as failure:
                                        raised.append(failure)
                                        raise
                                return previous
                            caught = None
                            try:
                                try:
                                    with patch.object(policy.signal, 'signal', side_effect=install):
                                        with scope():
                                            entered.append(True); armed.append(True)
                                            if mode == 'body-error':raise BodyFailed('fixed body failure')
                                except BaseException as failure:caught = failure
                                self.assertEqual([number.name], delivered, 'Exactly one actual signal must reach a restored handler')
                                self.assertEqual(1, len(raised))
                                self.assertIs(raised[0], caught, 'Restoration must propagate the original caller exception unchanged')
                                self.assertIsInstance(caught, policy.Cancelled if IS_SSRF and nested else policy.LabFailure if nested else CallerCancelled)
                                self.assertEqual([] if mode == 'entry-rollback' else [True], entered)
                                self.assertIs(expected_state, getattr(policy._cancellation, 'state', None))
                                for item, handler in expected_handlers.items():self.assertIs(handler, signal.getsignal(item))
                                self.assertEqual(expected_mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
                                return {'signal':number.name, 'nested':nested, 'mode':mode, 'actualSignals':1,
                                        'callerExceptionPreserved':True, 'handlersRestored':True,
                                        'outerStateRestored':True, 'maskPreserved':True}
                            finally:
                                # Failed old-source probes must not contaminate another case or its outer scope.
                                policy._cancellation.state = expected_state
                                for item, handler in expected_handlers.items():actual_signal(item, handler)
                        try:
                            mask = (original_mask | {signal.SIGUSR1}) - set(original_handlers)
                            signal.pthread_sigmask(signal.SIG_SETMASK, mask)
                            for item in original_handlers:actual_signal(item, caller_handler)
                            if nested:
                                with scope():row = exercise()
                            else:row = exercise()
                            self.assertIs(original_state, getattr(policy._cancellation, 'state', None))
                            for item in original_handlers:self.assertIs(caller_handler, signal.getsignal(item))
                            self.assertEqual(mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
                            RESTORATION_EVIDENCE.append(row)
                        finally:
                            policy._cancellation.state = original_state
                            for item, handler in original_handlers.items():actual_signal(item, handler)
                            signal.pthread_sigmask(signal.SIG_SETMASK, original_mask)

    def test_uninterrupted_success_body_error_and_entry_failure_restore_without_swallowing(self):
        class FixedFailure(RuntimeError):pass
        handlers = {number:signal.getsignal(number) for number in (signal.SIGTERM, signal.SIGINT)}
        state = getattr(policy._cancellation, 'state', None)
        mask = signal.pthread_sigmask(signal.SIG_BLOCK, set())
        with scope():
            outer = getattr(policy._cancellation, 'state', None)
            with scope():pass
            self.assertIs(outer, getattr(policy._cancellation, 'state', None))
        body_failure = FixedFailure('fixed body failure')
        with self.assertRaises(FixedFailure) as observed:
            with scope():raise body_failure
        self.assertIs(body_failure, observed.exception)
        real = signal.signal; installed = []
        entry_failure = FixedFailure('fixed entry failure')
        def install(number, handler):
            previous = real(number, handler)
            if number == signal.SIGINT and handler is not handlers[number] and not installed:
                installed.append(True);raise entry_failure
            return previous
        with patch.object(policy.signal, 'signal', side_effect=install):
            with self.assertRaises(FixedFailure) as observed:
                with scope():self.fail('Entry failure must propagate')
        self.assertIs(entry_failure, observed.exception)
        self.assertIs(state, getattr(policy._cancellation, 'state', None))
        for number, handler in handlers.items():self.assertIs(handler, signal.getsignal(number))
        self.assertEqual(mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
