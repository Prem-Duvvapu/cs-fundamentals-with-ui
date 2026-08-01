# CS Fundamentals Visual Learning — Complete Plan

The full master plan is stored in the workspace and artifact system at:
- **Workspace File**: [`c:\Users\Hp\OneDrive\Desktop\cs-fundamentals-with-ui-\plan.md`](file:///c:/Users/Hp/OneDrive/Desktop/cs-fundamentals-with-ui-/plan.md)
- **Artifact Path**: [`implementation_plan.md`](file:///C:/Users/Hp/.gemini/antigravity-ide/brain/6e0bba2d-d62a-4f2d-b366-aab9345d8886/implementation_plan.md)

---

## Plan Structure Overview

### 1. Topic Breakdown (10 Subjects, ~75 Concepts)
- **Operating Systems**: Process state machine, Threads vs processes, CPU scheduling (MLFQ/CFS), Virtual memory page tables, Page replacement, Deadlocks (Banker's/RAG), Sync primitives, I/O models (epoll/io_uring).
- **Computer Networks**: OSI encapsulation, TCP 3-way handshake & teardown, TCP flow & congestion control (`cwnd`), HTTP/1.1 vs HTTP/2 vs HTTP/3, DNS recursive resolution, TLS 1.3 handshake, IP Subnetting (CIDR), Consistent hashing.
- **DBMS**: B+ Tree index, Query execution plans (CBO), Isolation levels, MVCC, 2-Phase Locking (2PL), Normalization (1NF $\rightarrow$ BCNF), Write-Ahead Logging (WAL), HikariCP connection pooling.
- **Core Java**: JVM memory layout, Garbage collection (G1/ZGC), Java Memory Model (happens-before), HashMap internals, ConcurrentHashMap (CAS + bucket locks), ClassLoader delegation, Dynamic Proxies & AOP.
- **Advanced Java (Concurrency)**: Thread 6-state machine, Locks (`ReentrantLock`, `ReadWriteLock`), Volatile & CAS, `ThreadPoolExecutor` internals, `CompletableFuture` pipelines, Virtual Threads (Project Loom), `ForkJoinPool` work stealing.
- **JVM Internals**: JIT compilation (C1/C2), JVM Stack frames, String pool interning, Reference types (Weak/Soft/Phantom), Memory leak patterns, GC tuning.
- **Spring Boot**: Bean lifecycle pipeline, Auto-configuration `@Conditional` chain, Spring MVC request lifecycle, Spring Security filter chain, `@Transactional` AOP, Actuator health, Profile config.
- **JPA / Hibernate**: Entity lifecycle (4 states), Persistence context & dirty checking, N+1 query solver, Lazy loading (`LazyInitializationException`), L2 Cache, Optimistic vs Pessimistic locking, SQL generation.
- **Spring Batch**: Job $\rightarrow$ Step $\rightarrow$ Chunk architecture, Commit intervals, Skip & Retry policies, Checkpointing & restartability, Partitioned steps, `JobRepository` metadata tables.
- **Quartz Scheduler**: JobDetail $\rightarrow$ Trigger architecture, Trigger state machine, Misfire handling, `@DisallowConcurrentExecution`, Clustered row locking (`QRTZ_LOCKS`), `RAMJobStore` vs `JobStoreTX`.

---

### 2. Standardized 3-Tab Concept Module Pattern
1. ⚡ **Interactive Visual Simulation** (Play/pause, step, sliders, inputs, live SVG/Canvas state inspector).
2. 📖 **Deep Dive & Interview Theory ("Probe Stack")**: Mental Model, Failure Modes, Trade-offs, Production Scenario, Code, SDE-2 Interview Q&A.
3. ✅ **Interview Self-Check Quiz**: Interactive questions with collapsible answer reveals.

---

### 3. Implementation Status & Location
- **Dev Server**: Active at **[http://localhost:5173/](http://localhost:5173/)**
- **Completed Modules**:
  - Phase 0: Shared infrastructure & hooks ([`useSimulationTimer.js`](file:///c:/Users/Hp/OneDrive/Desktop/cs-fundamentals-with-ui-/frontend/src/hooks/useSimulationTimer.js), [`useStepThrough.js`](file:///c:/Users/Hp/OneDrive/Desktop/cs-fundamentals-with-ui-/frontend/src/hooks/useStepThrough.js), [`ConceptModuleShell.jsx`](file:///c:/Users/Hp/OneDrive/Desktop/cs-fundamentals-with-ui-/frontend/src/components/shared/ConceptModuleShell.jsx)).
  - Phase 1: DBMS B+ Tree Index ([`BPlusTreeVisualizer.jsx`](file:///c:/Users/Hp/OneDrive/Desktop/cs-fundamentals-with-ui-/frontend/src/components/visualizers/dbms/BPlusTreeVisualizer.jsx)).
  - Phase 2: Core Java JVM Memory Heap Generations ([`JvmMemoryVisualizer.jsx`](file:///c:/Users/Hp/OneDrive/Desktop/cs-fundamentals-with-ui-/frontend/src/components/visualizers/java/JvmMemoryVisualizer.jsx)) & HashMap Internals ([`HashMapVisualizer.jsx`](file:///c:/Users/Hp/OneDrive/Desktop/cs-fundamentals-with-ui-/frontend/src/components/visualizers/java/HashMapVisualizer.jsx)).
  - Phase 4: Concurrency Virtual Threads (Loom) ([`VirtualThreadsVisualizer.jsx`](file:///c:/Users/Hp/OneDrive/Desktop/cs-fundamentals-with-ui-/frontend/src/components/visualizers/java/VirtualThreadsVisualizer.jsx)).
  - Phase 6: Networks Consistent Hashing Ring ([`ConsistentHashingVisualizer.jsx`](file:///c:/Users/Hp/OneDrive/Desktop/cs-fundamentals-with-ui-/frontend/src/components/visualizers/networking/ConsistentHashingVisualizer.jsx)).
