import copy
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import verify


class EvidenceGuards(unittest.TestCase):
    def test_actual_suite_cannot_be_replaced_with_skips_or_only_guard_tests(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            for short, count in [('ActualPostgresHttpTest', 4), ('LabGuardTest', 4)]:
                name = 'com.csfundamentals.testing.' + short
                cases = ''.join('<testcase name="case%d"/>' % i for i in range(count))
                (directory / ('TEST-' + name + '.xml')).write_text('<testsuite name="%s" tests="%d" skipped="0">%s</testsuite>' % (name, count, cases))
            self.assertEqual(8, verify.test_counts(directory)['tests'])
            path = directory / 'TEST-com.csfundamentals.testing.ActualPostgresHttpTest.xml'
            original = path.read_text()
            path.write_text(original.replace('skipped="0"', 'skipped="1"'))
            with self.assertRaises(ValueError):
                verify.test_counts(directory)
            path.unlink()
            with self.assertRaises(ValueError):
                verify.test_counts(directory)

    def test_inherited_application_injection_is_scrubbed_and_remote_docker_rejected(self):
        with patch.dict(os.environ, {'SPRING_CONFIG_LOCATION': '/private', 'JAVA_TOOL_OPTIONS': '-Dsecret=yes',
                                    'TESTCONTAINERS_RYUK_DISABLED': 'true', 'DOCKER_HOST': 'unix:///var/run/docker.sock'}):
            environment = verify.isolated_environment()
            self.assertNotIn('SPRING_CONFIG_LOCATION', environment)
            self.assertNotIn('JAVA_TOOL_OPTIONS', environment)
            self.assertNotIn('TESTCONTAINERS_RYUK_DISABLED', environment)
        with patch.dict(os.environ, {'DOCKER_HOST': 'tcp://remote.example:2375'}):
            with self.assertRaises(ValueError):
                verify.isolated_environment()

    def test_reused_framework_jdk_and_source_identity_are_present(self):
        self.assertRegex(verify.check_reuse_contract(), r'^[a-f0-9]{64}$')
        self.assertEqual(verify.tracker_sources_hash(), verify.tracker_sources_hash())

    def test_sanitized_report_requires_every_failed_attempt_and_real_pool_observation(self):
        phases = {}
        for name, attempts, concurrency, errors in [('healthy', 24, 2, 0), ('all-two-connections-deliberately-held', 12, 4, 12), ('recovered', 24, 2, 0)]:
            phases[name] = dict(requestCap=attempts, concurrency=concurrency, phaseDeadlineMs=20000,
                                summary=dict(attempts=attempts, successes=attempts-errors, errors=errors, elapsedNanos=1_000_000_000,
                                             throughputPerSecond=attempts, p50Ms=1, p95Ms=2, latencyBuckets={'le25ms': attempts}, outcomes={'500' if errors else '200': attempts}),
                                maxActiveConnections=2, maxWaitingForConnection=4 if errors else 0, peakHeapUsedBytes=1024, peakJvmThreads=10)
        report = dict(evidence='actual-testcontainers-postgresql-and-unchanged-task-tracker-http', ownedContainerStopped=True, applicationClosed=True,
                      provenCases=['unit-test-synthetic']*5, warmupRequestsExcluded=4, measuredAttempts=60, load=phases)
        verify.validate_evidence(report)
        omitted = copy.deepcopy(report)
        omitted['load']['all-two-connections-deliberately-held']['summary']['errors'] = 0
        with self.assertRaises(ValueError):
            verify.validate_evidence(omitted)
        missing_observation = copy.deepcopy(report)
        missing_observation['load']['all-two-connections-deliberately-held']['maxWaitingForConnection'] = 0
        with self.assertRaises(ValueError):
            verify.validate_evidence(missing_observation)


if __name__ == '__main__':
    unittest.main()
