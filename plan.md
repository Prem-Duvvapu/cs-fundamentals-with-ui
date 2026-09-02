# CS Fundamentals — SDE-2 Coverage and Delivery Plan

## Objective

Deliver a content-first, interview-oriented curriculum that covers the complete user-supplied
SDE-2 checklist across Operating Systems, Computer Networks, DBMS/SQL, Core Java, Advanced Java,
Spring/Spring Boot, and AI/ML. Coverage is considered complete only when it is traceable to a
lesson, taught from beginner through expert depth, exercised by interview questions, and verified
by automated checks.

## Non-negotiable acceptance rules

- Every checklist concept below maps to one named lesson and section.
- Every curriculum lesson follows `content/CONTENT_SPEC.md`: 400–600 lines, exact three tiers,
  at least three Mermaid diagrams, a numerical worked example, a comparison table, misconceptions,
  and 12–15 interview Q&As including scenarios.
- Existing simulator JSON questions are migrated before any simulator or JSON is removed.
- Authoritative primary references are included where they materially deepen the lesson.
- New lessons are registered across backend, frontend, fallback data, tests, and documentation
  before their content is considered reachable.
- A coverage manifest and validator prevent a checklist item from being silently omitted.
- Implementation priority is Core Java → Advanced Java → Spring Boot → OS → Networks → DBMS → AI/ML.

## Curriculum shape

The original 56-topic curriculum remains the foundation. Seven focused additions are now
registered, bringing the reachable curriculum to 63 lessons without overloading unrelated files:

1. **Practical SQL and window functions**
2. **Spring Boot configuration and production internals**
3. **Spring REST API design, validation, and error handling**
4. **Spring Security, caching, async, and testing**
5. **AI/ML fundamentals, algorithms, evaluation, and neural networks**

The backend, frontend fallback catalogue, route-integrity tests, content inventory and coverage
manifest now use the 63-topic total. Remaining checklist gaps are closed by revising the mapped
existing lesson and rerunning the manifest validator.

## Coverage matrix

### 1. Operating Systems

| Checklist area | Target lesson | Required coverage |
|---|---|---|
| 1.1 OS Fundamentals | `os/process-management` | OS purpose; kernel vs OS; user/kernel mode; syscalls; interrupts/traps; OS types; monolithic vs microkernel; boot basics |
| 1.2 Processes | `os/process-management` | Program/process; states; PCB; create/terminate; parent/child; context switch; CPU/I/O-bound; zombie/orphan |
| 1.3 Threads | `os/process-management` | Process/thread; user/kernel threads; benefits/costs; switching; concurrency/parallelism; multicore |
| 1.4 CPU Scheduling | `os/cpu-scheduling` | FCFS; SJF/SRTF; priority; RR; preemption; starvation/aging; turnaround/wait/response calculations |
| 1.5 Synchronization | `os/synchronization` | Races; critical sections; exclusion; mutex/semaphore; binary/counting; locks/spinlocks; monitors/conditions; producer-consumer; readers-writers; dining philosophers |
| 1.6 Deadlocks | `os/deadlocks` | Definition; Coffman conditions; prevention/avoidance/detection/recovery; Banker; starvation/livelock comparison |
| 1.7 Memory Management | `os/memory-management` | Logical/physical; translation; contiguous allocation; paging/tables/multilevel/TLB; segmentation; fragmentation |
| 1.8 Virtual Memory | `os/memory-management` | Demand paging; faults; FIFO/LRU/Optimal; thrashing; working set |
| 1.9 File Systems | `os/file-systems`, `os/disk-scheduling` | Files/directories; descriptors; inodes; allocation; permissions; scheduling; buffering/caching |

### 2. Computer Networks

