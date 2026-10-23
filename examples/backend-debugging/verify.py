#!/usr/bin/env python3
"""Actual unchanged Task Tracker configuration and owned JDI debugger observations."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import secrets
import re
import shutil
import tempfile
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from processes import Budget, LabFailure, OwnedProcess, cancellation_guard, environment, run

HERE = Path(__file__).resolve().parent
TRACKER = HERE.parent/'java-spring/task-tracker'
SOURCES = TRACKER/'src/main/java/com/csfundamentals/example'
KEY = 'management.endpoints.web.exposure.include'
JAR = HERE/'target/backend-debugging-0.0.1-SNAPSHOT.jar'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def snapshot():
    files = [TRACKER/'pom.xml', *sorted((TRACKER/'src/main').rglob('*.java')), *sorted((TRACKER/'src/main/resources').rglob('*'))]
    return {str(path.relative_to(TRACKER)): sha(path.read_bytes()) for path in files if path.is_file()}


def build(owner, budget):
    namespace = {'m': 'http://maven.apache.org/POM/4.0.0'}
    old, new = [ET.parse(path).getroot() for path in (TRACKER/'pom.xml', HERE/'pom.xml')]
    for element in ('parent', 'properties', 'dependencyManagement', 'dependencies'):
        if ET.tostring(old.find('m:'+element, namespace)) != ET.tostring(new.find('m:'+element, namespace)):
            raise LabFailure('Imported Task Tracker dependency contract drift')
    settings = owner/'settings.xml'; settings.write_text('<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"/>')
    run(['mvn', '-o', '-B', '-ntp', '-Dstyle.color=never', '-s', settings, '-gs', settings,
         '-f', HERE/'pom.xml', '-DskipTests', 'package'], owner, budget, timeout=90)
    if not JAR.is_file() or JAR.stat().st_size > 134217728:
        raise LabFailure('Bounded packaged application required')


def unpack(owner):
    destination = owner/'application'; destination.mkdir()
    with zipfile.ZipFile(JAR) as jar:
        files = [entry for entry in jar.infolist() if not entry.is_dir()
                 and (entry.filename.startswith('BOOT-INF/classes/') or entry.filename.startswith('BOOT-INF/lib/'))]
        if len(files) > 3000 or sum(entry.file_size for entry in files) > 201326592:
            raise LabFailure('Application archive expansion limit')
        for entry in files:
            path = Path(entry.filename)
            if path.is_absolute() or '..' in path.parts or (entry.external_attr >> 16) & 0o170000 == 0o120000:
                raise LabFailure('Unsafe application archive entry')
            target = destination/path; target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(jar.read(entry))
    return os.pathsep.join(str(path) for path in [HERE/'target/test-classes', destination/'BOOT-INF/classes',
                                                *sorted((destination/'BOOT-INF/lib').glob('*.jar'))])


def read_report(path):
    if not path.is_file() or path.is_symlink() or path.stat().st_size > 16384:
        raise LabFailure('Bounded owned observation report required')
    with path.open('rb') as source:
        raw = source.read(16385)
    if len(raw) > 16384:
        raise LabFailure('Observation report limit')
    return json.loads(raw)


def http_status(port, path, password=None):
    if not isinstance(port, int) or isinstance(port, bool) or not 1 <= port <= 65535:
        raise LabFailure('Invalid observed loopback port')
    headers = {}
    if password:
        headers['Authorization'] = 'Basic '+base64.b64encode(('alice:'+password).encode()).decode()
    request = urllib.request.Request(f'http://127.0.0.1:{port}'+path, headers=headers)
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs): return None
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect)
    try:
        response = opener.open(request, timeout=2)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        if len(response.read(65537)) > 65536:
            raise LabFailure('HTTP observation body limit')
        return response.status


def require_java17_runtime(value, *, debuggee=False):
    fields = {'feature', 'version', 'vmName'} if debuggee else {'feature', 'version'}
    if (not isinstance(value, dict) or set(value) != fields or type(value.get('feature')) is not int
            or value['feature'] != 17 or not isinstance(value.get('version'), str)
            or not re.fullmatch(r'17(?:[.+-][A-Za-z0-9.+_-]+)?', value['version'])
            or len(value['version']) > 128):
        raise LabFailure('Observed Java17 runtime identity required')
    if debuggee and (not isinstance(value.get('vmName'), str)
                    or not re.fullmatch(r'[A-Za-z0-9 ._()+-]{1,128}', value['vmName'])):
        raise LabFailure('Observed bounded debuggee VM identity required')


def configuration_case(owner, classpath, budget, name, *, production=False, env_override=False, cli_override=False, bad=False):
    root = owner/name; root.mkdir()
    report_path = root/'observation.json'
    env = environment()
    passwords = {key: secrets.token_urlsafe(24) for key in ('ALICE', 'BOB', 'VIEWER')}
    env.update({f'TASK_TRACKER_{key}_PASSWORD': value for key, value in passwords.items()})
    env.update(OWNED_CONFIGURATION_REPORT=str(report_path), TASK_TRACKER_DATABASE_URL='jdbc:h2:file:'+str(root/'database/tasks'))
    if env_override: env['MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE'] = 'health'
    args = ['java', '-Xmx256m', '-XX:ActiveProcessorCount=2', '-XX:TieredStopAtLevel=1', '-cp', classpath,
            'com.csfundamentals.debugging.ConfigurationProbe', '--server.port='+('invalid-port' if bad else '0'),
            '--spring.main.banner-mode=off', '--logging.level.root=ERROR']
    if production: args.append('--spring.profiles.active=production')
    if cli_override: args.append('--'+KEY+'=health,metrics')
    with OwnedProcess(args, root, budget, env=env, timeout=45) as owned:
        while not report_path.exists():
            if owned.pump() is not None:
                raise LabFailure('Application stopped before its observation report')
        observation = read_report(report_path)
        require_java17_runtime(observation.get('runtime'))
        if bad:
            code, _ = owned.finish()
            if (code == 0 or observation.get('state') != 'startup-failed'
                    or observation.get('failedProperty') != 'server.port' or observation.get('failedOrigin') != 'command-line'
                    or not {'BindException', 'NumberFormatException'}.intersection(observation.get('causeTypes', []))):
                raise LabFailure('Actual bad-port startup binding failure not observed')
            return dict(name=name, state='startup-failed', causeTypes=observation['causeTypes'], property='server.port',
                        failedOrigin=observation['failedOrigin'], observedProperty=observation['failedProperty'],
                        invalidValue='invalid-port', repairedBy='memory-repaired', runtime=observation['runtime'], childReaped=True)
        port = observation.get('localPort')
        if observation.get('state') != 'ready' or observation.get('property') != KEY or observation.get('configuredPort') != 0:
            raise LabFailure('Unexpected application observation')
        health = http_status(port, '/actuator/health')
        metrics = http_status(port, '/actuator/metrics', passwords['ALICE'] if production else None)
        expected = 'health,metrics' if production and (not env_override or cli_override) else 'health'
        expected_source = 'command-line' if cli_override else 'environment-variable' if env_override else 'application-production.properties' if production else 'application.properties'
        if observation['effective'] != expected or observation['boundExposure'] != expected.split(',') or observation['orderedCandidates'][0]['source'] != expected_source:
            raise LabFailure('Actual effective value/binder/source precedence differs')
        if health != 200 or metrics != (200 if expected == 'health,metrics' else 404):
            raise LabFailure('Actual HTTP exposure differs from bound configuration')
        expected_repo = 'JpaTaskRepository' if production else 'MemoryTaskRepository'
        if not observation['repositoryClass'].endswith('.'+expected_repo) or observation['cacheManagerCount'] != (1 if production else 0):
            raise LabFailure('Actual profile-selected beans differ')
        if production and not {'production', 'persistence', 'secure', 'cached'}.issubset(observation['activeProfiles']):
            raise LabFailure('Actual profile group expansion differs')
        if not production and (observation['activeProfiles'] or observation['defaultProfiles'] != ['memory']):
            raise LabFailure('Actual default profile differs')
        owned.process.stdin.write(b'q'); owned.process.stdin.flush()
        code, output = owned.finish()
        if code or any(value.encode() in output for value in passwords.values()):
            raise LabFailure('Application did not close cleanly or leaked a generated credential')
        observation.pop('localPort')
        observation.update(name=name, healthStatus=health, metricsStatus=metrics, childReaped=True)
        return observation


def debugger(owner, budget):
    root = owner/'debugger'; root.mkdir(); classes = root/'classes'; classes.mkdir()
    originals = [SOURCES/(name+'.java') for name in ('Task', 'TaskRepository', 'MemoryTaskRepository', 'TaskService')]
    fixtures = [HERE/'fixtures'/name for name in ('TaskServiceDebugTarget.java', 'TaskServiceDebugger.java')]
    run(['javac', '-g', '--release', '17', '--add-modules', 'jdk.jdi', '-d', classes, *originals, *fixtures], root, budget)
    report = root/'debugger.json'
    run(['java', '-Xmx128m', '-XX:ActiveProcessorCount=2', '--add-modules', 'jdk.jdi', '-cp', classes,
         'TaskServiceDebugger', classes, report], root, budget, timeout=40)
    result = read_report(report)
    require_java17_runtime(result.get('runtime'))
    require_java17_runtime(result.get('debuggeeRuntime'), debuggee=True)
    if (result.get('conditionalChecks') != 3 or result.get('conditionalMatches') != 1 or result.get('caughtExceptions') != 1
            or result.get('stepLocations') != ['com.csfundamentals.example.TaskService.create', 'com.csfundamentals.example.MemoryTaskRepository.add']
            or result.get('debuggeeExited') is not True or result.get('guiOrHumanSession') is not False):
        raise LabFailure('Actual debugger evidence incomplete')
    pid = result.pop('debuggeePid')
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        pass
    else:
        raise LabFailure('Owned debuggee still exists')
    result['ownedDebuggeeReaped'] = True
    result['sourceSha256'] = {path.name: sha(path.read_bytes()) for path in originals+fixtures}
    return result


def verify(*, part='all', observe=None):
    if part not in ('all', 'configuration', 'debugger'):
        raise ValueError('Known evidence part required')
    before = snapshot()
    budget = Budget.start(300)
    report = dict(schemaVersion=1, evidence='actual-owned-spring-and-jdi', compilerTargetRelease=17, sourceSha256=before,
                  configurations=[], debugger=None, scope='Java17-targeted TaskTracker sources; actual child runtimes must be observed as Java17; no GUI/human session, production deployment, arbitrary external attach or private configuration inspection.')
    with cancellation_guard(), tempfile.TemporaryDirectory(prefix='owned-backend-debugging-') as directory:
        owner = Path(directory)
        if observe: observe(owner)
        if part in ('all', 'configuration'):
            build(owner, budget)
            classpath = unpack(owner)
            for name, options in [('memory-default', {}), ('production-profile', dict(production=True)),
                                  ('production-environment', dict(production=True, env_override=True)),
                                  ('production-cli', dict(production=True, env_override=True, cli_override=True)),
                                  ('bad-port', dict(bad=True)), ('memory-repaired', {})]:
                report['configurations'].append(configuration_case(owner, classpath, budget, name, **options))
            report['jarSha256'] = sha(JAR.read_bytes())
        if part in ('all', 'debugger'):
            report['debugger'] = debugger(owner, budget)
        if before != snapshot():
            raise LabFailure('Imported TaskTracker source/resources changed')
    report.update(importedSourcesUnchanged=True, ownedWorkspaceRemoved=not owner.exists())
    return report


def publish(report, path):
    path = Path(path).absolute()
    resolved = path.resolve()
    if path.is_symlink() or (resolved.is_relative_to(HERE.parents[1]) and not resolved.is_relative_to(HERE/'target/evidence')):
        raise LabFailure('Unsafe evidence path')
    encoded = (json.dumps(report, indent=2)+'\n').encode()
    if len(encoded) > 65536: raise LabFailure('Evidence report limit')
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix='.debugging-', delete=False) as output:
        pending = Path(output.name)
        try:
            output.write(encoded); output.close(); os.replace(pending, path)
        finally: pending.unlink(missing_ok=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--part', choices=('all', 'configuration', 'debugger'), default='all')
    args = parser.parse_args()
    try:
        result = verify(part=args.part)
        publish(result, HERE/'target/evidence/verification.json')
        print(json.dumps(dict(configurationCases=len(result['configurations']), actualJdi=result['debugger'] is not None,
                              importedSourcesUnchanged=result['importedSourcesUnchanged'], ownedWorkspaceRemoved=result['ownedWorkspaceRemoved'])))
    except LabFailure as error:
        raise SystemExit('Backend debugging failed: '+str(error)+'. See the module README; raw command output is not published.')
    except (OSError, ValueError) as error:
        raise SystemExit('Backend debugging failed ('+type(error).__name__+'); no private config or raw command output is published.')
