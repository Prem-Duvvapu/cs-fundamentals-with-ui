#!/usr/bin/env python3
"""Run only this checked-in Spring/JDK exercise; publish bounded nonsecret evidence."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import tempfile
import xml.etree.ElementTree as ET

from processes import Budget, LabFailure, cancellation_guard, run

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
TRACKER = HERE.parent / 'java-spring/task-tracker'
CASES = {
    'anonymous_upgrade_401', 'form_login_csrf_password_cross_session_and_fixation',
    'authenticated_viewer_upgrade_403', 'missing_null_cross_duplicate_origins_and_query_rejected',
    'failed_upgrade_releases_pre101_admission', 'cookie_only_principal_and_same_connection_json_echo',
    'actual_fragmented_text_reassembled_once', 'graceful_disconnect_and_authenticated_reconnect',
    'global_and_principal_connection_caps_recover', 'strict_schema_duplicate_unknown_nested_trailing_and_ack_rejected',
    'binary_message_rejected', 'whole_and_fragmented_message_buffer_limits',
    'actual_unacknowledged_application_pressure', 'actual_ack_deadline', 'actual_socket_idle_deadline',
    'finite_per_connection_command_count', 'csrf_logout_invalidates_cookie_closes_socket_releases_capacity',
    'reauthentication_rotation_closes_old_identity_socket',
    'held_authenticated_upgrade_rejected_after_concurrent_reauthentication',
    'unchanged_task_tracker_basic_csrf_and_owner_contract', 'application_shutdown_socket_and_registry_cleanup',
    'independent_actual_servlet_idle_expiry_and_socket_consequence',
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def imported_hashes():
    files = sorted((TRACKER / 'src/main').rglob('*'))
    if any(path.is_symlink() for path in files):
        raise LabFailure('Imported source must not be symlinked')
    files.append(TRACKER / 'pom.xml')
    return {path.relative_to(ROOT).as_posix(): sha(path) for path in files if path.is_file()}


def module_hashes():
    files = [HERE/'pom.xml', HERE/'processes.py', HERE/'verify.py', HERE/'test_verify.py']
    files.extend(path for path in (HERE/'src').rglob('*') if path.is_file())
    if any(path.is_symlink() for path in files):
        raise LabFailure('Teaching source must not be symlinked')
    return {path.relative_to(ROOT).as_posix(): sha(path) for path in sorted(files)}


def check_import_contract():
    ns = {'m': 'http://maven.apache.org/POM/4.0.0'}
    canonical, module = (ET.parse(path).getroot() for path in (TRACKER/'pom.xml', HERE/'pom.xml'))
    def nodes(tree, selector):
        return [tuple((child.tag.split('}')[-1], (child.text or '').strip()) for child in node.iter() if child is not node)
                for node in tree.findall(selector, ns)]
    for selector in ('m:parent', 'm:properties', 'm:dependencyManagement'):
        if nodes(canonical, selector) != nodes(module, selector):
            raise LabFailure('Task Tracker build compatibility drift')
    original = nodes(canonical, 'm:dependencies/m:dependency')
    actual = nodes(module, 'm:dependencies/m:dependency')
    addition = (('groupId', 'org.springframework.boot'), ('artifactId', 'spring-boot-starter-websocket'))
    if actual.count(addition) != 1 or [entry for entry in actual if entry != addition] != original:
        raise LabFailure('Only the matching WebSocket starter may extend original dependencies')


def publish(path, report):
    path = Path(path).absolute()
    if path.is_symlink() or path.resolve() != path:
        raise LabFailure('Evidence destination must not traverse symlinks')
    resolved = path.resolve()
    if resolved.is_relative_to(ROOT) and not resolved.is_relative_to(HERE / 'target/evidence'):
        raise LabFailure('Evidence inside the repository belongs only in this module target/evidence')
    encoded = (json.dumps(report, indent=2, sort_keys=True)+'\n').encode()
    if len(encoded) > 65536:
        raise LabFailure('Evidence publication byte limit')
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix='.owned-ws-', delete=False) as owned:
        temporary = Path(owned.name)
        try:
            owned.write(encoded); owned.flush(); os.fsync(owned.fileno())
            os.replace(temporary, path)
        finally:
            temporary.unlink(missing_ok=True)


def validate(receipt):
    if receipt.get('mode') != 'actual-loopback-spring-websocket' or set(receipt.get('passedCases', [])) != CASES:
        raise LabFailure('Every actual integration case is required')
    if len(receipt['passedCases']) != len(CASES):
        raise LabFailure('Duplicate case receipts')
    if receipt.get('childJavaFeature') != 17 or receipt.get('compilerRelease') != 17 or not isinstance(receipt.get('childJavaRuntimeVersion'), str):
        raise LabFailure('Actual Java child runtime and compiler target evidence required')
    if receipt.get('springBoot') != '4.1.1' or receipt.get('springFramework') != '7.0.9' or not receipt.get('tomcat', '').startswith('11.0.24'):
        raise LabFailure('Matching executed Spring and Tomcat versions required')
    if receipt.get('applicationContextsClosed') is not True or receipt.get('directProxyPolicy') is not True:
        raise LabFailure('Actual application cleanup and direct clients required')
    ordinary, expiry = receipt['ordinaryLimits'], receipt['expiryLimits']
    if ordinary['active'] != 0 or expiry['active'] != 0 or ordinary['connectionHighWater'] != 3 or ordinary['unackedHighWater'] != 4:
        raise LabFailure('Actual capacity/pressure/release boundaries required')
    if ordinary['nativeSessionsConfigured'] < 15 or expiry['nativeSessionsConfigured'] != 1 or not 0 < ordinary['queueBytesHighWater'] <= 4096:
        raise LabFailure('Native container and bounded queue evidence required')
    for name in ('PolicyTest', 'WebSocketTransportTest'):
        path = HERE / ('target/surefire-reports/TEST-com.csfundamentals.websocketlab.'+name+'.xml')
        suite = ET.parse(path).getroot()
        expected = '9' if name == 'PolicyTest' else '1'
        if suite.get('tests') != expected or any(int(suite.get(field, '0')) for field in ('failures', 'errors', 'skipped')):
            raise LabFailure('Required real test suite failed or skipped')


def verify(*, prepare=False):
    budget = Budget.start(300)
    check_import_contract()
    before = imported_hashes()
    module_before = module_hashes()
    evidence = HERE / 'target/evidence/transport.json'
    evidence.unlink(missing_ok=True)  # A stale receipt must never pass a failed current run.
    with tempfile.TemporaryDirectory(prefix='owned-websocket-') as directory:
        settings = Path(directory) / 'settings.xml'
        settings.write_text('<settings xmlns="http://maven.apache.org/SETTINGS/1.2.0"/>\n')
        command = ['mvn', '-s', settings, '-gs', settings, '-B', '-ntp', '-q']
        if prepare:
            run(command+['-DskipTests', 'package'], HERE, budget, timeout=120)
        run(command+['-o', 'verify'], HERE, budget, timeout=175)
    if imported_hashes() != before:
        raise LabFailure('Imported Task Tracker source changed')
    if module_hashes() != module_before:
        raise LabFailure('Teaching source changed during verification')
    if evidence.stat().st_size > 16384:
        raise LabFailure('Transport receipt byte limit')
    receipt = json.loads(evidence.read_text())
    validate(receipt)
    jar = HERE / 'target/backend-websocket-0.0.1-SNAPSHOT.jar'
    class_file = HERE / 'target/classes/com/csfundamentals/websocketlab/WebSocketLab.class'
    if int.from_bytes(class_file.read_bytes()[6:8], 'big') != 61:
        raise LabFailure('Actual emitted class must target Java 17')
    return dict(schemaVersion=1, status='passed', transport=receipt,
        importedTaskTrackerSourceUnchanged=True, importedSourceSha256=before, moduleSourceSha256=module_before,
        artifactSha256=sha(jar), transportReceiptSha256=sha(evidence),
        limits={'wholeRunSeconds': 300, 'mavenPhaseSeconds': 175, 'childOutputBytes': 131072, 'reportBytes': 65536},
        scope=['reviewed synthetic local fixtures', 'actual Spring HTTP/1.1 upgrade and JDK WebSocket clients',
               'application ACK pressure is not TCP stall evidence', 'no chat, fan-out, distributed sessions, TLS or browser/GUI proof'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepare', action='store_true', help='Resolve declared public Maven dependencies once; actual verification still runs offline')
    args = parser.parse_args()
    destination = HERE / 'target/evidence/verification.json'
    destination.unlink(missing_ok=True)
    report = {'schemaVersion': 1, 'status': 'interrupted'}
    try:
        with cancellation_guard():
            report = verify(prepare=args.prepare)
        publish(destination, report)
        print(f'Passed: {len(CASES)} actual WebSocket/session cases, 9 policy tests; sanitized evidence in target/evidence/verification.json')
    except (LabFailure, OSError, ValueError, KeyError, ET.ParseError) as failure:
        report = dict(schemaVersion=1, status='interrupted' if isinstance(failure, LabFailure) and 'cancelled' in str(failure).lower() else 'failed', failureType=type(failure).__name__)
        publish(destination, report)
        print('WebSocket verification did not pass; private child output is not published.')
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
