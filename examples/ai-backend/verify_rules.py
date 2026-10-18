"""Verify the packaged no-model path, full datasets and explicit coverage denominators."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent


def verify():
    with tempfile.TemporaryDirectory(prefix='cs-rule-cli-') as directory:
        jar = Path(directory) / 'ai-example.jar'
        shutil.copyfile(next((ROOT / 'target').glob('ai-backend-example-*.jar')), jar)
        # A hidden model construction/call would fail rather than reaching a provider.
        env = dict(os.environ, AI_ENDPOINT='not-a-url', AI_MODEL='must-not-call', AI_EVIDENCE='live-local')
        for split, count, correct in [('development', 30, 29), ('held-out', 20, 17)]:
            dataset = ROOT / 'fixtures' / (split + '.jsonl')
            report = Path(directory) / (split + '.json')
            subprocess.run(['java', '-jar', str(jar), '--evaluate-rules', str(dataset), str(report)],
                           env=env, check=True, timeout=30)
            result = json.loads(report.read_text())
            assert result['evidence'] == 'rule' and result['usesModel'] is False
            assert result['model'] == result['promptVersion'] == 'ticket-rules-v1'
            assert result['datasetSha256'] == hashlib.sha256(dataset.read_bytes()).hexdigest()
            assert result['datasetLfSha256'] == hashlib.sha256(dataset.read_bytes().replace(b'\r\n', b'\n')).hexdigest()
            assert result['state'] == 'complete' and len(result['cases']) == count
            assert {r['id'] for r in result['cases']} == {json.loads(line)['id'] for line in dataset.read_text().splitlines()}
            assert result['summary']['cases'] == count
            assert result['accepted'] == result['fieldsCorrect'] == correct
            assert result['summary']['exactFieldMatchRate'] == correct / count
            assert result['summary']['errors'] == {'rule_needs_review': count - correct}
        print('Actual packaged rule baseline passed 30/20 cases with explicit review/failure denominators and no provider configuration.')


if __name__ == '__main__':
    verify()
