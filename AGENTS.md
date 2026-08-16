# AI Agent Context — CS Fundamentals with UI

## Project Overview
Educational platform for Computer Science fundamentals, structured for **beginner → expert** learning paths with interactive visualizations. Purpose: interview preparation and deep understanding through visual flows across Operating Systems, Computer Networks, Database Management Systems, and Java / Spring Boot.

## Tech Stack
- **Backend**: Java 17+, Spring Boot 3.x, Maven
- **Frontend**: React 18+, Vite, React Router v6
- **Data**: Static content-driven (`content/<category>/`); JSON for animations/configs
- **Styling**: Vanilla CSS, Glassmorphism, CSS Modules, Dark Theme Tokens

## Directory Structure
```
/
├── AGENTS.md              # Context for AI agents
├── README.md              # Project overview & quickstart
├── CONTEXT.md             # System architecture & API documentation
├── content/               # Markdown educational content (47 topics)
│   ├── os/                # Operating Systems (7 topics)
│   ├── networking/        # Computer Networks (12 topics)
│   ├── dbms/              # Database Management Systems (11 topics)
│   ├── java-spring/       # Java & Spring Boot Ecosystem (17 topics)
│   └── aiml/              # AI / ML Architecture (6 topics)
├── backend/               # Spring Boot application
│   ├── pom.xml
│   └── src/main/java/com/csfundamentals/
│       ├── CsFundamentalsApplication.java
│       ├── controller/    # REST endpoints (/api/v1/...)
│       ├── model/         # Domain models (Topic, etc.)
│       ├── service/       # TopicService, ContentService, SimulationService
│       └── config/        # CORS, security config
├── frontend/              # React application
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── components/    # Reusable UI & visualizer components
│       │   ├── visualizers/
│       │   │   ├── java/        # Java execution, memory, OOP, records, collections
│       │   │   ├── networking/  # Topologies, TCP segment, QoS, DHCP, ARP, NAT
│       │   │   ├── dbms/        # B+ Tree indexing, Concurrency control
│       │   │   └── os/          # Scheduling, process lifecycle, memory, deadlocks
│       ├── pages/         # Route pages (HomePage, TopicPage, VisualizerPage)
│       └── utils/         # Helper functions & simulation engines
```

## Content Structure (per topic)
Each `.md` file follows this strict 3-tier educational pattern:
- `## 🟢 Beginner Level` — Simple explanations, analogies, mental models, basic diagrams
- `## 🟡 Intermediate Level` — Deeper concepts, mathematical formulas, algorithms, code examples
- `## 🔴 Expert Level` — Implementation details, Linux kernel / JVM internals, trade-offs, and Interview Q&As

## Curriculum Roadmaps (47 Complete Topics)

