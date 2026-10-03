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
    def test_ticket_metrics_expose_imbalanced_baseline(self):
        result = module('aiml').observe()
        classifier = result['ticket_classifier']
        self.assertEqual((classifier['tp'], classifier['fp'], classifier['fn'], classifier['tn']),
                         (8, 2, 2, 88))
        self.assertEqual(classifier['accuracy'], 0.96)
        self.assertEqual(classifier['precision'], 0.8)
        self.assertEqual(classifier['recall'], 0.8)
        self.assertEqual(result['always_negative_baseline']['accuracy'], 0.9)
        self.assertEqual(result['always_negative_baseline']['recall'], 0)
        self.assertIsNone(result['always_negative_baseline']['precision'])

    def test_auc_ties_ranking_and_reversed_ranking(self):
        lab = module('aiml')
        self.assertEqual(lab.binary_auc([1, 0], [0.5, 0.5]), 0.5)
        self.assertEqual(lab.binary_auc([1, 0], [0.9, 0.1]), 1)
        self.assertEqual(lab.binary_auc([1, 0], [0.1, 0.9]), 0)
        self.assertEqual(lab.observe()['constant_score_auc'], 0.5)

    def test_metrics_reject_unaligned_or_nonbinary_labels(self):
        lab = module('aiml')
        for labels, predictions in [([], []), ([1], []), ([2], [1])]:
            with self.assertRaises(ValueError):
                lab.binary_metrics(labels, predictions)

    def test_auc_requires_both_classes_and_aligned_scores(self):
        lab = module('aiml')
        for labels, scores in [([1], [0.7]), ([0], [0.7]), ([1, 0], [0.7])]:
            with self.assertRaises(ValueError):
                lab.binary_auc(labels, scores)

    def test_retrieval_hit_is_not_multi_passage_recall(self):
        lab = module('aiml')
        result = lab.observe()['rag_one_of_three']
        self.assertEqual(result['hit_rate'], 1)
        self.assertAlmostEqual(result['recall'], 1 / 3)
        self.assertEqual(lab.retrieval_metrics(['a', 'a'], ['a', 'b'], 2)['recall'], 0.5)
        self.assertEqual(lab.retrieval_metrics(['x'], ['a'], 1)['hit_rate'], 0)

    def test_retrieval_requires_defined_relevance_and_cutoff(self):
        lab = module('aiml')
        for relevant, cutoff in [([], 1), (['a'], 0), (['a'], True)]:
            with self.assertRaises(ValueError):
                lab.retrieval_metrics(['a'], relevant, cutoff)

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
