import importlib.util
import json
import os
from pathlib import Path
import signal
import sys
import threading
import time
import processes
import subprocess
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

SPEC=importlib.util.spec_from_file_location('owned_replication_verify',Path(__file__).with_name('verify.py'))
lab=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(lab)


class ProcessOwnershipTests(unittest.TestCase):

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

    def test_sources_cannot_be_overwritten_by_evidence_and_library_keeps_signal_policy(self):
        with self.assertRaises(processes.LabFailure):lab.checked_destination(lab.ROOT/'README.md')
        previous={item:signal.getsignal(item) for item in (signal.SIGTERM,signal.SIGINT)}
        processes.run([sys.executable,'-c','pass'],lab.ROOT,processes.Budget.start(5),new_session=False)
        for item,handler in previous.items():self.assertEqual(handler,signal.getsignal(item))


    def test_actual_signal_at_scope_state_installation_restores_caller_and_nested_state(self):
        from contextlib import nullcontext
        source=Path(processes.__file__).read_text().splitlines()
        install_line=next(index+2 for index,line in enumerate(source) if line.strip()=='_cancellation.state=state')
        for number in (signal.SIGTERM,signal.SIGINT):
            previous=signal.getsignal(number)
            def caller_cancel(_number,_frame):raise processes.LabFailure('caller cancellation')
            signal.signal(number,caller_cancel)
            try:
                for nested in (False,True):
                    with processes.cancellation_guard() if nested else nullcontext():
                        outer=getattr(processes._cancellation,'state',None)
                        handlers={item:signal.getsignal(item) for item in (signal.SIGTERM,signal.SIGINT)}
                        injected=[]
                        def observe(frame,event,_argument):
                            if event=='line' and frame.f_code.co_filename==processes.__file__ and frame.f_lineno==install_line and not injected:
                                injected.append(number);os.kill(os.getpid(),number)
                            return observe
                        saved_trace=sys.gettrace()
                        try:
                            sys.settrace(observe)
                            with self.assertRaises(processes.LabFailure):
                                with processes.cancellation_guard():self.fail('Positioned entry signal must cancel')
                        finally:sys.settrace(saved_trace)
                        self.assertEqual([number],injected)
                        self.assertIs(outer,getattr(processes._cancellation,'state',None))
                        for item,handler in handlers.items():self.assertEqual(handler,signal.getsignal(item))
            finally:signal.signal(number,previous)