### 💻 Operating Systems (7/7 Topics)
- [x] Process Management (states, PCB, threads, fork, COW)
- [x] Memory Management (paging, segmentation, virtual memory, LRU)
- [x] CPU Scheduling (FCFS, SJF, RR, MLFQ, CFS)
- [x] Synchronization (semaphores, monitors, RCU, lock-free)
- [x] Deadlocks (banker's algorithm, detection, prevention)
- [x] File Systems (inodes, Ext4, Btrfs, ZFS, VFS)
- [x] I/O Systems (DMA, interrupts, epoll, io_uring)

### 🌐 Computer Networks (12/12 Topics)
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

### 🗄️ Database Management Systems (11/11 Topics)
- [x] DBMS Architecture & Data Independence (3-Schema ANSI-SPARC)
- [x] ER Diagram Modeling & Relational Mapping (Entity sets, attributes, weak entities, ER-to-Table mapping)
- [x] Relational Algebra, Calculus & Joins (Selection, Projection, Joins, Division, TRC)
- [x] Keys, Functional Dependencies & Canonical Cover (Armstrong's Axioms, Attribute Closure, Minimal Cover)
- [x] Database Normalization (1NF, 2NF, 3NF, BCNF, Lossless Join Decompositions)
- [x] B/B+ Tree Indexing & Storage Structures (Clustered/Secondary, Node Splits, Range Scans)
- [x] Storage Engine, RAID & Advanced Indexing (RAID 0/1/5/6/10, Bitmap Indexing, Inverted Indexes)
- [x] Transactions, States & ACID Properties (WAL Logging, Checkpoints, ARIES Crash Recovery)
- [x] Concurrency Control, 2PL & Serializability (Precedence Graphs, Strict 2PL, Timestamp Ordering, Deadlocks)
- [x] Query Processing & Cost-Based Optimizer (Query Trees, Predicate Pushdown, Hash Joins, EXPLAIN ANALYZE)
- [x] Distributed DBMS, 2PC & CAP Theorem (2-Phase Commit, 3PC, CAP Theorem, Quorum Consensus)

### ☕ Java & Spring Ecosystem (17/17 Topics)
- [x] Java Execution Pipeline (javac, ClassLoader Parent Delegation, Bytecode Verifier, Tiered JIT)
- [x] Java Memory Model (Primitives, References, Stack Frames, Heap Objects, 100% Pass-by-Value)
- [x] OOP Pillars & Dynamic Method Dispatch (Encapsulation, Polymorphism, JVM vtable)
- [x] Static, Final, Immutability & Java Records (Metaspace allocation, Defensive Copying, Records)
- [x] JVM Memory Architecture, GC & Virtual Threads (G1GC, ZGC, Thread States, Project Loom)
- [x] Functional Interfaces & Lambda Expressions (SAM Contracts, Method References, invokedynamic)
- [x] Generics, Wildcards (PECS) & Type Erasure (Invariance, Upper/Lower Bounds, Bridge Methods)
- [x] Collections Framework & PriorityQueue (ArrayList 1.5x, ArrayDeque, Min-Heap sift operations)
- [x] HashMap Bucket Internals & Treeification (Bitwise masking, Red-Black Trees, ConcurrentHashMap)
- [x] Java Streams API & Optional (Lazy evaluation, Vertical loop fusion, Optional monad)
- [x] Reflection API, Annotations & Exceptions (Introspection, Dynamic Proxies, Try-With-Resources)
- [x] Multithreading, Monitors & ThreadPools (Volatile barriers, Object Monitors, CAS, ThreadPoolExecutor)
- [x] Spring Bean Lifecycle (BeanDefinition, Instantiation, Aware Interfaces, BeanPostProcessors)
- [x] Spring MVC Request Execution Flow (DispatcherServlet, HandlerMapping, Security Filter Chain)
- [x] JPA / Hibernate Entity Lifecycle (Transient, Managed, Detached, Removed, N+1 Query Solver)
- [x] Spring Batch Execution Architecture (JobLauncher, Step, Chunk ItemReader/Processor/Writer)
- [x] Quartz Scheduler Lifecycle (JobDetail, Trigger, Clustered JobStoreTX)

## Conventions
- **Commits**: `feat/<date>-<topic>` pattern
- **Branches**: `feat/<YYYY-MM-DD>-<topic>` or `fix/<description>`
- **Code comments**: Minimal — use self-documenting code
- **Backend API**: RESTful, `/api/v1/...` prefix
- **Frontend state**: React hooks (`useState`/`useReducer`), simulation engine classes in `src/utils/simulationEngines/`
- **Documentation & Test Synchronization Rule**: After ANY code, architectural, or feature changes, ALWAYS update the required documentation markdown files (`README.md`, `CONTEXT.md`, `AGENTS.md`) and write/update unit & integration tests (`frontend` Vitest suites and `backend` JUnit 5 tests), verifying all tests pass cleanly before completing the task.

## Command Execution Environment
- **Commands Rule**: ALWAYS prefix shell commands with `wsl` (e.g. `wsl npm test`, `wsl npm run build`, `wsl git status`, `wsl git commit ...`).
