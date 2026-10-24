"""Explicit pinned model preparation and owned loopback inference; never a shared Ollama service."""
import argparse
from contextlib import contextmanager
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import signal
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

from compare_tickets import bounded_child, cancellation_signals, defer_cancellation

ROOT = Path(__file__).resolve().parent
LOCK = ROOT / 'SEMANTIC_MODEL_LOCK.json'
CACHE = ROOT / 'target/semantic-artifacts'
ALLOWED_MANIFEST = '1b226e2802dbb772b5fc32a58f103ca1804ef7501331012de126ab22f67475ef'
MAX_DOWNLOAD = 64 * 1024 * 1024
ARTIFACT_CDN = 'dd20bb891979d25aebc8bec07b2b3bbc.r2.cloudflarestorage.com'


class BoundaryError(RuntimeError):
    pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


@contextmanager
def private_root(prefix, parent=None):
    path = None
    expected_parent = Path(parent or tempfile.gettempdir()).resolve()
    try:
        with defer_cancellation():
            path = Path(tempfile.mkdtemp(prefix=prefix, dir=parent)).resolve()
        yield path
    finally:
        with defer_cancellation():
            if path is not None and path.exists():
                if path.parent != expected_parent or not path.name.startswith(prefix) or path.is_symlink():
                    raise BoundaryError('exact_private_root_required')
                shutil.rmtree(path)
                if path.exists():
                    raise BoundaryError('private_root_cleanup_incomplete')


def publish(path, value):
    encoded = json.dumps(value, indent=2) + '\n'
    if len(encoded.encode()) > 262144 or path.is_symlink():
        raise BoundaryError('bounded_regular_report_required')
    path.parent.mkdir(parents=True, exist_ok=True)
    stream = pending = identity = None
    installed = False
    try:
        with defer_cancellation():
            try:
                stream = tempfile.NamedTemporaryFile(mode='w', dir=path.parent, prefix='.semantic-report-', delete=False)
                pending = Path(stream.name)
                stat = os.fstat(stream.fileno()); identity = (stat.st_dev, stat.st_ino)
                stream.write(encoded); stream.close(); pending.replace(path); installed = True
            finally:
                try:
                    if stream is not None: stream.close()
                finally:
                    if pending is not None: pending.unlink(missing_ok=True)
    except BaseException:
        with defer_cancellation():
            if installed and path.exists():
                stat = path.lstat()
                if (stat.st_dev, stat.st_ino) == identity: path.unlink()
        raise


def opener():
    return urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect)


def digest(path):
    value = hashlib.sha256()
    with path.open('rb') as source:
        for part in iter(lambda: source.read(65536), b''):
            value.update(part)
    return value.hexdigest()


def registry_blob(url):
    if not url.startswith('https://registry.ollama.ai/v2/library/all-minilm/blobs/sha256:'):
        raise BoundaryError('fixed_registry_blob_required')
    try:
        return opener().open(url, timeout=15)
    except urllib.error.HTTPError as redirect:
        location = redirect.headers.get('Location', '')
        status = redirect.code
        redirect.close()
        target = urllib.parse.urlsplit(location)
        if (status != 307 or target.scheme != 'https' or target.hostname != ARTIFACT_CDN
                or target.port not in (None, 443) or target.username or target.password or target.fragment):
            raise BoundaryError('unapproved_artifact_redirect') from None
        # One pinned official registry CDN hop, no caller headers or credentials forwarded.
        return opener().open(location, timeout=15)


def model_lock():
    value = json.loads(LOCK.read_text())
    manifest = json.dumps(value['manifest'], separators=(',', ':')).encode()
    if (value['manifestSha256'] != ALLOWED_MANIFEST or hashlib.sha256(manifest).hexdigest() != ALLOWED_MANIFEST
            or value['model'] != 'all-minilm:22m' or value['runtimeVersion'] != '0.32.5'
            or value['dimensions'] != 384 or value['effectiveContextTokens'] != 256
            or value['registry'] != 'https://registry.ollama.ai'):
        raise BoundaryError('reviewed_model_lock_required')
    blobs = [value['manifest']['config'], *value['manifest']['layers']]
    if sum(row['size'] for row in blobs) > MAX_DOWNLOAD:
        raise BoundaryError('model_artifact_budget')
    for row in blobs:
        if not re.fullmatch(r'sha256:[a-f0-9]{64}', row['digest']) or not 0 < row['size'] <= MAX_DOWNLOAD:
            raise BoundaryError('invalid_locked_artifact')
    return value, manifest, blobs


