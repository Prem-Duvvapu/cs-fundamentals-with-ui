import json
from pathlib import Path
import tempfile
import unittest
import verify


class RuntimeLabTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.commands = verify.toolchain()
        cls.classes = verify.ROOT / 'build' / 'classes'
        cls.evidence = verify.ROOT / 'build' / 'evidence'
        verify.compile_sources(cls.commands, cls.classes)

    def test_actual_platform_and_virtual_tasks_obey_same_healthy_dependency_limit(self):
        report = verify.concurrency(self.commands, self.classes, self.evidence)
        cases = {case['mode']: case for case in report['cases']}
        self.assertGreaterEqual(report['runtimeFeature'], 21)
        for mode in ('platform-limited', 'virtual-limited', 'virtual-unlimited'):
            self.assertEqual(cases[mode]['total'], 12)
            self.assertEqual(cases[mode]['succeeded'], 12)
            self.assertEqual(cases[mode]['failed'], 0)
            self.assertEqual(cases[mode]['activeAfterCleanup'], 0)
        self.assertEqual(cases['platform-limited']['virtualTasks'], 0)
        self.assertEqual(cases['virtual-limited']['virtualTasks'], 12)
        self.assertLessEqual(cases['platform-limited']['downstreamMaximum'], 2)
        self.assertLessEqual(cases['virtual-limited']['downstreamMaximum'], 2)
        self.assertGreaterEqual(cases['virtual-unlimited']['downstreamMaximum'], 4)
        self.assertEqual(cases['virtual-timeout']['failed'], 12)
        self.assertEqual(cases['virtual-timeout']['activeAfterCleanup'], 0)

    def test_actual_owned_busy_thread_and_jfr_samples_identify_hot_loop(self):
        report = verify.busy_worker(self.commands, self.classes, self.evidence)
        self.assertGreaterEqual(report['cpuNanos'], 200_000_000)
        self.assertLess(report['cpuNanos'], 2_500_000_000)
        self.assertGreater(report['hotLoopJfrSamples'], 0)
        self.assertGreater(report['recordingBytes'], 0)

    def test_jfr_parser_does_not_count_other_threads_or_wrong_methods_as_hot_loop(self):
        event = {'type': 'jdk.ExecutionSample', 'values': {'sampledThread': {'javaName': 'unrelated'},
                 'stackTrace': {'frames': [{'method': {'type': {'name': 'BusyWorker'}, 'name': 'hotLoop'}}]}}}
        self.assertEqual(verify.hot_loop_samples({'recording': {'events': [event]}}), 0)
        event['values']['sampledThread']['javaName'] = 'lab-hotloop'
        self.assertEqual(verify.hot_loop_samples({'recording': {'events': [event]}}), 1)
        event['values']['stackTrace']['frames'][0]['method']['name'] = 'unrelated'
        self.assertEqual(verify.hot_loop_samples({'recording': {'events': [event]}}), 0)

    def test_missing_selected_jdk_is_an_error_instead_of_a_silent_skip(self):
        with tempfile.TemporaryDirectory(prefix='cs-missing-jdk-') as directory:
            with self.assertRaisesRegex(RuntimeError, 'complete selected JDK'):
                verify.toolchain(directory)

    def test_no_live_own_thread_name_means_no_diagnostic_claim(self):
        self.assertEqual(verify.hot_loop_samples({}), 0)
        non_cpu={'type':'jdk.ThreadSleep','values':{'sampledThread':{'javaName':'lab-hotloop'},
                 'stackTrace':{'frames':[{'method':{'type':{'name':'BusyWorker'},'name':'hotLoop'}}]}}}
        self.assertEqual(verify.hot_loop_samples({'recording':{'events':[non_cpu]}}),0)
        self.assertEqual(verify.hot_loop_samples({'recording': {'events': [{'type': 'jdk.ExecutionSample', 'values': {}}]}}), 0)


if __name__ == '__main__':
    unittest.main()
