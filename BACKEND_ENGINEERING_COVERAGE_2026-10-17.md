# Backend engineering coverage and completion checklist

Prepared: 2026-10-17. Baseline: merged `main` at `98c0e9e` (PR #55).
Scope: **all 77 items in the learner's backend-engineering checklist**, in their original order.
Status: **requirements mapped; learning-depth implementation remains in progress**.

This extends the [practical backend/AI plan][plan]. It does not replace the 68-topic
curriculum, the [existing content manifest][manifest], AI-01–AI-17, D-01–D-10 or CLOSE-01–CLOSE-06.
The [implementation ledger][results] owns release evidence. A mapped requirement is not a completed lesson.

## 1. What counts as covered

Evidence can live in this repository **or in an existing sibling lesson**. Link to the exact
lesson/exercise rather than reproducing it here. Existing explanations, examples and interview
practice count toward completion; add only the missing parts. Every requirement needs these
five forms of evidence across the linked path before the complete learning outcome can be closed:

1. **Understand:** an explicit prerequisite, plain explanation, worked example and trace.
2. **Build:** a runnable exercise with setup, expected observations and cleanup.
3. **Debug:** a reproducible failure, evidence that distinguishes causes, a fix and a regression check.
4. **Explain:** a concise interview answer, mechanism, example, trade-off and follow-up rubric.
5. **Verify:** reviewed primary sources/version assumptions and an actual test/run record linked to a release.

An interview answer may link to an existing question rather than duplicating it. Excerpts must be
labelled; a deterministic fake does not establish real broker, Redis, database or cloud behavior.
Keep beginner explanations separate from optional implementation internals. Do not require paid
services to read or run the core path. No automatic grading or additional learner telemetry is required.

### Baseline labels

- **Foundation:** a substantive owning lesson exists. The full five-part completion bar is still open.
- **Partial:** useful sections exist, but the requested treatment is scattered or too brief.
- **Gap:** no coherent walkthrough was found in the inspected curriculum; explicit teaching must be added.
- **Linked:** a sibling app owns the deeper curriculum; its applicable path and exercises still need verification.

These labels describe this scoped inventory, not a new sentence-by-sentence accuracy review. Existing
scoped reviews remain valid evidence for their stated claims. None of the 77 requirements is declared
fully complete by this mapping alone. Search matches, CI coverage anchors and diagram counts cannot
establish comprehension or practical competence.

## 2. Requirement-by-requirement mapping

The owner links point to existing files or specific sibling-app lessons. A baseline label may
describe the local lesson while linked material supplies additional coverage. The last column
is the completion target: reuse existing linked evidence first; implement only the remaining gap.
BE references retain the package IDs in [the practical plan][plan].

### Programming and design

| ID | Exact requested item | Current owner and baseline | Required practical/debug/interview evidence |
|---|---|---|---|
| BEC-01 | Programming Language Fundamentals | [Execution][execution], [values/references][memory], [generics][generics], [exceptions][exceptions] — Foundation | Compile a small Java program; trace values, scope, control flow, methods, equality and exceptions; diagnose a compile/runtime error. BE-01/09. |
| BEC-02 | Object-Oriented Programming (OOP) | [OOP][oop] — Foundation | Run the account example; trace dispatch and composition; repair an invariant-breaking setter and explain the design. BE-09. |
| BEC-03 | SOLID Principles | [SOLID and patterns][patterns], [LLD logging/SOLID][lldlogging] — Foundation | Reuse the linked design example; refactor one Task Tracker feature for a concrete change; identify a substitution violation and the cost of extra abstractions. BE-09. |
| BEC-04 | Clean Code | [SOLID and patterns][patterns], [Task Tracker][tracker] — Gap | A before/after refactor with meaningful names, small cohesive boundaries, explicit errors, tests and a readable diff; avoid equating clean code with maximum indirection. BE-09. |
| BEC-05 | Data Structures & Algorithms | [Collections][collections], [HashMap][hashmap], [DSA Two Sum][dsatwosum], [BFS][dsabfs], [DSA catalog][dsa] — Linked | Reuse and verify the Java practice path covering arrays/strings, lists, stacks/queues, hashing, trees/heaps, graphs, sorting/search, recursion, greedy and DP; explain time/space and edge cases. Local bridge: choose a structure for a backend feature. BE-09. |
| BEC-06 | Design Patterns | [SOLID and patterns][patterns], [LLD logging][lldlogging], [pub/sub][lldpubsub], [workflow][lldworkflow] — Linked | Reuse the existing pattern designs, implementation and trade-offs; fill only missing explanations/tests and explain when a direct implementation wins. BE-09. |

### APIs and identity

| ID | Exact requested item | Current owner and baseline | Required practical/debug/interview evidence |
|---|---|---|---|
| BEC-07 | REST APIs | [REST][rest], [MVC][mvc], [Task Tracker][tracker] — Foundation | Trace a real HTTP request through validation/service/persistence/error mapping; test resource semantics and failure status. BE-06/07. |
| BEC-08 | HTTP / HTTPS | [Application protocols][application], [network security][netsecurity] — Foundation | Observe headers, caching and a TLS connection with local fixtures; distinguish DNS, connection, certificate and application failures. BE-01/06. |
| BEC-09 | API Design & Versioning | [REST: compatible evolution][rest] — Foundation | Change a contract compatibly; test validation, errors and old-client behavior; document deprecation and a breaking-change decision. BE-06/07. |
| BEC-10 | Authentication & Authorization | [Spring Security][security], [Task Tracker][tracker], [AI workflow][workflow] — Foundation | Test anonymous, authenticated-forbidden, owner and cross-tenant requests; enforce resource permission in application code. BE-06. |
| BEC-11 | JWT / OAuth 2.0 | [JWT/OAuth/OIDC boundaries][security] — Foundation | Test signature, issuer, audience, expiry, key rotation and scope; trace authorization-code/PKCE with a pinned local identity provider; explain token format versus authorization protocol. BE-06. |
| BEC-12 | Session Management | [Session security][security] — Foundation | Test login/session-ID rotation, logout/invalidation, expiry, cookies and CSRF; demonstrate multi-instance session trade-offs without claiming a JWT solves revocation. BE-06. |

### Data and caching

| ID | Exact requested item | Current owner and baseline | Required practical/debug/interview evidence |
|---|---|---|---|
| BEC-13 | SQL | [Practical SQL][sql], [SQL labs][labs] — Foundation | Execute joins, aggregates, CTEs and window queries against seeded rows; predict NULL, duplicates and pagination behavior before running. BE-03. |
| BEC-14 | Database Design & Normalization | [ER modeling][er], [keys][keys], [normalization][normalization] — Foundation | Model tasks/projects/orders; enforce keys and constraints; show an update anomaly and justify any denormalization. BE-03. |
| BEC-15 | Indexing | [B/B+ trees and indexes][indexing] — Foundation | Compare real plans before/after a composite index; explain order, selectivity, covering behavior, write cost and why the optimizer may decline it. BE-03. |
| BEC-16 | Transactions & ACID | [Transactions][transactions], [JPA][jpa] — Foundation | Demonstrate commit, rollback and crash/durability assumptions on the declared engine; distinguish flush from commit and multiple calls from one transaction. BE-03. |
| BEC-17 | Database Isolation Levels | [Concurrency control][dbconcurrency], [transactions][transactions] — Foundation | Two-session anomaly matrix on a pinned database: dirty/non-repeatable reads, phantoms, write skew and serialization failures where applicable. BE-03. |
| BEC-18 | Database Locking | [Concurrency control][dbconcurrency], [SQL labs][labs] — Foundation | Observe a real wait/blocker chain and deadlock; shorten the transaction or change lock order; verify bounded timeout and recovery. BE-03. |
| BEC-19 | Optimistic & Pessimistic Concurrency Control | [JPA versions][jpa], [concurrency control][dbconcurrency] — Foundation | Race two updates; test version conflict versus explicit row locking, fresh-transaction retry and starvation/throughput trade-offs. BE-03. |
| BEC-20 | NoSQL Databases | [SQL/NoSQL models][dbintro], [distributed data][distributed] — Partial | Compare key-value, document, wide-column and graph access models; run one document-store schema/index/query exercise on a real engine; explain invariants and consistency without SQL/NoSQL stereotypes. BE-03/08. |
| BEC-21 | Caching | [Spring caching][caching], [HLD cache-aside][hldcache], [LLD LRU][lldcache], [Task Tracker][tracker] — Foundation | Reuse the cache-aside/LRU explanations; extend the existing cache milestone with expiry, invalidation, after-commit behavior, stale reads and a stampede; observe correctness as well as hit rate. BE-05. |
| BEC-22 | Redis | [Remote-cache concepts][caching], [session storage][security] — Partial | Real Redis lab for key/type/TTL, bounded memory/eviction, atomic updates and cache outage; explain persistence/failover limits and session/rate-limit use. A local map is not Redis evidence. BE-05/06/08. |
| BEC-23 | Connection Pooling | [HikariCP][production], [distributed DB pools][distributed] — Foundation | Exhaust a deliberately small pool; inspect active/idle/pending and transaction duration; distinguish slow queries, leaks and excessive concurrency before resizing. BE-03/10. |

### Concurrency, messaging and service boundaries

| ID | Exact requested item | Current owner and baseline | Required practical/debug/interview evidence |
|---|---|---|---|
| BEC-24 | Multithreading & Concurrency | [Java concurrency][concurrency], [LLD thread pool][lldpool], [JVM][jvm], [OS synchronization][synchronization] — Foundation | Reuse the thread-pool exercise; reproduce race, deadlock and saturation; read thread evidence; fix ownership/locking; compare bounded executors and version-labelled virtual threads. BE-01/10. |
| BEC-25 | Asynchronous Programming | [CompletableFuture and async boundaries][caching], [concurrency][concurrency] — Foundation | Compose success/failure/cancellation; propagate required context explicitly; test bounded queue, rejected work and non-inherited transaction boundaries. BE-05/10. |
| BEC-26 | Message Queues | [Outbox overview][distributed], [LLD pub/sub][lldpubsub] — Partial | Link the in-process pub/sub design; add a real broker producer/consumer exercise: acknowledgement, redelivery, poison messages, backpressure, dead-letter handling and retry exhaustion. BE-04. |
| BEC-27 | Kafka / RabbitMQ | [Distributed systems owner][distributed], [async owner][caching] — Gap | A real Kafka lab for partitions/keys/order, offsets/groups/rebalance/lag and an explicit transaction boundary; a separate real RabbitMQ lab for exchanges/bindings/queues, prefetch, confirms, manual ACK and redelivery. Compare log and broker routing semantics. BE-04. |
| BEC-28 | Event-Driven Architecture | [Observer][patterns], [LLD pub/sub][lldpubsub], [outbox overview][distributed] — Partial | Reuse Observer/pub-sub basics; add transactional outbox plus idempotent consumer; version an event; crash before/after publish and local effect; show why arbitrary side effects are not universally exactly-once. BE-04. |
| BEC-29 | Microservices | [Distributed data][distributed], [cloud operations][cloud], [HLD app][hld] — Partial | Define ownership, boundaries, contracts and independent deployment in a two-service exercise; expose network and operational costs. BE-04/05/08. |
| BEC-30 | Monolith vs Microservices | [Cloud trade-offs][cloud], [HLD app][hld] — Partial | Write a decision record for a modular monolith versus services using team size, change rate, data ownership and failure isolation; a monolith remains a valid choice. BE-08/09. |
| BEC-31 | Service-to-Service Communication | [HTTP/TLS][application], [networking][network], [HLD app][hld] — Partial | Compare synchronous HTTP, an RPC contract and events; carry identity/trace/deadline, handle contract evolution and a failed downstream service. BE-02/04/05/06. |
| BEC-32 | API Gateway | [Nginx][nginx], [API contracts][rest] — Gap | Explain gateway versus reverse proxy/load balancer; run routing, external auth policy and rate-limit examples; retain service-side authorization and test trusted-forwarded-header rules. BE-05/06/08. |

### Edge behavior and distributed correctness

| ID | Exact requested item | Current owner and baseline | Required practical/debug/interview evidence |
|---|---|---|---|
| BEC-33 | Reverse Proxy | [Nginx][nginx] — Foundation | Run a proxy to owned local upstreams; inspect upstream errors, forwarded headers, timeout/body limits and safe reload. BE-05/08. |
| BEC-34 | Load Balancing | [Nginx][nginx], [application delivery][application], [HLD request flow][hldflow] — Foundation | Reuse the HLD comparison; compare round-robin and least-outstanding under stated load; fail an instance, drain connections and explain why balancing does not create capacity. BE-05/08. |
| BEC-35 | Rate Limiting | [QoS/token buckets][qos], [HLD distributed limiter][hldrate], [LLD limiter][lldrate], [Nginx][nginx] — Foundation | Reuse the linked mechanisms; test bursts, fairness, distributed counters, 429/retry guidance and identity/key cardinality; label local versus global guarantees. BE-05/06. |
| BEC-36 | Idempotency | [REST][rest], [LLD payment][lldpayment], [outbox][distributed], [local AI workflow][workflow] — Foundation | Reuse the LLD duplicate-submit race; persist scoped request key, payload binding and outcome; race duplicates, restart after commit and reject changed payloads; distinguish idempotency from universal exactly-once delivery. BE-04/05. |
| BEC-37 | Pagination | [REST][rest], [SQL][sql], [Task Tracker][tracker] — Foundation | Compare offset and cursor pagination with stable tie-breaking; mutate rows between pages; bound limits and query cost. BE-03/06. |
| BEC-38 | Retry Strategies & Exponential Backoff | [HTTP retry safety][application], [REST failures][rest] — Partial | Inject retryable/non-retryable failures; apply deadline, attempt cap, exponential backoff with jitter and cancellation; honor retry guidance only within budget and count amplification. BE-05. |
| BEC-39 | Circuit Breaker Pattern | [LLD circuit breaker][lldbreaker], [serving guidance][serving] — Linked | Reuse the existing state-machine lesson and exercise; add only missing integration evidence for bounded probes, deadline/retry/bulkhead composition and observable recovery. BE-05. |
| BEC-40 | Distributed Transactions | [Distributed transactions][distributed] — Foundation | Compare local transaction, outbox, saga and 2PC; inject ambiguous outcomes and recover using durable state rather than blind retry. BE-03/04/05. |
| BEC-41 | Saga Pattern | [Saga overview][distributed] — Partial | Execute local commits and compensations with persisted state; duplicate/out-of-order steps, failed compensation and manual reconciliation; compare orchestration/choreography. BE-04/05. |
| BEC-42 | Two-Phase Commit (2PC) | [Prepare/decision/blocking][distributed] — Foundation | Trace prepare and decision logs; fail the coordinator after prepare and identify the in-doubt participant; label simulation versus actual XA/database evidence. BE-03/04. |
| BEC-43 | CAP Theorem | [Partition scenario][distributed] — Foundation | Work a concrete partition: define operations, linearizability and availability assumptions, then show responses on each side; avoid a generic permanent “pick two” label. BE-08. |
| BEC-44 | Consistency Models | [Consistency spectrum][distributed] — Foundation | Trace linearizable, eventual, read-your-writes and monotonic-read histories; keep transaction isolation separate from replication consistency. BE-03/08. |
| BEC-45 | Database Replication | [Lag and failover][distributed] — Foundation | Real primary/replica lag and stale-read observation where the environment supports it; demonstrate failover/fencing and state RPO/RTO assumptions. BE-03/08. |
| BEC-46 | Database Sharding & Partitioning | [Shard routing][distributed] — Foundation | Compare table partitioning and cross-node sharding; test pruning, hot keys, routing/rebalancing and cross-shard query costs; identify what an actual lab proves. BE-03/08. |
| BEC-47 | Distributed Systems Fundamentals | [Distributed DBMS][distributed], [networking][network], [HLD app][hld] — Foundation | Trace partial failure, timeouts, clocks/order, duplication and partitions; connect consensus/leader fencing to the stated invariant and failure model. BE-04/05/08. |

### Delivery, systems and networks

| ID | Exact requested item | Current owner and baseline | Required practical/debug/interview evidence |
|---|---|---|---|
| BEC-48 | Docker | [Docker][docker], [Task Tracker container][tracker] — Foundation | Build/run a non-root image; inspect layers/network/volume, signal shutdown and memory limits; distinguish Java OOME from container termination. BE-08. |
| BEC-49 | Kubernetes Basics | [Kubernetes][kubernetes] — Foundation | Deploy locally; inspect Pod/Deployment/Service/DNS, requests/limits, probes and rollout; diagnose Pending/CrashLoop/OOM and roll back. BE-08. |
| BEC-50 | CI/CD | [CI/CD][cicd], [repository workflow][ci] — Foundation | Build once, test/scan and promote the same artifact; block a bad migration/contract, deploy progressively and verify rollback. BE-07/08/09. |
| BEC-51 | Git | [CI/CD workflow context][cicd] — Partial | Disposable-repository exercise for branch/commit/diff, merge/rebase/conflicts, revert versus reset, bisect and a reviewable PR; never rewrite a learner's real history. BE-09. |
| BEC-52 | Linux Fundamentals | [Processes][processes], [I/O][io], [files][files], [OS labs][labs] — Partial | Shell/pipes/text search, permissions, environment, process/signals, sockets, disk/memory and service logs; diagnose one failed process using bounded commands. BE-01/08/09. |
| BEC-53 | Networking Fundamentals | [Network foundations][network], [OSI][osi], [network labs][labs] — Foundation | Trace browser/client to service using addresses, ports, routing and layers; distinguish host reachability from service availability. BE-01/08. |
| BEC-54 | DNS | [DNS resolution and caching][application], [network labs][labs] — Foundation | Observe records/TTL/cache and an owned resolution failure; distinguish NXDOMAIN, resolver timeout and stale cache without assuming DNS balances every request. BE-08. |
| BEC-55 | TCP/IP | [TCP][tcp], [IP/subnets][ip], [network labs][labs] — Foundation | Observe connection establishment/close, port binding and refused versus timed-out connections; connect retransmission/backpressure to application deadlines. BE-01/08. |
| BEC-56 | WebSockets | [Protocol comparison][application], [Nginx connections][nginx] — Partial | Runnable authenticated handshake/message/disconnect/reconnect lab; bound messages and idle time, validate origin, handle slow clients and explain per-instance state/fan-out. BE-05/06/08. |
| BEC-57 | Cloud Fundamentals | [Cloud operations][cloud] — Foundation | Map VPC/subnet/routing, IAM, compute, managed database/storage, zones and cost to one deployment; diagnose a synthetic or actual access/network denial with evidence clearly labelled. BE-08. |

### Production behavior, security and performance

| ID | Exact requested item | Current owner and baseline | Required practical/debug/interview evidence |
|---|---|---|---|
| BEC-58 | Logging | [Structured logs][production], [LLD logging framework][lldlogging], [cloud][cloud] — Foundation | Link the framework design; correlate one request and redact secrets/PII; choose levels and bounded fields; test log output without recording learner drafts or simulation inputs. BE-02/06. |
| BEC-59 | Monitoring | [Cloud operations][cloud], [production][production] — Foundation | Build a small service dashboard/alert for symptoms and dependencies; show actionable thresholds, alert noise and a runbook. BE-02. |
| BEC-60 | Metrics | [Actuator/Micrometer concepts][production], [latency arithmetic][cloud] — Foundation | Measure rates/errors/durations/queue/pool; explain counters/gauges/histograms, percentile aggregation and bounded label cardinality. BE-02. |
| BEC-61 | Distributed Tracing | [Tracing][cloud], [production][production] — Foundation | Real OpenTelemetry propagation across HTTP, async and DB/dependency spans; compare missing context and a slow dependency; account for sampling. BE-02. |
| BEC-62 | Observability | [Three signals][cloud], [production][production] — Foundation | Diagnose a seeded incident by combining logs/metrics/traces with hypotheses; record mitigation, cause and postmortem rather than treating a dashboard as proof. BE-01/02. |
| BEC-63 | Health Checks | [Actuator][production], [Kubernetes probes][kubernetes] — Foundation | Test startup/readiness/liveness and traffic draining; fail a dependency and prevent a fleet-wide restart loop; keep detailed endpoints appropriately restricted. BE-07/08. |
| BEC-64 | Error Handling | [Exception boundaries][exceptions], [REST error contracts][rest] — Foundation | Stable Problem Details and validation contracts; map known client/auth/dependency/overload errors; test no stack/secret leakage and preserve diagnostic causes. BE-01/06/07. |
| BEC-65 | Fault Tolerance | [Cloud failures][cloud], [reliability owner][caching] — Partial | Controlled dependency timeout/outage: deadline, isolation, backpressure, retry cap and explicit degraded response; verify recovery and avoided retry storm. BE-05/08. |
| BEC-66 | Scalability | [Distributed data][distributed], [Kubernetes scaling][kubernetes], [HLD capacity][hldcapacity] — Foundation | Reuse capacity estimation; measure a bounded workload and locate the first bottleneck; compare vertical/horizontal scale, state ownership and diminishing returns. BE-03/08/10. |
| BEC-67 | High Availability | [Replication/failover][distributed], [cloud][cloud] — Foundation | Exercise instance loss/draining and a documented data recovery scenario; state failure domains, quorum/fencing, RPO/RTO and what remains a single point of failure. BE-08. |
| BEC-68 | Performance Optimization | [JVM][jvm], [query plans][optimizer], [pools][production] — Partial | Profile before changing code; identify CPU/allocation/GC/I/O/lock/queue cause, compare controlled before/after runs and include correctness and resource cost. BE-01/03/07/10. |
| BEC-69 | Database Query Optimization | [Optimizer][optimizer], [JPA N+1][jpa], [SQL labs][labs] — Foundation | Actual EXPLAIN ANALYZE/BUFFERS and query-count evidence; compare estimates/actuals/loops, index/query/N+1 fixes and realistic data shape. BE-03. |
| BEC-70 | Security Best Practices | [Spring Security][security], [network security][netsecurity], [production][production] — Foundation | Threat-model the feature; test least privilege, object/field authorization, injection/SSRF, safe dependencies, TLS and restrictive configuration; explain residual risk. BE-06/07/08. |
| BEC-71 | OWASP Top 10 | [Spring Security][security], [REST boundaries][rest] — Gap | Version-labelled coverage of all categories in the current web Top 10 plus the API list; local vulnerable/fixed examples, negative tests and a category-to-control evidence matrix. BE-06/07. |
| BEC-72 | Secrets Management | [External configuration][production], [CI/CD][cicd], [AI configuration][aiproject] — Foundation | Supply secrets at runtime; test missing values, rotation/revocation and log redaction; discuss secret stores/workload identity, CI handling and incident response without committed defaults. BE-06/08/09. |

### Verification practices

| ID | Exact requested item | Current owner and baseline | Required practical/debug/interview evidence |
|---|---|---|---|
| BEC-73 | Testing | [Spring testing][production], [Task Tracker][tracker], [CI][ci] — Foundation | A risk-based test plan showing which claim each unit/slice/integration/API/load check establishes and what it cannot establish. BE-07. |
| BEC-74 | Unit Testing | [JUnit/Mockito][production], [Task Tracker tests][trackertests] — Foundation | Pure behavior tests with useful boundaries, deterministic clocks/randomness and negative cases; avoid tests that merely duplicate implementation. BE-07. |
| BEC-75 | Integration Testing | [SpringBootTest/Testcontainers][production], [Task Tracker][tracker] — Foundation | Real database and broker/cache semantics where relevant, migrations, restart and concurrent requests; distinguish H2/fakes from production engines. BE-03/04/07. |
| BEC-76 | API Testing | [MVC/HTTP tests][production], [Task Tracker smoke][trackerhttp], [AI HTTP smoke][aihttp] — Foundation | Test the packaged application over real HTTP: auth/CSRF, validation, error dispatch, pagination, timeouts and compatibility; complement MockMvc with transport evidence. BE-06/07. |
| BEC-77 | Load & Performance Testing | [Production test owner][production], [CI/CD load gate][cicd] — Partial | Bounded load tool/workload with arrival/concurrency model, warm-up, latency histogram, throughput, errors and resource/pool signals; identify saturation and recovery. Synthetic fixtures are not a production capacity benchmark. BE-07/10. |

## 3. Implementation order

The earlier ten backend packages remain the implementation units. The following steps make the
new requirements explicit within them; they do not restart delivered work or replace the AI path.

1. **Verify foundations and add the missing engineering workflow.** BE-01/09/10:
   Java fundamentals, OOP/SOLID/patterns, a Clean Code refactor, safe Git/Linux/Maven diagnosis
   and bounded concurrency. Verify the DSA and LLD paths and add explicit prerequisites/cross-links.
   Reuse Task Tracker; preserve its working in-memory entry point.
2. **Finish API, identity and data boundaries.** BE-03/06:
   contracts/versioning/errors/pagination, sessions/JWT/OAuth, schema design and actual transaction,
   locking/plan/pool incidents. Add a real NoSQL comparison exercise. Avoid expanding a single
   lesson into an unreadable checklist; link focused walkthroughs from the owning lessons.
3. **Build real cache and messaging exercises.** BE-04/05:
   real Redis; Kafka and RabbitMQ separately; acknowledgement/duplicates/outbox/consumer recovery,
   schema evolution and persisted saga compensation. Inject failures between every durability boundary.
4. **Connect services safely.** BE-04/05/06/08:
   modular-monolith/service decision, synchronous/RPC/event contracts, API gateway/reverse proxy/load
   balancing, WebSockets, rate limits, idempotency, retries/jitter, breakers, isolation and backpressure.
5. **Make incidents observable.** BE-01/02/03:
   real correlated logs/metrics/OpenTelemetry traces, probe behavior, JVM/SQL/pool diagnosis,
   actionable alerts and evidence-based incident notes. Exercise cancellation and sensitive-data redaction.
6. **Harden security and delivery.** BE-06/07/08/09:
   full version-labelled OWASP web/API matrices, dependency/supply-chain checks, secret rotation,
   container/Kubernetes/network/IAM failures and CI artifact promotion/rollback.
7. **Measure scale and recovery.** BE-03/07/08/10:
   bounded load/performance runs, query/profile improvements, partition/replication/failover observations,
   backup/restore and explicit availability/recovery assumptions. Distinguish local simulations from
   actual multi-process/node evidence.
8. **Close the learning loop.** Add the missing predict/change/debug exercises and question-specific
   interview rubrics; verify links, reader/practice navigation and prerequisites in both themes.
   Complete real learner/manual accessibility evidence under CLOSE-03/04 before claiming comprehension.

Run these alongside the existing AI phases in their dependency order. The new backend checklist
does not remove the zero-AI entry, training/evaluation, RAG, agents/MCP, multimodal, security,
quality/cost/operations or adaptation requirements. A successful small Java AI lab cannot close
the distributed-systems/backend packages by itself.

## 4. Security version and source requirements

Checked 2026-10-17: use the official [OWASP web Top 10:2025][owaspweb] and
[API Security Top 10:2023][owaspapi] as separately versioned awareness lists. Recheck the primary
pages when authoring the exercises. Map each category in both lists to a concrete control/example;
overlapping controls may share an exercise. These lists do not replace a feature-specific threat model.
The current curriculum cites individual security cheat sheets but does not yet provide that full mapping.

For other version-sensitive exercises, pin the actual JDK, Spring, database, Redis, broker,
container/orchestrator and load-tool versions in the lab evidence. Record commands and results,
including failed attempts and environmental limits. An external dependency that cannot run locally
may be verified in CI; a mock cannot be relabelled as that evidence.

## 5. Ownership across the learning network

**Reuse first:** when DSA, LLD or HLD already explains a concept, link to its specific page and
exercise. Do not rebuild the same lesson, simulator, question deck or example here. A short
prerequisite/transition may help navigation; it is not a requirement to duplicate the explanation.
Add content only for an identified gap or a distinct backend integration/debugging exercise.

The following destinations were matched to local routes and existing content/catalog entries on
2026-10-17. This is source/route verification, not a claim that every deployed interaction was tested.

| Existing destination | Requirements it helps cover | Evidence boundary / remaining addition |
|---|---|---|
| [DSA catalog][dsa], [Two Sum][dsatwosum], [BFS][dsabfs] | BEC-05; collection/algorithm choices in BEC-01/24/68 | Reuse algorithm teaching and traces. Verify the selected sequence; add only the backend choice/complexity bridge if needed. |
| [LLD logging framework][lldlogging] | BEC-02/03/04/06/58 | Existing class design, patterns and SOLID discussion. A clean-code refactor and correlated operational logging are distinct gaps, not reasons to repeat the pattern lesson. |
| [LLD workflow][lldworkflow] | BEC-02/03/06/24/25 | Existing state/strategy/chain and concurrency design. Link it; distinguish this approval engine from a distributed saga. |
| [LLD LRU cache][lldcache], [generic cache library][lldcachelibrary] | BEC-05/06/21/24 | Reuse data structure and cache-policy design; real Redis/remote-cache outage behavior remains separate. |
| [LLD thread pool][lldpool] | BEC-24/25/68 | Reuse the pool design/exercise; add only missing JVM diagnostics or application overload integration. |
| [LLD pub/sub][lldpubsub] | BEC-06/26/28 | Existing in-process pub/sub design. It is not evidence of Kafka/RabbitMQ delivery, durability or consumer-group behavior. |
| [LLD circuit breaker][lldbreaker] | BEC-06/39/65 | Existing breaker design. Avoid rebuilding it; verify the linked exercise and fill deadline/retry/isolation integration gaps. |
| [LLD payment][lldpayment] | BEC-06/19/36/40 | Existing duplicate-submit/concurrency example. Durable restart recovery, real payments and distributed transaction guarantees are not implied. |
| [LLD rate limiter][lldrate] | BEC-24/35 | Existing local limiter design; distinguish local state from distributed/global policy. |
| [HLD request flow][hldflow] | BEC-31/33/34/47/66 | Published request-flow/load-balancing lesson. Gateway/security/real deployment gaps still need explicit evidence. |
| [HLD capacity estimation][hldcapacity] | BEC-23/66/67/68/77 | Published capacity lesson; estimates are not measured load-test or availability results. |
| [HLD distributed rate limiter][hldrate] | BEC-35/44/47/65 | Published distributed-limiter lesson; link its stated failure/consistency assumptions. |
| [HLD cache-aside][hldcache] | BEC-21/44/66 | Published cache-aside lesson. It does not replace a real Redis operational exercise. |

HLD's local catalog marks queue/tail-latency, delivery/ACK, data-access, transactions/isolation and
timeouts/retries topics as **drafts** under `/draft/topics/...`. Do not use them as finished coverage.
Link their published replacements when available; until then the corresponding gaps stay explicit.

Keep native same-tab navigation, verified destination paths and honest independent-progress wording.
No sibling-app files, shared state or navigation destinations are changed by this checklist. Existing
CS lessons remain intact; no content is deleted just because related material exists elsewhere.

Prefer existing owners and linked labs. This mapping registers no new topics, changes no routes
and increases no curriculum completion counts. Any future new topic needs its own registration and
content-contract integration rather than an undocumented placeholder.

## 6. Release and completion gate

- [x] Preserve all 77 requested labels, with stable BEC-01–BEC-77 IDs.
- [x] Identify owning lessons/apps, baseline limitations and practical acceptance work.
- [x] Link this checklist from the practical plan, handoff and repository documentation.
- [ ] For every BEC ID, link the reviewed explanation, executable exercise, diagnostic case,
  interview question/rubric, actual verification and merged release in the implementation ledger.
- [ ] Finish all ten BE packages and the independent AI/debugging/closure requirements.
- [ ] Run checks appropriate to the actual changes; preserve existing URLs, saved progress/answers,
  themes, privacy, reading/practice behavior and the learning-network contract.
- [ ] Complete the external learner/manual accessibility gates, or report them explicitly open.

This document is a coverage contract. It does not claim that all 77 learning outcomes have shipped.
The October 16 practical implementation remains partial; PR #55 is the merged executable baseline.

Documentation verification: all 77 exact requested labels and their order were checked, all IDs
are unique, all 54 local reference targets exist, and all reference labels resolve. The 15 selected
sibling deep links were checked against local route/content sources; all 20 external URLs in
this document returned HTTP 200. HTTP availability does not certify deployed app interactions.
No application code or curriculum content changes, so application test suites were not rerun
locally for this documentation-only package; normal repository CI still applies before merge.

[plan]: BACKEND_AI_PRACTICAL_LEARNING_PLAN_2026-10-16.md
[manifest]: content/COVERAGE_MANIFEST.json
[results]: docs/BACKEND_AI_IMPLEMENTATION_RESULTS_2026-10-16.md
[execution]: content/java-spring/01b-java-execution-pipeline.md
[memory]: content/java-spring/01c-java-memory-model.md
[generics]: content/java-spring/01g-java-generics.md
[exceptions]: content/java-spring/01k-java-reflection-exceptions.md
[oop]: content/java-spring/01d-java-oop-pillars.md
[patterns]: content/java-spring/01m-design-patterns-solid.md
[collections]: content/java-spring/01h-java-collections-framework.md
[hashmap]: content/java-spring/01j-java-hashmap-internals.md
[rest]: content/java-spring/08-spring-rest-api-design.md
[mvc]: content/java-spring/03-spring-mvc-lifecycle.md
[security]: content/java-spring/09-spring-security.md
[production]: content/java-spring/11-spring-testing-production.md
[caching]: content/java-spring/10-spring-caching-async.md
[concurrency]: content/java-spring/01l-java-multithreading-concurrency.md
[jvm]: content/java-spring/01-jvm-gc.md
[jpa]: content/java-spring/04-jpa-hibernate-lifecycle.md
[sql]: content/dbms/12-sql-querying.md
[er]: content/dbms/02-er-model.md
[keys]: content/dbms/04-functional-dependencies-keys.md
[normalization]: content/dbms/04b-database-normalization.md
[indexing]: content/dbms/05-dbms-indexing.md
[transactions]: content/dbms/06-transactions-acid.md
[dbconcurrency]: content/dbms/07-concurrency-control.md
[dbintro]: content/dbms/00-dbms-introduction.md
[distributed]: content/dbms/09-distributed-databases-cap.md
[optimizer]: content/dbms/08-query-optimization.md
[application]: content/networking/07-application-layer.md
[netsecurity]: content/networking/08-network-security.md
[network]: content/networking/00-network-fundamentals.md
[osi]: content/networking/01-osi-model.md
[tcp]: content/networking/05-tcp-ip.md
[ip]: content/networking/03-ip-subnetting.md
[qos]: content/networking/09-network-performance-qos.md
[docker]: content/devops/01-docker-fundamentals.md
[kubernetes]: content/devops/02-kubernetes-fundamentals.md
[nginx]: content/devops/03-nginx-reverse-proxy.md
[cicd]: content/devops/04-cicd-pipelines-deployment-strategies.md
[cloud]: content/devops/05-cloud-native-operations.md
[processes]: content/os/01-process-management.md
[io]: content/os/07-io-systems.md
[files]: content/os/06-file-systems.md
[synchronization]: content/os/04-synchronization.md
[serving]: content/aiml/03-model-serving.md
[tracker]: examples/java-spring/task-tracker/README.md
[trackertests]: examples/java-spring/task-tracker/src/test/java/com/csfundamentals/example
[trackerhttp]: examples/java-spring/task-tracker/verify_http.py
[labs]: examples/labs/README.md
[aiproject]: examples/ai-backend/README.md
[aihttp]: examples/ai-backend/verify_http.py
[workflow]: examples/ai-backend/WORKFLOW.md
[ci]: .github/workflows/verify.yml
[dsa]: https://dsa-with-ui.vercel.app/
[lld]: https://lld-with-ui.vercel.app/
[hld]: https://hld-with-ui.vercel.app/
[owaspweb]: https://top10.owasp.org/2025/
[owaspapi]: https://api-security.owasp.org/editions/2023/en/0x11-t10/
[dsatwosum]: https://dsa-with-ui.vercel.app/problem/two-sum
[dsabfs]: https://dsa-with-ui.vercel.app/problem/bfs-traversal
[lldlogging]: https://lld-with-ui.vercel.app/logging-framework
[lldworkflow]: https://lld-with-ui.vercel.app/workflow
[lldcache]: https://lld-with-ui.vercel.app/lru-cache
[lldcachelibrary]: https://lld-with-ui.vercel.app/cachelibrary
[lldpool]: https://lld-with-ui.vercel.app/thread-pool
[lldpubsub]: https://lld-with-ui.vercel.app/pub-sub
[lldbreaker]: https://lld-with-ui.vercel.app/circuit-breaker
[lldpayment]: https://lld-with-ui.vercel.app/payment
[lldrate]: https://lld-with-ui.vercel.app/rate-limiter
[hldflow]: https://hld-with-ui.vercel.app/topics/request-flow
[hldcapacity]: https://hld-with-ui.vercel.app/topics/capacity-estimation
[hldrate]: https://hld-with-ui.vercel.app/topics/distributed-rate-limiter
[hldcache]: https://hld-with-ui.vercel.app/topics/cache-aside
