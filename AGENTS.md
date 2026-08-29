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
├── content/               # Markdown educational content (56 topics)
│   ├── CONTENT_SPEC.md    # ★ Authoring contract — read before writing content
│   ├── os/                # Operating Systems (8 topics)
│   ├── networking/        # Computer Networks (12 topics)
│   ├── dbms/              # Database Management Systems (12 topics)
│   ├── java-spring/       # Java & Spring Boot Ecosystem (18 topics)
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
- `## 🔴 Expert Level` — Implementation details, Linux kernel / JVM internals, trade-offs, Common Misconceptions, and Interview Q&As

**Before writing or editing any content file, read [`content/CONTENT_SPEC.md`](content/CONTENT_SPEC.md).**
It is the authoring contract: depth targets (400–600 lines), required Mermaid diagrams
(≥3 per file), interview Q&A format (12–15 pairs), permitted Markdown, and voice.

### Content rendering pipeline
Content is rendered by `frontend/src/components/markdown/MarkdownRenderer.jsx`
(react-markdown + remark-gfm + remark-math/rehype-katex + rehype-highlight). Content may use:
- Full GitHub-Flavoured Markdown — nested lists, blockquotes, links, emphasis, task lists, aligned tables
- KaTeX math — `$O(\log n)$` inline, `$$…$$` block
- **Mermaid diagrams** in ` ```mermaid ` fences, rendered by `MermaidBlock.jsx`

Raw HTML is not permitted. Diagrams should be Mermaid, not ASCII box art — the ASCII
diagrams in older files are legacy being replaced, not a pattern to copy.

## Curriculum Roadmaps (56 Complete Topics)

### 💻 Operating Systems (8/8 Topics)
- [x] Process Management (states, PCB, threads, fork, COW)
- [x] Memory Management (paging, segmentation, virtual memory, LRU)
- [x] CPU Scheduling (FCFS, SJF, RR, MLFQ, CFS)
- [x] Synchronization (semaphores, monitors, RCU, lock-free)
- [x] Deadlocks (banker's algorithm, detection, prevention)
- [x] File Systems (inodes, Ext4, Btrfs, ZFS, VFS)
- [x] I/O Systems (DMA, interrupts, epoll, io_uring)
- [x] Disk Scheduling & File Allocation (FCFS, SSTF, SCAN, C-SCAN, allocation methods)

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

### 🗄️ Database Management Systems (12/12 Topics)
- [x] DBMS Introduction & Architecture (What is DBMS, 6 Components, File System vs DBMS, Languages, Types)
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

### ☕ Java & Spring Ecosystem (18/18 Topics)
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
- [x] SOLID Principles & Design Patterns (SRP, OCP, LSP, ISP, DIP, Singleton, Observer, Factory, Strategy)

### 🤖 AI / ML Architecture (6/6 Topics)
- [x] Vector Embeddings & Vector DBs (Embedding vectors, cosine similarity, HNSW ANN search, pgvector)
- [x] RAG Architecture (Chunking strategies, dense/sparse retrieval, context assembly, reranking)
- [x] LLM Model Serving & Low-Latency Inference (vLLM PagedAttention, KV caching, continuous batching)
- [x] LLM Sampling Parameters & ReAct Agents (Temperature, Top-P, tokenization, ReAct tool execution)
- [x] Feature Stores & MLOps Architecture (Online/offline stores, PSI data drift detection, retraining)
- [x] 2-Stage Recommendation Engine (Two-tower candidate retrieval, deep ranking models, pCTR scoring)

## Active Roadmap — Curriculum Depth Rebuild

The platform is being rebalanced from **simulation-first** to **content-first**. Measured at
the start of this effort: 15,592 LOC of simulation code vs 7,491 lines of curriculum content
(~134 lines/topic — cheatsheet depth), 4 interview Q&A lines repo-wide, and 28 content files
rendering raw LaTeX because the old renderer was a 68-line regex chain.

**Target:** every topic at 400–600 lines with ≥3 Mermaid diagrams and 12–15 interview Q&A
pairs; ~28,000 total content lines; reading experience as the default tab.

### Phase status

| Phase | Goal | Status |
|---|---|---|
| **P0** | Replace the Markdown pipeline (GFM + KaTeX + Mermaid) | ✅ **Done** |
| **P1** | `CONTENT_SPEC.md` + `scripts/validate-content.mjs` + CI | ◐ Spec done; validator + CI pending |
| **P2** | Reading experience — default Study tab, TOC rail, tier nav, interview deck | ☐ Not started |
| **P3** | Simulation triage — keep ~14 engines, convert ~17 to Mermaid diagrams | ☐ Not started |
| **P4** | Content authoring, 56 topics in 3 waves | ☐ Not started |
| **P5** | Cross-topic search + per-category Interview Mode | ☐ Not started |
| **P6** | Verify, doc sync, ship | ☐ Not started |

### What P0 delivered (already on this branch)
- `frontend/src/components/markdown/MarkdownRenderer.jsx` — full GFM + math + highlighting
- `frontend/src/components/markdown/MermaidBlock.jsx` — lazy-loaded, centrally themed, error-tolerant
- `TopicViewer.jsx` rewritten to delegate; `renderMarkdown()` and `dangerouslySetInnerHTML` removed
- `TopicViewer.markdown.test.jsx` — golden-file suite over **all 56** content files (146 assertions)
- Vitest upgraded 1.x → 2.1.8 with ESM deps inlined in `vite.config.js` (required for react-markdown 9)
- `App.css` — styles for blockquotes, links, KaTeX, Mermaid containers, task lists, scrollable tables

### Rules for content work (P4)
Each work unit is **one agent, one file**, and touches **only** `content/<category>/<file>.md`.
All 56 topics are already registered at all 7 registration points, so content work requires
**zero** registration changes. Never edit `.java`, `.jsx`, `.js` or `.json` in a content unit.

Wave order (thinnest + highest interview value first):
- **Wave A (22 files)** — all 6 `aiml`; `networking` 02, 03, 04, 06, 07, 08; `java-spring` 01c, 01d, 01f, 01h, 01j, 02, 03, 04, 05, 06
- **Wave B (22 files)** — remaining `java-spring` and `networking`; all 8 `os`
- **Wave C (12 files)** — all `dbms` (already deepest; needs diagrams + Q&A, not a rewrite)

Before Wave A begins, one agent must author `content/dbms/06-transactions-acid.md` to the full
contract as the **exemplar** every later unit matches.

### Before deleting any simulator (P3)
`frontend/src/data/*.json` files contain `theoryData.interviewQA` and `quizData` — real
interview questions. **Migrate them into the topic's Markdown before deleting anything.**
This is the easiest way to silently lose work in this project.

## Conventions
- **Commits**: `feat/<date>-<topic>` pattern
- **Branches**: `feat/<YYYY-MM-DD>-<topic>` or `fix/<description>`
- **Code comments**: Minimal — use self-documenting code
- **Backend API**: RESTful, `/api/v1/...` prefix
- **Frontend state**: React hooks (`useState`/`useReducer`), simulation engine classes in `src/utils/simulationEngines/`
- **Documentation & Test Synchronization Rule**: After ANY code, architectural, or feature changes, ALWAYS update the required documentation markdown files (`README.md`, `CONTEXT.md`, `AGENTS.md`) and write/update unit & integration tests (`frontend` Vitest suites and `backend` JUnit 5 tests), verifying all tests pass cleanly before completing the task.

## Command Execution Environment
- **Commands Rule**: ALWAYS prefix shell commands with `wsl` (e.g. `wsl npm test`, `wsl npm run build`, `wsl git status`, `wsl git commit ...`).