| Checklist area | Target lesson | Required coverage |
|---|---|---|
| 2.1 Fundamentals | `networking/network-fundamentals` | Network; LAN/WAN; Internet/Web; client-server; topology; bandwidth/latency/throughput/jitter/loss |
| 2.2 OSI | `networking/osi-model` | All seven layers; responsibilities/protocols; TCP/IP mapping; encapsulation/decapsulation |
| 2.3 Application protocols | `networking/application-layer` | HTTP/S; DNS; DHCP; FTP/SFTP; SMTP; IMAP/POP3; SSH; WebSocket; gRPC |
| 2.4 HTTP | `networking/application-layer` | Messages; methods; safety/idempotency; status; headers; cookies/sessions; media/auth; keep-alive; HTTP 1.1/2/3; compression/caching |
| 2.5 HTTPS/TLS | `networking/network-security`, `networking/application-layer` | HTTP/HTTPS; TLS handshake; certificates/CAs; keys; symmetric/asymmetric; SSL/TLS; browser-to-HTTPS flow |
| 2.6 TCP | `networking/tcp-ip`, `networking/tcp-congestion` | Characteristics; handshake/teardown; seq/ACK; sliding window; flow/congestion; retransmission/reliability; TCP/UDP |
| 2.7 UDP | `networking/transport-layer-protocols` | Datagram semantics; TCP comparison; selection criteria; DNS/streaming/gaming |
| 2.8 IP | `networking/ip-subnetting` | IPv4/IPv6; public/private; static/dynamic; masks/CIDR/subnetting; gateway; NAT |
| 2.9 DNS | `networking/application-layer` | Resolution; hierarchy; recursive/iterative; cache; A/AAAA/CNAME/MX/TXT/NS; browser URL flow |
| 2.10 Backend networking | `networking/network-performance-qos`, `networking/application-layer` | Proxies; L4/L7 LB; gateway; CDN; pools/keep-alive; WebSocket/SSE/polling; limits; sticky sessions |

### 3. DBMS and SQL

| Checklist area | Target lesson | Required coverage |
|---|---|---|
| 3.1 Fundamentals | `dbms/dbms-introduction`, `dbms/functional-dependencies-keys` | DBMS/RDBMS; SQL/NoSQL; relational structure; all key types; constraints |
| 3.2 ER Modeling | `dbms/er-model` | Entities; attributes; relationships; 1:1, 1:N, M:N; relational mapping |
| 3.3 Normalization | `dbms/database-normalization` | FDs; 1NF/2NF/3NF/BCNF; denormalization decisions |
| 3.4 Practical SQL | **new `dbms/sql-querying`** | SELECT/filter/order/page/distinct/CASE; subqueries/correlated; CTE/recursive basics; all joins; aggregates; window functions including ROW_NUMBER/RANK/DENSE_RANK/PARTITION/LEAD/LAG |
| 3.5 Indexes | `dbms/dbms-indexing`, `dbms/query-optimization` | B/B+ and hash; trade-offs; clustered/nonclustered; composite/covering/unique; selectivity; leftmost prefix; write cost; missed indexes; EXPLAIN |
| 3.6 Transactions | `dbms/transactions-acid` | ACID; commit/rollback; four isolation levels; dirty/nonrepeatable/phantom/lost-update phenomena |
| 3.7 Concurrency | `dbms/concurrency-control` | Shared/exclusive; row/table; optimistic/pessimistic; MVCC; deadlocks and recovery |
| 3.8 Scaling | `dbms/distributed-databases-cap`, `dbms/storage-raid-indexing` | Vertical/horizontal; primary/replica; reads; sharding; partitioning; consistent hashing; pools/cache |
| 3.9 NoSQL | `dbms/distributed-databases-cap`, `dbms/dbms-introduction` | KV/document/column/graph; Mongo/Redis; CAP; BASE; eventual/strong consistency |

### 4. Core Java