class ReplicationGuardTests(unittest.TestCase):
    def test_report_cannot_overwrite_sources_or_follow_symlinks(self):
        for path in (lab.ROOT/'README.md',lab.ROOT/'verify.py'):
            with self.assertRaises(processes.LabFailure):lab.checked_destination(path)
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);(root/'alias').symlink_to(root,target_is_directory=True)
            with self.assertRaises(processes.LabFailure):lab.checked_destination(root/'alias'/'receipt.json')

    def test_publication_does_not_follow_fixed_staging_symlink_or_publish_a_link(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary)
            victim=root/'victim.txt';victim.write_text('original reviewer-owned bytes')
            report=root/'receipt.json';fixed=report.with_suffix('.tmp');fixed.symlink_to(victim)
            previous={item:signal.getsignal(item) for item in (signal.SIGTERM,signal.SIGINT)}
            lab.publish_report(report,'{"complete":true}\n')
            self.assertEqual('original reviewer-owned bytes',victim.read_text())
            self.assertTrue(fixed.is_symlink())
            self.assertFalse(report.is_symlink());self.assertTrue(report.is_file())
            self.assertEqual({'complete':True},json.loads(report.read_text()))
            self.assertEqual([],list(root.glob('.owned-replication-report-*')))
            for item,handler in previous.items():self.assertIs(handler,signal.getsignal(item))

    def test_publication_error_and_actual_term_int_remove_only_owned_staging_and_receipt(self):
        real_create=tempfile.NamedTemporaryFile
        real_replace=Path.replace
        real_unlink=Path.unlink
        previous={item:signal.getsignal(item) for item in (signal.SIGTERM,signal.SIGINT)}
        mask=signal.pthread_sigmask(signal.SIG_BLOCK,set())
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);foreign=root/'foreign.txt';foreign.write_text('keep unrelated file')
            report=root/'receipt.json'
            with patch.object(Path,'replace',side_effect=OSError('positioned publication error')):
                with self.assertRaises(OSError):lab.publish_report(report,'{}')
            self.assertFalse(report.exists());self.assertEqual([],list(root.glob('.owned-replication-report-*')))
            with self.assertRaises(processes.LabFailure):lab.publish_report(report,'x'*32769)
            for number in previous:
                for position in ('created','renamed','cleanup'):
                    handles=[]
                    def create(*args,**kwargs):
                        stream=real_create(*args,**kwargs);handles.append(stream)
                        if position=='created':os.kill(os.getpid(),number)
                        return stream
                    def replace(source,destination):
                        result=real_replace(source,destination)
                        if position=='renamed':os.kill(os.getpid(),number)
                        return result
                    def unlink(path,*args,**kwargs):
                        if position=='cleanup' and path.name.startswith('.owned-replication-report-'):
                            os.kill(os.getpid(),number)
                        return real_unlink(path,*args,**kwargs)
                    with self.subTest(signal=number,position=position):
                        with processes.cancellation_guard():
                            with patch.object(lab.tempfile,'NamedTemporaryFile',side_effect=create),patch.object(Path,'replace',new=replace),patch.object(Path,'unlink',new=unlink):
                                with self.assertRaisesRegex(processes.LabFailure,'cancelled'):lab.publish_report(report,'{}')
                        self.assertEqual(1,len(handles));self.assertTrue(handles[0].closed)
                        self.assertFalse(report.exists());self.assertEqual([],list(root.glob('.owned-replication-report-*')))
                        self.assertEqual('keep unrelated file',foreign.read_text())
                        self.assertEqual(mask,signal.pthread_sigmask(signal.SIG_BLOCK,set()))
                        for item,handler in previous.items():self.assertIs(handler,signal.getsignal(item))

    def test_cancelled_publisher_does_not_unlink_a_concurrent_replacement(self):
        real_replace=Path.replace
        for number in (signal.SIGTERM,signal.SIGINT):
            with tempfile.TemporaryDirectory() as temporary:
                root=Path(temporary);report=root/'receipt.json'
                foreign=root/'other-publish.json';foreign.write_text('independent replacement')
                def replace(source,destination):
                    result=real_replace(source,destination)
                    real_replace(foreign,destination)
                    os.kill(os.getpid(),number)
                    return result
                with processes.cancellation_guard():
                    with patch.object(Path,'replace',new=replace):
                        with self.assertRaisesRegex(processes.LabFailure,'cancelled'):lab.publish_report(report,'{}')
                self.assertEqual('independent replacement',report.read_text())
                self.assertFalse(report.is_symlink())
                self.assertEqual([],list(root.glob('.owned-replication-report-*')))

    def test_ambient_pg_destinations_and_injection_variables_are_removed(self):
        with patch.dict(os.environ,{'PGHOST':'remote.invalid','PGHOSTADDR':'remote.invalid','PGSERVICE':'foreign',
                                  'PGOPTIONS':'unsafe','PGPASSWORD':'secret','REPLICATION_HOST':'external','PYTHONPATH':'injected'},clear=True):
            values=processes.environment()
        for key in ('PGHOST','PGHOSTADDR','PGSERVICE','PGOPTIONS','PGPASSWORD','REPLICATION_HOST','PYTHONPATH'):
            self.assertNotIn(key,values)

    def test_same_timeline_fence_never_accepts_sql_text_or_unbounded_wait(self):
        cluster=SimpleNamespace(sql=lambda _query:self.fail('Invalid LSN must fail before SQL'))
        for lsn in ('0/AB;DROP TABLE x','',"1/2'",'0/nothex'):
            with self.assertRaises(processes.LabFailure):lab.lsn_fence(cluster,lsn,.1,processes.Budget.start(1))
        for seconds in (0,-1,9,float('inf')):
            with self.assertRaises(processes.LabFailure):lab.lsn_fence(cluster,'0/AB',seconds,processes.Budget.start(1))
        for observed in ('f','unexpected'):
            wrong_role=SimpleNamespace(sql=lambda _query:observed)
            with self.assertRaises(processes.LabFailure):lab.lsn_fence(wrong_role,'0/AB',.1,processes.Budget.start(1))
        wrong_timeline=SimpleNamespace(sql=lambda query:'t' if 'pg_is_in_recovery' in query else '2')
        with self.assertRaisesRegex(processes.LabFailure,'unexpected timeline'):
            lab.lsn_fence(wrong_timeline,'0/AB',.1,processes.Budget.start(1),1)
        with self.assertRaises(processes.LabFailure):lab.Cluster(None,'shared',5432)

    def test_failed_verification_removes_previous_success_before_binary_resolution(self):
        with tempfile.TemporaryDirectory() as directory:
            report=Path(directory)/'receipt.json';report.write_text('{"ownedResourcesCleaned":true}')
            with self.assertRaises(processes.LabFailure):lab.verify(Path('/missing/postgresql/binaries'),report)
            self.assertFalse(report.exists())

    def test_entry_signal_after_directory_creation_cleans_exact_private_root(self):
        real=tempfile.mkdtemp
        for number in (signal.SIGTERM,signal.SIGINT):
            directories=[]
            def create(*args,**kwargs):
                directory=real(*args,**kwargs);directories.append(Path(directory));os.kill(os.getpid(),number);return directory
            with processes.cancellation_guard():
                with patch.object(lab.tempfile,'mkdtemp',side_effect=create):
                    with self.assertRaisesRegex(processes.LabFailure,'cancelled'):
                        with lab.OwnedPair({},processes.Budget.start(2)):self.fail('Entry must cancel')
            self.assertEqual(1,len(directories));self.assertFalse(directories[0].exists())

    def test_foreground_postmaster_assignment_signal_reaps_exact_child_and_closes_log(self):
        real=subprocess.Popen
        for number in (signal.SIGTERM,signal.SIGINT):
            with tempfile.TemporaryDirectory(prefix='owned-pg-replication-') as directory:
                owner=SimpleNamespace(directory=Path(directory),budget=processes.Budget.start(3),tools={'postgres':Path(sys.executable)})
                cluster=lab.Cluster(owner,'primary',12345);cluster.data.mkdir();children=[]
                def spawn(*args,**kwargs):
                    child=real([sys.executable,'-c','import time;time.sleep(10)'],
                        cwd=kwargs['cwd'],env=kwargs['env'],stdin=kwargs['stdin'],stdout=kwargs['stdout'],
                        stderr=kwargs['stderr'],start_new_session=True)
                    children.append(child);os.kill(os.getpid(),number);return child
                try:
                    with processes.cancellation_guard():
                        with patch.object(lab.subprocess,'Popen',side_effect=spawn):
                            with self.assertRaisesRegex(processes.LabFailure,'cancelled'):cluster.start()
                    self.assertIsNotNone(children[0].poll());self.assertFalse(Path('/proc/'+str(children[0].pid)).exists())
                    self.assertTrue(cluster.stopped);self.assertIsNone(cluster.log)
                finally:cluster.stop()

    def test_first_signal_during_normal_postmaster_cleanup_finishes_owned_group(self):
        real_killpg=os.killpg
        foreign=subprocess.Popen([sys.executable,'-c','import time;time.sleep(30)'],start_new_session=True)
        try:
            for number in (signal.SIGTERM,signal.SIGINT):
                with tempfile.TemporaryDirectory(prefix='owned-pg-replication-') as directory:
                    owner=SimpleNamespace(directory=Path(directory))
                    cluster=lab.Cluster(owner,'primary',12345)
                    cluster.log=open(Path(directory)/'primary.log','wb',buffering=0)
                    cluster.process=subprocess.Popen([sys.executable,'-c',
                        'import signal,time;signal.signal(signal.SIGTERM,signal.SIG_IGN);print("READY",flush=True);time.sleep(20)'],
                        stdout=cluster.log,stderr=subprocess.STDOUT,start_new_session=True)
                    cluster.stopped=False
                    deadline=time.monotonic()+2
                    while b'READY' not in (Path(directory)/'primary.log').read_bytes():
                        self.assertLess(time.monotonic(),deadline);time.sleep(.01)
                    calls=[]
                    def signal_during_cleanup(pid,action):
                        if not calls: calls.append(pid);os.kill(os.getpid(),number)
                        real_killpg(pid,action)
                    try:
                        with processes.cancellation_guard():
                            with patch.object(lab.os,'killpg',side_effect=signal_during_cleanup):
                                with self.assertRaisesRegex(processes.LabFailure,'cancelled'):cluster.stop()
                        self.assertEqual(-signal.SIGKILL,cluster.process.returncode)
                        self.assertTrue(cluster.stopped);self.assertIsNone(cluster.log)
                        self.assertFalse(Path('/proc/'+str(cluster.process.pid)).exists())
                        self.assertIsNone(foreign.poll())
                    finally:cluster.stop()
        finally:processes.stop(foreign)


if __name__=='__main__':unittest.main()
