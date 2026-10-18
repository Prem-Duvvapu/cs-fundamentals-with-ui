import importlib.util
import os
from pathlib import Path
import secrets
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import uuid

SPEC = importlib.util.spec_from_file_location('owned_persistence_verify', Path(__file__).with_name('verify.py'))
lab = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(lab)


class VerificationGuardTests(unittest.TestCase):
    def test_only_owned_generated_identifiers_can_reach_cleanup_sql(self):
        identifier = uuid.uuid4().hex
        self.assertEqual(lab.owned_identifier('lab_persist_' + identifier + '_source'), '"lab_persist_' + identifier + '_source"')
        for value in ('postgres', 'public', 'lab_persist_x;DROP DATABASE postgres', 'lab_restore_'):
            with self.assertRaises(ValueError):
                lab.owned_identifier(value)

    def test_missing_explicit_admin_mode_and_remote_host_fail_before_sql(self):
        for values in ({}, {'PERSISTENCE_ADMIN_MODE': 'tcp', 'PERSISTENCE_ADMIN_HOST': 'remote.invalid'}):
            with patch.dict(os.environ, values, clear=True), patch.object(lab.Postgres, 'sql') as sql:
                with self.assertRaises(ValueError):
                    lab.verify(Path('unused-report.json'))
                sql.assert_not_called()

    def test_failed_attempt_cannot_reuse_a_previous_success_report(self):
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / 'verification.json'
            report.write_text('{"owned_resources_cleaned":true}')
            with patch.dict(os.environ, {}, clear=True):
                with self.assertRaises(ValueError):
                    lab.verify(report)
            self.assertFalse(report.exists())

    def test_ambient_service_host_and_options_are_removed_from_pg_commands(self):
        password = secrets.token_hex(32)
        with patch.dict(os.environ, {'PGHOSTADDR': 'remote.invalid', 'PGSERVICE': 'external', 'PGOPTIONS': 'unsafe'}, clear=True):
            environment = lab.child_environment(password)
        self.assertNotIn('PGHOSTADDR', environment)
        self.assertNotIn('PGSERVICE', environment)
        self.assertNotEqual(environment['PGOPTIONS'], 'unsafe')
        self.assertEqual(environment['PGPASSWORD'], password)

    def test_password_is_environment_only_not_process_arguments_or_sql_error(self):
        password = secrets.token_hex(32)
        postgres = lab.Postgres('127.0.0.1', 5432, 'owned', password)
        with patch.object(lab.subprocess, 'run', return_value=subprocess.CompletedProcess([], 1, b'', password.encode())) as run:
            with self.assertRaisesRegex(RuntimeError, 'no credentials') as failure:
                postgres.sql('owned', 'SELECT 1')
            self.assertNotIn(password, str(failure.exception))
            self.assertNotIn(password, ' '.join(run.call_args.args[0]))
            self.assertEqual(run.call_args.kwargs['env']['PGPASSWORD'], password)


if __name__ == '__main__':
    unittest.main()
