"""Actual owned resolver lifecycle regressions; no public DNS or transport claim."""
import os
import signal
import socket
import subprocess
import sys
import unittest
from unittest.mock import patch

import cancellation
from cancellation import CancellationScope, Cancelled
from fetch import Resolver

EVIDENCE = []


class ResolverCleanupTests(unittest.TestCase):
    def check_cancelled_cleanup(self, number, timed_out):
        previous = {value: signal.getsignal(value) for value in (signal.SIGTERM, signal.SIGINT)}
        original_mask = signal.pthread_sigmask(signal.SIG_BLOCK, set())
        outer = getattr(cancellation._cancellation, 'state', None)
        actual_popen, actual_killpg = subprocess.Popen, os.killpg
        expected = [{'family': socket.AF_INET, 'address': '127.0.0.1'}]
        resolver = Resolver([{'sleep': 5 if timed_out else 0, 'answers': expected}, {'answers': expected}])
        processes, delivered = [], []
        unrelated = actual_popen([sys.executable, '-c', 'import time;time.sleep(20)'],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)

        def spawn(*args, **kwargs):
            process = actual_popen(*args, **kwargs)
            processes.append(process)
            if not timed_out:
                actual_communicate = process.communicate
                calls = []
                def communicate(*values, **options):
                    calls.append(True)
                    if len(calls) == 2:
                        delivered.append(number)
                        os.kill(os.getpid(), number)
                    return actual_communicate(*values, **options)
                process.communicate = communicate
            return process

        def killpg(group, value):
            if timed_out and processes and group == processes[0].pid and value == signal.SIGKILL and not delivered:
                delivered.append(number)
                os.kill(os.getpid(), number)
            return actual_killpg(group, value)

        try:
            mask = (original_mask | {signal.SIGUSR1}) - set(previous)
            signal.pthread_sigmask(signal.SIG_SETMASK, mask)
            with self.assertRaises(Cancelled), CancellationScope(), patch.object(subprocess, 'Popen', spawn), patch.object(os, 'killpg', killpg):
                resolver.resolve('partner.example.test', 443, .1 if timed_out else 2)
            self.assertEqual([number], delivered, 'First actual cancellation must occur during owned teardown')
            process = processes[0]
            self.assertEqual(-signal.SIGKILL if timed_out else 0, process.returncode)
            self.assertTrue(process.stdin.closed and process.stdout.closed)
            with self.assertRaises(ProcessLookupError):
                os.kill(process.pid, 0)
            self.assertFalse(resolver.active)
            self.assertEqual([{'timedOut': timed_out, 'returnCode': process.returncode, 'reaped': True}], resolver.events)
            self.assertIsNone(unrelated.poll(), 'Unrelated process group must remain live')
            self.assertIs(outer, getattr(cancellation._cancellation, 'state', None))
            self.assertEqual(mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
            for value, handler in previous.items():
                self.assertIs(handler, signal.getsignal(value))
            # The recovery call uses the library alone, without installing a signal scope.
            self.assertEqual(expected, resolver.resolve('partner.example.test', 443, 2))
            self.assertFalse(resolver.active)
            self.assertEqual(2, len(resolver.events))
            self.assertTrue(all(event['reaped'] for event in resolver.events))
            self.assertIs(outer, getattr(cancellation._cancellation, 'state', None))
            self.assertEqual(mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
            for value, handler in previous.items():
                self.assertIs(handler, signal.getsignal(value))
            return {'signal': number.name, 'timedOut': timed_out, 'returnCode': process.returncode,
                    'childReaped': True, 'pipesClosed': True, 'registryEmpty': True,
                    'cleanupEventRecorded': True, 'recoverySucceeded': True,
                    'callerPolicyPreserved': True, 'unrelatedGroupPreserved': True}
        finally:
            for process in processes:
                try:
                    actual_killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                process.wait(timeout=2)
                process.stdin.close()
                process.stdout.close()
            actual_killpg(unrelated.pid, signal.SIGKILL)
            unrelated.wait(timeout=2)
            for value, handler in previous.items():
                signal.signal(value, handler)
            signal.pthread_sigmask(signal.SIG_SETMASK, original_mask)

    def test_actual_first_term_int_during_resolver_timeout_cleanup(self):
        for number in (signal.SIGTERM, signal.SIGINT):
            with self.subTest(signal=number.name):
                EVIDENCE.append(self.check_cancelled_cleanup(number, True))

    def test_actual_first_term_int_during_successful_resolver_finalization(self):
        for number in (signal.SIGTERM, signal.SIGINT):
            with self.subTest(signal=number.name):
                EVIDENCE.append(self.check_cancelled_cleanup(number, False))


if __name__ == '__main__':
    unittest.main(verbosity=2)
