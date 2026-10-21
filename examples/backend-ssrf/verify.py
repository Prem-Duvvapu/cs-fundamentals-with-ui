"""Execute only original owned fixtures. This command accepts no fetch destination."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import platform
import ssl
import unittest

import test_fetch
from cancellation import CancellationScope, Cancelled
from fixtures import Fixture
from fetch import POLICY_VERSION

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--record-local', action='store_true', help='Also retain this actual local run in evidence/YYYY-MM-DD-local.json')
    args = parser.parse_args()
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(test_fetch.SSRFTests)
    with CancellationScope():
        try:
            result = unittest.TextTestRunner(verbosity=2).run(suite)
        except (Cancelled, KeyboardInterrupt):
            raise SystemExit('Cancelled; unwinding owned SSRF resources') from None
        finally:
            for fixture in list(Fixture.live):
                fixture.close()
            if hasattr(test_fetch.SSRFTests, 'directory'):
                test_fetch.SSRFTests.directory.cleanup()
    if not result.wasSuccessful() or result.skipped or result.testsRun != 16:
        raise SystemExit('All 16 actual transport and policy tests must run without failures or skips')
    counters = test_fetch.COUNTERS
    if counters['httpRequests'] != 26 or counters['resolverChildren'] != counters['resolverChildrenReaped'] or not counters['temporaryTLSMaterialRemoved']:
        raise SystemExit('Actual HTTP cases and complete owned resource cleanup are mandatory')
    now = datetime.now(timezone.utc)
    report = {
        'schemaVersion':1, 'execution':'actual-owned-loopback-http-and-tls',
        'executedAt':now.isoformat(), 'addressPolicyVersion':POLICY_VERSION,
        'runtime':{'python':platform.python_version(), 'openssl':ssl.OPENSSL_VERSION, 'system':platform.system()},
        'sourceSha256LF':{name:hashlib.sha256((ROOT/name).read_text().replace('\r\n','\n').encode()).hexdigest()
                          for name in ['fetch.py','resolver_worker.py','fixtures.py','test_fetch.py','verify.py','cancellation.py']},
        'testsRun':result.testsRun, 'failures':0, 'errors':0, 'skipped':0,
        'foreignConnectionGuardEnabled':True, 'publicDNSExperiment':False,
        'cleanupVerified':True, 'observations':counters, 'cases':test_fetch.EVIDENCE,
        'limitsOfEvidence':['Registered partner URL policy, not unrestricted Internet fetching',
                            'DNS replies are controlled child-process fixtures, not actual public DNS rebinding',
                            'No cloud metadata/private foreign service was contacted',
                            'Temporary loopback TLS trust is not production PKI or egress-firewall evidence']}
    output = json.dumps(report, indent=2)+'\n'
    if len(output.encode()) > 16384:
        raise SystemExit('Evidence output limit exceeded')
    directory = ROOT/'build/evidence'
    directory.mkdir(parents=True, exist_ok=True)
    (directory/'result.json').write_text(output)
    if args.record_local:
        (ROOT/'evidence'/f'{now.date()}-local.json').write_text(output)
    print(f'All {result.testsRun} tests passed; {counters["httpRequests"]} actual HTTP requests, verified TLS, no redirects/skips; owned resources cleaned.')


if __name__ == '__main__':
    main()
