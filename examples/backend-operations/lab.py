"""Real, opt-in kind recovery journey. No default kubecontext or external cluster path."""
from __future__ import annotations
import argparse
import base64
import json
import os
from pathlib import Path
import re
import secrets
import signal
import subprocess
import time

ROOT = Path(__file__).resolve().parent
BUILD = ROOT / 'build'
EVIDENCE = BUILD / 'evidence'
STATE = BUILD / 'owner.json'
KIND_VERSION = 'v0.33.0'
NODE = 'kindest/node:v1.37.0@sha256:a1ed56cfb0e7b93589bdf97c8cd566405a265939e3620fc4f5de89adff580ae5'
BASE_DIGESTS = {
    'maven:3.9-eclipse-temurin-17':'sha256:1a352420f7aba21f5ad08df31bab55f74c013fb491f1ae8ab1dd7ff9ed698584',
    'eclipse-temurin:17-jre':'sha256:e04fa72be13b257a59fdec6dc14af78c8f80f035d3c1ed4e03e45552a231d4c8',
}
RESOURCE_CASES = {'heap': {'memory': '128Mi', 'cpu': '1'},
                  'native': {'memory': '96Mi', 'cpu': '1'},
                  'cpu': {'memory': '128Mi', 'cpu': '100m'}}
NAME = re.compile(r'ops-[a-f0-9]{16}\Z')


def checked_name(name):
    if not isinstance(name, str) or not NAME.fullmatch(name):
        raise ValueError('Only a randomly named owned ops namespace/cluster is allowed')
    return name


def pinned_application_dockerfile(source):
    lines = source.splitlines()
    from_lines = [line for line in lines if line.startswith('FROM ')]
    if from_lines != ['FROM maven:3.9-eclipse-temurin-17 AS build','FROM eclipse-temurin:17-jre']:
        raise ValueError('TaskTracker Docker stages changed; review pins before running')
    for image,digest in BASE_DIGESTS.items():
        source = source.replace('FROM '+image, 'FROM '+image+'@'+digest)
    return source


def require_local_docker():
    if os.environ.get('DOCKER_HOST') or os.environ.get('DOCKER_CONTEXT'):
        raise RuntimeError('Docker host/context overrides are not allowed')
    endpoint = execute(['docker','context','inspect','--format','{{.Endpoints.docker.Host}}']).stdout.strip()
    if not endpoint.startswith('unix://'):
        raise RuntimeError('Only an explicitly local default Unix Docker daemon is allowed')
    execute(['docker','info','--format','{{.ServerVersion}}'])


def execute(args, *, timeout=20, data=None, check=True):
    if not 0 < timeout <= 660:
        raise ValueError('Finite command deadline required')
    # Own process group only. No shell interpolation, default kubeconfig or inherited provider.
    env = dict(os.environ, KIND_EXPERIMENTAL_PROVIDER='docker', KUBECONFIG=str(BUILD / 'kubeconfig'))
    process = subprocess.Popen(args, stdin=subprocess.PIPE if data is not None else subprocess.DEVNULL,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env,
                               start_new_session=True)
    try:
        stdout, stderr = process.communicate(data, timeout=timeout)
    except BaseException:
        os.killpg(process.pid, signal.SIGTERM)
        try:
            process.communicate(timeout=3)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.communicate(timeout=3)
        raise
    if check and process.returncode:
        # Do not include stdin, manifests or secrets in command failure reports.
        raise RuntimeError(f'{args[0]} {args[1:3]} failed ({process.returncode}): {stderr[-2500:]}')
    return subprocess.CompletedProcess(args, process.returncode, stdout, stderr)


