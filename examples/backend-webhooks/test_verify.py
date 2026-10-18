"""Harness guards; these are separate from actual Java/HTTP business evidence."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock
import verify


class HarnessGuards(unittest.TestCase):
    def test_runtime_does_not_inherit_foreign_lab_server_or_jvm_injection(self):
        foreign = {'LAB_DB_PATH': 'foreign', 'SPRING_APPLICATION_JSON': 'foreign', 'SERVER_ADDRESS': '0.0.0.0',
                   'JAVA_TOOL_OPTIONS': 'foreign', 'JDK_JAVA_OPTIONS': 'foreign', '_JAVA_OPTIONS': 'foreign', 'PATH': 'retained'}
        with mock.patch.dict(os.environ, foreign, clear=True):
            result = verify.runtime_env({'LAB_READY_FILE': 'owned'})
        self.assertEqual(result, {'PATH': 'retained', 'LAB_READY_FILE': 'owned'})

    def test_privacy_guard_refuses_raw_secret_and_signed_body_before_publish(self):
        with self.assertRaisesRegex(verify.LabFailure, 'server_log_contains_sensitive_value'):
            verify.redact_log('unexpected synthetic-private-value', {'synthetic-private-value'}, Path('/owned'))
        self.assertEqual(verify.redact_log('/owned/startup', set(), Path('/owned')), '[owned-runtime]/startup')

    def test_actual_owned_child_is_reaped_and_output_closed_on_startup_failure(self):
        self.exercise_owned_failure(immediate_exit=True)

    def test_actual_owned_child_is_terminated_on_startup_deadline(self):
        self.exercise_owned_failure(immediate_exit=False)

    def test_missing_executable_closes_log_without_creating_process(self):
        with tempfile.TemporaryDirectory(prefix='webhook-guard-') as directory:
            owned = Path(directory)
            evidence = owned / 'evidence'
            evidence.mkdir()
            server = verify.Server(owned, {}, 1, set())
            with mock.patch.object(verify, 'EVIDENCE', evidence), mock.patch.object(verify.subprocess, 'Popen', side_effect=FileNotFoundError):
                with self.assertRaises(FileNotFoundError):
                    with server:
                        self.fail('An unavailable executable must not enter the exercise')
            self.assertIsNone(server.process)
            self.assertTrue(server.output.closed)

    def exercise_owned_failure(self, immediate_exit):
        actual_popen = subprocess.Popen
        processes = []
        def owned_child(*args, **kwargs):
            process = actual_popen([sys.executable, '-c', 'raise SystemExit(1)' if immediate_exit else 'import time; time.sleep(30)'],
                                   stdout=kwargs['stdout'], stderr=kwargs['stderr'])
            processes.append(process)
            return process
        with tempfile.TemporaryDirectory(prefix='webhook-guard-') as directory:
            owned = Path(directory)
            evidence = owned / 'evidence'
            evidence.mkdir()
            server = verify.Server(owned, {}, 1, set())
            with mock.patch.object(verify, 'EVIDENCE', evidence), mock.patch.object(verify.subprocess, 'Popen', side_effect=owned_child), \
                 mock.patch.object(verify, 'STARTUP_SECONDS', 3 if immediate_exit else 0):
                with self.assertRaises(verify.LabFailure):
                    with server:
                        self.fail('A failed owned server must not enter the client exercise')
            self.assertEqual(len(processes), 1)
            self.assertIsNotNone(processes[0].poll())
            self.assertTrue(server.output.closed)
            self.assertTrue((evidence / 'server-1.log').is_file())


if __name__ == '__main__':
    unittest.main()
