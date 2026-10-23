#!/usr/bin/env python3
"""Compare frozen prompts on identical cases; fixture results never mean model quality."""
import argparse
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import re
import selectors
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
VERSIONS = ('ticket-v1', 'ticket-examples-v2', 'ticket-rules-v1')
GATE_VERSION = 'ticket-field-gate-v1'
FROZEN_COMMIT = '2d1247d7ab887cc0f4440d494a4d59528430144d'
# Obtained by compiling TicketPrompts from the frozen Git object with Java 17.
FROZEN_PROMPT_HASHES = {
    'ticket-v1': 'd1cc84ac02cbc6dfb05f71ba188cc885da9c81bb3d09ece9727f4de580ab53fa',
    'ticket-examples-v2': 'ecd77ecd02aed1f2d7dba615ffb7b7ffd389bb4470d0d60919ce08ae107922ed',
    'ticket-rules-v1': 'not-applicable',
}
INVENTORY_TIMEOUT_SECONDS = 10
INVENTORY_ERRORS = frozenset((
    'inventory_body_limit', 'observed_inventory_provenance_mismatch',
    'locally_stored_gguf_required', 'inventory_artifact_size_invalid',
    'inventory_request_failed', 'inventory_worker_input_invalid',
))


class ComparisonCancelled(RuntimeError):
    pass


class ChildFailure(RuntimeError):
    def __init__(self, code, output):
        super().__init__(code)
        self.output = output


_cancellation = threading.local()


@contextmanager
def cancellation_signals():
    """Opt-in executable policy; library calls alone leave host signals unchanged."""
    if threading.current_thread() is not threading.main_thread():
        yield
        return
    error, message = ComparisonCancelled, 'comparison_cancelled'
    previous = {number: signal.getsignal(number) for number in (signal.SIGTERM, signal.SIGINT)}
    outer = getattr(_cancellation, 'state', None)
    state = dict(depth=0, requested=False, delivered=False, error=error, message=message)

    def cancel(_number, _frame):
        if state['requested']:
            return  # Repeated cancellation must not interrupt finite owned-child cleanup.
        state['requested'] = True
        if not state['depth']:
            state['delivered'] = True
            raise error(message)

    try:
        _cancellation.state = state
        for number in previous:
            signal.signal(number, cancel)
        yield
    finally:
        for number, handler in previous.items():
            signal.signal(number, handler)
        _cancellation.state = outer


@contextmanager
def defer_cancellation():
    # A thread mask alone cannot defer Python's handler when another thread receives TERM/INT.
    state = getattr(_cancellation, 'state', None)
    if state is None:
        yield
        return
    state['depth'] += 1
    try:
        yield
    finally:
        state['depth'] -= 1
        if not state['depth'] and state['requested'] and not state['delivered']:
            state['delivered'] = True
            raise state['error'](state['message'])


def digest(data):
    return hashlib.sha256(data).hexdigest()


def atomic_report(path, report):
    encoded = (json.dumps(report, indent=2, ensure_ascii=True) + '\n').encode()
    if len(encoded) > 524288:
        raise ValueError('comparison_report_limit')
    if path.is_symlink():
        raise ValueError('report_symlink_rejected')
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix='.comparison-', delete=False) as output:
        pending = Path(output.name)
        try:
            output.write(encoded)
            output.close()
            os.replace(pending, path)
        finally:
            pending.unlink(missing_ok=True)


def dataset_identity(path):
    raw = path.read_bytes() if path.stat().st_size <= 524288 else b''
    if not raw:
        raise ValueError('bounded_nonempty_dataset_required')
    rows = [json.loads(line) for line in raw.decode('utf-8', errors='strict').splitlines() if line.strip()]
    if not 1 <= len(rows) <= 50:
        raise ValueError('comparison_case_limit')
    ids = [row.get('id') for row in rows]
    if any(not isinstance(value, str) or not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,79}', value) for value in ids) or len(set(ids)) != len(ids):
        raise ValueError('unique_case_ids_required')
    # Java applies the full existing task-schema validator before making a provider call.
    return dict(cases=len(rows), ids=ids, sha256=digest(raw),
                lfSha256=digest(raw.replace(b'\r\n', b'\n')))


