"""Owned loopback fixtures. Never a public endpoint or a production fetch configuration."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
import socket
import ssl
import subprocess
import threading
import time


def certificate(directory, name):
    directory = Path(directory)
    key, cert = directory/(name+'.key'), directory/(name+'.crt')
    subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
                    '-keyout', str(key), '-out', str(cert), '-subj', '/CN='+name,
                    '-addext', 'subjectAltName=DNS:'+name], check=True, timeout=10,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.chmod(key, 0o600)
    return cert, key


class Fixture:
    live = set()

    def __init__(self, cert=None, key=None, address='127.0.0.1', port=0):
        self.lock = threading.Lock()
        self.requests, self.sni = [], []
        self.entered, self.release = threading.Event(), threading.Event()
        fixture = self
        class Handler(BaseHTTPRequestHandler):
            protocol_version = 'HTTP/1.1'
            def log_message(self, *args):
                pass
            def do_GET(self):
                self.connection.settimeout(2)
                with fixture.lock:
                    fixture.requests.append({'target': self.path, 'headers': dict(self.headers)})
                mode = self.path.split('?', 1)[0].rsplit('/', 1)[-1]
                try:
                    if mode == 'gate':
                        fixture.entered.set()
                        fixture.release.wait(timeout=2)
                    if mode.startswith('redirect'):
                        code = int(mode.removeprefix('redirect').split('-')[0])
                        self.send_response(code)
                        destination = fixture.redirect_target if '-external' in mode else '/documents/decoy'
                        self.send_header('Location', destination)
                        self.send_header('Content-Length', '0')
                        self.end_headers()
                        return
                    if mode == 'drip':
                        for value in b'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n':
                            self.connection.sendall(bytes([value]))
                            time.sleep(0.04)
                        return
                    if mode == 'headers-large':
                        self.connection.sendall(b'HTTP/1.1 200 OK\r\nX-Fill: '+b'a'*20000+b'\r\n\r\n')
                        return
                    body = b'{"document":"original synthetic partner fixture"}'
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    if mode == 'chunked':
                        self.send_header('Transfer-Encoding', 'chunked')
                    elif mode == 'dual-framing':
                        self.send_header('Transfer-Encoding', 'chunked')
                        self.send_header('Content-Length', str(len(body)))
                    elif mode == 'duplicate-length':
                        self.send_header('Content-Length', str(len(body)))
                        self.send_header('Content-Length', str(len(body)))
                    elif mode == 'bad-length':
                        self.send_header('Content-Length', 'not-a-length')
                    elif mode == 'comma-length':
                        self.send_header('Content-Length', '5, 5')
                    elif mode == 'encoding':
                        self.send_header('Content-Length', str(len(body)))
                        self.send_header('Content-Encoding', 'gzip')
                    elif mode == 'oversized-length':
                        self.send_header('Content-Length', '999999')
                    elif mode == 'oversized-close':
                        body = b'x'*8192
                    elif mode == 'short-body':
                        self.send_header('Content-Length', str(len(body)+10))
                    elif mode == 'stalled-body':
                        self.send_header('Content-Length', '10')
                    else:
                        self.send_header('Content-Length', str(len(body)))
                        self.send_header('Set-Cookie', 'synthetic=never-forward')
                    self.send_header('Connection', 'close')
                    self.end_headers()
                    if mode == 'stalled-body':
                        time.sleep(1.2)
                    elif mode in ('chunked', 'dual-framing'):
                        self.wfile.write(b'4\r\ntest\r\n0\r\n\r\n')
                    else:
                        self.wfile.write(body)
                except (BrokenPipeError, ConnectionResetError, ssl.SSLError, TimeoutError):
                    pass
                finally:
                    self.close_connection = True
        class Server(ThreadingHTTPServer):
            daemon_threads = False
            block_on_close = True
            def handle_error(self, *args):
                pass
            def get_request(self):
                sock, address = super().get_request()
                sock.settimeout(1)
                if cert is not None:
                    try:
                        sock = fixture.context.wrap_socket(sock, server_side=True)
                    except BaseException:
                        sock.close()
                        raise
                return sock, address
        if cert is not None:
            self.context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            self.context.load_cert_chain(cert, key)
            def capture(sock, name, context):
                with self.lock:
                    self.sni.append(name)
            self.context.set_servername_callback(capture)
        self.server = Server((address, port), Handler)
        self.port = self.server.server_port
        self.thread = threading.Thread(target=lambda: self.server.serve_forever(poll_interval=0.02))
        Fixture.live.add(self)
        self.thread.start()
        self.redirect_target = f'http://127.0.0.1:{self.port}/documents/decoy'

    def count(self):
        with self.lock:
            return len(self.requests)

    def close(self):
        self.release.set()
        if self.thread.is_alive():
            self.server.shutdown()
        self.server.server_close()
        if self.thread.ident is not None:
            self.thread.join(timeout=3)
        if self.thread.is_alive():
            raise RuntimeError('owned_fixture_thread_not_cleaned')
        Fixture.live.discard(self)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
