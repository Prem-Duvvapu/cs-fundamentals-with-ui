"""Deterministic Ollama-shaped HTTP fixture. This is not a generative model."""
import argparse
import json
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


def baseline(text):
    lower = text.lower()
    category = ('billing' if any(word in lower for word in ('refund', 'invoice', 'payment'))
                else 'delivery' if any(word in lower for word in ('shipping', 'arrival', 'delivery')) else 'other')
    priority = 'high' if 'urgent' in lower else 'low' if 'low-priority' in lower else 'normal'
    match = re.search(r'\bORD-[0-9]{4}\b', text)
    return dict(category=category, priority=priority, summary=text[:200], orderId=match.group() if match else None)


class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def log_message(self, *args):
        pass  # Tickets and credentials are not diagnostic logs.

    def do_POST(self):
        size = int(self.headers.get('Content-Length', 0))
        if self.path != '/api/chat' or not 0 < size <= 32768:
            self.send_error(400)
            return
        try:
            request = json.loads(self.rfile.read(size))
            text = next(message['content'] for message in reversed(request['messages']) if message['role'] == 'user')
            if request['messages'][0]['content'].startswith('You may propose only'):
                context = json.loads(text)
                answer = ({'tool': 'lookup_order', 'orderId': context['orderId']} if not context['observations']
                          else {'tool': 'finish', 'answer': 'Order status is shown in the observation; no action was taken.'})
            elif request['messages'][0]['content'].startswith('Answer using only'):
                context = json.loads(text)
                source = context['sources'][0]
                answer = {'answer': source['text'], 'citations': [source['id']]}
            else:
                answer = baseline(text)
            payload = json.dumps(dict(model='teaching-fixture', message=dict(role='assistant', content=json.dumps(answer)),
                                      done=True, done_reason='stop', prompt_eval_count=0, eval_count=0)).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        except (ValueError, KeyError, StopIteration, TypeError):
            self.send_error(400)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=9193)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(f'FIXTURE ONLY http://127.0.0.1:{server.server_port}/api/chat', flush=True)
    server.serve_forever()
