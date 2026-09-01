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

1. Add cross-topic search using titles, summaries, headings, and coverage tags. — ✅ backend done
   (`DiscoveryController`/`DiscoveryService`), frontend `/search` route not started.
2. Add category Interview Mode sourced from validated Q&A sections. — ✅ backend endpoint done,
   frontend `/interview/:category` route not started; topic-level `InterviewDeck` already reads
   validated Markdown via the section-aware parser.
3. Complete simulator triage only after migrating JSON questions. — ✅ migration gate passes
   (109/109 ledger items resolved); the 17 engine conversions/deletions themselves have not started.
4. Run frontend unit/integration tests, backend tests, production build, full content validation,
   accessibility checks, route checks, and documentation synchronization. — ongoing; backend and
   content-validator suites are green, frontend suite green as of the last full run.

### P3 audit checkpoint — simulation triage

- Current inventory: 47 visualizer components, 31 simulation engines and 26 JSON datasets.
- Keep 14 stateful engines where interaction materially teaches a mechanism: B+ tree, DBMS
  concurrency, connection pools, consistent hashing, disk scheduling, file-system allocation,
  functional dependencies, HashMap internals, JVM/GC, normalization, relational algebra, TCP
  congestion, virtual memory and virtual threads.
- Convert the remaining 17 fixed step-through engines to lesson Mermaid diagrams/tables before
  removing their JSX, tests or data dependencies. **Not started** — the migration gate below is a
  prerequisite for this step, not the step itself.
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
  dedicated `/search` and `/interview/:category` routes. **Endpoints done** (with controller and
  service test coverage); the dedicated frontend routes/pages are **not started**.
- Replace the loose frontend Q&A regex with a section-aware Markdown parser. The current parser
  lets the final answer absorb `### Further Reading` and renders answer Markdown as plain text.
  **Done** — `frontend/src/utils/interviewQuestions.js` mirrors `DiscoveryService`'s Java parser
  and `TopicViewer.jsx`'s `InterviewDeck` renders answers through `MarkdownRenderer`.
- Reuse one extracted InterviewDeck for topic and category practice, with dataset reset, difficulty
  filtering, source links, accessible reveal state and responsive controls. **Partially done** —
  `InterviewDeck` has accessible reveal state (`aria-expanded`/`aria-controls`) and resets on topic
  change, but it is still defined inline in `TopicViewer.jsx`, not yet extracted into a shared
  component a category Interview Mode page could reuse.

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
