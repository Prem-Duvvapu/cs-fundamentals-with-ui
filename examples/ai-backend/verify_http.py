"""Packaged Spring application + real HTTP fixture + authenticated CSRF-protected request."""
import base64
import http.cookiejar
import json
import os
from pathlib import Path
import socket
import shutil
import secrets
import subprocess
import tempfile
import time
import urllib.request

ROOT = Path(__file__).parent

def port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


def stop_owned(processes):
    for process in reversed(processes):
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)


def verify():
    processes = []
    with tempfile.TemporaryDirectory(prefix='ai-http-') as temp:
        with open(Path(temp) / 'process.log', 'w+') as log:
            try:
                app_port, provider_port = port(), port()
                provider = subprocess.Popen(['python3', str(ROOT / 'fake_provider.py'), '--port', str(provider_port)], stdout=log, stderr=log)
                processes.append(provider)
                alice_password, bob_password = secrets.token_urlsafe(24), secrets.token_urlsafe(24)
                env = dict(os.environ, AI_PORT=str(app_port), AI_ENDPOINT=f'http://127.0.0.1:{provider_port}/api/chat', AI_ALICE_PASSWORD=alice_password, AI_BOB_PASSWORD=bob_password, AI_APPROVAL_SECRET=secrets.token_hex(32))
                jar = Path(temp) / 'ai-example.jar'
                shutil.copyfile(next((ROOT / 'target').glob('ai-backend-example-*.jar')), jar)
                app = subprocess.Popen(['java', '-jar', str(jar)], env=env, stdout=log, stderr=log)
                processes.append(app)
                origin = f'http://127.0.0.1:{app_port}'
                for _ in range(120):
                    try:
                        with urllib.request.urlopen(origin + '/actuator/health', timeout=1) as response:
                            if response.status == 200:
                                break
                    except (OSError, TimeoutError):
                        if app.poll() is not None or provider.poll() is not None:
                            raise RuntimeError('Owned child exited before readiness')
                        time.sleep(0.25)
                else:
                    raise RuntimeError('Application did not become ready')
                opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
                auth = 'Basic ' + base64.b64encode(('alice:' + alice_password).encode()).decode()
                with opener.open(urllib.request.Request(origin + '/api/csrf', headers={'Authorization': auth}), timeout=5) as response:
                    csrf = json.load(response)
                request = urllib.request.Request(origin + '/api/extract', data=json.dumps({'text': 'Please refund ORD-1234'}).encode(), headers={
                    'Authorization': auth, 'Content-Type': 'application/json', csrf['headerName']: csrf['token']})
                with opener.open(request, timeout=10) as response:
                    result = json.load(response)
                    assert result['category'] == 'billing' and result['orderId'] == 'ORD-1234', result
                def client(username, password):
                    session = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
                    basic = 'Basic ' + base64.b64encode((username + ':' + password).encode()).decode()
                    with session.open(urllib.request.Request(origin + '/api/csrf', headers={'Authorization': basic}), timeout=5) as response:
                        token = json.load(response)
                    def send(path, method='POST', body=None):
                        headers = {'Authorization': basic, 'Content-Type': 'application/json', token['headerName']: token['token']}
                        data = json.dumps(body).encode() if body is not None else None
                        with session.open(urllib.request.Request(origin + path, data=data, headers=headers, method=method), timeout=10) as response:
                            return json.load(response)
                    return send
                alice, bob = client('alice', alice_password), client('bob', bob_password)
                alice('/api/documents/policy', 'PUT', dict(expectedVersion=0, title='Refund policy', text='Refund within 14 days', enabled=True))
                bob('/api/documents/policy', 'PUT', dict(expectedVersion=0, title='Refund policy', text='Refund within 99 days', enabled=True))
                answer = alice('/api/ask', body={'question': 'refund'})
                assert '14 days' in answer['answer'] and '99 days' not in answer['answer'], answer
                assert answer['citations'] == ['policy:v1'], answer
                alice('/api/documents/policy', 'PUT', dict(expectedVersion=1, title='Refund policy', text='Refund within 30 days', enabled=True))
                assert alice('/api/ask', body={'question': 'refund'})['citations'] == ['policy:v2']
                alice('/api/documents/policy?expectedVersion=2', 'DELETE')
                assert alice('/api/ask', body={'question': 'refund'})['answer'] == 'Insufficient evidence'
                assert '99 days' in bob('/api/ask', body={'question': 'refund'})['answer']
                investigation = alice('/api/investigate', body={'orderId': 'ORD-1001', 'question': 'Check my order status'})
                assert investigation['status'] == 'finished' and investigation['steps'] == 2, investigation
                proposal = alice('/api/refund-proposals', body={'requestKey': 'smoke-refund', 'orderId': 'ORD-1001', 'amountCents': 100})
                assert alice('/api/orders/ORD-1001', 'GET')['status'] == 'paid'
                receipt = alice('/api/refund-proposals/' + proposal['operationId'] + '/approve', body={'approvalToken': proposal['approvalToken']})
                assert receipt['status'] == 'completed', receipt
                repeated = alice('/api/refund-proposals/' + proposal['operationId'] + '/approve', body={'approvalToken': proposal['approvalToken']})
                assert repeated == receipt and alice('/api/orders/ORD-1001', 'GET')['version'] == 2
                for split, count in [('development', 30), ('held-out', 20)]:
                    report = Path(temp) / (split + '.json')
                    subprocess.run(['java', '-jar', str(jar), '--evaluate', str(ROOT / 'fixtures' / (split + '.jsonl')), str(report)], env=env, check=True, timeout=60, stdout=log, stderr=log)
                    data = json.loads(report.read_text())
                    assert data['evidence'] == 'fixture' and data['state'] == 'complete' and len(data['cases']) == count, data
                    assert data['accepted'] == count and data['fieldsCorrect'] == count, data
                # The MCP subprocess owns its own store; completed HTTP servers are no longer needed.
                stop_owned(processes)
                processes.clear()
                subprocess.run(['java', '-jar', str(jar), '--mcp-check', str(jar)], check=True, timeout=60, stdout=log, stderr=log)
                print('Packaged HTTP + Basic/CSRF + tenant/version/revocation RAG + bounded agent + approved/idempotent mutation + real MCP + 30 development/20 held-out fixture evaluation cases passed. Not live-model quality evidence.')
            except Exception:
                log.seek(0)
                print(log.read()[-5000:])
                raise
            finally:
                stop_owned(processes)


if __name__ == '__main__':
    verify()
