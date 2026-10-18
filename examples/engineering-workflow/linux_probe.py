"""Inspect only the PID, socket inode and file created by the owned probe."""
from pathlib import Path
import json
import os
import selectors
import socket
import stat
import subprocess
import sys
from commands import LabFailure, environment, stop


def exercise(root, budget, *, fail_live=False, observe=None):
    root.mkdir()
    source = Path(__file__).resolve().parent / 'owned_probe.py'
    path = root / 'ticket-state.txt'
    process = subprocess.Popen([sys.executable, source, path], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                               stderr=subprocess.DEVNULL, env=environment(), start_new_session=True)
    try:
        if observe:
            observe('pid', process.pid)
        with selectors.DefaultSelector() as selector:
            selector.register(process.stdout, selectors.EVENT_READ)
            if not selector.select(min(5, budget.remaining())):
                raise LabFailure('Owned Linux probe readiness deadline')
            ready = json.loads(process.stdout.readline(1024))
        if ready['pid'] != process.pid:
            raise LabFailure('Owned PID identity mismatch')
        if fail_live:
            raise LabFailure('Injected failure with owned Linux child alive')
        status = Path(f'/proc/{process.pid}/status').read_text()
        identity = {line.split(':', 1)[0]: line.split(':', 1)[1].strip() for line in status.splitlines() if line.startswith(('Name:', 'State:', 'PPid:'))}
        held_link = Path(f'/proc/{process.pid}/fd/{ready["file_fd"]}')
        if Path(os.readlink(held_link)) != path:
            raise LabFailure('Owned held-file identity mismatch')
        socket_link = os.readlink(f'/proc/{process.pid}/fd/{ready["socket_fd"]}')
        inode = socket_link.removeprefix('socket:[').removesuffix(']')
        tcp = None
        for line in Path(f'/proc/{process.pid}/net/tcp').read_text().splitlines()[1:]:
            fields = line.split()
            if fields[9] == inode:
                tcp = {'address': fields[1], 'state': fields[3], 'inode': inode}
        expected = f'0100007F:{ready["port"]:04X}'
        if tcp is None or tcp['address'] != expected or tcp['state'] != '0A':
            raise LabFailure('Owned listening socket is not the expected loopback inode')

        def request():
            with socket.create_connection(('127.0.0.1', ready['port']), timeout=min(2, budget.remaining())) as peer:
                peer.sendall(b'STATUS\n')
                response = bytearray()
                while len(response) < 32 and not response.endswith(b'\n'):
                    chunk = peer.recv(32 - len(response))
                    if not chunk:
                        break
                    response.extend(chunk)
                return response.decode()

        before = stat.S_IMODE(path.stat().st_mode)
        path.chmod(0); mode_zero = stat.S_IMODE(path.stat().st_mode); after_chmod = request()
        path.chmod(0o600); path.unlink(); deleted_link = os.readlink(held_link); after_unlink = request()
        if (before, mode_zero, after_chmod, after_unlink) != (0o600, 0, 'pending=3\n', 'pending=3\n') or not deleted_link.endswith(' (deleted)'):
            raise LabFailure('Owned file-descriptor observations differ from expected Linux behavior')
        process.stdin.write(b'QUIT\n'); process.stdin.flush(); process.wait(timeout=min(2, budget.remaining()))
        return {'pid': process.pid, 'process': identity, 'socket': tcp, 'port': ready['port'], 'mode_before': '0600', 'mode_after_chmod': '0000',
                'existing_fd_read_after_chmod': after_chmod.strip(), 'deleted_fd_visible': True, 'existing_fd_read_after_unlink': after_unlink.strip(), 'owned_child_exited': process.returncode == 0,
                'scope': 'Owned loopback process and held descriptor only; chmod does not revoke an already-open descriptor'}
    finally:
        stop(process); process.stdin.close(); process.stdout.close()
