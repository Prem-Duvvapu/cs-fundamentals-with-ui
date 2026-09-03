# AI Agent Context — CS Fundamentals with UI

## Project Overview
Educational platform for Computer Science fundamentals, structured for **beginner → expert** learning paths with interactive visualizations. Purpose: interview preparation and deep understanding through visual flows across Operating Systems, Computer Networks, Database Management Systems, and Java / Spring Boot.

## Tech Stack
- **Backend**: Java 17+, Spring Boot 3.x, Maven
- **Frontend**: React 18+, Vite, React Router v6
- **Data**: Static content-driven (`content/<category>/`); JSON for animations/configs
- **Styling**: Vanilla CSS in one global `frontend/src/App.css`, driven by `:root` and
  `[data-theme]` design tokens. No CSS Modules, CSS-in-JS, or utility framework. See
  `docs/DESIGN_SYSTEM.md`.

## Directory Structure
```
/
├── AGENTS.md              # Context for AI agents
├── README.md              # Project overview & quickstart
├── CONTEXT.md             # System architecture & API documentation
├── content/               # Markdown educational content (63 topics)
│   ├── CONTENT_SPEC.md    # ★ Authoring contract — read before writing content
│   ├── os/                # Operating Systems (8 topics)
│   ├── networking/        # Computer Networks (12 topics)
│   ├── dbms/              # Database Management Systems (13 topics)
│   ├── java-spring/       # Java & Spring Boot Ecosystem (23 topics)
│   └── aiml/              # AI / ML Architecture (7 topics)
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

## Curriculum Roadmaps (63 Registered Topics)

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

### 🗄️ Database Management Systems (13/13 Topics)
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
- [x] Practical SQL Querying (joins, CTEs, aggregates, window functions, query correctness)
- [x] Distributed DBMS, 2PC & CAP Theorem (2-Phase Commit, 3PC, CAP Theorem, Quorum Consensus)

### ☕ Java & Spring Ecosystem (23/23 Topics)
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
- [x] Spring Boot Internals & Production Configuration (auto-configuration, profiles, Actuator)
- [x] Spring REST API Design & Error Handling (HTTP semantics, validation, pagination, Problem Details)
- [x] Spring Security (filter chain, sessions, JWT, OAuth2, CSRF, method security)
- [x] Spring Caching, Async Work & Scheduling (Redis, invalidation, stampede control, executor sizing)
- [x] Spring Testing & Production Readiness (test slices, Testcontainers, metrics, graceful shutdown)

### 🤖 AI / ML Architecture (7/7 Topics)
- [x] Machine Learning Fundamentals & Evaluation (learning types, algorithms, metrics, neural networks)
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
pairs; 25,200–37,800 total content lines; reading experience as the default tab.

`plan.md` is the authoritative SDE-2 coverage plan. It maps the full user-supplied checklist
to lessons, defines the implementation priority, and identifies the seven focused lessons added
in the 63-topic expansion. `content/COVERAGE_MANIFEST.json` enforces the mapping in CI.

### Phase status

| Phase | Goal | Status |
|---|---|---|
| **P0** | Replace the Markdown pipeline (GFM + KaTeX + Mermaid) | ✅ **Done** |
| **P1** | `CONTENT_SPEC.md` + `scripts/validate-content.mjs` + CI | ✅ **Done** |
| **P2** | Reading experience — compact topic chrome, responsive TOC, tier nav, interview deck | ✅ **Done** |
| **P3** | Simulation triage — keep ~14 engines, convert ~17 to Mermaid diagrams | ✅ **Done — 18 non-retained components removed, their dead App.css rules pruned, and the 3 orphaned hub sub-tabs removed** |
| **P4** | Content authoring, 63 topics in priority waves | ✅ **Done — 63/63 lessons and 83/83 manifest entries pass** |
| **P5** | Cross-topic search + per-category Interview Mode | ✅ **Done — `/search` and `/interview/:category` routes live, linked from the navbar** |
| **P6** | Verify, doc sync, ship | 🟡 **Verification suite + doc sync done; accessibility audit needs a real browser (not available here)** |

### What P0 delivered (already on this branch)
- `frontend/src/components/markdown/MarkdownRenderer.jsx` — full GFM + math + highlighting
- `frontend/src/components/markdown/MermaidBlock.jsx` — lazy-loaded, centrally themed, error-tolerant
- `TopicViewer.jsx` rewritten to delegate; `renderMarkdown()` and `dangerouslySetInnerHTML` removed
- `TopicViewer.markdown.test.jsx` — golden-file suite over **all 63** content files
- Vitest upgraded 1.x → 2.1.8 with ESM deps inlined in `vite.config.js` (required for react-markdown 9)
- `App.css` — dual-theme tokens, responsive shell, reader typography, Markdown surfaces, utilities,
  accessible simulator primitives, and reduced-motion behavior
- Topic pages own one semantic H1, collapse to a one-line desktop toolbar while scrolling, leave
  the toolbar in document flow on mobile, and default the TOC closed below 1024px.

### What P3/P5 delivered so far (this branch)
- `backend/.../controller/DiscoveryController.java` + `service/DiscoveryService.java` — stateless
  `GET /api/v1/search` and `GET /api/v1/interview/questions`, backed by one immutable index built
  from `TopicService` + `ContentService` at startup (no second topic registry, no whole-curriculum
  frontend load). Both have JUnit coverage (`DiscoveryControllerTest`, `DiscoveryServiceTest`).
- `frontend/src/utils/interviewQuestions.js` — section-aware Markdown Q&A parser (mirrors the Java
  parser); `TopicViewer.jsx`'s `InterviewDeck` now uses it and renders answers through
  `MarkdownRenderer` instead of plain text, fixing the old regex's `### Further Reading` leak.
