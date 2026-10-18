#!/usr/bin/env python3
"""Owned Git/Java/Linux/Maven investigation. No user repository or remote is modified."""
from pathlib import Path
import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import tempfile
import xml.etree.ElementTree as ET
from commands import Budget, LabFailure, run
from behavior_check import check
from linux_probe import exercise as linux_exercise
from maven_probe import exercise as maven_exercise

HERE = Path(__file__).resolve().parent
FIXTURES = HERE / 'fixtures'


def git_exercise(workspace, budget):
    repo = workspace / 'history'; repo.mkdir()
    hooks = workspace / 'empty-hooks'; hooks.mkdir()
    builds = workspace / 'builds'; builds.mkdir()

    def git(*arguments, check_result=True, timeout=15):
        if not repo.resolve().is_relative_to(workspace.resolve()):
            raise LabFailure('Refusing Git outside the owned workspace')
        return run(['git', '-C', repo, *arguments], workspace, budget, check=check_result, timeout=timeout)

    git('init', '--initial-branch=main', '--template', hooks)
    for key, value in [('user.name', 'Engineering Workflow Lab'), ('user.email', 'workflow@example.invalid'), ('commit.gpgsign', 'false'), ('tag.gpgsign', 'false'), ('core.hooksPath', str(hooks)), ('core.autocrlf', 'false')]:
        git('config', '--local', key, value)
    source = repo / 'TicketRouter.java'
    before = (FIXTURES / 'TicketRouterBefore.java').read_text()
    source.write_text(before)
    commits = []

    def commit(message):
        git('add', '--all'); git('commit', '-m', message)
        _, head = git('rev-parse', 'HEAD'); commits.append(head.strip()); return head.strip()

    first_good = commit('feat: establish ticket routing business contract')
    (repo / 'README.md').write_text('Security overrides urgency; urgency overrides enterprise tier.\n')
    commit('docs: explain routing precedence')
    (repo / 'OPERATIONS.md').write_text('Observe queue choice without logging ticket payloads.\n')
    commit('docs: describe safe operational observation')
    bad = before.replace('if (p.equals("URGENT")) { d = "INCIDENT_QUEUE"; }', 'if (t.equals("ENTERPRISE")) { d = "ENTERPRISE_QUEUE"; }').replace('if (t.equals("ENTERPRISE")) { d = "ENTERPRISE_QUEUE"; }\n                else', 'if (p.equals("URGENT")) { d = "INCIDENT_QUEUE"; }\n                else')
    if bad == before:
        raise LabFailure('Regression fixture did not change')
    source.write_text(bad); seeded = commit('feat: prioritize enterprise customers')
    for number in range(3):
        (repo / f'release-note-{number}.md').write_text(f'Independent release note {number}; routing contract remains unchanged.\n')
        commit(f'docs: add independent release note {number}')
    bad_head = commits[-1]
    bad_code, bad_evidence = check(repo, builds, budget)
    if bad_code != 1 or not bad_evidence['compiled'] or 'enterprise-urgent: expected INCIDENT_QUEUE, got ENTERPRISE_QUEUE' not in bad_evidence['behavior']:
        raise LabFailure('Seeded regression does not violate the independent Java contract as intended')
    history = workspace / 'bisect-checks.jsonl'
    git('bisect', 'start', bad_head, first_good)
    try:
        git('bisect', 'run', sys.executable, str(HERE / 'behavior_check.py'), '--repo', repo, '--builds', builds, '--history', history, timeout=90)
        _, identified = git('rev-parse', 'refs/bisect/bad'); identified = identified.strip()
        _, last_tested = git('rev-parse', 'HEAD')
        _, bisect_log = git('bisect', 'log')
    finally:
        git('bisect', 'reset')
    if identified != seeded:
        raise LabFailure('Bisect did not identify the known unique behavioral regression')
    checks = [json.loads(line) for line in history.read_text().splitlines()]
    git('revert', '--no-edit', identified)
    _, revert_head = git('rev-parse', 'HEAD'); _, revert_parent = git('rev-parse', 'HEAD^')
    restored_code, restored = check(repo, builds, budget)
    if restored_code or revert_parent.strip() != bad_head:
        raise LabFailure('Safe revert failed to append a passing repair commit')
    source.write_text((FIXTURES / 'TicketRouterAfter.java').read_text())
    refactor_code, refactor = check(repo, builds, budget)
    if refactor_code or restored['behavior'] != refactor['behavior']:
        raise LabFailure('Refactor changed the exercised business contract')
    refactor_head = commit('refactor: make ticket routing priority explicit')
    _, status = git('status', '--porcelain')
    if status or not all((repo / f'release-note-{i}.md').exists() for i in range(3)):
        raise LabFailure('Owned history is dirty or later independent changes were lost')
    return {'seeded_culprit': seeded, 'identified_culprit': identified, 'bisect_checks': checks, 'bisect_log': bisect_log, 'last_tested_revision': last_tested.strip(),
            'failing_behavior': bad_evidence['behavior'], 'revert_commit': revert_head.strip(), 'revert_parent_was_bad_head': True,
            'later_changes_preserved': True, 'refactor_commit': refactor_head,
            'golden_cases': int(re.search(r'GOLDEN_CASES=([0-9]+)', refactor['behavior']).group(1)), 'behavior_before_after_identical': restored['behavior'] == refactor['behavior'],
            'golden_trace_sha256': hashlib.sha256(refactor['behavior'].encode()).hexdigest(),
            'golden_input_sha256': hashlib.sha256((FIXTURES / 'routing-golden.tsv').read_bytes()).hexdigest()}