| Checklist area | Target lesson | Required coverage |
|---|---|---|
| 4.1 Fundamentals | `java-spring/java-execution-pipeline`, `java-spring/java-memory-model` | JVM/JRE/JDK; compilation/bytecode/platform independence; primitives/references/variables; IEEE-754; operators/control flow; one-public-class rule |
| 4.2 OOP | `java-spring/java-oop-pillars` | Classes/objects; four pillars; composition/aggregation/association; IS-A/HAS-A; overload/override/dispatch |
| 4.3 Classes | `java-spring/java-static-final-records`, `java-spring/java-oop-pillars` | Constructors/chaining; this/super/static/final; abstract/interface/default/static interface methods; nested/inner classes |
| 4.4 Object | `java-spring/java-oop-pillars`, `java-spring/java-hashmap-internals` | equals/hashCode/toString/getClass/clone basics; equality/hash contract |
| 4.5 Strings | `java-spring/java-memory-model`, `java-spring/java-static-final-records` | Immutability/pool/intern; identity/equality; builder/buffer and thread-safety trade-off |
| 4.6 Exceptions | `java-spring/java-reflection-exceptions` | Checked/unchecked/error; try/catch/finally; throw/throws; custom; resources; hierarchy |
| 4.7 Collections | `java-spring/java-collections-framework` | List implementations; Set implementations; Map implementations; legacy Vector/Hashtable; Queue/Deque/PriorityQueue; complexity/use cases |
| 4.8 HashMap | `java-spring/java-hashmap-internals` | Hash/bucket/collision/equality; resize/load/capacity/treeification; mutable keys; concurrent comparison |
| 4.9 Generics | `java-spring/java-generics` | Classes/methods; type safety; wildcards; extends/super; PECS; erasure |

### 5. Advanced Java

| Checklist area | Target lesson | Required coverage |
|---|---|---|
| 5.1 JVM internals | `java-spring/java-execution-pipeline`, `java-spring/jvm-gc` | All runtime areas; loader hierarchy; linking/init; allocation; escape analysis |
| 5.2 GC | `java-spring/jvm-gc` | Reachability/roots; generations; minor/major/full; STW; mark/sweep/compact; G1/ZGC; leaks; OOME/SOE |
| 5.3 Threads/executors | `java-spring/java-multithreading-concurrency` | Lifecycle; Thread/Runnable/Callable/Future; ExecutorService/ThreadPoolExecutor; ForkJoin; CompletableFuture |
| 5.4 Synchronization | `java-spring/java-multithreading-concurrency` | synchronized; object/class locks; volatile/atomic/CAS; Reentrant/ReadWrite locks; semaphore/latch/barrier; races/deadlock/starvation/livelock |
| 5.5 JMM | `java-spring/java-memory-model`, `java-spring/java-multithreading-concurrency` | Visibility/atomicity/ordering; happens-before; volatile and monitor semantics |
| 5.6 Concurrent collections | `java-spring/java-collections-framework`, `java-spring/java-hashmap-internals` | CHM; CopyOnWriteArrayList; BlockingQueue; ConcurrentLinkedQueue |
| 5.7 Java 8+ | `java-spring/java-functional-lambdas`, `java-spring/java-streams-optional` | Functional types; all named stream operations; lazy/terminal/parallel behavior |
| 5.8 Modern Java | `java-spring/java-static-final-records`, `java-spring/java-streams-optional` | var; records; sealed types; pattern matching; switch expressions; text blocks; Optional; Date/Time; Java 21 sequenced collections; Lombok boundaries |

### 6. Spring and Spring Boot

