# Core CS curriculum audit — 2026-10-01

**Latest status — October 3:** the [37-review completion ledger](CORE_ACCURACY_COMPLETION_2026-10-03.md) completes the remaining core queue: **56/56 scoped core reviews**. Earlier counts below are dated snapshots. AI/ML/DevOps freshness review and real learner evidence remain separate.

**Scope:** the 56 registered Operating Systems (8), Computer Networks (12), DBMS (13), and Java/Spring (23) lessons. This complements [the project learning and UX audit](PROJECT_LEARNING_UX_AUDIT_2026-10-01.md) and the [AI/ML and DevOps learning path](AI_ML_DEVOPS_LEARNING_PATH.md). The intended learner knows variables, conditions, loops, and simple functions and is working toward day-to-day backend engineering and 2+ year interviews.

## What was checked, and what was not

I inventoried every lesson, read the beginner openings and interview sections of representative lessons in each subject, checked the runnable Task Tracker example, searched for hands-on diagnostic commands and SQL fixtures, and ran the curriculum and migration validators. For this snapshot the 56 lessons contain **26,382 lines, 241 Mermaid diagrams, and 785 interview Q&As**. Every one has a Further Reading section; the structural gate parses all 295 diagrams in the full 68-lesson curriculum and passes all 68 lessons and 83 manifest entries. The five Task Tracker tests pass.

