#!/usr/bin/env python3
"""Build isolated copies, exercise real framework HTTP, and clean up only owned processes."""
import base64
from contextlib import contextmanager
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import signal
import subprocess
import tempfile
import threading
import time
import urllib.parse
import xml.etree.ElementTree as ET
import zipfile

from client import PendingAuthorization, Transport

ROOT = Path(__file__).resolve().parent
EVIDENCE = ROOT / 'target/evidence'


def isolated_environment(extra=None):
    environment = {key: value for key, value in os.environ.items()
                   if not key.startswith(('IDENTITY_', 'TASK_TRACKER_', 'SPRING_', 'SERVER_', 'LOGGING_', 'MANAGEMENT_'))
                   and key not in ('JAVA_TOOL_OPTIONS', 'JDK_JAVA_OPTIONS', '_JAVA_OPTIONS')}
    return dict(environment, **(extra or {}))


def stop_owned(process):
    if process.poll() is None:
        os.killpg(process.pid, signal.SIGTERM)
        try:
            process.wait(timeout=12)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait(timeout=3)
            raise RuntimeError('Owned process exceeded its graceful cleanup deadline') from None


def build(pom, log_name):
    command = ['mvn', '-B', '-f', str(pom), 'verify']
    if log_name == 'tracker-build.log':
        command.insert(-1, '-DskipTests')
    with (EVIDENCE / log_name).open('w') as output:
        process = subprocess.Popen(command, env=isolated_environment(), stdout=output,
                                   stderr=subprocess.STDOUT, start_new_session=True)
        try:
            if process.wait(timeout=180) != 0:
                raise RuntimeError('Owned build failed; inspect its build log')
        except subprocess.TimeoutExpired:
            raise RuntimeError('Owned build exceeded 180 seconds') from None
        finally:
            stop_owned(process)


@contextmanager
def server(jar, directory, label, environment, sensitive, arguments=()):
    log_path = directory / (label + '.log')
    with log_path.open('w') as output:
        process = subprocess.Popen(['java', '-Xmx256m', '-XX:ActiveProcessorCount=2', '-XX:TieredStopAtLevel=1', '-jar', str(jar), '--server.port=0',
                                    '--server.address=127.0.0.1', *arguments], cwd=directory,
                                   env=isolated_environment(environment), stdout=output,
                                   stderr=subprocess.STDOUT, start_new_session=True)
        try:
            deadline = time.monotonic() + 100
            while time.monotonic() < deadline:
                match = re.search(r'Tomcat started on port (\d+)', log_path.read_text())
                if match:
                    yield f'http://127.0.0.1:{int(match[1])}'
                    break
                if process.poll() is not None:
                    raise RuntimeError('Owned application exited before listening')
                time.sleep(.1)
            else:
                raise RuntimeError('Owned application startup exceeded 100 seconds')
        finally:
            try:
                stop_owned(process)
            finally:
                text = log_path.read_text()
                leaked = any(value and value in text for value in sensitive)
                for value in sensitive:
                    if value:
                        text = text.replace(value, '[REDACTED]')
                (EVIDENCE / (label + '.log')).write_text(text)
                if leaked:
                    raise RuntimeError('Sensitive runtime material appeared in owned server logs')


class CsrfInput(HTMLParser):
    def __init__(self):
        super().__init__()
        self.value = None

    def handle_starttag(self, tag, attributes):
        values = dict(attributes)
        if tag == 'input' and values.get('name') == '_csrf':
            self.value = values.get('value')