| Checklist area | Target lesson | Required coverage |
|---|---|---|
| 6.1–6.3 Spring, DI, annotations | `java-spring/spring-bean-lifecycle` | Spring purpose; IoC/DI/container; BeanFactory/ApplicationContext; scopes/lifecycle; injection choices; circular refs; all named annotations |
| 6.4 Boot internals | **new `java-spring/spring-boot-internals`** | Spring/Boot; auto-config/starters; main annotations; scanning; embedded server; startup; properties/YAML/profiles |
| 6.5–6.6 REST and errors | **new `java-spring/spring-rest-api-design`** | MVC annotations; REST/resource modeling; idempotency; page/sort/filter/version; DTO/validation; ResponseEntity; controller advice/error contracts |
| 6.7–6.8 Data JPA/Hibernate | `java-spring/jpa-hibernate-lifecycle` | ORM/JPA/Hibernate; mappings/repositories/queries/relationships; cascades/ownership; fetch/performance; caches; dirty checking; states/flush/save/persist/merge |
| 6.9 Transactions | `java-spring/jpa-hibernate-lifecycle`, `java-spring/spring-bean-lifecycle` | `@Transactional`; propagation modes; isolation; rollback/read-only/boundaries; self-invocation proxy trap |
| 6.10 AOP | `java-spring/spring-bean-lifecycle` | Aspect/advice/pointcut/join point; JDK/CGLIB proxies; common proxy failures |
| 6.11 Security | **new `java-spring/spring-security`** | Authn/authz; filter chain; JWT/session/OAuth2; hashing/BCrypt; CORS/CSRF; roles/authorities |
| 6.12–6.13 Cache/async/scheduling | **new `java-spring/spring-caching-async`** | Cache annotations; Redis/cache-aside/invalidation/TTL/stampede; async/executors/futures/errors; scheduled work |
| 6.14 Batch | `java-spring/spring-batch-lifecycle` | Full named Batch lifecycle, metadata, chunk, restart, retry/skip, partitioning |
| 6.15 Quartz | `java-spring/quartz-scheduler` | Scheduler/job/trigger/cron/detail/store/cluster; Quartz vs scheduled annotation |
| 6.16–6.17 Testing/production | **new `java-spring/spring-testing-production`** | JUnit/Mockito/mock/spy annotations; slices/integration/MockMvc/Testcontainers; Actuator/health/metrics/logging/correlation/shutdown/Hikari/config/secrets/Docker/container JVM |

### 7. AI/ML for Backend Engineers

| Checklist area | Target lesson | Required coverage |
|---|---|---|
| 7.1–7.5 ML foundations | **new `aiml/ml-fundamentals`** | AI/ML/DL; learning types/tasks; dataset/features/labels; bias/variance/regularization; named classical algorithms; accuracy/precision/recall/F1/confusion/ROC-AUC/MAE/MSE/RMSE; neural-network and CNN/RNN/LSTM/Transformer concepts |
| 7.6 LLMs | `aiml/llm-parameters`, `aiml/embeddings-vector-db`, `aiml/model-serving` | LLM/tokens/context/embedding/Transformer/attention; prompting/sampling/hallucination; structured output/tools |
| 7.7 RAG | `aiml/rag-architecture`, `aiml/embeddings-vector-db` | Complete ingestion/retrieval/generation pipeline; semantic search; chunks; reranking; context; fine-tuning comparison |
| 7.8 Backend + LLM | `aiml/model-serving`, `aiml/llm-parameters`, `aiml/feature-stores` | APIs/streaming/token cost/rate/retry/timeout/JSON/prompts/history/cache/vector DB/guardrails/injection/observability/evaluation |

## Implementation phases

### Phase A — Coverage infrastructure and registration — ✅ Complete

1. Create `content/COVERAGE_MANIFEST.json` with one stable ID per checklist row/subtopic.
2. Extend the validator to confirm every manifest ID maps to an existing heading in a registered lesson.
3. Register the seven new lessons across backend/frontend routes, fallback metadata, tests, README,
   CONTEXT, and AGENTS.
4. Add route-integrity and manifest-integrity tests before authoring the new files.

### Phase B — Core and Advanced Java — ✅ Complete

1. Rebuild the four remaining thin Core Java lessons: execution, memory model, static/final/records,
   and functional interfaces/lambdas.
2. Refine already-valid OOP, collections, HashMap, generics, streams, exceptions, concurrency, and
   JVM lessons to close the explicit checklist gaps without exceeding the content contract.
3. Validate Java coverage IDs and interview questions as a category gate.

### Phase C — Spring Boot — ✅ Complete

1. Add the five focused Spring lessons named in the matrix.
2. Refine Bean, MVC, JPA, Batch, and Quartz lessons for cross-links and nonduplicated boundaries.
3. Add practical code examples and Spring test coverage for API/error/security/transaction scenarios.