def manifests(name, image, passwords):
    checked_name(name)
    if image != f'cs-operations:{name}':
        raise ValueError('Only this run\'s local image tag is allowed')
    required = ['TASK_TRACKER_ALICE_PASSWORD', 'TASK_TRACKER_BOB_PASSWORD', 'TASK_TRACKER_VIEWER_PASSWORD', 'SPRING_DATASOURCE_PASSWORD']
    if set(passwords) != set(required) or any(len(value) < 20 for value in passwords.values()):
        raise ValueError('Four nonempty runtime-generated credentials required')
    labels = {'lab.csfundamentals/owner': name}
    meta = lambda resource: {'name': resource, 'namespace': name, 'labels': labels}
    secret = {'apiVersion':'v1','kind':'Secret','metadata':meta('credentials'),'type':'Opaque','stringData':passwords}
    security = {'runAsNonRoot':True,'runAsUser':10001,'runAsGroup':10001,'seccompProfile':{'type':'RuntimeDefault'}}
    container_security = {'allowPrivilegeEscalation':False,'capabilities':{'drop':['ALL']}}
    app = {'name':'app','image':image,'imagePullPolicy':'Never',
           'args':['--spring.profiles.active=production','--server.address=0.0.0.0','--server.port=9191'],
           'ports':[{'containerPort':9191}], 'envFrom':[{'secretRef':{'name':'credentials'}}],
           'env':[{'name':'JAVA_TOOL_OPTIONS','value':'-Xms32m -Xmx128m -XX:ActiveProcessorCount=2'},
                  {'name':'SPRING_DATASOURCE_URL','value':'jdbc:h2:file:/app/data/task-tracker'}],
           'resources':{'requests':{'cpu':'100m','memory':'192Mi'},'limits':{'cpu':'1','memory':'512Mi'}},
           'securityContext':container_security,
           'volumeMounts':[{'name':'data','mountPath':'/app/data'}],
           'startupProbe':{'httpGet':{'path':'/actuator/health/readiness','port':9191},'periodSeconds':2,'failureThreshold':90,'timeoutSeconds':2},
           'livenessProbe':{'httpGet':{'path':'/actuator/health/liveness','port':9191},'periodSeconds':5,'failureThreshold':6,'timeoutSeconds':2},
           # Deliberate marker for a controlled readiness incident; startup/liveness hit real Actuator.
           'readinessProbe':{'exec':{'command':['/bin/sh','-c','test ! -f /tmp/not-ready']},'periodSeconds':2,'failureThreshold':1,'successThreshold':1,'timeoutSeconds':1}}
    deployment = {'apiVersion':'apps/v1','kind':'Deployment','metadata':meta('task'), 'spec':{
        'replicas':1,'revisionHistoryLimit':3,'progressDeadlineSeconds':60,
        'strategy':{'type':'RollingUpdate','rollingUpdate':{'maxSurge':1,'maxUnavailable':0}},
        'selector':{'matchLabels':{'app':'task'}},'template':{'metadata':{'labels':dict(labels, app='task')},
        'spec':{'automountServiceAccountToken':False,'securityContext':dict(security, fsGroup=10001),
                'terminationGracePeriodSeconds':25,'volumes':[{'name':'data','emptyDir':{'sizeLimit':'64Mi'}}],'containers':[app]}}}}
    client = {'apiVersion':'v1','kind':'Pod','metadata':meta('client'),'spec':{
        'automountServiceAccountToken':False,'restartPolicy':'Never','activeDeadlineSeconds':900,'securityContext':security,
        'containers':[{'name':'client','image':image,'imagePullPolicy':'Never','command':['sleep','900'],
                       'envFrom':[{'secretRef':{'name':'credentials'}}],'securityContext':container_security,
                       'resources':{'requests':{'cpu':'25m','memory':'32Mi'},'limits':{'cpu':'500m','memory':'128Mi'}}}]}}
    return [{'apiVersion':'v1','kind':'Namespace','metadata':{'name':name,'labels':labels}}, secret, deployment,
            {'apiVersion':'v1','kind':'Service','metadata':meta('task'),'spec':{'selector':{'app':'task'},'ports':[{'port':9191,'targetPort':9191}]}},client]


SCHEDULING_LABEL = 'lab.csfundamentals/required-node'


def owned_deployment_pod(pod, replica_set, deployment_uid, name):
    checked_name(name)
    def controller(resource, kind, uid):
        return any(item.get('kind') == kind and item.get('uid') == uid and item.get('controller') is True
                   for item in resource.get('metadata', {}).get('ownerReferences', []))
    for resource in (pod, replica_set):
        metadata = resource.get('metadata', {})
        if not metadata.get('uid') or metadata.get('namespace') != name or metadata.get('labels', {}).get('lab.csfundamentals/owner') != name:
            raise RuntimeError('Actual owned Pod and ReplicaSet identity required')
    if not deployment_uid or not controller(pod, 'ReplicaSet', replica_set['metadata']['uid']) or not controller(replica_set, 'Deployment', deployment_uid):
        raise RuntimeError('Actual Pod-to-ReplicaSet-to-Deployment ownership required')


