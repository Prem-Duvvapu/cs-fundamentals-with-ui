"""Real owned HTTP/TLS regressions plus explicitly labelled pure address-policy tests."""
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import socket
import ssl
import signal
import tempfile
import time
import unittest
from unittest.mock import patch

from cancellation import CancellationScope, run_regression
from fetch import FixturePermit, Limits, Partner, PartnerFetcher, Resolver, public_address, secure_context
from fixtures import Fixture, certificate

EVIDENCE = []
COUNTERS = {'httpRequests':0, 'resolverChildren':0, 'resolverChildrenReaped':0, 'fixtureServersClosed':0, 'temporaryTLSMaterialRemoved':False}


def answers(*addresses):
    return [{'family':socket.AF_INET6 if ':' in address else socket.AF_INET, 'address':address} for address in addresses]


class SSRFTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory(prefix='owned-ssrf-cert-')
        cls.cert, cls.key = certificate(cls.directory.name, 'partner.example.test')
        cls.wrong_cert, cls.wrong_key = certificate(cls.directory.name, 'wrong.example.test')

    @classmethod
    def tearDownClass(cls):
        cls.directory.cleanup()
        if Path(cls.directory.name).exists():
            raise AssertionError('temporary_tls_material_not_removed')
        COUNTERS['temporaryTLSMaterialRemoved'] = True

    def setUp(self):
        self.fixtures = []
        self.resolvers = []
        # Every permitted request connects to a numeric, already validated fixture address.
        # Any unexpected parent-process name resolution is a regression, not a real DNS query.
        self.dns_guard = patch.object(socket, 'getaddrinfo', side_effect=AssertionError('unexpected_second_dns_lookup'))
        self.dns_guard.start()
        original_connect = socket.socket.connect
        def owned_connect(sock, address):
            if address[0] != '127.0.0.1' or address[1] not in [fixture.port for fixture in self.fixtures]:
                raise AssertionError('foreign_connection_attempt_not_permitted_in_tests')
            return original_connect(sock, address)
        self.connect_guard = patch.object(socket.socket, 'connect', owned_connect)
        self.connect_guard.start()

    def tearDown(self):
        for fixture in reversed(self.fixtures):
            fixture.close()
            COUNTERS['httpRequests'] += fixture.count()
            COUNTERS['fixtureServersClosed'] += 1
        for resolver in self.resolvers:
            self.assertFalse(resolver.active, 'owned_resolver_child_still_active')
            COUNTERS['resolverChildren'] += len(resolver.events)
            COUNTERS['resolverChildrenReaped'] += sum(event['reaped'] for event in resolver.events)
        self.dns_guard.stop()
        self.connect_guard.stop()

    def fixture(self, tls=False, wrong=False):
        fixture = Fixture(self.wrong_cert if wrong else self.cert, self.wrong_key if wrong else self.key) if tls else Fixture()
        self.fixtures.append(fixture)
        return fixture

    def client(self, fixture, plans=None, *, tls=False, limits=Limits(), context=None):
        partner = Partner('https' if tls else 'http', 'partner.example.test', fixture.port)
        resolver = Resolver(plans if plans is not None else [{'answers':answers('127.0.0.1')} for _ in range(64)])
        self.resolvers.append(resolver)
        fetcher = PartnerFetcher([partner], resolver=resolver, limits=limits,
                                 fixture_permits=[FixturePermit(partner,'127.0.0.1')], context=context)
        return fetcher, f'{partner.scheme}://{partner.host}:{partner.port}/documents/'

    def record(self, case, **observations):
        EVIDENCE.append(dict(case=case, **observations))

    def test_actual_tls_pinned_numeric_peer_preserves_host_sni_and_suppresses_credentials(self):
        server = self.fixture(tls=True)
        client, base = self.client(server, tls=True, context=secure_context(self.cert))
        with patch.dict(os.environ, {'HTTPS_PROXY':'http://127.0.0.1:1','HTTP_PROXY':'http://127.0.0.1:1'}):
            first, second = client.fetch(base+'ok?revision=2'), client.fetch(base+'ok')
        self.assertTrue(first.accepted, first.reason)
        self.assertTrue(second.accepted, second.reason)
        self.assertEqual(2, server.count())
        self.assertEqual(2, client.resolver.calls)
        self.assertEqual(['partner.example.test']*2, server.sni)
        for request in server.requests:
            self.assertEqual('partner.example.test:'+str(server.port), request['headers']['Host'])
            for forbidden in ['Cookie','Authorization','Proxy-Authorization','X-Forwarded-For']:
                self.assertNotIn(forbidden, request['headers'])
            self.assertEqual('identity', request['headers']['Accept-Encoding'])
        self.assertEqual('/documents/ok?revision=2', server.requests[0]['target'])
        self.assertEqual('original synthetic partner fixture', json.loads(first.body)['document'])
        self.record('actual_tls_host_sni_pin_no_cookie_or_proxy', httpRequests=2, resolverCalls=2, verifiedTLS=True)

    def test_actual_http_controlled_rebinding_rechecks_next_request_without_second_resolution(self):
        server = self.fixture()
        client, base = self.client(server, [{'answers':answers('127.0.0.1')},{'answers':answers('127.0.0.2')}])
        self.assertTrue(client.fetch(base+'ok').accepted)
        self.assertEqual('address_policy', client.fetch(base+'ok').reason)
        self.assertEqual(1, server.count())
        self.assertEqual(2, client.resolver.calls)
        self.record('controlled_rebinding_model_not_public_dns', httpRequests=1, resolverCalls=2, nextRequestRejected=True)

    def test_actual_tls_wrong_hostname_and_untrusted_certificate_fail_before_http(self):
        wrong = self.fixture(tls=True, wrong=True)
        client, base = self.client(wrong, tls=True, context=secure_context(self.wrong_cert))
        result = client.fetch(base+'ok')
        self.assertEqual('tls_identity_rejected', result.reason)
        self.assertEqual(0, wrong.count())
        untrusted = self.fixture(tls=True)
        client, base = self.client(untrusted, tls=True)
        self.assertEqual('tls_identity_rejected', client.fetch(base+'ok').reason)
        self.assertEqual(0, untrusted.count())
        self.record('actual_tls_hostname_and_trust_failures', rejectedBeforeHTTP=2, httpRequests=0)

    def test_same_authority_and_external_redirects_never_followed(self):
        server, decoy = self.fixture(), self.fixture()
        server.redirect_target = f'http://127.0.0.1:{decoy.port}/documents/decoy'
        client, base = self.client(server)
        for code in [301,302,307,308]:
            for suffix in ['', '-external']:
                result = client.fetch(base+'redirect'+str(code)+suffix)
                self.assertEqual('redirect_rejected', result.reason)
        self.assertEqual(8, server.count())
        self.assertEqual(0, decoy.count())
        self.assertFalse(any('/documents/decoy' == request['target'] for request in server.requests))
        self.record('actual_redirects_same_authority_and_decoy', initialRequests=8, followedRequests=0, decoyRequests=0)

    def test_url_bypasses_rejected_before_dns_or_http(self):
        server = self.fixture()
        client, base = self.client(server)
        authority = 'partner.example.test:'+str(server.port)
        bad = [base.replace('http:',scheme+':')+'ok' for scheme in ['file','ftp','gopher','data']]
        bad += [f'http://{host}/documents/ok' for host in [authority+'@127.0.0.1','user@'+authority,
                'partner.example.test.evil.test:'+str(server.port), 'partner.example.test%00:'+str(server.port),
                '127.0.0.1:'+str(server.port), '2130706433:'+str(server.port), '0177.0.0.1:'+str(server.port),
                '[::1]:'+str(server.port), 'partner.example.test.:'+str(server.port), 'partner.example.test:0',
                'partner.example.test:01', 'partner.example.test:', 'partner.example.test:99999']]
        bad += [base+'ok#fragment', base+'ok#', ' '+base+'ok', base+'ok\r\nHeader:evil',
                base+'ok\\other', base+'%2e%2e', base+'../admin', base+'ok?url=http://127.0.0.1',
                base+'ok?revision=1&revision=2', base+'ok?revision=%31', base+'é', base+'x'*2100]
        for url in bad:
            with self.subTest(index=bad.index(url)):
                self.assertFalse(client.fetch(url).accepted)
        self.assertEqual(0, server.count())
        self.assertEqual(0, client.resolver.calls)
        self.record('url_authority_path_query_bypasses', deniedInputs=len(bad), dnsCalls=0, httpRequests=0)

    def test_all_dns_answers_rejected_before_any_connection(self):
        server = self.fixture()
        plans = [{'answers':answers('127.0.0.1', value)} for value in ['10.0.0.1','169.254.169.254','::1','::ffff:127.0.0.1','64:ff9b::7f00:1','2002:7f00:1::']]
        plans += [{'answers':answers('8.8.8.8','10.0.0.1')}, {'answers':[]},{'answers':[{'family':socket.AF_INET6,'address':'127.0.0.1'}]},
                  {'answers':answers('127.0.0.1%eth0')}]
        client, base = self.client(server, plans)
        for _ in plans:
            self.assertFalse(client.fetch(base+'ok').accepted)
        self.assertEqual(0, server.count())
        self.record('all_dns_answers_validated_synthetic_denied_ranges', cases=len(plans), httpRequests=0)

    def test_pure_public_address_policy_is_conservative_not_actual_network_evidence(self):
        denied = ['0.0.0.0','10.1.2.3','100.64.0.1','127.0.0.1','169.254.169.254','172.16.1.1',
                  '192.0.0.9','192.168.1.1','192.0.2.1','192.88.99.1','198.18.0.1','198.51.100.1',
                  '203.0.113.1','224.0.0.1','255.255.255.255','::','::1','fc00::1','fe80::1','ff02::1',
                  '::ffff:8.8.8.8','64:ff9b::808:808','2001::1','2001:db8::1','2002:808:808::1','3fff::1',
                  'fe80::1%eth0','0177.0.0.1','2130706433']
        for value in denied:
            self.assertFalse(public_address(value), value)
        for value in ['8.8.8.8','2606:4700:4700::1111']:
            self.assertTrue(public_address(value))
        self.record('pure_address_policy_only', deniedInputs=len(denied), publicExampleInputs=2, networkRequests=0)

    def test_framing_encoding_body_and_wire_limits_observed_on_actual_http(self):
        server = self.fixture()
        client, base = self.client(server)
        expected = {'chunked':'transfer_encoding_rejected', 'dual-framing':'transfer_encoding_rejected',
                    'duplicate-length':'framing_rejected','bad-length':'framing_rejected', 'comma-length':'framing_rejected',
                    'encoding':'content_encoding_rejected','oversized-length':'body_limit','oversized-close':'body_limit',
                    'short-body':'incomplete_body','headers-large':'wire_limit'}
        for mode, reason in expected.items():
            self.assertEqual(reason, client.fetch(base+mode).reason, mode)
        self.assertEqual(len(expected), server.count())
        self.record('actual_response_bounds_and_framing', requests=len(expected), accepted=0)

    def test_stalled_body_and_dripping_headers_have_actual_deadlines(self):
        server = self.fixture()
        client, base = self.client(server, limits=Limits(overall=.5,operation=.4))
        start = time.monotonic()
        result = client.fetch(base+'stalled-body')
        self.assertFalse(result.accepted)
        self.assertLess(time.monotonic()-start, 1.2)
        client, base = self.client(server, limits=Limits(overall=.5,operation=.4))
        start = time.monotonic()
        result = client.fetch(base+'drip')
        elapsed = time.monotonic()-start
        self.assertFalse(result.accepted)
        self.assertEqual('overall_deadline', result.reason)
        self.assertLess(elapsed, 1.2)
        self.record('actual_stalled_body_and_slow_drip_deadlines', failedRequests=2, overallBudgetMillis=500, slowDripElapsedMillis=round(elapsed*1000))

    def test_resolver_timeout_kills_and_reaps_actual_owned_child(self):
        server = self.fixture()
        client, base = self.client(server, [{'sleep':5,'answers':answers('127.0.0.1')}], limits=Limits(overall=.6,operation=.15))
        start = time.monotonic()
        result = client.fetch(base+'ok')
        elapsed = time.monotonic()-start
        self.assertEqual('resolver_deadline', result.reason)
        self.assertFalse(client.resolver.active)
        self.assertEqual(-9, client.resolver.events[-1]['returnCode'])
        self.assertTrue(client.resolver.events[-1]['reaped'])
        self.assertLess(elapsed, 1.2)
        self.assertEqual(0, server.count())
        self.record('actual_resolver_child_timeout_cleanup', childrenActive=0, childExitCode=client.resolver.events[-1]['returnCode'], childReaped=True, httpRequests=0, elapsedMillis=round(elapsed*1000))

    def test_concurrency_and_call_budgets_before_extra_resolver_or_http_work(self):
        server = self.fixture()
        client, base = self.client(server, limits=Limits(overall=3,operation=1,concurrency=1,max_calls=2))
        with ThreadPoolExecutor(max_workers=1) as executor:
            pending = executor.submit(client.fetch, base+'gate')
            self.assertTrue(server.entered.wait(timeout=1.5))
            self.assertEqual('overloaded', client.fetch(base+'ok').reason)
            server.release.set()
            self.assertTrue(pending.result(timeout=2).accepted)
        self.assertEqual('call_limit', client.fetch(base+'ok').reason)
        self.assertEqual(1, server.count())
        self.assertEqual(1, client.resolver.calls)
        self.record('actual_concurrency_and_call_caps', httpRequests=1, resolverCalls=1, overloadRejected=True, callLimitRejected=True)

    def test_actual_sigterm_boundary_reaps_resolver_and_closes_fixture(self):
        report = run_regression()
        self.assertTrue(report['cancelled'])
        self.assertTrue(report['resolverReaped'])
        self.assertEqual(-9, report['resolverExitCode'])
        self.assertTrue(report['fixtureClosed'])
        self.assertTrue(report['temporaryTLSMaterialRemoved'])
        self.record('actual_sigterm_executable_boundary', **report)

    def test_operator_policy_cannot_accidentally_disable_tls_or_widen_fixture_addresses(self):
        previous_handler = signal.getsignal(signal.SIGTERM)
        with CancellationScope():
            self.assertNotEqual(previous_handler, signal.getsignal(signal.SIGTERM))
        self.assertEqual(previous_handler, signal.getsignal(signal.SIGTERM))
        partner = Partner('http','partner.example.test',443)
        with self.assertRaises(ValueError):
            PartnerFetcher([partner])
        for address in ['127.0.0.2','10.0.0.1','0.0.0.0']:
            with self.assertRaises(ValueError):
                FixturePermit(partner,address)
        context = secure_context(self.cert)
        context.check_hostname=False
        with self.assertRaises(ValueError):
            PartnerFetcher([Partner('https','partner.example.test',443)], context=context)
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'SSLKEYLOGFILE':str(Path(directory)/'private-key-log')}):
            self.assertIsNone(secure_context(self.cert).keylog_filename)
            self.assertFalse((Path(directory)/'private-key-log').exists())


if __name__ == '__main__':
    unittest.main(verbosity=2)
