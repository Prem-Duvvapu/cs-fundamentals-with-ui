"""Actual first TERM/INT at restored caller handlers; no public DNS or payloads."""
import os
import signal
import unittest
from unittest.mock import patch
import cancellation as policy
IS_SSRF = True
scope = policy.CancellationScope


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


if __name__ == "__main__":unittest.main()