def validate_pending_observation(pod, events, nodes, replica_set, deployment_uid, name):
    owned_deployment_pod(pod, replica_set, deployment_uid, name)
    status, spec = pod.get('status', {}), pod.get('spec', {})
    if status.get('phase') != 'Pending' or spec.get('nodeName') or spec.get('nodeSelector') != {SCHEDULING_LABEL: name}:
        raise RuntimeError('Pending unassigned Pod with exact unsatisfied selector required')
    if any(item.get('containerID') or item.get('state', {}).get('running') or item.get('state', {}).get('terminated')
           for item in status.get('containerStatuses', [])):
        raise RuntimeError('Unschedulable case must not execute a container')
    node_items = nodes.get('items', [])
    if not node_items or any(not item.get('metadata', {}).get('uid') for item in node_items):
        raise RuntimeError('Actual node identity/label observations required')
    if any(item['metadata'].get('labels', {}).get(SCHEDULING_LABEL) == name for item in node_items):
        raise RuntimeError('Deliberate scheduling selector must match no observed Node')
    condition = next((item for item in status.get('conditions', []) if item.get('type') == 'PodScheduled'), {})
    mismatch = 'node affinity/selector'
    if condition.get('status') != 'False' or condition.get('reason') != 'Unschedulable' or mismatch not in condition.get('message', ''):
        raise RuntimeError('Actual PodScheduled False/Unschedulable selector diagnostic required')
    scheduler_events = [item for item in events.get('items', [])
        if item.get('reason') == 'FailedScheduling' and item.get('type') == 'Warning'
        and item.get('involvedObject', {}).get('uid') == pod['metadata']['uid']
        and item.get('involvedObject', {}).get('namespace') == name
        and item.get('involvedObject', {}).get('kind') == 'Pod'
        and (item.get('reportingComponent') == 'default-scheduler' or item.get('source', {}).get('component') == 'default-scheduler')
        and item.get('metadata', {}).get('uid') and item.get('metadata', {}).get('namespace') == name and mismatch in item.get('message', '')]
    if not scheduler_events:
        raise RuntimeError('Matching actual default-scheduler FailedScheduling event required')
    return {'podUid': pod['metadata']['uid'], 'replicaSetUid': replica_set['metadata']['uid'],
            'deploymentUid': deployment_uid, 'phase': status['phase'], 'nodeAssigned': False,
            'selector': spec['nodeSelector'], 'condition': condition,
            'schedulerEvents': [{'uid': item['metadata']['uid'], 'reason': item['reason'],
                'reporter': 'default-scheduler',
                'message': item['message']} for item in scheduler_events],
            'observedNodeUids': sorted(item['metadata']['uid'] for item in node_items)}


def slice_endpoints(item):
    endpoints = item.get('endpoints')
    if endpoints is None:
        return []
    if not isinstance(endpoints, list) or any(not isinstance(endpoint, dict) for endpoint in endpoints):
        raise RuntimeError('EndpointSlice endpoints must be an array of objects or empty')
    return endpoints


def scheduling_endpoints(slices, service, name):
    checked_name(name)
    metadata = service.get('metadata', {})
    if metadata.get('name') != 'task' or metadata.get('namespace') != name or not metadata.get('uid') or metadata.get('labels', {}).get('lab.csfundamentals/owner') != name or service.get('spec', {}).get('selector') != {'app': 'task'}:
        raise RuntimeError('Exact owned application Service identity and selector required')
    ready = []
    for item in slices.get('items', []):
        meta = item.get('metadata', {})
        if meta.get('namespace') != name or not meta.get('uid') or meta.get('labels', {}).get('kubernetes.io/service-name') != 'task' or not any(
                owner.get('kind') == 'Service' and owner.get('uid') == metadata['uid'] and owner.get('controller') is True
                for owner in meta.get('ownerReferences', [])):
            raise RuntimeError('Actual EndpointSlice ownership must match this Service UID')
        for endpoint in slice_endpoints(item):
            if endpoint.get('conditions', {}).get('ready') is True:
                target = endpoint.get('targetRef', {})
                if target.get('kind') != 'Pod' or target.get('namespace') != name or not target.get('uid'):
                    raise RuntimeError('Ready endpoint must identify a Pod in the owned namespace')
                ready.append(endpoint)
    return ready


def validate_scheduling_recovery(pod, replica_set, deployment_uid, name, pending_uid, endpoints):
    owned_deployment_pod(pod, replica_set, deployment_uid, name)
    status = pod.get('status', {})
    conditions = {item.get('type'): item.get('status') for item in status.get('conditions', [])}
    if pod['metadata']['uid'] == pending_uid or status.get('phase') != 'Running' or not pod.get('spec', {}).get('nodeName'):
        raise RuntimeError('Replacement running Pod with actual node assignment required')
    if SCHEDULING_LABEL in pod['spec'].get('nodeSelector', {}) or conditions.get('PodScheduled') != 'True' or conditions.get('Ready') != 'True':
        raise RuntimeError('Repaired selector and actual Scheduled/Ready conditions required')
    if len(endpoints) != 1 or endpoints[0].get('conditions', {}).get('ready') is not True or endpoints[0].get('targetRef', {}).get('uid') != pod['metadata']['uid']:
        raise RuntimeError('Exactly one ready Service endpoint for the repaired Pod required')
    statuses = status.get('containerStatuses', [])
    if len(statuses) != 1 or statuses[0].get('restartCount') != 0 or statuses[0].get('ready') is not True:
        raise RuntimeError('Replacement application container must be actually ready without restarts')
    return {'podUid': pod['metadata']['uid'], 'replicaSetUid': replica_set['metadata']['uid'],
            'deploymentUid': deployment_uid, 'nodeName': pod['spec']['nodeName'],
            'phase': status['phase'], 'readyEndpointPodUid': endpoints[0]['targetRef']['uid'], 'restartCount': 0}


