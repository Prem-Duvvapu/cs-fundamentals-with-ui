#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=../start.sh
source "$REPO_DIR/start.sh"

validate_port BACKEND_PORT 9190
if validate_port FRONTEND_PORT invalid 2>/dev/null; then
  echo "Expected a non-numeric port to be rejected" >&2
  exit 1
fi
if validate_port FRONTEND_PORT 70000 2>/dev/null; then
  echo "Expected an out-of-range port to be rejected" >&2
  exit 1
fi

port_in_use() { return 1; }
BACKEND_PORT_START=9190
FRONTEND_PORT_START=9190
choose_ports
if [ "$BACKEND_PORT" != 9190 ] || [ "$FRONTEND_PORT" != 9191 ]; then
  echo "Equal requested ports must resolve to distinct listeners" >&2
  exit 1
fi

echo "start.sh validation tests passed"
