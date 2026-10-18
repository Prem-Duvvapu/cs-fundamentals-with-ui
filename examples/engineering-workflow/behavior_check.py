"""A git-bisect oracle: execute the independent Java business contract, not a compile-only test."""
from pathlib import Path
import argparse
import json
import tempfile
from commands import Budget, LabFailure, run

FIXTURES = Path(__file__).resolve().parent / 'fixtures'


def check(repo, builds, budget, *, new_session=True):
    builds.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='java-check-', dir=builds) as temporary:
        code, output = run(['javac', '--release', '17', '-d', temporary, repo / 'TicketRouter.java', FIXTURES / 'RouterContract.java'], repo, budget, check=False, new_session=new_session)
        if code:
            return 125, {'compiled': False, 'reason': 'Unbuildable revision; bisect must skip', 'diagnostic': output[-600:]}
        code, output = run(['java', '-cp', temporary, 'RouterContract', FIXTURES / 'routing-golden.tsv'], repo, budget, check=False, new_session=new_session)
        return (0 if code == 0 else 1), {'compiled': True, 'passed': code == 0, 'behavior': output}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--builds', type=Path, required=True)
    parser.add_argument('--history', type=Path, required=True)
    args = parser.parse_args()
    try:
        code, evidence = check(args.repo, args.builds, Budget.start(45), new_session=False)
        _, commit = run(['git', '-C', args.repo, 'rev-parse', 'HEAD'], args.repo, Budget.start(5), new_session=False)
        with args.history.open('a') as output:
            output.write(json.dumps({'commit': commit.strip(), 'exit': code, 'compiled': evidence['compiled']}) + '\n')
        print('Golden Java behavior:', 'good' if code == 0 else 'bad' if code == 1 else 'skip')
        return code
    except LabFailure as failure:
        print(str(failure)); return 125


if __name__ == '__main__':
    raise SystemExit(main())
