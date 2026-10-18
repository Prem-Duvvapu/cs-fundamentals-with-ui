#!/usr/bin/env python3
"""Launch the packaged teaching app, verify real HTTP boundaries, and stop our process."""
import base64
import http.cookiejar
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import tempfile
import time
import urllib.error
import urllib.request


def verify(observability=False):
    jar = Path(__file__).resolve().parent / 'target/task-tracker-example-0.0.1-SNAPSHOT.jar'
    if not jar.exists():
        raise RuntimeError('Package the example with mvn package before running this check.')
    environment = dict(os.environ, **{f'TASK_TRACKER_{name}_PASSWORD': secrets.token_urlsafe(32)
                                         for name in ('ALICE', 'BOB', 'VIEWER')})
    with tempfile.TemporaryDirectory(prefix='task-tracker-http-') as directory:
        logfile = Path(directory) / 'startup.log'
        with logfile.open('w') as log:
            profiles = 'production,observability' if observability else 'production'
            process = subprocess.Popen(['java', '-jar', str(jar), '--spring.profiles.active=' + profiles,
                                        '--server.port=0'], cwd=directory, env=environment, stdout=log, stderr=subprocess.STDOUT)
            try:
                deadline = time.monotonic() + 45
                port = None
                while time.monotonic() < deadline:
                    match = re.search(r'Tomcat started on port (\d+)', logfile.read_text())
                    if match:
                        port = int(match[1]); break
                    if process.poll() is not None:
                        raise RuntimeError('Application exited before listening; inspect the example configuration.')
                    time.sleep(.1)
                if port is None:
                    raise RuntimeError('Application startup exceeded 45 seconds.')
                origin = f'http://127.0.0.1:{port}'
                opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
                def request(path, method='GET', payload=None, user=None, csrf=None):
                    headers = {}
                    if user:
                        credentials = f'{user}:{environment["TASK_TRACKER_" + user.upper() + "_PASSWORD"]}'
                        headers['Authorization'] = 'Basic ' + base64.b64encode(credentials.encode()).decode()
                    if csrf:
                        headers[csrf['headerName']] = csrf['token']
                    if payload is not None:
                        headers['Content-Type'] = 'application/json'
                    call = urllib.request.Request(origin + path, data=json.dumps(payload).encode() if payload is not None else None, headers=headers, method=method)
                    try:
                        response = opener.open(call, timeout=3)
                    except urllib.error.HTTPError as failure:
                        response = failure
                    with response:
                        raw = response.read()
                        return response.status, json.loads(raw) if raw else None
                assert request('/actuator/health/readiness')[0] == 200
                assert request('/api/projects')[0] == 401
                status, csrf = request('/api/csrf', user='alice'); assert status == 200
                denied_status, denied_body = request('/api/projects', 'POST', {'name': 'Denied'}, 'alice')
                assert denied_status == 403, f'Missing CSRF response: {denied_status}, {denied_body}'
                status, project = request('/api/projects', 'POST', {'name': 'HTTP milestone'}, 'alice', csrf); assert status == 201
                path = '/api/projects/' + str(project['id'])
                status, task = request(path + '/tasks', 'POST', {'title': 'Bounded work'}, 'alice', csrf); assert status == 201
                status, page = request(path + '/tasks?size=1', user='alice'); assert status == 200
                assert page['total'] == 1 and page['items'][0]['id'] == task['id']
                assert request(path, user='bob')[0] == 404
                assert request('/api/tasks', user='alice')[0] == 403
                assert request('/actuator/metrics', user='viewer')[0] == 403
                assert request(path, 'PUT', {'name': 'Updated', 'version': project['version']}, 'alice', csrf)[0] == 200
                assert request(path, 'PUT', {'name': 'Stale', 'version': project['version']}, 'alice', csrf)[0] == 409
                status, metric = request('/actuator/metrics/tasktracker.projects.created', user='alice'); assert status == 200
                assert metric['measurements'][0]['value'] == 1
                assert request(path, 'DELETE', user='alice', csrf=csrf)[0] == 204
                assert request(path, user='alice')[0] == 404
                if observability:
                    status, probe = request('/api/observability/probe?scenario=slow', 'POST', user='alice', csrf=csrf)
                    assert status == 200 and re.fullmatch(r'[0-9a-f]{32}', probe['traceId'])
                    trace_id = probe['traceId']
                    assert request('/api/observability/probe?scenario=failure', 'POST', user='alice', csrf=csrf)[0] == 503
                    assert request('/actuator/metrics/tasktracker.probe.calls', user='alice')[0] == 200
                    assert request('/api/observability/probe', 'POST', user='viewer', csrf=csrf)[0] == 403
                else:
                    assert request('/api/observability/probe', 'POST', user='alice', csrf=csrf)[0] == 404
            finally:
                if process.poll() is None:
                    process.terminate()
                    try:
                        process.wait(timeout=25)
                    except subprocess.TimeoutExpired:
                        process.kill(); process.wait(timeout=3)
                        raise RuntimeError('Graceful shutdown exceeded its test deadline.')
            assert process.returncode in (0, 143), 'Unexpected JVM termination code.'
            text = logfile.read_text()
            assert 'Graceful shutdown complete' in text, 'Server did not confirm graceful shutdown.'
            for name in ('ALICE', 'BOB', 'VIEWER'):
                assert environment[f'TASK_TRACKER_{name}_PASSWORD'] not in text, 'Runtime password leaked in logs.'
            if observability:
                records = [json.loads(match.group(1)) for line in text.splitlines()
                           if (match := re.search(r'(\{"event":"probe.span".*\})', line))]
                selected = [record for record in records if record['trace_id'] == trace_id]
                assert {record['stage'] for record in selected} == {'REQUEST', 'ASYNC', 'DEPENDENCY_CLIENT', 'DEPENDENCY_SERVER', 'DATABASE'}
                assert any(record['error_type'] == 'DEPENDENCY_FAILURE' for record in records)
                print('PASS: packaged real HTTP/async/dependency/JPA traces, local JSON log correlation and error attribution.')
    print('PASS: real HTTP health, CSRF, ownership, CRUD, pagination, conflicts, metrics and graceful shutdown.')


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--observability', action='store_true', help='Also verify the opt-in teaching telemetry path')
    verify(parser.parse_args().observability)