def isolated_environment():
    blocked = ('AI_', 'SPRING_', 'SERVER_', 'LOGGING_', 'MANAGEMENT_')
    return {key: value for key, value in os.environ.items()
            if not key.startswith(blocked) and key not in ('JAVA_TOOL_OPTIONS', 'JDK_JAVA_OPTIONS', '_JAVA_OPTIONS')}


def validate_provider(mode, endpoint, model, expected_digest=None, expected_runtime=None):
    uri = urlsplit(endpoint)
    if uri.scheme != 'http' or uri.hostname not in ('127.0.0.1', 'localhost', '::1') or uri.path != '/api/chat' or uri.query or uri.fragment or uri.username or uri.password:
        raise ValueError('explicit_loopback_native_chat_required')
    if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,119}', model) or model.lower().endswith((':cloud', '-cloud')):
        raise ValueError('explicit_noncloud_model_required')
    if mode == 'fixture':
        if model != 'teaching-fixture':
            raise ValueError('fixture_model_mismatch')
        return dict(model=model, modelDigest='fixture', runtimeVersion='fixture', inventoryRequests=0)
    if mode != 'live-local' or model == 'teaching-fixture' or not re.fullmatch(r'[a-f0-9]{64}', expected_digest or '') or not re.fullmatch(r'[a-zA-Z0-9.+-]{1,80}', expected_runtime or ''):
        raise ValueError('explicit_live_digest_and_runtime_required')
    return None


def observe_provider(endpoint, model, expected_digest, expected_runtime):
    origin = endpoint[:-len('/api/chat')]

    def read(route, payload=None):
        request = urllib.request.Request(origin + '/api/' + route,
                  data=None if payload is None else json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
        # Redirects cannot turn a loopback inventory request into a remote request.
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *args, **kwargs):
                return None
        with urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect).open(request, timeout=3) as response:
            raw = response.read(262145)
            if len(raw) > 262144:
                raise ValueError('inventory_body_limit')
            return json.loads(raw)
    runtime = read('version').get('version')
    models = read('tags').get('models', [])
    matches = [row for row in models if row.get('name') == model and row.get('digest') == expected_digest]
    if len(matches) != 1 or runtime != expected_runtime:
        raise ValueError('observed_inventory_provenance_mismatch')
    show = read('show', {'model': model})
    if show.get('remote_host') or show.get('remote_model') or show.get('details', {}).get('format') != 'gguf':
        raise ValueError('locally_stored_gguf_required')
    size = matches[0].get('size')
    if isinstance(size, bool) or not isinstance(size, int) or not 1 <= size <= 1_000_000_000_000:
        raise ValueError('inventory_artifact_size_invalid')
    return dict(model=model, modelDigest=expected_digest, runtimeVersion=runtime, inventoryRequests=3,
                artifactBytes=size, format='gguf',
                attestationLimit='Inspected daemon inventory, not independent attestation of daemon code or network isolation.')


def inventory_worker():
    """Private subprocess: emit only allowlisted metadata or a fixed failure code."""
    try:
        raw = sys.stdin.buffer.read(2049)
        if len(raw) > 2048:
            raise ValueError('inventory_worker_input_invalid')
        request = json.loads(raw)
        if not isinstance(request, dict) or set(request) != {'endpoint', 'model', 'expected_digest', 'expected_runtime'}:
            raise ValueError('inventory_worker_input_invalid')
        validate_provider('live-local', **request)
        result = observe_provider(**request)
        print(json.dumps(result, separators=(',', ':')))
        return 0
    except Exception as error:
        code = str(error) if isinstance(error, ValueError) and str(error) in INVENTORY_ERRORS else 'inventory_request_failed'
        print(json.dumps(dict(error=code)))
        return 2


