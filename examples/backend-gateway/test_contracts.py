"""Native ownership/command/config guards; never actual Nginx/Docker evidence."""
import base64
import json
import os
from pathlib import Path
import signal
import socketserver
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

import commands
import lab


class GatewayContracts(unittest.TestCase):
    def test_stalled_body_keeps_a_wire_disconnect_distinct_from_an_http408(self):
        for response,kind,status in [(b'', 'closed-before-status', None),
                (b'HTTP/1.1 408 Request Timeout\r\nContent-Length: 0\r\nConnection: close\r\n\r\n', 'http-response', 408)]:
            seen=[]
            class Handler(socketserver.BaseRequestHandler):
                def handle(self):
                    self.request.settimeout(2)
                    data=b''
                    while b'\r\n\r\n' not in data and len(data)<8192:
                        chunk=self.request.recv(4096)
                        if not chunk: return
                        data+=chunk
                    body=data.split(b'\r\n\r\n',1)[1]
                    seen.append(body[:1] or self.request.recv(1))
                    if response: self.request.sendall(response)
            with self.subTest(kind=kind),socketserver.TCPServer(('127.0.0.1',0),Handler) as server:
                server.timeout=3
                worker=threading.Thread(target=server.handle_request)
                worker.start()
                try:
                    instance=lab.Lab('gw-0123456789abcdef')
                    instance.port=server.server_address[1]
                    observation=instance.stalled_body({})
                    self.assertEqual(kind,observation['wireOutcome'])
                    self.assertEqual(status,observation['httpStatus'])
                    self.assertGreaterEqual(observation['elapsedMillis'],0)
                finally:
                    worker.join(4)
                    self.assertFalse(worker.is_alive())
                self.assertEqual([b'{'],seen)

    def test_only_actual_exact_loopback_binding_is_accepted(self):
        for published in (None,[],[{'HostIp':'0.0.0.0','HostPort':'12345'}],
                          [{'HostIp':'127.0.0.1','HostPort':'0'}],
                          [{'HostIp':'127.0.0.1','HostPort':'65536'}],
                          [{'HostIp':'127.0.0.1','HostPort':'12345'}]*2):
            with self.subTest(published=published),self.assertRaises(commands.LabFailure):
                lab.published_gateway_port({'NetworkSettings':{'Ports':{'8080/tcp':published}}})
        self.assertEqual(12345,lab.published_gateway_port({'NetworkSettings':{'Ports':{'8080/tcp':[{'HostIp':'127.0.0.1','HostPort':'12345'}]}}}))
    def test_names_refuse_foreign_or_shell_like_resource(self):
        for value in ['production','gw-123','gw-0123456789abcdef;rm','../gw-0123456789abcdef']:
            with self.assertRaises(ValueError):
                lab.checked_name(value)

    def test_task_tracker_consumed_read_only_with_only_reviewed_from_pins(self):
        original=(lab.ROOT.parent/'java-spring/task-tracker/Dockerfile').read_text()
        actual=lab.pinned_dockerfile(original)
        for image,digest in lab.BASE_PINS.items():
            actual=actual.replace(image+'@'+digest,image)
        self.assertEqual(original,actual)
        with self.assertRaises(ValueError):
            lab.pinned_dockerfile(original.replace('17-jre','21-jre'))

    def test_remote_docker_and_overrides_refused_before_mutations(self):
        for key in ['DOCKER_HOST','DOCKER_CONTEXT']:
            with patch.dict(os.environ,{key:'remote'},clear=True),patch.object(lab,'run') as run:
                with self.assertRaises(commands.LabFailure):
                    lab.local_docker(commands.Budget.start())
                run.assert_not_called()
        with patch.dict(os.environ,{},clear=True),patch.object(lab,'run',return_value=(0,'tcp://remote:2375')) as run:
            with self.assertRaises(commands.LabFailure):
                lab.local_docker(commands.Budget.start())
            self.assertEqual(1,run.call_count)

    def test_cleanup_rejects_changed_label_and_retains_retry_state(self):
        name='gw-0123456789abcdef'
        with tempfile.TemporaryDirectory() as directory:
            state=Path(directory)/'owner.json'
            state.write_text(json.dumps({'schemaVersion':1,'name':name}))
            value=json.dumps([{'Id':'owned-id','Config':{'Labels':{lab.OWNER_LABEL:'foreign'}}}])
            with patch.object(lab,'STATE',state),patch.object(lab,'local_docker'),patch.object(lab,'run',return_value=(0,value)) as run:
                with self.assertRaises(commands.LabFailure):
                    lab.cleanup()
                self.assertTrue(state.exists())
                self.assertFalse(any('rm' in call.args[0] for call in run.call_args_list))

    def test_cleanup_does_not_mistake_inspection_failure_for_absence(self):
        for raw in ['cannot connect to daemon','permission denied','Error: No such container: foreign']:
            with patch.object(lab,'run',return_value=(1,raw)):
                with self.assertRaises(commands.LabFailure):
                    lab.inspect_for_cleanup('container','gw-0123456789abcdef-edge',commands.Budget.start())
        for kind in ['container','network','image']:
            with patch.object(lab,'run',return_value=(1,'Error: No such '+kind+': gw-0123456789abcdef')):
                self.assertIsNone(lab.inspect_for_cleanup(kind,'gw-0123456789abcdef',commands.Budget.start()))

    def test_cleanup_uses_matched_ids_and_checks_absence(self):
        name='gw-0123456789abcdef'
        present={name+'-edge':'a'*64,name+'-probe':'b'*64,name+'-task':'c'*64,name:'d'*64,'gateway-lab:'+name:'e'*64,'gateway-base:'+name:'f'*64,name+'-ingress':'g'*64}
        removed=[]
        def execute(args,*unused,**kwargs):
            if 'inspect' in args:
                resource=args[-1]
                if resource not in present:
                    return 1,'Error: No such '+args[1]+': '+resource
                return 0,json.dumps([{'Id':present[resource],'Config':{'Labels':{lab.OWNER_LABEL:name}},'Labels':{lab.OWNER_LABEL:name}}])
            if 'rm' in args:
                key=next(key for key,value in present.items() if value==args[-1] or key==args[-1])
                removed.append(args[-1]); del present[key]
                return 0,''
            raise AssertionError(args)
        with tempfile.TemporaryDirectory() as directory:
            state=Path(directory)/'owner.json'
            state.write_text(json.dumps({'schemaVersion':1,'name':name}))
            private=Path(directory)/'private.env';private.write_text('not-a-real-secret')
            with patch.object(lab,'STATE',state),patch.object(lab,'BUILD',Path(directory)),patch.object(lab,'local_docker'),patch.object(lab,'run',side_effect=execute):
                lab.cleanup()
            self.assertFalse(present)
            self.assertEqual(7,len(removed))
            self.assertEqual('a'*64,removed[0])
            self.assertFalse(state.exists())
            self.assertFalse(private.exists())

    def test_config_contract_auth_body_header_and_error_boundaries(self):
        config=(lab.ROOT/'nginx.conf').read_text()
        headers=(lab.ROOT/'proxy-headers.conf').read_text()
        self.assertIn('location = /_authorize {\n            internal;\n            auth_request off;',config)
        self.assertIn('proxy_pass_request_body off;',config)
        self.assertIn('proxy_set_header Content-Length "";',config)
        self.assertIn('proxy_pass http://task:9191/api/projects?page=0&size=1;',config)
        self.assertNotIn('proxy_pass http://task:9191/api/csrf;',config)
        self.assertIn('limit_req_status 429;',config)
        self.assertIn('client_max_body_size 1k;',config)
        self.assertIn('proxy_read_timeout 20ms;',config)
        self.assertIn('proxy_intercept_errors off;',config)
        self.assertNotIn('$proxy_add_x_forwarded_for',headers)
        self.assertIn('proxy_set_header X-Forwarded-For $remote_addr;',headers)
        for key in ['Forwarded','X-Forwarded-Host','X-Forwarded-User','X-User','X-Auth-Request-User']:
            self.assertIn('proxy_set_header '+key+' "";',headers)
        self.assertNotIn('$http_authorization',config)
        self.assertNotIn('$http_cookie',config)

    def test_java17_fixture_compiles_and_rejects_unknown_mode_before_network(self):
        with tempfile.TemporaryDirectory() as directory:
            commands.run(['javac','--release','17','-d',directory,lab.ROOT/'GatewayProbe.java'],lab.ROOT,commands.Budget.start())
            code,text=commands.run(['java','-Xmx32m','-cp',directory,'GatewayProbe','invalid'],lab.ROOT,commands.Budget.start(),check=False)
            self.assertNotEqual(0,code)
            self.assertIn('fixed_server_mode_required',text)
            code,text=commands.run(['java','-Xmx32m','-cp',directory,'GatewayProbe','direct'],lab.ROOT,commands.Budget.start(),check=False)
            self.assertNotEqual(0,code)
            self.assertIn('fixed_server_mode_required',text)

    def test_actual_command_deadline_output_cap_and_no_unbounded_configuration(self):
        for args,kwargs in [([sys.executable,'-c','import time;time.sleep(5)'],{'timeout':.1}),
                            ([sys.executable,'-c','print("x"*10000)'],{'output_limit':100})]:
            with self.assertRaises(commands.LabFailure):
                commands.run(args,lab.ROOT,commands.Budget.start(),**kwargs)
        for timeout in [0,-1,601]:
            with self.assertRaises(ValueError):
                commands.run(['never'],lab.ROOT,commands.Budget.start(),timeout=timeout)

    def test_actual_leader_exit_descendant_stdout_timeout_and_cancellation_cleanup(self):
        actual_popen, actual_killpg = subprocess.Popen, os.killpg
        unrelated = actual_popen([sys.executable, '-c', 'import time;time.sleep(30)'],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
        def not_running(pid):
            try:
                state = Path('/proc/'+str(pid)+'/stat').read_text().rsplit(')', 1)[1].split()[0]
                return state in ('Z', 'X')
            except FileNotFoundError:
                return True
        try:
            for cancellation in (None, signal.SIGTERM, signal.SIGINT):
                with self.subTest(cancellation=cancellation), tempfile.TemporaryDirectory(prefix='owned-gateway-descendant-') as directory:
                    pidfile = Path(directory)/'descendant.pid'
                    source = ('import subprocess,sys;from pathlib import Path;'
                        'child=subprocess.Popen([sys.executable,"-c","import time;time.sleep(30)"]);'
                        'Path(sys.argv[1]).write_text(str(child.pid))')
                    created, observed = [], []
                    ready, finish = threading.Event(), threading.Event()
                    before = {number:signal.getsignal(number) for number in (signal.SIGTERM, signal.SIGINT)}
                    def spawn(*args, **kwargs):
                        process = actual_popen(*args, **kwargs); created.append(process); return process
                    def interrupt_after_exit():
                        deadline = time.monotonic()+3
                        while time.monotonic()<deadline and not finish.is_set():
                            if created and pidfile.exists() and created[0].poll()==0:
                                observed.append(True); ready.set()
                                if cancellation is not None: os.kill(os.getpid(), cancellation)
                                return
                            time.sleep(.001)
                    observer = threading.Thread(target=interrupt_after_exit)
                    observer.start()
                    try:
                        with patch.object(commands.subprocess, 'Popen', side_effect=spawn), patch.object(commands.os, 'killpg', wraps=actual_killpg) as killed:
                            with commands.cancellation_guard(), self.assertRaises(commands.LabFailure):
                                commands.run([sys.executable, '-c', source, str(pidfile)], directory,
                                    commands.Budget.start(5), timeout=1 if cancellation is None else 4)
                        self.assertTrue(ready.wait(1), 'Positioned observation must see actual leader exit before cleanup')
                        self.assertEqual([True], observed)
                        descendant = int(pidfile.read_text())
                        deadline = time.monotonic()+1
                        while not not_running(descendant) and time.monotonic()<deadline: time.sleep(.005)
                        self.assertTrue(not_running(descendant), 'Owned descendant must be absent or not running; no grandchild reap claim')
                        self.assertEqual(0, created[0].returncode)
                        self.assertTrue(created[0].stdout.closed)
                        self.assertTrue(killed.call_args_list)
                        self.assertTrue(all(call.args==(created[0].pid, signal.SIGKILL) for call in killed.call_args_list))
                        self.assertIsNone(unrelated.poll(), 'Unrelated new-session group must remain running')
                        for number, handler in before.items(): self.assertIs(handler, signal.getsignal(number))
                    finally:
                        finish.set(); observer.join(timeout=1)
                        for process in created:
                            try: actual_killpg(process.pid, signal.SIGKILL)
                            except ProcessLookupError: pass
                            process.wait(timeout=1); process.stdout.close()
                    self.assertFalse(observer.is_alive())
        finally:
            actual_killpg(unrelated.pid, signal.SIGKILL); unrelated.wait(timeout=1)

    def test_actual_non_group_timeout_never_signals_process_group(self):
        with patch.object(commands.os, 'killpg') as kill_group:
            with self.assertRaises(commands.LabFailure):
                commands.run([sys.executable, '-c', 'import time;time.sleep(5)'], lab.ROOT,
                    commands.Budget.start(5), timeout=.1, new_session=False)
            kill_group.assert_not_called()

    def test_actual_term_int_popen_startup_owned_child_reaped_handlers_and_masks_preserved(self):
        real=commands.subprocess.Popen
        for number in [signal.SIGTERM,signal.SIGINT]:
            for threaded in [False,True]:
                with self.subTest(signal=number,otherThread=threaded):
                    before={item:signal.getsignal(item) for item in [signal.SIGTERM,signal.SIGINT]}
                    prior=signal.pthread_sigmask(signal.SIG_BLOCK,set())
                    ready,release,delivered=threading.Event(),threading.Event(),threading.Event()
                    worker=threading.Thread(target=lambda:(ready.set(),release.wait(timeout=3)))
                    worker.start()
                    self.assertTrue(ready.wait(timeout=1))
                    mask=prior|{signal.SIGUSR1}|({number} if threaded else set())
                    signal.pthread_sigmask(signal.SIG_SETMASK,mask)
                    created=[]
                    try:
                        with commands.cancellation_guard():
                            guarded=signal.getsignal(number)
                            def observe(signum,frame):
                                delivered.set();guarded(signum,frame)
                            signal.signal(number,observe)
                            def spawn(*args,**kwargs):
                                process=real(*args,**kwargs)
                                created.append(process)
                                if threaded:
                                    signal.pthread_kill(worker.ident,number)
                                else:
                                    os.kill(os.getpid(),number)
                                deadline=time.monotonic()+1
                                while not delivered.is_set() and time.monotonic()<deadline:
                                    time.sleep(.001)
                                self.assertTrue(delivered.is_set(),'actual handler must run before Popen returns')
                                return process
                            with patch.object(commands.subprocess,'Popen',side_effect=spawn):
                                with self.assertRaises(commands.LabFailure):
                                    commands.run([sys.executable,'-c','import time;time.sleep(5)'],lab.ROOT,commands.Budget.start())
                        self.assertEqual(-9,created[0].poll())
                        self.assertFalse(Path('/proc/'+str(created[0].pid)).exists())
                        self.assertTrue(created[0].stdout.closed)
                        self.assertEqual(mask,signal.pthread_sigmask(signal.SIG_BLOCK,set()))
                        for item,handler in before.items():
                            self.assertEqual(handler,signal.getsignal(item))
                    finally:
                        signal.pthread_sigmask(signal.SIG_SETMASK,prior)
                        release.set();worker.join(timeout=1)
                        for process in created:
                            if process.poll() is None:
                                os.killpg(process.pid,signal.SIGKILL);process.communicate(timeout=1)
                    self.assertFalse(worker.is_alive())

    def test_actual_scope_entry_term_int_rolls_back_handlers_state_and_normal_exit(self):
        real=signal.signal
        outer=getattr(commands._cancellation,'state',None)
        before={number:signal.getsignal(number) for number in [signal.SIGTERM,signal.SIGINT]}
        mask=signal.pthread_sigmask(signal.SIG_BLOCK,set())
        for number in [signal.SIGTERM,signal.SIGINT]:
            injected=[]
            def installing(signum,handler):
                value=real(signum,handler)
                if signum==number and not injected:
                    injected.append(signum);os.kill(os.getpid(),signum)
                return value
            with patch.object(signal,'signal',side_effect=installing):
                with self.assertRaises(commands.LabFailure):
                    with commands.cancellation_guard():
                        self.fail('cancellation must occur before context entry completes')
            self.assertEqual([number],injected)
            self.assertIs(outer,getattr(commands._cancellation,'state',None))
            for item,handler in before.items():
                self.assertEqual(handler,signal.getsignal(item))
            self.assertEqual(mask,signal.pthread_sigmask(signal.SIG_BLOCK,set()))
            with commands.cancellation_guard():
                self.assertIsNot(outer,commands._cancellation.state)
            self.assertIs(outer,getattr(commands._cancellation,'state',None))
            for item,handler in before.items():
                self.assertEqual(handler,signal.getsignal(item))

    def test_secret_redaction_and_http_budget_before_connection(self):
        instance=lab.Lab('gw-0123456789abcdef')
        with tempfile.TemporaryDirectory() as directory,patch.object(lab,'EVIDENCE',Path(directory)):
            password=instance.passwords['TASK_TRACKER_ALICE_PASSWORD']
            encoded=base64.b64encode(('alice:'+password).encode()).decode()
            instance.save('safe.json',{'password':password,'credential':encoded})
            text=(Path(directory)/'safe.json').read_text()
            self.assertNotIn(password,text);self.assertNotIn(encoded,text)
        instance.calls=128
        with patch.object(lab.http.client,'HTTPConnection') as connection:
            with self.assertRaises(commands.LabFailure):
                instance.request('GET','/api/projects')
            connection.assert_not_called()


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

policy = commands
IS_SSRF = False
scope = policy.cancellation_guard


RESTORATION_EVIDENCE = []


class ScopeRestorationTests(unittest.TestCase):
    def test_actual_first_term_int_during_restoration_preserve_caller_exception_and_complete_state(self):
        class CallerCancelled(RuntimeError):pass
        class BodyFailed(RuntimeError):pass
        class SetupFailed(RuntimeError):pass
        actual_signal = signal.signal
        for number in (signal.SIGTERM, signal.SIGINT):
            for nested in (False, True):
                for mode in ('normal', 'body-error', 'entry-rollback'):
                    with self.subTest(signal=number.name, nested=nested, mode=mode):
                        original_handlers = {item:signal.getsignal(item) for item in (signal.SIGTERM, signal.SIGINT)}
                        original_state = getattr(policy._cancellation, 'state', None)
                        original_mask = signal.pthread_sigmask(signal.SIG_BLOCK, set())
                        def caller_handler(_number, _frame):raise CallerCancelled('caller cancelled')
                        def exercise():
                            expected_handlers = {item:signal.getsignal(item) for item in original_handlers}
                            expected_state = getattr(policy._cancellation, 'state', None)
                            expected_mask = signal.pthread_sigmask(signal.SIG_BLOCK, set())
                            armed, delivered, raised, setup_failed, entered = [], [], [], [], []
                            def install(item, handler):
                                previous = actual_signal(item, handler)
                                if mode == 'entry-rollback' and item == signal.SIGINT and handler is not expected_handlers[item] and not setup_failed:
                                    setup_failed.append(True); armed.append(True)
                                    raise SetupFailed('fixed entry failure')
                                if armed and item == number and handler is expected_handlers[item] and not delivered:
                                    delivered.append(number.name)
                                    try:os.kill(os.getpid(), number)
                                    except BaseException as failure:
                                        raised.append(failure)
                                        raise
                                return previous
                            caught = None
                            try:
                                try:
                                    with patch.object(policy.signal, 'signal', side_effect=install):
                                        with scope():
                                            entered.append(True); armed.append(True)
                                            if mode == 'body-error':raise BodyFailed('fixed body failure')
                                except BaseException as failure:caught = failure
                                self.assertEqual([number.name], delivered, 'Exactly one actual signal must reach a restored handler')
                                self.assertEqual(1, len(raised))
                                self.assertIs(raised[0], caught, 'Restoration must propagate the original caller exception unchanged')
                                self.assertIsInstance(caught, policy.Cancelled if IS_SSRF and nested else policy.LabFailure if nested else CallerCancelled)
                                self.assertEqual([] if mode == 'entry-rollback' else [True], entered)
                                self.assertIs(expected_state, getattr(policy._cancellation, 'state', None))
                                for item, handler in expected_handlers.items():self.assertIs(handler, signal.getsignal(item))
                                self.assertEqual(expected_mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
                                return {'signal':number.name, 'nested':nested, 'mode':mode, 'actualSignals':1,
                                        'callerExceptionPreserved':True, 'handlersRestored':True,
                                        'outerStateRestored':True, 'maskPreserved':True}
                            finally:
                                # Failed old-source probes must not contaminate another case or its outer scope.
                                policy._cancellation.state = expected_state
                                for item, handler in expected_handlers.items():actual_signal(item, handler)
                        try:
                            mask = (original_mask | {signal.SIGUSR1}) - set(original_handlers)
                            signal.pthread_sigmask(signal.SIG_SETMASK, mask)
                            for item in original_handlers:actual_signal(item, caller_handler)
                            if nested:
                                with scope():row = exercise()
                            else:row = exercise()
                            self.assertIs(original_state, getattr(policy._cancellation, 'state', None))
                            for item in original_handlers:self.assertIs(caller_handler, signal.getsignal(item))
                            self.assertEqual(mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))
                            RESTORATION_EVIDENCE.append(row)
                        finally:
                            policy._cancellation.state = original_state
                            for item, handler in original_handlers.items():actual_signal(item, handler)
                            signal.pthread_sigmask(signal.SIG_SETMASK, original_mask)

    def test_uninterrupted_success_body_error_and_entry_failure_restore_without_swallowing(self):
        class FixedFailure(RuntimeError):pass
        handlers = {number:signal.getsignal(number) for number in (signal.SIGTERM, signal.SIGINT)}
        state = getattr(policy._cancellation, 'state', None)
        mask = signal.pthread_sigmask(signal.SIG_BLOCK, set())
        with scope():
            outer = getattr(policy._cancellation, 'state', None)
            with scope():pass
            self.assertIs(outer, getattr(policy._cancellation, 'state', None))
        body_failure = FixedFailure('fixed body failure')
        with self.assertRaises(FixedFailure) as observed:
            with scope():raise body_failure
        self.assertIs(body_failure, observed.exception)
        real = signal.signal; installed = []
        entry_failure = FixedFailure('fixed entry failure')
        def install(number, handler):
            previous = real(number, handler)
            if number == signal.SIGINT and handler is not handlers[number] and not installed:
                installed.append(True);raise entry_failure
            return previous
        with patch.object(policy.signal, 'signal', side_effect=install):
            with self.assertRaises(FixedFailure) as observed:
                with scope():self.fail('Entry failure must propagate')
        self.assertIs(entry_failure, observed.exception)
        self.assertIs(state, getattr(policy._cancellation, 'state', None))
        for number, handler in handlers.items():self.assertIs(handler, signal.getsignal(number))
        self.assertEqual(mask, signal.pthread_sigmask(signal.SIG_BLOCK, set()))


if __name__=='__main__':
    unittest.main(verbosity=2)
