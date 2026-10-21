"""Isolated, bounded resolver worker; no URL fetch or arbitrary executable interface."""
import json
import resource
import socket
import sys
import time


def main():
    resource.setrlimit(resource.RLIMIT_AS, (128 * 1024 * 1024,) * 2)
    resource.setrlimit(resource.RLIMIT_CPU, (2, 2))
    resource.setrlimit(resource.RLIMIT_NOFILE, (32, 32))
    raw = sys.stdin.buffer.read(4097)
    if len(raw) > 4096:
        raise ValueError('resolver_input_limit')
    request = json.loads(raw)
    if request.get('fixture') is not None:
        # Only an operator-created resolver object supplies this controlled test plan.
        plan = request['fixture']
        time.sleep(min(5, max(0, float(plan.get('sleep', 0)))))
        answers = plan.get('answers', [])
    else:
        records = socket.getaddrinfo(request['host'], request['port'], type=socket.SOCK_STREAM)
        answers = []
        for family, kind, protocol, canonical, address in records:
            item = {'family': family, 'address': address[0]}
            if item not in answers:
                answers.append(item)
            if len(answers) > 8:
                raise ValueError('resolver_answer_limit')
    if not isinstance(answers, list) or len(answers) > 8:
        raise ValueError('resolver_answer_limit')
    output = json.dumps(answers, separators=(',', ':'))
    if len(output) > 2048:
        raise ValueError('resolver_output_limit')
    print(output)


if __name__ == '__main__':
    main()
