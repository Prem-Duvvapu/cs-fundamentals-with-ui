#!/usr/bin/env python3
"""Actual packaged HTTP, concurrent delivery, key rotation and crash/reopen evidence."""
import concurrent.futures
import hashlib
import hmac
import http.client
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
TARGET = ROOT / 'target'
EVIDENCE = TARGET / 'evidence'
JAR = TARGET / 'backend-webhooks-lab-1.0-SNAPSHOT.jar'
STARTUP_SECONDS = 60


class LabFailure(RuntimeError):
    pass


def require(condition, code):
    if not condition:
        raise LabFailure(code)


def runtime_env(values):
    # Do not inherit JVM injection, Spring config/server settings or someone else's lab paths.
    result = {key: value for key, value in os.environ.items()
              if not key.startswith(('LAB_', 'SPRING_', 'SERVER_'))
              and key not in {'JAVA_TOOL_OPTIONS', 'JDK_JAVA_OPTIONS', '_JAVA_OPTIONS'}}
    result.update(values)
    return result


def redact_log(text, sensitive, temporary):
    # Refuse credentials/raw signed bodies before retaining even a redacted artifact.
    require(not any(value and value in text for value in sensitive), 'server_log_contains_sensitive_value')
    return text.replace(str(temporary), '[owned-runtime]')


class Server:
    def __init__(self, owned, values, sequence, sensitive):
        self.owned, self.values, self.sequence, self.sensitive = owned, values, sequence, sensitive
        self.process = None
        self.log = owned / f'server-{sequence}.log'
        self.ready = owned / f'ready-{sequence}'

    def __enter__(self):
        self.output = self.log.open('wb')
        values = dict(self.values, LAB_READY_FILE=str(self.ready))
        try:
            self.process = subprocess.Popen(['java', '-Xmx192m', '-XX:ActiveProcessorCount=2', '-XX:TieredStopAtLevel=1', '-jar', str(JAR)],
                                            cwd=ROOT, env=runtime_env(values), stdout=self.output, stderr=subprocess.STDOUT)
            deadline = time.monotonic() + STARTUP_SECONDS
            while time.monotonic() < deadline:
                if self.process.poll() is not None:
                    raise LabFailure('owned_server_startup_failed')
                if self.ready.is_file():
                    self.port = int(self.ready.read_text())
                    require(1 <= self.port <= 65535, 'invalid_assigned_port')
                    return self
                time.sleep(.05)
            raise LabFailure('owned_server_startup_deadline')
        except BaseException:
            self.__exit__(None, None, None)
            raise

    def __exit__(self, *ignored):
        if self.process is not None and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=6)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=3)
        self.output.close()
        text = self.log.read_text(errors='replace')
        sanitized = redact_log(text, self.sensitive, self.owned)
        (EVIDENCE / f'server-{self.sequence}.log').write_text(sanitized)

    def crash(self):
        require(self.process.poll() is None, 'server_not_live_for_crash')
        self.process.kill()
        self.process.wait(timeout=3)
        require(self.process.returncode != 0, 'expected_actual_process_crash')


def headers_for(keys, tenant, body, key_id='new', timestamp=None):
    timestamp = str(int(time.time())) if timestamp is None else str(timestamp)
    secret = keys[(tenant, key_id)]
    signed = timestamp.encode('ascii') + b'\n' + tenant.encode('ascii') + b'\n' + body
    signature = hmac.new(bytes.fromhex(secret), signed, hashlib.sha256).hexdigest()
    return {'Content-Type': 'application/json', 'X-Key-Id': key_id, 'X-Timestamp': timestamp, 'X-Signature': signature}


def request(server, method, path, body=b'', headers=None, timeout=4):
    connection = http.client.HTTPConnection('127.0.0.1', server.port, timeout=timeout)
    try:
        connection.request(method, path, body=body, headers=headers or {})
        response = connection.getresponse()
        raw = response.read(4097)
        require(len(raw) <= 4096, 'response_body_limit')
        require(response.getheader('Cache-Control') == 'no-store', 'missing_response_no_store')
        return response.status, json.loads(raw)
    finally:
        connection.close()


def payload(event, amount=7, version=1):
    value = {'schemaVersion': version, 'eventId': event, 'type': 'credit', 'amountMinor': amount}
    if version == 2:
        value['deliveryHint'] = 'Optional information, same currency unit'
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


