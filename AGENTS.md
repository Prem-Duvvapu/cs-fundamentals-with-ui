# AI Agent Context — CS Fundamentals with UI

## Project Overview
Educational platform for Computer Science fundamentals, structured for **beginner → expert** learning paths with interactive visualizations. Purpose: interview preparation and deep understanding through visual flows.

## Tech Stack
- **Backend**: Java 17+, Spring Boot 3.x, Maven
- **Frontend**: React 18+, Vite, React Router v6
- **Data**: No database needed (static content-driven); JSON for animations/configs
- **Styling**: CSS modules or Tailwind CSS

## Directory Structure
```
/
├── AGENTS.md              # This file — context for AI agents
├── README.md              # Project overview
├── content/               # Markdown educational content
│   ├── os/                # Operating Systems
│   │   ├── 01-process-management.md
│   │   ├── 02-memory-management.md
│   │   ├── 03-cpu-scheduling.md
│   │   ├── 04-synchronization.md
│   │   ├── 05-deadlocks.md
│   │   ├── 06-file-systems.md
│   │   └── 07-io-systems.md
│   ├── networking/        # (future)
│   ├── dbms/              # (future)
│   └── ...                # (future topics)
├── backend/               # Spring Boot application
│   ├── pom.xml
│   └── src/main/java/com/csfundamentals/
│       ├── CsFundamentalsApplication.java
│       ├── controller/    # REST endpoints
│       ├── model/         # Domain models
│       ├── service/       # Business logic
│       └── config/        # CORS, security config
├── frontend/              # React application
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── components/    # Reusable UI components
│       ├── pages/         # Route pages
│       └── utils/         # Helper functions
```

## Content Structure (per topic)
Each `.md` file follows this pattern:
- `## 🟢 Beginner Level` — Simple explanations, analogies, basic diagrams
- `## 🟡 Intermediate Level` — Deeper concepts, algorithms, code examples
- `## 🔴 Expert Level` — Implementation details, Linux kernel, advanced topics, interview Qs

## How to Extend

### Add a new topic
1. Create `content/<category>/<NN>-<topic>.md` following the 3-level pattern
2. Add a route in `frontend/src/App.jsx`
3. Add a controller in `backend/.../controller/` if dynamic data needed
4. Update `content/<category>/_index.json` (or the frontend nav config)

### Add a visualization
- Components go in `frontend/src/components/`
- Each component should accept a `config` prop for animation parameters
- Use CSS transitions or Framer Motion for animations
- Example: `SchedulingVisualizer.jsx` shows Gantt chart of CPU scheduling

## OS Topic Roadmap
- [x] Process Management (states, PCB, threads, fork, COW)
- [x] Memory Management (paging, segmentation, virtual memory, LRU)
- [x] CPU Scheduling (FCFS, SJF, RR, MLFQ, CFS)
- [x] Synchronization (semaphores, monitors, RCU, lock-free)
- [x] Deadlocks (banker's algorithm, detection, prevention)
- [x] File Systems (inodes, Ext4, Btrfs, ZFS, VFS)
- [x] I/O Systems (DMA, interrupts, epoll, io_uring)

## Computer Networks Topic Roadmap
- [x] Network Fundamentals (types, devices, topologies, packet vs circuit switching)
- [x] Physical Layer & Media (guided/unguided media, NRZ/Manchester encoding, Nyquist/Shannon, multiplexing)
- [x] OSI & TCP/IP Reference Models (7-layer vs 4-layer, PDU encapsulation/decapsulation)
- [x] Data Link Layer, MAC & ARQ Protocols (framing, CRC, GBN, SR, CSMA/CD)
- [x] IP Addressing, CIDR Subnetting & Protocols (IPv4/IPv6, CIDR, ARP, DHCP DORA, NAT)
- [x] Routing Algorithms (Distance Vector Bellman-Ford, Link-State Dijkstra, OSPF, BGP)
- [x] TCP vs UDP & Connection Management (3-way handshake, 4-way teardown, port multiplexing)
- [x] TCP Flow & Congestion Control (sliding window, rwnd, cwnd, Slow Start, AIMD, Reno/CUBIC)
- [x] Transport Protocols (TCP 20B header, UDP 8B header, QUIC 0-RTT, SCTP multi-streaming)
- [x] Application Layer (DNS recursive hierarchy, HTTP/1.1 vs HTTP/2 vs HTTP/3, TLS 1.3)
- [x] Network Security & Cryptography (AES, RSA, X.509 certificates, firewalls, SYN flood, DDoS)
- [x] Network QoS & Traffic Shaping (Token Bucket, Leaky Bucket, IntServ/DiffServ, CDN, SDN/NFV, 5G slicing)

## Conventions
- **Commits**: `feat/<date>-<topic>` pattern
- **Branches**: `feat/<YYYY-MM-DD>-<topic>` or `fix/<description>`
- **Code comments**: Minimal — use self-documenting code
- **Backend API**: RESTful, `/api/v1/...` prefix
- **Frontend state**: React hooks (useState/useReducer), no Redux unless complexity demands

## Command Execution Environment
- **Commands Rule**: ALWAYS prefix shell commands with `wsl` (e.g. `wsl npm test`, `wsl npm run build`, `wsl git status`, `wsl git commit ...`).

