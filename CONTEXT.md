# System Architecture & Development Context

## Overview
**CS Fundamentals with UI** is a content-first, full-stack educational platform for Computer Science fundamentals. It consists of a **Spring Boot REST backend** serving structured three-tier Markdown content and a **React 19 / Vite frontend** that makes reading, navigation and interview practice the primary experience, with interactive simulations available when they add learning value.

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
   - Multi-stage build (Node 26 Alpine builder $\rightarrow$ Nginx Alpine web server).
   - Uses the repository root as its build context so the prebuild diagram gate can read
     `content/` and `scripts/render-diagrams.mjs`; `.dockerignore` excludes host build output.
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
- **Memory Management & Paging (`MemoryVisualizer.jsx`)**: Page replacement algorithms (LRU, FIFO, Optimal) and an MMU Address Translation calculator (`os/VirtualMemoryVisualizer.jsx`).
- **Process Synchronization (`SynchronizationVisualizer.jsx`)**: Mutex locking and Bounded Buffer Producer-Consumer model.
- **Deadlock Detector (`DeadlockVisualizer.jsx`)**: Banker's Algorithm safety sequence calculation.
- **File Systems (`os/FileSystemVisualizer.jsx`)**: inode direct/single/double/triple-indirect pointer allocation walkthrough and the Linux VFS abstraction layers.
- **Disk Scheduling (`os/DiskSchedulingVisualizer.jsx`)**: head-movement comparison across FCFS, SSTF, SCAN (elevator), and C-SCAN.

### 🌐 Computer Networks (`NetworkingVisualizer.jsx`)
- **Network Topologies**: Interactive Star, Bus, Ring, Mesh, Tree, and Hybrid layouts.
- **Physical Line Encoding**: Real-time oscilloscope waveforms for NRZ-L, NRZ-I, Manchester, and Differential Manchester.
- **TCP 3-Way Handshake**: SYN / SYN-ACK / ACK state walkthrough (inline step-through, never engine-backed); shared by `tcp-ip` and `tcp-congestion`.
- **TCP Congestion Control (`networking/TcpCongestionVisualizer.jsx`)**: slow start, congestion avoidance, and AIMD window growth/backoff, rendered beneath the handshake on the same tab.
- **TCP & UDP Segment Header Inspector (`TcpSegmentVisualizer.jsx`)**: Bitfield grid with live byte offset tooltips.
- **QoS Traffic Shaping Simulator (`TrafficShapingVisualizer.jsx`)**: Token Bucket vs. Leaky Bucket burst simulation.
- **DHCP DORA 4-Step Flow (`DhcpDoraVisualizer.jsx`)**: Step-through state machine for Discover, Offer, Request, and ACK.
- **ARP Resolution Protocol (`ArpResolutionVisualizer.jsx`)**: Layer 2 broadcast requests and dynamic ARP cache table updates.
- **NAT / PAT Translation Table (`NatTranslationVisualizer.jsx`)**: Internal-to-external socket rewriting simulation.
- **Distance Vector Bellman-Ford (`DistanceVectorVisualizer.jsx`)**: Multi-router vector exchange convergence.
- **Consistent Hashing (`networking/ConsistentHashingVisualizer.jsx`)**: hash-ring node placement and key redistribution on node add/remove; also the Simulation tab for DBMS's `distributed-databases-cap` (see the DBMS section below).

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

### 🤖 AI/ML Systems (`AiMlVisualizer.jsx`)

