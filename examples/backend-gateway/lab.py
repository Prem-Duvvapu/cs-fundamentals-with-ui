"""Real Nginx -> unchanged Task Tracker. Only exact owned Docker resources are touched."""
import argparse
import base64
from concurrent.futures import ThreadPoolExecutor
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import secrets
import threading
import time

from commands import Budget, LabFailure, cancellation_guard, defer_cancellation, run

ROOT = Path(__file__).resolve().parent
BUILD = ROOT/'build'
EVIDENCE = BUILD/'evidence'
STATE = BUILD/'owner.json'
OWNER_LABEL = 'lab.csfundamentals/gateway-owner'
NGINX = 'nginx:1.30.6-alpine@sha256:970364228b1e4f932abc22d321932816782cca8a20b85a77552a7cfe9acfb3b5'
BASE_PINS = {'maven:3.9-eclipse-temurin-17':'sha256:1a352420f7aba21f5ad08df31bab55f74c013fb491f1ae8ab1dd7ff9ed698584',
             'eclipse-temurin:17-jre':'sha256:e04fa72be13b257a59fdec6dc14af78c8f80f035d3c1ed4e03e45552a231d4c8'}


def checked_name(name):
    if not isinstance(name,str) or not re.fullmatch(r'gw-[a-f0-9]{16}',name):
        raise ValueError('exact_owned_gateway_name_required')
    return name


def pinned_dockerfile(source):
    if [line for line in source.splitlines() if line.startswith('FROM ')] != ['FROM maven:3.9-eclipse-temurin-17 AS build','FROM eclipse-temurin:17-jre']:
        raise ValueError('review_task_tracker_build_stages_before_execution')
    for image,digest in BASE_PINS.items():
        source=source.replace('FROM '+image,'FROM '+image+'@'+digest)
    return source


def local_docker(budget):
    if os.environ.get('DOCKER_HOST') or os.environ.get('DOCKER_CONTEXT'):
        raise LabFailure('docker_host_and_context_overrides_refused')
    _,endpoint=run(['docker','context','inspect','--format','{{.Endpoints.docker.Host}}'],ROOT,budget)
    if not endpoint.strip().startswith('unix://'):
        raise LabFailure('local_unix_docker_daemon_required')
    run(['docker','info','--format','{{.ServerVersion}}'],ROOT,budget)


def inspect_for_cleanup(kind,resource,budget):
    code,raw=run(['docker',kind,'inspect',resource],ROOT,budget,check=False)
    if code:
        text=raw.lower()
        missing=('no such '+kind in text or 'no such object' in text
                 or kind=='network' and 'network ' in text and ' not found' in text)
        if not missing or resource.lower() not in text:
            raise LabFailure('cannot_confirm_exact_owned_resource_absent')
        return None
    values=json.loads(raw)
    if not isinstance(values,list) or len(values)!=1:
        raise LabFailure('exact_single_resource_inspection_required')
    return values[0]


def published_gateway_port(edge):
    published=edge.get('NetworkSettings',{}).get('Ports',{}).get('8080/tcp')
    if not isinstance(published,list) or len(published)!=1 or published[0].get('HostIp')!='127.0.0.1':
        raise LabFailure('only_exact_loopback_gateway_publish_allowed')
    raw=published[0].get('HostPort','')
    if not isinstance(raw,str) or not re.fullmatch('[0-9]{1,5}',raw) or not 1<=int(raw)<=65535:
        raise LabFailure('valid_gateway_host_port_required')
    return int(raw)


