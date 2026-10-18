"""One owned process/socket/file; stdin EOF or QUIT releases every resource."""
from pathlib import Path
import json
import os
import selectors
import socket
import sys


def main():
    path = Path(sys.argv[1])
    path.write_text('pending=3\n'); path.chmod(0o600)
    with path.open() as held, socket.socket() as listener, selectors.DefaultSelector() as selector:
        listener.bind(('127.0.0.1', 0)); listener.listen(1)
        selector.register(listener, selectors.EVENT_READ); selector.register(sys.stdin, selectors.EVENT_READ)
        print(json.dumps({'pid': os.getpid(), 'port': listener.getsockname()[1], 'file_fd': held.fileno(), 'socket_fd': listener.fileno()}), flush=True)
        while True:
            for key, _ in selector.select():
                if key.fileobj is sys.stdin:
                    if not sys.stdin.readline() or sys.stdin.closed:
                        return
                    return
                connection, _ = listener.accept()
                with connection:
                    connection.settimeout(1)
                    request = bytearray()
                    while len(request) < 32 and not request.endswith(b'\n'):
                        chunk = connection.recv(32 - len(request))
                        if not chunk:
                            return
                        request.extend(chunk)
                    if request != b'STATUS\n':
                        return
                    held.seek(0); connection.sendall(held.read(32).encode())


if __name__ == '__main__':
    main()
