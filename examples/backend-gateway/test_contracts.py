"""Native ownership/command/config guards; never actual Nginx/Docker evidence."""
import base64
import json
import os
from pathlib import Path
import signal
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
        present={name+'-edge':'a'*64,name+'-probe':'b'*64,name+'-task':'c'*64,name:'d'*64,'gateway-lab:'+name:'e'*64,'gateway-base:'+name:'f'*64}
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
            self.assertEqual(6,len(removed))
            self.assertEqual('a'*64,removed[0])
            self.assertFalse(state.exists())
            self.assertFalse(private.exists())

    def test_config_contract_auth_body_header_and_error_boundaries(self):
        config=(lab.ROOT/'nginx.conf').read_text()
        headers=(lab.ROOT/'proxy-headers.conf').read_text()
        self.assertIn('location = /_authorize {\n            internal;\n            auth_request off;',config)
        self.assertIn('proxy_pass_request_body off;',config)
        self.assertIn('proxy_set_header Content-Length "";',config)
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
            self.assertIn('fixed_server_or_direct_mode_required',text)

    def test_actual_command_deadline_output_cap_and_no_unbounded_configuration(self):
        for args,kwargs in [([sys.executable,'-c','import time;time.sleep(5)'],{'timeout':.1}),
                            ([sys.executable,'-c','print("x"*10000)'],{'output_limit':100})]:
            with self.assertRaises(commands.LabFailure):
                commands.run(args,lab.ROOT,commands.Budget.start(),**kwargs)
        for timeout in [0,-1,601]:
            with self.assertRaises(ValueError):
                commands.run(['never'],lab.ROOT,commands.Budget.start(),timeout=timeout)

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


if __name__=='__main__':
    unittest.main(verbosity=2)
