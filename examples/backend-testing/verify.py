#!/usr/bin/env python3
"""Run the mandatory actual suite; refuse skipped tests and absent actual evidence."""
import hashlib
import json
import os
from pathlib import Path
import selectors
import signal
import subprocess
import time
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
TRACKER = ROOT.parent / 'java-spring/task-tracker'
NS = {'m': 'http://maven.apache.org/POM/4.0.0'}


def isolated_environment():
    blocked = ('SPRING_', 'SERVER_', 'LOGGING_', 'MANAGEMENT_', 'TASK_TRACKER_', 'TESTCONTAINERS_')
    environment = {key: value for key, value in os.environ.items()
                   if not key.startswith(blocked) and key not in ('JAVA_TOOL_OPTIONS', 'JDK_JAVA_OPTIONS', '_JAVA_OPTIONS', 'MAVEN_OPTS')}
    if environment.get('DOCKER_HOST', 'unix:///var/run/docker.sock') != 'unix:///var/run/docker.sock':
        raise ValueError('This lab requires an owned container on the local Docker daemon')
    return environment


def check_reuse_contract():
    original = ET.parse(TRACKER / 'pom.xml').getroot()
    module = ET.parse(ROOT / 'pom.xml').getroot()
    for query in ('m:parent/m:version', 'm:properties/m:java.version',
                  "m:dependencyManagement/m:dependencies/m:dependency[m:artifactId='opentelemetry-bom']/m:version"):
        if original.findtext(query, namespaces=NS) != module.findtext(query, namespaces=NS):
            raise ValueError('Keep the lab aligned with Task Tracker framework/JDK/telemetry versions')
    return hashlib.sha256((TRACKER / 'pom.xml').read_bytes()).hexdigest()


def tracker_sources_hash():
    digest = hashlib.sha256()
    for path in sorted((TRACKER / 'src').rglob('*')):
        if path.is_file():
            digest.update(path.relative_to(TRACKER).as_posix().encode())
            digest.update(path.read_bytes())
    return digest.hexdigest()


def test_counts(directory):
    expected = {'com.csfundamentals.testing.ActualPostgresHttpTest': 4, 'com.csfundamentals.testing.LabGuardTest': 4}
    totals = dict(tests=0, failures=0, errors=0, skipped=0)
    found = set()
    for path in directory.glob('TEST-*.xml'):
        row = ET.parse(path).getroot()
        name = row.attrib.get('name')
        if name not in expected:
            raise ValueError('Unexpected suite; refuse stale or unreviewed evidence')
        values = {field: int(row.attrib.get(field, '0')) for field in totals}
        if values['tests'] != expected[name] or any(values[field] for field in ('failures', 'errors', 'skipped')):
            raise ValueError('All actual and guard cases must execute and pass without skips')
        if len(row.findall('testcase')) != expected[name] or row.findall('.//skipped'):
            raise ValueError('No test-count substitution or hidden skips')
        found.add(name)
        for field in totals:
            totals[field] += values[field]
    if found != set(expected):
        raise ValueError('Required actual suite evidence missing')
    return totals


def validate_evidence(report):
    if report.get('evidence') != 'actual-testcontainers-postgresql-and-unchanged-task-tracker-http':
        raise ValueError('Actual run label missing')
    if not report.get('ownedContainerStopped') or not report.get('applicationClosed') or len(report.get('provenCases', [])) != 5:
        raise ValueError('Complete scenario and owned cleanup evidence required')
    if report.get('warmupRequestsExcluded') != 4 or report.get('measuredAttempts') != 60:
        raise ValueError('Workload denominator changed')
    expected = {'healthy': (24, 2, 0), 'all-two-connections-deliberately-held': (12, 4, 12), 'recovered': (24, 2, 0)}
    if set(report.get('load', {})) != set(expected):
        raise ValueError('All measured phases required')
    for name, (attempts, concurrency, errors) in expected.items():
        phase = report['load'][name]
        summary = phase['summary']
        if (phase['requestCap'], phase['concurrency'], phase['phaseDeadlineMs']) != (attempts, concurrency, 20000):
            raise ValueError('Declared load limits changed')
        if (summary['attempts'], summary['errors'], summary['successes']) != (attempts, errors, attempts - errors):
            raise ValueError('Failed attempts cannot disappear')
        if sum(summary['latencyBuckets'].values()) != attempts or sum(summary['outcomes'].values()) != attempts:
            raise ValueError('Histogram and outcomes must include every attempt')
        if not 0 <= summary['p50Ms'] <= summary['p95Ms'] or not 0 < summary['elapsedNanos'] <= 25_000_000_000:
            raise ValueError('Bounded actual phase timings required')
        computed = attempts * 1_000_000_000 / summary['elapsedNanos']
        if abs(summary['throughputPerSecond'] - computed) > .000001:
            raise ValueError('Throughput must use elapsed phase wall time')
        if phase['peakHeapUsedBytes'] <= 0 or phase['peakJvmThreads'] <= 0:
            raise ValueError('Actual process resource observations missing')
    starved = report['load']['all-two-connections-deliberately-held']
    if starved['maxActiveConnections'] != 2 or starved['maxWaitingForConnection'] < 1:
        raise ValueError('Controlled pool starvation must be observed rather than inferred')


def run_build():
    process = subprocess.Popen(['mvn', '-B', '-f', str(ROOT / 'pom.xml'), 'clean', 'verify'], cwd=ROOT,
                               env=isolated_environment(), stdout=subprocess.PIPE, stderr=subprocess.STDOUT, start_new_session=True)
    selector = selectors.DefaultSelector()
    selector.register(process.stdout, selectors.EVENT_READ)
    deadline, size = time.monotonic() + 300, 0
    try:
        while selector.get_map():
            if time.monotonic() >= deadline:
                raise TimeoutError('Owned actual testing build exceeded five minutes')
            for key, _ in selector.select(.2):
                data = os.read(key.fd, 16384)
                size += len(data)
                if not data:
                    selector.unregister(key.fileobj)
                if size > 8 * 1024 * 1024:
                    raise RuntimeError('Owned build output exceeded its eight MiB cap')
        if process.wait(timeout=max(.1, deadline - time.monotonic())) != 0:
            raise RuntimeError('Actual Maven suite failed. Run the README Maven command for local diagnosis; no raw application/credential logs are published.')
    finally:
        selector.close()
        if process.poll() is None:
            os.killpg(process.pid, signal.SIGTERM)
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait(timeout=3)
        process.stdout.close()


def main():
    pom_hash, before = check_reuse_contract(), tracker_sources_hash()
    run_build()
    if tracker_sources_hash() != before:
        raise RuntimeError('Task Tracker source changed during an isolated lab run')
    counts = test_counts(ROOT / 'target/surefire-reports')
    path = ROOT / 'target/evidence/actual-testing.json'
    if path.stat().st_size > 65536:
        raise ValueError('Bounded actual evidence file required')
    report = json.loads(path.read_text())
    validate_evidence(report)
    summary = dict(evidence='actual-testcontainers-http-load-and-causal-flaky-fix', tests=counts,
                   taskTrackerPomSha256=pom_hash, taskTrackerSourceSha256=before, originalSourceUnchanged=True,
                   actualReportSha256=hashlib.sha256(path.read_bytes()).hexdigest(), ownedBuildReaped=True)
    (path.parent / 'verification.json').write_text(json.dumps(summary, indent=2) + '\n')
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    main()
