# CS Fundamentals with UI

**Interactive learning platform for Computer Science fundamentals — from beginner to expert.**

This project helps you prepare for **CS interviews** and software engineering excellence through a reading-first learning experience with optional interactive simulations. Every topic is structured in three tiers: 🟢 Beginner → 🟡 Intermediate → 🔴 Expert with real-world failure modes, trade-offs, and interview Q&As.

---

## ⚡ One-Command Quick Start

Start both Frontend and Backend locally in a single command:

```bash
# Clone the repository
git clone https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui.git
cd cs-fundamentals-with-ui

# Install the frontend dependencies once after cloning
npm ci --prefix frontend

# Launch Spring Boot and Vite with one command
./start.sh
```

- **Frontend UI**: starts at [http://localhost:3000](http://localhost:3000)
- **Backend API**: starts at [http://localhost:9190/api/v1/topics](http://localhost:9190/api/v1/topics)

If either port is occupied, `start.sh` selects the next free port and prints the actual URLs.
`FRONTEND_PORT` and `BACKEND_PORT` change the starting ports when needed.

### Alternative Startup Options

```bash
# Start via Docker Compose explicitly (separate from start.sh)
docker compose up --build

# start.sh always launches Spring Boot + Vite locally
./start.sh
```

---

## 🚀 Deployment (free tier)

Both halves already ship with a production `Dockerfile` (`backend/Dockerfile`,
`frontend/Dockerfile`) — deploying is wiring, not new code. The backend has no database, so
there's no persistence layer to provision anywhere.

**Backend → [Render](https://render.com) free Web Service**
1. Push this repo to your own GitHub account (fork or your own remote).
2. On Render: **New → Blueprint**, connect the repo. Render reads `render.yaml` at the repo root
   and creates a free Docker web service from `backend/Dockerfile` automatically — the build
   context is the repo root, since the Dockerfile pulls in the top-level `content/` directory.
   *(No Blueprint support on your plan? New → Web Service → same repo → Runtime: Docker →
   Dockerfile path `backend/Dockerfile` → Docker build context `.` (repo root) → Plan: Free.)*
3. Deploy. Render assigns a public URL like `https://cs-fundamentals-backend-xxxx.onrender.com` —
   copy it. The backend already reads Render's injected `PORT` env var
   (`application.properties`), so no config is needed there.

**Frontend → [Vercel](https://vercel.com) free tier**
1. New Project → import the same repo → set **Root Directory** to `frontend`.
2. Before deploying, edit `frontend/vercel.json` and replace the placeholder
   `https://cs-fundamentals-backend.onrender.com` with the real Render URL from the step above,
   then commit and push.
3. Deploy. Vercel builds with `npm run build` automatically and serves `dist/`.
   `vercel.json`'s rewrite proxies `/api/*` to the Render backend server-to-server, so the
   frontend's existing same-origin `/api/v1/...` calls (`utils/api.js`) work unmodified — no CORS
   configuration needed, since the browser only ever talks to the Vercel domain. A second
   rewrite sends every other path to `/index.html` so client-side routes (`/topic/:id`, `/search`,
   `/interview/:category`) survive a hard refresh or a direct link.

**Known free-tier tradeoff**: Render's free plan sleeps after ~15 minutes idle; the first request
after a sleep takes 30–50s to wake the container. Expected and harmless for a portfolio link —
just don't be surprised by a slow first click.

---

## 🎮 Interactive Visualizers Included

### 💻 Operating Systems
- **⚡ CPU Scheduling Simulator**: Live Gantt chart, step-by-step CPU execution, and real-time waiting/turnaround metrics for FCFS, SJF, SRTF, Round Robin, and Priority algorithms.
- **🔄 Process Lifecycle & PCB Inspector**: State machine transitions (`NEW → READY → RUNNING → WAITING → TERMINATED`) with live PCB register state and Process vs Thread context switch engine.
- **🧠 Memory Management & Page Replacement**: LRU, FIFO, and Optimal page replacement simulators with hit/fault counters and MMU Address Translation calculator.
- **🔒 Process Synchronization**: Mutex locking critical sections and Producer-Consumer bounded buffer semaphores.
- **🛡 Deadlock & Banker's Algorithm**: Resource Allocation Matrix evaluator and safe sequence checker.
- **📁 File Systems**: inode direct/indirect pointer allocation walkthrough and the Linux VFS abstraction layers.
- **💿 Disk Scheduling**: head-movement comparison across FCFS, SSTF, SCAN (elevator), and C-SCAN.

### 🌐 Computer Networks
- **🗺️ Network Topology Explorer**: Interactive Star, Bus, Ring, Mesh, Tree, and Hybrid topologies with fault simulation.
- **📈 Physical Line Encoding & Waveforms**: Oscilloscope digital bitstream waveforms (NRZ-L, NRZ-I, Manchester, Differential Manchester).
- **📦 TCP & UDP Segment Header Inspector**: Interactive 20-byte TCP & 8-byte UDP bitfield grid with dynamic field tooltips.
- **🚦 Traffic Shaping Simulator (QoS)**: Token Bucket vs. Leaky Bucket discrete burst policing simulation.
- **📡 DHCP DORA 4-Step Simulator**: Step-through state machine for Discover, Offer, Request, and Acknowledge flows.
- **🔍 ARP Resolution Protocol**: Layer 2 broadcast requests and dynamic kernel ARP cache table inspector.
- **🔄 NAT / PAT Translation Table**: Socket translation simulation between internal LAN and public WAN sockets.
- **🛣️ Distance Vector Routing (Bellman-Ford)**: Step-by-step multi-router routing vector exchange and convergence rounds.
- **🐢 TCP Congestion Control**: Slow start, congestion avoidance, and AIMD window growth/backoff alongside the 3-way handshake.
- **🔗 Consistent Hashing**: Hash-ring node placement and key redistribution on node add/remove — also powers the Distributed Databases & CAP Theorem simulation.

### 🗄️ Database Management Systems (DBMS)
- **🧮 Relational Algebra, Calculus & Joins Simulator**: Animated Selection ($\sigma$), Projection ($\pi$), Equi-Join ($\bowtie$), Left Outer Join ($\$), and Tuple Relational Calculus (TRC) translation.
- **🗝️ Keys, Functional Dependencies & (X)⁺ Closures**: Attribute Closure solver, Armstrong's Axioms inference, Candidate Key detection, and Minimal Canonical Cover ($F_c$).
- **📊 Database Normalization (1NF–BCNF)**: Step-by-step anomaly detection (Insertion, Deletion, Update) and lossless join decomposition simulator.
- **🌲 B+ Tree Indexing & Storage Engine**: Complete binary/multi-way B+ Tree search, dynamic node splits, and leaf range scans.
- **🔒 Concurrency Control & 2PL**: Conflict serializability, Strict 2PL locking, Timestamp Ordering, Thomas Write Rule, and deadlock wait-for graphs.

### ☕ Java & Spring Ecosystem
- **🧠 JVM Heap & GC**: Young/Old Gen allocations, G1GC/ZGC collectors, and Project Loom Virtual Threads.
- **🗂 HashMap Internals**: Bucket selection, collision chains, treeification, resize, and mutable-key failure modes.
- **🧵 Virtual Threads**: Virtual-thread mount/unmount behavior over carrier threads.
- **🌐 Spring MVC Flow**: DispatcherServlet request routing and security-filter execution.
- **🗄 Connection Pooling**: HikariCP exhaustion and wait-queue behavior.
- **⏱ Quartz Scheduler**: Trigger, misfire, and clustered `JobStoreTX` behavior.

### 🤖 AI/ML Systems

The [AI/ML and DevOps learning path](AI_ML_DEVOPS_LEARNING_PATH.md) gives the full study order, capstones, and interview checks. The suggested beginner-to-backend path is ML fundamentals → LLM usage and tool calling → embeddings → RAG → serving. Feature stores and recommendations are later specializations. Each lesson now starts with a plain-language outcome and a small backend scenario; the LLM lesson covers current tool interfaces and human-reviewed integration decisions. The DevOps path starts with Docker, then CI/CD, Nginx, Kubernetes, and cloud operations, with a first practical debugging task in each lesson.
- **📐 Embeddings & Vector Search**: 2D vector coordinate and cosine-distance calculator with similarity-search result ranking.
- **🧩 RAG Pipeline**: Step-through of the retrieval-augmented-generation request path end to end.
- **⚡ vLLM PagedAttention**: Traditional contiguous GPU allocation vs. PagedAttention's block-based virtual paging, side by side.
- **🎛 LLM Sampling**: Temperature logit scaling and nucleus (top-p) sampling against a rescaled token-probability distribution.
- **🏬 Feature Stores**: Population Stability Index (PSI) drift detection and online vs. offline feature lookup latency.
- **🎯 Recommendation Systems**: The 2-stage pipeline — two-tower ANN candidate retrieval narrowing a 10M-item catalog, then deep & cross-network ranking.

---

## 📚 68 Curriculum Topics Covered

All 68 lessons satisfy the authoring contract and coverage manifest: 32,531 curriculum lines,
295 Mermaid diagrams, and 953 validated interview Q&As across six preparation areas.

The [technical accuracy ledger](CONTENT_ACCURACY_REVIEW_2026-10-01.md) records sourced DBMS recovery/isolation and JPA/transaction reviews, including a PostgreSQL two-session lab, a durable queue claim, and executable Task Tracker persistence tests. The [October 3 completion ledger](CORE_ACCURACY_COMPLETION_2026-10-03.md) completes all 56 core scoped reviews. The [AI/ML and DevOps freshness review](AI_ML_DEVOPS_FRESHNESS_REVIEW_2026-10-03.md) closes the remaining twelve technical reviews; real learner validation remains open.

Twenty high-value questions across Java, Spring MVC, OS processes, TCP, and DBMS now include
an optional six-point answer rubric. Reveal the model answer first, then open **Answer checklist
and follow-up** to compare your own explanation against the core claim, mechanism, example,
limitation, common mistake, and transfer question. Other questions retain the general comparison
prompts while the rubric is expanded through editorial review.
The [core CS content audit](CORE_CS_CONTENT_AUDIT_2026-10-01.md) inventories all 56 OS,
networking, DBMS, and Java/Spring lessons and sets out the remaining prerequisite,
hands-on lab, runnable example, technical accuracy, and interview-feedback work.

| Category | Topics Count | Key Areas Covered |
| :--- | :--- | :--- |
| **Operating Systems** | 8 Topics | Process Management, Memory Management, CPU Scheduling, Synchronization, Deadlocks, File Systems, I/O Systems, Disk Scheduling & Allocation |
| **Computer Networks** | 12 Topics | Network Fundamentals, Physical Media, OSI & TCP/IP, Data Link Layer & ARQ, IP Subnetting & CIDR, Routing Algorithms, TCP/UDP Handshakes, TCP Flow & Congestion Control, Transport Protocols (QUIC/SCTP), Application Layer (HTTP/3, DNS), Network Security (TLS 1.3), QoS & Traffic Shaping |
| **DBMS** | 13 Topics | DBMS Introduction & Architecture, 3-Schema ANSI-SPARC, ER Model & Mapping, Relational Algebra & Calculus, Keys & Functional Dependencies, Database Normalization (1NF–BCNF), B+ Tree Indexing, File Storage & RAID Arrays, Transactions & ACID, Concurrency Control, Query Optimizer, practical SQL and window functions, Distributed Databases & CAP Theorem |
| **Java & Spring** | 23 Topics | Core and Advanced Java, JVM/GC/concurrency, collections and streams, Spring container and MVC, Spring Boot internals, REST API design, Security, caching/async, testing/production, JPA/Hibernate, Batch, Quartz, SOLID and design patterns |
| **AI / ML Systems** | 7 Topics | ML fundamentals and evaluation, Vector Embeddings & Vector DBs, RAG Architecture, LLM Model Serving & PagedAttention, LLM Sampling & ReAct Agents, Feature Stores & MLOps, 2-Stage Recommendation Engine |
| **DevOps & Infrastructure** | 5 Topics | Docker & containers, Kubernetes architecture/networking/scaling, Nginx as reverse proxy & load balancer, CI/CD pipelines & deployment strategies, orchestration trade-offs/IaC/observability/cloud fundamentals |

---

## 🛠 Tech Stack & Architecture

- **Backend**: Java 17, Spring Boot 4.1, Maven
- **Frontend**: React 19, Vite 8, React Router 7, and token-driven vanilla CSS
- **Content rendering**: react-markdown + remark-gfm, KaTeX math, syntax highlighting, and
  pre-rendered dark/light Mermaid SVGs (no Mermaid runtime on the reader path)
- **Testing**: Vitest, React Testing Library, JUnit 5, Spring Boot Test
- **Containerization**: Docker, Docker Compose, Nginx Reverse Proxy
- **System Documentation**: See [CONTEXT.md](CONTEXT.md) and [AGENTS.md](AGENTS.md)
- **Incident History**: Search [RCA.md](RCA.md) before debugging a repeated symptom
- **Content authoring**: See [content/CONTENT_SPEC.md](content/CONTENT_SPEC.md)

---

## 🗺️ Active Product Plan

The current priority is to turn the existing topic library into a dependable, content-first
study product. The implementation sequence is:

1. Keep content routes, validation and CI reliable. — done.
2. Make Study the default topic view and add a table of contents, tier navigation, reading
   progress and an interview-practice deck. — done.
3. Retain only high-value simulations; migrate any retained theory and questions before a
   simulator is removed. — done; 18 non-retained simulators removed after a migration gate
   verified their questions live on in the lesson content.
4. Add cross-topic search and category interview mode. — done: `/search` and
   `/interview/:category`, backed by `GET /api/v1/search` and
   `GET /api/v1/interview/questions`.
5. Complete responsive/accessibility and release verification. — the original phase is complete;
   the most recent full audit and its remediation evidence are tracked in
   [PROJECT_REVIEW_2026-09-14.md](PROJECT_REVIEW_2026-09-14.md).

The detailed engineering status and content-wave order live in [AGENTS.md](AGENTS.md).
The expanded [SDE-2 coverage plan](plan.md) is the acceptance checklist for OS, Networking,
DBMS/SQL, Core and Advanced Java, Spring Boot, and AI/ML. Its seven focused additions are now
registered, and [the coverage manifest](content/COVERAGE_MANIFEST.json) makes every required
heading and concept mapping machine-verifiable.

### Experience Standards

Every learning surface must be responsive, keyboard-operable and readable in both dark and light themes.
Topic pages keep a single document title, condense their desktop toolbar while reading, and let the
toolbar scroll out of the way on mobile. Study navigation starts collapsed below the desktop
breakpoint, interactive targets retain visible focus, and the interface honours reduced-motion
preferences. UI choices are guided by the [WCAG 2.2 quick
reference](https://www.w3.org/WAI/WCAG22/quickref/), [MDN responsive-design
guidance](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using), and
[Mermaid theming documentation](https://mermaid.js.org/config/theming.html).

The home page is a guided curriculum roadmap: category filters expose topic counts, ordered
topic rows, level badges and a direct Study action. Each topic reader supplies reading progress,
a responsive accessible table of contents, tier jumps and a recall deck without repeating the
page title or navigation context.

Topics can be bookmarked and marked complete from either the roadmap row or the topic page header;
a "Bookmarked" filter and a completed-topics count on the home page track this alongside the
existing category/level filters. Both appear only once they mean something — a visitor with no
progress is not shown a score of zero or a filter that can only return nothing. This state lives
entirely in the browser's `localStorage` (no account or backend persistence), so it is per-device
and clears if site data is cleared. "Export progress" / "Import progress" buttons on the
`/progress` dashboard download or restore this state as a JSON file, so it can be backed up or
carried to another device; importing merges into whatever is already saved rather than replacing
it, so a restore can never demote existing progress.

A `/progress` dashboard (linked from the navbar) turns that same state into an overview: overall
completion, a bar per category and per level, the full bookmarked list, and a "Continue where you
left off" pointer to the next not-yet-completed topic in curriculum order.

A guided product tour spotlights the learning paths, the full lesson browser, Search and Interview
Mode, then crosses over to a lesson to show its views and category rail. It is entirely opt-in — it
never interrupts a first visit, and opens only from **Help → Take a tour of the app** in the navigation bar.

The interface follows the operating-system theme on first visit and persists an explicit choice.
Category and learning-level states always combine colour with a glyph or text label. See the
[design-system reference](docs/DESIGN_SYSTEM.md) for tokens, responsive behavior, and accessibility
requirements.

---

## 🧪 Automated Testing

```bash
# Run Frontend Tests
cd frontend && npm test

# Run Backend Tests
cd backend && mvn test

# Validate every curriculum file against the authoring contract
node scripts/validate-content.mjs

# Verify every Mermaid source has current dark/light SVG assets
npm run diagrams:check --prefix frontend

# Verify legacy simulator questions remain accounted for
node scripts/audit-simulation-questions.mjs --check

# Test the validator and coverage-manifest rules
node --test scripts/validate-content.test.mjs scripts/audit-simulation-questions.test.mjs

# Validate the launcher without starting either application
bash scripts/test-start.sh

# Browser checks on the built frontend (API fixtures): routes × widths × themes, axe, journeys,
# reader density and every simulator at 320px
npm run build --prefix frontend && npm run test:responsive --prefix frontend

# Reproducible previews and reader measurements (writes PNGs + metrics.json)
node scripts/capture-ui-previews.mjs frontend/test-results/ui-previews

# Real-backend browser journey against a running API (also a CI job)
CS_API_ORIGIN=http://127.0.0.1:9190 node scripts/test-real-backend-journey.mjs
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

## Learning experience update (2026-09-29)

Browse ordered learning paths at `/category/:categoryId`. Lessons expose Study, Practice,
and Simulation where supported. Reading includes font size, focus mode, code copy/wrap,
diagram zoom, and a resume link to your last saved heading. Practice supports optional
written explanations and self-assessment; the progress page offers review and learning-data
backup. These records stay in your browser, with session-only fallback when storage fails.

Twenty-two Java/Spring lessons now introduce prerequisites, outcomes and concrete traces
before advanced terminology; the existing OOP reference lesson remains. The runnable
[Task Tracker example](examples/java-spring/task-tracker/README.md) connects plain Java
dependency injection to a small Spring REST application. It defaults to in-memory storage and adds an optional JPA/H2 persistence profile with transaction and restart tests.

The [revamp plan](UI_UX_REVAMP_PLAN.md) remains in progress: comprehensive accessibility
verification, simulator presentation work and the larger curriculum expansion are pending.

### Learning continuity and review

The home and progress pages suggest a next lesson in your recently used category, following unmet prerequisites first. Your reading location and practice answers stay in browser storage and can be exported from Progress. Category interview practice can find a saved question on a later page. On Progress, the saved-answer manager opens the exact question, reaches answers beyond the first page, compares imported alternatives, swaps an alternative into Practice without losing the previous draft, and confirms deletion; its empty state remains visible after the last deletion so keyboard focus can land on the result; a live status appears only for a completed action. Known, missing, malformed and failed-to-load routes, including category-specific interview pages receive matching page titles and main-landmark names. Route changes focus the named main landmark so keyboard and screen-reader users can identify the new page; query, hash and lesson-view changes keep the current focus and reading position. The responsive browser check now waits for the selected theme and lazy simulator before scanning contrast in both themes. The [dated learning and UX audit](PROJECT_LEARNING_UX_AUDIT_2026-10-01.md) tracks further improvements to interview feedback, learning labs and accessibility.


### Runnable labs and delayed recall — October 2

[SQL, OS and networking labs](examples/labs/README.md) provide fixtures, predictions, expected
observations, checks and cleanup. They use PostgreSQL 16+ and Python 3 on Linux/WSL, with loopback
networking and temporary files. CI runs SQL correctness and both Python observations.

[Task Tracker](examples/java-spring/task-tracker/README.md) now progresses from memory and JPA to
Flyway migrations, project/task CRUD, bounded pagination, owner/role/CSRF security, commit-aware
caching and health/metrics. Run its Maven suite and packaged `verify_http.py`; the README explains
legacy schema adoption and the limits of the local production teaching profile.

From Progress, open **Start a review session**. Record optional explanations and self-assessments,
review up to eight due/mixed questions, compare the latest ten attempts, and postpone/reset dates.
Scheduling is transparent: needs review 1 day, partial 3 days, confident 7 days then doubles to a
30-day cap. Ratings are learner feedback, not automatic interview-readiness scores. Version-3
backups include dates/history and still accept legacy version-1/2 files without replacing local drafts.

The [source ledger](CONTENT_ACCURACY_REVIEW_2026-10-01.md) and [October 3 completion ledger](CORE_ACCURACY_COMPLETION_2026-10-03.md) record **56/56 scoped core lesson reviews**, including all 37 previously pending reviews. The [October 3 feedback extension](INTERVIEW_FEEDBACK_2026-10-03.md) brings the total to **56 authored answer rubrics**, with concrete mechanisms, examples, limits and follow-ups. The
[learner study](LEARNER_USABILITY_STUDY.md) is prepared; actual participant sessions and retesting
remain required. See [the delivery checkpoint](CURRICULUM_COMPLETION_2026-10-02.md) for evidence
and the outstanding work rather than interpreting automated checks as learner validation.

Dark mode uses a LeetCode-inspired charcoal palette with quieter accents, readable syntax
comments, theme-aware selection, native scrollbars and keyboard focus for editable controls.
See [the design system](docs/DESIGN_SYSTEM.md) for the palette and verification contract.

The SQL/Java [accuracy counterexamples](examples/labs/README.md#core-accuracy-counterexamples--october-3)
run in CI alongside the existing labs. They check concrete null, bag, division, initialization,
overload, SAM, Optional and comparator behavior on PostgreSQL 16 and Java 17.

### AI/ML and DevOps review — October 3

All seven AI/ML and five DevOps lessons now have a [dated source-backed review](AI_ML_DEVOPS_FRESHNESS_REVIEW_2026-10-03.md), completing scoped technical review of all 68 lessons. Worked examples clarify evaluation metrics, feature availability, memory/cost budgets, rollout rounding, proxy rate limiting and rollback limits. The [offline AI and PostgreSQL labs](examples/labs/README.md) make key distinctions reproducible without a model API or cloud account. The corpus contains 33,450 lines, 295 diagrams, 953 questions and 56 authored rubrics. Broader exercises/rubrics and actual participant sessions remain roadmap work.

The freshness release also fixes an existing reader-test timing race: await the accessible TOC link after heading extraction rather than treating mounted lesson text as finished navigation. `RCA-2026-10-03-04` records the failed/passing same-head CI evidence and verification.

## Category topic navigation — October 4

The left rail in Study and topic Practice now shows every lesson in the current category,
for all six learning paths. Click a lesson title to open it; use its up/down chevron to
collapse or expand its Beginner, Intermediate, Expert and section links. Clicking a
section opens the exact heading, including in another lesson. The current lesson and
reading section are highlighted. Expanded lessons stay open while moving between lessons;
refresh opens the current lesson by default. On mobile, use **Show topics** to open the panel.
Focus reading still hides the rail until you exit that mode.

Only the active lesson downloads full content. Other lessons use a small, cached heading
outline request. If that request fails, lesson links and current-lesson sections remain
available, with **Retry subtopics** to recover.

The [Java course alignment review](JAVA_COURSE_ALIGNMENT_REVIEW_2026-10-04.md) records
inspection of the learner's 40-entry course index, a visual/text review of its three-page
JDK/JRE/JVM PDF and a proposed familiar revision path. Other linked notes remain unreviewed;
the course alignment is proposed, not imported curriculum.


### UI/UX refinement plan — October 5

The [October 5 UI/UX refinement plan](UI_UX_REFINEMENT_PLAN_2026-10-05.md) has been implemented; the
[results record](docs/UI_UX_REFINEMENT_RESULTS_2026-10-05.md) lists what changed, the measurements and
what remains open, and [the design system](docs/DESIGN_SYSTEM.md) describes the component rules.

- **Navigation:** one compact bar — Search (Ctrl/⌘ K), a Learn menu with every learning path, Interview
  Mode, Progress, Help (the opt-in tour) and a theme switch; below 900px it collapses to Search and Menu.
- **Reader:** lessons start sooner (the Java Execution Pipeline article begins at 303px instead of 426px
  on a 1440×960 screen, and 415px instead of 570px at 375px wide) without hiding any content. Level jumps
  and one Reading options menu (text size, focus reading, study help) share a single row, prose follows
  the chosen text size at a 68ch measure, and the lesson ends with practice and completion actions.
- **Category rail:** every lesson in the category with its sections, plus search over lesson titles and
  section headings and Collapse all; your own expansion choices are kept.
- **Both themes:** the charcoal dark theme is kept, light mode is now a calm neutral palette, and primary
  actions use one amber colour in both. All application controls use one SVG icon set.
- **Browsing, practice and progress:** home leads with Resume or Start here, then six learning paths and
  a "Browse all lessons" section; practice puts Reveal answer first; Progress leads with what to continue.
- **Simulators:** all 36 simulator views fit a 320px screen and pass automated accessibility checks in
  both themes.

These are design and automated-check results; no learner study has been run.
