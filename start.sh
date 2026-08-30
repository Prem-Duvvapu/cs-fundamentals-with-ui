#!/usr/bin/env bash
# Keep this file LF-only; CRLF makes Linux interpret the shebang as `bash\r`.
set -Eeuo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT_START="${BACKEND_PORT:-9190}"
FRONTEND_PORT_START="${FRONTEND_PORT:-3000}"
BACKEND_PID=""
FRONTEND_PID=""

port_in_use() {
  local port="$1"
  if command -v lsof >/dev/null; then
    lsof -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1
  elif command -v ss >/dev/null; then
    ss -ltn "sport = :$port" | grep -q LISTEN
  else
    (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null
  fi
}

find_free_port() {
  local port="$1"
  local limit=$((port + 100))
  while port_in_use "$port"; do
    port=$((port + 1))
    if [ "$port" -ge "$limit" ]; then
      echo "No free port found in range $1-$((limit - 1))." >&2
      return 1
    fi
  done
  echo "$port"
}

cleanup() {
  trap - SIGINT SIGTERM EXIT
  echo -e "\nShutting down Frontend and Backend..."
  if [ -n "$BACKEND_PID" ]; then kill "$BACKEND_PID" 2>/dev/null || true; fi
  if [ -n "$FRONTEND_PID" ]; then kill "$FRONTEND_PID" 2>/dev/null || true; fi
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}

trap cleanup SIGINT SIGTERM EXIT
cd "$PROJECT_DIR"

for command_name in mvn npm; do
  if ! command -v "$command_name" >/dev/null; then
    echo "Error: $command_name is required."
    exit 1
  fi
done

BACKEND_PORT="$(find_free_port "$BACKEND_PORT_START")"
FRONTEND_PORT="$(find_free_port "$FRONTEND_PORT_START")"

echo "========================================="
echo " Starting Backend (Spring Boot: ${BACKEND_PORT})"
echo " Starting Frontend (Vite: ${FRONTEND_PORT})"
echo " Press Ctrl+C to stop both"
echo "========================================="

SERVER_PORT="$BACKEND_PORT" mvn spring-boot:run -f backend/pom.xml &
BACKEND_PID=$!

VITE_BACKEND_TARGET="http://localhost:${BACKEND_PORT}" \
  npm run dev --prefix frontend -- --port "$FRONTEND_PORT" --strictPort &
FRONTEND_PID=$!

wait -n "$BACKEND_PID" "$FRONTEND_PID"
