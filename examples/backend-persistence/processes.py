"""Finite local commands and opt-in cancellation of exact newly owned process groups."""
from contextlib import contextmanager
from dataclasses import dataclass
import os
import selectors
import signal
import subprocess
import threading
import time


class LabFailure(RuntimeError):
    pass


_cancellation=threading.local()


@contextmanager
def cancellation_guard():
    if threading.current_thread() is not threading.main_thread():
        yield
        return
    previous={number:signal.getsignal(number) for number in (signal.SIGTERM,signal.SIGINT)}
    outer=getattr(_cancellation,'state',None)
    state={'depth':0,'requested':False,'delivered':False}
    def cancel(_number,_frame):
        if state['requested']:
            return  # Repeated signals cannot interrupt finite owned cleanup.
        state['requested']=True
        if not state['depth']:
            state['delivered']=True
            raise LabFailure('Owned persistence verification cancelled')
    try:
        _cancellation.state=state
        for number in previous:
            signal.signal(number,cancel)
        yield
    finally:
        for number,handler in previous.items():
            signal.signal(number,handler)
        _cancellation.state=outer


@contextmanager
def defer_cancellation():
    state=getattr(_cancellation,'state',None)
    if state is None:
        yield
        return
    state['depth']+=1
    try:
        yield
    finally:
        state['depth']-=1
        if not state['depth'] and state['requested'] and not state['delivered']:
            state['delivered']=True
            raise LabFailure('Owned persistence verification cancelled')


@dataclass
class Budget:
    deadline:float
    @classmethod
    def start(cls,seconds=480):
        if not 0<seconds<=600:
            raise ValueError('Finite persistence budget required')
        return cls(time.monotonic()+seconds)
    def remaining(self):
        value=self.deadline-time.monotonic()
        if value<=0:
            raise LabFailure('Owned persistence execution deadline')
        return value


def environment():
    removed={'JAVA_TOOL_OPTIONS','JDK_JAVA_OPTIONS','_JAVA_OPTIONS','MAVEN_OPTS','MAVEN_ARGS','MAVEN_EXT_CLASS_PATH',
             'MAVEN_HOME','M2_HOME','MAVEN_PROJECTBASEDIR','CLASSPATH','PYTHONPATH','PYTHONSTARTUP','PYTHONINSPECT'}
    values={key:value for key,value in os.environ.items() if key not in removed and not key.startswith(('PG','PERSISTENCE_','SPRING_','SERVER_','MANAGEMENT_','OTEL_'))}
    values.update(LC_ALL='C.UTF-8',MAVEN_OPTS='-Xmx128m -Djava.awt.headless=true',MAVEN_SKIP_RC='1')
    return values


def stop(process,group=True):
    # The launcher may already be terminal while its descendants still hold pipe descriptors.
    if group:
        try:
            os.killpg(process.pid,signal.SIGTERM)
        except ProcessLookupError:
            pass
    elif process.poll() is None:
        process.terminate()
    try:
        process.wait(timeout=.5)
    except subprocess.TimeoutExpired:
        pass
    if group:
        try:
            os.killpg(process.pid,signal.SIGKILL)
        except ProcessLookupError:
            pass
    elif process.poll() is None:
        process.kill()
    process.wait(timeout=2)


def run(args,cwd,budget,*,env=None,input_bytes=None,timeout=30,output_limit=1048576,new_session=True):
    if not 0<timeout<=240 or not 1<=output_limit<=2097152 or input_bytes is not None and len(input_bytes)>1048576:
        raise ValueError('Finite process, output and input limits required')
    deadline=time.monotonic()+min(timeout,budget.remaining())
    process=None
    output={'stdout':bytearray(),'stderr':bytearray()}
    pending=memoryview(input_bytes or b'')
    try:
        with defer_cancellation():
            process=subprocess.Popen([str(value) for value in args],cwd=cwd,env=env if env is not None else environment(),
                stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=new_session)
        with selectors.DefaultSelector() as selector:
            for stream in (process.stdin,process.stdout,process.stderr):
                os.set_blocking(stream.fileno(),False)
            selector.register(process.stdout,selectors.EVENT_READ,'stdout')
            selector.register(process.stderr,selectors.EVENT_READ,'stderr')
            if pending:
                selector.register(process.stdin,selectors.EVENT_WRITE,'input')
            else:
                process.stdin.close()
            while selector.get_map():
                remaining=deadline-time.monotonic()
                if remaining<=0:
                    raise LabFailure('Owned process deadline')
                for key,_ in selector.select(remaining):
                    if key.data=='input':
                        try:
                            count=os.write(key.fd,pending[:8192]); pending=pending[count:]
                        except BlockingIOError:
                            continue
                        except BrokenPipeError:
                            pending=memoryview(b'')
                        if not pending:
                            selector.unregister(key.fileobj); key.fileobj.close()
                    else:
                        try:
                            chunk=os.read(key.fd,8192)
                        except BlockingIOError:
                            continue
                        if not chunk:
                            selector.unregister(key.fileobj)
                        else:
                            output[key.data].extend(chunk)
                            if sum(map(len,output.values()))>output_limit:
                                raise LabFailure('Owned process output limit')
            try:
                code=process.wait(timeout=max(.001,deadline-time.monotonic()))
            except subprocess.TimeoutExpired:
                raise LabFailure('Owned process completion deadline') from None
            return subprocess.CompletedProcess(args,code,bytes(output['stdout']),bytes(output['stderr']))
    finally:
        if process is not None:
            with defer_cancellation():
                stop(process,new_session)
                for stream in (process.stdin,process.stdout,process.stderr):
                    stream.close()
