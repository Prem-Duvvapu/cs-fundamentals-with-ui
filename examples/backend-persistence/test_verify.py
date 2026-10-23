import importlib.util
import os
from pathlib import Path
import secrets
import signal
import sys
import threading
import time
import processes
import subprocess
import tempfile
import unittest
from unittest.mock import patch, Mock
import uuid

SPEC = importlib.util.spec_from_file_location('owned_persistence_verify', Path(__file__).with_name('verify.py'))
lab = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(lab)


class VerificationGuardTests(unittest.TestCase):
    def test_only_owned_generated_identifiers_can_reach_cleanup_sql(self):
        identifier = uuid.uuid4().hex
        self.assertEqual(lab.owned_identifier('lab_persist_' + identifier + '_source'), '"lab_persist_' + identifier + '_source"')
        for value in ('postgres', 'public', 'lab_persist_x;DROP DATABASE postgres', 'lab_restore_'):
            with self.assertRaises(ValueError):
                lab.owned_identifier(value)

    def test_missing_explicit_admin_mode_and_remote_host_fail_before_sql(self):
        for values in ({}, {'PERSISTENCE_ADMIN_MODE': 'tcp', 'PERSISTENCE_ADMIN_HOST': 'remote.invalid'}):
            with patch.dict(os.environ, values, clear=True), patch.object(lab.Postgres, 'sql') as sql:
                with self.assertRaises(ValueError):
                    lab.verify(Path('unused-report.json'))
                sql.assert_not_called()

    def test_failed_attempt_cannot_reuse_a_previous_success_report(self):
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / 'verification.json'
            report.write_text('{"owned_resources_cleaned":true}')
            with patch.dict(os.environ, {}, clear=True):
                with self.assertRaises(ValueError):
                    lab.verify(report)
            self.assertFalse(report.exists())

    def test_ambient_service_host_and_options_are_removed_from_pg_commands(self):
        password = secrets.token_hex(32)
        with patch.dict(os.environ, {'PGHOSTADDR': 'remote.invalid', 'PGSERVICE': 'external', 'PGOPTIONS': 'unsafe'}, clear=True):
            environment = lab.child_environment(password)
        self.assertNotIn('PGHOSTADDR', environment)
        self.assertNotIn('PGSERVICE', environment)
        self.assertNotEqual(environment['PGOPTIONS'], 'unsafe')
        self.assertEqual(environment['PGPASSWORD'], password)

    def test_password_is_environment_only_not_process_arguments_or_sql_error(self):
        password = secrets.token_hex(32)
        postgres = lab.Postgres('127.0.0.1', 5432, 'owned', password)
        with patch.object(lab, 'run', return_value=subprocess.CompletedProcess([], 1, b'', password.encode())) as run:
            with self.assertRaisesRegex(RuntimeError, 'no credentials') as failure:
                postgres.sql('owned', 'SELECT 1')
            self.assertNotIn(password, str(failure.exception))
            self.assertNotIn(password, ' '.join(run.call_args.args[0]))
            self.assertEqual(run.call_args.kwargs['env']['PGPASSWORD'], password)


