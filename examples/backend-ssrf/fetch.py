"""Registered-partner GET exercise, not a general Internet URL fetch service."""
from __future__ import annotations
from dataclasses import dataclass
import http.client
import ipaddress
import json
import os
from pathlib import Path
import re
import signal
import socket
import ssl
import subprocess
import sys
import threading
import time
from urllib.parse import urlsplit
from cancellation import defer_cancellation

POLICY_VERSION = 'partner-address-v1-2026-10-21'
IPV4_DENY = tuple(ipaddress.ip_network(value) for value in [
    '0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16',
    '172.16.0.0/12', '192.0.0.0/24', '192.0.2.0/24', '192.88.99.0/24', '192.168.0.0/16',
    '198.18.0.0/15', '198.51.100.0/24', '203.0.113.0/24', '224.0.0.0/4', '240.0.0.0/4'])
IPV6_DENY = tuple(ipaddress.ip_network(value) for value in ['2001::/23', '2001:db8::/32', '2002::/16', '3fff::/20'])


class Rejected(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


@dataclass(frozen=True)
class Partner:
    scheme: str
    host: str
    port: int

    def __post_init__(self):
        if self.scheme not in ('http', 'https') or not 1 <= self.port <= 65535:
            raise ValueError('invalid_partner_origin')
        labels = self.host.split('.')
        if len(self.host) > 253 or len(labels) < 2 or any(not re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?', label) for label in labels):
            raise ValueError('canonical_ascii_partner_hostname_required')
        try:
            ipaddress.ip_address(self.host)
        except ValueError:
            return
        raise ValueError('partner_hostname_not_ip_literal')


@dataclass(frozen=True)
class FixturePermit:
    """Operator-only exact owned listener exception. Never constructed from a submitted URL."""
    partner: Partner
    address: str

    def __post_init__(self):
        if self.address not in ('127.0.0.1', '::1'):
            raise ValueError('fixture_exception_requires_exact_loopback')


@dataclass(frozen=True)
class Limits:
    overall: float = 3.0
    operation: float = 0.75
    body_bytes: int = 4096
    wire_bytes: int = 16384
    max_calls: int = 64
    concurrency: int = 2

    def __post_init__(self):
        if not (0 < self.operation <= self.overall <= 5 and 1 <= self.body_bytes <= 16384
                and self.body_bytes < self.wire_bytes <= 32768 and 1 <= self.max_calls <= 128
                and 1 <= self.concurrency <= 2):
            raise ValueError('invalid_finite_fetch_limits')


@dataclass(frozen=True)
class Result:
    accepted: bool
    reason: str
    status: int = 0
    body: bytes = b''


class Resolver:
    def __init__(self, fixture_plans=None):
        self._plans = None if fixture_plans is None else list(fixture_plans)
        self.calls = 0
        self.active = set()
        self.events = []
        self.on_started = None
        self._lock = threading.Lock()

    def resolve(self, host, port, timeout):
        with self._lock:
            self.calls += 1
            if self._plans is not None:
                if not self._plans:
                    raise Rejected('fixture_resolver_plan_exhausted')
                plan = self._plans.pop(0)
            else:
                plan = None
        payload = json.dumps({'host': host, 'port': port, 'fixture': plan})
        if len(payload) > 4096:
            raise Rejected('resolver_input_limit')
        process, timed_out = None, False
        try:
            with defer_cancellation():
                process = subprocess.Popen([sys.executable, '-I', str(Path(__file__).with_name('resolver_worker.py'))],
                                           stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                           text=True, start_new_session=True, env={'PATH': os.defpath, 'LANG': 'C.UTF-8'})
                with self._lock:
                    self.active.add(process.pid)
            if self.on_started is not None:
                self.on_started(process.pid)
            try:
                output, _ = process.communicate(payload, timeout=timeout)
            except subprocess.TimeoutExpired:
                timed_out = True
                raise Rejected('resolver_deadline') from None
            if process.returncode or len(output) > 2048:
                raise Rejected('resolver_failed')
            try:
                return json.loads(output)
            except ValueError:
                raise Rejected('resolver_failed') from None
        finally:
            if process is not None:
                if process.poll() is None:
                    try:
                        os.killpg(process.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                process.communicate(timeout=1)
                with self._lock:
                    self.active.discard(process.pid)
                    self.events.append({'timedOut':timed_out, 'returnCode':process.returncode, 'reaped':process.poll() is not None})
                    del self.events[:-128]


def public_address(address):
    if not isinstance(address, str) or '%' in address:
        return False
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return False
    if not ip.is_global or ip.is_multicast or ip.is_reserved:
        return False
    if ip.version == 4:
        return not any(ip in network for network in IPV4_DENY)
    return ip in ipaddress.ip_network('2000::/3') and not any(ip in network for network in IPV6_DENY)


def secure_context(cafile=None):
    # Unlike create_default_context, this does not enable key logging from SSLKEYLOGFILE.
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    context.set_alpn_protocols(['http/1.1'])
    if cafile is None:
        context.load_default_certs()
    else:
        context.load_verify_locations(cafile=cafile)
    return context


class WireBudget:
    def __init__(self, file, maximum):
        self.file, self.remaining = file, maximum

    def _read(self, method, size):
        if size is None or size < 0:
            size = self.remaining + 1
        value = method(min(size, self.remaining + 1))
        self.remaining -= len(value)
        if self.remaining < 0:
            raise Rejected('wire_limit')
        return value

    def read(self, size=-1):
        return self._read(self.file.read, size)

    def readline(self, size=-1):
        return self._read(self.file.readline, size)

    def flush(self):
        self.file.flush()

    def close(self):
        self.file.close()


class SocketOwner:
    def __init__(self, remaining):
        self.socket = None
        self.expired = False
        self.lock = threading.Lock()
        self.timer = threading.Timer(remaining, self.expire)
        self.timer.daemon = True
        self.timer.start()

    def install(self, sock):
        with self.lock:
            if self.expired:
                sock.close()
                raise Rejected('overall_deadline')
            self.socket = sock

    def expire(self):
        with self.lock:
            self.expired = True
            sock = self.socket
        if sock is not None:
            try:
                sock.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            sock.close()

    def close(self):
        self.timer.cancel()
        self.expire()
        self.timer.join(timeout=1)


class PartnerFetcher:
    def __init__(self, partners, resolver=None, limits=Limits(), fixture_permits=(), context=None):
        if not partners or len(partners) > 8 or len(set(partners)) != len(partners):
            raise ValueError('one_to_eight_unique_operator_registered_partners_required')
        self.partners = frozenset(partners)
        self.permits = frozenset(fixture_permits)
        if any(permit.partner not in self.partners for permit in self.permits):
            raise ValueError('fixture_exception_must_belong_to_registered_partner')
        if any(partner.scheme != 'https' and not any(p.partner == partner for p in self.permits) for partner in self.partners):
            raise ValueError('nonfixture_partners_require_https')
        self.context = context or secure_context()
        if not self.context.check_hostname or self.context.verify_mode != ssl.CERT_REQUIRED or self.context.keylog_filename:
            raise ValueError('verified_hostname_chain_and_no_key_logging_required')
        self.resolver, self.limits = resolver or Resolver(), limits
        self._slots = threading.BoundedSemaphore(limits.concurrency)
        self._lock, self._calls = threading.Lock(), 0

    def _url(self, raw):
        if not isinstance(raw, str) or not 1 <= len(raw) <= 2048 or any(ord(c) < 33 or ord(c) > 126 for c in raw) or '\\' in raw or '#' in raw:
            raise Rejected('url_policy')
        try:
            parsed = urlsplit(raw)
            if any(c in parsed.netloc for c in '@%[]'):
                raise Rejected('url_policy')
            partner = Partner(parsed.scheme, parsed.hostname or '', parsed.port or (443 if parsed.scheme == 'https' else 80))
            if parsed.netloc.lower() not in (partner.host, f'{partner.host}:{partner.port}') or partner not in self.partners:
                raise Rejected('origin_policy')
        except (ValueError, TypeError):
            raise Rejected('url_policy') from None
        # A partner document operation, not unrestricted paths such as /admin or proxy URLs.
        if not re.fullmatch(r'/documents/[a-z0-9-]{1,40}', parsed.path):
            raise Rejected('path_policy')
        if parsed.query and not re.fullmatch(r'revision=[1-9][0-9]?', parsed.query):
            raise Rejected('query_policy')
        return partner, parsed.path + ('?' + parsed.query if parsed.query else '')

    def _addresses(self, partner, answers):
        if not isinstance(answers, list) or not 1 <= len(answers) <= 8:
            raise Rejected('dns_policy')
        addresses = []
        for answer in answers:
            try:
                address = answer['address']
                if not isinstance(address, str) or '%' in address:
                    raise ValueError()
                ip = ipaddress.ip_address(address)
                if answer['family'] != (socket.AF_INET if ip.version == 4 else socket.AF_INET6):
                    raise ValueError()
            except (KeyError, ValueError, TypeError):
                raise Rejected('dns_policy') from None
            fixture = FixturePermit(partner, str(ip)) in self.permits if str(ip) in ('127.0.0.1', '::1') else False
            if not fixture and not public_address(address):
                raise Rejected('address_policy')
            addresses.append(ip)
        return addresses

    def fetch(self, url):
        with self._lock:
            if self._calls >= self.limits.max_calls:
                return Result(False, 'call_limit')
            self._calls += 1
        if not self._slots.acquire(blocking=False):
            return Result(False, 'overloaded')
        deadline = time.monotonic() + self.limits.overall
        owner, connection, response = None, None, None
        try:
            partner, target = self._url(url)
            answers = self.resolver.resolve(partner.host, partner.port, min(self.limits.operation, deadline-time.monotonic()))
            ip = self._addresses(partner, answers)[0]
            if deadline <= time.monotonic():
                raise Rejected('overall_deadline')
            owner = SocketOwner(deadline-time.monotonic())
            sock = socket.socket(socket.AF_INET if ip.version == 4 else socket.AF_INET6, socket.SOCK_STREAM)
            owner.install(sock)
            sock.settimeout(min(self.limits.operation, max(0.001, deadline-time.monotonic())))
            sock.connect((str(ip), partner.port))  # Numeric peer: never resolve the hostname a second time.
            if ipaddress.ip_address(sock.getpeername()[0]) != ip:
                raise Rejected('peer_policy')
            if partner.scheme == 'https':
                sock = self.context.wrap_socket(sock, server_hostname=partner.host, do_handshake_on_connect=False)
                owner.install(sock)
                sock.do_handshake()
            connection = http.client.HTTPConnection(partner.host, partner.port, timeout=self.limits.operation)
            connection.sock = sock
            wire_max = self.limits.wire_bytes
            class Response(http.client.HTTPResponse):
                def __init__(self, *args, **kwargs):
                    super().__init__(*args, **kwargs)
                    self.fp = WireBudget(self.fp, wire_max)
            connection.response_class = Response
            connection.putrequest('GET', target, skip_accept_encoding=True)
            connection.putheader('Accept', 'application/json')
            connection.putheader('Accept-Encoding', 'identity')
            connection.putheader('Connection', 'close')
            connection.endheaders()
            response = connection.getresponse()
            if owner.expired or deadline <= time.monotonic():
                raise Rejected('overall_deadline')
            if 300 <= response.status < 400:
                raise Rejected('redirect_rejected')
            if response.status != 200:
                raise Rejected('upstream_status')
            if response.headers.get_all('Transfer-Encoding'):
                raise Rejected('transfer_encoding_rejected')
            lengths = response.headers.get_all('Content-Length', [])
            if len(lengths) > 1 or (lengths and not re.fullmatch(r'0|[1-9][0-9]*', lengths[0])):
                raise Rejected('framing_rejected')
            content_length = None
            if lengths:
                maximum = str(self.limits.body_bytes)
                decimal = lengths[0]
                if len(decimal) > len(maximum) or (len(decimal) == len(maximum) and decimal > maximum):
                    raise Rejected('body_limit')
                content_length = int(decimal)  # At most five canonical digits after the text bound.
            encodings = response.headers.get_all('Content-Encoding', [])
            if len(encodings) > 1 or (encodings and encodings[0].lower() != 'identity'):
                raise Rejected('content_encoding_rejected')
            if response.headers.get('Content-Type', '').lower() != 'application/json':
                raise Rejected('content_type_rejected')
            body = response.read(self.limits.body_bytes + 1)
            if len(body) > self.limits.body_bytes:
                raise Rejected('body_limit')
            if content_length is not None and len(body) != content_length:
                raise Rejected('incomplete_body')
            if deadline <= time.monotonic():
                raise Rejected('overall_deadline')
            return Result(True, 'accepted', response.status, body)
        except Rejected as error:
            return Result(False, 'overall_deadline' if owner is not None and owner.expired else error.code)
        except ssl.SSLCertVerificationError:
            return Result(False, 'tls_identity_rejected')
        except (OSError, http.client.HTTPException):
            return Result(False, 'overall_deadline' if deadline <= time.monotonic() else 'transport_failed')
        finally:
            try:
                if owner is not None:
                    owner.close()
            finally:
                try:
                    if response is not None:
                        response.close()
                finally:
                    try:
                        if connection is not None:
                            connection.close()
                    finally:
                        self._slots.release()