def verified_cache(path):
    lock, manifest, blobs = model_lock()
    if path.is_symlink() or not path.is_dir():
        raise BoundaryError('explicit_prepared_model_cache_required')
    expected = {'manifest.json': ALLOWED_MANIFEST}
    expected.update({row['digest'].replace(':', '-'): row['digest'][7:] for row in blobs})
    for name, wanted in expected.items():
        file = path / name
        if file.is_symlink() or not file.is_file() or digest(file) != wanted:
            raise BoundaryError('model_artifact_hash_mismatch')
    return lock, blobs


def prepare(destination=CACHE):
    lock, manifest, blobs = model_lock()
    if destination.exists():
        verified_cache(destination)
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    with private_root('owned-semantic-download-', destination.parent) as stage:
        (stage / 'manifest.json').write_bytes(manifest)
        expires, downloaded = time.monotonic() + 120, 0
        for row in blobs:
            url = lock['registry'] + '/v2/library/all-minilm/blobs/' + row['digest']
            path = stage / row['digest'].replace(':', '-')
            with registry_blob(url) as response, path.open('xb') as target:
                if response.status != 200:
                    raise BoundaryError('fixed_registry_blob_required')
                while True:
                    if time.monotonic() >= expires:
                        raise BoundaryError('model_download_deadline')
                    part = response.read(65536)
                    if not part:
                        break
                    downloaded += len(part)
                    if downloaded > MAX_DOWNLOAD or target.tell() + len(part) > row['size']:
                        raise BoundaryError('model_download_byte_cap')
                    target.write(part)
            if path.stat().st_size != row['size'] or digest(path) != row['digest'][7:]:
                raise BoundaryError('downloaded_artifact_identity_mismatch')
        verified_cache(stage)
        with defer_cancellation():
            stage.rename(destination)
    # The installed cache is verified public model data, separate from the private runtime cache.


def local_environment(port, models):
    removed = {'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy',
               'JAVA_TOOL_OPTIONS', 'JDK_JAVA_OPTIONS', '_JAVA_OPTIONS', 'CLASSPATH', 'PYTHONPATH'}
    result = {key: value for key, value in os.environ.items() if key not in removed and not key.startswith(('OLLAMA_', 'AI_', 'SPRING_', 'SERVER_', 'MANAGEMENT_', 'OTEL_'))}
    result.update(OLLAMA_HOST=f'127.0.0.1:{port}', OLLAMA_MODELS=str(models), OLLAMA_NUM_PARALLEL='1',
                  OLLAMA_MAX_LOADED_MODELS='1', OLLAMA_CONTEXT_LENGTH='256', OLLAMA_KEEP_ALIVE='0',
                  OLLAMA_NO_CLOUD='1', CUDA_VISIBLE_DEVICES='', ROCR_VISIBLE_DEVICES='',
                  HIP_VISIBLE_DEVICES='', GGML_VK_VISIBLE_DEVICES='', LC_ALL='C.UTF-8')
    return result


def request(origin, route, body=None):
    parsed = urllib.parse.urlsplit(origin)
    if (parsed.scheme != 'http' or parsed.hostname != '127.0.0.1' or not parsed.port
            or parsed.path not in ('', '/') or parsed.query or parsed.fragment or parsed.username
            or route not in ('api/version', 'api/tags', 'api/show', 'api/embed')):
        raise BoundaryError('fixed_owned_runtime_operation_required')
    encoded = None if body is None else json.dumps(body).encode()
    if encoded is not None and len(encoded) > 32768:
        raise BoundaryError('runtime_request_limit')
    call = urllib.request.Request(origin + route, data=encoded, headers={'Content-Type': 'application/json'})
    try:
        response = opener().open(call, timeout=10)
    except urllib.error.HTTPError as failure:
        response = failure
    with response:
        raw = response.read(524289)
        if len(raw) > 524288:
            raise BoundaryError('runtime_response_limit')
        try:
            value = json.loads(raw)
        except (UnicodeError, ValueError):
            raise BoundaryError('runtime_json_required') from None
        return response.status, value


