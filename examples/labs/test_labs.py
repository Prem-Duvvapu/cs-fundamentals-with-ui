import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).parent

def module(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / name / 'observe.py')
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded

class ObservationTests(unittest.TestCase):
    def test_os_pipe_wait_memory_touch_and_confined_files(self):
        result = module('os').observe()
        self.assertEqual(result['blocked_state'], 'S')
        self.assertGreater(result['memory']['minor_faults_added'], 0)
        self.assertGreater(result['memory']['iterations'], 0)
        self.assertEqual(result['filesystem']['owned_files'], 33)
        self.assertEqual(result['filesystem']['logical_data_bytes'], 262144)

    def test_tcp_stream_reassembly_http_error_and_local_udp(self):
        result = module('networking').observe()
        self.assertEqual(result['tcp_http_ok']['body'], 'hello')
        self.assertEqual(result['tcp_http_ok']['status'], 200)
        self.assertGreater(result['tcp_http_ok']['receive_calls'], 1)
        self.assertEqual(result['tcp_http_missing']['status'], 404)
        self.assertEqual(result['udp_payload'], 'ping:1')
        self.assertEqual(result['udp_acknowledgement'], 'ack:1')
        self.assertEqual(result['udp_truncated_payload'], 'lo')

if __name__ == '__main__':
    unittest.main()
