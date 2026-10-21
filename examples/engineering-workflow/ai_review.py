#!/usr/bin/env python3
"""Review three identity-pinned teaching patches in a new owned Git/JDK workspace."""
import argparse
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import tempfile
import threading
from commands import Budget, LabFailure, run
from maven_probe import exercise as maven_exercise

HERE = Path(__file__).resolve().parent
FIXTURES = HERE/'fixtures'
REVIEW = FIXTURES/'ai-review'
TARGET = 'TicketRouter.java'
BASE_PIN = 'c2c9747cc57687f2a06bee1977cb39c221730321650cbabaa6e143ad985db8c1'
REGRESSION_PIN = 'b69261f7fbb56ff78dc98d66a5786efe43e6957e9bea8dee4845b986c4481456'
PATCH_PINS = {
    'invented-api': '5cbaeb13175d2575ad72f35391ad8f1725de9f017b877ddefea5327417232ab4',
    'wrong-precedence': 'a10fdf0800e69651b862cdb049c2cef7e3ccb7f80d37d1df09be7f4ad0c5cf1f',
    'locale-repair': '178f4cee137f404e18c48d342beb350a0c382e14da4e66a0b0e5ff9f08c59d1b',
}
PROTECTED = ('RouterContract.java', 'routing-golden.tsv', 'LocaleRoutingRegression.java')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def fixed_bytes(path, limit=16384):
    if path.is_symlink() or not path.is_file():
        raise LabFailure('Expected regular checked-in fixture')
    with path.open('rb') as source:
        raw = source.read(limit+1)
    if len(raw) > limit or b'\0' in raw:
        raise LabFailure('Fixture byte limit or NUL rejected')
    normalized = raw.replace(b'\r\n', b'\n')
    normalized.decode('utf-8', errors='strict')
    if b'\r' in normalized:
        raise LabFailure('Bare carriage return rejected')
    return normalized


def validate_patch(raw):
    """Accept one ordinary text diff only; this is a path guard, never a Java sandbox."""
    if not isinstance(raw, bytes) or not 1 <= len(raw) <= 16384 or b'\0' in raw or b'\r' in raw:
        raise LabFailure('Patch framing rejected')
    lines = raw.decode('utf-8', errors='strict').splitlines()
    if len(lines) > 160 or lines[:2] != ['--- a/'+TARGET, '+++ b/'+TARGET]:
        raise LabFailure('Only the owned routing source is an allowed patch target')
    index, hunks = 2, 0
    while index < len(lines):
        match = re.fullmatch(r'@@ -([0-9]+)(?:,([0-9]+))? \+([0-9]+)(?:,([0-9]+))? @@(?: [^\r\n]*)?', lines[index])
        if match is None:
            raise LabFailure('Extra file, Git metadata or invalid hunk rejected')
        old_count, new_count = int(match[2] or 1), int(match[4] or 1)
        if max(int(match[1]), int(match[3]), old_count, new_count) > 200:
            raise LabFailure('Patch hunk limit')
        index += 1; hunks += 1
        old_seen = new_seen = 0
        while old_seen < old_count or new_seen < new_count:
            if index >= len(lines) or not lines[index] or lines[index][0] not in ' +-':
                raise LabFailure('Invalid patch body')
            prefix = lines[index][0]
            old_seen += prefix in ' -'; new_seen += prefix in ' +'; index += 1
            if old_seen > old_count or new_seen > new_count:
                raise LabFailure('Patch counts do not match its body')
        if hunks > 4:
            raise LabFailure('Patch hunk limit')
    if not hunks:
        raise LabFailure('A patch must contain a change')
    return dict(target=TARGET, hunks=hunks, sha256=sha(raw))


def reviewed_patch(name):
    if name not in PATCH_PINS:
        raise LabFailure('Unknown reviewed teaching patch')
    raw = fixed_bytes(REVIEW/(name+'.patch'))
    if sha(raw) != PATCH_PINS[name]:
        raise LabFailure('Reviewed patch identity mismatch; arbitrary generated code is not executable input')
    validate_patch(raw)
    return raw


