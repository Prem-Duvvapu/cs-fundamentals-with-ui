# CS Fundamentals with UI

**Interactive learning platform for Computer Science fundamentals — from beginner to expert.**

This project helps you prepare for **CS interviews** by breaking down complex topics into digestible flows with **interactive animated visual simulations** and **deep-dive theory**. Each concept is structured in three tiers: 🟢 Beginner → 🟡 Intermediate → 🔴 Expert.

---

## ⚡ One-Command Quick Start

Start both Frontend and Backend together in a single command using Docker or local dev mode:

```bash
# Clone the repository
git clone https://github.com/your-org/cs-fundamentals-with-ui.git
cd cs-fundamentals-with-ui

# Launch both Frontend & Backend with one command (auto-detects Docker)
./start.sh
```

- **Frontend UI**: [http://localhost](http://localhost) (or [http://localhost:5173](http://localhost:5173))
- **Backend API**: [http://localhost:8080/api/v1/topics](http://localhost:8080/api/v1/topics)

### Alternative Startup Options

```bash
# Start via Docker Compose explicitly
docker-compose up --build

# Or start via local development mode (Spring Boot + Vite)
./start.sh --local
```

---

## 🎮 Interactive Visualizers Included

- **⚡ CPU Scheduling Simulator**: Live Gantt chart, step-by-step CPU execution, and real-time waiting/turnaround metrics for FCFS, SJF, SRTF, Round Robin, and Priority algorithms.
- **🔄 Process Lifecycle & PCB Inspector**: State machine transitions (`NEW → READY → RUNNING → WAITING → TERMINATED`) with live PCB register state and Process vs Thread context switch engine.
- **🧠 Memory Management & Page Replacement**: LRU, FIFO, and Optimal page replacement simulators with hit/fault counters and MMU Address Translation calculator.
- **🔒 Process Synchronization**: Mutex locking critical sections and Producer-Consumer bounded buffer semaphores.
- **🛡 Deadlock & Banker's Algorithm**: Resource Allocation Matrix evaluator and safe sequence checker.

---

## 📚 Topics Covered

### Operating Systems
| Topic | Content File | Visual Simulator |
|:---|:---|:---|
| **Process Management** | [content/os/01-process-management.md](content/os/01-process-management.md) | State Machine & Context Switch Engine |
| **Memory Management** | [content/os/02-memory-management.md](content/os/02-memory-management.md) | Page Replacement & MMU Translator |
| **CPU Scheduling** | [content/os/03-cpu-scheduling.md](content/os/03-cpu-scheduling.md) | Gantt Chart Scheduling Simulator |
| **Process Synchronization** | [content/os/04-synchronization.md](content/os/04-synchronization.md) | Mutex & Producer-Consumer Buffer |
| **Deadlocks** | [content/os/05-deadlocks.md](content/os/05-deadlocks.md) | Banker's Safety Algorithm Checker |
| **File Systems** | [content/os/06-file-systems.md](content/os/06-file-systems.md) | Inodes & Architecture View |
| **I/O Systems** | [content/os/07-io-systems.md](content/os/07-io-systems.md) | Kernel I/O Stack View |

---

## 🛠 Tech Stack & Architecture

- **Backend**: Java 17, Spring Boot 3.2.0, Maven
- **Frontend**: React 18, Vite, React Router v6, CSS Modules & Modern Animations
- **Containerization**: Docker, Docker Compose, Nginx Reverse Proxy
- **System Documentation**: See [CONTEXT.md](CONTEXT.md) and [AGENTS.md](AGENTS.md)

---

## 🧪 Testing

```bash
# Run Frontend Tests (Vitest & Testing Library)
npm test --prefix frontend

# Run Backend Tests (JUnit 5 & Spring Boot Test)
mvn test -f backend/pom.xml
```
