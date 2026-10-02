#!/usr/bin/env python3
"""Loopback DNS resolution, TCP byte-stream/HTTP and UDP observations."""
import http.server
import json
import socket
import threading


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        body = b'hello' if self.path == '/ok' else b'not found'
        self.send_response(200 if self.path == '/ok' else 404)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Connection', 'close')
        self.end_headers()
        self.wfile.write(body)
    def log_message(self, *_):
        pass


def read_http(port, path):
    with socket.create_connection(('127.0.0.1', port), timeout=2) as connection:
        connection.sendall(f'GET {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n'.encode('ascii'))
        pieces = []
        while True:
            part = connection.recv(3)
            if not part:
                break
            pieces.append(part)
        headers, body = b''.join(pieces).split(b'\r\n\r\n', 1)
        status = int(headers.split(b'\r\n', 1)[0].split()[1])
        length = int(next(line.split(b':', 1)[1] for line in headers.split(b'\r\n') if line.lower().startswith(b'content-length:')))
        if len(body) != length:
            raise RuntimeError('HTTP framing mismatch.')
        return {'status': status, 'body': body.decode('ascii'), 'receive_calls': len(pieces), 'content_length': length}


def observe():
    addresses = sorted({item[4][0] for item in socket.getaddrinfo('localhost', None, type=socket.SOCK_STREAM)})
    server = http.server.HTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        ok = read_http(server.server_port, '/ok')
        missing = read_http(server.server_port, '/missing')
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as receiver, socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sender:
        receiver.bind(('127.0.0.1', 0))
        receiver.settimeout(2)
        sender.settimeout(2)
        sender.sendto(b'ping:1', receiver.getsockname())
        payload, source = receiver.recvfrom(100)
        receiver.sendto(b'ack:1', source)
        acknowledgement, _ = sender.recvfrom(100)
        sender.sendto(b'long-message', receiver.getsockname())
        truncated, _ = receiver.recvfrom(2)
    return {'localhost_addresses': addresses, 'tcp_http_ok': ok, 'tcp_http_missing': missing,
            'udp_payload': payload.decode('ascii'), 'udp_truncated_payload': truncated.decode('ascii'), 'udp_acknowledgement': acknowledgement.decode('ascii'),
            'cleanup': 'loopback listeners closed'}


if __name__ == '__main__':
    print(json.dumps(observe(), indent=2))