`TopicService` orders the AI/ML path as ML fundamentals → practical LLM usage → embeddings → RAG → serving → feature stores → recommendations; RAG depends on both embeddings and LLM usage. DevOps is Docker → CI/CD → Nginx → Kubernetes → cloud operations. The `frontend/src/test/catalog.json` fixture mirrors this catalog metadata. The Progress saved-answer manager keeps its empty section mounted after deletion so its action status remains focusable; it renders no empty status while loading. The responsive browser harness waits for the applied theme and lazy simulation before axe checks, catching theme-specific contrast regressions. `AppLayout` names and focuses the main landmark on pathname changes after initial load, and unknown topic, malformed topic and failed-load paths, plus category-specific interview pages receive explicit error names, but leaves focus untouched for query/hash-only navigation and guided-tour route changes. All twelve lessons now have a novice starting point and a concrete backend exercise.
6 sub-tabs, all inline step-through UI state (no dedicated `simulationEngines/` file, same pattern
as the Java hub's Spring MVC/Quartz tabs — the mechanism is a fixed worked example, not a
configurable algorithm).
- **Embeddings & Vector Search**: a 2D vector coordinate and cosine-distance calculator plus a similarity-search results ranking.
- **RAG Pipeline**: step-through of the retrieval-augmented-generation request path end to end.
- **vLLM PagedAttention**: traditional contiguous GPU allocation vs. PagedAttention's block-based virtual paging, contrasted side by side.
- **LLM Sampling**: logit scaling (temperature) and nucleus (top-p) sampling against a rescaled token-probability distribution.
- **Feature Stores**: Population Stability Index (PSI) drift detection and online vs. offline feature lookup latency.
- **Recommendation Systems**: the 2-stage pipeline — two-tower ANN candidate retrieval narrowing a 10M-item catalog, then deep & cross-network ranking.

---

## 📝 Content Rendering Pipeline

```
content/<category>/NN[a-z]-<slug>.md
        │
        ▼
ContentService            resolves the configured/local content root at startup;
        │                 builds an exact registered topic-to-file index
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
                                   hashes source and selects a generated
                                   dark/light SVG; falls back to raw source
                                   when an asset is missing or cannot load
```

Mermaid is a build-time authoring dependency, not a reader dependency. `scripts/render-diagrams.mjs`
renders every unique fence in both themes through Playwright, measures and corrects Mermaid's
under-sized HTML label boxes, and writes `frontend/public/diagrams/<hash>-{dark,light}.svg`.
`frontend/src/utils/diagramHash.js` supplies the shared stable hash and
`frontend/src/generated/diagramManifest.json` records source, intrinsic dimensions, and a
fingerprint of the renderer script, theme CSS, embedded font, the corpus character set, and the
three installed packages that change what comes out of a render — `mermaid` (draws), `playwright`
(supplies the Chromium that lays out the text) and `subset-font` (trims the embedded face). The
fingerprint deliberately does *not* hash the whole `package-lock.json`: that made every unrelated
devDependency bump invalidate all 295 fingerprints.
`MermaidBlock.jsx` selects the active-theme asset, lazy-loads it as an image, and switches assets
on theme changes. This removes the former runtime render queue, font-measurement race, loading
state, and Mermaid payload. An SVG loaded through `<img>` is an isolated document that cannot
fetch external resources, so the webfont has to travel inside each asset; the generator embeds a
**subset** of it — the characters the curriculum actually draws, instanced to the 400-700 weight
range mermaid uses — which took `public/diagrams/` from 49 MB to 31 MB with no visual change. The
generator serializes XML safely,
browser-decodes every asset before atomically publishing the complete set, and leaves the prior
set intact if rendering fails. `npm run diagrams:check --prefix frontend` validates fingerprints
and XML; `npm run diagrams:decode --prefix frontend` additionally decodes all assets in Chromium.
`prebuild` and CI enforce these gates. Rendering is deterministic: the rough.js stroke seed is
pinned and the one Gantt chart sets `todayMarker off`, so re-running `diagrams:render` with no
input change rewrites **0** of the 590 assets — a diff under `public/diagrams/` therefore means
something real changed.

**Authoring contract:** `content/CONTENT_SPEC.md` defines depth targets, required diagrams,
interview-Q&A format and permitted syntax. Raw HTML is not permitted in content.

**Guard suite:** `frontend/src/components/__tests__/TopicViewer.markdown.test.jsx` renders
all 68 files in `content/` and asserts no unparsed Markdown leaks into prose, that math files
produce real KaTeX output, and that blockquote files produce real `<blockquote>` elements.
The content gate currently passes all 68 lessons and all 83 coverage-manifest entries, covering
32,309 curriculum lines, 295 Mermaid diagrams, and 953 interview Q&As.

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

Per-topic bookmark and completed state is tracked client-side only, via
`frontend/src/utils/topicProgress.js` (a `localStorage`-backed map of `topicId` → `{ bookmarked,
completed }`, following the same storage-key/`CustomEvent` pattern as `useTheme.js`) and the
`useTopicProgress` hook that subscribes components to it. `HomePage.jsx` renders a bookmark
toggle and completed badge per topic row, a "Bookmarked" filter, and a completed-topics count;
`TopicPage.jsx` renders the same bookmark/mark-complete toggles in its header. There is no
backend involvement — the state is per-browser and not part of the topic-registration model.

