#!/usr/bin/env bash
set -e

# CS Fundamentals Platform - One-Command Launcher Script

echo "=================================================="
echo "🚀 CS Fundamentals Platform - One-Cmd Launcher"
echo "=================================================="

detect_backend_port() {
  if [ -n "$BACKEND_PORT" ]; then
    return
  fi
  # Test if port 8080 is in use
  if lsof -i :8080 &>/dev/null || ss -tulpn | grep -q ":8080 "; then
    echo "⚠️ Port 8080 is currently in use on your host machine."
    echo "👉 Assigning CS Fundamentals Backend host port to 8081..."
    export BACKEND_PORT=8081
  else
    export BACKEND_PORT=8080
  fi
}

run_docker() {
  echo "🐳 Checking Docker environment..."
  if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
  elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
  else
    echo "❌ Error: Docker Compose is not installed."
    return 1
  fi

  detect_backend_port

  echo "🔨 Building and launching containers via Docker Compose (Backend Host Port: ${BACKEND_PORT})..."
  $COMPOSE_CMD up --build
}

run_local() {
  echo "⚡ Launching locally (Backend: Spring Boot, Frontend: Vite)..."
  
  cleanup() {
    echo -e "\n🛑 Stopping background servers..."
    if [ -n "$BE_PID" ]; then kill $BE_PID 2>/dev/null || true; fi
    if [ -n "$FE_PID" ]; then kill $FE_PID 2>/dev/null || true; fi
    exit 0
  }
  trap cleanup SIGINT SIGTERM

  echo "☕ Starting Spring Boot Backend..."
  (cd backend && mvn spring-boot:run) &
  BE_PID=$!

  echo "⚛️ Starting Vite React Frontend (Port 5173)..."
  (cd frontend && npm run dev) &
  FE_PID=$!

  echo "=================================================="
  echo "✅ Both services are running!"
  echo "👉 Frontend UI:  http://localhost:5173"
  echo "👉 Backend API:  http://localhost:8080/api/v1/topics"
  echo "Press Ctrl+C to stop all services."
  echo "=================================================="

  wait $BE_PID $FE_PID
}

if [ "$1" == "--local" ]; then
  run_local
elif [ "$1" == "--docker" ]; then
  run_docker
else
  if command -v docker &> /dev/null && (command -v docker-compose &> /dev/null || docker compose version &> /dev/null); then
    echo "ℹ️ Docker environment detected. Running with Docker Compose..."
    run_docker
  else
    echo "ℹ️ Docker not found. Falling back to local development servers..."
    run_local
  fi
fi
