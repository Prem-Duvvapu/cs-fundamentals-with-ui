import importlib.util
from pathlib import Path
import shutil
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('backend_database', Path(__file__).parent / 'backend/database.py')
LAB = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(LAB)


class DatabaseDiagnosisTests(unittest.TestCase):
    def test_connection_guard_rejects_remote_profiles_and_conninfo(self):
        for environment in ({'PGHOST': 'db.example.com'}, {'PGHOST': '/tmp,db.example.com'}, {'PGHOSTADDR': '192.0.2.1'},
                            {'PGSERVICE': 'production'}, {'PGSERVICEFILE': '/tmp/service'},
                            {'PGDATABASE': 'postgresql://localhost/production'},
                            {'PGDATABASE': 'host=remote dbname=test'}, {'PGPORT': '0'}):
            with self.subTest(environment=environment), self.assertRaises(ValueError):
                LAB.local_environment(environment)
        safe = LAB.local_environment({'PGHOST': '/var/run/postgresql', 'PGOPTIONS': '-c work_mem=10GB'})
        self.assertNotIn('PGOPTIONS', safe)
        self.assertEqual(safe['PGDATABASE'], 'postgres')

    @unittest.skipUnless(shutil.which('psql'), 'PostgreSQL client required')
    def test_real_postgresql_plans_blockers_timeout_and_cleanup(self):
        # An installed client with an unavailable server deliberately fails: do not turn a missing
        # configured dependency into passing integration evidence.
        result = LAB.observe()
        self.assertEqual(result['plans']['before']['Plan']['Actual Rows'], 10)
        self.assertEqual(result['plans']['after']['Plan']['Actual Rows'], 10)
        self.assertEqual(result['locking']['sqlstate'], '55P03')
        self.assertIn(result['locking']['holder_pid'], result['locking']['wait']['blockers'])
        remaining = LAB.sql(f"SELECT count(*) FROM pg_namespace WHERE nspname='{result['owned_schema']}';", LAB.local_environment())
        self.assertEqual(remaining, '0')

    @unittest.skipUnless(shutil.which('psql'), 'PostgreSQL client required')
    def test_schema_is_removed_after_injected_diagnosis_failure(self):
        observed = []
        def fail(schema, environment):
            observed.append(schema)
            raise RuntimeError('Injected diagnosis failure')
        with patch.object(LAB, 'lock_observation', side_effect=fail):
            with self.assertRaisesRegex(RuntimeError, 'Injected diagnosis failure'):
                LAB.observe()
        self.assertEqual(len(observed), 1)
        remaining = LAB.sql(f"SELECT count(*) FROM pg_namespace WHERE nspname='{observed[0]}';", LAB.local_environment())
        self.assertEqual(remaining, '0')


if __name__ == '__main__':
    unittest.main()