def resource_manifest(name, image, mode):
    checked_name(name)
    if image != f'cs-operations:{name}' or mode not in RESOURCE_CASES:
        raise ValueError('Only this run image and fixed resource modes are allowed')
    limits = dict(RESOURCE_CASES[mode])
    return {'apiVersion': 'v1', 'kind': 'Pod', 'metadata': {
        'name': 'resource-'+mode, 'namespace': name,
        'labels': {'lab.csfundamentals/owner': name, 'lab.csfundamentals/resource': mode}},
        'spec': {'automountServiceAccountToken': False, 'restartPolicy': 'Never',
                 'activeDeadlineSeconds': 20, 'terminationGracePeriodSeconds': 1,
                 'securityContext': {'runAsNonRoot': True, 'runAsUser': 10001, 'runAsGroup': 10001,
                                     'seccompProfile': {'type': 'RuntimeDefault'}},
                 'containers': [{'name': 'resource', 'image': image, 'imagePullPolicy': 'Never',
                     'command': ['java', '-Xms16m', '-Xmx16m', '-Xss256k', '-XX:+UseSerialGC',
                                 '-XX:ActiveProcessorCount=1', '-XX:MaxMetaspaceSize=32m',
                                 '-XX:ReservedCodeCacheSize=16m', '-XX:MaxDirectMemorySize=160m',
                                 '-XX:+ExitOnOutOfMemoryError', '-cp', '/probe', 'ResourceProbe', mode],
                     'securityContext': {'allowPrivilegeEscalation': False,
                                         'readOnlyRootFilesystem': True, 'capabilities': {'drop': ['ALL']}},
                     'resources': {'requests': limits, 'limits': limits}}]}}


def validate_resource_termination(mode, terminated, logs):
    if mode not in RESOURCE_CASES:
        raise ValueError('Unknown resource case')
    if mode == 'heap':
        if terminated.get('exitCode') in (0, 137) or terminated.get('reason') != 'Error':
            raise RuntimeError('Heap OOME must be actual JVM failure, not kernel kill or successful exit')
        if 'java.lang.OutOfMemoryError: Java heap space' not in logs or 'RESOURCE_PROBE heap' not in logs:
            raise RuntimeError('Actual heap allocation/OOME diagnostic absent')
    elif mode == 'native':
        if terminated.get('exitCode') != 137 or terminated.get('reason') != 'OOMKilled':
            raise RuntimeError('Actual cgroup OOMKilled exit 137 required; exit 137 alone is insufficient')
        if 'RESOURCE_PROBE native memory.max=100663296' not in logs or 'OutOfMemoryError' in logs:
            raise RuntimeError('Native allocation under observed 96MiB cgroup required, not Java OOME')
    elif terminated.get('exitCode') != 0 or terminated.get('reason') != 'Completed':
        raise RuntimeError('CPU workload must complete normally within its Pod deadline')


def validate_cpu_observation(observation):
    if observation.get('cgroupVersion') != 2:
        raise RuntimeError('Actual cgroup-v2 CPU observation required')
    try:
        quota, period = map(int, observation['cpuMax'].split())
    except (KeyError, TypeError, ValueError):
        raise RuntimeError('Actual finite cpu.max quota/period required') from None
    if quota <= 0 or period <= 0 or quota * 10 != period:
        raise RuntimeError('Actual cpu.max must equal 100m')
    if not 8000 <= observation.get('elapsedMillis', 0) <= 20000:
        raise RuntimeError('Bounded actual CPU workload duration required')
    for key in ['usage_usec', 'nr_periods', 'nr_throttled', 'throttled_usec']:
        before = observation.get('before', {}).get(key)
        after = observation.get('after', {}).get(key)
        delta = observation.get('delta', {}).get(key)
        if any(type(value) is not int for value in [before, after, delta]) or before < 0 or delta <= 0 or after-before != delta:
            raise RuntimeError('Actual increasing CPU counter evidence required: '+key)
    return observation


