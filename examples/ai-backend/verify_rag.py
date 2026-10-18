"""Exercise the packaged RAG CLI and its failure diagnostics, without a model/server."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent


def verify():
    with tempfile.TemporaryDirectory(prefix='cs-rag-cli-') as temporary:
        owned = Path(temporary)
        jar = owned / 'ai-example.jar'
        shutil.copyfile(next((ROOT / 'target').glob('ai-backend-example-*.jar')), jar)
        corpus = ROOT / 'fixtures/rag/corpus-v1.json'
        env = dict(os.environ, AI_EVIDENCE='fixture', AI_MODEL='teaching-fixture',
                   AI_MODEL_DIGEST='fixture', AI_RUNTIME_VERSION='fixture')
        for split, count in [('development', 30), ('held-out', 20)]:
            cases = ROOT / ('fixtures/rag/' + split + '-v1.jsonl')
            report = owned / (split + '.json')
            subprocess.run(['java', '-jar', str(jar), '--evaluate-rag', str(corpus),
                            str(cases), str(report)], env=env, check=True, timeout=90)
            result = json.loads(report.read_text())
            assert result['state'] == 'complete' and result['evidence'] == 'fixture'
            assert result['corpusSha256'] == hashlib.sha256(corpus.read_bytes()).hexdigest()
            assert result['casesSha256'] == hashlib.sha256(cases.read_bytes()).hexdigest()
            assert len(result['cases']) == result['summary']['cases'] == count
            expected = {json.loads(line)['id'] for line in cases.read_text().splitlines()}
            actual = {row['id']: row for row in result['cases']}
            assert set(actual) == expected and len(actual) == count
            # An honest weak baseline is expected; no universal perfect-quality assertion.
            assert result['summary']['expectedFactsMatchCount'] < count
            if split == 'development':
                assert actual['dev-paraphrase']['recallAt3'] == 0
                assert actual['dev-wrong-answer']['recallAt3'] == 1
                assert not actual['dev-wrong-answer']['expectedFactsMatch']
                assert actual['dev-wrong-answer']['citationPrecision'] == 1
                assert actual['dev-revoke']['outcome'] == 'rejected-source'
                assert actual['dev-provider-down']['outcome'] == 'provider-error'
                assert actual['dev-bad-citation']['outcome'] == 'invalid-answer'
                assert actual['dev-no-evidence']['abstained']
                assert actual['dev-bob-refund']['expectedFactsMatch']
                assert actual['dev-no-private']['forbiddenFactsAbsent']
        print('Packaged RAG CLI passed 30/20 case execution and separate retrieval/generation/policy diagnostics. Fixture evidence only.')


if __name__ == '__main__':
    verify()