def protected_identity(repo):
    return {name: sha(fixed_bytes(repo/name)) for name in PROTECTED}


def require_owned(repo, owner):
    if (repo != owner/'repo' or owner.is_symlink() or repo.is_symlink()
            or not repo.resolve().is_relative_to(owner.resolve())):
        raise LabFailure('Git operation outside the owned repository rejected')


def git(repo, owner, budget, *args, check=True):
    require_owned(repo, owner)
    return run(['git', '-C', repo, *args], owner, budget, check=check, output_limit=32768)


def apply_reviewed(repo, owner, name, budget):
    require_owned(repo, owner)
    raw = reviewed_patch(name)
    if (repo/TARGET).is_symlink():
        raise LabFailure('Symlink routing target rejected')
    before = protected_identity(repo)
    patch = owner/'reviewed.patch'; patch.write_bytes(raw)
    git(repo, owner, budget, 'apply', '--check', '--whitespace=error-all', str(patch))
    git(repo, owner, budget, 'apply', '--whitespace=error-all', str(patch))
    _, changed = git(repo, owner, budget, 'diff', '--name-only', '--no-ext-diff', '--no-textconv')
    if changed.splitlines() != [TARGET] or before != protected_identity(repo):
        raise LabFailure('Patch changed protected files or exceeded its declared scope')
    git(repo, owner, budget, 'diff', '--check')
    _, diff = git(repo, owner, budget, 'diff', '--no-ext-diff', '--no-textconv', '--', TARGET)
    _, numstat = git(repo, owner, budget, 'diff', '--numstat', '--', TARGET)
    added, removed, path = numstat.strip().split('\t')
    if path != TARGET:
        raise LabFailure('Unexpected diff target')
    return dict(changedPaths=[TARGET], linesAdded=int(added), linesRemoved=int(removed),
                patchLfSha256=sha(raw), gitDiffLfSha256=sha(diff.encode()),
                protectedTestsUnchanged=before == protected_identity(repo), whitespaceCheckPassed=True)


def compile_and_check(repo, owner, budget, name):
    classes = owner/('classes-'+name); classes.mkdir()
    code, diagnostic = run(['javac', '--release', '17', '-classpath', classes, '-d', classes,
                            repo/TARGET, repo/'RouterContract.java', repo/'LocaleRoutingRegression.java'],
                           owner, budget, check=False, output_limit=32768)
    result = dict(compiled=code == 0, compilerExit=code, diagnosticSha256=sha(diagnostic.encode()))
    if code:
        result['failureKind'] = 'compile-error'
        result['inventedApiNamedInDiagnostic'] = 'toUpperCaseInvariant' in diagnostic
        return result
    base = ['java', '-Xmx64m', '-XX:ActiveProcessorCount=2', '-cp', classes]
    code, output = run(base+['-Duser.language=en', '-Duser.country=US', 'RouterContract', repo/'routing-golden.tsv'],
                       owner, budget, check=False, output_limit=16384)
    locale_code, locale_output = run(base+['-Duser.language=tr', '-Duser.country=TR', 'LocaleRoutingRegression'],
                                     owner, budget, check=False, output_limit=16384)
    result.update(goldenPassed=code == 0, localePassed=locale_code == 0,
                  goldenTraceSha256=sha(output.encode()), localeTraceSha256=sha(locale_output.encode()),
                  goldenCases=17 if code == 0 and 'GOLDEN_CASES=17' in output else 0,
                  localeCases=3 if locale_code == 0 and 'LOCALE_CASES=3' in locale_output else 0,
                  goldenFailureCase='enterprise-urgent' if 'enterprise-urgent: expected INCIDENT_QUEUE, got ENTERPRISE_QUEUE' in output else None,
                  localeFailureCase='turkish-enterprise-normal' if 'turkish-enterprise-normal: expected ENTERPRISE_QUEUE, got INVALID' in locale_output else None)
    if code == 0 and locale_code == 0:
        _, dependencies = run(['jdeps', '--multi-release', '17', '-s', '--recursive', classes], owner, budget,
                              output_limit=16384)
        modules = sorted(set(re.findall(r' -> (java\.[a-z.]+)\s*$', dependencies, re.M)))
        if modules != ['java.base'] or 'not found' in dependencies:
            raise LabFailure('Unexpected runtime module dependency')
        result['actualJdepsModules'] = modules
    return result


