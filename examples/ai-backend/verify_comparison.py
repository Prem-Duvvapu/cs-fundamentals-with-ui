"""Actual packaged comparison with an owned HTTP fixture; no live model or quality claim."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import tempfile
import threading
import compare_tickets as comparison

ROOT = Path(__file__).resolve().parent


def run():
    calls = []
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass
        def do_POST(self):
            self.connection.settimeout(2)
            size = int(self.headers.get('Content-Length', '0'))
            assert self.path == '/api/chat' and 0 < size <= 49152
            request = json.loads(self.rfile.read(size))
            assert request['stream'] is False and request['format'] == 'json'
            assert request['options'] == dict(num_predict=256, num_ctx=4096, temperature=0)
            messages = request['messages']
            assert len(messages) == 2 and [message['role'] for message in messages] == ['system', 'user']
            text = messages[1]['content']
            candidate = 'Example ticket:' in messages[0]['content']
            calls.append(dict(candidate=candidate, text=text))
            if text == 'Trigger429':
                self.send_response(429); self.send_header('Content-Length', '0'); self.end_headers(); return
            if text.startswith('Please refund'):
                category, priority, order = ('delivery' if candidate else 'billing'), 'normal', 'ORD-9101'
            elif text.startswith('Urgent shipping'):
                category, priority, order = 'delivery', 'high', 'ORD-9102'
            else:
                category, priority, order = 'other', 'normal', None
            answer = dict(category=category, priority=priority, summary='Synthetic fixture answer', orderId=order)
            body = json.dumps(dict(message=dict(content=json.dumps(answer)), done=True, done_reason='stop')).encode()
            self.send_response(200); self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)

    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    try:
        with tempfile.TemporaryDirectory(prefix='owned-comparison-fixture-') as temporary:
            directory = Path(temporary)
            cases = [
                dict(id='compare-refund', slice='ordinary', text='Please refund ORD-9101.', expected=dict(category='billing', priority='normal', orderId='ORD-9101')),
                dict(id='compare-urgent', slice='ordinary', text='Urgent shipping for ORD-9102.', expected=dict(category='delivery', priority='high', orderId='ORD-9102')),
                dict(id='compare-other', slice='missing-id', text='Password help', expected=dict(category='other', priority='normal', orderId=None)),
                dict(id='compare-failure', slice='provider-fault', text='Trigger429', expected=dict(category='other', priority='normal', orderId=None))]
            data = directory/'cases.jsonl'; data.write_text('\n'.join(json.dumps(case) for case in cases)+'\n')
            output = directory/'comparison.json'
            result = comparison.compare(data, output, ROOT/'target/ai-backend-example-0.0.1-SNAPSHOT.jar',
                                        'fixture', f'http://127.0.0.1:{server.server_port}/api/chat', 'teaching-fixture')
            assert result['state'] == 'complete' and result['ownedChildrenReaped']
            assert result['dataset']['cases'] == 4 and len(calls) == 8
            assert sum(call['candidate'] for call in calls) == 4
            old, new, rule = [result['variants'][version] for version in comparison.VERSIONS]
            assert [report['summary']['exactFieldMatches'] for report in (old,new,rule)] == [3,2,4]
            assert old['summary']['errors'] == new['summary']['errors'] == {'provider_http_429': 1}
            assert result['decision']['pairedTransitions'] == dict(improved=0, regressed=1, bothCorrect=2, bothWrong=1)
            assert result['decision']['status'] == 'prefer-no-model-reference-for-this-sample'
            assert old['systemPromptSha256'] != new['systemPromptSha256']
            assert old['promptVersion'] == 'ticket-v1' and new['promptVersion'] == 'ticket-examples-v2'
            assert rule['usesModel'] is False and rule['summary']['cases'] == 4
            assert result['usageAndPrice']['costPerAcceptedResult'] is None
            for marker in ('Please refund', 'Password help', 'Synthetic fixture answer', 'Example ticket:', 'ORD-9101'):
                assert marker not in output.read_text(), marker
            for report in (old,new,rule):
                assert report['datasetSha256'] == result['dataset']['sha256']
            print('Actual packaged comparison: 8 HTTP calls, 3/2/4 exact matches, typed failures, paired regression, no model default change; fixture only.')
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=3)
        assert not thread.is_alive(), 'Owned fixture must stop.'


if __name__ == '__main__':
    run()