`topicProgress.js` also exports `exportProgress()`/`importProgress()`, backing the **progress
dashboard's** "Export progress" / "Import progress" buttons: export wraps the current state in a small
versioned JSON envelope (`{ app, version, exportedAt, progress }`) and triggers a browser
download; import parses that file and **merges** it into the existing state field-by-field
(`true` always wins), so a restore can never silently erase progress made since the backup —
there is no "replace all" mode. Malformed JSON, a non-object payload, or a `version` newer than
this build supports are rejected with a distinct, human-readable status message.

`components/shared/ProductTour.jsx` is a guided, spotlight-and-tooltip overlay driven by
`hooks/useProductTour.js` (state machine) and `utils/tourSteps.js` (the ordered step list,
mixing home-page and one topic-page leg). Both `useProductTour()` and `<ProductTour>` are mounted
once in `App.jsx`, a sibling of `<Routes>`, so their state survives the tour's own cross-route
navigation instead of resetting when the matched route unmounts — a step whose `path` differs
from the current route triggers a `navigate()` before that step's target is looked up. Element
lookup retries for a bounded number of animation frames (covering async-mounted content right
after a navigation) and degrades to a centered, spotlight-less tooltip rather than hanging if a
target never appears. `utils/tourPosition.js` is the pure, unit-tested placement function
(clamps the tooltip within the viewport, flips above/below the target as space requires).
The tour is **opt-in and never opens on its own**, so it keeps no `localStorage` flag: the only
way in is the "Take a tour" button in `Navbar.jsx` (wired via an `onStartTour` prop from
`App.jsx`). It previously auto-showed on a first visit, which put a 9-step modal over a dimmed
page before a stranger had seen any curriculum, and was also the root of a deep-link regression —
the first step's `path: '/'` navigated a first-time visitor off whatever `/topic/...` link they
had opened, with the back button unable to recover it. Removing the auto-show makes that class of
bug structurally impossible; `AppRouting.test.jsx` locks it down, asserting deep links survive,
that nothing opens unprompted on any route including `/`, and that the navbar button still works.

`/search` and `/interview/:category` (P5) reuse the same roadmap visual language —
`SearchPage.jsx` debounces a query against `GET /api/v1/search`, cancels superseded requests,
keeps URL navigation and visible filters synchronized, and lists results as topic rows;
`InterviewPage.jsx` paginates `GET /api/v1/interview/questions` (offset/limit "Load more", server-side
category + difficulty filters, client-side shuffle) through a shared `components/shared/InterviewDeck.jsx`
— the same accessible step-through deck `TopicViewer.jsx` uses for its per-topic practice section,
extracted so both call sites stay in sync. `category = 'all'` omits the server-side category filter
rather than paging through a second client-side registry. Both routes are linked from the navbar.

`/progress` (`ProgressPage.jsx`, linked from the navbar) is a read-only view over the same
`GET /api/v1/topics` fetch `HomePage.jsx` makes, combined with the bookmark/completed state from
`useTopicProgress()` — no new endpoint, no new persistence. All of the actual math (overall/
per-category/per-level completion percentages, the "continue where you left off" pick, the
bookmarked list) lives in `utils/progressStats.js` as pure functions taking `(topics, progress)`,
kept separate from the component so it's unit-testable without rendering anything.
`utils/topicCategories.js`'s `CATEGORY_METADATA` gained a `summary` field and the module gained
`CATEGORY_ORDER`/`LEVEL_ORDER`/`LEVEL_LABELS`/`LEVEL_GLYPHS` exports so `ProgressPage.jsx` and
`HomePage.jsx` share one source for those; `HomePage.jsx` still keeps its own local category
labels/summaries, since they predate and read differently from `CATEGORY_METADATA`'s (e.g. "AI/ML
Systems" vs. "AI & Machine Learning") and changing that wasn't part of this work.

