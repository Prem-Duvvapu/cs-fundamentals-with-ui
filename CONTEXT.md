# System Architecture & Development Context

## Overview
**CS Fundamentals with UI** is a content-first, full-stack educational platform for Computer Science fundamentals. It consists of a **Spring Boot REST backend** serving structured three-tier Markdown content and a **React 18 / Vite frontend** that makes reading, navigation and interview practice the primary experience, with interactive simulations available when they add learning value.

The curriculum expansion is governed by [`plan.md`](plan.md), which maps the complete SDE-2
acceptance checklist to 63 registered lessons. [`content/COVERAGE_MANIFEST.json`](content/COVERAGE_MANIFEST.json)
makes those mappings machine-verifiable alongside strict route and content validation.
Confirmed regressions and their tested resolutions are tracked in [`RCA.md`](RCA.md); search it by
symptom or component before repeating an investigation.

---

## 🏗 Containerization & Deployment Architecture

```
                       ┌───────────────────────────────┐
                       │          Client Browser       │
                       └──────────────┬────────────────┘
                                      │
                         HTTP Requests│ Host port 3000 (configurable)
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
   - Serves API on host port `9190` by default (container port `8080`).
2. **`frontend/Dockerfile`**:
   - Multi-stage build (Node 18 Alpine builder $\rightarrow$ Nginx Alpine web server).
   - Implements `nginx.conf` reverse proxy routing `/api` requests to `http://backend:8080`.
3. **`docker-compose.yml`**:
   - Orchestrates `backend` and `frontend` services with health checks, a read-only curriculum
     mount, restart policies, and one configurable public port per service.
