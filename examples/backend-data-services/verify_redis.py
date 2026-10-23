"""Run real Redis cases using private owned children; never alter a global service."""
from contextlib import contextmanager
import json
import os
from pathlib import Path
import secrets
import shutil
import signal
import socket
import subprocess
import tempfile
import threading
import time
import xml.etree.ElementTree as ET
import verify_cache_recovery

ROOT = Path(__file__).resolve().parent
_cancellation = threading.local()


class Cancelled(RuntimeError): pass


@contextmanager
def cancellation_signals():
    """Executable opt-in only; preserve caller handlers/masks and rollback partial entry."""
    if threading.current_thread() is not threading.main_thread():
        yield; return
    previous={number:signal.getsignal(number) for number in (signal.SIGTERM,signal.SIGINT)}
    outer=getattr(_cancellation,'state',None)
    state=dict(depth=0,requested=False,delivered=False)
    def cancel(_number,_frame):
        if state['requested']: return
        state['requested']=True
        if not state['depth']:
            state['delivered']=True;raise Cancelled('owned_redis_cancelled')
    try:
        _cancellation.state=state
        for number in previous:signal.signal(number,cancel)
        yield
    finally:
        for number,handler in previous.items():signal.signal(number,handler)
        _cancellation.state=outer


@contextmanager
def defer_cancellation():
    state=getattr(_cancellation,'state',None)
    if state is None:yield;return
    state['depth']+=1
    try:yield
    finally:
        state['depth']-=1
        if not state['depth'] and state['requested'] and not state['delivered']:
            state['delivered']=True;raise Cancelled('owned_redis_cancelled')


def stop(process):
    # A new-session group remains owned even if its launcher already exited.
    try:
        os.killpg(process.pid,signal.SIGTERM)
        try:process.wait(timeout=2)
        except subprocess.TimeoutExpired:pass
        try:os.killpg(process.pid,signal.SIGKILL)
        except ProcessLookupError:pass
    except ProcessLookupError:pass
    process.wait(timeout=3)


@contextmanager
def owned_process(command,**options):
    process=None
    try:
        with defer_cancellation():
            process=subprocess.Popen(command,start_new_session=True,**options)
        yield process
    finally:
        if process is not None:
            with defer_cancellation():
                try:stop(process)
                finally:
                    for stream in (process.stdin,process.stdout,process.stderr):
                        if stream is not None:stream.close()


def resp(*parts):
    encoded=[part.encode() for part in parts]
    return b'*'+str(len(parts)).encode()+b'\r\n'+b''.join(b'$'+str(len(part)).encode()+b'\r\n'+part+b'\r\n' for part in encoded)


def verify():
    executable=shutil.which('redis-server')
    if not executable:raise RuntimeError('redis_server_not_installed_use_pinned_ci')
    password=secrets.token_hex(32)
    with tempfile.TemporaryDirectory(prefix='cs-owned-redis-') as temporary:
        directory=Path(temporary)
        with socket.socket() as reserved:
            reserved.bind(('127.0.0.1',0));port=reserved.getsockname()[1]
        configuration=directory/'redis.conf'
        configuration.write_text(f'bind 127.0.0.1\nport {port}\nprotected-mode yes\nrequirepass {password}\nsave ""\nappendonly no\ndaemonize no\ndir {directory}\nmaxmemory 32mb\nmaxmemory-policy allkeys-lru\n')
        configuration.chmod(0o600)
        with (directory/'redis.log').open('w') as log,owned_process([executable,str(configuration)],stdout=log,stderr=subprocess.STDOUT) as redis:
            expires=time.monotonic()+8
            while True:
                if redis.poll() is not None:raise RuntimeError('owned_redis_exited_no_existing_service_reused')
                try:
                    with socket.create_connection(('127.0.0.1',port),timeout=.3) as connection:
                        connection.settimeout(.3);connection.sendall(resp('AUTH',password)+resp('PING'))
                        with connection.makefile('rb') as output:
                            if output.readline(128)==b'+OK\r\n' and output.readline(128)==b'+PONG\r\n':break
                except OSError:pass
                if time.monotonic()>=expires:raise RuntimeError('owned_redis_readiness_deadline')
                time.sleep(.05)
            environment={**os.environ,'DATA_REDIS_INTEGRATION':'1','DATA_REDIS_PORT':str(port),'DATA_REDIS_PASSWORD':password}
            with owned_process(['mvn','-B','--no-transfer-progress','-f',str(ROOT/'pom.xml'),
                                '-Dtest=RedisIntegrationTests,CacheRecoveryRedisTests','test'],env=environment) as maven:
                if maven.wait(timeout=120)!=0:raise RuntimeError('actual_redis_tests_failed')
            report=ET.parse(ROOT/'target/surefire-reports/TEST-com.csfundamentals.dataservices.RedisIntegrationTests.xml').getroot()
            if report.get('tests')!='4' or any(int(report.get(key,'0')) for key in ('skipped','errors','failures')):
                raise RuntimeError('all_four_original_redis_cases_required')
            evidence=verify_cache_recovery.validate()
    if directory.exists() or redis.returncode is None or maven.returncode is None:raise RuntimeError('owned_redis_cleanup_incomplete')
    print(json.dumps(dict(actualNativeRedis=evidence['redisVersion'],executedCases=9,skipped=0,
        ownedWorkspaceRemoved=True,ownedChildrenReaped=True,scope='owned authenticated local Redis and controlled origin; MongoDB not exercised')))


if __name__=='__main__':
    try:
        with cancellation_signals():verify()
    except (Exception,KeyboardInterrupt):
        raise SystemExit('Owned Redis verification failed or cancelled; inspect scoped test reports. No actual-service pass claimed.') from None
