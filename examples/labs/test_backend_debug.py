import importlib.util
from pathlib import Path
import shutil
import unittest

SPEC = importlib.util.spec_from_file_location('backend_observe', Path(__file__).parent / 'backend/observe.py')
LAB = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(LAB)


class JvmDiagnosisTests(unittest.TestCase):
    def test_histogram_parser_does_not_confuse_object_arrays(self):
        sample = ' 1: 12 12583104 [B (java.base@17)\n 2: 3 128 [Ljava.lang.Object;\n'
        self.assertEqual(LAB.byte_array_bytes(sample), 12583104)
        with self.assertRaises(ValueError):
            LAB.byte_array_bytes('1: 3 128 [Ljava.lang.Object;')

    def test_unknown_mode_is_rejected_before_process_creation(self):
        with self.assertRaises(ValueError):
            LAB.observe_mode('external-pid', Path('.'), {})

    @unittest.skipUnless(all(shutil.which(t) for t in ('java', 'javac', 'jcmd')), 'Complete JDK required')
    def test_real_owned_jvm_deadlock_and_released_retention(self):
        result = LAB.observe()
        self.assertTrue(all(result['deadlock']['checks'].values()))
        self.assertGreaterEqual(result['retained_memory']['released_bytes'], 8 * 1024 * 1024)
        self.assertNotEqual(result['deadlock']['owned_pid'], result['retained_memory']['owned_pid'])


if __name__ == '__main__':
    unittest.main()