class Lab:
    def __init__(self, name):
        self.name = checked_name(name)
        self.image = f'cs-operations:{name}'
        self.base_image = f'cs-operations-base:{name}'
        self.created = False
        self.local_docker = False
        self.images_owned = False
        self.passwords = {key:secrets.token_urlsafe(24) for key in ['TASK_TRACKER_ALICE_PASSWORD','TASK_TRACKER_BOB_PASSWORD','TASK_TRACKER_VIEWER_PASSWORD','SPRING_DATASOURCE_PASSWORD']}
        self.observations = {'schemaVersion': 3}

    def k(self, *args, timeout=20, data=None, check=True):
        return execute(['kubectl','--kubeconfig',str(BUILD/'kubeconfig'),'--context',f'kind-{self.name}',
                        '--request-timeout=10s','--namespace',self.name,*args],timeout=timeout,data=data,check=check)

    def obj(self, *args):
        return json.loads(self.k('get',*args,'-o','json').stdout)

    def save(self, name, value):
        text = json.dumps(value, indent=2) if not isinstance(value,str) else value
        for password in self.passwords.values():
            text = text.replace(password,'[REDACTED]').replace(base64.b64encode(password.encode()).decode(),'[REDACTED]')
        (EVIDENCE/name).write_text(text+'\n')

    def until(self, description, predicate, seconds=45):
        deadline = time.monotonic()+seconds
        while time.monotonic() < deadline:
            value = predicate()
            if value:
                return value
            time.sleep(1)
        raise RuntimeError(f'Timed out observing {description}')

    def endpoints(self):
        slices = self.obj('endpointslices','-l','kubernetes.io/service-name=task')
        return [endpoint for item in slices['items'] for endpoint in slice_endpoints(item) if endpoint.get('conditions',{}).get('ready') is True]

    def probe(self, mode):
        result = self.k('exec','client','--','java','-Xmx32m','-cp','/probe','Probe',f'task.{self.name}.svc.cluster.local',mode,timeout=12)
        return json.loads(result.stdout.strip())

    def prepare(self):
        BUILD.mkdir(exist_ok=True, mode=0o700)
        os.chmod(BUILD,0o700)
        EVIDENCE.mkdir(exist_ok=True)
        if STATE.exists() or (BUILD/'kubeconfig').exists():
            raise RuntimeError('Previous private state exists; run --cleanup first, never reuse an existing cluster')
        require_local_docker()
        self.local_docker = True
        if KIND_VERSION not in execute(['kind','version']).stdout:
            raise RuntimeError(f'Install pinned kind {KIND_VERSION}')
        client_version = json.loads(execute(['kubectl','version','--client','-o','json']).stdout)
        if client_version['clientVersion']['gitVersion'] != 'v1.37.0':
            raise RuntimeError('Install pinned kubectl v1.37.0')
        if self.name in execute(['kind','get','clusters']).stdout.split():
            raise RuntimeError('Refusing existing kind cluster')
        execute(['javac','--release','17','-d',str(BUILD),str(ROOT/'Probe.java'),str(ROOT/'ResourceProbe.java')])
        for image in [self.image,self.base_image]:
            if execute(['docker','image','inspect',image],check=False).returncode == 0:
                raise RuntimeError('Refusing existing image tag collision')
        self.images_owned = True
        STATE.write_text(json.dumps({'name':self.name,'schemaVersion':1}))
        os.chmod(STATE,0o600)
        # Ownership starts before build/create so interruption cleanup can retry either partial phase.
        self.created = True
        # Existing application source/Dockerfile consumed read-only; only FROM digests added privately.
        application = ROOT.parent/'java-spring/task-tracker'
        pinned = BUILD/'TaskTracker.Dockerfile'
        pinned.write_text(pinned_application_dockerfile((application/'Dockerfile').read_text()))
        build = execute(['docker','build','-f',str(pinned),'-t',self.base_image,str(application)],timeout=600)
        self.save('app-build.log',build.stdout+build.stderr)
        (BUILD/'Dockerfile').write_text(f'FROM {self.base_image}\nCOPY Probe.class ResourceProbe.class /probe/\n')
        execute(['docker','build','-t',self.image,str(BUILD)],timeout=60)
        self.observations['applicationImageId'] = execute(['docker','image','inspect','--format','{{.Id}}',self.image]).stdout.strip()
        (BUILD/'kind.json').write_text(json.dumps({'kind':'Cluster','apiVersion':'kind.x-k8s.io/v1alpha4',
            'networking':{'apiServerAddress':'127.0.0.1'},'nodes':[{'role':'control-plane'}]}))
        execute(['kind','create','cluster','--name',self.name,'--image',NODE,'--kubeconfig',str(BUILD/'kubeconfig'),
                 '--config',str(BUILD/'kind.json'),'--wait','180s'],timeout=300)
        os.chmod(BUILD/'kubeconfig',0o600)
        execute(['kind','load','docker-image','--name',self.name,self.image],timeout=90)
        config = json.loads(self.k('config','view','--minify','-o','json').stdout)
        server = config['clusters'][0]['cluster']['server']
        if not re.fullmatch(r'https://127\.0\.0\.1:\d+',server):
            raise RuntimeError('API server must be the owned loopback cluster')
        self.k('apply','-f','-',data=json.dumps({'apiVersion':'v1','kind':'List','items':manifests(self.name,self.image,self.passwords)}))
        namespace = self.obj('namespace',self.name)
        if namespace['metadata']['labels'].get('lab.csfundamentals/owner') != self.name:
            raise RuntimeError('Missing actual namespace ownership evidence')
        self.observations['namespaceUid'] = namespace['metadata']['uid']
        self.observations['cluster'] = self.name
        self.observations['server'] = server
        self.observations['versions'] = json.loads(self.k('get','--raw=/version').stdout)
        self.k('rollout','status','deployment/task','--timeout=200s',timeout=210)
        self.k('wait','pod/client','--for=condition=Ready','--timeout=60s',timeout=70)

    def journey(self):
        self.until('initial ready endpoint',self.endpoints)
        self.observations['dnsAndAuthenticatedService'] = self.probe('up')
        pods = self.obj('pods','-l','app=task')['items']
        if len(pods)!=1:
            raise RuntimeError('Expected exactly one initial app Pod')
        pod = pods[0]['metadata']['name']
        pod_uid = pods[0]['metadata']['uid']
        restarts = pods[0]['status']['containerStatuses'][0]['restartCount']
        self.k('exec',pod,'--','touch','/tmp/not-ready')
        self.until('endpoint withdrawal',lambda:not self.endpoints())
        not_ready = self.obj('pod',pod)
        if any(c['type']=='Ready' and c['status']=='True' for c in not_ready['status']['conditions']):
            raise RuntimeError('Pod must actually be unready')
        self.observations['readinessWithdrawal'] = self.probe('down')
        self.observations['withdrawnReadyEndpointCount'] = len(self.endpoints())
        self.save('unready-pod.json',not_ready)
        self.save('unready-endpoint-slices.json',self.obj('endpointslices','-l','kubernetes.io/service-name=task'))
        self.k('exec',pod,'--','rm','/tmp/not-ready')
        self.until('same Pod endpoint recovery',self.endpoints)
        recovered = self.obj('pod',pod)
        if recovered['metadata']['uid'] != pod_uid or recovered['status']['containerStatuses'][0]['restartCount'] != restarts:
            raise RuntimeError('Readiness recovery must retain the same Pod')
        self.observations['readinessSamePodNoRestart'] = True
        self.observations['readinessRecovery'] = self.probe('up')
        # Actual failing new container; rolling strategy must retain the previous healthy replica.
        self.k('patch','deployment','task','--type=strategic','-p',json.dumps({'spec':{'template':{'spec':{'containers':[{'name':'app','command':['java','-XX:DefinitelyInvalidTeachingOption']} ]}}}}))
        def failed_pod():
            for item in self.obj('pods','-l','app=task')['items']:
                if item['metadata']['uid'] == pod_uid:
                    continue
                for status in item.get('status',{}).get('containerStatuses',[]):
                    terminated = status.get('state',{}).get('terminated') or status.get('lastState',{}).get('terminated')
                    if terminated and terminated.get('exitCode')!=0:
                        return item
            return None
        bad = self.until('new Pod startup failure',failed_pod,60)
        self.save('failed-rollout-pod.json',bad)
        name = bad['metadata']['name']
        logs = self.k('logs',name,'--tail=40',check=False)
        if 'Unrecognized VM option' not in logs.stdout+logs.stderr:
            logs = self.k('logs',name,'--previous','--tail=40')
        if 'Unrecognized VM option' not in logs.stdout+logs.stderr:
            raise RuntimeError('Actual invalid-option diagnostic missing')
        self.save('failed-rollout.log',logs.stdout+logs.stderr)
        failed_deployment = self.obj('deployment','task')
        if failed_deployment['status'].get('availableReplicas',0) < 1:
            raise RuntimeError('Bad rollout lost old available replica')
        self.save('failed-deployment.json',failed_deployment)
        self.save('events.json',self.obj('events'))
        self.observations['badRolloutOldReplicaAvailable'] = self.probe('up')
        self.k('rollout','undo','deployment/task')
        self.k('rollout','status','deployment/task','--timeout=120s',timeout=130)
        self.until('rollback endpoint',self.endpoints)
        deployed = self.obj('deployment','task')
        if deployed['spec']['template']['spec']['containers'][0].get('command'):
            raise RuntimeError('Rollback retained bad command')
        self.observations['rollbackRecovery'] = self.probe('up')
        self.save('recovered-deployment.json',deployed)
        self.observations['actualCasesExecuted'] = 5
        self.observations['skipped'] = 0


    def pending_scheduling(self):
        deployment = self.obj('deployment', 'task')
        if deployment['metadata']['labels'].get('lab.csfundamentals/owner') != self.name:
            raise RuntimeError('Scheduling repair requires the owned Deployment')
        if deployment['spec']['template']['spec'].get('nodeSelector'):
            raise RuntimeError('Refusing to overwrite an existing application node selector')
        self.save('scheduling-initial-deployment.json', deployment)
        service = self.obj('service', 'task')
        scheduling_endpoints(self.obj('endpointslices', '-l', 'kubernetes.io/service-name=task'), service, self.name)
        self.save('scheduling-service.json', service)
        deployment_uid = deployment['metadata']['uid']
        nodes = self.obj('nodes')
        if not nodes.get('items') or any(item['metadata'].get('labels', {}).get(SCHEDULING_LABEL) == self.name for item in nodes['items']):
            raise RuntimeError('Refusing a scheduling constraint already satisfied by an observed Node')
        self.save('scheduling-nodes.json', nodes)
        # Remove old ready replicas so they cannot hide the deliberately unschedulable replacement.
        self.k('scale', 'deployment/task', '--replicas=0')
        self.until('old application Pods removed', lambda: not self.obj('pods', '-l', 'app=task')['items'], 75)
        self.until('no old ready Service endpoints', lambda: not self.endpoints())
        self.save('scheduling-drained-endpoint-slices.json', self.obj('endpointslices', '-l', 'kubernetes.io/service-name=task'))
        patch = {'spec': {'replicas': 1, 'template': {'spec': {'nodeSelector': {SCHEDULING_LABEL: self.name}}}}}
        self.k('patch', 'deployment', 'task', '--type=strategic', '-p', json.dumps(patch))
        def unschedulable():
            pods = self.obj('pods', '-l', 'app=task')['items']
            if len(pods) != 1:
                return None
            pod = pods[0]
            owner = next((item for item in pod['metadata'].get('ownerReferences', []) if item.get('kind') == 'ReplicaSet' and item.get('controller') is True), None)
            if not owner:
                return None
            replica_set = self.obj('replicaset', owner['name'])
            events = self.obj('events', '--field-selector', 'involvedObject.uid='+pod['metadata']['uid'])
            self.save('pending-pod.json', pod)
            self.save('pending-replicaset.json', replica_set)
            self.save('pending-scheduler-events.json', events)
            try:
                observed = validate_pending_observation(pod, events, nodes, replica_set, deployment_uid, self.name)
            except RuntimeError:
                return None
            return observed
        pending = self.until('actual unschedulable condition and matching scheduler event', unschedulable, 60)
        self.until('unschedulable Service has no ready endpoint', lambda: not self.endpoints())
        slices = self.obj('endpointslices', '-l', 'kubernetes.io/service-name=task')
        if scheduling_endpoints(slices, service, self.name):
            raise RuntimeError('Unschedulable Service has an unexpected ready backend')
        self.save('pending-endpoint-slices.json', slices)
        unavailable = self.probe('down')
        if unavailable.get('dnsResolved') is not True or unavailable.get('connectionUnavailable') is not True or self.endpoints():
            raise RuntimeError('Unschedulable Pod must leave DNS present but Service unavailable')
        self.observations['scheduling'] = {'pending': pending, 'pendingReadyEndpointCount': 0, 'unavailableService': unavailable}
        self.k('patch', 'deployment', 'task', '--type=strategic', '-p', json.dumps({'spec': {'template': {'spec': {'nodeSelector': None}}}}))
        self.k('rollout', 'status', 'deployment/task', '--timeout=200s', timeout=210)
        self.until('repaired scheduling endpoint', self.endpoints)
        recovered_service = self.obj('service', 'task')
        if recovered_service['metadata']['uid'] != service['metadata']['uid'] or recovered_service['spec'] != service['spec']:
            raise RuntimeError('Scheduling repair must not replace or reconfigure the Service')
        slices = self.obj('endpointslices', '-l', 'kubernetes.io/service-name=task')
        endpoints = scheduling_endpoints(slices, service, self.name)
        pods = [item for item in self.obj('pods', '-l', 'app=task')['items'] if not item['metadata'].get('deletionTimestamp')]
        if len(pods) != 1:
            raise RuntimeError('Exactly one current repaired application Pod required')
        pod = pods[0]
        owner = next(item for item in pod['metadata']['ownerReferences'] if item.get('kind') == 'ReplicaSet' and item.get('controller') is True)
        replica_set = self.obj('replicaset', owner['name'])
        recovered = validate_scheduling_recovery(pod, replica_set, deployment_uid, self.name, pending['podUid'], endpoints)
        self.save('scheduled-pod.json', pod)
        self.save('scheduled-replicaset.json', replica_set)
        self.save('scheduled-endpoint-slices.json', slices)
        self.save('scheduling-recovered-service.json', recovered_service)
        recovered_deployment = self.obj('deployment', 'task')
        if recovered_deployment['metadata']['uid'] != deployment_uid or recovered_deployment['spec']['replicas'] != 1 or recovered_deployment['spec']['template']['spec'].get('nodeSelector'):
            raise RuntimeError('Repair must retain the owned Deployment with one unconstrained desired replica')
        self.save('scheduling-recovered-deployment.json', recovered_deployment)
        service = self.probe('up')
        if service.get('dnsResolved') is not True or service.get('authenticatedStatus') != 200:
            raise RuntimeError('Actual authenticated Service recovery required after selector repair')
        self.observations['scheduling'].update(recovered=recovered, recoveredService=service)
        self.observations['actualSchedulingCasesExecuted'] = 1
        self.observations['actualCasesExecuted'] += 1


    def resources(self):
        results = {}
        self.observations['resources'] = results
        for mode in RESOURCE_CASES:
            manifest = resource_manifest(self.name, self.image, mode)
            self.k('create', '-f', '-', data=json.dumps(manifest))
            def terminated_pod():
                pod = self.obj('pod', 'resource-'+mode)
                for status in pod.get('status', {}).get('containerStatuses', []):
                    if status.get('state', {}).get('terminated'):
                        return pod
                return None
            pod = self.until(mode+' resource Pod termination', terminated_pod, 45)
            if pod['metadata']['labels'].get('lab.csfundamentals/owner') != self.name:
                raise RuntimeError('Resource Pod ownership changed')
            statuses = pod['status']['containerStatuses']
            if len(statuses) != 1 or statuses[0].get('restartCount') != 0:
                raise RuntimeError('Resource cases require one observed process without restart')
            terminated = statuses[0]['state']['terminated']
            logs = self.k('logs', 'resource-'+mode, '--tail=40').stdout.strip()
            result = {'podUid': pod['metadata']['uid'], 'restartCount': 0,
                      'termination': terminated, 'limits': manifest['spec']['containers'][0]['resources']['limits']}
            results[mode] = result
            self.save('resource-'+mode+'-pod.json', pod)
            self.save('resource-'+mode+'.log', logs)
            validate_resource_termination(mode, terminated, logs)
            if mode == 'cpu':
                result['observation'] = validate_cpu_observation(json.loads(logs))
        self.observations['resources'] = results
        self.observations['actualResourceCasesExecuted'] = 3
        self.observations['actualCasesExecuted'] += 3

    def cleanup(self):
        if self.created:
            cleanup()
        elif self.images_owned:
            for image in [self.image,self.base_image]:
                execute(['docker','image','rm',image],timeout=30,check=False)


