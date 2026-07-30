# CS Fundamentals with UI

**Interactive learning platform for Computer Science fundamentals — from beginner to expert.**

This project helps you prepare for **CS interviews** by breaking down complex topics into digestible flows with **visual explanations**. Each concept is structured in three tiers: 🟢 Beginner → 🟡 Intermediate → 🔴 Expert.

## Topics Covered

### Operating Systems (Current)
| Topic | File |
|-------|------|
| Process Management | [content/os/01-process-management.md](content/os/01-process-management.md) |
| Memory Management | [content/os/02-memory-management.md](content/os/02-memory-management.md) |
| CPU Scheduling | [content/os/03-cpu-scheduling.md](content/os/03-cpu-scheduling.md) |
| Process Synchronization | [content/os/04-synchronization.md](content/os/04-synchronization.md) |
| Deadlocks | [content/os/05-deadlocks.md](content/os/05-deadlocks.md) |
| File Systems | [content/os/06-file-systems.md](content/os/06-file-systems.md) |
| I/O Systems | [content/os/07-io-systems.md](content/os/07-io-systems.md) |

### Planned
- Networking
- Database Management Systems
- System Design
- Data Structures & Algorithms

## Tech Stack

**Backend**: Java 17 + Spring Boot 3.x  
**Frontend**: React 18 + Vite  
**Content**: Markdown (renderable with code snippets, mermaid diagrams)

## Quick Start

```bash
# Backend
cd backend && ./mvnw spring-boot:run

# Frontend
cd frontend && npm install && npm run dev
```

## Structure

```
content/     → Educational content (Markdown)
backend/     → Spring Boot REST API
frontend/    → React UI with animations
AGENTS.md    → AI agent context & conventions
```

## How to Contribute

1. Pick a topic from the roadmap
2. Write content in `content/<category>/` following the 3-tier structure
3. If needed, add a visualization component in `frontend/src/components/`
4. Update the nav config and this README

See [AGENTS.md](AGENTS.md) for detailed conventions.
