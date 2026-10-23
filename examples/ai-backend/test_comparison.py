import copy
import inspect
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import subprocess
import signal
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
import compare_tickets as comparison


def variant(correct, errors=None):
    return dict(summary=dict(exactFieldMatchRate=sum(correct)/len(correct), exactFieldMatches=sum(correct), errors=errors or {}),
                cases=[dict(id='case-'+str(i), fieldsCorrect=match) for i, match in enumerate(correct)])


class ComparisonTests(unittest.TestCase):
    @unittest.skipUnless(hasattr(signal, 'pthread_sigmask'), 'POSIX signals required')
    def test_actual_term_int_during_scope_restoration_preserves_caller_nested_state_and_exception(self):
        signals = (signal.SIGTERM, signal.SIGINT)
        previous = {number: signal.getsignal(number) for number in signals}
        original_mask = signal.pthread_sigmask(signal.SIG_BLOCK, set())
        original_state = getattr(comparison._cancellation, 'state', None)
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
                            comparison._cancellation.state = original_state
                            def check_scope():
                                expected_state = getattr(comparison._cancellation, 'state', None)
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
                                expected = comparison.ComparisonCancelled if nested else CallerCancelled
                                with patch.object(signal, 'signal', side_effect=install):
                                    with self.assertRaises(expected) as caught:
                                        with comparison.cancellation_signals():
                                            armed.append(True)
                                            if body_error: raise BodyFailure('original body error')
                                self.assertEqual([selected], delivered, 'Actual signal must interrupt handler restoration')
                                self.assertEqual(1, len(observed))
                                self.assertIs(observed[0], caught.exception, 'Caller exception must propagate unchanged')
                                if not nested: self.assertIs(caller_error, caught.exception)
                                self.assertIs(expected_state, getattr(comparison._cancellation, 'state', None))
                                for number, restored in handlers.items(): self.assertIs(restored, signal.getsignal(number))
                                self.assertEqual(mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
                                real_signal(selected, handler)
                            try:
                                if nested:
                                    with comparison.cancellation_signals(): check_scope()
                                else: check_scope()
                                self.assertIs(original_state, getattr(comparison._cancellation, 'state', None))
                                for number in signals: self.assertIs(caller, signal.getsignal(number))
                            finally:
                                comparison._cancellation.state = original_state
                                for number, restored in previous.items(): real_signal(number, restored)
        finally:
            comparison._cancellation.state = original_state
            for number, restored in previous.items(): real_signal(number, restored)
            signal.pthread_sigmask(signal.SIG_SETMASK, original_mask)

    def test_first_signal_during_deadline_cleanup_waits_for_owned_child(self):
        previous = {number: signal.getsignal(number) for number in (signal.SIGTERM, signal.SIGINT)}
        mask = signal.pthread_sigmask(signal.SIG_BLOCK, set())
        actual_popen, actual_kill = subprocess.Popen, os.killpg
        for number in previous:
            with self.subTest(signal=number), tempfile.TemporaryDirectory(prefix='owned-ai-cleanup-') as directory:
                ready = Path(directory)/'ready'
                children, delivered = [], []
                other = actual_popen([sys.executable,'-c','import time;time.sleep(30)'], start_new_session=True,
                                     stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
                code = 'import signal,time,sys;from pathlib import Path;signal.signal(signal.SIGTERM,signal.SIG_IGN);Path(sys.argv[1]).write_text("READY");time.sleep(30)'
                def spawn(*args, **kwargs):
                    child = actual_popen(*args, **kwargs); children.append(child); return child
                def interrupt_cleanup(group, value):
                    actual_kill(group, value)
                    if children and group == children[0].pid and value == signal.SIGTERM and not delivered:
                        self.assertEqual('READY', ready.read_text(), 'Owned child must install TERM-ignore before the first cancellation')
                        delivered.append(number)
                        os.kill(os.getpid(), number)
                try:
                    with self.assertRaises(comparison.ComparisonCancelled), comparison.cancellation_signals(), patch.object(subprocess,'Popen',spawn), patch.object(os,'killpg',interrupt_cleanup):
                        comparison.bounded_child([sys.executable,'-c',code,str(ready)],comparison.isolated_environment(),.4)
                    self.assertEqual([number],delivered)
                    self.assertEqual(-signal.SIGKILL,children[0].returncode, 'Cancellation must escape only after owned wait/KILL')
                    self.assertTrue(children[0].stdout.closed)
                    with self.assertRaises(ProcessLookupError): os.kill(children[0].pid,0)
                    self.assertIsNone(other.poll())
                    self.assertEqual(mask,signal.pthread_sigmask(signal.SIG_BLOCK,set()))
                    for sig,handler in previous.items(): self.assertIs(handler,signal.getsignal(sig))
                finally:
                    for child in children:
                        try: actual_kill(child.pid,signal.SIGKILL)
                        except ProcessLookupError: pass
                        child.wait(timeout=2);child.stdout.close()
                    actual_kill(other.pid,signal.SIGKILL);other.wait(timeout=2)

    @unittest.skipUnless(hasattr(signal, 'pthread_sigmask'), 'POSIX thread signals required')
    def test_real_scope_entry_signal_after_state_assignment_restores_caller_and_nested_scope(self):
        signals = (signal.SIGTERM, signal.SIGINT)
        previous = {number: signal.getsignal(number) for number in signals}
        previous_mask = signal.pthread_sigmask(signal.SIG_BLOCK, set())
        previous_state = getattr(comparison._cancellation, 'state', None)
        previous_trace = sys.gettrace()
        source, first = inspect.getsourcelines(comparison.cancellation_signals.__wrapped__)
        after_assignment = first + next(index for index, line in enumerate(source)
            if line.strip() == '_cancellation.state = state') + 1
        target = comparison.cancellation_signals.__wrapped__.__code__
        class CallerCancelled(RuntimeError):
            pass
        def caller_handler(_number, _frame):
            raise CallerCancelled('caller_scope_entry_cancelled')
        def positioned(number, expected, state, handlers, mask):
            delivered, body = [], []
            def trace(frame, event, _argument):
                if frame.f_code is target and event == 'line' and frame.f_lineno == after_assignment and not delivered:
                    delivered.append(number)
                    os.kill(os.getpid(), number)
                return trace
            try:
                sys.settrace(trace)
                with self.assertRaises(expected):
                    with comparison.cancellation_signals():
                        body.append(True)
            finally:
                sys.settrace(previous_trace)
            self.assertEqual([number], delivered, 'An actual signal must execute immediately after scope mutation')
            self.assertEqual([], body, 'Scope-entry cancellation must not be swallowed')
            self.assertIs(state, getattr(comparison._cancellation, 'state', None))
            for value, handler in handlers.items(): self.assertIs(handler, signal.getsignal(value))
            self.assertEqual(mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
        try:
            mask = (previous_mask | {signal.SIGUSR1}) - set(signals)
            signal.pthread_sigmask(signal.SIG_SETMASK, mask)
            for number in signals: signal.signal(number, caller_handler)
            caller_handlers = {number: caller_handler for number in signals}
            for number in signals:
                with self.subTest(signal=number.name, nested=False):
                    positioned(number, CallerCancelled, previous_state, caller_handlers, mask)
                with self.subTest(signal=number.name, nested=True):
                    with comparison.cancellation_signals():
                        outer = comparison._cancellation.state
                        outer_handlers = {value: signal.getsignal(value) for value in signals}
                        positioned(number, comparison.ComparisonCancelled, outer, outer_handlers, mask)
                        self.assertTrue(outer['requested'] and outer['delivered'])
                    self.assertIs(previous_state, getattr(comparison._cancellation, 'state', None))
                    for value, handler in caller_handlers.items(): self.assertIs(handler, signal.getsignal(value))
            # Ordinary nested success must preserve the same LIFO state/handler restoration.
            with comparison.cancellation_signals():
                outer = comparison._cancellation.state
                outer_handlers = {number: signal.getsignal(number) for number in signals}
                with comparison.cancellation_signals(): self.assertIsNot(outer, comparison._cancellation.state)
                self.assertIs(outer, comparison._cancellation.state)
                for number, handler in outer_handlers.items(): self.assertIs(handler, signal.getsignal(number))
            self.assertIs(previous_state, getattr(comparison._cancellation, 'state', None))
        finally:
            sys.settrace(previous_trace)
            comparison._cancellation.state = previous_state
            for number, handler in previous.items(): signal.signal(number, handler)
            signal.pthread_sigmask(signal.SIG_SETMASK, previous_mask)

    def test_frozen_identity_requires_exact_prompt_bytes_and_full_commit(self):
        self.assertEqual('2d1247d7ab887cc0f4440d494a4d59528430144d', comparison.FROZEN_COMMIT)
        identity = dict(sha256='b'*64, lfSha256='c'*64, ids=['identity-case'], cases=1)
        provider = dict(model='teaching-fixture', modelDigest='fixture', runtimeVersion='fixture')
        child = dict(state='complete', datasetSha256=identity['sha256'], datasetLfSha256=identity['lfSha256'],
                     promptVersion='ticket-examples-v2', cases=[dict(id='identity-case')],
                     systemPromptSha256=comparison.FROZEN_PROMPT_HASHES['ticket-examples-v2'],
                     usesModel=True, evidence='fixture', model='teaching-fixture', modelDigest='fixture',
                     runtimeVersion='fixture', summary=dict(cases=1))
        comparison.validate_child(child, identity, 'ticket-examples-v2', 'fixture', provider)
        for key, value in (('systemPromptSha256', 'a'*64), ('runtimeVersion', 'changed'), ('modelDigest', 'changed')):
            changed = copy.deepcopy(child); changed[key] = value
            with self.assertRaisesRegex(ValueError, 'comparison_child_identity_mismatch'):
                comparison.validate_child(changed, identity, 'ticket-examples-v2', 'fixture', provider)

    def test_signal_handler_restores_callers_handler_on_success_and_cancellation(self):
        previous = signal.getsignal(signal.SIGTERM)
        try:
            def caller_handler(_number, _frame):
                raise AssertionError('Caller handler must not run inside owned comparison.')
            signal.signal(signal.SIGTERM, caller_handler)
            with comparison.cancellation_signals():
                self.assertIsNot(caller_handler, signal.getsignal(signal.SIGTERM))
            self.assertIs(caller_handler, signal.getsignal(signal.SIGTERM))
            with self.assertRaises(comparison.ComparisonCancelled):
                with comparison.cancellation_signals():
                    os.kill(os.getpid(), signal.SIGTERM)
            self.assertIs(caller_handler, signal.getsignal(signal.SIGTERM))
        finally:
            signal.signal(signal.SIGTERM, previous)

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
                            with self.assertRaises(comparison.ComparisonCancelled):
                                with comparison.cancellation_signals(), patch.object(subprocess, 'Popen', cancel_before_return):
                                    comparison.bounded_child([sys.executable, '-c', 'import threading; threading.Event().wait()'], os.environ.copy(), 5)
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
            with comparison.cancellation_signals():
                self.assertEqual(expected_mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
            with self.assertRaises(FileNotFoundError):
                with comparison.cancellation_signals(), patch.object(subprocess, 'Popen', side_effect=FileNotFoundError('owned-spawn-failure')):
                    comparison.bounded_child([sys.executable, '-c', 'import threading; threading.Event().wait()'], os.environ.copy(), 5)
            for number in signals:
                self.assertIs(caller_handler, signal.getsignal(number))
            self.assertEqual(expected_mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
            # A library call without an opt-in guard must preserve the caller's signal policy too.
            self.assertEqual(b'owned-success\n', comparison.bounded_child([sys.executable, '-c', "print('owned-success')"], os.environ.copy(), 5))
            for number in signals:
                self.assertIs(caller_handler, signal.getsignal(number))
            self.assertEqual(expected_mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
        finally:
            for number, handler in previous.items():
                signal.signal(number, handler)
            signal.pthread_sigmask(signal.SIG_SETMASK, previous_mask)

    def test_actual_cli_sigterm_reaps_owned_jvm_and_publishes_interruption(self):
        with tempfile.TemporaryDirectory(prefix='owned-comparison-term-') as temporary:
            directory = Path(temporary)
            source = directory/'CancellationProbe.java'
            source.write_text('''import java.nio.file.*;
public class CancellationProbe {
    public static void main(String[] args) throws Exception {
        Path target = Path.of(System.getenv("OWNED_COMPARISON_PID_FILE"));
        Path pending = Files.createTempFile(target.getParent(), "owned-java-probe-", ".pid");
        Files.writeString(pending, Long.toString(ProcessHandle.current().pid()));
        Files.move(pending, target, StandardCopyOption.ATOMIC_MOVE);
        Thread.sleep(30000);
    }
}''')
            subprocess.run(['javac', '--release', '17', '-d', str(directory), str(source)],
                           check=True, capture_output=True, timeout=20)
            jar = directory/'owned-probe.jar'
            subprocess.run(['jar', '--create', '--file', str(jar), '--main-class', 'CancellationProbe',
                            '-C', str(directory), 'CancellationProbe.class'], check=True, capture_output=True, timeout=10)
            data = directory/'case.jsonl'
            data.write_text(json.dumps(dict(id='cancel-case', slice='ordinary', text='An original synthetic probe.',
                                            expected=dict(category='other', priority='normal', orderId=None)))+'\n')
            output, pid_file = directory/'report.json', directory/'child.pid'
            environment = comparison.isolated_environment()
            environment.update(OWNED_COMPARISON_PID_FILE=str(pid_file), PYTHONDONTWRITEBYTECODE='1')
            wrapper = subprocess.Popen([sys.executable, str(Path(comparison.__file__).resolve()),
                                        '--dataset', str(data), '--output', str(output), '--jar', str(jar)],
                                       env=environment, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, start_new_session=True)
            child_pid = None
            try:
                deadline = time.monotonic()+8
                while not pid_file.exists() and wrapper.poll() is None and time.monotonic() < deadline:
                    time.sleep(.02)
                self.assertTrue(pid_file.exists(), 'Actual owned Java child must start before cancellation.')
                child_pid = int(pid_file.read_text())
                wrapper.send_signal(signal.SIGTERM)
                message = wrapper.communicate(timeout=8)[0]
                self.assertNotEqual(0, wrapper.returncode)
                with self.assertRaises(ProcessLookupError):
                    os.kill(child_pid, 0)
                report = json.loads(output.read_text())
                self.assertEqual('interrupted', report['state'])
                self.assertEqual('comparison_cancelled', report['failure'])
                self.assertEqual('not-evaluated-incomplete-run', report['decision']['status'])
                self.assertEqual('pending', report['freezeBinding']['status'])
                self.assertIn(b'ComparisonCancelled', message)
                self.assertNotIn(b'An original synthetic probe.', message)
            finally:
                if wrapper.poll() is None:
                    wrapper.send_signal(signal.SIGTERM)
                    try:
                        wrapper.wait(timeout=8)
                    except subprocess.TimeoutExpired:
                        os.killpg(wrapper.pid, signal.SIGKILL)
                        wrapper.wait(timeout=3)
                if child_pid is None and pid_file.exists():
                    value = pid_file.read_text().strip()
                    if value.isdecimal():
                        child_pid = int(value)
                if child_pid is not None:
                    try:
                        os.killpg(child_pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                wrapper.stdout.close()

    def test_actual_inventory_worker_filters_metadata_and_ignores_ambient_proxy(self):
        calls = []
        model, model_digest, runtime = 'owned-fixture:latest', 'a'*64, 'test-1'
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_):
                pass
            def do_GET(self):
                calls.append(self.path)
                value = (dict(version=runtime, private='private-provider-marker') if self.path == '/api/version'
                         else dict(models=[dict(name=model, digest=model_digest, size=12345, private='private-provider-marker')]))
                self.respond(value)
            def do_POST(self):
                calls.append(self.path)
                self.assert_show = json.loads(self.rfile.read(int(self.headers['Content-Length']))) == dict(model=model)
                if self.path != '/api/show' or not self.assert_show:
                    self.send_error(400); return
                self.respond(dict(details=dict(format='gguf'), private='private-provider-marker'))
            def respond(self, value):
                body = json.dumps(value).encode()
                self.send_response(200); self.send_header('Content-Length', str(len(body))); self.end_headers()
                self.wfile.write(body)
        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        server.daemon_threads = True
        thread = threading.Thread(target=server.serve_forever, kwargs=dict(poll_interval=.02), daemon=True)
        thread.start()
        try:
            with patch.dict(os.environ, HTTP_PROXY='http://127.0.0.1:1', http_proxy='http://127.0.0.1:1', NO_PROXY='', no_proxy=''):
                result = comparison.provider_identity('live-local', f'http://127.0.0.1:{server.server_port}/api/chat',
                                                      model, model_digest, runtime)
            self.assertEqual(['/api/version', '/api/tags', '/api/show'], calls)
            self.assertEqual(12345, result['artifactBytes'])
            self.assertEqual({'model', 'modelDigest', 'runtimeVersion', 'inventoryRequests', 'artifactBytes', 'format', 'attestationLimit'}, set(result))
            self.assertNotIn('private-provider-marker', json.dumps(result))
        finally:
            server.shutdown(); server.server_close(); thread.join(timeout=3)
            self.assertFalse(thread.is_alive())

    def test_actual_slow_inventory_is_stopped_by_whole_phase_deadline(self):
        started, stop = threading.Event(), threading.Event()
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_):
                pass
            def do_GET(self):
                self.send_response(200); self.send_header('Content-Length', '65536'); self.end_headers()
                started.set()
                try:
                    while not stop.wait(.02):
                        self.wfile.write(b' '); self.wfile.flush()
                except (BrokenPipeError, ConnectionResetError):
                    pass
        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        server.daemon_threads = True
        thread = threading.Thread(target=server.serve_forever, kwargs=dict(poll_interval=.02), daemon=True)
        thread.start()
        try:
            before = time.monotonic()
            with patch.object(comparison, 'INVENTORY_TIMEOUT_SECONDS', 2):
                with self.assertRaisesRegex(TimeoutError, 'inventory_child_deadline'):
                    comparison.provider_identity('live-local', f'http://127.0.0.1:{server.server_port}/api/chat',
                                                 'owned-fixture:latest', 'a'*64, 'test-1')
            self.assertTrue(started.is_set(), 'The real inventory request must reach the slow server.')
            self.assertLess(time.monotonic()-before, 5.5)
        finally:
            stop.set(); server.shutdown(); server.server_close(); thread.join(timeout=3)
            self.assertFalse(thread.is_alive())

    def test_paired_regression_prevents_a_candidate_with_only_easier_successes(self):
        cases = {'ticket-v1': variant([True]*10), 'ticket-examples-v2': variant([True]*8+[False]*2),
                 'ticket-rules-v1': variant([False]*10)}
        result = comparison.decide(cases, True)
        self.assertEqual('retain-original-prompt', result['status'])
        self.assertEqual(-2, result['exactFieldDelta'])
        self.assertEqual(2, result['pairedTransitions']['regressed'])
        self.assertFalse(result['applicationDefaultChanged'])

    def test_gate_handles_improvement_rules_tie_unknown_and_unassessed_summary(self):
        cases = {'ticket-v1': variant([True]*8+[False]*2), 'ticket-examples-v2': variant([True]*9+[False]),
                 'ticket-rules-v1': variant([False]*10)}
        self.assertEqual('candidate-passes-narrow-field-gate', comparison.decide(cases, True)['status'])
        cases['ticket-examples-v2']['summary']['errors'] = {'unsupported_order_id': 1}
        self.assertEqual('no-model-prompt-meets-field-gate', comparison.decide(cases, True)['status'])
        cases['ticket-rules-v1'] = variant([True]*10)
        result = comparison.decide(cases, True)
        self.assertEqual('prefer-no-model-reference-for-this-sample', result['status'])
        self.assertEqual('not-assessed', result['summaryFaithfulness'])
        self.assertEqual('not-evaluated-incomplete-run', comparison.decide({}, False)['status'])

    def test_dataset_hashes_bind_raw_bytes_but_preserve_line_ending_identity(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary)/'cases.jsonl'
            data = b'{"id":"case-a"}\n{"id":"case-b"}\n'
            path.write_bytes(data); lf = comparison.dataset_identity(path)
            path.write_bytes(data.replace(b'\n', b'\r\n')); crlf = comparison.dataset_identity(path)
            self.assertNotEqual(lf['sha256'], crlf['sha256'])
            self.assertEqual(lf['lfSha256'], crlf['lfSha256'])
            path.write_bytes(b'{"id":"same"}\n{"id":"same"}\n')
            with self.assertRaises(ValueError): comparison.dataset_identity(path)
            path.write_bytes(b'\xff')
            with self.assertRaises(UnicodeError): comparison.dataset_identity(path)

    def test_model_and_environment_guards_reject_cloud_and_injection(self):
        for name in ('gpt-oss:120b-cloud', 'gemma:cloud'):
            with self.assertRaises(ValueError):
                comparison.provider_identity('live-local', 'http://127.0.0.1:11434/api/chat', name, 'a'*64, 'version')
        with self.assertRaises(ValueError):
            comparison.provider_identity('fixture', 'http://example.com/api/chat', 'teaching-fixture')
        with patch.dict(os.environ, AI_MODEL='private', SPRING_CONFIG_LOCATION='/private', JAVA_TOOL_OPTIONS='private'):
            environment = comparison.isolated_environment()
            self.assertNotIn('AI_MODEL', environment)
            self.assertNotIn('SPRING_CONFIG_LOCATION', environment)
            self.assertNotIn('JAVA_TOOL_OPTIONS', environment)

    def test_actual_child_output_cap_and_deadline_are_bounded(self):
        with self.assertRaises(RuntimeError):
            comparison.bounded_java([sys.executable, '-c', 'print("x"*40000)'], comparison.isolated_environment(), 3)
        with self.assertRaises(TimeoutError):
            comparison.bounded_java([sys.executable, '-c', 'import time; time.sleep(5)'], comparison.isolated_environment(), .1)

    def test_atomic_report_rejects_symlinks_and_excessive_output(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary)/'report.json'
            comparison.atomic_report(path, dict(state='running'))
            self.assertEqual('running', json.loads(path.read_text())['state'])
            link = Path(temporary)/'link'; link.symlink_to(path)
            with self.assertRaises(ValueError): comparison.atomic_report(link, {})
            with self.assertRaises(ValueError): comparison.atomic_report(path, dict(value='x'*524288))


if __name__ == '__main__':
    unittest.main()
