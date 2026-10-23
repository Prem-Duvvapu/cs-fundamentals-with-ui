import contextlib
import commands
import signal
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from commands import Budget, LabFailure, environment, run
from behavior_check import check
from runner import run_lab, publish


@contextlib.contextmanager
def current_directory(path):
    original = Path.cwd()
    try:
        os.chdir(path); yield
    finally:
        os.chdir(original)


class EngineeringWorkflowTests(unittest.TestCase):
    def test_full_real_workflow_identifies_repairs_refactors_and_keeps_a_guard_repository_untouched(self):
        observed = {}
        with tempfile.TemporaryDirectory(prefix='cs-workflow-guard-') as temporary:
            guard = Path(temporary)
            def git(*arguments):
                return subprocess.check_output(['git', '-C', str(guard), *arguments], env=environment(), stderr=subprocess.DEVNULL).decode().strip()
            git('init', '-b', 'main'); git('config', 'user.name', 'Guard fixture'); git('config', 'user.email', 'guard@example.invalid')
            marker = guard / 'user-work.txt'; marker.write_text('Preserve this independent fixture repository.\n')
            git('add', 'user-work.txt'); git('commit', '-m', 'independent work')
            head, config = git('rev-parse', 'HEAD'), (guard / '.git/config').read_bytes()
            report_file = guard / 'evidence.json'
            with patch.dict(os.environ, {'GIT_DIR': str(guard / '.git'), 'GIT_WORK_TREE': str(guard), 'GIT_AUTHOR_NAME': 'Must not leak into owned repo'}), current_directory(guard):
                report = run_lab(observe=lambda key, value: observed.__setitem__(key, value))
            self.assertEqual(head, git('rev-parse', 'HEAD')); self.assertEqual(config, (guard / '.git/config').read_bytes())
            self.assertEqual('Preserve this independent fixture repository.\n', marker.read_text())
            self.assertEqual('', git('status', '--porcelain'))
            self.assertEqual(report['git']['seeded_culprit'], report['git']['identified_culprit'])
            self.assertGreaterEqual(len(report['git']['bisect_checks']), 2)
            self.assertEqual({0, 1}, {entry['exit'] for entry in report['git']['bisect_checks']})
            self.assertTrue(all(entry['compiled'] for entry in report['git']['bisect_checks']))
            self.assertIn('enterprise-urgent: expected INCIDENT_QUEUE, got ENTERPRISE_QUEUE', report['git']['failing_behavior'])
            self.assertTrue(report['git']['revert_parent_was_bad_head']); self.assertTrue(report['git']['later_changes_preserved'])
            self.assertTrue(report['git']['behavior_before_after_identical']); self.assertEqual(17, report['git']['golden_cases'])
            self.assertEqual('1.0', report['maven']['nearest_equal_depth']['LOADED_CODEC'])
            self.assertEqual('2.0', report['maven']['dependency_management']['LOADED_CODEC'])
            self.assertEqual('2.0', report['maven']['maven_config']['MODEL_VERSION']); self.assertEqual('3.0', report['maven']['explicit_cli']['MODEL_VERSION'])
            self.assertTrue(report['maven']['offline']); self.assertEqual('0A', report['linux']['socket']['state'])
            self.assertTrue(report['linux']['deleted_fd_visible']); self.assertEqual('pending=3', report['linux']['existing_fd_read_after_chmod'])
            self.assertTrue(report['linux']['owned_child_exited']); self.assertTrue(report['owned_workspace_removed'])
            self.assertFalse(observed['workspace'].exists()); self.assertFalse(Path(f'/proc/{observed["pid"]}').exists())
            publish(report, report_file); self.assertEqual(report, json.loads(report_file.read_text()))

    def test_failure_while_child_is_live_removes_owned_workspace_and_process(self):
        observed = {}
        with self.assertRaisesRegex(LabFailure, 'Injected failure'):
            run_lab(observe=lambda key, value: observed.__setitem__(key, value), _fail_stage='linux-live')
        self.assertFalse(observed['workspace'].exists()); self.assertFalse(Path(f'/proc/{observed["pid"]}').exists())

    def test_unbuildable_java_is_skipped_instead_of_being_called_a_behavioral_regression(self):
        with tempfile.TemporaryDirectory(prefix='cs-workflow-build-') as temporary:
            root = Path(temporary); (root / 'TicketRouter.java').write_text('This is not compilable Java.')
            builds = root / 'builds'
            code, evidence = check(root, builds, Budget.start(15))
            self.assertEqual(125, code); self.assertFalse(evidence['compiled']); self.assertEqual([], list(builds.iterdir()))

    def test_command_deadline_and_output_limits_reap_only_owned_children(self):
        with tempfile.TemporaryDirectory(prefix='cs-workflow-process-') as temporary:
            root = Path(temporary)
            pid_file = root / 'pid'
            script = 'import os,pathlib,threading,sys;pathlib.Path(sys.argv[1]).write_text(str(os.getpid()));threading.Event().wait()'
            with self.assertRaisesRegex(LabFailure, 'deadline'):
                run([sys.executable, '-c', script, pid_file], root, Budget.start(5), timeout=1)
            self.assertFalse(Path(f'/proc/{pid_file.read_text()}').exists())
            with self.assertRaisesRegex(LabFailure, 'output limit'):
                run([sys.executable, '-c', 'print("x"*10000)'], root, Budget.start(5), output_limit=100)