def cleanup():
    if not STATE.exists():
        return
    state=json.loads(STATE.read_text())
    name=checked_name(state['name'])
    if state.get('schemaVersion')!=1:
        raise ValueError('unknown_gateway_owner_state')
    budget=Budget.start(120)
    local_docker(budget)
    for kind,names in [('container',[name+'-edge',name+'-probe',name+'-task']),('network',[name+'-ingress',name])]:
        for resource in names:
            item=inspect_for_cleanup(kind,resource,budget)
            if item is None:
                continue
            labels=item['Config']['Labels'] if kind=='container' else item['Labels']
            if not labels or labels.get(OWNER_LABEL)!=name:
                raise LabFailure('refusing_resource_with_changed_ownership')
            identifier=item['Id']
            command=['docker','container','rm','-f','-v',identifier] if kind=='container' else ['docker','network','rm',identifier]
            run(command,ROOT,budget,timeout=20)
            if inspect_for_cleanup(kind,identifier,budget) is not None:
                raise LabFailure('owned_resource_still_present_after_cleanup')
    for image in ['gateway-lab:'+name,'gateway-base:'+name]:
        item=inspect_for_cleanup('image',image,budget)
        if item is None:
            continue
        if (item.get('Config',{}).get('Labels') or {}).get(OWNER_LABEL)!=name:
            raise LabFailure('refusing_image_with_changed_ownership')
        run(['docker','image','rm',image],ROOT,budget,timeout=20)
        if inspect_for_cleanup('image',image,budget) is not None:
            raise LabFailure('owned_image_tag_still_present')
    # An unavailable daemon must never turn failed inspect calls into cleanup evidence.
    local_docker(budget)
    (BUILD/'private.env').unlink(missing_ok=True)
    STATE.unlink()