class Callback:
    def __init__(self):
        owner = self
        class Handler(BaseHTTPRequestHandler):
            def setup(self):
                super().setup()
                self.connection.settimeout(2)

            def do_GET(self):
                try:
                    if self.headers.get('Host') != f'127.0.0.1:{owner.http.server_port}':
                        raise ValueError('Unexpected callback authority')
                    owner.accepted = owner.pending.accept(owner.origin + self.path)
                    status = 200
                except ValueError:
                    owner.accepted = None
                    status = 400
                self.send_response(status)
                self.send_header('Cache-Control', 'no-store')
                self.send_header('Referrer-Policy', 'no-referrer')
                self.end_headers()
                self.wfile.write(b'Callback processed; no tokens displayed.')

            def log_message(self, format, *arguments):
                pass
        self.http = HTTPServer(('127.0.0.1', 0), Handler)
        self.http.timeout = 2
        self.origin = f'http://127.0.0.1:{self.http.server_port}'
        self.pending = PendingAuthorization(self.origin + '/callback')
        self.accepted = None
        self.thread = threading.Thread(target=self.http.serve_forever, kwargs={'poll_interval': .05}, daemon=True)

    def __enter__(self):
        self.thread.start()
        return self

    def __exit__(self, *arguments):
        self.http.shutdown()
        self.http.server_close()
        self.thread.join(timeout=3)
        if self.thread.is_alive():
            raise RuntimeError('Owned callback thread did not stop')


def login(transport, issuer, username, password, sensitive):
    status, _, raw = transport.request(issuer + '/login')
    assert status == 200
    form = CsrfInput()
    form.feed(raw.decode())
    assert form.value
    sensitive.append(form.value)
    status, headers, _ = transport.request(issuer + '/login', method='POST',
                    form={'username': username, 'password': password, '_csrf': form.value})
    assert status == 302 and 'error' not in headers.get('Location', ''), 'Actual form login failed'


def authorization(transport, issuer, callback, sensitive, *, client_id='tracker-public', scope='projects:read projects:write', changes=None):
    parameters = callback.pending.begin(client_id, scope)
    sensitive.extend((parameters['state'], callback.pending.pending[1]))
    for key, value in (changes or {}).items():
        if value is None:
            parameters.pop(key, None)
        else:
            parameters[key] = value
    status, headers, _ = transport.request(issuer + '/oauth2/authorize?' + urllib.parse.urlencode(parameters),
                                         headers={'Accept': 'text/html'})
    location = headers.get('Location', '')
    if status == 302:
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(location).query)
        sensitive.extend(query.get('code', []))
    return status, location


def exchange(transport, issuer, callback, accepted, sensitive, *, override=None):
    code, verifier, client_id = accepted
    form = {'grant_type': 'authorization_code', 'client_id': client_id, 'code': code,
            'redirect_uri': callback.pending.redirect, 'code_verifier': verifier}
    for key, value in (override or {}).items():
        if value is None:
            form.pop(key, None)
        else:
            form[key] = value
    status, headers, raw = transport.request(issuer + '/oauth2/token', method='POST', form=form)
    body = json.loads(raw)
    for key in ('access_token', 'refresh_token', 'id_token'):
        if key in body:
            sensitive.append(body[key])
    return status, headers, body


def grant(transport, issuer, callback, sensitive, **options):
    status, location = authorization(transport, issuer, callback, sensitive, **options)
    assert status == 302 and location.startswith(callback.pending.redirect + '?'), 'Authorization code redirect missing'
    assert transport.request(location)[0] == 200
    assert callback.accepted
    status, headers, body = exchange(transport, issuer, callback, callback.accepted, sensitive)
    assert status == 200 and body['token_type'] == 'Bearer' and 'access_token' in body
    assert 'no-store' in headers.get('Cache-Control', '')
    assert 'refresh_token' not in body and 'id_token' not in body
    return body['access_token'], callback.accepted


def claims_without_validation(token):
    # Only used to choose an expiry wait; actual resource-server validation supplies the security evidence.
    payload = token.split('.')[1]
    return json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))


