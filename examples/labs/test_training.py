import importlib.util
from pathlib import Path
import unittest

path = Path(__file__).parent / 'aiml' / 'train.py'
spec = importlib.util.spec_from_file_location('training_lab', path)
lab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lab)


class TrainingTests(unittest.TestCase):
    def test_real_optimization_reduces_training_loss_and_is_reproducible(self):
        rows = lab.dataset()[:100]
        model = lab.train(rows)
        self.assertLess(model['training']['final_loss'], model['training']['initial_loss'] - 0.1)
        self.assertEqual(model, lab.train(rows))

    def test_held_out_extreme_values_cannot_change_fitted_preprocessing(self):
        rows = lab.dataset()
        prep = lab.fit_preprocessor(rows[:100])
        rows[-1]['features'] = [10**9, 10**9]
        self.assertEqual(prep, lab.fit_preprocessor(rows[:100]))
        self.assertNotEqual(prep, lab.fit_preprocessor(rows))

    def test_threshold_changes_error_tradeoff(self):
        rows = lab.dataset()
        model = lab.train(rows[:100])
        low = lab.metrics(rows[100:], model, 0.2)
        high = lab.metrics(rows[100:], model, 0.8)
        self.assertGreaterEqual(low['tp'], high['tp'])
        self.assertGreaterEqual(low['fp'], high['fp'])

    def test_missing_value_and_extreme_input_have_finite_probabilities(self):
        model = lab.train(lab.dataset()[:100])
        for features in ([None, 0], [10**8, 0], [-10**8, 2]):
            self.assertGreaterEqual(lab.score(features, model), 0)
            self.assertLessEqual(lab.score(features, model), 1)

    def test_splits_and_report_are_explicit(self):
        report = lab.observe()
        self.assertEqual(report['split_sizes'], [100, 30, 30])
        self.assertEqual(len(report['data_sha256']), 64)
        self.assertIn(str(report['chosen_threshold']), report['validation'])


if __name__ == '__main__':
    unittest.main()
