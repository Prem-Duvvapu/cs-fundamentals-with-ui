import importlib.util
from dataclasses import replace
from pathlib import Path
import sys
import unittest

SPEC = importlib.util.spec_from_file_location('recommendation_lab', Path(__file__).parent / 'aiml/recommend.py')
lab = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = lab
SPEC.loader.exec_module(lab)


class RecommendationTests(unittest.TestCase):
    def setUp(self):
        self.query, self.index, self.catalog, self.grades = lab.fixtures()

    def test_omitted_candidate_cannot_be_recovered_by_ranker(self):
        result = lab.observe()
        self.assertEqual(result['k2']['candidates'], ['a', 'b'])
        self.assertEqual(result['k2']['selected'], ['b', 'a'])
        self.assertEqual(result['k2']['candidate_recall'], .5)
        self.assertEqual(result['k3']['selected'], ['c', 'b'])
        self.assertEqual(result['k3']['candidate_recall'], 1)
        self.assertAlmostEqual(result['k2']['ndcg_at_2'], .3373519727104165)
        self.assertEqual(result['k3']['ndcg_at_2'], 1)

    def test_current_metadata_overrides_index_and_ranked_snapshot(self):
        candidates = lab.retrieve(self.query, self.index, 2)
        ordered = lab.rank(candidates, self.catalog)
        self.catalog['b'] = replace(self.catalog['b'], eligible=False)
        self.assertEqual(lab.rank(candidates, self.catalog), ['a'])
        self.assertEqual(lab.select(ordered, self.catalog), ['a'])
        del self.catalog['a']
        self.assertEqual(lab.select(ordered, self.catalog), [])

    def test_consumed_duplicate_and_creator_caps_do_not_pad_forbidden_items(self):
        self.assertEqual(lab.select(['a', 'a', 'e', 'b'], self.catalog), ['a', 'b'])
        self.assertEqual(lab.select(['b', 'a', 'e'], self.catalog, consumed=('b',), limit=3), ['a'])
        self.assertEqual(lab.rank(['b', 'b', 'unknown', 'a'], self.catalog, consumed=('b',)), ['a'])
        self.assertEqual(lab.select(['b'], self.catalog, consumed=('b',)), [])

    def test_fallback_is_deterministic_attributed_and_still_filtered(self):
        result = lab.recommend(self.query, self.index, self.catalog,
                               consumed=('b',), retrieval_available=False)
        self.assertEqual(result['source'], 'editorial-fallback')
        self.assertEqual(result['selected'], ['e'])
        self.assertEqual(result, lab.recommend(self.query, self.index, self.catalog,
                                             consumed=('b',), retrieval_available=False))
        self.catalog['e'] = replace(self.catalog['e'], eligible=False)
        self.assertEqual(lab.recommend(self.query, self.index, self.catalog,
                                      consumed=('b',), retrieval_available=False)['selected'], [])

    def test_cold_item_requires_an_actual_candidate_source(self):
        self.assertNotIn('d', lab.retrieve(self.query, self.index, 20))
        self.assertNotIn('d', lab.rank(list(self.index), self.catalog))
        self.index['d'] = (1, 0)
        self.assertIn('d', lab.retrieve(self.query, self.index, 2))
        self.assertEqual(lab.recommend(self.query, self.index, self.catalog)['selected'][0], 'd')

    def test_metrics_use_requested_cutoff_and_full_ideal_not_returned_length(self):
        self.assertEqual(lab.recall_at_k(['c', 'b'], self.grades, 1), .5)
        self.assertEqual(lab.ndcg_at_k(['c', 'b'], self.grades, 1), 1)
        self.assertEqual(lab.ndcg_at_k([], self.grades, 2), 0)
        self.assertEqual(lab.recall_at_k([], self.grades, 2), 0)
        self.assertLess(lab.ndcg_at_k(['c'], self.grades, 2), 1)
        self.assertEqual(lab.ndcg_at_k(['c', 'b', 'unknown'], self.grades, 2), 1)
        for cutoff in (0, -1, True, 1.5):
            with self.assertRaises(ValueError):
                lab.ndcg_at_k(['c'], self.grades, cutoff)
            with self.assertRaises(ValueError):
                lab.recall_at_k(['c'], self.grades, cutoff)
        for grades in ({}, {'a': 0}, {'a': -1}, {'a': float('nan')}, {'a': float('inf')}):
            with self.assertRaises(ValueError):
                lab.ndcg_at_k(['a'], grades, 2)
        with self.assertRaises(ValueError):
            lab.recall_at_k(['a'], [], 2)
        for metric, judgments in ((lab.ndcg_at_k, self.grades), (lab.recall_at_k, self.grades)):
            with self.assertRaises(ValueError):
                metric(['c', 'c'], judgments, 2)

    def test_cosine_and_scores_reject_invalid_values(self):
        self.assertAlmostEqual(lab.cosine((1e308, 1e308), (1e308, 1e308)), 1)
        for vector in ((), (0, 0), (float('nan'), 1), (float('inf'), 1), (1,)):
            with self.assertRaises(ValueError):
                lab.cosine((1, 0), vector)
        for item in (replace(self.catalog['a'], p_click=float('nan')),
                     replace(self.catalog['a'], p_click=1.1),
                     replace(self.catalog['a'], p_purchase_given_click=-.1),
                     replace(self.catalog['a'], margin=float('inf'))):
            with self.assertRaises(ValueError):
                lab.utility(item)


if __name__ == '__main__':
    unittest.main()
