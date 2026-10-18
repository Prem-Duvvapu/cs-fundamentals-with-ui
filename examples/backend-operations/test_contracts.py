"""Native guards/manifests only. These tests do not establish actual Kubernetes behavior."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch
import lab


class OperationsContracts(unittest.TestCase):
    def test_application_reused_read_only_with_reviewed_base_pins(self):
        source = (lab.ROOT.parent/'java-spring/task-tracker/Dockerfile').read_text()
        pinned = lab.pinned_application_dockerfile(source)
        self.assertEqual(2,pinned.count('@sha256:'))
        for image,digest in lab.BASE_DIGESTS.items():
            pinned = pinned.replace(image+'@'+digest,image)
        self.assertEqual(source,pinned)
        with self.assertRaises(ValueError):
            lab.pinned_application_dockerfile(source.replace('17-jre','21-jre'))

    def test_reject_non_owned_names_and_images(self):
        for name in ['default','kind','production','ops-123','ops-0123456789abcdef;echo bad','../ops-0123456789abcdef']:
            with self.assertRaises(ValueError):
                lab.checked_name(name)
        instance = lab.Lab('ops-0123456789abcdef')
        with self.assertRaises(ValueError):
            lab.manifests(instance.name,'foreign:latest',instance.passwords)

    def test_real_manifest_contract_without_claiming_apiserver_validation(self):
        instance = lab.Lab('ops-0123456789abcdef')
        resources = lab.manifests(instance.name,instance.image,instance.passwords)
        by_kind = {resource['kind']:resource for resource in resources}
        self.assertEqual({'Namespace','Secret','Deployment','Service','Pod'},set(by_kind))
        self.assertEqual(4,len(set(by_kind['Secret']['stringData'].values())))
        for resource in resources:
            self.assertEqual(instance.name,resource['metadata']['labels']['lab.csfundamentals/owner'])
        spec = by_kind['Deployment']['spec']
        self.assertEqual({'maxSurge':1,'maxUnavailable':0},spec['strategy']['rollingUpdate'])
        pod = spec['template']['spec']
        self.assertFalse(pod['automountServiceAccountToken'])
        app = pod['containers'][0]
        self.assertEqual('Never',app['imagePullPolicy'])
        self.assertIn('limits',app['resources'])
        self.assertIn('requests',app['resources'])
        self.assertEqual('512Mi',app['resources']['limits']['memory'])
        self.assertEqual('exec',next(iter(app['readinessProbe'])))
        self.assertEqual('/actuator/health/readiness',app['startupProbe']['httpGet']['path'])
        self.assertEqual({'app':'task'},by_kind['Service']['spec']['selector'])
        self.assertEqual(900,by_kind['Pod']['spec']['activeDeadlineSeconds'])
        with self.assertRaises(ValueError):
            lab.manifests(instance.name,instance.image,dict.fromkeys(instance.passwords,''))

    def test_every_kubectl_call_selects_private_config_context_namespace(self):
        instance = lab.Lab('ops-0123456789abcdef')
        with patch.object(lab,'execute') as run:
            instance.k('get','pods')
        command = run.call_args.args[0]
        self.assertEqual(str(lab.BUILD/'kubeconfig'),command[command.index('--kubeconfig')+1])
        self.assertEqual('kind-'+instance.name,command[command.index('--context')+1])
        self.assertEqual(instance.name,command[command.index('--namespace')+1])
        self.assertIn('--request-timeout=10s',command)

    def test_remote_docker_rejected_before_any_command(self):
        for key in ['DOCKER_HOST','DOCKER_CONTEXT']:
            with patch.dict(os.environ,{key:'foreign'},clear=True), patch.object(lab,'execute') as run:
                with self.assertRaises(RuntimeError):
                    lab.require_local_docker()
                run.assert_not_called()
        with patch.dict(os.environ,{},clear=True), patch.object(lab,'execute',return_value=subprocess.CompletedProcess([],0,'tcp://remote:2375','')) as run:
            with self.assertRaises(RuntimeError):
                lab.require_local_docker()
            self.assertEqual(1,run.call_count)

    def test_cleanup_rejects_unowned_state_before_any_command(self):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory)/'owner.json'
            state.write_text(json.dumps({'schemaVersion':1,'name':'production'}))
            with patch.object(lab,'STATE',state),patch.object(lab,'execute') as run:
                with self.assertRaises(ValueError):
                    lab.cleanup()
                run.assert_not_called()

    def test_cleanup_is_scoped_and_requires_absence_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory)/'owner.json'
            state.write_text(json.dumps({'schemaVersion':1,'name':'ops-0123456789abcdef'}))
            config = Path(directory)/'kubeconfig'
            config.write_text('private test fixture, not a real cluster')
            def response(command,**kwargs):
                return subprocess.CompletedProcess(command,0,'','')
            with patch.object(lab,'STATE',state),patch.object(lab,'BUILD',Path(directory)),patch.object(lab,'require_local_docker'),patch.object(lab,'execute',side_effect=response) as run:
                lab.cleanup()
                deletion = run.call_args_list[0].args[0]
                self.assertEqual(['kind','delete','cluster','--name','ops-0123456789abcdef','--kubeconfig',str(config)],deletion)
                self.assertFalse(state.exists())
                self.assertFalse(config.exists())
                self.assertEqual(4,run.call_count)
            state.write_text(json.dumps({'schemaVersion':1,'name':'ops-0123456789abcdef'}))
            with patch.object(lab,'STATE',state),patch.object(lab,'require_local_docker'),patch.object(lab,'execute',return_value=subprocess.CompletedProcess([],0,'ops-0123456789abcdef\n','')):
                with self.assertRaises(RuntimeError):
                    lab.cleanup()
                self.assertTrue(state.exists())

    def test_actual_owned_process_deadline_and_no_deadline_escape(self):
        start = time.monotonic()
        with self.assertRaises(subprocess.TimeoutExpired):
            lab.execute([sys.executable,'-c','import time; time.sleep(10)'],timeout=0.15)
        self.assertLess(time.monotonic()-start,5)
        for timeout in [0,-1,661]:
            with self.assertRaises(ValueError):
                lab.execute(['never-executed'],timeout=timeout)

    def test_credentials_are_redacted_from_evidence(self):
        instance = lab.Lab('ops-0123456789abcdef')
        with tempfile.TemporaryDirectory() as directory,patch.object(lab,'EVIDENCE',Path(directory)):
            instance.save('safe.json',instance.passwords)
            text = (Path(directory)/'safe.json').read_text()
            for password in instance.passwords.values():
                self.assertNotIn(password,text)
            self.assertIn('[REDACTED]',text)


if __name__=='__main__':
    unittest.main(verbosity=2)
