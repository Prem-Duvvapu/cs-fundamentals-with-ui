# Backend Engineering

Current scope: the core curriculum and UI refinement are delivered; the expanded practical
backend/AI roadmap is still in progress. Releases through [PR91](https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui/pull/91)
include the frozen prompt comparison, actual service/cluster exercises and five familiar Java source reviews.
Use the [current capability ledger](docs/BACKEND_AI_IMPLEMENTATION_RESULTS_2026-10-16.md#capability-ledger)
for what remains. Dated milestones below retain their original evidence; they are not blanket
completion claims. The [editorial maintenance guide](docs/EDITORIAL_MAINTENANCE.md) defines how to
keep explanations, examples, dependencies and sources current.

Part of the [Learning Hub](https://learning-hub-with-ui.vercel.app/).
The shared **Learning network** navigation offers Learning Home and same-tab
links between DSA, LLD, HLD, and CS fundamentals on every route. These remain
independent apps: themes, backend state, and progress are not synchronized.

**Learn backend engineering: foundations, Java/Spring, databases, distributed systems, DevOps and practical AI — from beginner to expert.**

This project helps you prepare for **CS interviews** and software engineering excellence through a reading-first learning experience with optional interactive simulations. Every topic is structured in three tiers: 🟢 Beginner → 🟡 Intermediate → 🔴 Expert with real-world failure modes, trade-offs, and interview Q&As.

---


## Visitor analytics

The deployed frontend uses [Vercel Web Analytics](https://vercel.com/docs/analytics/quickstart)
through `@vercel/analytics/react`, mounted once in the application root. Production
builds track page visits, including client-side navigation. Query strings and URL
fragments are removed before sending page locations; no custom events, practice
answers, notes, or simulation inputs are configured for collection. Development
builds do not mount analytics.

Enable **Web Analytics** for this individual project in Vercel, then deploy after
enabling it. Visit the deployed app and check its Analytics dashboard and browser
Network panel for the analytics script and page-view requests. Each app and the
Learning Hub have independent analytics. A plain local server or Docker deployment
does not supply Vercel's analytics endpoint; blocked/unavailable analytics must not
prevent learning or navigation. Live visitor totals require dashboard verification.

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
- **Reader:** lessons start sooner (the Java Execution Pipeline article begins at 324px instead of 426px
  on a 1440×960 screen, and 448px instead of 570px at 375px wide, including the Learning network bar) without hiding any content. Level jumps
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


### Practical backend and AI/ML roadmap — October 16

The [practical learning plan](BACKEND_AI_PRACTICAL_LEARNING_PLAN_2026-10-16.md) defines the next content and lab expansion: an AI path from zero knowledge, three connected Java AI projects, production debugging exercises and supporting backend engineering practice. Implementation is in progress; PR #55 delivers the first practical AI package, while the existing curriculum and October 5 UI refinement remain delivered. The [implementation prompt](BACKEND_AI_IMPLEMENTATION_PROMPT_2026-10-16.md) provides the handoff and verification requirements.


### Practical AI implementation — first milestone

Start the [beginner learning path](docs/BACKEND_AI_LEARNING_PATH.md), train a tiny classifier with `python3 examples/labs/aiml/train.py`, then run the [Java extraction example](examples/ai-backend/README.md). The application uses Spring AI with a bounded HTTP adapter and distinguishes fixture contract tests from opt-in live local-model evaluation. The [implementation ledger](docs/BACKEND_AI_IMPLEMENTATION_RESULTS_2026-10-16.md) tracks the remaining roadmap.

The ML fundamentals lesson now links the training lab and includes three more scenario rubrics (59 total). A recorded local-model experiment completed all 20 requests but matched no complete expected field set; the teaching materials explicitly distinguish schema acceptance from semantic correctness. See the implementation ledger for the report and limits.

The practical project also provides a [tenant-aware JDBC knowledge baseline](examples/ai-backend/KNOWLEDGE.md) and [bounded tool/approval workflow](examples/ai-backend/WORKFLOW.md). The MCP example uses an actual local server/client; its tested negotiated protocol is documented explicitly. Dense vector retrieval and remaining production exercises are still pending. Interactive credentials are required environment values; the smoke generates its own.

The agent API reports recoverable capacity exhaustion as HTTP 503 and malformed model responses as HTTP 502; its focused service/MVC tests distinguish these from client validation failures.

### Backend coverage checklist — October 17

The [77-item backend checklist](BACKEND_ENGINEERING_COVERAGE_2026-10-17.md) maps every requested concept to its owner, current depth and remaining build/debug/interview evidence. It includes specific existing DSA, LLD and published HLD links so their lessons and exercises can be reused. Additions focus on uncovered concepts and backend integration practice; mapping is not a claim that all outcomes are complete. The AI/ML roadmap remains required alongside this checklist.

### Backend Engineering release work — October 18

The product name is now **Backend Engineering**. Existing URLs, technical package identifiers,
local preferences, saved answers and backup compatibility remain stable. The learning-network
subject label stays CS fundamentals.

The AI learning path now has three authored scenario rubrics in every AI lesson (**77 corpus-wide**),
a [runnable recommendation exercise](examples/labs/aiml/RECOMMENDATIONS.md), and
[per-field/slice evaluation diagnostics](examples/ai-backend/EVALUATION.md). The recommendation
fixture uses authored vectors/scores; it does not claim trained ranking or online quality.
Try the [real JVM/PostgreSQL diagnosis labs](examples/labs/backend/README.md) to observe deadlock,
retained memory, query plans and lock waits. These are bounded local exercises, not production benchmarks.

[Learning-link maintenance](docs/LEARNING_LINK_MAINTENANCE.md) now has deterministic PR checks
and separate scheduled/live identity checks. The first audit found an actual HLD cache-aside
frontend/backend version mismatch; its owning deployment needs correction. A successful HTTP
response alone does not certify a lesson. Relative lesson links to repository guides now resolve
to the repository, while registered lesson links stay in the app. See the
[implementation ledger](docs/BACKEND_AI_IMPLEMENTATION_RESULTS_2026-10-16.md) for verified releases
and explicitly open AI/backend/learner-accessibility gates.

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

The [Redis/MongoDB lab](examples/backend-data-services/README.md) exercises actual TTL/Lua, tenant/version cache isolation, document indexes and optimistic conflicts; its dedicated CI requires real services without skips.

The [document-input lab](examples/ai-backend/DOCUMENTS.md) distinguishes digital PDFs from scans and records page provenance; CI requires real OCR. The [security lab](examples/java-spring/task-tracker/SECURITY.md) adds an opt-in JWT/JWKS path and complete OWASP Web2025/API2023 control-and-gap matrices.

The [RAG evaluation exercise](examples/ai-backend/RAG_EVALUATION.md) runs30 development and20 held-out queries, separating retrieval coverage from fact-label/citation diagnostics and policy rejections. Its committed results are labelled copy-fixture evidence, not live-model quality.

Practice [durable saga recovery](examples/backend-messaging/README.md#8-persisted-saga-reconcile-separate-local-commits), [real PostgreSQL incidents](examples/backend-persistence/README.md), and the [Git/Linux/Maven/Clean Code workflow](examples/engineering-workflow/README.md). Each guide includes predictions, failure evidence, repairs and an interview explanation. These extend the existing curriculum and sibling lessons.

Verification runs on pull requests and main pushes; newer revisions cancel superseded PR verification. The full release checks remain required before merging.

The optional [Java21 runtime lab](examples/java-runtime/README.md) compares actual platform/virtual threads under the same downstream limit and captures a real CPU thread dump/JFR profile. The platform remains on Java17.

Start AI model selection with the [measured rule baseline and adaptation decisions](examples/ai-backend/ADAPTATION_DECISIONS.md). It compares explicit task completion/review rates and explains when to choose rules, a classifier, prompting, retrieval or fine-tuning.

The [controlled-workflow evaluator](examples/ai-backend/WORKFLOW_EVALUATION.md) separates completed tasks, expected refusals and policy violations across50 original cases. The [OAuth/PKCE lab](examples/backend-identity/README.md) exercises a real framework authorization server against TaskTracker. The [Kubernetes recovery lab](examples/backend-operations/README.md) requires actual kind evidence for DNS, readiness and rollback; native guard tests alone cannot establish those outcomes.

The [streaming learning module](examples/ai-backend/STREAMING.md) demonstrates bounded native
Ollama NDJSON over actual HTTP, strict UTF-8 framing, cancellation/deadlines, explicit incomplete
results and nullable provider usage/timing. `verify_streaming.py` exercises the normal teaching-JAR
dispatch with an owned fixture; it runs in Verify after packaging. Scenario cost arithmetic requires
explicit dated assumptions and includes failed attempts; missing usage is not zero. Transport
completion and business acceptance remain distinct. This adds no platform routes or analytics.

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

The [controlled prompt comparison](examples/ai-backend/QUALITY_COMPARISON.md) freezes the
experimental ticket prompt before an independently authored synthetic holdout. The original
application prompt remains the default; comparisons preserve schema/field/failure distinctions,
prompt/dataset/model hashes and a no-model reference. A narrow field gate is not production
acceptance or human answer-support review. The [OOP source review](docs/JAVA_OOP_SOURCE_REVIEW_2026-10-21.md)
records all eleven original PDF pages and Java 17 counterexamples without reproducing source notes.
The operations lab now requires three resource Pods in addition to its five recovery cases;
only actual cgroup/termination/CPU-counter observations and verified cleanup can close them.


The [AI-assisted engineering exercise](examples/engineering-workflow/AI_ASSISTED_REVIEW.md)
compares reviewed fixture patches using actual Java 17 compilation, independent routing/locale
tests, Git diff checks and offline Maven resolution. It accepts no external patch/source input;
a temporary folder is not a sandbox. The Java primitive lesson now includes the S03 source-review
teaching corrections while preserving existing diagrams, questions and learner identities.

The [Kafka rebalance exercise](examples/backend-messaging/README.md#9-watch-a-partition-move-between-concurrent-consumers)
runs two consumer owner threads in one real broker group. It observes assignment/revocation, commits
a local effect while withholding its broker offset, closes that member and verifies exact replay,
durable deduplication and fresh work after recovery. Dedicated broker CI must execute the case;
native compilation and skipped broker tests do not establish it. This is controlled member departure,
separate from the existing process-crash saga exercises.

The [SSRF exercise](examples/backend-ssrf/README.md) teaches registered-partner outbound requests:
strict operation/origin policy, all-address validation, numeric-peer connection with original-host
TLS verification, redirect refusal and bounded resolver/response work. Actual owned loopback HTTP
and TLS checks distinguish policy rejection from network failure and verify cancellation cleanup.
It is an isolated Python transport lab; a Java/Spring adapter and production egress policy remain
separate work. Run `python3 examples/backend-ssrf/verify.py`; no URL argument or download is needed.

On the Java category page, **Revisit Java-by-Shrayansh** opens two reviewed entries in familiar
course order: OOP, then JDK/runtime/JVM. Each offers direct section links, a clarification, Practice
and the credited original notes. They use the existing lessons and share bookmarks, completion,
reading position and saved answers. The disclosure starts closed; the main study order stays
available below it. Remaining course notes and the actual two-lesson learner pilot are still open.

The [six-page reference-notes review](docs/JAVA_REFERENCES_SOURCE_REVIEW_2026-10-21.md) corrects
the source's wrapper/pass-by-reference explanation. The memory lesson now traces boxing,
immutable Integer alias reassignment and null unboxing in Java 17, retaining existing examples,
diagrams, question identities and saved answers.

The [configuration and debugger exercise](examples/backend-debugging/README.md) runs the unchanged
Task Tracker to show which Spring property source wins, which profile-selected beans are active,
and what HTTP endpoints are actually exposed. It reproduces an invalid-port startup and its repair,
then uses real JDI breakpoints, stepping and a caught exception on owned Java processes. Run
`python3 examples/backend-debugging/verify.py` with the documented cached dependencies and JDK.
This provides executable debugging evidence; a real learner's IDE session remains separate.

The [cache stampede exercise](examples/backend-data-services/README.md#6-measure-and-limit-a-cold-key-stampede)
measures overlapping misses against actual Redis and compares ordinary reads with bounded request
coalescing. Follow shared failures, timeout/capacity recovery and tenant/version checks before
explaining the measured6→1 full origin reads. All six metadata reads remain. Native Redis evidence
is distinct from combined MongoDB CI; the coordinator does not implement a distributed lock.

Data-services CI retains bounded, credential-redacted diagnostics if an owned service exits before
readiness; setup failures still block release and do not count toward the required service cases.

MongoDB CI also checks the actual Docker daemon kernel against the vendor's documented compatibility
range on a supported LTS runner. A pinned container image does not pin its host kernel; startup
compatibility and passing the real service tests are separate requirements.
The [gateway exercise](examples/backend-gateway/README.md) connects actual Nginx to the unchanged
Task Tracker. Predict forwarded-header trust, service authorization/CSRF,429 versus503/504,
body limits and reload behavior, then inspect the source-bound HTTP receipt. Run its sixteen
native guards first; actual execution requires the documented local Docker prerequisites and
all20 assertions with cleanup. Plain loopback HTTP, per-instance limiting and controlled fixtures
are teaching boundaries rather than a production deployment claim.

The gateway diagnostic reuses one bounded server JVM for its fixed unauthenticated service read.
CI requires the observed single-JVM/32-PID setup; native-thread creation failure is diagnosed
separately from heap exhaustion, and all20 actual HTTP assertions remain mandatory.

The [session and WebSocket exercise](examples/backend-websocket/README.md) adds a real form-login
journey around unchanged Task Tracker source. Follow CSRF, fixation protection, exact Origin,
cookie-only identity, bounded JSON echo, logout/expiry and admission recovery. It reproduces an
upgrade paused across identity rotation, then verifies rejection and a fresh authenticated socket.
Run `python3 examples/backend-websocket/verify.py --prepare` with its documented prerequisites;
the required result is22 actual transport cases and9 policy tests, not a simulated handshake.

The WebSocket preparation command executes policy tests before its offline transport run; skipping
those tests can leave the JUnit provider missing on a fresh runner. Failed phases expose only
sanitized phase/test-source diagnostics. See the guide for the cold-provider reproduction and
scoped cancellation/cleanup guards; normal success still requires every actual transport case.

Use [AI stage tracing](examples/ai-backend/OBSERVABILITY.md) to follow a real RAG request across
retrieval, context, model HTTP and answer validation. Predict which stages run for an abstention,
429, deadline or revoked source, then inspect actual causal spans and failure-inclusive counters.
Telemetry is off by default; the fixed local fixture needs no live model or collector. Run the
documented build, Python guards and packaged verifier; unknown usage is not zero or billing proof.
The gateway exercise distinguishes a received response from an idle-body connection close. Its
timeout acceptance also requires the actual matching Nginx408 log, so a disconnect never becomes
a fabricated client status. Twenty-one native guards precede the mandatory20 actual HTTP cases.

Practice [PostgreSQL concurrency and access paths](examples/backend-persistence/README.md#6-read-committed-repeatable-read-and-serializable-observe-the-history) after the DBMS lessons. Predict actual snapshots, reproduce write skew and deadlock, retry the whole known-aborted transaction, compare optimistic/pessimistic decisions, and inspect equivalent query results and index work. Finish with mutable-order pagination counterexamples and a real isolated restore. The expanded local runner passes12 actual tests without skips; Docker CI is separate evidence.

The [Java methods/construction review](docs/JAVA_METHODS_SOURCE_REVIEW_2026-10-23.md) connects familiar course entries 7/8 to the existing OOP lesson. Read a method declaration, predict field values through a constructor chain, and debug a missing no-argument constructor using the complete Java 17 example. Original notes are credited; the course-order revision pilot still has its two reviewed navigation entries.

Curriculum validation checks the reader's parsed headings: the required Expert misconception section must actually render. A heading mentioned in prose, a fenced example or an earlier tier cannot satisfy that contract. The DBMS transaction lesson's leaked patch prefixes are repaired with its code and interview questions preserved.

The [Spring/JDI exercise](examples/backend-debugging/README.md) also verifies cancellation at
scope entry and during ordinary child teardown. Its eleven native checks retain actual Spring
launches and JDI events; signal guards alone are not a debugger or learner session.

### Replication and scheduling recovery — October 23 continuation

After the transaction/concurrency exercises, run the [PostgreSQL replication lab](examples/backend-replication/README.md).
Predict an acknowledged primary write that a paused replica cannot read, recover with a bounded
replay fence, inspect a deliberately stale promotion after local writer fencing, and rebuild the
former primary from the selected new history. Two private PostgreSQL 16 clusters and a fresh
replayed write provide actual evidence; this does not establish multi-host HA or an RTO SLA.
The runner never attaches to or stops the shared local database. Follow the guide's prerequisites
and predict/observe/diagnose/repair/change/interview tasks.

The [Pending Pod exercise](examples/backend-operations/README.md#7-diagnose-pending-before-changing-a-probe)
adds an unsatisfied owned node selector to the existing Kubernetes recovery path. Diagnose from
PodScheduled and the exact scheduler event, confirm DNS succeeds while the Service has no ready
endpoints, remove the selector and verify the replacement Pod and an authenticated request.
The dedicated cluster gate now requires all nine cases, including the original eight; 16 native
contracts do not substitute for actual kind execution.

The teaching command helpers also retain their existing opt-in cancellation policy through
scope entry and complete normal cleanup. Local checks cover debugging (11), engineering (20),
gateway (21), SSRF (20 with 26 actual HTTP requests), replication guards (19) and operations
contracts (17); five debugging process guards and its six actual Spring/JDI tests are distinct. Read the [process audit](docs/PROCESS_LIFECYCLE_AUDIT_2026-10-23.md) for the exact
reproductions and remaining unassessed boundaries. Combined final-head service/cluster CI and
release are still required; these counts are separate evidence scopes, not one platform test total.

The first actual nine-case cluster attempt exposed a drained EndpointSlice with null endpoints.
The reader now accepts null/missing/empty arrays as no backends while rejecting malformed values
and retaining Service/namespace ownership checks. The 17 local contracts pass; the complete actual
cluster rerun remains required before release.

PR91 is now merged after all 19 final-head checks passed, including the complete nine-case kind
rerun and actual PostgreSQL replication. The [release receipt](docs/evidence/PR91_RELEASE_2026-10-23.json)
supersedes the continuation's CI-pending statements above for that release only. The DBMS
replication section and Kubernetes scheduling practice now link directly to the exercises with
prediction, diagnosis, repair and interview tasks. Broader practical and human-learning gates
remain in the capability ledger.

The completed [memory/GC source review](docs/JAVA_MEMORY_SOURCE_REVIEW_2026-10-24.md) adds an
original runnable weak-reference wrapper exercise and version corrections to the JVM lesson.
Six course sources are reviewed;25 remain. Clearing a wrapper's link is taught separately from
actual garbage collection, and the two-entry course-order pilot remains unchanged.

New feature work is paused at the user's request. The unfinished semantic evaluator is saved on
`feat/2026-10-23-learned-semantic` with its verification limits; it is not part of the delivered app.