- `frontend/src/components/visualizers/topicVisualizerRegistry.jsx` — topic id → lazy visualizer
  map; `TopicPage.jsx` hides the Simulation tab for any topic without an entry, replacing the old
  `renderVisualizer()` switch that could show the wrong hub sub-tab for SQL, HashMap/concurrency,
  Spring production testing, and ML fundamentals.
- `scripts/audit-simulation-questions.mjs` + `content/SIMULATION_QUESTION_MIGRATION.json` — the P3
  migration gate. Extracts every legacy JSON/inline interview and quiz question, and requires each
  to be resolved as `retained` (still owned by one of the 14 kept engines), `migrated` (a literal
  quote from it is verified present in the target lesson), or `superseded` (replaced by stronger
  lesson coverage, with a rationale) before that source can be deleted. 109/109 resolved, gate
  passes (`node scripts/audit-simulation-questions.mjs`).
- 18 non-retained visualizer components (plus their engines, tests, and JSON data) deleted across
  4 commits, using the migration gate above as the deletion prerequisite: 7 DBMS hub sub-tabs
  (dbms-introduction, dbms-architecture, er-model, storage-raid-indexing, transactions-acid,
  query-optimization, distributed-databases-cap — the last retargeted to the retained
  `ConsistentHashingVisualizer` instead of losing its Simulation tab entirely), io-systems,
  design-patterns-solid, 8 core-Java topics (java-execution-pipeline, java-memory-model,
  java-oop-pillars, java-static-final-records, java-functional-lambdas, java-generics,
  java-collections-framework, java-streams-optional), and spring-batch-lifecycle plus the inline
  (never engine-backed) spring-bean-lifecycle/jpa-hibernate-lifecycle step-throughs.
  `DbmsVisualizer.jsx` shrank from 12 sub-tabs to 5; `JavaSpringVisualizer.jsx` from ~17 to 6.