The token system in `frontend/src/App.css` provides dark and light palettes, six category accents,
semantic state colours, reading typography, spacing and motion. The saved theme follows the system
preference initially; Mermaid diagrams and syntax highlighting react to theme changes without a reload.
All additions must retain keyboard focus indicators, pair colour with labels or glyphs, respect
`prefers-reduced-motion`, and use responsive breakpoints rather than relying on a desktop layout.
See [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md). Design references: [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/),
[MDN media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using),
and [Mermaid theme configuration](https://mermaid.js.org/config/theming.html).

---

## 🔌 REST API Endpoints

- `GET /api/v1/topics` — Lists all 68 curriculum topics with level and summary metadata.
- `GET /api/v1/topics/category/{category}` — Lists topics for a specific category (`os`, `networking`, `dbms`, `java-spring`, `aiml`, `devops`).
- `GET /api/v1/content/{category}/{topicId}` — Fetches raw 3-level Markdown educational content for a topic.
- `GET /api/v1/health/readiness` — Confirms the exact curriculum index is available and reports
  its registered topic count.
- `GET /api/v1/search?q=&category=&limit=` — Cross-topic search over title, headings, coverage-manifest
  tags, summary and body, ranked and returning a matched heading + excerpt per hit
  (`DiscoveryController`/`DiscoveryService`, P5). Frontend: `SearchPage.jsx` at `/search`.
- `GET /api/v1/interview/questions?category=&difficulty=&offset=&limit=` — Paginated interview Q&A
  parsed directly from each lesson's `### Interview Questions` section, answers returned as
  Markdown. Frontend: `InterviewPage.jsx` at `/interview/:category` (`:category` may be `all`).
  An optional six-line `**Answer rubric**` block stays inside that Markdown answer; the shared
  frontend deck splits it into a collapsed checklist and follow-up after revealing the model
  answer. The API and topic page therefore use one canonical authored source, and old answers
  without a rubric keep the general comparison prompts. The responsive browser smoke walks a
  piloted question to verify answer separation, inline-code rendering and the follow-up.

The [core CS content audit](CORE_CS_CONTENT_AUDIT_2026-10-01.md) inventories the 56 OS,
networking, DBMS and Java/Spring lessons separately from the platform audit. It records
an initial snapshot of 26,382 curriculum lines, 241 diagrams and 785 interview questions in these categories,
then identifies prerequisite/outcome, reproducible lab, SQL fixture, Task Tracker milestone
and technical accuracy work without treating structural validation as learning evidence.
- `POST /api/v1/simulation/{cpu-scheduling,page-replacement,subnet-calculator,bankers-algorithm}` —
  the four legacy server-side simulations (`SimulationController`/`SimulationService`); every
  newer simulator runs client-side instead. Request bodies are validated (empty/oversized process
  lists, non-positive bursts, negative arrival times, duplicate IDs, unbounded timelines all
  rejected), invalid input failing clean as an HTTP 400 `ProblemDetail` via `ApiExceptionHandler`.

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

# Check generated Mermaid assets and migrated simulator questions
npm run diagrams:check --prefix frontend
node scripts/audit-simulation-questions.mjs --check

# Test validator and coverage-manifest behavior
node --test scripts/validate-content.test.mjs
bash scripts/test-start.sh
```

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

## Learning experience integration (2026-09-29)

`TopicService` owns authored category order, prerequisite IDs and learning outcomes. Startup
validation rejects duplicate positions, missing prerequisite references and dependency cycles.
The frontend `CatalogProvider` shares the topic request across routes; catalog failures expose
retry rather than a second hardcoded curriculum. Category pages consume this same registry.

`learningState.js` stores versioned reading locations, practice drafts, self-assessments,
selected questions and font preferences under `cs-fundamentals-learning-v1`. It broadcasts
local changes and listens for cross-tab storage events. Practice identity uses topic and
normalized question text rather than an array position. The progress page's version-3
learning backup previews merges; legacy progress backups remain supported separately.

Study/Simulation/Practice selection is URL-backed. Visited simulations remain mounted while
switching views within the topic; `SimulationVisibility` pauses hidden timer-driven engines.
Leaving the topic still discards simulator state. Reader resume uses rendered heading IDs;
search links use a matched section label resolved against rendered headings.

The isolated `examples/java-spring/task-tracker` Maven project illustrates the lesson request
flow without changing the platform backend. See its README for run commands and limits.

## October 1 reader and practice follow-up

`MarkdownRenderer` memoizes the component map passed to react-markdown so normal parent updates do not remount stateful code and diagram controls. `TopicViewer` reconnects its heading observer after returning from Practice and records a heading only while Study is visible; it restores URL or saved headings before observing. `App` owns titles for non-topic routes. `InterviewDeck` represents a saved question missing from the current page explicitly; `InterviewPage` can fetch subsequent pages until that stable question key appears. `PracticeReview` pages through review and all-answer filters and links to `?view=practice&question=<encoded-key>`. Imported alternatives can be compared, adopted by swapping drafts without losing either version, or deleted after an inline confirmation. The responsive browser harness includes these journeys and a WCAG 2.2 tagged axe check for key routes in both themes.

## Source-backed content review

[The technical accuracy ledger](CONTENT_ACCURACY_REVIEW_2026-10-01.md) records a scoped review of the transactions and concurrency lessons against PostgreSQL 18, MySQL 8.4, and the original ARIES paper. It distinguishes engine contracts, configuration assumptions, and textbook recovery models. A disposable PostgreSQL 16.15 database verified the authored read/lock lab and transactional SKIP LOCKED queue claim; this is not a cross-engine crash test. Two corrected Mermaid sources were regenerated in both themes. The API continues to serve canonical lesson Markdown with the same topic and question identities.

### Task Tracker persistence learning milestone — October 2

The isolated example keeps its existing `/api/tasks` controller and Task DTO. The default `memory`
profile excludes datasource auto-configuration; the `persistence` profile substitutes a transactional
`JpaTaskRepository`, mutable `TaskEntity` with `@Version`, and file-backed H2. Each repository method
is one transaction; multi-operation business workflows still require a service boundary. Flyway V1/V2
create and evolve the tables; Hibernate validates the result. OSIV is disabled and records are created before
returning from the repository. The optional `production` profile now adds a separate owner-scoped project API, security, caching and operational endpoints.

Twelve example tests cover unit validation, both MVC repository paths, lifecycle/merge, flush rollback,
stale versions, Spring exception rollback and proxy/self-invocation, and close/reopen file persistence.
The [example README](examples/java-spring/task-tracker/README.md) provides commands and predictions;
[the accuracy ledger](CONTENT_ACCURACY_REVIEW_2026-10-01.md) states sources, versions and limits.


### October 2 executable milestones and review sessions

`production` expands to `persistence,secure,cached` in the isolated example. Flyway owns V1 tasks
and V2 projects/task foreign keys. `ProjectService` owns transactional project CRUD, owner predicates,
version checks and deterministic bounded pages; records are mapped before leaving the transaction.
A task page uses parent authorization, count and bounded rows instead of collection fetch pagination.
`SecurityConfiguration` applies only to servlet applications; its secure chain permits ERROR dispatch
for correct status rendering, public health, owner/role-restricted projects and protected metrics.
Basic authentication retains CSRF sessions; configured nonempty teaching passwords are hashed.
Unowned legacy task endpoints are denied in the secure profile. The cache manager wraps bounded
Caffeine in `TransactionAwareCacheManagerProxy`; local puts/evictions and creation metrics publish
after commit. This does not provide cross-instance invalidation or transaction-local cache coherence.
The packaged HTTP verifier uses a random loopback port and temporary database directory, then
asserts servlet error responses and SIGTERM completion independently of MockMvc.

`reviewSchedule.js` validates and merges up to ten attempt snapshots per question, computes the
explained 1/3/7/doubling intervals, and chooses up to eight due/mixed items. `learningState.js`
keeps the local version-1 store/key compatible while exporting version-3 envelopes; v1 progress
and v2 learning backups still import. Deleting a saved answer removes its review history.
`ReviewPage` freezes its selection for the session, loads only its selected canonical lesson Markdown,
matches normalized question keys, cancels superseded reads and retries unavailable selections
without replacing them. `InterviewDeck` explicitly records draft, self-rating and whether the answer
was opened during that visit; merely choosing a rating does not create an attempt. Dates can be
postponed or reset. There is no backend review store, synthetic grading or new question bank.

`examples/labs` contains transactional PostgreSQL fixtures and bounded Python Linux/loopback
observations. Their dedicated CI job and the example HTTP smoke are separate from browser checks.
`scripts/test-responsive-layout.mjs` now covers 11 route families at five widths in both themes,
16 axe scans and an exact-question attempt/review journey. Actual learner sessions are separately
tracked in `LEARNER_USABILITY_STUDY.md`; automated accessibility is not a comprehension study.


### October 2 remaining-lesson review batch

The source ledger now covers **19 of 56 core lessons**, with 37 still awaiting a full review.
Application-layer, Java concurrency, distributed DBMS and deadlock corrections retain the same
question prompts and Mermaid sources. There are 42 authored rubrics. Two added Java 17 programs
verify task-result retrieval and deterministic executor admission; the complete marked-example
verifier now covers fourteen programs. A finite Python Banker model verifies two safe allocations
and an unsafe allocation without acquiring OS locks. Neither model is a performance benchmark.

Spring REST, normalization and generics reviews add method-versus-object validation boundaries,
filter/MVC error separation, cursor/ETag/deduplication limits, a SQL BCNF dependency counterexample,
and a runnable Java 17 reifiable-array/type-test example. Compilation also verifies three forbidden
forms fail; a final-class method does not automatically qualify for SafeVarargs. These are sourced
lesson/executable checks, not a new cursor, idempotency or method-validation feature in Task Tracker.

### Charcoal theme refinement — October 3

Dark surfaces are neutral charcoal, with separate page, card, raised and code tones. All styling
lives in semantic `App.css` tokens and shared rules. Selection/scrollbar tokens have explicit light
overrides; system and explicit theme persistence behavior is unchanged. Syntax and category actions
retain tested contrast. Keyboard focus includes inputs, selects, textareas and summaries. Prebuilt
Mermaid assets are regenerated to match. Contrast unit tests and the browser smoke harness check
the rendered dark surface, keyboard switching and reload persistence alongside responsive/axe
journeys. The reference is stylistic, not an exact site clone.

### Core accuracy completion — October 3

The [completion ledger](CORE_ACCURACY_COMPLETION_2026-10-03.md) closes all 37 remaining core
reviews, bringing scoped coverage to 56/56. Current APIs, registries, question prompts and
Mermaid sources are preserved. The two migration evidence quotes follow corrected answers
without changing archived questions or digests. `examples/labs/sql/accuracy.sql` and
`examples/labs/java/AccuracyContracts.java` add actual runtime assertions to the existing CI
labs/backend jobs. Java 17 and PostgreSQL 16.15 are live baselines; source-version distinctions
include Batch 6, Java 21/25 and PostgreSQL 18. Updated learning contracts include nullable
constraints, division universes, class initialization, SAMs, overload phases and Optional nulls.

All main CI jobs pass in run 37104855707, including container execution. Actual learner sessions
and the separate twelve-lesson AI/ML/DevOps freshness queue remain open.

### Interview feedback extension — October 3

Twelve additional answer rubrics in six reviewed lessons bring the total to 56.
They remain in canonical topic Markdown, so topic practice and paginated category
practice expose the same model answer and optional checklist without a second question
bank. Question IDs, prompts, model answers and diagram sources are unchanged.
The corpus is now 33,232 lines, 68 lessons, 295 diagrams and 953 interview questions.
See [the feedback ledger](INTERVIEW_FEEDBACK_2026-10-03.md) for question IDs and sources.
Corpus parsing verifies all 56 checklists separate from model answers; backend tests
verify the twelve new question IDs retain their six labels across category pages.

### AI/ML and DevOps freshness completion — October 3

The [freshness ledger](AI_ML_DEVOPS_FRESHNESS_REVIEW_2026-10-03.md) closes the twelve-lesson queue; all 68 lessons now have a scoped technical review. This supersedes earlier freshness-pending counts. Canonical prompts and registrations remain unchanged; model answers and six diagram sources receive accuracy corrections, with regenerated theme assets and manifest. Current corpus: 33,450 lines, 295 diagrams, 953 questions and 56 rubrics.

`examples/labs/aiml/observe.py` is a standard-library synthetic evaluation exercise, not a model integration. Its six checks join the two OS/network checks in `test_labs.py`. `examples/labs/sql/feature-availability.sql` verifies event-time versus actual availability, missing values and deterministic ties using temporary PostgreSQL objects and rollback; the CI labs job now executes it. Provider/engine snippets remain explicitly scoped excerpts. No production AI credentials, cloud resources, external SDK workloads or participant sessions are added.