def exercise(issuer, resource, callback, users, tracker, sensitive):
    browser = Transport({issuer, callback.origin})
    api = Transport({resource})
    reports = []
    record = lambda name: reports.append({'case': name, 'passed': True})

    status, location = authorization(browser, issuer, callback, sensitive)
    assert status == 302 and location.startswith(issuer + '/login') and 'code=' not in location
    assert api.request(resource + '/api/projects')[0] == 401
    status, _, raw = browser.request(issuer + '/login')
    assert status == 200
    csrf = CsrfInput(); csrf.feed(raw.decode()); sensitive.append(csrf.value)
    assert browser.request(issuer + '/login', method='POST', form={'username': users['IDENTITY_USER'], 'password': users['IDENTITY_PASSWORD']})[0] == 403
    wrong = secrets.token_hex(32); sensitive.append(wrong)
    status, headers, _ = browser.request(issuer + '/login', method='POST', form={'username': users['IDENTITY_USER'], 'password': wrong, '_csrf': csrf.value})
    assert status == 302 and 'error' in headers.get('Location', '')
    login(browser, issuer, users['IDENTITY_USER'], users['IDENTITY_PASSWORD'], sensitive)
    record('actual_form_login_rejects_wrong_password_and_missing_csrf')

    status, _, metadata_raw = browser.request(issuer + '/.well-known/oauth-authorization-server',
                    headers={'X-Forwarded-Host': 'external.invalid', 'X-Forwarded-Proto': 'https'})
    metadata = json.loads(metadata_raw)
    assert status == 200 and metadata['issuer'] == issuer and metadata['jwks_uri'] == issuer + '/oauth2/jwks'
    status, _, jwks_raw = browser.request(issuer + '/oauth2/jwks')
    assert status == 200
    keys = json.loads(jwks_raw)['keys']
    assert len(keys) == 1 and keys[0]['kty'] == 'RSA' and not any(field in keys[0] for field in ('d', 'p', 'q', 'dp', 'dq', 'qi', 'oth'))
    record('actual_jwks_is_public_only')

    token, accepted = grant(browser, issuer, callback, sensitive)
    authorization_header = {'Authorization': 'Bearer ' + token}
    status, _, raw = api.request(resource + '/api/projects', method='POST', document={'name': 'PKCE local project'}, headers=authorization_header)
    assert status == 201
    path = '/api/projects/' + str(json.loads(raw)['id'])
    assert api.request(resource + path, headers=authorization_header)[0] == 200
    record('real_code_s256_token_and_packaged_task_tracker_persistence')
    assert browser.request(callback.pending.redirect + '?' + urllib.parse.urlencode({'code': accepted[0], 'state': 'replayed'}))[0] == 400
    status, _, body = exchange(browser, issuer, callback, accepted, sensitive)
    assert status == 400 and body['error'] == 'invalid_grant'
    record('authorization_code_single_use_and_callback_replay_rejected')

    for changes in ({'redirect_uri': callback.pending.redirect + '/other'},
                    {'redirect_uri': callback.pending.redirect + '?extra=1'},
                    {'redirect_uri': callback.pending.redirect.replace(f':{callback.http.server_port}', f':{1 if callback.http.server_port != 1 else 2}')},
                    {'code_challenge_method': 'plain'}, {'code_challenge': None}, {'scope': 'openid'}):
        status, location = authorization(browser, issuer, callback, sensitive, changes=changes)
        assert status == 400 or (status == 302 and 'error=' in location and 'code=' not in location)
    record('exact_redirect_s256_required_missing_challenge_and_unregistered_scope_rejected')

    status, location = authorization(browser, issuer, callback, sensitive)
    assert status == 302 and browser.request(location)[0] == 200
    status, _, body = exchange(browser, issuer, callback, callback.accepted, sensitive, override={'code_verifier': secrets.token_urlsafe(32)})
    assert status == 400 and body['error'] == 'invalid_grant'
    record('wrong_pkce_verifier_rejected_by_framework')

    for state_mode in ('missing', 'changed'):
        status, location = authorization(browser, issuer, callback, sensitive)
        assert status == 302
        parsed = urllib.parse.urlsplit(location)
        values = urllib.parse.parse_qs(parsed.query)
        if state_mode == 'missing':
            values.pop('state')
        else:
            values['state'] = ['changed']
        tampered = urllib.parse.urlunsplit(parsed._replace(query=urllib.parse.urlencode(values, doseq=True)))
        requests_before = browser.calls
        assert browser.request(tampered)[0] == 400 and callback.accepted is None
        assert browser.calls == requests_before + 1, 'Invalid state must cause no token exchange'
    record('actual_callback_rejects_missing_and_changed_state_before_exchange')

    read_token, _ = grant(browser, issuer, callback, sensitive, scope='projects:read')
    read_headers = {'Authorization': 'Bearer ' + read_token}
    assert api.request(resource + path, headers=read_headers)[0] == 200
    assert api.request(resource + '/api/projects', method='POST', document={'name': 'scope denied'}, headers=read_headers)[0] == 403
    record('real_issued_read_scope_cannot_write')

    other_browser = Transport({issuer, callback.origin})
    login(other_browser, issuer, users['IDENTITY_OTHER_USER'], users['IDENTITY_OTHER_PASSWORD'], sensitive)
    other_token, _ = grant(other_browser, issuer, callback, sensitive)
    assert api.request(resource + path, headers={'Authorization': 'Bearer ' + other_token})[0] == 404
    record('real_second_subject_cannot_read_first_subject_object')

    wrong_audience, _ = grant(browser, issuer, callback, sensitive, client_id='other-api-public')
    assert api.request(resource + path, headers={'Authorization': 'Bearer ' + wrong_audience})[0] == 401
    pieces = read_token.split('.')
    pieces[2] = ('A' if pieces[2][0] != 'A' else 'B') + pieces[2][1:]
    assert api.request(resource + path, headers={'Authorization': 'Bearer ' + '.'.join(pieces)})[0] == 401
    assert api.request(resource + path, headers={'Authorization': 'Bearer invalid-token'})[0] == 401
    record('wrong_audience_tampered_signature_and_malformed_tokens_rejected')

    short, _ = grant(browser, issuer, callback, sensitive, client_id='short-public')
    expiry = claims_without_validation(short)['exp']
    wait = expiry + 6.0 - time.time()
    assert 0 < wait < 9
    time.sleep(wait)
    assert api.request(resource + path, headers={'Authorization': 'Bearer ' + short})[0] == 401
    record('actually_expired_framework_token_rejected_after_resource_skew')

    assert browser.request(issuer + '/ready', headers={'Host': 'external.invalid'})[0] == 400
    assert browser.request(issuer + '/ready', headers={'X-Forwarded-Host': 'external.invalid', 'X-Forwarded-Proto': 'https'})[0] == 200
    record('host_rebinding_rejected_forwarded_headers_not_trusted')

    basic_value = base64.b64encode(('alice:' + tracker['TASK_TRACKER_ALICE_PASSWORD']).encode()).decode()
    sensitive.append(basic_value)
    basic = {'Authorization': 'Basic ' + basic_value}
    status, _, raw = api.request(resource + '/api/csrf', headers=basic)
    csrf = json.loads(raw)
    assert status == 200
    sensitive.append(csrf['token'])
    assert api.request(resource + '/api/projects', method='POST', document={'name': 'Basic CSRF denied'}, headers=basic)[0] == 403
    assert api.request(resource + '/api/projects', method='POST', document={'name': 'Basic CSRF preserved'},
                       headers=dict(basic, **{csrf['headerName']: csrf['token']}))[0] == 201
    record('existing_basic_and_session_csrf_boundary_preserved')
    return reports