4. **`start.sh`**:
   - Location-independent local launcher. `./start.sh` starts its free-port search at `9190` for
     Spring Boot and `3000` for Vite, wires the selected backend port into Vite's proxy, validates
     prerequisites, and cleans up both child processes. It never invokes Docker.

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
5 sub-tabs — the P3 simulation triage (see `plan.md`'s P3 audit checkpoint) kept only the engines
whose interaction materially teaches a mechanism; `dbms-introduction`, `dbms-architecture`,
`er-model`, `storage-raid-indexing`, `transactions-acid`, `query-optimization` read Study only now
(their Mermaid diagrams cover the same ground). `distributed-databases-cap` keeps a Simulation tab
via the retained `ConsistentHashingVisualizer` (see Networking, below), not this hub.
- **Relational Algebra Simulator (`RelationalAlgebraVisualizer.jsx`)**: Animated Selection ($\sigma$), Projection ($\pi$), Equi-Join ($\bowtie$), Left Outer Join ($\$), and TRC query translation.
- **Keys & Closures (`FunctionalDependencyVisualizer.jsx`)**: Attribute Closure $(X)^+$ solver, Armstrong's Axioms inference, Candidate Key detection, and Minimal Canonical Cover ($F_c$).
- **Normalization Engine (`NormalizationVisualizer.jsx`)**: Step-by-step anomaly detection (Insertion, Deletion, Update) and lossless join decomposition simulator.
- **B+ Tree Indexing Engine (`BPlusTreeVisualizer.jsx`)**: Dynamic multi-way node insertion, node splitting, and leaf range scans.
- **Concurrency Control & 2PL (`ConcurrencyControlVisualizer.jsx`)**: Conflict serializability, Strict 2PL locks, Timestamp Ordering, Thomas Write Rule, and deadlock wait-for graphs.

### ☕ Java & Spring Ecosystem (`JavaSpringVisualizer.jsx`)
3 sub-tabs after the same P3 triage; the 8 core-Java topics (execution pipeline, memory model, OOP
pillars, static/final/records, functional/lambdas, generics, collections, streams/Optional) and
Spring Batch/Bean/JPA read Study only now. HashMap internals, Virtual Threads, and HikariCP were
also removed from this hub — they route directly to their own standalone component via
`topicVisualizerRegistry.jsx` (`java-hashmap-internals`, `java-multithreading-concurrency`,
`spring-testing-production`), so keeping them here too was a duplicate tab reachable by no topic
id, only manual click.
- **JVM Heap & GC (`JvmMemoryVisualizer.jsx`)**: Young/Old Gen allocations, G1GC/ZGC collectors, and Virtual Threads.
- **Spring MVC Flow**: DispatcherServlet request pipeline and security filter chain execution (inline step-through, never engine-backed).
- **Quartz Scheduler & Cluster**: misfire policy and `JobStoreTX` cluster locking (inline step-through, never engine-backed).

### ☕ Java & Spring — direct-mounted (bypass the hub, like OS topics)
- **HashMap & Bucket Internals (`java/HashMapVisualizer.jsx`)** at `java-hashmap-internals`: bucket chaining, treeification, and resize.
- **Virtual Threads / Loom (`java/VirtualThreadsVisualizer.jsx`)** at `java-multithreading-concurrency`: mount/unmount onto carrier threads.
- **HikariCP Connection Pool (`java/ConnectionPoolVisualizer.jsx`)** at `spring-testing-production`: pool exhaustion and wait-queue behaviour.

---

## 📝 Content Rendering Pipeline

```
content/<category>/NN[a-z]-<slug>.md
        │
        ▼
ContentService            resolves ./content or ../content at startup;
        │                 strips the "01b-" numeric prefix to match a topic id
        ▼
GET /api/v1/content/{category}/{topicId}     returns raw Markdown
        │
        ▼
TopicPage.jsx
        │  Study is the default view; Simulator is an optional view
        ▼
TopicViewer.jsx
        │
        ▼
components/markdown/MarkdownRenderer.jsx
        │  react-markdown 9
        │  + remark-gfm         full GitHub-Flavoured Markdown
        │  + remark-math        $inline$ and $$block$$
        │  + rehype-katex       math typesetting
        │  + rehype-highlight   fenced-code syntax highlighting
        │
        └──► ```mermaid fences ──► components/markdown/MermaidBlock.jsx
                                   lazy import('mermaid'), themed centrally
                                   from App.css tokens, falls back to raw
                                   source if a diagram fails to parse
```

**Authoring contract:** `content/CONTENT_SPEC.md` defines depth targets, required diagrams,
interview-Q&A format and permitted syntax. Raw HTML is not permitted in content.

**Guard suite:** `frontend/src/components/__tests__/TopicViewer.markdown.test.jsx` renders
all 63 files in `content/` and asserts no unparsed Markdown leaks into prose, that math files
produce real KaTeX output, and that blockquote files produce real `<blockquote>` elements.
The content gate currently passes all 63 lessons and all 83 coverage-manifest entries, covering
28,683 curriculum lines, 277 Mermaid diagrams, and 883 interview Q&As.

### Reading Experience

The topic page is built around long-form study. `TopicPage` owns the single document-level heading,
so the Markdown renderer omits each source file's duplicate H1 while preserving its tier headings.
On desktop the topic header condenses to a one-line sticky toolbar after scrolling; below 768px it
stays in document flow so it cannot consume the reading viewport. The table-of-contents rail is
sticky only on desktop and defaults collapsed below 1024px. Tier navigation, reading progress and
the Expert-tier interview deck remain available at every breakpoint. Tabs retain full ARIA
relationships and arrow-key navigation.
Simulation-only pages remain lazy loaded so study readers do not pay their bundle cost upfront.

The home route complements the reader with a category-first roadmap. It presents category
summaries and counts, then ordered topic rows with level badges and direct Study links; filters
remain semantic buttons so keyboard users receive the same orientation as pointer users.

`/search` and `/interview/:category` (P5) reuse the same roadmap visual language —
`SearchPage.jsx` debounces a query against `GET /api/v1/search` and lists results as topic rows;
`InterviewPage.jsx` paginates `GET /api/v1/interview/questions` (offset/limit "Load more", server-side
category + difficulty filters, client-side shuffle) through a shared `components/shared/InterviewDeck.jsx`
— the same accessible step-through deck `TopicViewer.jsx` uses for its per-topic practice section,
extracted so both call sites stay in sync. `category = 'all'` omits the server-side category filter
rather than paging through a second client-side registry. Both routes are linked from the navbar.

The token system in `frontend/src/App.css` provides dark and light palettes, five category accents,
semantic state colours, reading typography, spacing and motion. The saved theme follows the system
preference initially; Mermaid diagrams and syntax highlighting react to theme changes without a reload.
All additions must retain keyboard focus indicators, pair colour with labels or glyphs, respect
`prefers-reduced-motion`, and use responsive breakpoints rather than relying on a desktop layout.
See [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md). Design references: [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/),
[MDN media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using),
and [Mermaid theme configuration](https://mermaid.js.org/config/theming.html).

---

## 🔌 REST API Endpoints

- `GET /api/v1/topics` — Lists all 63 curriculum topics with level and summary metadata.
- `GET /api/v1/topics/category/{category}` — Lists topics for a specific category (`os`, `networking`, `dbms`, `java-spring`, `aiml`).
- `GET /api/v1/content/{category}/{topicId}` — Fetches raw 3-level Markdown educational content for a topic.
- `GET /api/v1/search?q=&category=&limit=` — Cross-topic search over title, headings, coverage-manifest
  tags, summary and body, ranked and returning a matched heading + excerpt per hit
  (`DiscoveryController`/`DiscoveryService`, P5). Frontend: `SearchPage.jsx` at `/search`.
- `GET /api/v1/interview/questions?category=&difficulty=&offset=&limit=` — Paginated interview Q&A
  parsed directly from each lesson's `### Interview Questions` section, answers returned as
  Markdown. Frontend: `InterviewPage.jsx` at `/interview/:category` (`:category` may be `all`).

---

## 🧪 Testing & Verification Commands

```bash
# Run All Backend Tests
mvn test -f backend/pom.xml

# Run All Frontend Tests
npm test --prefix frontend

# Build Frontend Production Bundle
npm run build --prefix frontend

# Check curriculum structure and quality gates
node scripts/validate-content.mjs

# Test validator and coverage-manifest behavior
node --test scripts/validate-content.test.mjs
```
