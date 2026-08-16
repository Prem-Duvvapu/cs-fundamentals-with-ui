# System Architecture & Development Context

## Overview
**CS Fundamentals with UI** is an interactive, full-stack educational platform designed to teach Computer Science fundamentals visually. It consists of a **Spring Boot REST Backend** serving structured 3-tier educational markdown content, and a **React 18 / Vite Frontend** delivering interactive, step-by-step visual simulation engines.

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
             │   - Serves Topics, Markdown content, and         │
             │     simulation configs from /app/content         │
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

## 🎮 Interactive Visualizers Inventory

### 💻 Operating Systems
- **CPU Scheduling Simulator (`SchedulingVisualizer.jsx`)**: Interactive execution for FCFS, SJF, SRTF, Round Robin, and Priority scheduling with live Gantt chart.
- **Process Lifecycle & PCB Inspector (`ProcessLifecycleVisualizer.jsx`)**: State machine transitions and live Process Control Block (PCB) inspector.
- **Memory Management & Paging (`MemoryVisualizer.jsx`)**: Page replacement algorithms (LRU, FIFO, Optimal) and MMU Address Translation calculator.
- **Process Synchronization (`SynchronizationVisualizer.jsx`)**: Mutex locking and Bounded Buffer Producer-Consumer model.
- **Deadlock Detector (`DeadlockVisualizer.jsx`)**: Banker's Algorithm safety sequence calculation.

### 🌐 Computer Networks (`NetworkingVisualizer.jsx`)
- **Network Topologies**: Interactive Star, Bus, Ring, Mesh, Tree, and Hybrid layouts.
- **Physical Line Encoding**: Real-time oscilloscope waveforms for NRZ-L, NRZ-I, Manchester, and Differential Manchester.
- **TCP & UDP Segment Header Inspector (`TcpSegmentVisualizer.jsx`)**: Bitfield grid with live byte offset tooltips.
- **QoS Traffic Shaping Simulator (`TrafficShapingVisualizer.jsx`)**: Token Bucket vs. Leaky Bucket burst simulation.
- **DHCP DORA 4-Step Flow (`DhcpDoraVisualizer.jsx`)**: Step-through state machine for Discover, Offer, Request, and ACK.
- **ARP Resolution Protocol (`ArpResolutionVisualizer.jsx`)**: Layer 2 broadcast requests and dynamic ARP cache table updates.
- **NAT / PAT Translation Table (`NatTranslationVisualizer.jsx`)**: Internal-to-external socket rewriting simulation.
- **Distance Vector Bellman-Ford (`DistanceVectorVisualizer.jsx`)**: Multi-router vector exchange convergence.

### 🗄️ Database Management Systems (`DbmsVisualizer.jsx`)
- **Relational Algebra Simulator (`RelationalAlgebraVisualizer.jsx`)**: Animated Selection ($\sigma$), Projection ($\pi$), Equi-Join ($\bowtie$), Left Outer Join ($\$), and TRC query translation.
- **Keys & Closures (`FunctionalDependencyVisualizer.jsx`)**: Attribute Closure $(X)^+$ solver, Armstrong's Axioms inference, Candidate Key detection, and Minimal Canonical Cover ($F_c$).
- **Normalization Engine (`NormalizationVisualizer.jsx`)**: Step-by-step anomaly detection (Insertion, Deletion, Update) and lossless join decomposition simulator.
- **B+ Tree Indexing Engine (`BPlusTreeVisualizer.jsx`)**: Dynamic multi-way node insertion, node splitting, and leaf range scans.
- **Storage Engine & RAID (`StorageIndexingVisualizer.jsx`)**: RAID 0/1/5/6/10 parity reconstruction simulator, Bitmap Indexing bitwise ops, and Inverted Index postings lists.
- **Concurrency Control & 2PL (`ConcurrencyControlVisualizer.jsx`)**: Conflict serializability, Strict 2PL locks, Timestamp Ordering, Thomas Write Rule, and deadlock wait-for graphs.
- **Query Optimizer & CBO (`QueryOptimizerVisualizer.jsx`)**: Relational algebra query trees, Predicate/Projection pushdown heuristics, and join algorithm cost formulas (Nested Loop vs Hash vs Sort-Merge).
- **Distributed DBMS (`DistributedDbVisualizer.jsx`)**: 2-Phase Commit (2PC), CAP theorem network partition simulator, and Quorum consensus ($R+W>N$).

### ☕ Java & Spring Ecosystem (`JavaSpringVisualizer.jsx`)
- **Java Execution Pipeline (`JavaExecutionPipelineVisualizer.jsx`)**: Source $\rightarrow$ javac $\rightarrow$ ClassLoader $\rightarrow$ Verifier $\rightarrow$ JIT Machine Assembly.
- **Java Memory Model (`JavaMemoryModelVisualizer.jsx`)**: Stack Frame allocations, Heap Objects, and 100% Pass-by-Value mechanics.
- **OOP Pillars & vtable (`JavaOopVisualizer.jsx`)**: Polymorphic method dispatch via JVM `vtable`.
- **Static, Final & Records (`JavaStaticRecordsVisualizer.jsx`)**: Metaspace static allocation and Java 14+ Record value semantics.
- **Functional Interfaces & Lambdas (`JavaFunctionalLambdasVisualizer.jsx`)**: SAM contracts, method references, and `invokedynamic`.
- **Generics & PECS (`JavaGenericsVisualizer.jsx`)**: Producer Extends Consumer Super wildcard mechanics and bytecode Type Erasure.
- **Collections Framework (`JavaCollectionsVisualizer.jsx`)**: ArrayList 1.5x dynamic growth and PriorityQueue Min-Heap sift operations.
- **Java Streams & Optional (`JavaStreamsOptionalVisualizer.jsx`)**: Lazy pipeline execution, vertical loop fusion, and Optional monad chaining.
- **JVM Heap & GC (`JvmMemoryVisualizer.jsx`)**: Young/Old Gen allocations, G1GC/ZGC collectors, and Virtual Threads.
- **Spring Bean Lifecycle**: 9-step IoC container bean initialization pipeline.
- **Spring MVC Flow**: DispatcherServlet request pipeline and security filter chain execution.
- **JPA Entity Lifecycle**: Transient, Managed, Detached, Removed states with N+1 Query Solver.
- **Spring Batch & Quartz**: Chunk-oriented processing engine and clustered JobStoreTX execution.

---

## 🔌 REST API Endpoints

- `GET /api/v1/topics` — Lists all 47 curriculum topics with level and summary metadata.
- `GET /api/v1/topics/category/{category}` — Lists topics for a specific category (`os`, `networking`, `dbms`, `java-spring`, `aiml`).
- `GET /api/v1/content/{category}/{topicId}` — Fetches raw 3-level Markdown educational content for a topic.

---

## 🧪 Testing & Verification Commands

```bash
# Run All Backend Tests (30 test suites across 47 topics)
wsl mvn test -f backend/pom.xml

# Run All Frontend Tests (29 test files, 91 unit/integration tests)
wsl npm test --prefix frontend

# Build Frontend Production Bundle
wsl npm run build --prefix frontend
```
