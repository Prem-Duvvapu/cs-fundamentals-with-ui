import hashlib
from pathlib import Path
import sys
import unittest
import urllib.parse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from client import PendingAuthorization, Transport, b64url, loopback_url


class ClientBoundaryTests(unittest.TestCase):
    def test_s256_uses_original_private_verifier_and_single_use_state(self):
        pending = PendingAuthorization('http://127.0.0.1:12345/callback')
        request = pending.begin()
        callback = pending.redirect + '?' + urllib.parse.urlencode({'code': 'synthetic-unit-code', 'state': request['state']})
        code, verifier, client_id = pending.accept(callback)
        self.assertEqual(b64url(hashlib.sha256(verifier.encode()).digest()), request['code_challenge'])
        self.assertEqual(client_id, 'tracker-public')
        self.assertNotIn(verifier, urllib.parse.urlencode(request))
        with self.assertRaises(ValueError):
            pending.accept(callback)

    def test_missing_changed_duplicate_state_error_and_wrong_destination_fail_closed(self):
        for suffix in ('code=x', 'code=x&state=changed', 'code=x&state=x&state=y',
                       'error=access_denied&state=x'):
            pending = PendingAuthorization('http://127.0.0.1:12345/callback')
            pending.begin()
            with self.assertRaises(ValueError):
                pending.accept(pending.redirect + '?' + suffix)
            self.assertIsNone(pending.pending)
        pending = PendingAuthorization('http://127.0.0.1:12345/callback')
        request = pending.begin()
        with self.assertRaises(ValueError):
            pending.accept('http://127.0.0.1:12346/callback?' + urllib.parse.urlencode({'code': 'x', 'state': request['state']}))

    def test_expired_state_and_newer_transaction_reject_old_callback(self):
        now = [1.0]
        pending = PendingAuthorization('http://127.0.0.1:12345/callback', lambda: now[0])
        first = pending.begin()
        now[0] = 31.0
        with self.assertRaises(ValueError):
            pending.accept(pending.redirect + '?' + urllib.parse.urlencode({'code': 'x', 'state': first['state']}))
        first = pending.begin()
        pending.begin()
        with self.assertRaises(ValueError):
            pending.accept(pending.redirect + '?' + urllib.parse.urlencode({'code': 'x', 'state': first['state']}))

    def test_remote_urls_unowned_ports_and_client_budget_never_reach_network(self):
        for url in ('https://remote.invalid/callback', 'http://localhost:1/callback', 'http://user@127.0.0.1:1/callback'):
            with self.assertRaises(ValueError):
                loopback_url(url)
        transport = Transport({'http://127.0.0.1:12345'})
        with self.assertRaises(ValueError):
            transport.request('http://127.0.0.1:12346/callback')
        transport.calls = 128
        with self.assertRaises(RuntimeError):
            transport.request('http://127.0.0.1:12345/ready')


if __name__ == '__main__':
    unittest.main()
