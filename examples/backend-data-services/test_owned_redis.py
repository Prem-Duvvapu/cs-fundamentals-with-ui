"""Actual owned process probes; no Redis global configuration or external service needed."""
import os
from pathlib import Path
import select
import signal
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
import verify_redis as owned


class OwnedRedisRunnerTests(unittest.TestCase):
    @unittest.skipUnless(hasattr(signal, 'pthread_sigmask'), 'POSIX signals required')
    def test_actual_term_int_during_scope_restoration_preserves_caller_nested_state_and_exception(self):
        signals = (signal.SIGTERM, signal.SIGINT)
        previous = {number: signal.getsignal(number) for number in signals}
        original_mask = signal.pthread_sigmask(signal.SIG_BLOCK, set())
        original_state = getattr(owned._cancellation, 'state', None)
        real_signal = signal.signal
        class CallerCancelled(RuntimeError): pass
        class BodyFailure(RuntimeError): pass
        try:
            mask = (original_mask | {signal.SIGUSR1}) - set(signals)
            signal.pthread_sigmask(signal.SIG_SETMASK, mask)
            for selected in signals:
                for nested in (False, True):
                    for body_error in (False, True):
                        with self.subTest(signal=selected.name, nested=nested, body_error=body_error):
                            delivered, observed = [], []
                            caller_error = CallerCancelled('caller restoration interrupted')
                            def caller(_number, _frame): raise caller_error
                            for number in signals: real_signal(number, caller)
                            owned._cancellation.state = original_state
                            def check_scope():
                                expected_state = getattr(owned._cancellation, 'state', None)
                                handler = signal.getsignal(selected)
                                def observe(number, frame):
                                    try: handler(number, frame)
                                    except BaseException as failure:
                                        observed.append(failure)
                                        raise
                                real_signal(selected, observe)
                                handlers = {number: signal.getsignal(number) for number in signals}
                                armed = []
                                def install(number, restored):
                                    result = real_signal(number, restored)
                                    if armed and number == selected and not delivered:
                                        delivered.append(number)
                                        os.kill(os.getpid(), number)
                                    return result
                                expected = owned.Cancelled if nested else CallerCancelled
                                with patch.object(signal, 'signal', side_effect=install):
                                    with self.assertRaises(expected) as caught:
                                        with owned.cancellation_signals():
                                            armed.append(True)
                                            if body_error: raise BodyFailure('original body error')
                                self.assertEqual([selected], delivered, 'Actual signal must interrupt handler restoration')
                                self.assertEqual(1, len(observed))
                                self.assertIs(observed[0], caught.exception, 'Caller exception must propagate unchanged')
                                if not nested: self.assertIs(caller_error, caught.exception)
                                self.assertIs(expected_state, getattr(owned._cancellation, 'state', None))
                                for number, restored in handlers.items(): self.assertIs(restored, signal.getsignal(number))
                                self.assertEqual(mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
                                real_signal(selected, handler)
                            try:
                                if nested:
                                    with owned.cancellation_signals(): check_scope()
                                else: check_scope()
                                self.assertIs(original_state, getattr(owned._cancellation, 'state', None))
                                for number in signals: self.assertIs(caller, signal.getsignal(number))
                            finally:
                                owned._cancellation.state = original_state
                                for number, restored in previous.items(): real_signal(number, restored)
        finally:
            owned._cancellation.state = original_state
            for number, restored in previous.items(): real_signal(number, restored)
            signal.pthread_sigmask(signal.SIG_SETMASK, original_mask)

    @unittest.skipUnless(hasattr(signal,'pthread_sigmask'),'POSIX signals required')
    def test_first_term_int_during_normal_cleanup_waits_reaps_and_closes_before_delivery(self):
        previous={number:signal.getsignal(number) for number in (signal.SIGTERM,signal.SIGINT)}
        original_mask=signal.pthread_sigmask(signal.SIG_BLOCK,set())
        real_killpg=os.killpg
        unrelated=subprocess.Popen([sys.executable,'-c','import time;time.sleep(20)'],start_new_session=True)
        try:
            for number in previous:
                with self.subTest(signal=number.name):
                    process=None;deliveries=[]
                    mask=original_mask-set(previous)
                    signal.pthread_sigmask(signal.SIG_SETMASK,mask)
                    def positioned(group,value):
                        real_killpg(group,value)
                        if process is not None and group==process.pid and value==signal.SIGTERM and not deliveries:
                            deliveries.append(number)
                            os.kill(os.getpid(),number)
                            self.assertTrue(owned._cancellation.state['requested'])
                            self.assertFalse(owned._cancellation.state['delivered'])
                            self.assertIsNone(process.poll())
                    try:
                        with self.assertRaises(owned.Cancelled):
                            with owned.cancellation_signals(),patch.object(os,'killpg',positioned):
                                with owned.owned_process([sys.executable,'-c',
                                        'import signal,time;signal.signal(signal.SIGTERM,signal.SIG_IGN);'
                                        'print("READY",flush=True);time.sleep(20)'],stdout=subprocess.PIPE) as process:
                                    self.assertTrue(select.select([process.stdout],[],[],2)[0],'Owned child readiness deadline')
                                    self.assertEqual(b'READY\n',process.stdout.readline())
                        self.assertEqual([number],deliveries)
                        self.assertEqual(-signal.SIGKILL,process.returncode)
                        self.assertTrue(process.stdout.closed)
                        with self.assertRaises(ProcessLookupError):os.kill(process.pid,0)
                        self.assertIsNone(unrelated.poll())
                        for value,handler in previous.items():self.assertIs(handler,signal.getsignal(value))
                        self.assertEqual(mask,signal.pthread_sigmask(signal.SIG_BLOCK,set()))
                    finally:
                        if process is not None:owned.stop(process)
        finally:
            owned.stop(unrelated)
            for number,handler in previous.items():signal.signal(number,handler)
            signal.pthread_sigmask(signal.SIG_SETMASK,original_mask)

    @unittest.skipUnless(hasattr(signal,'pthread_sigmask') and hasattr(signal,'pthread_kill'),'POSIX signals required')
    def test_positioned_popen_term_int_live_thread_preserves_handlers_masks_and_reaps_child(self):
        numbers=(signal.SIGTERM,signal.SIGINT)
        previous={number:signal.getsignal(number) for number in numbers}
        original_mask=signal.pthread_sigmask(signal.SIG_BLOCK,set())
        real_popen=subprocess.Popen
        try:
            for number in numbers:
                for other_thread in (False,True):
                    with self.subTest(signal=number.name,other_thread=other_thread):
                        processes,deliveries=[],[];ready,finish=threading.Event(),threading.Event()
                        mask=original_mask-set(numbers)
                        if other_thread:mask.add(number)
                        signal.pthread_sigmask(signal.SIG_SETMASK,mask)
                        def worker():
                            signal.pthread_sigmask(signal.SIG_UNBLOCK,set(numbers));ready.set();finish.wait(5)
                        thread=threading.Thread(target=worker,daemon=True);thread.start();self.assertTrue(ready.wait(1))
                        def positioned(*args,**kwargs):
                            process=real_popen(*args,**kwargs);processes.append(process)
                            handler=signal.getsignal(number)
                            def observed(signum,frame):deliveries.append(signum);handler(signum,frame)
                            signal.signal(number,observed)
                            if other_thread:signal.pthread_kill(thread.ident,number);time.sleep(.03)
                            else:os.kill(os.getpid(),number)
                            self.assertEqual([number],deliveries)
                            return process
                        try:
                            with self.assertRaises(owned.Cancelled):
                                with owned.cancellation_signals(),patch.object(subprocess,'Popen',positioned):
                                    with owned.owned_process([sys.executable,'-c','import time;time.sleep(20)'],stdout=subprocess.PIPE):
                                        self.fail('Cancellation must raise after ownership assignment')
                            self.assertEqual(1,len(processes));self.assertIsNotNone(processes[0].returncode)
                            self.assertTrue(processes[0].stdout.closed)
                            with self.assertRaises(ProcessLookupError):os.kill(processes[0].pid,0)
                            for value,handler in previous.items():self.assertIs(handler,signal.getsignal(value))
                            self.assertEqual(mask,signal.pthread_sigmask(signal.SIG_BLOCK,set()))
                        finally:
                            finish.set();thread.join(1);self.assertFalse(thread.is_alive())
                            for process in processes:owned.stop(process)
        finally:
            for number,handler in previous.items():signal.signal(number,handler)
            signal.pthread_sigmask(signal.SIG_SETMASK,original_mask)

    def test_completed_session_leader_does_not_leave_owned_descendant_or_kill_foreign_group(self):
        unrelated=subprocess.Popen([sys.executable,'-c','import time;time.sleep(20)'],start_new_session=True)
        try:
            for number in (None,signal.SIGTERM,signal.SIGINT):
                with self.subTest(signal=number),tempfile.TemporaryDirectory(prefix='owned-data-descendant-') as temporary:
                    pidfile=Path(temporary)/'child.pid'
                    source=('import subprocess,sys;from pathlib import Path;'
                            'child=subprocess.Popen([sys.executable,"-c","import time;time.sleep(20)"]);'
                            'Path(sys.argv[1]).write_text(str(child.pid))')
                    process=None;pid=None
                    try:
                        def run():
                            nonlocal process,pid
                            with owned.owned_process([sys.executable,'-c',source,str(pidfile)],stdout=subprocess.PIPE) as process:
                                expires=time.monotonic()+2
                                while (not pidfile.exists() or process.poll() is None) and time.monotonic()<expires:time.sleep(.005)
                                self.assertEqual(0,process.poll());pid=int(pidfile.read_text())
                                if number is not None:os.kill(os.getpid(),number)
                        if number is None:
                            with owned.cancellation_signals():run()
                        else:
                            with self.assertRaises(owned.Cancelled),owned.cancellation_signals():run()
                        self.assertTrue(process.stdout.closed)
                        expires=time.monotonic()+1
                        def stopped():
                            try:return Path('/proc/'+str(pid)+'/stat').read_text().rsplit(')',1)[1].split()[0] in ('Z','X')
                            except FileNotFoundError:return True
                        while not stopped() and time.monotonic()<expires:time.sleep(.005)
                        self.assertTrue(stopped(),'Owned grandchild must not run; no grandchild-reaping claim')
                        self.assertIsNone(unrelated.poll())
                    finally:
                        if process is not None:owned.stop(process)
        finally:owned.stop(unrelated)

    def test_entry_installation_failure_restores_previous_scope_and_both_handlers(self):
        previous={number:signal.getsignal(number) for number in (signal.SIGTERM,signal.SIGINT)}
        real_signal=signal.signal;outer=getattr(owned._cancellation,'state',None)
        for number in previous:
            seen=[]
            def positioned(value,handler):
                result=real_signal(value,handler)
                if value==number and not seen:
                    seen.append(True);os.kill(os.getpid(),number)
                return result
            with self.assertRaises(owned.Cancelled),patch.object(signal,'signal',positioned):
                with owned.cancellation_signals():self.fail('Positioned entry must be interrupted')
            self.assertEqual([True],seen)
            self.assertIs(outer,getattr(owned._cancellation,'state',None))
            for value,handler in previous.items():self.assertIs(handler,signal.getsignal(value))


if __name__=='__main__':unittest.main()