class Lab:
    def __init__(self,name):
        self.name=checked_name(name)
        self.base='gateway-base:'+name
        self.image='gateway-lab:'+name
        self.passwords={key:secrets.token_urlsafe(24) for key in ['TASK_TRACKER_ALICE_PASSWORD','TASK_TRACKER_BOB_PASSWORD','TASK_TRACKER_VIEWER_PASSWORD','SPRING_DATASOURCE_PASSWORD']}
        self.budget=Budget.start()
        self.port=None
        self.calls=0
        self.lock=threading.Lock()
        self.cases=[]
        self.observations={'schemaVersion':1,'scenario':'actual-nginx-task-tracker-http','cases':self.cases}
        self.owns=False

    def command(self,args,**kwargs):
        return run(args,ROOT,self.budget,**kwargs)

    def save(self,name,value):
        text=json.dumps(value,indent=2) if not isinstance(value,str) else value
        for password in self.passwords.values():
            text=text.replace(password,'[REDACTED]')
        for user,key in [('alice','TASK_TRACKER_ALICE_PASSWORD'),('bob','TASK_TRACKER_BOB_PASSWORD'),('viewer','TASK_TRACKER_VIEWER_PASSWORD')]:
            text=text.replace(base64.b64encode((user+':'+self.passwords[key]).encode()).decode(),'[REDACTED]')
        if len(text.encode())>65536:
            raise LabFailure('sanitized_evidence_output_limit')
        (EVIDENCE/name).write_text(text+'\n')

    def prepare(self):
        BUILD.mkdir(exist_ok=True,mode=0o700)
        os.chmod(BUILD,0o700)
        EVIDENCE.mkdir(exist_ok=True)
        if STATE.exists():
            raise LabFailure('previous_owned_state_requires_cleanup_first')
        local_docker(self.budget)
        for kind,names in [('container',[self.name+'-edge',self.name+'-probe',self.name+'-task']),('network',[self.name,self.name+'-ingress']),('image',[self.base,self.image])]:
            for name in names:
                if self.command(['docker',kind,'inspect',name],check=False)[0]==0:
                    raise LabFailure('refusing_existing_resource_collision')
        with defer_cancellation():
            STATE.write_text(json.dumps({'schemaVersion':1,'name':self.name}))
            os.chmod(STATE,0o600)
            self.owns=True
        env=BUILD/'private.env'
        env.write_text(''.join(key+'='+value+'\n' for key,value in self.passwords.items()))
        os.chmod(env,0o600)
        application=ROOT.parent/'java-spring/task-tracker'
        private=BUILD/'TaskTracker.Dockerfile'
        private.write_text(pinned_dockerfile((application/'Dockerfile').read_text()))
        self.command(['docker','build','--label',OWNER_LABEL+'='+self.name,'-f',str(private),'-t',self.base,str(application)],timeout=300,output_limit=1048576)
        context=BUILD/'image'
        context.mkdir(exist_ok=True)
        self.command(['javac','--release','17','-d',str(context),str(ROOT/'GatewayProbe.java')])
        (context/'Dockerfile').write_text('FROM '+self.base+'\nCOPY GatewayProbe.class /probe/GatewayProbe.class\n')
        self.command(['docker','build','--label',OWNER_LABEL+'='+self.name,'-t',self.image,str(context)],timeout=60)
        self.command(['docker','network','create','--internal','--label',OWNER_LABEL+'='+self.name,self.name])
        self.command(['docker','network','create','--driver','bridge','--label',OWNER_LABEL+'='+self.name,self.name+'-ingress'])
        common=['--detach','--network',self.name,'--label',OWNER_LABEL+'='+self.name,'--cap-drop','ALL','--security-opt','no-new-privileges','--read-only']
        self.command(['docker','run',*common,'--name',self.name+'-task','--network-alias','task','--memory','512m','--cpus','1','--pids-limit','128',
                      '--tmpfs','/tmp:rw,size=32m','--tmpfs','/app/data:rw,size=64m,uid=10001,gid=10001','--env-file',str(env),
                      '--env','JAVA_TOOL_OPTIONS=-Xms32m -Xmx128m -XX:ActiveProcessorCount=2 -XX:TieredStopAtLevel=1',
                      '--env','SERVER_FORWARD_HEADERS_STRATEGY=none',self.image,'--spring.profiles.active=production,observability','--server.address=0.0.0.0','--server.port=9191'])
        self.command(['docker','run',*common,'--name',self.name+'-probe','--network-alias','probe','--memory','96m','--cpus','.5','--pids-limit','32','--tmpfs','/tmp:rw,size=16m',
                      '--entrypoint','java',self.image,'-Xmx32m','-XX:ActiveProcessorCount=1','-cp','/probe','GatewayProbe','server'])
        self.command(['docker','run',*common,'--name',self.name+'-edge','--user','101:101','--memory','96m','--cpus','.5','--pids-limit','32',
                      '--tmpfs','/tmp:rw,size=16m,uid=101,gid=101','--tmpfs','/var/cache/nginx:rw,size=16m,uid=101,gid=101',
                      '--publish','127.0.0.1::8080','--mount','type=bind,src='+str(ROOT/'nginx.conf')+',dst=/etc/nginx/lab.conf,readonly',
                      '--mount','type=bind,src='+str(ROOT/'proxy-headers.conf')+',dst=/etc/nginx/proxy-headers.conf,readonly',
                      '--entrypoint','nginx',NGINX,'-c','/etc/nginx/lab.conf','-g','daemon off;'],timeout=90)
        _,raw=self.command(['docker','container','inspect',self.name+'-edge'])
        edge=json.loads(raw)[0]
        self.observations['beforeIngressPublished']=edge.get('NetworkSettings',{}).get('Ports',{}).get('8080/tcp')
        self.observations['gatewayRunningBeforeIngress']=edge.get('State',{}).get('Running')
        # Internal-only bridges may retain the request but omit the actual host mapping.
        # Give only the gateway an owned publishing network; backends retain internal isolation.
        self.command(['docker','network','connect',self.name+'-ingress',self.name+'-edge'])
        edge=json.loads(self.command(['docker','container','inspect',self.name+'-edge'])[1])[0]
        self.port=published_gateway_port(edge)
        if set(edge['NetworkSettings']['Networks'])!={self.name,self.name+'-ingress'}:
            raise LabFailure('gateway_requires_exact_private_and_ingress_networks')
        internal=json.loads(self.command(['docker','network','inspect',self.name])[1])[0]
        ingress=json.loads(self.command(['docker','network','inspect',self.name+'-ingress'])[1])[0]
        if internal.get('Internal') is not True or ingress.get('Internal') is not False:
            raise LabFailure('actual_private_backend_and_publishing_ingress_required')
        self.observations['networkIsolation']={'backendInternal':True,'ingressInternal':False,
            'gatewayNetworkCount':2,'backendNetworkCount':1,'actualPublishedHostIp':'127.0.0.1'}
        self.observations['dockerServerVersion']=self.command(['docker','version','--format','{{.Server.Version}}'])[1].strip()
        if edge['Config']['Image']!=NGINX or not re.fullmatch(r'sha256:[a-f0-9]{64}',edge['Image']):
            raise LabFailure('actual_digest_pinned_gateway_container_required')
        self.observations['gatewayContainerId']=edge['Id']
        self.observations['gatewayResolvedImageId']=edge['Image']
        for role in ['task','probe']:
            item=json.loads(self.command(['docker','container','inspect',self.name+'-'+role])[1])[0]
            if any(item['NetworkSettings'].get('Ports',{}).values()) or set(item['NetworkSettings']['Networks'])!={self.name}:
                raise LabFailure('application_and_fixture_ports_must_not_be_published')
        _,version=self.command(['docker','exec',self.name+'-edge','nginx','-V'])
        if 'nginx/1.30.6' not in version or '--with-http_auth_request_module' not in version:
            raise LabFailure('actual_pinned_nginx_and_auth_request_module_required')
        self.observations['nginxVersion']='1.30.6'
        self.observations['nginxImage']=NGINX
        self.command(['docker','exec',self.name+'-edge','nginx','-t','-c','/etc/nginx/lab.conf'])
        deadline=time.monotonic()+90
        while time.monotonic()<deadline:
            try:
                if self.request('GET','/_ready',case='startup')[0]==200:
                    return
            except (OSError,http.client.HTTPException):
                pass
            time.sleep(1)
        raise LabFailure('bounded_task_tracker_startup_failed')

    def request(self,method,path,body=None,headers=None,case='case',user=None,chunked=False):
        with self.lock:
            self.calls+=1
            if self.calls>128:
                raise LabFailure('http_call_budget_exceeded')
        if not re.fullmatch('[a-z0-9-]{1,32}',case) or not path.startswith('/') or len(path)>256:
            raise ValueError('fixed_owned_request_required')
        values={'Host':'gateway.example.test','X-Lab-Case':case,'Connection':'close'}
        if user:
            password=self.passwords['TASK_TRACKER_'+user.upper()+'_PASSWORD']
            values['Authorization']='Basic '+base64.b64encode((user+':'+password).encode()).decode()
        values.update(headers or {})
        connection=http.client.HTTPConnection('127.0.0.1',self.port,timeout=min(5,self.budget.remaining()))
        try:
            connection.request(method,path,body,values,encode_chunked=chunked)
            response=connection.getresponse()
            data=response.read(65537)
            if len(data)>65536:
                raise LabFailure('http_response_limit')
            return response.status,{key.lower():value for key,value in response.getheaders()},data
        finally:
            connection.close()

    def stalled_body(self,headers):
        with self.lock:
            self.calls+=1
            if self.calls>128:
                raise LabFailure('http_call_budget_exceeded')
        connection=http.client.HTTPConnection('127.0.0.1',self.port,timeout=min(5,self.budget.remaining()))
        try:
            connection.putrequest('POST','/api/projects',skip_host=True,skip_accept_encoding=True)
            connection.putheader('Host','gateway.example.test')
            connection.putheader('X-Lab-Case','stalled-body')
            connection.putheader('Connection','close')
            connection.putheader('Content-Length','100')
            credential='alice:'+self.passwords['TASK_TRACKER_ALICE_PASSWORD']
            connection.putheader('Authorization','Basic '+base64.b64encode(credential.encode()).decode())
            for key,value in headers.items():
                connection.putheader(key,value)
            connection.endheaders(b'{')
            response=connection.getresponse()
            response.read(65537)
            return response.status
        finally:
            connection.close()

    def require(self,description,condition):
        if not condition:
            raise LabFailure(description)
        self.cases.append(description)

    def token(self,user):
        status,headers,body=self.request('GET','/api/csrf',user=user,case='csrf')
        if status!=200:
            raise LabFailure('csrf_fetch_failed')
        value=json.loads(body)
        cookie=headers['set-cookie'].split(';',1)[0]
        return {'Cookie':cookie,value['headerName']:value['token'],'Content-Type':'application/json'}

    def edge_workers(self):
        _,processes=self.command(['docker','top',self.name+'-edge','-eo','pid,args'])
        workers={line.split()[0] for line in processes.splitlines() if 'nginx: worker process' in line}
        if any(not value.isdecimal() or len(value)>10 for value in workers):
            raise LabFailure('unexpected_owned_nginx_worker_identity')
        return workers

    def journey(self):
        forged={'Forwarded':'for=198.51.100.77;proto=https;host=evil.test','X-Forwarded-For':'198.51.100.77','X-Real-IP':'198.51.100.77',
                'X-Forwarded-Proto':'https','X-Forwarded-Host':'evil.test','X-Forwarded-Port':'443','X-Forwarded-Prefix':'/evil','X-User':'alice','X-Auth-Request-User':'alice','X-Forwarded-User':'alice'}
        self.require('unknown-host-400',self.request('GET','/api/projects',headers={'Host':'evil.test'},case='bad-host')[0]==400)
        status,challenge,_=self.request('GET','/headers',headers=forged,case='missing-auth')
        self.require('missing-auth-401-despite-identity-headers',status==401 and 'basic' in challenge.get('www-authenticate','').lower())
        self.require('invalid-auth-401',self.request('GET','/api/projects',headers={'Authorization':'Basic ZmFrZTpmYWtl'},case='invalid-auth')[0]==401)
        status,response_headers,body=self.request('GET','/headers',headers=forged,user='alice',case='headers')
        metadata=json.loads(body)
        self.require('forwarding-headers-sanitized',status==200 and 'set-cookie' not in response_headers and metadata['calls']==1 and metadata['Host']=='gateway.example.test' and metadata['X-Forwarded-Proto']=='http'
                     and metadata['X-Forwarded-For']==metadata['X-Real-IP'] and metadata['X-Real-IP']!='198.51.100.77'
                     and all(metadata[key]=='' for key in ['Forwarded','X-Forwarded-Host','X-Forwarded-Port','X-Forwarded-Prefix','X-User','X-Auth-Request-User','X-Forwarded-User']))
        self.observations['forwardedMetadata']=metadata
        self.observations['representativeNoCookieGetResponseSetCookie']=False
        _,direct=self.command(['docker','exec',self.name+'-probe','java','-Xmx32m','-XX:ActiveProcessorCount=1','-cp','/probe','GatewayProbe','direct'])
        self.require('direct-service-forged-identity-401',json.loads(direct)['directServiceStatus']==401)
        self.require('service-csrf-still-required',self.request('POST','/api/projects',b'{"name":"Gateway original"}',user='alice',headers={'Content-Type':'application/json'},case='csrf-denied')[0]==403)
        alice=self.token('alice')
        status,_,body=self.request('POST','/api/projects',b'{"name":"Gateway original"}',user='alice',headers=alice,case='create')
        self.require('authenticated-owner-create-201',status==201)
        identifier=json.loads(body)['id']
        self.require('owner-read-200',self.request('GET','/api/projects/'+str(identifier),user='alice',case='owner')[0]==200)
        self.require('different-owner-404-despite-forged-identity',self.request('GET','/api/projects/'+str(identifier),user='bob',headers=forged,case='other-owner')[0]==404)
        self.require('viewer-read-200',self.request('GET','/api/projects',user='viewer',case='viewer-read')[0]==200)
        viewer=self.token('viewer')
        self.require('viewer-write-403-with-valid-csrf',self.request('POST','/api/projects',b'{"name":"Denied"}',user='viewer',headers=viewer,case='viewer-write')[0]==403)
        self.require('body-cap-413',self.request('POST','/api/projects',b'x'*2048,user='alice',headers=alice,case='body-cap')[0]==413)
        self.require('chunked-body-cap-413',self.request('POST','/api/projects',iter([b'x'*600]*3),user='alice',headers=alice,case='chunked-cap',chunked=True)[0]==413)
        start=time.monotonic()
        self.require('stalled-body-inactivity-408',self.stalled_body(alice)==408)
        self.observations['stalledBodyElapsedMillis']=round((time.monotonic()-start)*1000)
        status,_,body=self.request('POST','/api/observability/probe?scenario=failure',b'',user='alice',headers=alice,case='upstream-503')
        self.require('genuine-task-tracker-503',status==503 and json.loads(body).get('detail')=='DEPENDENCY_FAILURE')
        start=time.monotonic()
        self.require('gateway-upstream-inactivity-504',self.request('POST','/timeout',b'',user='alice',headers=alice,case='timeout-504')[0]==504)
        self.observations['timeoutElapsedMillis']=round((time.monotonic()-start)*1000)
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures=[executor.submit(self.request,'GET','/limited',headers={'X-Forwarded-For':'198.51.100.'+str(index+1)},user='alice',case='rate-'+str(index)) for index in range(8)]
            results=[future.result(timeout=8) for future in futures]
        counts={str(status):sum(item[0]==status for item in results) for status in set(item[0] for item in results)}
        self.require('gateway-burst-429-and-admitted-200',counts.get('429',0)>0 and counts.get('200',0)>0 and set(counts)<=set(['200','429']))
        self.require('rate-limit-retry-guidance',all(headers.get('retry-after')=='1' for status,headers,_ in results if status==429))
        self.observations['burstStatuses']=counts
        before=self.edge_workers()
        if len(before)!=1:
            raise LabFailure('exact_initial_owned_nginx_worker_required')
        self.command(['docker','exec',self.name+'-edge','nginx','-t','-c','/etc/nginx/lab.conf'])
        self.command(['docker','exec',self.name+'-edge','nginx','-s','reload','-c','/etc/nginx/lab.conf'])
        deadline=time.monotonic()+5
        after=self.edge_workers()
        while (len(after)!=1 or not before.isdisjoint(after)) and time.monotonic()<deadline:
            time.sleep(.1)
            after=self.edge_workers()
        self.require('valid-reload-and-request-recovery',len(after)==1 and before.isdisjoint(after)
                     and self.request('GET','/api/projects',user='alice',case='reload')[0]==200)
        self.observations['reloadWorkers']={'before':sorted(before),'after':sorted(after)}
        _,logs=self.command(['docker','logs','--tail','200',self.name+'-edge'])
        self.save('gateway.log',logs)
        entries=[]
        for line in logs.splitlines():
            if line.startswith('{'):
                entries.append(json.loads(line))
        rate=[item for item in entries if item['case'].startswith('rate-') and item['status']==429]
        failure=[item for item in entries if item['case']=='upstream-503']
        observed_headers=[item for item in entries if item['case']=='headers']
        timeout=[item for item in entries if item['case']=='timeout-504']
        self.require('logs-separate-gateway-429-from-upstream-503',bool(rate) and all(item['limit']=='REJECTED' and item['upstream'] in ('','-') for item in rate)
                     and len(failure)==1 and failure[0]['status']==503 and failure[0]['upstream']=='503'
                     and len(observed_headers)==1 and observed_headers[0]['peer']==metadata['X-Real-IP']
                     and len(timeout)==1 and timeout[0]['status']==504 and timeout[0]['upstream']=='504')
        self.observations['statusEvidence']={'gatewayRejected':rate,'upstreamFailure':failure,'upstreamTimeout':timeout,'forwardingObservation':observed_headers}
        self.observations['actualCasesExecuted']=len(self.cases)
        self.observations['httpCalls']=self.calls
        self.observations['skipped']=0


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-docker',action='store_true')
    parser.add_argument('--cleanup',action='store_true')
    args=parser.parse_args()
    with cancellation_guard():
        if args.cleanup:
            cleanup(); return
        if not args.run_docker:
            parser.error('actual owned Docker run requires --run-docker; native guards are separate')
        lab=Lab('gw-'+secrets.token_hex(8))
        try:
            lab.prepare(); lab.journey()
        finally:
            try:
                if lab.owns:
                    cleanup()
                lab.observations['cleanupVerified']=True
            finally:
                if EVIDENCE.exists():
                    lab.observations['sourceSha256LF']={name:hashlib.sha256((ROOT/name).read_text().encode()).hexdigest() for name in ['lab.py','commands.py','GatewayProbe.java','nginx.conf','proxy-headers.conf']}
                    lab.save('result.json',lab.observations)
        print('Actual gateway cases passed:',len(lab.cases))


if __name__=='__main__':
    main()
