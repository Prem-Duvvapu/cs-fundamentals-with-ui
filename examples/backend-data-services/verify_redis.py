"""Run only real Redis cases using a private native child; never alter a global service."""
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import tempfile
import time
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent


def resp(*parts):
    encoded = [part.encode() for part in parts]
    return b'*' + str(len(parts)).encode() + b'\r\n' + b''.join(
        b'$' + str(len(part)).encode() + b'\r\n' + part + b'\r\n' for part in encoded)


def verify():
    executable = shutil.which('redis-server')
    if not executable:
        raise SystemExit('redis-server not installed; use the pinned dedicated CI job instead')
    password = secrets.token_hex(32)
    with tempfile.TemporaryDirectory(prefix='cs-owned-redis-') as temporary:
        directory = Path(temporary)
        with socket.socket() as reserved:
            reserved.bind(('127.0.0.1', 0))
            port = reserved.getsockname()[1]
        configuration = directory / 'redis.conf'
        configuration.write_text(f'bind 127.0.0.1\nport {port}\nprotected-mode yes\nrequirepass {password}\nsave ""\nappendonly no\ndaemonize no\ndir {directory}\nmaxmemory 32mb\nmaxmemory-policy allkeys-lru\n')
        configuration.chmod(0o600)
        with (directory / 'redis.log').open('w') as log:
            process = subprocess.Popen([executable, str(configuration)], stdout=log, stderr=subprocess.STDOUT)
            try:
                expires = time.monotonic() + 8
                while True:
                    if process.poll() is not None:
                        raise RuntimeError('Owned Redis exited before readiness; no existing service is reused')
                    try:
                        with socket.create_connection(('127.0.0.1', port), timeout=0.3) as connection:
                            connection.settimeout(0.3)
                            connection.sendall(resp('AUTH', password) + resp('PING'))
                            output = connection.makefile('rb')
                            try:
                                if output.readline() == b'+OK\r\n' and output.readline() == b'+PONG\r\n':
                                    break
                            finally:
                                output.close()
                    except OSError:
                        pass
                    if time.monotonic() >= expires:
                        raise RuntimeError('Owned Redis did not authenticate before readiness deadline')
                    time.sleep(0.05)
                environment = {**os.environ, 'DATA_REDIS_INTEGRATION': '1',
                               'DATA_REDIS_PORT': str(port), 'DATA_REDIS_PASSWORD': password}
                subprocess.run(['mvn', '-B', '--no-transfer-progress', '-f', str(ROOT / 'pom.xml'),
                                '-Dtest=RedisIntegrationTests', 'test'], env=environment, check=True, timeout=120)
                report = ET.parse(ROOT / 'target/surefire-reports/TEST-com.csfundamentals.dataservices.RedisIntegrationTests.xml').getroot()
                if report.get('tests') != '4' or any(int(report.get(key, '0')) for key in ('skipped', 'errors', 'failures')):
                    raise RuntimeError('All four real Redis cases must run and pass without skips')
                version = subprocess.run([executable, '--version'], capture_output=True, text=True, check=True, timeout=3).stdout.strip()
                print(json.dumps({'actual_native_redis': version, 'executed_cases': 4, 'skipped': 0,
                                  'scope': 'owned authenticated local process; MongoDB not exercised'}))
            finally:
                if process.poll() is None:
                    process.terminate()
                    try:
                        process.wait(timeout=3)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait(timeout=3)


if __name__ == '__main__':
    verify()