def provider_identity(mode, endpoint, model, expected_digest=None, expected_runtime=None):
    fixture = validate_provider(mode, endpoint, model, expected_digest, expected_runtime)
    if fixture is not None:
        return fixture
    request = dict(endpoint=endpoint, model=model, expected_digest=expected_digest, expected_runtime=expected_runtime)
    encoded = json.dumps(request).encode()
    if len(encoded) > 2048:
        raise ValueError('inventory_worker_input_invalid')
    try:
        raw = bounded_child([sys.executable, str(Path(__file__).resolve()), '--inventory-worker'],
                            isolated_environment(), INVENTORY_TIMEOUT_SECONDS,
                            input_bytes=encoded, output_limit=4096, error_prefix='inventory_child')
    except ChildFailure as error:
        try:
            code = json.loads(error.output).get('error')
        except (ValueError, AttributeError, UnicodeError):
            code = None
        raise ValueError(code if code in INVENTORY_ERRORS else 'inventory_request_failed') from None
    result = json.loads(raw)
    # The worker's provider data is never copied wholesale into a published report.
    if (not isinstance(result, dict) or result.get('model') != model
            or result.get('modelDigest') != expected_digest or result.get('runtimeVersion') != expected_runtime
            or result.get('inventoryRequests') != 3 or result.get('format') != 'gguf'
            or isinstance(result.get('artifactBytes'), bool) or not isinstance(result.get('artifactBytes'), int)
            or not 1 <= result['artifactBytes'] <= 1_000_000_000_000):
        raise ValueError('inventory_worker_contract_failed')
    return dict(model=model, modelDigest=expected_digest, runtimeVersion=expected_runtime,
                inventoryRequests=3, artifactBytes=result['artifactBytes'], format='gguf',
                attestationLimit='Inspected daemon inventory, not independent attestation of daemon code or network isolation.')