def cleanup():
    if not STATE.exists():
        return
    state = json.loads(STATE.read_text())
    if state.get('schemaVersion') != 1:
        raise ValueError('Unrecognized ownership state')
    name = checked_name(state['name'])
    require_local_docker()
    # Explicit name and private kubeconfig: never default kind cluster or user kubecontext.
    execute(['kind','delete','cluster','--name',name,'--kubeconfig',str(BUILD/'kubeconfig')],timeout=90)
    if name in execute(['kind','get','clusters']).stdout.split():
        raise RuntimeError('Owned cluster still exists after cleanup')
    for image in [f'cs-operations:{name}',f'cs-operations-base:{name}']:
        removed = execute(['docker','image','rm',image],timeout=30,check=False)
        if removed.returncode and execute(['docker','image','inspect',image],check=False).returncode == 0:
            raise RuntimeError('Owned image tag remains after cleanup; state retained for retry')
    (BUILD/'kubeconfig').unlink(missing_ok=True)
    STATE.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-cluster',action='store_true')
    parser.add_argument('--cleanup',action='store_true')
    args = parser.parse_args()
    if args.cleanup:
        cleanup()
        return
    if not args.run_cluster:
        parser.error('Actual cluster creation requires --run-cluster; native contract tests are separate')
    def interrupted(signum,frame):
        raise SystemExit(f'Interrupted by signal {signum}; cleaning owned cluster')
    signal.signal(signal.SIGTERM,interrupted)
    lab = Lab('ops-'+secrets.token_hex(8))
    try:
        lab.prepare()
        lab.journey()
        lab.pending_scheduling()
        lab.resources()
    finally:
        try:
            lab.cleanup()
            lab.observations['cleanupVerified'] = True
        finally:
            if EVIDENCE.exists():
                lab.save('result.json',lab.observations)
    print(json.dumps(lab.observations,indent=2))


if __name__=='__main__':
    main()