def check_inventory(origin, lock):
    status, value = request(origin, 'api/tags')
    if status != 200 or not isinstance(value.get('models'), list):
        raise BoundaryError('owned_runtime_inventory_required')
    found = [row for row in value['models'] if row.get('name') == lock['model']]
    if len(found) != 1 or found[0].get('digest') != lock['manifestSha256']:
        raise BoundaryError('owned_runtime_model_identity_mismatch')


def owns_listener(process, port):
    # Compare listener socket inode with this exact newly owned daemon's descriptors.
    inodes = set()
    try:
        for descriptor in Path(f'/proc/{process.pid}/fd').iterdir():
            try:
                value = os.readlink(descriptor)
                if value.startswith('socket:['):
                    inodes.add(value[8:-1])
            except FileNotFoundError:
                pass
        for line in Path(f'/proc/{process.pid}/net/tcp').read_text().splitlines()[1:]:
            parts = line.split()
            if parts[1] == f'0100007F:{port:04X}' and parts[3] == '0A' and parts[9] in inodes:
                return True
    except (FileNotFoundError, PermissionError):
        return False
    return False


@contextmanager
def owned_runtime(executable, cache=CACHE):
    lock, blobs = verified_cache(cache)
    executable = executable.resolve(strict=True)
    binary_hash = digest(executable)
    process = log = None
    with private_root('owned-semantic-runtime-') as owner:
        models = owner / 'models'
        manifest_dir = models / 'manifests/registry.ollama.ai/library/all-minilm'
        manifest_dir.mkdir(parents=True)
        (models / 'blobs').mkdir()
        shutil.copyfile(cache / 'manifest.json', manifest_dir / '22m')
        for row in blobs:
            shutil.copyfile(cache / row['digest'].replace(':', '-'), models / 'blobs' / row['digest'].replace(':', '-'))
        with socket.socket() as reservation:
            reservation.bind(('127.0.0.1', 0))
            port = reservation.getsockname()[1]
        origin = f'http://127.0.0.1:{port}/'
        try:
            with defer_cancellation():
                log = (owner / 'runtime.log').open('wb')
                process = subprocess.Popen([str(executable), 'serve'], env=local_environment(port, models),
                    stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
            expires = time.monotonic() + 15
            while not owns_listener(process, port):
                if process.poll() is not None or time.monotonic() >= expires:
                    raise BoundaryError('owned_ollama_startup_failed')
                time.sleep(.05)
            status, version = request(origin, 'api/version')
            if status != 200 or version != {'version': lock['runtimeVersion']}:
                raise BoundaryError('observed_ollama_version_mismatch')
            check_inventory(origin, lock)
            yield origin, {'runtimeVersion': version['version'], 'runtimeExecutableSha256': binary_hash,
                'manifestSha256': lock['manifestSha256'], 'model': lock['model'], 'artifactBytes': sum(row['size'] for row in blobs),
                'dimensions': lock['dimensions'], 'contextTokens': 256, 'tokenizer': 'embedded-BERT-vocabulary-and-IDs',
                'remoteInferenceCalls': 0, 'ownedLoopbackListenerVerified': True, 'sharedRuntimeUsed': False}
            check_inventory(origin, lock)
            if digest(executable) != binary_hash or (owner / 'runtime.log').stat().st_size > 1048576:
                raise BoundaryError('runtime_identity_or_log_limit')
            verified_cache(cache)
        finally:
            with defer_cancellation():
                if process is not None:
                    try:
                        os.killpg(process.pid, signal.SIGTERM)
                    except ProcessLookupError:
                        pass
                    try:
                        process.wait(timeout=3)
                    except subprocess.TimeoutExpired:
                        pass
                    try:
                        os.killpg(process.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                    process.wait(timeout=2)
                if log is not None:
                    log.close()


def embedding_smoke(origin):
    status, value = request(origin, 'api/embed', {'model': 'all-minilm:22m', 'input': ['A parcel travels overseas.', 'The account password was reset.'], 'truncate': False, 'keep_alive': 0})
    vectors = value.get('embeddings', [])
    if status != 200 or len(vectors) != 2:
        raise BoundaryError('actual_embedding_batch_required')
    norms = []
    for vector in vectors:
        if len(vector) != 384 or any(type(number) not in (int, float) or not math.isfinite(number) for number in vector):
            raise BoundaryError('actual_embedding_dimension_or_finite_values')
        norm = math.sqrt(sum(number * number for number in vector))
        if abs(norm - 1) > .001:
            raise BoundaryError('actual_embedding_normalization')
        norms.append(norm)
    status, _ = request(origin, 'api/embed', {'model': 'all-minilm:22m', 'input': ['x ' * 300], 'truncate': False, 'keep_alive': 0})
    if status != 400:
        raise BoundaryError('actual_256_token_rejection_required')
    return {'evidence': 'actual-owned-learned-embeddings-only', 'embeddedTexts': 2, 'dimensions': 384,
            'minimumNorm': min(norms), 'maximumNorm': max(norms), 'oversizedInputRejected': True,
            'pgvectorExecuted': False, 'retrievalQualityAssessed': False, 'humanAnswerSupport': 'not-assessed'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepare-model', action='store_true')
    parser.add_argument('--embedding-smoke', action='store_true')
    parser.add_argument('--evaluate', action='store_true')
    parser.add_argument('--ollama-bin', type=Path, default=Path('/usr/local/bin/ollama'))
    parser.add_argument('--cases', type=Path, default=ROOT / 'fixtures/semantic/development-v1.jsonl')
    args = parser.parse_args()
    report = ROOT / 'target/semantic-evidence/runtime.json'
    report.unlink(missing_ok=True)
    if not any((args.prepare_model, args.embedding_smoke, args.evaluate)):
        parser.error('Explicit model preparation or owned inference required')
    with cancellation_signals():
        if args.prepare_model:
            prepare()
        if args.embedding_smoke or args.evaluate:
            with owned_runtime(args.ollama_bin) as (origin, provenance):
                result = embedding_smoke(origin)
                if args.evaluate:
                    jar = ROOT / 'target/ai-backend-example-0.0.1-SNAPSHOT.jar'
                    output = ROOT / 'target/semantic-evidence/evaluation.json'
                    output.unlink(missing_ok=True)
                    environment = local_environment(1, Path('/no-model-store-used-by-java'))
                    environment.update({key: value for key, value in os.environ.items() if key.startswith('AI_SEMANTIC_DB_')})
                    environment.update(AI_SEMANTIC_ORIGIN=origin, AI_SEMANTIC_MODEL_DIGEST=ALLOWED_MANIFEST, AI_SEMANTIC_RUNTIME=provenance['runtimeVersion'])
                    bounded_child(['java', '-Xmx256m', '-jar', str(jar), '--evaluate-semantic',
                        str(ROOT / 'fixtures/semantic/corpus-v1.json'), str(args.cases), str(output)], environment, 240,
                        output_limit=32768, error_prefix='semantic_evaluation')
                    if not json.loads(output.read_text()).get('ownedSchemaRemoved'):
                        raise BoundaryError('actual_pgvector_cleanup_required')
                result.update(provenance)
            result['ownedRuntimeCleaned'] = True
            result['modelLockSha256LF'] = hashlib.sha256(LOCK.read_text().encode()).hexdigest()
            result['runnerSha256LF'] = hashlib.sha256(Path(__file__).read_text().encode()).hexdigest()
            result['protocolSha256LF'] = hashlib.sha256((ROOT / 'SEMANTIC_PROTOCOL.md').read_text().encode()).hexdigest()
            result['modelArtifactHashesVerified'] = True
            publish(report, result)
            print('PASS: owned learned embeddings; actual pgvector is ' + ('separately verified' if args.evaluate else 'not executed') + '; cleanup complete.')


if __name__ == '__main__':
    try:
        main()
    except (Exception, KeyboardInterrupt):
        raise SystemExit('Semantic exercise failed/cancelled; no new runtime-success receipt is claimed. Private raw output is not exported.') from None