def run_http(owned, secrets_map, sensitive):
    keys = {('tenant-a', 'old'): secrets_map['LAB_KEY_A_OLD'], ('tenant-a', 'new'): secrets_map['LAB_KEY_A_NEW'],
            ('tenant-b', 'new'): secrets_map['LAB_KEY_B_NEW']}
    values = dict(secrets_map, LAB_DB_PATH=str(owned / 'events'), LAB_ACCEPT_OLD='true')
    cases, observations = [], {}

    def record(name, condition):
        require(condition, 'http_case_failed_' + name)
        cases.append({'name': name, 'passed': True})

    def state(server):
        status, value = request(server, 'GET', '/lab/state', headers={'X-Lab-Observer': secrets_map['LAB_OBSERVER_SECRET']})
        require(status == 200, 'observer_request_failed')
        return value

    def send(server, body, tenant='tenant-a', key_id='new', timestamp=None, expected=202, supplied=None):
        headers = headers_for(keys, tenant, body, key_id, timestamp) if supplied is None else supplied
        sensitive.add(headers.get('X-Signature', ''))
        sensitive.add(body.decode('utf-8', errors='ignore'))
        result = request(server, 'POST', '/webhooks/' + tenant, body, headers)
        require(result[0] == expected, 'unexpected_webhook_http_status')
        return result[1]

    with Server(owned, values, 1, sensitive) as server:
        record('observer_authentication', request(server, 'GET', '/lab/state')[0] == 401)
        record('missing_signature', request(server, 'POST', '/webhooks/tenant-a', b'{}', {'Content-Type': 'application/json'})[0] == 401)
        old = payload('evt-old-key', amount=3)
        record('old_key_during_overlap_v1', send(server, old, key_id='old')['result'] == 'applied')
        modern = payload('evt-new-key', amount=5, version=2)
        record('new_key_during_overlap_v2', send(server, modern)['result'] == 'applied')
        record('same_bytes_replay', send(server, modern, expected=200)['result'] == 'duplicate')
        record('same_event_changed_bytes_conflict', send(server, modern + b' ', expected=409)['result'] == 'event_conflict')
        tampered = payload('evt-tampered')
        supplied = headers_for(keys, 'tenant-a', tampered)
        record('exact_raw_body_binding', send(server, tampered + b' ', supplied=supplied, expected=401)['result'] == 'unauthorized')
        supplied = headers_for(keys, 'tenant-a', tampered)
        record('authenticated_tenant_binding', send(server, tampered, tenant='tenant-b', supplied=supplied, expected=401)['result'] == 'unauthorized')
        for label, shift in [('stale_timestamp', -61), ('future_timestamp', 61)]:
            record(label, send(server, tampered, timestamp=int(time.time()) + shift, expected=401)['result'] == 'unauthorized')
        record('breaking_schema_rejected', send(server, payload('evt-breaking', version=3), expected=422)['result'] == 'payload_invalid')
        duplicate_fields = payload('evt-duplicate-fields')[:-1] + b',"amountMinor":999}'
        record('duplicate_json_fields_rejected', send(server, duplicate_fields, expected=422)['result'] == 'payload_invalid')
        record('trailing_json_rejected', send(server, payload('evt-trailing') + b'{}', expected=422)['result'] == 'payload_invalid')
        record('invalid_utf8_rejected', send(server, b'\xc3\x28', expected=422)['result'] == 'payload_invalid')
        oversize = b' ' * 4097
        record('body_size_limit', send(server, oversize, expected=413)['result'] == 'body_too_large')
        supplied = headers_for(keys, 'tenant-a', tampered)
        supplied['Content-Type'] = 'text/plain'
        record('media_type_boundary', send(server, tampered, supplied=supplied, expected=415)['result'] == 'unsupported_media')
        # Real duplicate header lines, not a dictionary that silently collapsed them.
        duplicate = http.client.HTTPConnection('127.0.0.1', server.port, timeout=4)
        try:
            duplicate.putrequest('POST', '/webhooks/tenant-a')
            for name, value in headers_for(keys, 'tenant-a', tampered).items():
                duplicate.putheader(name, value)
            duplicate.putheader('X-Timestamp', str(int(time.time())))
            duplicate.putheader('Content-Length', str(len(tampered)))
            duplicate.endheaders(tampered)
            reply = duplicate.getresponse()
            record('duplicate_auth_header_rejected', reply.status == 401)
            require(len(reply.read(4097)) <= 4096, 'response_body_limit')
        finally:
            duplicate.close()
        # Chunked framing has no trustworthy content length; cap while collecting bytes.
        chunked = http.client.HTTPConnection('127.0.0.1', server.port, timeout=4)
        try:
            chunked.request('POST', '/webhooks/tenant-a', body=iter([b' ' * 4097]), headers=headers_for(keys, 'tenant-a', oversize), encode_chunked=True)
            reply = chunked.getresponse()
            record('chunked_body_size_limit', reply.status == 413)
            require(len(reply.read(4097)) <= 4096, 'response_body_limit')
        finally:
            chunked.close()
        # Hold an incomplete authenticated body open; asynchronous timeout must terminate it.
        slow = socket.create_connection(('127.0.0.1', server.port), timeout=4)
        started = time.monotonic()
        try:
            wire = ['POST /webhooks/tenant-a HTTP/1.1', f'Host: 127.0.0.1:{server.port}', 'Content-Length: 100']
            wire += [f'{name}: {value}' for name, value in headers_for(keys, 'tenant-a', tampered).items()]
            slow.sendall(('\r\n'.join(wire) + '\r\n\r\n{').encode('ascii'))
            answer = slow.recv(4096)
            elapsed = time.monotonic() - started
            require(b' 408 ' in answer and elapsed < 4, 'incomplete_body_deadline_status_' + answer.split(b'\r\n', 1)[0].decode('ascii', errors='replace') + '_seconds_' + str(round(elapsed, 3)))
            record('incomplete_body_deadline', True)
            observations['incomplete_body_seconds'] = round(elapsed, 3)
        finally:
            slow.close()
        before = state(server)
        concurrent_body = payload('evt-concurrent', amount=11)
        barrier = __import__('threading').Barrier(4)
        # The first status is deliberately not predetermined; exactly one actual commit must win.
        def attempt(_):
            barrier.wait(timeout=3)
            headers = headers_for(keys, 'tenant-a', concurrent_body)
            status, value = request(server, 'POST', '/webhooks/tenant-a', concurrent_body, headers)
            require(status in (200, 202), 'concurrent_delivery_not_successful')
            return value['result']
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            outcomes = list(executor.map(attempt, range(4)))
        after = state(server)
        record('concurrent_duplicate_exact_one_commit', outcomes.count('applied') == 1 and outcomes.count('duplicate') == 3
               and after['tenant-a']['effects'] == before['tenant-a']['effects'] + 1
               and after['tenant-a']['balance'] == before['tenant-a']['balance'] + 11)
        record('same_event_id_other_tenant_is_independent', send(server, concurrent_body, tenant='tenant-b')['result'] == 'applied'
               and state(server)['tenant-b'] == {'balance': 11, 'receipts': 1, 'effects': 1})
        observations['before_rotation'] = state(server)

    retired = dict(values, LAB_ACCEPT_OLD='false')
    with Server(owned, retired, 2, sensitive) as server:
        record('retired_key_rejected_after_restart', send(server, payload('evt-retired'), key_id='old', expected=401)['result'] == 'unauthorized')
        record('active_key_works_after_rotation', send(server, payload('evt-after-rotation', amount=2))['result'] == 'applied')
        record('rotation_preserves_committed_receipts', send(server, old, key_id='new', expected=200)['result'] == 'duplicate')
        observations['before_crash'] = state(server)

    signal = owned / 'commit-signal'
    delayed = dict(retired, LAB_COMMIT_SIGNAL=str(signal), LAB_RESPONSE_DELAY_MS='5000')
    ambiguous = payload('evt-ambiguous-restart', amount=13)
    with Server(owned, delayed, 3, sensitive) as server:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            headers = headers_for(keys, 'tenant-a', ambiguous)
            began = time.monotonic()
            future = executor.submit(request, server, 'POST', '/webhooks/tenant-a', ambiguous, headers, 3)
            deadline = began + 2.5
            while not signal.is_file() and time.monotonic() < deadline:
                require(server.process.poll() is None, 'owned_server_died_before_commit_signal')
                time.sleep(.01)
            require(signal.is_file() and not future.done(), 'commit_not_observed_before_response_timeout')
            observations['commit_signal_seconds'] = round(time.monotonic() - began, 3)
            require(state(server)['tenant-a']['balance'] == observations['before_crash']['tenant-a']['balance'] + 13, 'commit_not_observed_before_timeout')
            timed_out = False
            try:
                future.result(timeout=4)
            except (TimeoutError, socket.timeout):
                timed_out = True
            record('actual_response_timeout_after_commit', timed_out)
            server.crash()
            record('actual_owned_jvm_crash', server.process.returncode != 0)
    with Server(owned, retired, 4, sensitive) as server:
        record('reopen_reconcile_duplicate_not_second_effect', send(server, ambiguous, expected=200)['result'] == 'duplicate')
        current = state(server)
        previous = observations['before_crash']['tenant-a']
        record('restarted_durable_exact_one_effect', current['tenant-a'] == {'balance': previous['balance'] + 13,
               'receipts': previous['receipts'] + 1, 'effects': previous['effects'] + 1})
        record('restart_changed_request_rejected', send(server, ambiguous + b' ', expected=409)['result'] == 'event_conflict')
        observations['final_state'] = state(server)
    return cases, observations


