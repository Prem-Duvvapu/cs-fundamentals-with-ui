import contextlib
import json
import os
from pathlib import Path
import signal
import subprocess
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
from ai_review import (HERE, REVIEW, PATCH_PINS, TARGET, LabFailure, ReviewCancelled,
                       apply_reviewed, cancellation_guard, fixed_bytes, publish,
                       reviewed_patch, run_lab, sha, validate_patch)
from commands import Budget, environment, run


@contextlib.contextmanager
def directory(path):
    previous = Path.cwd()
    try:
        os.chdir(path); yield
    finally:
        os.chdir(previous)


class AiReviewTests(unittest.TestCase):
    def test_real_compiler_business_regression_review_and_offline_dependency_evidence(self):
        observed = {}
        sources = [HERE/'fixtures'/name for name in ('TicketRouterAfter.java', 'RouterContract.java', 'routing-golden.tsv')]
        sources += list(REVIEW.iterdir())
        before = {str(path): path.read_bytes() for path in sources if path.is_file()}
        with tempfile.TemporaryDirectory(prefix='owned-ai-review-guard-') as temporary:
            guard = Path(temporary)
            def git(*arguments):
                return subprocess.check_output(['git', '-C', str(guard), *arguments], env=environment(), stderr=subprocess.DEVNULL).decode().strip()
            git('init', '-b', 'main'); git('config', 'user.name', 'Independent Guard'); git('config', 'user.email', 'guard@example.invalid')
            marker = guard/'keep.txt'; marker.write_text('Unrelated user work must survive.\n')
            git('add', 'keep.txt'); git('-c', 'commit.gpgsign=false', 'commit', '-m', 'independent work')
            head, config = git('rev-parse', 'HEAD'), (guard/'.git/config').read_bytes()
            with patch.dict(os.environ, GIT_DIR=str(guard/'.git'), GIT_WORK_TREE=str(guard),
                            JAVA_TOOL_OPTIONS='-Dmust.not.be.inherited=secret-fixture-marker'), directory(guard):
                report = run_lab(observe=lambda key, value: observed.__setitem__(key, value))
            self.assertEqual(head, git('rev-parse', 'HEAD')); self.assertEqual(config, (guard/'.git/config').read_bytes())
            self.assertEqual('', git('status', '--porcelain')); self.assertEqual('Unrelated user work must survive.\n', marker.read_text())
            output = guard/'report.json'; publish(report, output)
            self.assertEqual(report, json.loads(output.read_text()))
        baseline = report['baseline']
        self.assertTrue(baseline['compiled']); self.assertTrue(baseline['goldenPassed']); self.assertFalse(baseline['localePassed'])
        self.assertEqual('turkish-enterprise-normal', baseline['localeFailureCase'])
        invented, wrong, correct = [report['candidates'][name] for name in PATCH_PINS]
        self.assertFalse(invented['compiled']); self.assertTrue(invented['inventedApiNamedInDiagnostic'])
        self.assertTrue(wrong['compiled']); self.assertFalse(wrong['goldenPassed']); self.assertEqual('enterprise-urgent', wrong['goldenFailureCase'])
        self.assertTrue(correct['goldenPassed']); self.assertTrue(correct['localePassed'])
        self.assertEqual((17, 3), (correct['goldenCases'], correct['localeCases']))
        self.assertEqual(['java.base'], correct['actualJdepsModules'])
        self.assertEqual((1, 1), (correct['review']['linesAdded'], correct['review']['linesRemoved']))
        self.assertTrue(all(result['review']['protectedTestsUnchanged'] for result in report['candidates'].values()))
        self.assertTrue(report['protectedTestsUnchanged']); self.assertTrue(report['investigation']['ownedHistoryUnchanged'])
        self.assertTrue(report['investigation']['normalizationSymbolLocated'])
        self.assertEqual('locale-repair', report['selectedPatch']); self.assertEqual(0, report['modelCalls'])
        self.assertEqual('1.0', report['actualOfflineMaven']['nearest_equal_depth']['LOADED_CODEC'])
        self.assertEqual('2.0', report['actualOfflineMaven']['dependency_management']['LOADED_CODEC'])
        self.assertTrue(report['actualOfflineMaven']['offline'])
        self.assertTrue(report['ownedWorkspaceRemoved']); self.assertFalse(observed['workspace'].exists())
        self.assertEqual(before, {name: Path(name).read_bytes() for name in before})
        encoded = json.dumps(report)
        for private in (str(observed['workspace']), 'secret-fixture-marker', 'Unrelated user work must survive.'):
            self.assertNotIn(private, encoded)

    def test_patch_path_metadata_hunk_and_binary_attacks_are_rejected_without_execution(self):
        safe = reviewed_patch('locale-repair')
        self.assertEqual(TARGET, validate_patch(safe)['target'])
        variants = [safe.replace(b'a/TicketRouter.java', replacement) for replacement in
                    (b'a/../RouterContract.java', b'/etc/passwd', b'a/.git/config', b'a/RouterContract.java', b'/dev/null')]
        variants += [safe.replace(b'b/TicketRouter.java', b'b/routing-golden.tsv'),
                     safe+b'--- a/RouterContract.java\n+++ b/RouterContract.java\n@@ -1 +1 @@\n-old\n+new\n',
                     b'diff --git a/TicketRouter.java b/TicketRouter.java\nold mode 100644\nnew mode 100755\n'+safe,
                     safe+b'GIT binary patch\nliteral 10\n', safe+b'\0', safe.replace(b'@@ -', b'@@ -999999', 1),
                     safe.replace(b'+        return ', b'+        return ', 1)+b'\r', b'x'*16385]
        for candidate in variants:
            with self.subTest(sha=sha(candidate)):
                with self.assertRaises((LabFailure, UnicodeError)):
                    validate_patch(candidate)

    def test_allowlisted_filename_is_not_an_execution_sandbox_and_changed_code_is_refused(self):
        safe = reviewed_patch('locale-repair')
        altered = safe.replace(b'+        return input.trim().toUpperCase(Locale.ROOT);',
                               b'+        Runtime.getRuntime().halt(71); return input;')
        self.assertNotEqual(safe, altered)
        self.assertEqual(TARGET, validate_patch(altered)['target'])
        observed = []
        with tempfile.TemporaryDirectory(prefix='owned-untrusted-ai-fixture-') as temporary:
            fixtures = Path(temporary)
            for name in PATCH_PINS:
                (fixtures/(name+'.patch')).write_bytes(altered if name == 'locale-repair' else reviewed_patch(name))
            (fixtures/'LocaleRoutingRegression.java').write_bytes(fixed_bytes(REVIEW/'LocaleRoutingRegression.java'))
            with patch('ai_review.REVIEW', fixtures):
                with self.assertRaisesRegex(LabFailure, 'Reviewed patch identity mismatch'):
                    run_lab(observe=lambda *args: observed.append(args))
        self.assertEqual([], observed, 'An identity-mismatched patch must fail before the executable workspace exists.')

    def test_crlf_checkout_keeps_reviewed_patch_and_regression_identity(self):
        with tempfile.TemporaryDirectory(prefix='owned-crlf-ai-review-') as temporary:
            fixtures = Path(temporary)
            expected = {name: reviewed_patch(name) for name in PATCH_PINS}
            for name, raw in expected.items():
                (fixtures/(name+'.patch')).write_bytes(raw.replace(b'\n', b'\r\n'))
            regression = fixed_bytes(REVIEW/'LocaleRoutingRegression.java')
            (fixtures/'LocaleRoutingRegression.java').write_bytes(regression.replace(b'\n', b'\r\n'))
            with patch('ai_review.REVIEW', fixtures):
                for name, raw in expected.items():
                    self.assertEqual(raw, reviewed_patch(name))
                self.assertEqual(regression, fixed_bytes(fixtures/'LocaleRoutingRegression.java'))

    def test_outside_repository_and_symlink_target_are_rejected_before_git_apply(self):
        with tempfile.TemporaryDirectory(prefix='owned-scope-ai-review-') as temporary:
            root = Path(temporary); owner = root/'owner'; owner.mkdir(); repo = owner/'repo'; repo.mkdir()
            foreign = root/'foreign'; foreign.mkdir(); marker = foreign/'user.java'; marker.write_text('preserve unrelated work\n')
            with self.assertRaisesRegex(LabFailure, 'outside the owned repository'):
                apply_reviewed(foreign, owner, 'locale-repair', Budget.start(5))
            (repo/TARGET).symlink_to(marker)
            with self.assertRaisesRegex(LabFailure, 'Symlink routing target'):
                apply_reviewed(repo, owner, 'locale-repair', Budget.start(5))
            self.assertEqual('preserve unrelated work\n', marker.read_text())

    def test_failure_after_reviewed_patch_application_removes_workspace_and_preserves_fixtures(self):
        observed = {}
        raw = fixed_bytes(HERE/'fixtures'/'TicketRouterAfter.java')
        def observe(key, value):
            if key == 'workspace': observed[key] = value
            if key == 'candidate_applied' and value == 'wrong-precedence':
                raise LabFailure('Injected owned review failure')
        with self.assertRaisesRegex(LabFailure, 'Injected owned review failure'):
            run_lab(observe=observe)
        self.assertFalse(observed['workspace'].exists())
        self.assertEqual(raw, fixed_bytes(HERE/'fixtures'/'TicketRouterAfter.java'))

    def test_independent_test_mutation_is_detected_before_candidate_compilation(self):
        observed = {}
        source = fixed_bytes(HERE/'fixtures'/'RouterContract.java')
        def observe(key, value):
            if key == 'workspace': observed[key] = value
            if key == 'candidate_applied':
                owned_test = observed['workspace']/'repo'/'RouterContract.java'
                owned_test.chmod(0o600); owned_test.write_text('public final class RouterContract {}\n')
        with self.assertRaisesRegex(LabFailure, 'Independent tests changed before candidate execution'):
            run_lab(observe=observe)
        self.assertFalse(observed['workspace'].exists())
        self.assertEqual(source, fixed_bytes(HERE/'fixtures'/'RouterContract.java'))

    def test_report_refuses_source_overwrite_symlink_and_unbounded_content(self):
        with tempfile.TemporaryDirectory(prefix='owned-ai-report-') as temporary:
            root = Path(temporary); target = root/'target'; target.write_text('preserve')
            link = root/'link'; link.symlink_to(target)
            for path, report in ((link, {}), (HERE/'ai_review.py', {}), (root/'large.json', dict(raw='x'*65536))):
                with self.assertRaises(LabFailure): publish(report, path)
            self.assertEqual('preserve', target.read_text())

    @unittest.skipUnless(hasattr(signal, 'pthread_sigmask') and hasattr(signal, 'pthread_kill'), 'POSIX thread signals required')
    def test_real_popen_boundary_defers_term_and_int_including_delivery_to_another_thread(self):
        signals = (signal.SIGTERM, signal.SIGINT)
        previous = {number: signal.getsignal(number) for number in signals}
        previous_mask = signal.pthread_sigmask(signal.SIG_BLOCK, set())
        actual_popen = subprocess.Popen
        def caller_handler(_number, _frame):
            raise AssertionError('Caller handler must be restored, not invoked inside the owned guard.')
        try:
            for number in signals:
                signal.signal(number, caller_handler)
            for number in signals:
                for other_thread in (False, True):
                    with self.subTest(signal=number.name, other_thread=other_thread):
                        owned, returned = [], []
                        ready, finish = threading.Event(), threading.Event()
                        def live_thread():
                            signal.pthread_sigmask(signal.SIG_UNBLOCK, set(signals))
                            ready.set()
                            finish.wait(8)
                        caller_mask = (previous_mask | {signal.SIGUSR1}) - set(signals)
                        if other_thread:
                            caller_mask.add(number)  # Main-thread masking alone cannot solve this case.
                        signal.pthread_sigmask(signal.SIG_SETMASK, caller_mask)
                        thread = threading.Thread(target=live_thread, daemon=True)
                        thread.start()
                        self.assertTrue(ready.wait(1))
                        def cancel_before_return(*args, **kwargs):
                            process = actual_popen(*args, **kwargs)
                            owned.append(process)
                            delivered = []
                            installed_handler = signal.getsignal(number)
                            def observe_delivery(signum, frame):
                                delivered.append(signum)
                                installed_handler(signum, frame)
                            signal.signal(number, observe_delivery)
                            if other_thread:
                                signal.pthread_kill(thread.ident, number)
                                time.sleep(.03)  # Execute the Python handler before returning Popen's result.
                            else:
                                os.kill(os.getpid(), number)
                            self.assertEqual([number], delivered, 'Handler must run inside the real Popen boundary.')
                            returned.append(True)
                            return process
                        try:
                            with self.assertRaises(ReviewCancelled):
                                with cancellation_guard(), patch.object(subprocess, 'Popen', cancel_before_return):
                                    run([os.sys.executable, '-c', 'import threading; threading.Event().wait()'], HERE, Budget.start(5))
                            self.assertEqual([True], returned, 'Cancellation must wait until process ownership is assigned.')
                            self.assertEqual(1, len(owned))
                            self.assertIsNotNone(owned[0].returncode, 'Owned process must already be waited/reaped.')
                            self.assertIsNotNone(owned[0].poll())
                            with self.assertRaises(ProcessLookupError):
                                os.kill(owned[0].pid, 0)
                            self.assertTrue(owned[0].stdout.closed)
                            self.assertEqual(caller_mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
                            for value in signals:
                                self.assertIs(caller_handler, signal.getsignal(value))
                        finally:
                            finish.set(); thread.join(timeout=1)
                            self.assertFalse(thread.is_alive())
                            for process in owned:
                                if process.poll() is None:
                                    os.killpg(process.pid, signal.SIGKILL)
                                process.wait(timeout=2)
                                process.stdout.close()
        finally:
            for number, handler in previous.items():
                signal.signal(number, handler)
            signal.pthread_sigmask(signal.SIG_SETMASK, previous_mask)

    @unittest.skipUnless(hasattr(signal, 'pthread_sigmask'), 'POSIX thread signals required')
    def test_guard_restores_both_handlers_and_mask_on_success_and_spawn_failure(self):
        signals = (signal.SIGTERM, signal.SIGINT)
        previous = {number: signal.getsignal(number) for number in signals}
        previous_mask = signal.pthread_sigmask(signal.SIG_BLOCK, set())
        def caller_handler(_number, _frame):
            pass
        try:
            expected_mask = previous_mask | {signal.SIGUSR1}
            signal.pthread_sigmask(signal.SIG_SETMASK, expected_mask)
            for number in signals:
                signal.signal(number, caller_handler)
            with cancellation_guard():
                self.assertEqual(expected_mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
            with self.assertRaises(FileNotFoundError):
                with cancellation_guard(), patch.object(subprocess, 'Popen', side_effect=FileNotFoundError('owned-spawn-failure')):
                    run([os.sys.executable, '-c', 'import threading; threading.Event().wait()'], HERE, Budget.start(5))
            for number in signals:
                self.assertIs(caller_handler, signal.getsignal(number))
            self.assertEqual(expected_mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
            # A library call without an opt-in guard must preserve the caller's signal policy too.
            self.assertEqual((0, 'owned-success\n'), run([os.sys.executable, '-c', "print('owned-success')"], HERE, Budget.start(5)))
            for number in signals:
                self.assertIs(caller_handler, signal.getsignal(number))
            self.assertEqual(expected_mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
        finally:
            for number, handler in previous.items():
                signal.signal(number, handler)
            signal.pthread_sigmask(signal.SIG_SETMASK, previous_mask)

    def test_actual_cancellation_reaps_owned_child_and_restores_previous_signal_handler(self):
        previous = signal.getsignal(signal.SIGTERM)
        with tempfile.TemporaryDirectory(prefix='owned-ai-cancel-') as temporary:
            root = Path(temporary); pid = root/'child.pid'
            script = ('import os,signal,pathlib,threading,sys; '
                      'pathlib.Path(sys.argv[1]).write_text(str(os.getpid())); '
                      'os.kill(os.getppid(), signal.SIGTERM); threading.Event().wait()')
            with self.assertRaises(ReviewCancelled):
                with cancellation_guard(): run([os.sys.executable, '-c', script, pid], root, Budget.start(5))
            with self.assertRaises(ProcessLookupError): os.kill(int(pid.read_text()), 0)
        self.assertEqual(previous, signal.getsignal(signal.SIGTERM))


if __name__ == '__main__':
    unittest.main(verbosity=2)