def verify():
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    report_path = EVIDENCE / 'verification.json'
    report_path.unlink(missing_ok=True)
    if not __debug__:
        raise RuntimeError('Verification requires Python assertions enabled')
    build(ROOT / 'pom.xml', 'identity-build.log')
    with zipfile.ZipFile(ROOT / 'target/backend-identity-lab-1.0-SNAPSHOT.jar') as archive:
        names = set(archive.namelist())
        assert 'BOOT-INF/lib/spring-security-oauth2-authorization-server-7.1.1.jar' in names
        assert 'BOOT-INF/lib/spring-security-core-7.1.1.jar' in names
        assert not any(name.startswith('BOOT-INF/classes/') and re.search(r'\.(pem|p12|pfx|jks|key)$', name) for name in names)
    report = ET.parse(ROOT / 'target/surefire-reports/TEST-com.csfundamentals.identitylab.RuntimeSettingsTest.xml').getroot()
    assert int(report.attrib['tests']) == 2 and all(int(report.attrib.get(key, 0)) == 0 for key in ('errors', 'failures', 'skipped'))
    users = {'IDENTITY_USER': 'learner-' + secrets.token_hex(8), 'IDENTITY_OTHER_USER': 'learner-' + secrets.token_hex(8),
             'IDENTITY_PASSWORD': secrets.token_hex(32), 'IDENTITY_OTHER_PASSWORD': secrets.token_hex(32)}
    tracker = {f'TASK_TRACKER_{user}_PASSWORD': secrets.token_hex(32) for user in ('ALICE', 'BOB', 'VIEWER')}
    tracker['SPRING_DATASOURCE_PASSWORD'] = secrets.token_hex(32)
    sensitive = [*users.values(), *tracker.values()]
    with tempfile.TemporaryDirectory(prefix='identity-owned-', dir=ROOT / 'target') as temporary:
        directory = Path(temporary)
        source = ROOT.parent / 'java-spring/task-tracker'
        copied = directory / 'tracker-build'
        shutil.copytree(source, copied, ignore=shutil.ignore_patterns('target', 'data', '__pycache__'))
        build(copied / 'pom.xml', 'tracker-build.log')
        with Callback() as callback:
            users['IDENTITY_REDIRECT_URI'] = callback.pending.redirect
            as_directory = directory / 'authorization'; as_directory.mkdir()
            with server(ROOT / 'target/backend-identity-lab-1.0-SNAPSHOT.jar', as_directory, 'authorization', users, sensitive) as issuer:
                tracker.update(TASK_TRACKER_JWKS_URI=issuer + '/oauth2/jwks', TASK_TRACKER_JWT_ISSUER=issuer,
                               TASK_TRACKER_JWT_AUDIENCE='task-tracker-lab')
                resource_directory = directory / 'resource'; resource_directory.mkdir()
                with server(copied / 'target/task-tracker-example-0.0.1-SNAPSHOT.jar', resource_directory, 'resource', tracker, sensitive,
                            ('--spring.profiles.active=jwt',)) as resource:
                    cases = exercise(issuer, resource, callback, users, tracker, sensitive)
    result = {'scope': 'Actual packaged Spring Security authorization server, public S256 client and unchanged packaged TaskTracker JWT/persistence HTTP',
              'versions': {'spring_boot': '4.1.1', 'spring_security_authorization_server': '7.1.1'},
              'java_guard_tests': 2, 'http_cases': cases, 'owned_processes_and_temporary_database_cleaned': True,
              'limitations': ['loopback HTTP teaching only', 'in-memory authorization/session/key state', 'no OIDC nonce/ID token claim',
                              'no refresh/offline access or deployed revocation evidence', 'not production identity operations or browser UI evidence']}
    temporary_report = report_path.with_suffix('.tmp')
    temporary_report.write_text(json.dumps(result, indent=2) + '\n')
    temporary_report.replace(report_path)
    print(f'PASS: {len(cases)} actual HTTP cases, two unchanged-packaged-app boundaries; owned processes and database removed.')
    print('Evidence: ' + str(report_path))


if __name__ == '__main__':
    verify()
