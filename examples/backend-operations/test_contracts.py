"""Native guards/manifests only. These tests do not establish actual Kubernetes behavior."""
import copy
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

    def test_resource_pods_cannot_target_foreign_images_or_unbounded_modes(self):
        instance = lab.Lab('ops-0123456789abcdef')
        for mode in ['heap', 'native', 'cpu']:
            resource = lab.resource_manifest(instance.name, instance.image, mode)
            self.assertEqual(instance.name, resource['metadata']['namespace'])
            self.assertEqual(instance.name, resource['metadata']['labels']['lab.csfundamentals/owner'])
            spec = resource['spec']
            self.assertEqual(20, spec['activeDeadlineSeconds'])
            self.assertEqual('Never', spec['restartPolicy'])
            self.assertFalse(spec['automountServiceAccountToken'])
            self.assertTrue(spec['securityContext']['runAsNonRoot'])
            app = spec['containers'][0]
            self.assertNotIn('envFrom', app)
            self.assertNotIn('env', app)
            self.assertTrue(app['securityContext']['readOnlyRootFilesystem'])
            self.assertFalse(app['securityContext']['allowPrivilegeEscalation'])
            self.assertEqual(['ALL'], app['securityContext']['capabilities']['drop'])
            self.assertEqual(app['resources']['limits'], app['resources']['requests'])
            self.assertIn('-Xmx16m', app['command'])
            self.assertEqual(mode, app['command'][-1])
        native = lab.resource_manifest(instance.name, instance.image, 'native')
        self.assertEqual('96Mi', native['spec']['containers'][0]['resources']['limits']['memory'])
        for mode in ['forever', 'fork', '', '../native']:
            with self.assertRaises(ValueError):
                lab.resource_manifest(instance.name, instance.image, mode)
        with self.assertRaises(ValueError):
            lab.resource_manifest(instance.name, 'foreign:latest', 'heap')

    def test_exit_137_alone_does_not_prove_oomkill_and_java_oome_is_distinct(self):
        heap_log = 'RESOURCE_PROBE heap allocation cap=128MiB\nTerminating due to java.lang.OutOfMemoryError: Java heap space'
        native_log = 'RESOURCE_PROBE native memory.max=100663296 allocation cap=128MiB'
        lab.validate_resource_termination('heap', {'exitCode':3, 'reason':'Error'}, heap_log)
        lab.validate_resource_termination('native', {'exitCode':137, 'reason':'OOMKilled'}, native_log)
        lab.validate_resource_termination('cpu', {'exitCode':0, 'reason':'Completed'}, '{}')
        for termination in [{'exitCode':137, 'reason':'Error'}, {'exitCode':1, 'reason':'OOMKilled'},
                            {'exitCode':0, 'reason':'Completed'}, {'exitCode':137, 'reason':'DeadlineExceeded'}]:
            with self.assertRaises(RuntimeError):
                lab.validate_resource_termination('native', termination, native_log)
        with self.assertRaises(RuntimeError):
            lab.validate_resource_termination('native', {'exitCode':137, 'reason':'OOMKilled'}, native_log+' OutOfMemoryError')
        with self.assertRaises(RuntimeError):
            lab.validate_resource_termination('heap', {'exitCode':137, 'reason':'OOMKilled'}, heap_log)
        with self.assertRaises(RuntimeError):
            lab.validate_resource_termination('heap', {'exitCode':3, 'reason':'Error'}, 'exit code only')
        with self.assertRaises(RuntimeError):
            lab.validate_resource_termination('cpu', {'exitCode':137, 'reason':'OOMKilled'}, '{}')

    def test_cpu_requires_observed_quota_activity_and_increasing_throttling(self):
        before = dict(usage_usec=1000, nr_periods=5, nr_throttled=1, throttled_usec=100)
        delta = dict(usage_usec=800000, nr_periods=80, nr_throttled=79, throttled_usec=7000000)
        observation = {'cgroupVersion':2, 'cpuMax':'10000 100000', 'elapsedMillis':8050,
                       'before':before, 'delta':delta, 'after':{key:before[key]+delta[key] for key in before}}
        lab.validate_cpu_observation(observation)
        for changes in [{'cgroupVersion':1}, {'cpuMax':'max 100000'}, {'cpuMax':'100000 100000'},
                        {'cpuMax':'-10000 -100000'}, {'elapsedMillis':20}, {'delta':dict(delta, nr_throttled=0)},
                        {'after':dict(observation['after'], usage_usec=0)}, {'before':{}}]:
            with self.assertRaises(RuntimeError):
                lab.validate_cpu_observation(dict(observation, **changes))

    def test_java17_resource_probe_compiles_and_rejects_unknown_mode_before_work(self):
        with tempfile.TemporaryDirectory() as directory:
            compiled = lab.execute(['javac', '--release', '17', '-d', directory, str(lab.ROOT/'ResourceProbe.java')])
            self.assertEqual(0, compiled.returncode)
            result = lab.execute(['java', '-Xmx16m', '-cp', directory, 'ResourceProbe', 'unknown'], timeout=5, check=False)
            self.assertNotEqual(0, result.returncode)
            self.assertIn('heap, native or cpu required', result.stderr)
            self.assertNotIn('RESOURCE_PROBE', result.stdout)

    def scheduling_fixtures(self):
        name = 'ops-0123456789abcdef'
        def metadata(uid, kind, owner):
            return {'uid': uid, 'namespace': name, 'labels': {'lab.csfundamentals/owner': name},
                    'ownerReferences': [{'kind': kind, 'uid': owner, 'controller': True}]}
        pod = {'metadata': metadata('pending-uid', 'ReplicaSet', 'rs-uid'),
               'spec': {'nodeSelector': {lab.SCHEDULING_LABEL: name}},
               'status': {'phase': 'Pending', 'conditions': [{'type': 'PodScheduled', 'status': 'False',
                   'reason': 'Unschedulable', 'message': "0/1 nodes are available: 1 node(s) didn't match Pod's node affinity/selector."}]}}
        replica_set = {'metadata': metadata('rs-uid', 'Deployment', 'deployment-uid')}
        nodes = {'items': [{'metadata': {'uid': 'node-uid', 'labels': {}}}]}
        event = {'metadata': {'uid': 'event-uid', 'namespace': name}, 'reason': 'FailedScheduling', 'type': 'Warning',
                 'involvedObject': {'uid': 'pending-uid', 'namespace': name, 'kind': 'Pod'},
                 'reportingComponent': 'default-scheduler', 'message': pod['status']['conditions'][0]['message']}
        return name, pod, replica_set, nodes, {'items': [event]}

    def test_pending_requires_actual_cause_event_identity_and_unmatched_nodes(self):
        # Mock API-shaped fixtures exercise guards, never claim scheduler execution.
        name, pod, replica_set, nodes, events = self.scheduling_fixtures()
        result = lab.validate_pending_observation(pod, events, nodes, replica_set, 'deployment-uid', name)
        self.assertEqual('pending-uid', result['podUid'])
        self.assertEqual('event-uid', result['schedulerEvents'][0]['uid'])
        self.assertFalse(result['nodeAssigned'])
        for mutate in (
            lambda p,e,n,r: p['status'].update(phase='Running'),
            lambda p,e,n,r: p['spec'].update(nodeName='assigned-node'),
            lambda p,e,n,r: p['spec'].update(nodeSelector={}),
            lambda p,e,n,r: p['status']['conditions'][0].update(reason='ContainersNotReady'),
            lambda p,e,n,r: p['status']['conditions'][0].update(status='True'),
            lambda p,e,n,r: p['status']['conditions'][0].update(message='Insufficient memory'),
            lambda p,e,n,r: p['status'].update(containerStatuses=[{'state': {'running': {}} ,'containerID': 'actual-process'}]),
            lambda p,e,n,r: e['items'][0]['involvedObject'].update(uid='foreign-pod'),
            lambda p,e,n,r: e['items'][0]['involvedObject'].update(namespace='foreign'),
            lambda p,e,n,r: e['items'][0]['metadata'].update(namespace='foreign'),
            lambda p,e,n,r: e['items'][0].update(reportingComponent='kubelet'),
            lambda p,e,n,r: e['items'][0].update(reason='Failed', message='ImagePullBackOff'),
            lambda p,e,n,r: e['items'].clear(),
            lambda p,e,n,r: n['items'][0]['metadata']['labels'].update({lab.SCHEDULING_LABEL: name}),
            lambda p,e,n,r: n['items'].clear(),
            lambda p,e,n,r: r['metadata']['ownerReferences'][0].update(uid='foreign-deployment'),
            lambda p,e,n,r: p['metadata']['labels'].clear(),
        ):
            p,e,n,r = copy.deepcopy((pod,events,nodes,replica_set)); mutate(p,e,n,r)
            with self.subTest(mutation=mutate), self.assertRaises(RuntimeError):
                lab.validate_pending_observation(p,e,n,r,'deployment-uid',name)
        legacy = copy.deepcopy(events)
        legacy['items'][0].pop('reportingComponent')
        legacy['items'][0]['source'] = {'component': 'default-scheduler'}
        self.assertEqual('default-scheduler', lab.validate_pending_observation(pod,legacy,nodes,replica_set,'deployment-uid',name)['schedulerEvents'][0]['reporter'])

    def test_repair_requires_replacement_ready_container_and_exact_service_endpoint(self):
        name, pod, replica_set, nodes, events = self.scheduling_fixtures()
        pod['metadata']['uid'] = 'replacement-uid'
        pod['spec'] = {'nodeName': 'owned-node'}
        pod['status'] = {'phase': 'Running', 'conditions': [{'type': 'PodScheduled', 'status': 'True'}, {'type': 'Ready', 'status': 'True'}],
                         'containerStatuses': [{'restartCount': 0, 'ready': True}]}
        endpoints = [{'conditions': {'ready': True}, 'targetRef': {'uid': 'replacement-uid'}}]
        result = lab.validate_scheduling_recovery(pod,replica_set,'deployment-uid',name,'pending-uid',endpoints)
        self.assertEqual('replacement-uid',result['readyEndpointPodUid'])
        for mutate in (
            lambda p,e: p['metadata'].update(uid='pending-uid'),
            lambda p,e: p['spec'].pop('nodeName'),
            lambda p,e: p['spec'].update(nodeSelector={lab.SCHEDULING_LABEL: name}),
            lambda p,e: p['status']['conditions'][1].update(status='False'),
            lambda p,e: p['status']['containerStatuses'][0].update(restartCount=1),
            lambda p,e: e[0]['targetRef'].update(uid='old-pod'),
            lambda p,e: e[0]['conditions'].update(ready=False),
            lambda p,e: e.clear(),
            lambda p,e: e.append(copy.deepcopy(e[0])),
        ):
            p,e = copy.deepcopy((pod,endpoints)); mutate(p,e)
            with self.subTest(mutation=mutate), self.assertRaises(RuntimeError):
                lab.validate_scheduling_recovery(p,replica_set,'deployment-uid',name,'pending-uid',e)

    def test_scheduling_endpoints_reject_foreign_service_slice_and_pod_identity(self):
        name = 'ops-0123456789abcdef'
        service = {'metadata': {'name': 'task', 'namespace': name, 'uid': 'service-uid', 'labels': {'lab.csfundamentals/owner': name}},
                   'spec': {'selector': {'app': 'task'}}}
        slices = {'items': [{'metadata': {'namespace': name, 'uid': 'slice-uid', 'labels': {'kubernetes.io/service-name': 'task'},
                    'ownerReferences': [{'kind': 'Service', 'uid': 'service-uid', 'controller': True}]},
                    'endpoints': [{'conditions': {'ready': True}, 'targetRef': {'kind': 'Pod', 'namespace': name, 'uid': 'pod-uid'}}]}]}
        self.assertEqual('pod-uid',lab.scheduling_endpoints(slices,service,name)[0]['targetRef']['uid'])
        self.assertEqual([],lab.scheduling_endpoints({'items': []},service,name))
        for mutate in (
            lambda s,v: v['metadata'].update(uid='foreign-service'),
            lambda s,v: v['spec'].update(selector={'app': 'other'}),
            lambda s,v: s['items'][0]['metadata'].update(namespace='foreign'),
            lambda s,v: s['items'][0]['metadata']['ownerReferences'][0].update(controller=False),
            lambda s,v: s['items'][0]['endpoints'][0]['targetRef'].update(namespace='foreign'),
            lambda s,v: s['items'][0]['endpoints'][0]['targetRef'].update(kind='Node'),
        ):
            changed_slices,changed_service=copy.deepcopy((slices,service)); mutate(changed_slices,changed_service)
            with self.assertRaises(RuntimeError): lab.scheduling_endpoints(changed_slices,changed_service,name)

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
