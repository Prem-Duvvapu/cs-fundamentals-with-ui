# AI Agent Context — Backend Engineering

## Current completion scope — October 21

The [cache coalescing exercise](examples/backend-data-services/README.md#6-measure-and-limit-a-cold-key-stampede)
extends the existing cache-aside path through an optional per-instance bounded coordinator. Keep
canonical tenant/version checks, the unchanged default constructor, finite waiter/flight limits,
shared deadlines, failure propagation and timed-out worker ownership until actual completion.
The budget begins after initial metadata/cache lookup; separate instances do not share a lock.
Require actual Redis/Mongo cases without skips and exact owned keys/database/process cleanup.
If a CI service exits, retain bounded credential-redacted startup state/logs before teardown;
never replace the actual-service gate with setup success.
MongoDB8 has a documented Linux6.19–7.0.13 incompatibility. Observe the Docker daemon kernel,
not the client kernel or image tag; keep the supported LTS service runner, exact image and startup
guard. A runtime compatibility preflight does not replace any of the17 service tests.
Defer the first cancellation through complete normal cleanup, not only Popen assignment.

The [session/WebSocket lab](examples/backend-websocket/README.md) imports unchanged Task Tracker
source and adds only its explicit lab routes and ordered session-login chain. Keep real form
login/CSRF/ID rotation, exact bound Origin, cookie-only identity and service authorization. Upgrade
admission requires a live session-ID/principal registration; invalidation and admission share a
lock, and stale requests cannot register themselves. Preserve the positioned actual reauthentication
regression,22 HTTP/session/socket cases,9 policy tests, bounded ACK/queue/native timeouts, actual
expiry and exact cleanup. No TCP-stall, distributed-session or GUI/browser evidence is implied.

Preparation executes all nine policy tests so a fresh Maven cache includes the dynamic test
provider; the complete transport run still uses -o. Preserve the offline/preparation receipt gates
and fixed phase/source-line-only failure diagnostics. Scope-entry state changes and complete child
cleanup must sit inside their restoration/deferral guards, including the first signal on success.

When editing curriculum prose, search `content/SIMULATION_QUESTION_MIGRATION.json` for literal
evidence in the affected lesson and run `node scripts/audit-simulation-questions.mjs --check`.
Preserving question IDs, code blocks and diagrams alone does not preserve these prose citations;
run this gate for compression/paraphrase as well as simulator deletion. See RCA15.

The [Spring configuration/JDI lab](examples/backend-debugging/README.md) must keep imported Task
Tracker source/resources unchanged. Preserve actual Environment origins, bound exposure, HTTP and
profile-selected bean checks; never replace them with a hand-built precedence resolver. Bad-port
failure occurs during real configuration-condition conversion before ordinary binding finishes.
JDI may listen only on its ephemeral loopback endpoint for its fixed owned target; keep event/thread/
frame identity, finite waits, cleanup and source checks. Preserve sanitized reports, cancellation
ownership guards and dedicated actual-service CI. A JDI fixture is not a GUI or participant session.

The actual messaging gate now includes `KafkaRebalanceBrokerTest`. Keep two concurrent consumer
owner threads, broker-described disjoint assignments, real revocation callbacks, exact uncommitted
partition/offset/event replay, durable inbox deduplication and fresh recovery commits. Only wakeup
may cross consumer threads. Owner-thread close must handle a deliberately pending wakeup while
still committing completed revoked offsets; do not swallow callback/commit errors. Require all
three actual broker classes with zero skips, bounded joins and deletion of exact generated resources.
Native compilation or nineteen tests with three broker skips is not rebalance execution evidence.

The [registered-partner SSRF lab](examples/backend-ssrf/README.md) is independent of the platform
runtime. Keep exact operator origins/operations, all-answer address validation, pinned numeric
connection and original-host TLS identity coupled. No redirect, caller credential/proxy forwarding,
raw-URL CLI or fixture exception from request data is allowed. Require actual owned HTTP/TLS and
cleanup evidence; pure address tests are not Internet/IPv6 transport or production egress proof.
Preserve typed oversized framing rejection and recovery. Executable TERM/INT policy must defer
delivery across Popen assignment/ownership and restore prior state even when handler setup fails;
keep library callers' signal policy and masks unchanged. No SIGKILL cleanup guarantee is made.

The Java category includes the closed-by-default `JavaCourseRevision` two-entry pilot (OOP, then
JDK/runtime/JVM). Keep canonical topic data, IDs, bookmark/completion state, reading hashes and
practice drafts shared with the main list. The mapping contains presentation/source/section links,
not copied lesson metadata or a second registry. Credit original notes with native same-tab links;
do not expand the course-order list until the reviewed two-lesson recognition task is actually
performed and revisions/retesting are recorded. UI/browser checks do not close CLOSE-02.

The core curriculum and UI refinement are delivered. The expanded practical plan remains active;
use [the capability ledger](docs/BACKEND_AI_IMPLEMENTATION_RESULTS_2026-10-16.md#capability-ledger)
and its dated merged-release evidence, not earlier historical pending counts, for current scope.
PR79 verified all eight actual kind recovery/resource cases with cleanup; cloud IAM/network cases
remain open. Both frozen model prompts fail the held-out field gate and keep the original default.
Follow [editorial maintenance](docs/EDITORIAL_MAINTENANCE.md) when correcting claims or dependencies;
keep declared, resolved and executed compatibility distinct. No prepared protocol or AI-authored
persona counts as a real learner, manual screen-reader or browser-zoom session.


## Visitor analytics

`main.jsx` mounts `@vercel/analytics/react` once for production builds. Keep
`redactAnalyticsUrl` and its privacy regressions: query strings and fragments
are removed before page locations are sent. No practice answers, notes, simulation
inputs, or custom events are collected. Analytics is independent per deployment;
Vercel supplies its endpoint only after Web Analytics is enabled and redeployed.

## Learning network

`frontend/src/components/LearningNetworkNav.jsx` connects this app to
https://learning-hub-with-ui.vercel.app/ and the three sibling apps.
Keep links native and same-tab, retain the current-subject marker, and use
`App.css` theme tokens. Each app keeps independent state; do not imply shared
progress. Update the component contract test whenever a destination changes.

## Project Overview
Educational platform for Computer Science fundamentals, structured for **beginner → expert** learning paths with interactive visualizations. Purpose: interview preparation and deep understanding through visual flows across Operating Systems, Computer Networks, Database Management Systems, and Java / Spring Boot.

## Tech Stack
- **Backend**: Java 17+, Spring Boot 4.1.x, Maven
- **Frontend**: React 19, Vite, React Router v7
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
├── content/               # Markdown educational content (68 topics)
│   ├── CONTENT_SPEC.md    # ★ Authoring contract — read before writing content
│   ├── os/                # Operating Systems (8 topics)
│   ├── networking/        # Computer Networks (12 topics)
│   ├── dbms/              # Database Management Systems (13 topics)
│   ├── java-spring/       # Java & Spring Boot Ecosystem (23 topics)
│   ├── aiml/              # AI / ML Architecture (7 topics)
│   └── devops/            # DevOps & Infrastructure (5 topics)
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

## Curriculum Roadmaps (68 Registered Topics)

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

### ⚙ DevOps & Infrastructure (5/5 Topics)
- [x] Docker & Container Fundamentals (Namespaces, cgroups, image layers, multi-stage builds, networking modes, containerd/runc runtime stack)
- [x] Kubernetes Core Architecture, Networking & Deployments/Scaling (Control plane/nodes, Pods, Deployments and rolling updates, Services and kube-proxy, HPA)
- [x] Nginx as Reverse Proxy & Load Balancer (Event-driven worker architecture, load balancing algorithms, TLS termination, caching, rate limiting)
- [x] CI/CD Pipelines & Deployment Strategies (CI vs CD, build-once/promote, rolling/blue-green/canary deploys, feature flags, progressive delivery, GitOps)
- [x] Orchestration Trade-offs, Infrastructure as Code, Observability & Cloud Fundamentals (When to use Kubernetes, Terraform state/plan/apply, the three pillars of observability, IaaS/PaaS/SaaS, shared responsibility)

A sixth category added 2026-09-10 for SDE-2 backend interview prep (containers, orchestration,
delivery, and operations) alongside the existing five. Registration infrastructure (category
tokens, home/nav wiring, `CONTENT_SPEC.md`'s category list) landed with this first topic rather
than as an empty placeholder — see `content/devops/01-docker-fundamentals.md` for the exemplar
this category's later topics should match in depth and voice. The remaining four planned topics
landed 2026-09-13, completing the category at 5/5; all five are Study-only (no dedicated
visualizer), consistent with several other conceptual topics across the curriculum.

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
| **P6** | Verify, doc sync, ship | ✅ **Done — verification suite, doc sync, and the accessibility audit (axe via Playwright + pre-installed Chromium) all pass with 0 violations** |

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
- `frontend/src/pages/ProgressPage.jsx` (`/progress`) — a stats dashboard over the same
  `GET /api/v1/topics` fetch as `HomePage.jsx`, combined with `useTopicProgress()`'s
  bookmark/completed state: overall completion, a bar per category and per level, the bookmarked
  list, and a "continue where you left off" pick (the first not-completed topic in curriculum
  order). No new endpoint. `frontend/src/utils/progressStats.js` holds the math as pure
  `(topics, progress) → result` functions; `frontend/src/utils/topicCategories.js` gained
  `CATEGORY_ORDER`/`LEVEL_ORDER`/`LEVEL_LABELS`/`LEVEL_GLYPHS` exports so this page and
  `HomePage.jsx` share one source instead of duplicating them.
  All three of `/search`, `/interview/:category`, and `/progress` are linked from `Navbar.jsx`.

### Current implementation priorities

**2026-09-09 audit remediation:** the findings from that audit were resolved as tested release
fixes (see `PROJECT_REVIEW_2026-09-14.md` for the current, superseding audit trail). The frontend
Docker build now uses the repository root context; generated diagrams
are XML-serialized, font-embedded, input-fingerprinted, browser-decoded, and atomically published.
Simulation endpoints reject malformed or unbounded work with HTTP 400, `/31` and `/32` subnet host
ranges are explicit, and content is resolved through an exact registered-topic index that fails
fast when incomplete. Frontend reads cancel superseded requests, TOC observation begins after lazy
Markdown headings mount, mobile overflow is locally contained, and failed routes provide recovery
actions. Dependency automation is enabled, with the frontend on Vite 8/Vitest 5/React Router 7 and
the backend on the Java 17-compatible Spring Boot 4.1 line, which moved default JSON handling to
Jackson 3 (`tools.jackson.databind`) and split `@WebMvcTest` into the `spring-boot-webmvc-test`
module with `@MockitoBean` replacing `@MockBean`. Four proven-unused shared files listed in the
audit were removed.

P6 is complete, including the accessibility audit (UI-revamp Phase 7, previously listed as
blocked). This environment does have a browser (Chromium via Playwright, pre-installed): axe-core
was run against 5 routes (`/`, `/topic/:id` for a hub topic and a direct-visualizer OS topic,
`/search`, `/interview/all`) in both themes — 10 checks, 28 violations found and fixed, 0
remaining. Fixes: `HomePage.jsx`/`SearchPage.jsx`/`InterviewPage.jsx` each nested a second
`<main aria-live="polite">` inside `App.jsx`'s `<main className="main-content">` (landmark
violations) — changed to `<div aria-live="polite">`, the live-region behavior doesn't require a
landmark role. Mermaid edge labels were unreadable in dark mode (contrast 1.29) because Mermaid's
own injected `<style>` hardcodes a white `.edgeLabel` background that the `edgeLabelBackground`
theme variable doesn't reliably override — fixed with an `!important` CSS rule in `App.css`.
`--text-muted`/`--state-idle`/`--syn-comment` in the light theme (`#6b7688`) failed 4.5:1 against
several backgrounds — darkened to `#5f6a7c`. Every Markdown table rendered the same
`aria-label="Scrollable table"`, so a lesson with several tables produced duplicate-landmark
findings — `MarkdownRenderer.jsx`'s `table()` renderer now numbers them per document.

UI-revamp Phase 8 (delete the legacy CSS token shim, delete the dead CSS classes, sync
`AGENTS.md`) is also done. The shim (`--bg-dark`, `--bg-card`, `--border-color`,
`--accent-{purple,blue,green,amber,red,pink}`, `--font-main`) still had 77 live references (25 in
App.css alone for `--border-color`, plus 5 direct `--accent-purple` refs in networking visualizer
JSX) — every reference was mechanically substituted to its canonical token
(`--border-color`→`--border-default`, `--accent-purple`→`--cat-os-base`, etc., a pure value alias
so the substitution changes no rendered color) before the shim itself was deleted. Roughly 90 dead
CSS classes were removed — largely two whole superseded UI generations left in place after their
JSX moved on: the pre-Phase-3 HomePage (`.home-header`, `.card-grid`, `.card`, `.badge.beginner`,
`.roadmap-index-selector`, `.ordered-topic-row`, `.topic-title`, `.category-page`, …) and the
pre-Phase-6 B+Tree/TCP-handshake/transactions-ACID visualizers (`.btree-container`, `.leaf-node`,
`.handshake-diagram`, `.host-column`, `.tx-box`, …), plus a few standalone strays
(`.panel`/`.panel--*` and `.metric-tile__label/value`, both BEM-scaffolded duplicates of the real
`u-panel`/`metric-tile-label` classes their components actually render — the same pattern as the
`.state-pill` finding below; a `u-pad`/`u-caption`/`u-mono`/… utility-class family that was never
adopted). Compound selectors sharing a rule with a still-live class (e.g.
`.roadmap-index-selector, .roadmap-selector, .category-selector { … }`) were trimmed to just the
live sibling, not deleted outright. Verified via a script comparing every class token parsed out
of App.css's own selectors against a whole-source scan of `frontend/src/**/*.{jsx,js,css}`, with
manual review of every hit for template-literal class construction (`` `u-pill-${tone}` ``,
`` `tier-badge--${tier}` ``) and runtime-injected classes (`hljs-*`, KaTeX's `mord`/`mop`/…) that a
literal-string scan can't see — both false-positive categories were excluded from the delete list.
414/414 frontend tests, 47/47 backend tests, and a production build all stayed green throughout.

**Light-theme follow-up fixed 2026-09-08:** all 16 component backgrounds that still hardcoded
`#0f172a` now use semantic `--bg-inset`/`--bg-raised` tokens, including the shared select, number,
and text inputs. The CPU status gradient also uses category/inset tokens. A focused CSS regression
test prevents the dark literal from returning to themed component backgrounds.

The `GET /api/v1/content/{category}/{topicId}` 200-instead-of-404 bug the live route check
surfaced is fixed. The follow-up audit also removed the unsafe filename-prefix fallback:
`ContentService` builds an exact category/topic-to-file index, throws typed missing/read failures,
and refuses startup when the registered curriculum is incomplete. `ContentController` translates
those failures to 404/500 without matching error strings.

The P3 cleanup (dead App.css rules from the 18 removed components; 3 orphaned
JavaSpringVisualizer sub-tabs) is done — see the P3 audit checkpoint in `plan.md` for the method
and the exact classes/lines removed. A separate, unrelated dead-CSS block found along the way —
`.state-pill`/`.state-pill--*` (BEM-modifier style), zero JSX references, predating the P3
removals and likely orphaned by an earlier refactor of the shared `StatePill.jsx` component (which
renders `u-pill`/`u-pill-<tone>` instead) — is also removed now (2026-09-02).

### Mermaid diagram rendering (completed 2026-09-08)

Live client rendering previously exposed a shared-state race, indefinite loading, font-measurement
race, empty-color crash, and clipped HTML labels. Browser measurements established that Mermaid's
label widths could be 15–25% too narrow. Those runtime workarounds have now been retired because
the build-time renderer serializes the work, waits for the real font, supplies resolved theme
colors, and corrects each SVG's geometry once before publication. Also found and fixed along the
way: `content/os/03-cpu-scheduling.md`'s gantt chart used
`dateFormat X` (Unix seconds) with values authored as milliseconds, so `axisFormat %L` (the
sub-second remainder) showed "000" at every tick — `dateFormat x` (Unix milliseconds) is correct.

`scripts/render-diagrams.mjs` renders every diagram once per theme, corrects label geometry,
XML-serializes the SVG, embeds a subset of the measured font (curriculum characters only, instanced
to the 400-700 weight range — 49 MB of assets down to 31 MB), and browser-decodes every result before replacing
the prior complete asset set. Output goes to `frontend/public/diagrams/<hash>-{dark,light}.svg`;
the shared hash lives in `frontend/src/utils/diagramHash.js`, and the manifest records dimensions,
source, and a rendering-input fingerprint. `MermaidBlock.jsx` selects the theme asset, supplies
intrinsic sizing and a label-derived description, exposes diagram source as a text alternative,
and provides a keyboard-accessible full-size link. Mermaid and Playwright remain development-only.
`npm run diagrams:check --prefix frontend` validates 295 manifest entries, fingerprints, and XML;
`npm run diagrams:decode --prefix frontend` verifies all 590 assets through Chromium in CI.

### Rules for content work (P4)
Each work unit is **one agent, one file**, and touches **only** `content/<category>/<file>.md`.
All 68 topics are registered at all integration points, so content work requires
**zero** registration changes. Never edit `.java`, `.jsx`, `.js` or `.json` in a content unit.

Current contract-completion order:
- **Complete** — Core Java, Advanced Java, Spring, OS, Networking, DBMS, AI/ML and DevOps
- **Verified** — 32,531 curriculum lines, 295 Mermaid diagrams and 953 interview Q&As across 68 lessons
  (63 from the P4 content-depth rebuild plus all 5 `devops/` topics — `docker-fundamentals` added
  2026-09-10, and `kubernetes-fundamentals`, `nginx-reverse-proxy`,
  `cicd-pipelines-deployment-strategies` and `cloud-native-operations` added 2026-09-13, completing
  the category)
- **Gate** — `node scripts/validate-content.mjs` passes all 68 lessons and 83 manifest entries, and
  prints the corpus-wide Mermaid type mix each run (reported, never enforced — see `CONTENT_SPEC.md`
  section 5 for how to pick a type);
  it also parses every Mermaid diagram with the real `mermaid` package (not mocked, unlike the
  Vitest suites), so a diagram with a genuine syntax error fails the gate instead of shipping to
  the error fallback in `MermaidBlock.jsx`, and it enforces the interview-answer depth bar
  (≥ 3 clauses per answer, counting semicolons as well as full stops — see `CONTENT_SPEC.md` §10
  for the one rule it deliberately leaves to human review)

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
- **Client-only persistence**: theme (`hooks/useTheme.js`) and per-topic bookmark/completed
  progress (`utils/topicProgress.js` + `hooks/useTopicProgress.js`) both persist to `localStorage`
  under a `cs-fundamentals-*` key and broadcast changes via a `window` `CustomEvent`, with no
  backend involvement — follow this pattern for any new client-only preference or progress state.
  `topicProgress.js` additionally exposes `exportProgress()`/`importProgress()` (a versioned JSON
  envelope, merge-only on import) behind "Export progress"/"Import progress" buttons on the
  `/progress` dashboard — the escape hatch for state that only ever lives in one browser's
  storage. The guided product tour (`hooks/useProductTour.js`) deliberately does **not** follow
  this pattern: it is opt-in, keeps no flag, and never opens on its own.
- **Guided tour**: `components/shared/ProductTour.jsx` + `hooks/useProductTour.js` +
  `utils/tourSteps.js`/`utils/tourPosition.js`. Both the hook and the overlay are mounted once in
  `App.jsx` (a sibling of `<Routes>`), not inside a page component, specifically so the tour's
  state survives its own cross-route navigation (home → `/topic/cpu-scheduling`) instead of
  resetting when the matched route unmounts. The tour is opt-in and never opens unprompted, so a
  test that renders `<App />` for something unrelated needs no setup to keep it out of the way —
  it only appears once something calls `start()` (see `AppRouting.test.jsx`).
- **Documentation & Test Synchronization Rule**: After ANY code, architectural, or feature changes, ALWAYS update the required documentation markdown files (`README.md`, `CONTEXT.md`, `AGENTS.md`) and write/update unit & integration tests (`frontend` Vitest suites and `backend` JUnit 5 tests), verifying all tests pass cleanly before completing the task.
- **RCA Rule**: Search `RCA.md` before investigating a repeated symptom. When an agent-created
  change causes a confirmed regression or a shared-agent workflow failure, add or update an RCA
  entry with evidence, root cause, resolution, verification, prevention, and the resolving commit.
  Do not leave registered content files deleted between tool calls during a rewrite.

## Command Execution Environment
- **Commands Rule**: Use the active shell environment. When invoked from Windows PowerShell,
  prefix Linux commands with `wsl`; do not prefix commands when already running inside WSL/Linux.

## Java learning improvement work

The [Java learning plan](JAVA_LEARNING_PLAN.md) tracks the September 23 content and
reader audit follow-up in independently verified packages. Java/Spring explanations
assume basic programming knowledge; Java, OOP and framework prerequisites must be
taught explicitly. The [authoring contract](content/CONTENT_SPEC.md) defines the
example, practice and version-labelling requirements. Existing bookmarks and completion
tracking are the baseline for later learning-path improvements.

Reader navigation includes rendered level-two and level-three headings with stable,
unique IDs, including headings containing inline code. The mobile contents panel
starts closed. Topic links can select a supported simulator with `?view=simulation`;
Study is the default, browser history restores the view, and unrelated query parameters
are preserved. Topic pages set a descriptive browser title.

Diagram font inputs ignore CRLF/LF differences. `node --test scripts/diagram-charset.test.mjs`
protects this portability rule; the font helper itself is included in asset fingerprints.

The reference [OOP lesson](content/java-spring/01d-java-oop-pillars.md) starts with
objects, a complete Java 17 account program, an output trace and predict/change/debug
exercises before introducing interfaces and dispatch. Run `node scripts/verify-java-examples.mjs`
to compile and execute programs marked `java runnable=ClassName` and compare their
`text output=ClassName` blocks. The backend CI job runs this gate with JDK 17 and its
negative-case tests; unmarked excerpts are outside this initial gate.

## September 29 learning experience checkpoint

The current implementation is tracked in `UI_UX_REVAMP_PLAN.md`; it is not a completed
release claim. Preserve the canonical metadata in `TopicService`, shared `CatalogProvider`,
category routes and explicit Study/Simulation/Practice URL state. The catalog JSON under
`frontend/src/test` is a test fixture only, never a production fallback.

Reading/practice preferences live in `utils/learningState.js`, with versioned merge previews
and a storage-denied fallback. Keep question identity stable across shuffle and pagination.
Timer-driven simulators must observe `useSimulationVisibility` so hidden views pause while
retaining their state. Existing theme and topic-completion stores remain separate.

Twenty-two Java/Spring lessons received introductory teaching improvements; OOP retains
its reference lesson. This does not complete all planned foundational curriculum packages.
Run the marked Java example verifier plus `mvn -f examples/java-spring/task-tracker/pom.xml test`
when changing the runnable teaching examples. Task Tracker defaults to the memory milestone; its optional `persistence` profile uses JPA/H2, explicit schema initialization/validation and disabled OSIV. Its optional production teaching profile now adds Flyway migrations and owner-scoped security; see the example README and October 2 checkpoint.

## October 1 learning audit remediation

`AI_ML_DEVOPS_LEARNING_PATH.md` is the learner-facing study order and capstone guide. The October 1 AI/ML and DevOps content pass gives all twelve lessons a zero-prerequisite reading entry, a stated outcome, and a backend example. `TopicService` orders AI/ML as fundamentals → LLM usage → embeddings → RAG → serving → feature stores → recommendations and DevOps as Docker → CI/CD → Nginx → Kubernetes → cloud operations. Keep `frontend/src/test/catalog.json` in sync with catalog metadata and preserve the content validator. Kubernetes networking text follows current upstream Service proxy documentation.

`PROJECT_LEARNING_UX_AUDIT_2026-10-01.md` records the dated evidence and remaining learning-quality work. Current reader controls keep stable Markdown renderer identities; reading position is restored before visibility-based saves and tracked only in Study. Practice resumes by stable question identity; category practice can fetch later pages, and progress review links target the exact question. Home/progress suggestions prefer the most recently read category and surface an unmet prerequisite first. Retained simulator `productionScenario` examples are illustrative, not measured incidents. `AppLayout` focuses the named main landmark on real pathname changes and labels unknown, malformed and failed-load topic paths, plus category-specific interview pages as errors, while initial loads, query/hash-only changes, and guided-tour navigation keep their own focus behavior. Keep the browser journey and axe checks in `scripts/test-responsive-layout.mjs` when changing these flows; the harness must wait for the selected theme and lazy simulator before scanning and assert focus on pathname versus Study/Practice view changes.

The Progress saved-answer manager lists review and all saved answers, including imported conflict copies. `adoptPracticeAlternative()` in `learningState.js` swaps the current and alternate entries so neither draft nor its self-assessment disappears; deletion requires a second explicit click in the UI. Keep the empty section mounted after the final deletion so the status message remains a keyboard focus target; do not render an empty live status before an action. Preserve that merge/export behavior when changing practice storage.

The A08 interview-feedback pilot adds four authored answer rubrics each to OOP, Spring MVC,
process management, TCP, and transactions/ACID (20 total). Keep each rubric immediately after
its model answer in the topic Markdown, using the six exact labels in `CONTENT_SPEC.md` §7.
`splitInterviewAnswer()` in `frontend/src/utils/interviewQuestions.js` separates the optional
block for the shared `InterviewDeck`; both topic and category practice still use the same source.
Unrubriced answers retain the generic comparison prompts. Extend rubrics only after reviewing
the model answer and its factual sources; DBMS Q1, Q3, Q9, Q13, and Q14 were corrected during this
pilot against PostgreSQL and MySQL documentation. The responsive browser harness opens an
authored rubric, checks that it stays separate from the model answer, renders inline Markdown,
and includes its follow-up; keep this journey when changing the shared practice deck.

`CORE_CS_CONTENT_AUDIT_2026-10-01.md` inventories all 56 OS, networking, DBMS and
Java/Spring lessons. It records verified structural strengths and concrete teaching gaps,
with topic-by-topic next actions. It is a triage audit, not a corpus-wide expert accuracy
sign-off. Its high-priority tracks are explicit beginner outcomes in the 33 non-Java core
lessons, reproducible network/OS diagnosis, a seeded SQL lab, and extensions to the
existing runnable Task Tracker. `JAVA_LEARNING_PLAN.md` now recognizes that first
in-memory application and initial persistence/transaction milestone as shipped with the follow-up milestones documented in the October 2 delivery checkpoint.

## Technical accuracy review

`CONTENT_ACCURACY_REVIEW_2026-10-01.md` is the source/version/correction ledger for A06/C05. The first package scopes recovery and isolation review to the transactions and concurrency lessons; it does not certify the entire corpus. Keep PostgreSQL tuple visibility and subtransactions separate from ARIES undo and InnoDB undo records. Commit durability needs explicit flush/storage/replication assumptions, and hypothetical throughput calculations must be labelled. The concurrency lesson includes a disposable two-session PostgreSQL lab and a queue claim that persists status before releasing locks. Any future change to those SQL examples should rerun them on the declared engine and verify waiting, rollback/commit, empty claims, and cleanup. The previous live checks used PostgreSQL 16.15; primary-source review used PostgreSQL 18 and MySQL 8.4.

## October 2 JPA accuracy and runnable evidence

The JPA lesson review covers lifecycle state, managed/detached merge, flush/commit, fetch contracts,
query-shape caveats, proxy interception, rollback defaults and version failures. The example uses
Boot 4.1.1-managed Hibernate 7.4.5.Final/Spring 7.0.9/H2 2.4.240 on Java 17. Keep the default
memory path database-free; activate `persistence` explicitly for the H2 file-backed adapter.
Entities stay inside repository boundaries and are mapped to Task records; the current single-operation
boundaries do not make multi-operation service workflows atomic. Flyway V1/V2 now replace the original `schema.sql` setup. Run the entire example suite after any example change, including temporary-file
reopen evidence, plus the platform backend and corpus/parser gates for associated lesson changes.
The source ledger records this as the third scoped lesson review, not corpus-wide certification.


## October 2 curriculum-completion branch

The example now has nineteen tests and a packaged real HTTP smoke. Run `mvn verify` and
`python3 examples/java-spring/task-tracker/verify_http.py`; the latter needs the packaged jar and
uses only its own random-port server/temporary directory. Preserve ERROR dispatch permission in
the secure chain and the non-web condition: MockMvc alone missed a real 403-to-401 error dispatch
regression. The runtime uses Java 17, Boot 4.1.1, Security 7.1.1 and Jupiter 6.0.3. Migrations have
separate fresh/legacy adoption tests; never enable automatic baseline globally. Pagination tests
assert bounded query shape and cascade behavior; cache tests assert rollback and after-commit effects.
A local Docker daemon is needed to verify the teaching container; CI includes readiness/nonroot/shutdown.

Review sessions use the existing client-only learning store. Backup envelopes are v3 (v1/v2 import
compatible), while the local key and schema version remain v1. Keep histories bounded to ten actual
recorded attempts per question, preserve imported draft alternatives, and remove history on answer
deletion. The review queue is frozen during a session, loads canonical content by selected topic and
uses stable normalized question keys. Retry must retain that selection; rebuild is an explicit action.
The review scheduler is a transparent suggestion, not automatic grading. Keep the real browser
attempt/history/Progress-to-review journey and both-theme axe coverage when changing the deck.

`examples/labs/README.md` owns SQL/OS/network setup, expected observations and limitations. Run its
PostgreSQL script with ON_ERROR_STOP and Python unittest suite. Use only owned child processes,
temporary files and loopback sockets; observations are not production benchmarks.

The source ledger now records nineteen of 56 core lessons reviewed, not a whole-curriculum sign-off.
Twenty-two added rubrics bring the total to 42. Do not count structural validation as factual review,
or prepared study protocols/AI personas as real learner sessions. The remaining 37 lesson reviews
and participant observations stay visible in `CURRICULUM_COMPLETION_2026-10-02.md`.

## October 3 charcoal dark theme

Keep the neutral dark hierarchy (`#1a1a1a` page, `#262626` surface, `#333333` raised, `#202020`
code) and readable muted/syntax text. Category/status accents carry meaning; keep dark chrome
quiet. Selection and scrollbar colors use theme tokens. Focus styling includes editable controls
and summaries. Maintain contrast pairs in `AppThemeStyles.test.js` and the browser toggle/reload
journey. Regenerate/decode diagrams after CSS/token changes; palette tests do not replace axe
or visual review. This LeetCode-inspired direction follows the user's stated preference.

## October 3 core accuracy completion

`CORE_ACCURACY_COMPLETION_2026-10-03.md` supersedes the earlier 19/56 and 37-pending core counts:
all 56 core lessons now have scoped source-backed reviews. Keep the dated historical ledgers.
Do not treat this as certification of every deployment or as real learner comprehension evidence.
AI/ML/DevOps freshness is a separate twelve-lesson queue. Main Verify run 37104855707 supplies
successful frontend/backend/lab/container execution evidence.

Preserve canonical question prompts and diagram source unless a factual correction requires
changing them. When correcting a sentence used by migration evidence, update only the target
quote, preserve archived payload/digest, and run all 109 entries. The current corpus is 33,232
lines, 295 diagrams, 953 questions and 56 rubrics across 68 lessons. Run marked Java examples,
corpus/parser tests, content/diagram/migration gates and associated backend/example tests.

The additional runtime fixtures are `examples/labs/sql/accuracy.sql` (transactional temporary
objects, PostgreSQL 16+) and `examples/labs/java/AccuracyContracts.java` (Java 17). Both run in CI;
run the documented lab commands after changing them. Keep model-versus-version distinctions:
Batch 6 default resourceless repositories are not durable restart stores; concurrent processor
threads do not inherit chunk transactions. PostgreSQL actual rows are per-loop averages,
`work_mem` is per operation, buffer reads are not necessarily device I/O, and full-stripe writes
are not an array-wide atomicity guarantee. No auto-grading or participant observations were added.

## October 3 interview feedback extension

`INTERVIEW_FEEDBACK_2026-10-03.md` records twelve additional rubrics in Streams/Optional,
Spring Batch, synchronization, physical media, routing, and functional dependencies/keys.
The current 56 rubrics are author-reviewed comparison aids, not automated grading.
Preserve their canonical question IDs and standalone model answers. Run the corpus/parser
and InterviewDeck suites plus backend DiscoveryService coverage after changing them.
The full-corpus test checks every authored block can be separated into six nonempty labels;
the backend test checks the added question IDs survive pagination without following-question
or Further Reading leakage. AI/ML/DevOps freshness and real learner observations remain open.

## October 3 AI/ML and DevOps freshness completion

`AI_ML_DEVOPS_FRESHNESS_REVIEW_2026-10-03.md` supersedes earlier twelve-lesson freshness-pending statements. All 68 lessons have scoped technical reviews; real learner comprehension and live external AI/DevOps capstone execution are not certified. Current corpus: 33,450 lines, 295 diagrams, 953 questions and 56 authored rubrics. Preserve canonical question identity while correcting false premises in answers. Six diagram sources were corrected and both themes regenerated; run the render/check/decode pipeline when visual teaching claims change.

`examples/labs/aiml/observe.py` uses synthetic fixtures and standard-library metric arithmetic, without model calls; its six new checks run with the existing two lab tests. `examples/labs/sql/feature-availability.sql` uses temporary PostgreSQL tables and rollback, and is executed by CI. Test the declared online-availability policy, not an assumption that event timestamps prove historical serving visibility. Keep score/ranking, relevance/ANN overlap, hit-rate/recall and planning-budget/measured-percentile distinctions explicit.

Version-sensitive examples distinguish Docker 29+ fresh image-store defaults from legacy upgrades, Kubernetes 1.37 policies, bounded pgvector iterative scans, MCP 2026-07-28 transport/business authorization, and current action runner prerequisites. Do not turn documentation excerpts, invented-rate cost calculations, source-traced proxy behavior or generated diagrams into claims of live deployment/performance evidence. Remaining roadmap work is broader exercises and question-specific feedback plus real learner sessions.

The freshness release also fixes an existing reader-test timing race: await the accessible TOC link after heading extraction rather than treating mounted lesson text as finished navigation. `RCA-2026-10-03-04` records the failed/passing same-head CI evidence and verification.

## October 4 category topic navigation

Study and topic Practice show all lessons and expandable section links for the current
category through `CategoryTopicNavigation`. Keep `TopicPage`'s canonical catalog order and
expansion state; never populate this rail from a second registry or fetch every lesson body.
`DiscoveryService` exposes `/api/v1/topics/outlines?category=<id>` with heading-only Markdown.
`useCategoryOutline` caches successful outlines per session, aborts superseded loads and
supports retry. `markdownOutline` shares the reader heading-ID pipeline; preserve deeper
headings in snippets so duplicate IDs match actual rendering. The current lesson can use
rendered sections even when other outlines fail. Pass router hash/search to the reader so
section restoration follows navigation; section links select Study and discard stale
`view`, `question` and `section` selectors. Keep the 68-lesson anchor comparison, all-category
integration tests and keyboard/category browser journeys when changing the rail.

`TopicExpansionProvider` lives in `App` outside the pathname-keyed route error boundary.
Keep expansion state there: the boundary intentionally remounts pages after navigation.
Integration tests must include that remount, as well as ordinary same-page section changes.

The [Java course alignment review](JAVA_COURSE_ALIGNMENT_REVIEW_2026-10-04.md) records
inspection of the learner's 40-entry course index, a visual/text review of its three-page
JDK/JRE/JVM PDF and a proposed familiar revision path. Other linked notes remain unreviewed;
the course alignment is proposed, not imported curriculum.

## October 5 UI/UX refinement

`UI_UX_REFINEMENT_PLAN_2026-10-05.md` is the active presentation contract; delivered behaviour and
evidence are in `docs/UI_UX_REFINEMENT_RESULTS_2026-10-05.md`, and the component rules are in
`docs/DESIGN_SYSTEM.md` ("October 5 refinement"). Keep these invariants when changing the UI:

- **One component language in `App.css`.** Use `.ui-button` (`--primary` once per task area,
  `--secondary`, `--quiet`, `--danger`, `--compact`), the `--action-*` and `--control-*` tokens and
  `components/shared/Icon.jsx` for application icons. Category colour identifies a category; it never
  decides what a button means. Raw colours stay inside the theme blocks and the spacing scale has one
  monotonic definition per step — `AppThemeStyles.test.js` enforces both plus the action contrast pairs.
  Before adding rules, check for older selectors with the same class: three generations of reader,
  navigation and roadmap rules were consolidated, and a leftover selector with higher specificity
  silently overrode the new buttons until it was removed.
- **Navigation.** `Navbar.jsx` derives the Learn menu from `CATEGORY_ORDER`/`CATEGORY_METADATA`;
  Learn and Help are nonmodal disclosures from `hooks/useDisclosure.js` (Escape closes the innermost
  and returns focus). Below 900px the bar is brand, Search and Menu. The tour opens from Help only.
- **Reader.** The lesson header is in document flow (no sticky toolbar). Prose follows the 16/18/20px
  reader preference — never pin paragraph sizes to rem tokens again — with a 68ch measure at that size.
  Text size, focus reading and study help live under one Reading options disclosure.
- **Rail.** `CategoryTopicNavigation` keeps every lesson in canonical order with separate link and
  chevron controls, category-local search (`useRailSearch`) and Collapse all. Search expansion is a
  temporary overlay, the query survives lesson remounts and clears on category change, and TopicPage
  only auto-expands a lesson whose expansion is still undefined, so an explicit collapse is kept.
- **Browsing and practice.** Home leads with Resume or Start here, then learning-path cards and a
  "Browse all lessons" disclosure that opens itself for filter URLs. `LessonRow` is the shared lesson
  row. The practice deck reads question → draft → Reveal (primary) → answer → self-assessment →
  Record attempt → Previous/Next. Progress leads with Continue.
- **Learning network.** PR #49's `LearningNetworkNav` sits above the navigation; it is styled in the
  component system (compact on desktop, 44px targets below 900px, one scrollable row below 480px) and is
  included in the reader-density measurements.
- **Verification.** `scripts/test-responsive-layout.mjs` now also asserts reader density (Java lesson
  article ≤330px at 1440×960 and ≤450px at 375×960), a rail search/clear/collapse/Back journey, and
  for every registered simulator 320px containment plus axe in both themes.
  `scripts/capture-ui-previews.mjs` reproduces previews and measurements; both share
  `scripts/lib/ui-fixtures.mjs` (fixture evidence). `scripts/test-real-backend-journey.mjs` runs the
  built frontend against a real backend (`CS_API_ORIGIN`) and is the CI `real-backend-journey` job.
  Regenerate and decode diagrams after any `App.css` change because CSS is part of the fingerprint.


## Practical backend/AI implementation — October 16

Follow `BACKEND_AI_PRACTICAL_LEARNING_PLAN_2026-10-16.md` and update `docs/BACKEND_AI_IMPLEMENTATION_RESULTS_2026-10-16.md` from actual evidence. The first executable milestone is `examples/ai-backend`, separate from the platform backend. Preserve its HTTP body/deadline/call caps, strict output validation and authentication/CSRF boundary. Fake-provider tests are not live semantic-quality evidence. Package first, then run `verify_http.py`; it copies the JAR to temporary storage and cleans up only its own children. The small classifier in `examples/labs/aiml/train.py` fits preprocessing only on training rows; keep validation/test separation and deterministic data provenance. Run its five tests with `test_training.py`. Preserve analytics redaction and the learning-network contracts.

Current interview feedback total after the ML lab extension: 59 authored rubrics; preserve ml-fundamentals-q11/q12/q14 and update frontend/backend corpus assertions when adding more. Live inference and browser tests must run serially on this memory-constrained WSL environment. EvaluateTickets checkpoints each case atomically and requires model digest/runtime for live-local evidence; schema acceptance does not imply correct fields.

KnowledgeStore/KnowledgeService own the example’s lexical baseline, tenant filtering and citation freshness. RefundWorkflow performs only a local fake mutation; preserve exact-action/expiry checks, transaction lock ordering, file-restart and concurrent duplicate tests. ReadOnlyAgent’s tools stay read-only, bounded and cancelable. MCP stdio stdout is protocol-only (logs use stderr); record actual negotiated versions. Require runtime passwords/approval secret and generate test values; never restore sample password defaults.

Preserve explicit agent overload/upstream-error HTTP behavior (503/502) and its service/MVC regressions; avoid generic 500 responses for expected invalid model output.

## Backend coverage and content reuse — October 17

Follow `BACKEND_ENGINEERING_COVERAGE_2026-10-17.md` for all 77 requested backend items (BEC-01–BEC-77), alongside the AI/debug/BE/CLOSE IDs in the practical plan. Reuse specific existing DSA/LLD/HLD lesson and exercise links instead of duplicating their content. Add only missing concepts and distinct backend integration/debugging work; record the source route, evidence scope and remaining gaps. Never count HLD draft topics as delivered lessons or an in-process LLD example as actual broker/Redis/distributed durability evidence. No additional registry or shared progress is introduced. Link completion evidence and merged releases in the implementation ledger; do not equate a mapped item or passing content-anchor gate with a complete practical learning outcome.

The October 17 link-maintenance proposal is superseded by the implemented October 18 audit described below. Keep stable IDs, verified destination identity and the public-only privacy boundary; HTTP 200 alone is insufficient.

## October 18 implementation checkpoint

Use **Backend Engineering** for visible branding; preserve all technical IDs, routes, local-storage
keys/events, backup envelopes and deployment URLs. Keep the learning-network subject taxonomy and
independent-progress behavior. The current authored-rubric total is **77** across 953 questions,
including at least three in each AI lesson; earlier dated 56/59 totals are historical. Preserve
all six new AI lesson rubric sets and the corpus assertions.

Relative Markdown links need source-category context in Study and Practice. Keep
`resolveCurriculumLink` tied to the existing topic/category map, preserve fragments/native URLs and
React Markdown's unsafe-protocol filtering, and keep renderer identities stable. Do not replace
reader links with broken deployment `/examples` paths. Run the real link-rendering tests and
control-persistence tests after changing this behavior.

The link audit is implemented: `scripts/audit-learning-links.mjs` reads the existing reference
inventory, checks public catalogs/rendered lesson identity and distinguishes temporary availability
from confirmed removal/incompatibility. Its PR tests are deterministic; scheduled/dispatch/relevant
main-push audits run live. Current HLD cache-aside deployment is incompatible (backend model 1.0.0,
frontend requires 1.0.1); preserve the finding until the owner redeploys and the live audit passes.

Run `test_recommendations.py`, `test_backend_debug.py` and `test_backend_database.py` for the new
labs; keep synthetic recommendation geometry separate from real learned model quality. Evaluation
reports include per-field/slice diagnostics and undefined rates as null; failed requests remain in
the all-case denominator. Do not infer missing old per-field results from all-fields-match flags.
Vector retrieval, messaging and reliability are integrated as isolated learning modules; require their stated real-service evidence and preserve their documented limits.

The optional [pgvector RAG milestone](examples/ai-backend/VECTOR_RETRIEVAL.md) is now integrated
in this branch, with immutable embedding namespaces, tenant-scoped rebuilds, source freshness and
exact/ANN modes. Local Java checks run without the missing PostgreSQL extension; real vector/index
evidence must come from the dedicated CI job, which refuses skipped integration tests. Default
lexical behavior is preserved. [Messaging](examples/backend-messaging/README.md) similarly separates
actual durable-file checks from required actual Kafka/RabbitMQ CI evidence. The
[reliability lab](examples/backend-reliability/README.md) composes bounded GET retries, deadlines,
admission, cancellation and breaker behavior; it does not retry consequential mutations. These
milestones do not imply full multi-node failure, saga, model quality or human learning completion.

The Task Tracker [observability milestone](examples/java-spring/task-tracker/OBSERVABILITY.md)
adds an explicit opt-in path across actual HTTP, async work, a loopback dependency and transactional
JPA. The original in-memory default stays database-free. Its 29 tests and both packaged HTTP modes
passed in the isolated package. Traces use the actual pinned SDK with local/in-memory exporters;
no remote collector or deployed alert/notification service is claimed. Keep secrets and customer
payloads out of spans/logs and retain fixed metric labels and existing owner/CSRF boundaries.

Data-services examples live in `examples/backend-data-services/`; local default service skips are explicit. Its dedicated CI must execute Redis/MongoDB/combined cases without skips. Cache source-version checks and tenant isolation are correctness contracts, not optional optimizations.

Preserve document byte/page/pixel/text/process bounds and provenance. Missing real OCR must fail when explicitly enabled; its dedicated CI refuses skipped OCR cases. Preserve Task Tracker JWT issuer/audience/time/algorithm/scope/owner validation, operator-selected bounded JWKS source and legacy Basic/session CSRF behavior. Its OWASP matrices distinguish tested controls from procedures and open work; do not label them a security certification.

RAG evaluation has original30/20 query files and independent retrieval/citation/fact-label/outcome metrics. Preserve dataset hashes, failure-inclusive denominators, null undefined rates and `modelCalls`/`not-called` evidence. A fault scenario name does not prove the downstream generator executed. Fixture substring checks are not entailment, live model quality, ANN quality or human review. Build before `verify_rag.py`; keep existing authenticated HTTP/MCP checks too.

Preserve durable-saga request/receipt binding, exact compensation, restart reconciliation and manual-review limits in `examples/backend-messaging/`. `examples/backend-persistence/` must use generated owned PostgreSQL roles/databases and verify cleanup; actual dump/restore and query/pool measurements are not HA/capacity promises. `examples/engineering-workflow/` must operate only on its disposable repository/processes and isolate inherited Git environment; run its four tests in the backend CI job. Its offline Maven probe requires standard Maven3.x.

Preserve full PR/main Verify scope and its workflow/ref concurrency. Do not reinstate duplicate feature-push plus PR execution or bypass final-head checks. New content links connect the owning RAG, distributed-data, JPA and SOLID lessons to their focused runnable guides; preserve all953 question IDs,77 rubrics and diagram sources when editing those links.

The Java runtime lab must keep platformJava17 separate from optional stableJava21 APIs. Preserve actual `isVirtual` checks, healthy downstream-limit assertions, failure cleanup and real named hot-loop JFR/thread evidence. Do not interpret client cancellation as remote cancellation or turn synthetic timings into throughput guarantees; native snapshot and currentCI evidence are separate.

Keep the rule baseline separate from model evidence and preserve review cases in all-case rates. Raw hashes bind actual input bytes; the additional LF-normalized hash supports cross-platform JSONL comparisons without erasing the raw provenance. The public held-out set is regression data after inspection, not a fresh blind model-selection experiment. `verify_rules.py` must work with unusable provider settings; no model call is permitted in that mode.

ProjectC reports must keep expected refusals, bounded stops, completed tasks and observed policy violations separate. Keep full-row invariant observation independent of expected labels and emit only sanitized assertion names; raw tool/prompt/token/private fixture strings cannot enter reports. `verify_workflow.py` verifies the actual teaching-JAR dispatch after packaging. Identity tests require actual framework AS→S256code/token→unchangedTaskTracker HTTP evidence; preserve client state/exactredirect/scopes/owner/BasicCSRF checks and generated credentials. Operations may act only on its newkind cluster/privatekubeconfig/ownednamespace; actual CI namespace/EndpointSlice/Pod/rollback/cleanup evidence is mandatory. Guard tests are not Kubernetes evidence.

The [streaming learning module](examples/ai-backend/STREAMING.md) demonstrates bounded native
Ollama NDJSON over actual HTTP, strict UTF-8 framing, cancellation/deadlines, explicit incomplete
results and nullable provider usage/timing. `verify_streaming.py` exercises the normal teaching-JAR
dispatch with an owned fixture; it runs in Verify after packaging. Scenario cost arithmetic requires
explicit dated assumptions and includes failed attempts; missing usage is not zero. Transport
completion and business acceptance remain distinct. This adds no platform routes or analytics.

Preserve streaming limits, first-nonempty-content measurement and nullable final metadata. Never
call fixture frames model quality, natural-language refusals standardized native markers, or local
client cancellation remote cancellation. Known cloud model tags are rejected; loopback/aliases
alone cannot prove local inference. A live observation needs inspected model/runtime provenance.

The [signed-webhook lab](examples/backend-webhooks/README.md) demonstrates exact-byte signatures,
durable tenant/event deduplication, compatible payloads, key rotation and actual timeout/crash/replay
recovery. The [testing lab](examples/backend-testing/README.md) reuses unchanged Task Tracker source
for real PostgreSQL/Testcontainers, HTTP contracts, concurrent requests, bounded error-inclusive load
and a causally reproduced/fixed async test. Dedicated no-skip CI proves the external dependency
cases; local compilation or mocks cannot substitute. Neither lab changes the platform runtime.

The [Java source ledger](docs/JAVA_COURSE_SOURCE_LEDGER.md) records all 40 familiar-course entries
and separates HTTP shells from reviewed note content. [Manual access checks](docs/MANUAL_ACCESSIBILITY_PROTOCOL.md)
and [real learner tasks](LEARNER_USABILITY_STUDY.md) remain human evidence gates; prepared protocols
and automated tests do not close them.

Keep webhook signatures bound to exact bytes, tenant and timestamp; persist event/body binding with
its local effect and preserve receipts across signing-key rotation. An expired signature can be
rejected before an already-recorded event is considered; a sender may re-sign original bytes with
a fresh valid timestamp. Keep the actual commit-signal/timeout/crash/reopen test. Separate body,
SQL and fault-delay budgets; asynchronous callback timeouts are not hard preemption guarantees.
The testing module must import the existing Task Tracker source, refuse skipped actual cases,
retain failed attempts in latency/throughput calculations, and publish only sanitized evidence.
Keep actual container execution separate from native guard/stub tests and production capacity.

The [controlled prompt comparison](examples/ai-backend/COMPARISON_PROTOCOL.md) freezes the
experimental ticket prompt before an independently authored synthetic holdout. The original
application prompt remains the default; comparisons preserve schema/field/failure distinctions,
prompt/dataset/model hashes and a no-model reference. A narrow field gate is not production
acceptance or human answer-support review. The [OOP source review](docs/JAVA_OOP_SOURCE_REVIEW_2026-10-21.md)
records all eleven original PDF pages and Java 17 counterexamples without reproducing source notes.
The operations lab now requires three resource Pods in addition to its five recovery cases;
only actual cgroup/termination/CPU-counter observations and verified cleanup can close them.

For controlled ticket experiments, preserve the ticket-v1 default and frozen prompt hashes.
Never pass expected labels to the model, turn unknown metering into zero, equate schema validity
with task correctness, or call AI-authored synthetic labels human calibration. New prompt selection
after inspecting the public holdout requires a new separated evaluation. All actual kind resource
cases run only in owned nonprivileged disposable Pods; never run resource stress on the host or
weaken OOMKilled/exit137/cgroup-limit/throttling evidence into a generic process failure.


The [AI-assisted engineering exercise](examples/engineering-workflow/AI_ASSISTED_REVIEW.md)
compares reviewed fixture patches using actual Java 17 compilation, independent routing/locale
tests, Git diff checks and offline Maven resolution. It accepts no external patch/source input;
a temporary folder is not a sandbox. The Java primitive lesson now includes the S03 source-review
teaching corrections while preserving existing diagrams, questions and learner identities.
