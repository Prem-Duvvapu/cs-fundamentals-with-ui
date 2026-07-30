# System Architecture & Development Context

## Overview
**CS Fundamentals with UI** is a full-stack educational platform designed to teach Operating Systems and Computer Science concepts visually. It consists of a **Spring Boot REST Backend** serving dynamic OS educational content, and a **React 18 / Vite Frontend** with interactive visual simulation components.

---

## 🏗 Containerization & Deployment Architecture

```
                       ┌───────────────────────────────┐
                       │          Client Browser       │
                       └──────────────┬────────────────┘
                                      │
                         HTTP Requests│ Ports 80 / 5173
                                      ▼
             ┌──────────────────────────────────────────────────┐
             │       Frontend Service (Nginx Container)         │
             │   - Serves React SPA Static Bundle (/dist)       │
             │   - Reverse Proxies /api/* to Backend:8080       │
             └────────────────────────┬─────────────────────────┘
                                      │
                              Internal Docker Network
                                      │
                                      ▼
             ┌──────────────────────────────────────────────────┐
             │      Backend Service (Spring Boot Container)     │
             │   - Port 8080                                    │
             │   - Parses & Serves Markdown files from          │
             │     mounted /app/content volume                  │
             └──────────────────────────────────────────────────┘
```

### Docker Files & Services
1. **`backend/Dockerfile`**:
   - Multi-stage build (Maven 3.9 + Temurin JDK 17 builder $\rightarrow$ Temurin JRE 17 Alpine runtime).
   - Serves API on `http://localhost:8080`.
2. **`frontend/Dockerfile`**:
   - Multi-stage build (Node 18 Alpine builder $\rightarrow$ Nginx Alpine web server).
   - Implements `nginx.conf` reverse proxy routing `/api` requests to `http://backend:8080`.
3. **`docker-compose.yml`**:
   - Orchestrates `backend` and `frontend` services with health checks and restart policies.
4. **`start.sh`**:
   - One-command launcher script. Run `./start.sh` (or `./start.sh --docker` / `./start.sh --local`).

---

## ⚡ Interactive Visualizers Included

- **CPU Scheduling Simulator (`SchedulingVisualizer.jsx`)**: Interactive execution for FCFS, SJF, SRTF, Round Robin, and Priority scheduling with live Gantt chart and $W_T, T_A, R_T$ calculation.
- **Process Lifecycle & Context Switch Engine (`ProcessLifecycleVisualizer.jsx`)**: Animated state machine transitions and live Process Control Block (PCB) inspector.
- **Memory Management & Paging (`MemoryVisualizer.jsx`)**: Page replacement algorithms (LRU, FIFO, Optimal) and MMU Address Translation calculator.
- **Process Synchronization (`SynchronizationVisualizer.jsx`)**: Mutex locking and Bounded Buffer Producer-Consumer model.
- **Deadlock Detector (`DeadlockVisualizer.jsx`)**: Banker's Algorithm safety sequence calculation.

---

## 🔌 REST API Endpoints

- `GET /api/v1/topics` — Lists all OS topics with level metadata.
- `GET /api/v1/topics/category/{category}` — Lists topics for specific category (e.g. `os`).
- `GET /api/v1/content/{category}/{topicId}` — Fetches raw Markdown content for a topic.

---

## 🧪 Testing & Verification Commands

- **Backend Tests**: `cd backend && mvn test`
- **Frontend Tests**: `cd frontend && npm test`
- **One-Command Platform Startup**: `./start.sh`