### Phase D — OS and Networking — ✅ Complete

1. Audit the already-rebuilt OS lessons against every named checklist item and close any gaps.
2. Complete the remaining Networking lesson and backend-networking sections.
3. Validate category manifests and cross-link browser→DNS→TCP→TLS→HTTP flows.

### Phase E — DBMS and SQL — ✅ Complete

1. Rebuild the eleven non-exemplar DBMS files.
2. Add the practical SQL lesson with executable query examples and expected results.
3. Ensure indexes, transactions, isolation, MVCC, scaling, and NoSQL have scenario questions.

### Phase F — AI/ML — ✅ Complete

1. Add the ML fundamentals lesson.
2. Complete model serving, LLM parameters, feature stores, and recommendations.
3. Connect ML evaluation to LLM/RAG production evaluation and backend operational concerns.

### Phase G — Product discovery and release

1. Add cross-topic search using titles, summaries, headings, and coverage tags. — ✅ done —
   `DiscoveryController`/`DiscoveryService` plus `SearchPage.jsx` at `/search`.
2. Add category Interview Mode sourced from validated Q&A sections. — ✅ done — `InterviewPage.jsx`
   at `/interview/:category`, reusing the same `InterviewDeck` the topic page uses.
3. Complete simulator triage only after migrating JSON questions. — ✅ migration gate passes
   (109/109 ledger items resolved); the 17 engine conversions/deletions are done (see checkpoint
   below) — 18 non-retained visualizer components, engines, and JSON files removed in 4 commits.
4. Run frontend unit/integration tests, backend tests, production build, full content validation,
   accessibility checks, route checks, and documentation synchronization. — **mostly done, one
   gap below.** Verified 2026-09-02: backend 42/42 (`mvn test`), frontend 412/412 across 28 files
   (`npm test --prefix frontend`), production build clean, content validator 63/63, migration
   gate 0 pending. Route checks done as a live smoke test against a real running backend + Vite
   dev server (not just mocked component tests): `GET /api/v1/search` and
   `GET /api/v1/interview/questions` verified against the real 63-topic index (883 total
   questions, matching the count below; ranking, category filter, and offset pagination all
   correct), `/search`, `/interview/all`, `/interview/dbms`, and `/topic/dbms-introduction` all
   return 200 from the dev server. **Gap:** accessibility checks (Lighthouse/axe) need a real
   browser, which this environment does not have — not run.

   **Fixed 2026-09-02:** `GET /api/v1/content/{category}/{topicId}` previously returned HTTP 200
   with the body `Content not found for: <id>` for an unregistered topic id instead of a 404,
   which `TopicViewer.jsx`'s `res.ok` check couldn't detect. `ContentService.exists(category,
   topicId)` now backs a proper `ResponseEntity` in `ContentController` — 404 when the topic
   isn't found, 500 if `loadContent` hits an I/O error, 200 otherwise. Verified against a real
   running backend (`GET /api/v1/content/dbms/not-a-real-topic` → 404,
   `GET /api/v1/content/networking/dbms-introduction` → 404 for a valid id/wrong category,
   `GET /api/v1/content/dbms/dbms-introduction` → 200), plus new backend tests
   (`ContentServiceTest`, `ContentControllerTest`) and a frontend test confirming
   `TopicViewer.jsx` already rendered "Content not available yet." correctly once the backend
   told the truth — no frontend change was needed.

### P3 audit checkpoint — simulation triage

- Current inventory: 47 visualizer components, 31 simulation engines and 26 JSON datasets.
- Keep 14 stateful engines where interaction materially teaches a mechanism: B+ tree, DBMS
  concurrency, connection pools, consistent hashing, disk scheduling, file-system allocation,
  functional dependencies, HashMap internals, JVM/GC, normalization, relational algebra, TCP
  congestion, virtual memory and virtual threads.
