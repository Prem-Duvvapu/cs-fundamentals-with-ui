"""Contract mutations use actual packaged evidence; cancellation uses real owned children."""
import copy
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import threading
import time
import unittest
from unittest.mock import patch
import verify_observability as observation
import compare_tickets as processes


class ObservabilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # The tested report comes from actual pipeline execution, never a hand-authored span list.
        with processes.cancellation_signals():
            cls.receipt = observation.run()
        cls.report = cls.receipt['observation']

    def test_actual_runtime_resources_source_binding_and_failure_inclusive_counts(self):
        self.assertEqual(17,self.report['runtime']['feature'])
        self.assertTrue(self.receipt['ownedWorkspaceRemoved'])
        self.assertTrue(self.receipt['ownedChildrenReaped'])
        self.assertEqual(observation.source_identity(),self.receipt['binding']['sources'])
        self.assertEqual(14,sum(case['operations'] for case in self.report['cases']))
        self.assertEqual(11,sum(case['httpRequests'] for case in self.report['cases']))
        self.assertEqual(83,len(self.report['traces']))
        self.assertNotIn('expected',json.dumps(self.receipt))

    def test_rejects_wrong_runtime_missing_remote_parent_and_cross_request_trace(self):
        for mutate in (
            lambda report: report['runtime'].update(feature=21),
            lambda report: next(trace for trace in report['traces'] if trace['stage']=='FIXTURE_PROVIDER').update(remoteParent=False),
            lambda report: next(trace for trace in report['traces'] if trace['stage']=='MODEL_HTTP').update(parentSpanId='0'*16),
            lambda report: next(trace for trace in report['traces'] if trace['stage']=='RETRIEVAL').update(traceId='f'*32),
            lambda report: report['traces'].pop(),
        ):
            changed = copy.deepcopy(self.report); mutate(changed)
            with self.assertRaises(ValueError): observation.validate(changed)

    def test_rejects_payload_fields_metric_ids_and_fabricated_usage_or_outcome_counts(self):
        for mutate in (
            lambda report: report.update(prompt='DO_NOT_EXPORT'),
            lambda report: report['traces'][0].update(answer='DO_NOT_EXPORT'),
            lambda report: report['measurements'][0]['tags'].update(tenant='alice'),
            lambda report: report['measurements'][0]['tags'].update(traceId=report['traces'][0]['traceId']),
            lambda report: next(metric for metric in report['measurements'] if metric['name']=='ai.model.usage.calls' and metric['tags']['state']=='unknown').update(samples=0,total=0),
            lambda report: next(metric for metric in report['measurements'] if metric['name']=='ai.stage.calls' and metric['tags']['error']=='BUDGET' and metric['tags']['stage']=='MODEL').update(samples=0,total=0),
            lambda report: report['traces'][0].update(error='secret raw exception text'),
            lambda report: report.update(scope='unbounded new claim'),
        ):
            changed = copy.deepcopy(self.report); mutate(changed)
            with self.assertRaises(ValueError): observation.validate(changed)

    @unittest.skipUnless(hasattr(signal,'pthread_sigmask') and hasattr(signal,'pthread_kill'),'POSIX signals required')
    def test_reused_runner_reaps_real_child_at_popen_boundary_term_int_with_live_thread(self):
        previous = {number:signal.getsignal(number) for number in (signal.SIGTERM,signal.SIGINT)}
        original_mask = signal.pthread_sigmask(signal.SIG_BLOCK,set())
        real_popen = subprocess.Popen
        try:
            for number in previous:
                for other_thread in (False,True):
                    with self.subTest(signal=number.name,other_thread=other_thread):
                        children, delivered = [], []
                        ready, finish = threading.Event(), threading.Event()
                        mask = original_mask - set(previous)
                        if other_thread: mask.add(number)
                        signal.pthread_sigmask(signal.SIG_SETMASK,mask)
                        def worker():
                            signal.pthread_sigmask(signal.SIG_UNBLOCK,set(previous)); ready.set(); finish.wait(5)
                        thread = threading.Thread(target=worker,daemon=True); thread.start()
                        self.assertTrue(ready.wait(1))
                        def positioned(*args,**kwargs):
                            child = real_popen(*args,**kwargs); children.append(child)
                            handler = signal.getsignal(number)
                            def observe(signum,frame):
                                delivered.append(signum); handler(signum,frame)
                            signal.signal(number,observe)
                            if other_thread:
                                signal.pthread_kill(thread.ident,number); time.sleep(.03)
                            else: os.kill(os.getpid(),number)
                            self.assertEqual([number],delivered)
                            return child
                        try:
                            with self.assertRaises(processes.ComparisonCancelled):
                                with processes.cancellation_signals(),patch.object(subprocess,'Popen',positioned):
                                    processes.bounded_child([sys.executable,'-c','import threading; threading.Event().wait()'],
                                        processes.isolated_environment(),5,output_limit=4096,error_prefix='observation_child')
                            self.assertEqual(1,len(children)); self.assertIsNotNone(children[0].returncode)
                            self.assertTrue(children[0].stdout.closed)
                            with self.assertRaises(ProcessLookupError): os.kill(children[0].pid,0)
                            self.assertEqual(mask,signal.pthread_sigmask(signal.SIG_BLOCK,set()))
                            for value,handler in previous.items(): self.assertIs(handler,signal.getsignal(value))
                        finally:
                            finish.set(); thread.join(timeout=1); self.assertFalse(thread.is_alive())
                            for child in children:
                                if child.poll() is None: os.killpg(child.pid,signal.SIGKILL)
                                child.wait(timeout=2); child.stdout.close()
        finally:
            for number,handler in previous.items(): signal.signal(number,handler)
            signal.pthread_sigmask(signal.SIG_SETMASK,original_mask)

    def test_reused_runner_bounds_actual_output_and_deadline_without_publishing_raw_text(self):
        for command,exception,code in (
            ([sys.executable,'-c',"print('PRIVATE_SYNTHETIC_OUTPUT'*1000)"],RuntimeError,'observation_child_output_limit'),
            ([sys.executable,'-c','import time; time.sleep(4)'],TimeoutError,'observation_child_deadline'),
        ):
            with self.assertRaisesRegex(exception,code):
                processes.bounded_child(command,processes.isolated_environment(),.2,output_limit=4096,error_prefix='observation_child')


if __name__ == '__main__': unittest.main()
