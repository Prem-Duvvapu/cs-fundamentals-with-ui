# CS Fundamentals with UI

**Interactive learning platform for Computer Science fundamentals — from beginner to expert.**

This project helps you prepare for **CS interviews** and software engineering excellence by breaking down complex topics into digestible flows with **interactive animated visual simulations** and **deep-dive theory**. Every topic is structured in three tiers: 🟢 Beginner → 🟡 Intermediate → 🔴 Expert with real-world failure modes, trade-offs, and interview Q&As.

---

## ⚡ One-Command Quick Start

Start both Frontend and Backend together in a single command using Docker or local dev mode:

```bash
# Clone the repository
git clone https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui.git
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

### 💻 Operating Systems
- **⚡ CPU Scheduling Simulator**: Live Gantt chart, step-by-step CPU execution, and real-time waiting/turnaround metrics for FCFS, SJF, SRTF, Round Robin, and Priority algorithms.
- **🔄 Process Lifecycle & PCB Inspector**: State machine transitions (`NEW → READY → RUNNING → WAITING → TERMINATED`) with live PCB register state and Process vs Thread context switch engine.
- **🧠 Memory Management & Page Replacement**: LRU, FIFO, and Optimal page replacement simulators with hit/fault counters and MMU Address Translation calculator.
- **🔒 Process Synchronization**: Mutex locking critical sections and Producer-Consumer bounded buffer semaphores.
- **🛡 Deadlock & Banker's Algorithm**: Resource Allocation Matrix evaluator and safe sequence checker.

### 🌐 Computer Networks
- **🗺️ Network Topology Explorer**: Interactive Star, Bus, Ring, Mesh, Tree, and Hybrid topologies with fault simulation.
- **📈 Physical Line Encoding & Waveforms**: Oscilloscope digital bitstream waveforms (NRZ-L, NRZ-I, Manchester, Differential Manchester).
- **📦 TCP & UDP Segment Header Inspector**: Interactive 20-byte TCP & 8-byte UDP bitfield grid with dynamic field tooltips.
- **🚦 Traffic Shaping Simulator (QoS)**: Token Bucket vs. Leaky Bucket discrete burst policing simulation.
- **📡 DHCP DORA 4-Step Simulator**: Step-through state machine for Discover, Offer, Request, and Acknowledge flows.
- **🔍 ARP Resolution Protocol**: Layer 2 broadcast requests and dynamic kernel ARP cache table inspector.
- **🔄 NAT / PAT Translation Table**: Socket translation simulation between internal LAN and public WAN sockets.
- **🛣️ Distance Vector Routing (Bellman-Ford)**: Step-by-step multi-router routing vector exchange and convergence rounds.

### 🗄️ Database Management Systems (DBMS)
- **📁 File System vs DBMS Simulator**: Interactive anomaly simulator for data redundancy, multi-user Lost Update race conditions, mid-flight power outage ARIES crash recovery, and B+ Tree index seek vs linear file scan.
- **📐 ER Model & Relational Mapping Simulator**: Interactive ER diagram blueprint builder (strong/weak entities, composite, multivalued, derived attributes), cardinality mapping (1:1, 1:N, M:N, recursive), and real-time SQL DDL table synthesis.
- **🧮 Relational Algebra, Calculus & Joins Simulator**: Animated Selection ($\sigma$), Projection ($\pi$), Equi-Join ($\bowtie$), Left Outer Join ($\$), and Tuple Relational Calculus (TRC) translation.
- **🗝️ Keys, Functional Dependencies & (X)⁺ Closures**: Attribute Closure solver, Armstrong's Axioms inference, Candidate Key detection, and Minimal Canonical Cover ($F_c$).
- **📊 Database Normalization (1NF–BCNF)**: Step-by-step anomaly detection (Insertion, Deletion, Update) and lossless join decomposition simulator.
- **🌲 B+ Tree Indexing & Storage Engine**: Complete binary/multi-way B+ Tree search, dynamic node splits, and leaf range scans.
- **💾 RAID Storage & Advanced Indexing**: RAID 0/1/5/6/10 disk failure parity reconstruction, Bitmap Indexing bitwise operations, and Inverted Index search postings lists.
- **🔒 Concurrency Control & 2PL**: Conflict serializability, Strict 2PL locking, Timestamp Ordering, Thomas Write Rule, and deadlock wait-for graphs.
- **⚡ Cost-Based Query Optimizer (CBO)**: Relational query tree generation, Predicate/Projection pushdown heuristics, and join algorithm cost evaluation (Nested Loop vs Hash vs Sort-Merge).
- **🌐 Distributed DBMS, 2PC & CAP**: 2-Phase Commit (2PC) coordinator/participant state machine, CAP Theorem network partition simulator, and Quorum consensus ($R+W>N$).

### ☕ Java & Spring Ecosystem
- **⚙️ Java Execution Pipeline**: Step conveyor belt from `javac` compilation to ClassLoader parent delegation, Bytecode Verifier, and JIT native assembly.
- **💾 Java Memory Model (Stack vs. Heap)**: Thread call stack frames, object reference pointers, and 100% Pass-by-Value mechanics.
- **🐕 OOP Pillars & Dynamic Method Dispatch**: Polymorphic instantiation and JVM `vtable` virtual method resolution.
- **🔒 Static, Final, Immutability & Java Records**: Metaspace static allocation, defensive copying, and Java 14+ Record value semantics.
- **⚡ Functional Interfaces & Lambdas**: SAM contracts, method references, and JVM `invokedynamic` with `LambdaMetafactory`.
- **🧬 Generics, Wildcards & Type Erasure**: Invariance, Producer Extends Consumer Super (PECS), and synthetic bridge methods.
- **📚 Collections Framework & PriorityQueue Heap**: ArrayList 1.5x dynamic growth, LinkedList nodes, and Binary Min-Heap sift operations.
- **🌊 Java Streams API & Optional**: Lazy intermediate pipeline chaining, vertical loop fusion, and NPE-safe `Optional` chaining.
- **🧠 JVM Heap & GC**: Young/Old Gen allocations, G1GC/ZGC collectors, and Project Loom Virtual Threads.
- **🌱 Spring Bean & MVC Lifecycle**: 9-step IoC bean container lifecycle and DispatcherServlet security filter chain execution.
- **🗄️ JPA / Hibernate States & N+1 Solver**: Entity states (Transient, Managed, Detached, Removed) and JOIN FETCH optimization.
- **📦 Spring Batch & Quartz Scheduler**: Chunk-oriented ItemReader/Processor/Writer and clustered JobStoreTX scheduling.

---

## 📚 48 Complete Curriculum Topics Covered

| Category | Topics Count | Key Areas Covered |
| :--- | :--- | :--- |
| **Operating Systems** | 7 Topics | Process Management, Memory Management, CPU Scheduling, Synchronization, Deadlocks, File Systems, I/O Systems |
| **Computer Networks** | 12 Topics | Network Fundamentals, Physical Media, OSI & TCP/IP, Data Link Layer & ARQ, IP Subnetting & CIDR, Routing Algorithms, TCP/UDP Handshakes, TCP Flow & Congestion Control, Transport Protocols (QUIC/SCTP), Application Layer (HTTP/3, DNS), Network Security (TLS 1.3), QoS & Traffic Shaping |
| **DBMS** | 13 Topics | DBMS Introduction & Architecture, File System vs DBMS, 3-Schema ANSI-SPARC, ER Model & Mapping, Relational Algebra & Calculus, Keys & Functional Dependencies, Database Normalization (1NF–BCNF), B+ Tree Indexing, File Storage & RAID Arrays, Transactions & ACID, Concurrency Control (Strict 2PL/Timestamps), Query Optimizer (CBO), Distributed Databases & CAP Theorem |
| **Java & Spring** | 17 Topics | JVM Execution Pipeline, Memory Model, OOP & vtable, Static/Final/Records, JVM GC & Virtual Threads, Functional & Lambdas, Generics & PECS, Collections & Heap, HashMap Internals, Streams & Optional, Reflection & Exceptions, Multithreading & Monitors, Spring Bean Lifecycle, Spring MVC Flow, JPA/Hibernate States, Spring Batch, Quartz Scheduler |

---

## 🛠 Tech Stack & Architecture

- **Backend**: Java 17, Spring Boot 3.2.0, Maven
- **Frontend**: React 18, Vite, React Router v6, CSS Modules & Modern Animations
- **Testing**: Vitest, React Testing Library, JUnit 5, Spring Boot Test
- **Containerization**: Docker, Docker Compose, Nginx Reverse Proxy
- **System Documentation**: See [CONTEXT.md](CONTEXT.md) and [AGENTS.md](AGENTS.md)

---

## 🧪 Automated Testing

```bash
# Run Frontend Tests (30 test files, 97+ unit & integration tests)
cd frontend && npm test

# Run Backend Tests (30 test suites across all 49 topics)
cd backend && mvn test
```