def source_pointers():
    repository = HERE.parents[1]
    tracker = repository / 'examples/java-spring/task-tracker'
    model = tracker / 'pom.xml'
    root = ET.fromstring(model.read_bytes())
    ns = {'m': 'http://maven.apache.org/POM/4.0.0'}
    parent = root.find('m:parent/m:version', ns)
    paths = [model, *sorted((tracker / 'src/main/resources').glob('application*.properties'))]
    return {'task_tracker_parent_version': parent.text, 'files': [{'path': str(p.relative_to(repository)), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths],
            'scope': 'Read-only source pointers; Spring runtime precedence, IDE stepping and vulnerability review remain explicit manual tasks'}


def run_lab(*, observe=None, _fail_stage=None, seconds=180):
    if sys.platform != 'linux' or not Path('/proc/self/status').exists():
        raise LabFailure('This executable investigation requires Linux /proc (including WSL)')
    for executable in ['git', 'javac', 'java', 'mvn']:
        if not shutil.which(executable):
            raise LabFailure(f'Required installed executable unavailable: {executable}')
    budget = Budget.start(seconds)
    with tempfile.TemporaryDirectory(prefix='cs-engineering-') as directory:
        workspace = Path(directory)
        if observe:
            observe('workspace', workspace)
        _, java = run(['javac', '--version'], workspace, budget)
        compiler = re.search(r'javac ([0-9]+)', java)
        if compiler is None or int(compiler.group(1)) < 17:
            raise LabFailure('JDK 17 or later with --release 17 support is required')
        linux = linux_exercise(workspace / 'linux', budget, fail_live=_fail_stage == 'linux-live', observe=observe)
        git = git_exercise(workspace, budget)
        maven = maven_exercise(workspace / 'maven', budget)
        report = {'version': 1, 'java_compiler': java.strip(), 'java_release': 17, 'linux': linux, 'git': git, 'maven': maven, 'source_review': source_pointers(),
                  'scope': 'Synthetic local execution; not manual IDE/real unfamiliar-repository or security/production evidence'}
    report['owned_workspace_removed'] = not workspace.exists()
    return report


def publish(report, destination):
    destination = destination.resolve()
    with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=destination.parent, prefix='.engineering-report-', delete=False) as pending:
        path = Path(pending.name); json.dump(report, pending, indent=2); pending.write('\n')
    try:
        os.replace(path, destination)
    finally:
        path.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    report = run_lab()
    if args.report:
        publish(report, args.report)
    print(json.dumps({'culprit_identified': report['git']['identified_culprit'] == report['git']['seeded_culprit'],
                      'revert_appended': report['git']['revert_parent_was_bad_head'], 'golden_cases': report['git']['golden_cases'],
                      'refactor_behavior_preserved': report['git']['behavior_before_after_identical'],
                      'maven_loaded_versions': [report['maven']['nearest_equal_depth']['LOADED_CODEC'], report['maven']['dependency_management']['LOADED_CODEC']],
                      'owned_child_exited': report['linux']['owned_child_exited'], 'owned_workspace_removed': report['owned_workspace_removed']}))


if __name__ == '__main__':
    main()
