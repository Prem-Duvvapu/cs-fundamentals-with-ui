"""Bounded public-client mechanics; real authorization server owns the OAuth protocol."""
import base64
import hashlib
import http.cookiejar
import json
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request


def b64url(value):
    return base64.urlsafe_b64encode(value).rstrip(b'=').decode()


def loopback_url(value):
    parsed = urllib.parse.urlsplit(value)
    if parsed.scheme != 'http' or parsed.hostname != '127.0.0.1' or parsed.username or parsed.password \
            or parsed.port is None or not 1 <= parsed.port <= 65535 or parsed.fragment:
        raise ValueError('Only an explicitly owned loopback URL is allowed')
    return parsed


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, file, code, message, headers, new_url):
        return None


class Transport:
    def __init__(self, origins, clock=time.monotonic):
        self.origins = set(origins)
        self.clock = clock
        self.deadline = clock() + 180
        self.calls = 0
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect(),
                            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def request(self, url, *, method='GET', form=None, document=None, headers=None):
        parsed = loopback_url(url)
        if f'{parsed.scheme}://{parsed.netloc}' not in self.origins:
            raise ValueError('Destination is not owned by this verification')
        self.calls += 1
        if self.calls > 128 or self.clock() >= self.deadline:
            raise RuntimeError('Owned client request/deadline budget exhausted')
        actual_headers = dict(headers or {})
        data = None
        if form is not None:
            data = urllib.parse.urlencode(form).encode()
            actual_headers['Content-Type'] = 'application/x-www-form-urlencoded'
        if document is not None:
            data = json.dumps(document).encode()
            actual_headers['Content-Type'] = 'application/json'
        if data is not None and len(data) > 16_384:
            raise ValueError('Client request exceeds its body limit')
        request = urllib.request.Request(url, method=method, headers=actual_headers, data=data)
        try:
            response = self.opener.open(request, timeout=3)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            raw = response.read(65_537)
            if len(raw) > 65_536:
                raise RuntimeError('HTTP response exceeded 64 KiB')
            return response.status, response.headers, raw


class PendingAuthorization:
    """One pending, expiring browser transaction; no tokens or persistent storage."""
    def __init__(self, redirect, clock=time.monotonic):
        loopback_url(redirect)
        self.redirect = redirect
        self.clock = clock
        self.pending = None

    def begin(self, client_id='tracker-public', scope='projects:read projects:write'):
        state = secrets.token_urlsafe(32)
        verifier = secrets.token_urlsafe(32)
        self.pending = (state, verifier, client_id, self.clock() + 30)
        return {'response_type': 'code', 'client_id': client_id, 'redirect_uri': self.redirect,
                'scope': scope, 'state': state,
                'code_challenge': b64url(hashlib.sha256(verifier.encode()).digest()),
                'code_challenge_method': 'S256'}

    def accept(self, callback):
        pending, self.pending = self.pending, None
        parsed = loopback_url(callback)
        expected = urllib.parse.urlsplit(self.redirect)
        if pending is None or self.clock() >= pending[3] or len(callback) > 8192 \
                or (parsed.scheme, parsed.netloc, parsed.path) != (expected.scheme, expected.netloc, expected.path):
            raise ValueError('Callback rejected without a token exchange')
        try:
            parameters = urllib.parse.parse_qs(parsed.query, keep_blank_values=True, max_num_fields=6)
        except ValueError:
            raise ValueError('Callback rejected without a token exchange') from None
        if set(parameters) != {'code', 'state'} or any(len(values) != 1 for values in parameters.values()) \
                or not secrets.compare_digest(parameters['state'][0], pending[0]) \
                or not 1 <= len(parameters['code'][0]) <= 2048:
            raise ValueError('Callback rejected without a token exchange')
        return parameters['code'][0], pending[1], pending[2]