class ReviewCancelled(LabFailure):
    pass


@contextmanager
def cancellation_guard():
    if threading.current_thread() is not threading.main_thread():
        yield; return
    previous = signal.getsignal(signal.SIGTERM)
    def cancel(_number, _frame):
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        raise ReviewCancelled('Owned review cancelled')
    signal.signal(signal.SIGTERM, cancel)
    try:
        yield
    finally:
        signal.signal(signal.SIGTERM, previous)


def run_lab(*, observe=None, seconds=180):
    for executable in ('git', 'javac', 'java', 'jdeps', 'mvn'):
        if not shutil.which(executable):
            raise LabFailure('Required installed tool unavailable: '+executable)
    budget = Budget.start(seconds)
    canonical = fixed_bytes(FIXTURES/'TicketRouterAfter.java')
    regression = fixed_bytes(REVIEW/'LocaleRoutingRegression.java')
    if sha(canonical) != BASE_PIN or sha(regression) != REGRESSION_PIN:
        raise LabFailure('Reviewed source or independent regression identity mismatch')
    patches = {name: reviewed_patch(name) for name in PATCH_PINS}
    sources = {TARGET: canonical, 'RouterContract.java': fixed_bytes(FIXTURES/'RouterContract.java'),
               'routing-golden.tsv': fixed_bytes(FIXTURES/'routing-golden.tsv'), 'LocaleRoutingRegression.java': regression}
    original_hashes = {name: sha(raw) for name, raw in sources.items()}
    if len(sources['routing-golden.tsv'].decode().splitlines()) != 18:
        raise LabFailure('Expected the original seventeen independent golden cases')
    with cancellation_guard(), tempfile.TemporaryDirectory(prefix='owned-ai-review-') as temporary:
        owner = Path(temporary); repo = owner/'repo'; repo.mkdir(); hooks = owner/'hooks'; hooks.mkdir()
        if observe: observe('workspace', owner)
        _, compiler = run(['javac', '--version'], owner, budget)
        if not re.search(r'javac (?:1[7-9]|[2-9][0-9])(?:\.|\s|$)', compiler):
            raise LabFailure('Installed JDK must support --release 17')
        git(repo, owner, budget, 'init', '--initial-branch=main', '--template', str(hooks))
        for key, value in (('user.name', 'AI Review Fixture'), ('user.email', 'ai-review@example.invalid'),
                           ('core.hooksPath', str(hooks)), ('commit.gpgsign', 'false'), ('core.autocrlf', 'false'), ('core.fsmonitor', 'false')):
            git(repo, owner, budget, 'config', '--local', key, value)
        seed = canonical.replace(b'toUpperCase(Locale.ROOT)', b'toUpperCase(Locale.getDefault())')
        if seed == canonical:
            raise LabFailure('The synthetic locale seed did not change its reviewed source')
        for name, raw in sources.items():
            (repo/name).write_bytes(seed if name == TARGET else raw)
            if name in PROTECTED: (repo/name).chmod(0o444)
        git(repo, owner, budget, 'add', '--', TARGET, *PROTECTED)
        git(repo, owner, budget, 'commit', '-m', 'Seed isolated locale regression and independent contracts')
        _, initial_head = git(repo, owner, budget, 'rev-parse', 'HEAD')
        _, tracked = git(repo, owner, budget, 'ls-files')
        _, symbol = git(repo, owner, budget, 'grep', '-n', '-F', 'toUpperCase(Locale.getDefault())', '--', TARGET)
        protected = protected_identity(repo)
        baseline = compile_and_check(repo, owner, budget, 'baseline')
        if not baseline['compiled'] or not baseline['goldenPassed'] or baseline['localePassed']:
            raise LabFailure('Seeded locale bug did not reproduce independently')
        results = {}
        for name in patches:
            git(repo, owner, budget, 'restore', '--source=HEAD', '--', TARGET)
            diff = apply_reviewed(repo, owner, name, budget)
            if observe: observe('candidate_applied', name)
            if protected != protected_identity(repo):
                raise LabFailure('Independent tests changed before candidate execution')
            result = compile_and_check(repo, owner, budget, name)
            result['review'] = diff
            results[name] = result
        invalid, wrong, correct = [results[name] for name in PATCH_PINS]
        if invalid['compiled'] or not invalid['inventedApiNamedInDiagnostic']:
            raise LabFailure('Invented API was not rejected by actual Java compilation')
        if not wrong['compiled'] or wrong['goldenPassed'] or wrong['goldenFailureCase'] != 'enterprise-urgent':
            raise LabFailure('Compiling behavioral regression was not caught by the independent contract')
        if not correct['compiled'] or not correct['goldenPassed'] or not correct['localePassed']:
            raise LabFailure('Reviewed locale repair did not preserve all exercised outcomes')
        if protected != protected_identity(repo) or fixed_bytes(repo/TARGET) != canonical:
            raise LabFailure('Final diff changed a protected contract or differs from the reviewed repair')
        _, final_head = git(repo, owner, budget, 'rev-parse', 'HEAD')
        maven = maven_exercise(owner/'maven', budget)
        report = dict(schemaVersion=1, evidence='reviewed-ai-authored-teaching-fixtures',
                      compiler=compiler.strip(), javaRelease=17, sourceLfSha256=original_hashes,
                      seededSourceLfSha256=sha(seed), baseline=baseline, candidates=results,
                      investigation=dict(trackedPaths=tracked.splitlines(), normalizationSymbolLocated=bool(symbol.strip()),
                                         ownedHistoryUnchanged=initial_head == final_head),
                      protectedTestsUnchanged=protected == protected_identity(repo), actualOfflineMaven=maven,
                      selectedPatch='locale-repair', modelCalls=0, networkCalls=0,
                      callCountScope='Known fixture execution intent; no model/network client invoked and Maven is offline. Not OS-level monitoring or binary attestation.',
                      limits=dict(executionSeconds=seconds, commandOutputBytes=131072, commandCleanupSeconds=1,
                                  acceptedPatchBytes=16384, acceptedTargets=[TARGET]),
                      scope='Actual synthetic Git/JDK/Maven experiment, not a live coding-provider run, learner participation, OS sandbox, production incident, security audit or universal equivalence proof.')
    report['ownedWorkspaceRemoved'] = not owner.exists()
    return report


def publish(report, destination):
    path = Path(destination).absolute()
    if path.is_symlink() or path.resolve().is_relative_to(HERE.parents[1]):
        raise LabFailure('Report must be outside this source repository and must not be a symlink')
    encoded = (json.dumps(report, indent=2, ensure_ascii=True)+'\n').encode()
    if len(encoded) > 65536:
        raise LabFailure('Report byte limit')
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix='.owned-ai-review-', delete=False) as output:
        pending = Path(output.name)
        try:
            output.write(encoded); output.close(); os.replace(pending, path)
        finally:
            pending.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    try:
        report = run_lab()
        if args.report: publish(report, args.report)
        print(json.dumps(dict(selectedPatch=report['selectedPatch'], modelCalls=0,
                              goldenCases=report['candidates']['locale-repair']['goldenCases'],
                              localeCases=report['candidates']['locale-repair']['localeCases'],
                              protectedTestsUnchanged=report['protectedTestsUnchanged'],
                              ownedWorkspaceRemoved=report['ownedWorkspaceRemoved'])))
    except (LabFailure, OSError) as error:
        raise SystemExit('Owned AI review failed ('+type(error).__name__+'); no patch was applied to the source repository.')


if __name__ == '__main__':
    main()