class CommandCancellationLifecycleTests(unittest.TestCase):
    def test_actual_term_int_after_state_assignment_restore_caller_and_nested_scopes(self):
        import inspect
        class CallerCancelled(RuntimeError):pass
        original_handlers={number:signal.getsignal(number) for number in (signal.SIGTERM,signal.SIGINT)}
        original_state=getattr(commands._cancellation,'state',None)
        original_mask=signal.pthread_sigmask(signal.SIG_BLOCK,set())
        original_trace=sys.gettrace()
        source,first=inspect.getsourcelines(commands.cancellation_guard.__wrapped__)
        boundary=first+next(index for index,line in enumerate(source) if line.strip()=='_cancellation.state = state')+1
        code=commands.cancellation_guard.__wrapped__.__code__
        def caller_cancel(_number,_frame):raise CallerCancelled()
        try:
            signal.pthread_sigmask(signal.SIG_UNBLOCK,{signal.SIGTERM,signal.SIGINT})
            expected_mask=signal.pthread_sigmask(signal.SIG_BLOCK,set())
            for number in (signal.SIGTERM,signal.SIGINT):
                for nested in (False,True):
                    with self.subTest(signal=number,nested=nested):
                        for item in original_handlers:signal.signal(item,caller_cancel)
                        delivered=[]
                        def positioned(frame,event,_argument):
                            if frame.f_code is code and event=='line' and frame.f_lineno==boundary and not delivered:
                                delivered.append(number);os.kill(os.getpid(),number)
                            return positioned
                        def exercise(expected_exception):
                            outer=getattr(commands._cancellation,'state',None)
                            handlers={item:signal.getsignal(item) for item in original_handlers}
                            try:
                                sys.settrace(positioned)
                                with self.assertRaises(expected_exception):
                                    with commands.cancellation_guard():self.fail('Actual signal must cancel before entry returns')
                            finally:sys.settrace(original_trace)
                            self.assertEqual([number],delivered)
                            self.assertIs(outer,getattr(commands._cancellation,'state',None))
                            self.assertEqual(expected_mask,signal.pthread_sigmask(signal.SIG_BLOCK,set()))
                            for item,handler in handlers.items():self.assertEqual(handler,signal.getsignal(item))
                        try:
                            if nested:
                                with commands.cancellation_guard():exercise(commands.LabFailure)
                            else:exercise(CallerCancelled)
                        finally:commands._cancellation.state=original_state
        finally:
            sys.settrace(original_trace);commands._cancellation.state=original_state
            for item,handler in original_handlers.items():signal.signal(item,handler)
            signal.pthread_sigmask(signal.SIG_SETMASK,original_mask)

    def _first_cleanup_signal(self,successful):
        import select
        real_spawn=subprocess.Popen
        real_stop=commands.stop
        before={number:signal.getsignal(number) for number in (signal.SIGTERM,signal.SIGINT)}
        mask=signal.pthread_sigmask(signal.SIG_BLOCK,set())
        unrelated=real_spawn([sys.executable,'-c','import time;time.sleep(20)'],start_new_session=True,
                             stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        try:
            for number in (signal.SIGTERM,signal.SIGINT):
                with self.subTest(signal=number,successful=successful):
                    created=[];delivered=[]
                    def spawn(*args,**kwargs):
                        child=real_spawn(*args,**kwargs);created.append(child)
                        if not successful:
                            self.assertTrue(select.select([child.stdout],[],[],2)[0],'Actual child must report readiness')
                            self.assertEqual(b'READY\n',child.stdout.readline())
                        return child
                    def positioned(child,group=True):
                        if not delivered:delivered.append(number);os.kill(os.getpid(),number)
                        return real_stop(child,group)
                    script=('print("success")' if successful else
                            'import signal,time;signal.signal(signal.SIGTERM,signal.SIG_IGN);print("READY",flush=True);time.sleep(20)')
                    try:
                        with commands.cancellation_guard(),patch.object(commands.subprocess,'Popen',side_effect=spawn),patch.object(commands,'stop',side_effect=positioned):
                            with self.assertRaisesRegex(commands.LabFailure,'cancelled'):
                                commands.run([sys.executable,'-c',script],Path(commands.__file__).parent,
                                             commands.Budget.start(5),timeout=2 if successful else .08)
                        self.assertEqual([number],delivered)
                        child=created[0]
                        self.assertEqual(0 if successful else -signal.SIGKILL,child.returncode)
                        self.assertFalse(Path('/proc/'+str(child.pid)).exists())
                        self.assertTrue(child.stdout.closed)
                        self.assertIsNone(unrelated.poll(),'Cleanup must preserve the independent process group')
                        self.assertEqual(mask,signal.pthread_sigmask(signal.SIG_BLOCK,set()))
                        for item,handler in before.items():self.assertEqual(handler,signal.getsignal(item))
                    finally:
                        for child in created:
                            real_stop(child);child.stdout.close()
        finally:real_stop(unrelated)

    def test_first_term_int_during_deadline_cleanup_reap_ready_child_before_cancel(self):
        self._first_cleanup_signal(False)

    def test_first_term_int_after_success_close_pipe_before_cancel(self):
        self._first_cleanup_signal(True)


if __name__ == '__main__':
    unittest.main(verbosity=2)