- Convert the remaining 17 fixed step-through engines to lesson Mermaid diagrams/tables before
  removing their JSX, tests or data dependencies. **Done.** Every target lesson already carried
  3-7 Mermaid diagrams from P4 content authoring (past CONTENT_SPEC's ≥3 minimum), including
  diagrams of the exact mechanisms these simulators animated, so no new diagrams were needed —
  the conversion was verifying that coverage, then deleting. Removed: DbmsIntroVisualizer,
  DbmsArchitectureVisualizer, ErModelVisualizer, StorageIndexingVisualizer,
  TransactionsAcidVisualizer, QueryOptimizerVisualizer, DistributedDbVisualizer,
  IoSystemsVisualizer, DesignPatternsVisualizer, JavaExecutionPipelineVisualizer,
  JavaMemoryModelVisualizer, JavaOopVisualizer, JavaStaticRecordsVisualizer,
  JavaFunctionalLambdasVisualizer, JavaGenericsVisualizer, JavaCollectionsVisualizer,
  JavaStreamsOptionalVisualizer, SpringBatchVisualizer (18 components — one more than the
  plan's "~17" estimate) plus their engines, tests, and JSON data, and the inline Spring
  Bean/JPA step-throughs that were never engine-backed. distributed-databases-cap kept a
  Simulation tab by retargeting to the retained ConsistentHashingVisualizer (previously wired to
  no topic at all — a pre-existing gap fixed as part of this pass). DbmsVisualizer shrank from
  12 sub-tabs to 5; JavaSpringVisualizer from ~17 to 6.

  **Cleanup done 2026-09-02.** The 3 orphaned JavaSpringVisualizer sub-tabs
  (hashmap/virtual-threads/hikari-pool — reachable only by manual click, since their topics route
  directly to standalone components) were removed; the hub now serves exactly the 3 topics that
  route to it (jvm-gc, spring-mvc-lifecycle, quartz-scheduler).

  The dead App.css rules these 18 components owned were pruned: every class selector was checked
  automatically (a script extracted each `.class` token from the affected region, then searched
  all current `frontend/src/**/*.{jsx,js}` for a literal reference — matching a "shared vocabulary"
  comment in App.css that already documented several of these classes as reused across both
  removed AND retained files), spot-checked by hand against representative kept components
  (ConcurrencyControlVisualizer, FunctionalDependencyVisualizer, NormalizationVisualizer,
  RelationalAlgebraVisualizer, DiskSchedulingVisualizer, FileSystemVisualizer) to confirm no false
  positives, then the confirmed-dead rules removed by leftmost-selector-class matching (so a
  compound selector like `.raid-block-row .parity` was removed as one unit once `raid-block-row`,
  its outer/dead wrapper class, was confirmed dead — not by deleting on the inner class alone,
  which could have wrongly matched a same-named class nested under a still-alive parent). 154 CSS
  declaration lines removed plus 4 more found dead by direct manual check afterward (modifier
  combinations on classes whose *base* name is still alive elsewhere, e.g. `.header-pill` is used
  by several retained visualizers but never with the `.is-idle-fallback` modifier that only
  TransactionsAcidVisualizer used) and 5 now-empty component-name comment headers. Verified with a
  production build (CSS still parses) and the full frontend suite.

  A separate, unrelated dead CSS block was found along the way — `.state-pill`/`.state-pill--*`
  (BEM-modifier style, ~App.css line 2278), zero JSX references anywhere, predating the P3
  removals. Its neighbors in the same "Shared visualizer primitives" comment block
  (`.panel`/`.panel--*`, `.metric-tile`/`.metric-tile__*`, `.legend-row`, `.field-grid`) are all
  alive and back their matching `components/shared/*.jsx` component 1:1 by name — `.state-pill`
  was clearly scaffolded the same way for `StatePill.jsx`, but that component actually renders
  `u-pill`/`u-pill-<tone>` classes, leaving `.state-pill`/`.state-pill--*` fully orphaned. Removed
  2026-09-02, verified with a production build and the full frontend suite (both green).
- Migration gate: verify all 49 JSON interview questions, 56 JSON quizzes and 4 inline quizzes
  (109 items total) are represented or intentionally superseded in Markdown before deletion.
  **Done.** `content/SIMULATION_QUESTION_MIGRATION.json` resolves all 109 items — 42 `retained`
  (owned by one of the 14 kept engines, so no lesson migration needed), 66 `migrated` (a literal
  quote from the already-authored P4 lesson content is recorded as evidence), and 1 `superseded`
  (the lost-update quiz question originally mapped to `dbms-introduction`, which does not cover
  concurrency anomalies, was retargeted to `concurrency-control`, which does).
  `node scripts/audit-simulation-questions.mjs` passes with 0 pending.
- Replace category hubs with a topic-to-lazy-visualizer registry and hide Simulation for topics
  without an exact visualizer. **Done** — `topicVisualizerRegistry.jsx` maps each topic id to its
  own lazy visualizer (or omits it), and `TopicPage.jsx` hides the Simulation tab entirely when a
  topic has no registry entry, fixing the SQL/HashMap/concurrency/production-testing/ML-fundamentals
  wrong-fallback cases called out above.

### P5 audit checkpoint — search and Interview Mode

- Build one immutable backend discovery index from `TopicService` plus validated Markdown; do not
  add another 63-topic registry or load the entire curriculum into the browser. **Done** —
  `DiscoveryService` builds its index once at construction from `TopicService` + `ContentService`.
- Add stateless `GET /api/v1/search` and `GET /api/v1/interview/questions` endpoints, followed by
  dedicated `/search` and `/interview/:category` routes. **Done** — `SearchPage.jsx` (`/search`)
  and `InterviewPage.jsx` (`/interview/:category`, `:category` may be `all`), both linked from
  `Navbar.jsx`, with controller/service/component test coverage throughout.
- Replace the loose frontend Q&A regex with a section-aware Markdown parser. The current parser
  lets the final answer absorb `### Further Reading` and renders answer Markdown as plain text.
  **Done** — `frontend/src/utils/interviewQuestions.js` mirrors `DiscoveryService`'s Java parser
  and `TopicViewer.jsx`'s `InterviewDeck` renders answers through `MarkdownRenderer`.
- Reuse one extracted InterviewDeck for topic and category practice, with dataset reset, difficulty
  filtering, source links, accessible reveal state and responsive controls. **Done** —
  `components/shared/InterviewDeck.jsx` takes a flat `questions` array plus an optional
  `renderMeta(question)` slot; `TopicViewer.jsx` uses it with no `renderMeta` (one topic per deck),
  `InterviewPage.jsx` passes a `renderMeta` linking each question back to its source topic.
  `InterviewPage.jsx` adds server-side category + difficulty filters (refetch from offset 0 on
  change), offset/limit "Load more" pagination against the endpoint's total count, and a
  client-side shuffle over whatever's currently loaded — "dataset reset" per this checkpoint's
  wording, rather than a second dataset entirely. Accessible reveal state and responsive controls
  carried over unchanged from the pre-existing topic-page deck.

## Question targets

- Existing full-contract lesson: 14 validated interview questions.
- Seven added lessons: 14 each, adding 98 validated questions.
- Final result: 883 validated questions across all 63 lessons (minimum target was 756).
- Every category must include easy, medium, hard, debugging, design, trade-off, and production scenarios.

## Definition of done

- Every checklist item in this plan is marked by a passing coverage-manifest entry.
- Every registered lesson resolves through the API and UI.
- Every lesson passes the content contract.
- No raw HTML or legacy ASCII diagram remains in curriculum Markdown.
- All retained JSON questions have been migrated or intentionally retained with ownership documented.
- Frontend tests, backend tests, content validator, coverage validator, and production build pass.
- UI remains responsive, keyboard-operable, high contrast, and reduced-motion aware.
- README, CONTEXT, AGENTS, roadmap counts, and source references match the shipped product.
