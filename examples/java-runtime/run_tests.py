"""Dedicated five-case gate; no missing runtime/tool/sampling case can become a skip."""
import json
from pathlib import Path
import sys
import unittest

root = Path(__file__).resolve().parent
suite = unittest.defaultTestLoader.discover(str(root), pattern='test_runtime.py')
result = unittest.TextTestRunner(verbosity=2).run(suite)
passed = result.wasSuccessful() and result.testsRun == 5 and not result.skipped
report = {'testsRun': result.testsRun, 'skipped': len(result.skipped), 'failures': len(result.failures),
          'errors': len(result.errors), 'allFiveExecutedAndPassed': passed}
output = root / 'build' / 'evidence'
output.mkdir(parents=True, exist_ok=True)
(output / 'test-result.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))
sys.exit(0 if passed else 1)