def bounded_child(command, environment, timeout, *, input_bytes=None, output_limit=32768, error_prefix='comparison_child'):
    process = None
    selector = selectors.DefaultSelector()
    deadline, output = time.monotonic() + timeout, bytearray()
    try:
        with defer_cancellation():
            process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                       stdin=subprocess.PIPE if input_bytes is not None else subprocess.DEVNULL,
                                       env=environment, start_new_session=True)
        if input_bytes is not None:
            if len(input_bytes) > 2048:
                raise ValueError('comparison_child_input_limit')
            process.stdin.write(input_bytes)
            process.stdin.close()
        selector.register(process.stdout, selectors.EVENT_READ)
        while selector.get_map():
            if time.monotonic() >= deadline:
                raise TimeoutError(error_prefix + '_deadline')
            for key, _ in selector.select(min(.2, max(0, deadline - time.monotonic()))):
                chunk = os.read(key.fd, 4096)
                if not chunk:
                    selector.unregister(key.fileobj)
                output.extend(chunk)
                if len(output) > output_limit:
                    raise RuntimeError(error_prefix + '_output_limit')
        if process.wait(timeout=max(.1, deadline - time.monotonic())):
            raise ChildFailure(error_prefix + '_failed', bytes(output))
        return bytes(output)
    finally:
        with defer_cancellation():
            selector.close()
            # Own session only: parent exit does not prove its child group exited.
            if process is not None:
                try:
                    os.killpg(process.pid, signal.SIGTERM)
                    try:
                        process.wait(timeout=2)
                    except subprocess.TimeoutExpired:
                        pass
                    try:
                        os.killpg(process.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                except ProcessLookupError:
                    pass
                process.wait(timeout=3)
                process.stdout.close()
                if process.stdin is not None and not process.stdin.closed:
                    process.stdin.close()

def bounded_java(command, environment, timeout):
    bounded_child(command, environment, timeout)


def decide(variants, complete):
    if not complete:
        return dict(status='not-evaluated-incomplete-run', gateVersion=GATE_VERSION)
    eligible = {}
    for version in VERSIONS:
        result = variants[version]
        eligible[version] = (result['summary']['exactFieldMatchRate'] >= .9
                            and result['summary']['errors'].get('unsupported_order_id', 0) == 0)
    old, new, rule = [variants[version]['summary']['exactFieldMatches'] for version in VERSIONS]
    if eligible['ticket-rules-v1'] and rule >= max(old, new):
        status = 'prefer-no-model-reference-for-this-sample'
    elif eligible['ticket-examples-v2'] and new > old:
        status = 'candidate-passes-narrow-field-gate'
    elif eligible['ticket-v1']:
        status = 'retain-original-prompt'
    else:
        status = 'no-model-prompt-meets-field-gate'
    baseline = {row['id']: row['fieldsCorrect'] for row in variants['ticket-v1']['cases']}
    candidate = {row['id']: row['fieldsCorrect'] for row in variants['ticket-examples-v2']['cases']}
    transitions = dict(improved=0, regressed=0, bothCorrect=0, bothWrong=0)
    for case_id, before in baseline.items():
        after = candidate[case_id]
        key = 'bothCorrect' if before and after else 'improved' if after else 'regressed' if before else 'bothWrong'
        transitions[key] += 1
    return dict(status=status, gateVersion=GATE_VERSION, exactFieldTarget=.9, eligible=eligible,
                exactFieldDelta=new-old, pairedTransitions=transitions,
                applicationDefaultChanged=False, summaryFaithfulness='not-assessed', humanReview='not-performed')


def validate_child(child, identity, version, mode, provider):
    rules = version == 'ticket-rules-v1'
    if (child.get('state') != 'complete' or child.get('datasetSha256') != identity['sha256']
            or child.get('datasetLfSha256') != identity['lfSha256'] or child.get('promptVersion') != version
            or [row.get('id') for row in child.get('cases', [])] != identity['ids']
            or child.get('systemPromptSha256') != FROZEN_PROMPT_HASHES[version]
            or child.get('usesModel') is not (not rules)
            or child.get('evidence') != ('rule' if rules else mode)
            or child.get('model') != ('ticket-rules-v1' if rules else provider['model'])
            or child.get('modelDigest') != ('not-applicable' if rules else provider['modelDigest'])
            or (not rules and child.get('runtimeVersion') != provider['runtimeVersion'])
            or child.get('summary', {}).get('cases') != identity['cases']):
        raise ValueError('comparison_child_identity_mismatch')


def compare(dataset, output, jar, mode, endpoint, model, model_digest=None, runtime=None, timeout_ms=8000):
    dataset, output, jar = Path(dataset).resolve(strict=True), Path(output).absolute(), Path(jar).resolve(strict=True)
    if output.resolve() in (dataset, jar):
        raise ValueError('report_must_not_replace_input')
    identity = dataset_identity(dataset)
    if not 100 <= timeout_ms <= 10000 or not jar.is_file() or jar.stat().st_size > 268435456:
        raise ValueError('comparison_runtime_limits')
    started = time.monotonic()
    report = dict(schemaVersion=1, evidence=mode, state='running', dataset=identity, provider=None,
                  candidateFreezeCommit=FROZEN_COMMIT, gateVersion=GATE_VERSION, runOrder=list(VERSIONS),
                  freezeBinding=dict(status='pending', expectedSystemPromptSha256=dict(FROZEN_PROMPT_HASHES),
                                     scope='Checks reported prompt hashes against frozen source; JAR hash records the artifact, not source/build attestation.'),
                  orderLimit='Sequential complete-dataset runs; caching/cold start can change latency. Not a speed benchmark.',
                  variants={}, decision=decide({}, False), applicationDefault='ticket-v1',
                  usageAndPrice=dict(tokens=None, costPerAcceptedResult=None, reason='This nonstreaming adapter does not expose metering. Unknown is not zero.'),
                  limits=dict(cases=50, modelCalls=2*identity['cases'], timeoutPerCallMs=timeout_ms,
                              overallSeconds=300, inventoryExecutionSeconds=INVENTORY_TIMEOUT_SECONDS,
                              childCleanupSeconds=5),
                  scope='Synthetic field-match experiment only; no summary entailment, human learning, real-world quality, paid execution or automatic deployment claim.')
    output.parent.mkdir(parents=True, exist_ok=True)
    with cancellation_signals():
        atomic_report(output, report)
        try:
            provider = provider_identity(mode, endpoint, model, model_digest, runtime)
            report['provider'] = provider
            atomic_report(output, report)
            with tempfile.TemporaryDirectory(prefix='owned-ticket-comparison-') as directory:
                owned = Path(directory)
                copy = owned / 'example.jar'
                shutil.copyfile(jar, copy)
                report['jarSha256'] = digest(copy.read_bytes())
                for version in VERSIONS:
                    child_report = owned / (version + '.json')
                    env = isolated_environment()
                    env.update(AI_EVIDENCE=mode, AI_ENDPOINT=endpoint, AI_MODEL=model,
                               AI_MODEL_DIGEST=provider['modelDigest'], AI_RUNTIME_VERSION=provider['runtimeVersion'],
                               AI_TIMEOUT_MS=str(timeout_ms), AI_MAX_CALLS=str(identity['cases']), AI_TICKET_PROMPT=version)
                    rule = version == 'ticket-rules-v1'
                    if rule:
                        env.update(AI_ENDPOINT='not-a-url', AI_MODEL='must-not-call')
                    try:
                        remaining = 300 - (time.monotonic() - started)
                        if remaining <= 0:
                            raise TimeoutError('comparison_run_deadline')
                        bounded_java(['java', '-Xmx192m', '-XX:ActiveProcessorCount=2', '-jar', str(copy),
                                      '--evaluate-rules' if rule else '--evaluate', str(dataset), str(child_report)], env, remaining)
                        if child_report.stat().st_size > 524288:
                            raise ValueError('comparison_child_report_limit')
                        child = json.loads(child_report.read_text())
                        validate_child(child, identity, version, mode, provider)
                        report['variants'][version] = child
                        atomic_report(output, report)
                    except BaseException:
                        if child_report.exists() and child_report.stat().st_size <= 524288:
                            try:
                                partial = json.loads(child_report.read_text())
                                # Never attribute an unverified or mismatched prompt to the freeze.
                                if partial.get('systemPromptSha256') == FROZEN_PROMPT_HASHES[version]:
                                    report['variants'][version] = partial
                            except (ValueError, AttributeError, UnicodeError):
                                pass
                        raise
            report.update(state='complete', decision=decide(report['variants'], True), ownedChildrenReaped=True)
            report['freezeBinding']['status'] = 'verified-frozen-system-prompts'
            atomic_report(output, report)
        except BaseException as error:
            report.update(state='interrupted',
                          failure='comparison_cancelled' if isinstance(error, ComparisonCancelled) else 'bounded-child-or-contract-failure',
                          decision=decide({}, False))
            atomic_report(output, report)
            raise
    return report


if __name__ == '__main__':
    if sys.argv[1:] == ['--inventory-worker']:
        raise SystemExit(inventory_worker())
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--jar', default=str(ROOT / 'target/ai-backend-example-0.0.1-SNAPSHOT.jar'))
    parser.add_argument('--mode', choices=('fixture', 'live-local'), default='fixture')
    args = parser.parse_args()
    try:
        result = compare(args.dataset, args.output, args.jar, args.mode,
                         os.environ.get('AI_ENDPOINT', 'http://127.0.0.1:9193/api/chat'),
                         os.environ.get('AI_MODEL', 'teaching-fixture'),
                         os.environ.get('AI_MODEL_DIGEST'), os.environ.get('AI_RUNTIME_VERSION'))
        print('Comparison complete:', result['decision']['status'])
    except Exception as error:
        raise SystemExit('Comparison failed (' + type(error).__name__ + '); inspect the bounded sanitized report if present.')