- `frontend/src/components/shared/InterviewDeck.jsx` — the step-through deck extracted out of
  `TopicViewer.jsx`, taking a flat `questions` array plus an optional `renderMeta(question)` slot
  for per-question context. `TopicViewer.jsx` uses it with no `renderMeta` (every question already
  shares the page's topic); `InterviewPage.jsx` passes a `renderMeta` that links back to the
  question's source topic, since a category deck spans many topics.
- `frontend/src/pages/SearchPage.jsx` (`/search`) — debounced (300ms) search box plus category
  filter chips against `GET /api/v1/search`, syncing `q`/`category` into the URL via
  `useSearchParams` so results are shareable/bookmarkable. Results render as the same `.topic-row`
  cards `HomePage.jsx` uses.
- `frontend/src/pages/InterviewPage.jsx` (`/interview/:category`, `:category` may be `all` to omit
  the server-side category filter) — category tabs + difficulty filter chips trigger a fresh fetch
  from offset 0; a "Load N more" button pages through `GET /api/v1/interview/questions`'s
  offset/limit/total contract; a shuffle button reorders whatever's already loaded client-side.
  Both routes are linked from `Navbar.jsx`.

### Current implementation priorities

1. **Finish P6.** Verification suite (backend 47/47, frontend 412/412+, build, content validator,
   migration gate) and doc sync are done as of 2026-09-02 — see `plan.md`'s Phase G item 4 for the
   full verification log. What's left: the responsive/accessibility audit needs a real browser
   (Lighthouse/axe), which this environment doesn't have.

The `GET /api/v1/content/{category}/{topicId}` 200-instead-of-404 bug the live route check
surfaced is fixed: `ContentService.exists(category, topicId)` and `ContentController` now return
a real 404 for an unregistered id (and 500 if `loadContent` hits an I/O error), so
`TopicViewer.jsx`'s existing `res.ok` check works as designed. No frontend change was needed —
the frontend was already correct; only the backend was lying about its status code.

The P3 cleanup (dead App.css rules from the 18 removed components; 3 orphaned
JavaSpringVisualizer sub-tabs) is done — see the P3 audit checkpoint in `plan.md` for the method
and the exact classes/lines removed. A separate, unrelated dead-CSS block found along the way —
`.state-pill`/`.state-pill--*` (BEM-modifier style), zero JSX references, predating the P3
removals and likely orphaned by an earlier refactor of the shared `StatePill.jsx` component (which
renders `u-pill`/`u-pill-<tone>` instead) — is also removed now (2026-09-02).

### Rules for content work (P4)
Each work unit is **one agent, one file**, and touches **only** `content/<category>/<file>.md`.
All 63 topics are registered at all integration points, so content work requires
**zero** registration changes. Never edit `.java`, `.jsx`, `.js` or `.json` in a content unit.

Current contract-completion order:
- **Complete** — Core Java, Advanced Java, Spring, OS, Networking, DBMS and AI/ML
- **Verified** — 28,683 curriculum lines, 277 Mermaid diagrams and 883 interview Q&As
- **Gate** — `node scripts/validate-content.mjs` passes all 63 lessons and 83 manifest entries;
  it also parses every Mermaid diagram with the real `mermaid` package (not mocked, unlike the
  Vitest suites), so a diagram with a genuine syntax error fails the gate instead of shipping to
  the error fallback in `MermaidBlock.jsx`

`content/dbms/06-transactions-acid.md` is the full-contract **exemplar** every later unit matches.

### Before deleting any simulator (P3)
`frontend/src/data/*.json` files contain `theoryData.interviewQA` and `quizData` — real
interview questions. **Migrate them into the topic's Markdown before deleting anything.**
This is the easiest way to silently lose work in this project.

### Sources and further study

Add a short `### Further Reading` section at the end of a rebuilt topic when authoritative primary
sources materially help the reader go deeper. Prefer standards bodies, official project documents,
vendor documentation and original papers; use descriptive link text and do not add link collections
that are not referenced by the lesson. UI work follows [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/),
[MDN responsive CSS guidance](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using)
and [Mermaid theming](https://mermaid.js.org/config/theming.html).

## Conventions
- **Commits**: `feat/<date>-<topic>` pattern
- **Branches**: `feat/<YYYY-MM-DD>-<topic>` or `fix/<description>`
- **Code comments**: Minimal — use self-documenting code
- **Backend API**: RESTful, `/api/v1/...` prefix
- **Frontend state**: React hooks (`useState`/`useReducer`), simulation engine classes in `src/utils/simulationEngines/`
- **Documentation & Test Synchronization Rule**: After ANY code, architectural, or feature changes, ALWAYS update the required documentation markdown files (`README.md`, `CONTEXT.md`, `AGENTS.md`) and write/update unit & integration tests (`frontend` Vitest suites and `backend` JUnit 5 tests), verifying all tests pass cleanly before completing the task.
- **RCA Rule**: Search `RCA.md` before investigating a repeated symptom. When an agent-created
  change causes a confirmed regression or a shared-agent workflow failure, add or update an RCA
  entry with evidence, root cause, resolution, verification, prevention, and the resolving commit.
  Do not leave registered content files deleted between tool calls during a rewrite.

## Command Execution Environment
- **Commands Rule**: Use the active shell environment. When invoked from Windows PowerShell,
  prefix Linux commands with `wsl`; do not prefix commands when already running inside WSL/Linux.