class ProcessOwnershipTests(unittest.TestCase):
    def test_actual_first_signal_during_exit_restores_all_handlers_state_and_body_context(self):
        from contextlib import nullcontext
        numbers = (signal.SIGTERM, signal.SIGINT)
        previous = {number: signal.getsignal(number) for number in numbers}
        original_mask = signal.pthread_sigmask(signal.SIG_BLOCK, set())
        original_state = getattr(processes._cancellation, 'state', None)
        actual_signal = signal.signal
        class CallerCancelled(RuntimeError):
            pass
        class BodyFailed(RuntimeError):
            pass
        try:
            mask = (original_mask | {signal.SIGUSR1}) - set(numbers)
            signal.pthread_sigmask(signal.SIG_SETMASK, mask)
            for selected in numbers:
                for nested in (False, True):
                    for body_error in (False, True):
                        with self.subTest(signal=selected.name, nested=nested, bodyError=body_error):
                            caller_exception = CallerCancelled('caller restoration cancellation')
                            body_exception = BodyFailed('owned fixture body error')
                            def caller(_number, _frame):
                                raise caller_exception
                            for number in numbers:
                                actual_signal(number, caller)
                            with processes.cancellation_guard() if nested else nullcontext():
                                outer = getattr(processes._cancellation, 'state', None)
                                handlers = {number: signal.getsignal(number) for number in numbers}
                                armed, delivered, caught = [], [], None
                                def restore(number, handler):
                                    value = actual_signal(number, handler)
                                    if armed and number == selected and handler is handlers[selected] and not delivered:
                                        delivered.append(number)
                                        os.kill(os.getpid(), number)
                                    return value
                                try:
                                    with patch.object(signal, 'signal', side_effect=restore):
                                        try:
                                            with processes.cancellation_guard():
                                                armed.append(True)
                                                if body_error:
                                                    raise body_exception
                                        except BaseException as failure:
                                            caught = failure
                                    self.assertEqual([selected], delivered, 'Actual caller/outer handler must execute during exit restoration')
                                    if nested:
                                        self.assertIsInstance(caught, processes.LabFailure)
                                        self.assertIn('cancelled', str(caught))
                                    else:
                                        self.assertIs(caller_exception, caught, 'Caller exception must propagate without replacement or swallowing')
                                    if body_error:
                                        self.assertIs(body_exception, caught.__context__)
                                    self.assertTrue(all(signal.getsignal(number) is handler for number, handler in handlers.items()),
                                                    'Restoring one handler must not skip the other handler')
                                    self.assertIs(outer, getattr(processes._cancellation, 'state', None))
                                    self.assertEqual(mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
                                    if nested:
                                        self.assertTrue(outer['requested'] and outer['delivered'])
                                finally:
                                    # Isolate failing-old probes without claiming the helper restored anything.
                                    for number, handler in handlers.items():
                                        actual_signal(number, handler)
                                    processes._cancellation.state = outer
                            self.assertIs(original_state, getattr(processes._cancellation, 'state', None))
                            self.assertTrue(all(signal.getsignal(number) is caller for number in numbers))
                            self.assertEqual(mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
        finally:
            for number, handler in previous.items():
                actual_signal(number, handler)
            processes._cancellation.state = original_state
            signal.pthread_sigmask(signal.SIG_SETMASK, original_mask)

    def test_binary_input_stdout_and_stderr_have_separate_finite_channels(self):
        payload=bytes(range(256))*256
        with tempfile.TemporaryDirectory() as directory:
            result=processes.run([sys.executable,'-c','import sys;sys.stdout.buffer.write(sys.stdin.buffer.read());sys.stderr.write("diagnostic")'],
                directory,processes.Budget.start(5),input_bytes=payload)
        self.assertEqual(0,result.returncode); self.assertEqual(payload,result.stdout); self.assertEqual(b'diagnostic',result.stderr)
        for arguments in ({'timeout':0},{'output_limit':0},{'input_bytes':b'x'*1048577}):
            with self.assertRaises(ValueError):
                processes.run(['never'],lab.ROOT,processes.Budget.start(5),**arguments)

    def test_real_deadline_and_output_overflow_close_owned_children(self):
        for command,options,reason in [(['import time;time.sleep(5)'],{'timeout':.05},'deadline'),
                                       (['print("x"*5000)'],{'output_limit':100},'output limit')]:
            with self.assertRaisesRegex(processes.LabFailure,reason):
                processes.run([sys.executable,'-c',*command],lab.ROOT,processes.Budget.start(5),**options)

    def test_first_term_int_during_child_cleanup_finish_wait_and_close_pipes(self):
        real_spawn=processes.subprocess.Popen
        real_stop=processes.stop
        previous={number:signal.getsignal(number) for number in (signal.SIGTERM,signal.SIGINT)}
        mask=signal.pthread_sigmask(signal.SIG_BLOCK,set())
        foreign=real_spawn([sys.executable,'-c','import time;time.sleep(20)'],start_new_session=True)
        try:
            for number in previous:
                with self.subTest(signal=number):
                    children=[]
                    def spawn(*args,**kwargs):
                        child=real_spawn(*args,**kwargs);children.append(child)
                        import select
                        self.assertTrue(select.select([child.stdout],[],[],2)[0],'Owned child must become READY')
                        self.assertEqual(b'READY\n',child.stdout.readline())
                        return child
                    def interrupt_cleanup(child,group=True):
                        os.kill(os.getpid(),number)
                        real_stop(child,group)
                    try:
                        with processes.cancellation_guard():
                            with patch.object(processes.subprocess,'Popen',side_effect=spawn),patch.object(processes,'stop',side_effect=interrupt_cleanup):
                                with self.assertRaisesRegex(processes.LabFailure,'cancelled'):
                                    processes.run([sys.executable,'-c',
                                        'import signal,time;signal.signal(signal.SIGTERM,signal.SIG_IGN);print("READY",flush=True);time.sleep(20)'],
                                        lab.ROOT,processes.Budget.start(5),timeout=.1)
                        child=children[0]
                        self.assertEqual(-signal.SIGKILL,child.returncode,'Cancellation must wait for owned child teardown')
                        self.assertFalse(Path('/proc/'+str(child.pid)).exists())
                        self.assertTrue(all(stream.closed for stream in (child.stdin,child.stdout,child.stderr)))
                        self.assertIsNone(foreign.poll(),'Unrelated process group must survive')
                        self.assertEqual(mask,signal.pthread_sigmask(signal.SIG_BLOCK,set()))
                        for item,handler in previous.items():self.assertEqual(handler,signal.getsignal(item))
                    finally:
                        for child in children:
                            real_stop(child)
                            for stream in (child.stdin,child.stdout,child.stderr):stream.close()
        finally:
            real_stop(foreign)

    def test_partial_stdin_capacity_cannot_block_the_deadline(self):
        # Reader frees less than the next write size, then stalls; a blocking fd can hang here.
        started=time.monotonic()
        with self.assertRaisesRegex(processes.LabFailure,'deadline'):
            processes.run([sys.executable,'-c','import os,time;os.read(0,4096);time.sleep(5)'],
                lab.ROOT,processes.Budget.start(5),input_bytes=b'x'*1048576,timeout=.1)
        self.assertLess(time.monotonic()-started,2)

    def test_first_cancellation_during_cleanup_is_delivered_after_exact_removal(self):
        identifier='b'*32
        names=('lab_persist_'+identifier+'_source','lab_persist_'+identifier+'_restored',
               'lab_persist_role_'+identifier,'backend-persistence:'+identifier)
        observed=[]
        def sql(_database,query):
            observed.append(query)
            if len(observed)==1:
                os.kill(os.getpid(),signal.SIGTERM)
                return names[3]
            if 'pg_get_userbyid' in query:return names[2]
            if 'count(*)' in query:return '0'
            return ''
        admin=Mock();admin.sql.side_effect=sql
        with self.assertRaisesRegex(processes.LabFailure,'cancelled'):
            with processes.cancellation_guard():
                with processes.defer_cancellation():lab.cleanup(admin,*names)
        self.assertEqual(2,sum(query.startswith('DROP DATABASE ') for query in observed))
        self.assertEqual(1,sum(query.startswith('DROP ROLE ') for query in observed))
        self.assertIn('pg_roles',observed[-1])

    def test_real_term_int_during_spawn_including_other_live_thread_preserve_callers(self):
        real=processes.subprocess.Popen
        previous={item:signal.getsignal(item) for item in (signal.SIGTERM,signal.SIGINT)}
        original=signal.pthread_sigmask(signal.SIG_BLOCK,set())
        for number in previous:
            for threaded in (False,True):
                ready,finish,delivered=threading.Event(),threading.Event(),threading.Event()
                def worker():
                    signal.pthread_sigmask(signal.SIG_UNBLOCK,{number}); ready.set(); finish.wait(3)
                thread=threading.Thread(target=worker); thread.start(); self.assertTrue(ready.wait(1))
                mask=original|{signal.SIGUSR1}|({number} if threaded else set())
                signal.pthread_sigmask(signal.SIG_SETMASK,mask)
                children=[]
                try:
                    with processes.cancellation_guard():
                        guarded=signal.getsignal(number)
                        def observe(signum,frame): delivered.set();guarded(signum,frame)
                        signal.signal(number,observe)
                        def spawn(*args,**kwargs):
                            child=real(*args,**kwargs);children.append(child)
                            if threaded: signal.pthread_kill(thread.ident,number)
                            else: os.kill(os.getpid(),number)
                            deadline=time.monotonic()+1
                            while not delivered.is_set() and time.monotonic()<deadline: time.sleep(.001)
                            self.assertTrue(delivered.is_set(),'Actual handler before Popen returns')
                            return child
                        with patch.object(processes.subprocess,'Popen',side_effect=spawn):
                            with self.assertRaises(processes.LabFailure):
                                processes.run([sys.executable,'-c','import time;time.sleep(5)'],lab.ROOT,processes.Budget.start(5))
                    self.assertIsNotNone(children[0].poll())
                    self.assertFalse(Path('/proc/'+str(children[0].pid)).exists())
                    self.assertTrue(all(stream.closed for stream in (children[0].stdin,children[0].stdout,children[0].stderr)))
                    self.assertEqual(mask,signal.pthread_sigmask(signal.SIG_BLOCK,set()))
                    for item,handler in previous.items(): self.assertEqual(handler,signal.getsignal(item))
                finally:
                    signal.pthread_sigmask(signal.SIG_SETMASK,original);finish.set();thread.join(1)
                    for child in children:
                        if child.poll() is None: os.killpg(child.pid,signal.SIGKILL);child.wait(timeout=1)
                    self.assertFalse(thread.is_alive())

    def test_real_scope_entry_signal_restores_previous_handlers_and_outer_state(self):
        real=signal.signal
        previous={item:signal.getsignal(item) for item in (signal.SIGTERM,signal.SIGINT)}
        outer=getattr(processes._cancellation,'state',None)
        for number in previous:
            injected=[]
            def install(signum,handler):
                value=real(signum,handler)
                if signum==number and not injected:
                    injected.append(signum);os.kill(os.getpid(),signum)
                return value
            with patch.object(signal,'signal',side_effect=install):
                with self.assertRaises(processes.LabFailure):
                    with processes.cancellation_guard(): self.fail('Must cancel before entry returns')
            self.assertIs(outer,getattr(processes._cancellation,'state',None))
            for item,handler in previous.items(): self.assertEqual(handler,signal.getsignal(item))

    def test_cleanup_requires_matching_marker_owner_and_resource_family(self):
        identifier='a'*32
        names=('lab_persist_'+identifier+'_source','lab_persist_'+identifier+'_restored','lab_persist_role_'+identifier,'backend-persistence:'+identifier)
        for values in (('postgres',*names[1:]),(*names[:3],'foreign')):
            admin=Mock()
            with self.assertRaises(ValueError): lab.cleanup(admin,*values)
            admin.sql.assert_not_called()
        for answers in (['foreign-marker','',''],[names[3],'foreign-owner','']):
            admin=Mock();admin.sql.side_effect=answers
            with self.assertRaises(processes.LabFailure):lab.cleanup(admin,*names)
            self.assertFalse(any('DROP' in call.args[1] for call in admin.sql.call_args_list))

    def test_sources_cannot_be_overwritten_by_evidence_and_library_keeps_signal_policy(self):
        with self.assertRaises(ValueError):lab.checked_destination(lab.ROOT/'README.md')
        previous={item:signal.getsignal(item) for item in (signal.SIGTERM,signal.SIGINT)}
        processes.run([sys.executable,'-c','pass'],lab.ROOT,processes.Budget.start(5),new_session=False)
        for item,handler in previous.items():self.assertEqual(handler,signal.getsignal(item))


if __name__ == '__main__':
    unittest.main()