These numbers prove coverage and syntax, not comprehension, executable correctness of every snippet, or current accuracy of every technical statement. The audit below separates **verified repository findings** from **review priorities**. I checked the DBMS durability and isolation corrections in this change against the [PostgreSQL isolation](https://www.postgresql.org/docs/current/transaction-iso.html), [WAL](https://www.postgresql.org/docs/current/runtime-config-wal.html), [replication](https://www.postgresql.org/docs/current/runtime-config-replication.html), and [MySQL InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html) manuals. I also checked the scheduler freshness item against the [Linux EEVDF documentation](https://docs.kernel.org/scheduler/sched-eevdf.html). A complete primary-source expert review of all 56 files has **not** been completed.

## Findings that most affect learning

| ID | Priority | Evidence | Change and acceptance |
|---|---|---|---|
| C01 | P1 | All 23 Java/Spring lessons start with **Before you start** and **After this lesson you can**; none of the 33 OS, networking, and DBMS lessons has those explicit blocks. See [Java execution](content/java-spring/01b-java-execution-pipeline.md) versus [CPU scheduling](content/os/03-cpu-scheduling.md), [subnetting](content/networking/03-ip-subnetting.md), and [SQL](content/dbms/12-sql-querying.md). | Add two to four observable outcomes and prerequisite links to each of the 33 lessons, starting with first lessons and high-traffic bridges. Keep the beginner opening usable without reading a prior Expert tier. Verify that a new learner can state what they will do after the lesson. |
| C02 | P1 | Networking has diagrams and protocol examples, but a search of all 12 lessons found no `curl`, `dig`, `ping`, `traceroute`, `tcpdump`, `ss`, `ip route`, or `openssl s_client` walkthrough. [Application layer](content/networking/07-application-layer.md) has HTTP message snippets, not a reproducible investigation. | Add a small, safe command-and-observation lab for DNS → TCP/TLS → HTTP, plus packet loss/timeout and local-routing cases. Give expected output features, not machine-specific output promises. Accept when a learner can identify the failing layer from evidence and explain what each command cannot prove. |
| C03 | P1 | [SQL querying](content/dbms/12-sql-querying.md) has 18 SQL fences referencing `orders`, `customers`, and `employees`, but no `CREATE TABLE` or `INSERT INTO` fixture. It cannot be run end to end as written. | Supply a small versioned PostgreSQL schema/seed dataset, expected result tables, and automated query checks for joins, nulls, grouping, window functions, and pagination. Mark dialect-specific features. Accept when a new learner can run each exercise from a clean database and diagnose an incorrect result. |
| C04 | P1 | [Task Tracker](examples/java-spring/task-tracker/README.md) is a real Java 17/Spring Boot 4.1.1 application with five passing tests, but its in-memory milestone explicitly has no database, transactions, authentication, authorization, caching, or deployment. [The Java learning plan](JAVA_LEARNING_PLAN.md) still labels the first Spring application package only “Planned.” | Use this existing app as the common thread for successive, testable milestones: persistence and migrations → transactions and failure recovery → security → caching/async → production telemetry/deployment. Update the plan to distinguish the shipped first milestone from missing ones. Accept only with runnable tests and requests at each step. |
| C05 | P1 | [Transactions/ACID](content/dbms/06-transactions-acid.md) had an answer claiming a long transaction itself retains WAL, conflating vacuum bloat with WAL retention; its dirty-read/phantom and relaxed-durability answers were also too absolute. Q1, Q3, Q9, Q13 and Q14 are corrected in this change. | Continue a source-backed review of isolation, recovery, performance numbers, and engine-specific claims across DBMS and then OS/networking/Java. Record exact lesson/Q, source, correction, and test. Accept when production advice distinguishes a general mechanism from a PostgreSQL/MySQL-specific implementation and uses measured or labelled illustrative numbers. |
| C06 | P2 | [CPU scheduling](content/os/03-cpu-scheduling.md) explains CFS as historical, but its Linux-focused interview answer still asks only about CFS and does not explain the EEVDF transition that Linux documents from 6.6. | Keep CFS as the historical mental model, add a brief version-labelled EEVDF bridge, and ask candidates to contrast virtual runtime with eligibility/virtual deadlines without implying one invariant scheduler across kernels. |
| C07 | P2 | OS lessons mention tools such as `iostat` and `df -h` only in passing or interview questions; the eight-lesson path has no reproducible process/memory/file-system diagnosis task. | Add three short labs: a blocked versus runnable service, memory pressure/page-fault observation, and disk/inode exhaustion. Pair each command with a hypothesis, expected signal, confounder, and explanation. Do not require a privileged or destructive command. |
| C08 | P2 | The 785 Q&As provide breadth; the current 20-question pilot across five subjects is only a small share with answer-specific criteria. The rest use general comparison prompts. | Expand rubrics only after factual/editorial review. Choose common misconceptions and troubleshooting questions first; keep the model answer immediate and the checklist optional. Include what earns partial confidence and a follow-up that tests transfer. Never present a self-rating as an objective interview score. |
| C09 | P2 | Most DBMS lessons have SQL fragments and diagrams, but only the SQL lesson could be the practical bridge; it lacks a runnable fixture. The first Spring app has no JDBC/JPA persistence yet. | Use one small orders/tasks dataset across relational modelling, normalization, indexes, query plans, transactions and Spring persistence. Make predicted result/plan and observed result explicit, then explain discrepancies. |
| C10 | P2 | The content gate checks structure, diagrams and Q&A depth, while the Java example gate explicitly covers only marked programs. Many lesson snippets remain unexecuted by CI. | Label every snippet as runnable, excerpt, pseudo-code, or expected failure. Compile/run a representative set of Java snippets on the declared JDK; execute SQL against the declared engine and make test failures actionable. |

## Topic-by-topic work queue

The action in each row is the **next teaching improvement**, not a claim that the current lesson is wrong. “Opening” means explicit prerequisites and observable outcomes; it applies to all OS/networking/DBMS rows. “Lab” means a reproducible attempt with an explained observation. “Trace” means a small worked state change and a learner prediction before the explanation. Factual review is required for version-sensitive details even when not repeated in every row.

### Operating Systems — 8 lessons

| Lesson | Next improvement |
|---|---|
| [Process management](content/os/01-process-management.md) | Opening; trace `fork`/`exec`/`waitpid` with process-state observations and a zombie diagnosis. |
| [Memory management](content/os/02-memory-management.md) | Opening; predict a page fault versus a cache miss and inspect a bounded memory-pressure example. |
| [CPU scheduling](content/os/03-cpu-scheduling.md) | Opening; retain the FCFS/RR calculation and add a measured run-queue scenario plus the CFS→EEVDF version bridge. |
| [Synchronization](content/os/04-synchronization.md) | Opening; show a lost-update interleaving, then let the learner choose a lock/atomic remedy and explain its limit. |
| [Deadlocks](content/os/05-deadlocks.md) | Opening; give a reproducible wait-for graph and a distinction between detection, prevention and recovery. |
| [File systems](content/os/06-file-systems.md) | Opening; compare full disk, exhausted inodes and deleted-open-file evidence with expected commands. |
| [I/O systems](content/os/07-io-systems.md) | Opening; trace blocking I/O, readiness and completion with an observable backend-server example. |
| [Disk scheduling](content/os/08-disk-scheduling.md) | Opening; connect the textbook seek calculation to SSD/NVMe limits and measurable queue latency. |

### Computer Networks — 12 lessons

| Lesson | Next improvement |
|---|---|
| [Network fundamentals](content/networking/00-network-fundamentals.md) | Opening; start one browser-to-service packet journey that the later layers revisit. |
| [Physical layer and media](content/networking/00b-physical-layer-media.md) | Opening; add one worked bandwidth/noise calculation and say what an application engineer can actually observe. |
| [OSI and TCP/IP](content/networking/01-osi-model.md) | Opening; classify a DNS, TCP, TLS and HTTP failure without treating the model as a literal software stack. |
| [Data link layer](content/networking/02-data-link-layer.md) | Opening; trace one frame loss/retry and distinguish link delivery from end-to-end delivery. |
| [IP addressing/subnetting](content/networking/03-ip-subnetting.md) | Opening; add short prefix drills with explained `/31` and `/32` answers and route-output interpretation. |
| [Routing algorithms](content/networking/04-routing-algorithms.md) | Opening; work a small route-change table and distinguish control-plane convergence from one packet's path. |
| [TCP/UDP connections](content/networking/05-tcp-ip.md) | Opening; run a local connection inspection and explain retry ambiguity with an idempotent request. |
| [Transport protocols](content/networking/05b-transport-layer-protocols.md) | Opening; compare TCP, UDP and QUIC under explicit loss/ordering/latency requirements. |
| [TCP congestion](content/networking/06-tcp-congestion.md) | Opening; use a timeline separating receiver window, congestion window and application backpressure. |
| [Application layer](content/networking/07-application-layer.md) | Opening; add the DNS → TLS → HTTP command lab with response-header and certificate interpretation. |
| [Network security](content/networking/08-network-security.md) | Opening; inspect a local TLS handshake and separate authentication, encryption and authorization. |
| [Network QoS](content/networking/09-network-performance-qos.md) | Opening; compare latency percentiles under a labelled hypothetical load and identify what to measure in production. |

### DBMS — 13 lessons

| Lesson | Next improvement |
|---|---|
| [DBMS introduction](content/dbms/00-dbms-introduction.md) | Opening; use one small task/order dataset as the path's recurring example. |
| [Architecture and independence](content/dbms/01-dbms-architecture.md) | Opening; trace a schema change through application view, logical schema and storage. |
| [ER modelling](content/dbms/02-er-model.md) | Opening; let the learner draw, map and test one relationship before showing the answer. |
| [Relational algebra](content/dbms/03-relational-algebra-calculus.md) | Opening; pair an algebra expression with executable SQL and expected rows. |
| [Keys and dependencies](content/dbms/04-functional-dependencies-keys.md) | Opening; work closure and a counterexample with explicit candidate-key feedback. |
| [Normalization](content/dbms/04b-database-normalization.md) | Opening; decompose a table, insert rows, and demonstrate the anomaly before/after. |
| [B/B+ tree indexing](content/dbms/05-dbms-indexing.md) | Opening; connect node-split diagrams to one measured `EXPLAIN` plan and range query. |
| [Storage/RAID/indexing](content/dbms/05c-storage-raid-indexing.md) | Opening; label hardware-dependent performance claims and choose an index from a real predicate. |
| [Transactions/ACID](content/dbms/06-transactions-acid.md) | Opening; reproduce rollback/durability behavior and maintain the newly corrected engine-specific answers. |
| [Concurrency control](content/dbms/07-concurrency-control.md) | Opening; run two transactions in separate sessions and predict a lost update, deadlock or serialization retry. |
| [Query optimization](content/dbms/08-query-optimization.md) | Opening; compare estimated versus actual row counts and state when an index is not the right fix. |
| [Distributed DBMS/CAP](content/dbms/09-distributed-databases-cap.md) | Opening; use a concrete failure timeline and avoid treating CAP as an everyday latency formula. |
| [Practical SQL](content/dbms/12-sql-querying.md) | Opening; supply a clean PostgreSQL fixture, expected results and executable checks for the existing queries. |

### Java and Spring Boot — 23 lessons

The Java path already has explicit openings in all 23 lessons and an executable first Spring app. Preserve those improvements while building a continuous program from fundamentals to production. The [Java learning plan](JAVA_LEARNING_PLAN.md) remains the detailed sequence; the actions below identify the next gap for each lesson.

| Lesson | Next improvement |
|---|---|
| [JVM/GC](content/java-spring/01-jvm-gc.md) | Version-labelled GC decision example with actual observation commands and a measured pause/throughput trade-off. |
| [Execution pipeline](content/java-spring/01b-java-execution-pipeline.md) | Keep the Java 17 run/compile path; verify each marked runnable example and expected output. |
| [Memory model](content/java-spring/01c-java-memory-model.md) | Add a beginner prediction that distinguishes references, pass-by-value and concurrency visibility. |
| [OOP](content/java-spring/01d-java-oop-pillars.md) | Extend the existing runnable account example into a small change/debug task; pilot rubric covers four questions. |
| [Static/final/records](content/java-spring/01e-java-static-final-records.md) | Test defensive-copy and record-invariant examples on the declared Java baseline. |
| [Functional interfaces/lambdas](content/java-spring/01f-java-functional-lambdas.md) | Compare a loop, lambda and method reference in one small task with readable output. |
| [Generics](content/java-spring/01g-java-generics.md) | Add compile-failure explanations for PECS and type-erasure misconceptions. |
| [Collections](content/java-spring/01h-java-collections-framework.md) | Use one data-shape decision exercise with complexity plus memory/ordering trade-offs. |
| [Streams/Optional](content/java-spring/01i-java-streams-optional.md) | Contrast a readable loop with a stream and test null/side-effect failure cases. |
| [HashMap internals](content/java-spring/01j-java-hashmap-internals.md) | Reproduce mutable-key lookup failure and connect it to equality/hash contracts. |
| [Reflection/exceptions](content/java-spring/01k-java-reflection-exceptions.md) | Add a try-with-resources failure trace and distinguish expected exceptions from control flow. |
| [Multithreading](content/java-spring/01l-java-multithreading-concurrency.md) | Reproduce `volatile` lost-update versus atomic increment with a bounded concurrency test. |
| [SOLID/patterns](content/java-spring/01m-design-patterns-solid.md) | Refactor one real service requirement instead of memorizing five labels. |
| [Bean lifecycle](content/java-spring/02-spring-bean-lifecycle.md) | Connect a bean-created trace to the Task Tracker app and show a real startup failure. |
| [MVC request flow](content/java-spring/03-spring-mvc-lifecycle.md) | Trace Task Tracker request/filter/controller/response boundaries; pilot rubric covers four questions. |
| [JPA/Hibernate](content/java-spring/04-jpa-hibernate-lifecycle.md) | Add persistence to Task Tracker and verify entity states, N+1 and transaction behavior in tests. |
| [Spring Batch](content/java-spring/05-spring-batch-lifecycle.md) | Build one restartable chunk job using a tiny fixture and a failure checkpoint. |
| [Quartz](content/java-spring/06-quartz-scheduler.md) | Show misfire/retry behavior with a testable job and clear idempotency rule. |
| [Spring Boot internals](content/java-spring/07-spring-boot-internals.md) | Inspect one auto-configuration decision in the runnable app and show how to override it safely. |
| [REST API design](content/java-spring/08-spring-rest-api-design.md) | Extend Task Tracker with pagination, validation and stable Problem Details; test client-visible contracts. |
| [Spring Security](content/java-spring/09-spring-security.md) | Add authorization to the runnable app and test 401, 403 and CSRF paths separately. |
| [Caching/async](content/java-spring/10-spring-caching-async.md) | Add a bounded cache/async experiment with invalidation, overload and cancellation behavior. |
| [Testing/production](content/java-spring/11-spring-testing-production.md) | Connect slice/integration tests, Actuator, graceful shutdown and deployment checks to the same app. |

## Delivery order and release gates

1. **Give the 33 OS/networking/DBMS lessons a usable entry.** Add prerequisites, two to four testable outcomes, and a first attempt in small batches. Start with subnetting, CPU scheduling and SQL because they bridge multiple later lessons. Keep each topic within the content contract and verify its diagrams and questions.
2. **Make the three practical tracks reproducible.** Add network/OS diagnostic labs and a seeded PostgreSQL SQL lab. Publish exact setup, expected observations and cleanup; test on the declared versions. Keep labs safe for a personal machine.
3. **Advance the existing Task Tracker rather than starting a second app.** Add persistence/transactions, then security and production behavior in independently testable milestones. Each lesson points at the specific runnable step it teaches.
4. **Review technical accuracy with a source ledger.** Prioritize current Linux scheduler and I/O behavior, TCP/QUIC/TLS protocol claims, transaction/isolation/durability, JVM version differences and Spring Boot/Security behavior. Record dated primary sources and distinguish implementation details from contracts. The DBMS Q1/Q3/Q9/Q13/Q14 correction is the first completed set, not a sign-off for the corpus.
5. **Expand interview feedback after review.** The 20-question rubric pilot demonstrates a canonical content format. Review the model answer before adding more rubrics, require a follow-up and misconception, and test both topic and category practice. Use learner attempts to decide which questions need additional feedback.
6. **Validate learning, not just pages.** Ask at least one novice and one backend engineer to complete a subnet calculation, an OS wait diagnosis, a SQL correction and a Spring endpoint change without coaching. Record confusion and incorrect answers, revise the lesson, then rerun the content, example, frontend, backend, browser and accessibility checks relevant to the change.

**Status:** this document is a complete inventory and prioritized teaching audit of the 56 core lessons, with targeted factual checks. It is **not** a claim that every technical assertion or exercise has undergone expert review, or that the remaining work has shipped.

## Accuracy implementation checkpoint

The [technical accuracy ledger](CONTENT_ACCURACY_REVIEW_2026-10-01.md) now records the first DBMS package: recovery/durability/MVCC explanations and their interview answers were corrected together; the transaction lesson has an explicit beginner outcome; and concurrency includes a live-verified read-versus-lock exercise plus a transactional queue claim. The current core corpus is 26,413 lines (DBMS 6,263), with 241 diagrams and 785 Q&As; the inventory above remains the initial audit snapshot. C01 remains open for the other openings and fuller prerequisite links. C03 still needs the end-to-end SQL dataset. C05 remains open for the rest of the source-review queue, and C08/C09/C10 remain open for broader feedback and executable learning tracks.

## October 2 checkpoint — initial persistence and JPA accuracy

C04/C09 now have an initial JPA/H2 Task Tracker milestone with twelve passing tests, including
transaction failures and file reopen persistence. The memory path remains available. Versioned
migrations, shared business transactions, relationships/fetching, pagination, security, caching and
production behavior are still pending. C05 now has three scoped lesson reviews across DBMS and
Java/Spring; [the source ledger](CONTENT_ACCURACY_REVIEW_2026-10-01.md) records J01–J12 and limits.
The live corpus now contains 32,531 lines, 295 diagrams and 953 Q&As; original audit inventory
numbers above are historical. OS/networking review and the seeded SQL fixture remain open.


## October 2 continuation checkpoint

The [delivery checkpoint](CURRICULUM_COMPLETION_2026-10-02.md) supersedes the earlier pending
milestone descriptions: seeded SQL plus OS/loopback networking labs, Spring migrations/relationships/
pagination/security/caching/operations, and optional spaced-review histories/mixed sessions are
implemented in an isolated branch. Twenty-two more rubrics bring authored feedback to 42 questions.
The [source ledger](CONTENT_ACCURACY_REVIEW_2026-10-01.md) now covers nineteen scoped core reviews;
37 core reviews remain. [Learner study tasks](LEARNER_USABILITY_STUDY.md) are prepared, but real
sessions, revisions informed by them and retesting remain open. Container checks require a running
daemon/CI result. Do not close those items from structural tests or an automated browser pass alone.