def main():
    require(sys.argv[1:] in ([], ['--skip-build']), 'usage_verify_py_optional_skip_build')
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    report_path = EVIDENCE / 'verification.json'
    report_path.unlink(missing_ok=True)
    if not sys.argv[1:]:
        # Maven clean deletes target; retain its bounded log outside that directory until it finishes.
        with tempfile.TemporaryFile() as log:
            result = subprocess.run(['mvn', '-B', '-f', str(ROOT / 'pom.xml'), 'clean', 'verify'], cwd=ROOT,
                                    stdout=log, stderr=subprocess.STDOUT, env=runtime_env({}), timeout=180)
            log.seek(0)
            output = log.read(1_000_001)
        EVIDENCE.mkdir(parents=True, exist_ok=True)
        require(len(output) <= 1_000_000, 'build_log_limit')
        (EVIDENCE / 'maven.log').write_bytes(output)
        require(result.returncode == 0, 'maven_verification_failed')
    require(JAR.is_file(), 'packaged_jar_missing')
    suites = [ET.parse(path).getroot() for path in (TARGET / 'surefire-reports').glob('TEST-*.xml')]
    tests = sum(int(suite.attrib.get('tests', 0)) for suite in suites)
    require(tests == 8 and all(int(suite.attrib.get(field, 0)) == 0 for suite in suites for field in ('failures', 'errors', 'skipped')), 'eight_actual_java_tests_without_skips_required')
    values = {name: secrets.token_hex(32) for name in ('LAB_DB_PASSWORD', 'LAB_OBSERVER_SECRET', 'LAB_KEY_A_OLD', 'LAB_KEY_A_NEW', 'LAB_KEY_B_NEW')}
    sensitive = set(values.values())
    owned = Path(tempfile.mkdtemp(prefix='owned-webhook-', dir=TARGET))
    try:
        os.chmod(owned, 0o700)
        cases, observations = run_http(owned, values, sensitive)
    finally:
        shutil.rmtree(owned)
    require(not owned.exists(), 'owned_runtime_not_removed')
    report = {'version': 1, 'evidence': 'actual-packaged-loopback-http-and-file-h2', 'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
              'java_tests': tests, 'java_skips': 0, 'http_cases': cases, 'observations': observations,
              'owned_processes_and_temporary_database_cleaned': True, 'jar_sha256': hashlib.sha256(JAR.read_bytes()).hexdigest(),
              'limits': 'Synthetic integer credit ledger; same H2 transaction only. No remote payment, power-loss, multi-node, global exactly-once, cloud secrets or production TLS claim.'}
    pending = report_path.with_suffix('.pending')
    pending.write_text(json.dumps(report, indent=2) + '\n')
    pending.replace(report_path)
    print(f'Actual webhook HTTP/recovery cases passed: {len(cases)}; Java: {tests}, skips: 0; owned runtime cleaned.')


if __name__ == '__main__':
    try:
        main()
    except (LabFailure, subprocess.TimeoutExpired, OSError, ValueError) as failure:
        print(f'Webhook verification failed: {type(failure).__name__}: {failure if isinstance(failure, LabFailure) else "bounded operation failed"}', file=sys.stderr)
        raise SystemExit(1)
