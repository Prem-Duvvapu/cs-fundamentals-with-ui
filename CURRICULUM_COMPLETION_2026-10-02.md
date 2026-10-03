# Curriculum delivery checkpoint — October 2, 2026

**Current status — October 3:** the remaining 37 reviews are complete; see [the review ledger](CORE_ACCURACY_COMPLETION_2026-10-03.md). Core coverage is **56/56**. CI frontend/backend/labs/containers pass on main. Historical statements below describe the October 2 checkpoint; real learner sessions and AI/ML/DevOps freshness remain open.

Status: active implementation in `feat/2026-10-02-curriculum-completion`, isolated from the
main thread's dark-theme branch. This checkpoint records delivered work and explicit remaining
criteria. The four requested tracks are **not all complete**: 37 core accuracy reviews, actual
learner sessions and local/CI container execution evidence remain.

## Implemented and verified

1. **SQL/OS/networking labs:** checked PostgreSQL fixture covers outer joins, fan-out, NULL,
   ranking, deterministic ordering, constraints and rollback. Python observes a bounded child
   waiting/allocating/computing, temporary filesystem resources, TCP/HTTP partial reads and
   UDP datagrams/truncation. Setup, expected observations, cleanup and limits are in
   [the lab guide](examples/labs/README.md). PostgreSQL 16.15 and both Python tests pass.
2. **Spring milestones:** Flyway V1/V2 plus explicit legacy adoption, owner-scoped project/task
   CRUD, relationships, bounded pages, project version conflicts, Basic/role/CSRF checks,
   transaction-aware bounded caching and health/metrics. Nineteen example tests pass, plus
   a packaged real HTTP smoke for actual servlet errors, token/session behavior and SIGTERM.
   [The walkthrough](examples/java-spring/task-tracker/README.md) supplies exact commands,
   predictions, failure cases and deployment limits. The original memory/persistence paths remain.
3. **Interview feedback and spaced review:** 42 canonical authored rubrics (22 new), optional
   recording of written explanations/self-ratings, ten recent attempt snapshots per question,
   transparent review dates, postpone/reset actions and sessions of up to eight due/mixed
   questions. Exact question matching uses canonical lesson Markdown. Version-3 backup merges
   preserve local drafts/history and accept v1/v2 files. No automatic score/readiness claim.
4. **Accuracy review:** nineteen complete core lessons read, high-risk claims checked against
   dated primary sources, and corrections made alongside answers. [The source ledger](CONTENT_ACCURACY_REVIEW_2026-10-01.md)
   records contracts, runtime versions and limits. The sixteen new reviews cover CPU scheduling, memory management,
   I/O systems, JVM/GC, transport protocols, practical SQL, Spring Security, caching/async and
   testing/operations, application protocols, Java concurrency, distributed DBMS, deadlocks, Spring REST, normalization and generics. No question prompts or Mermaid sources changed in this package.
5. **Usability preparation:** [the real-learner protocol](LEARNER_USABILITY_STUDY.md) defines
   beginner/engineer tasks, unaided predictions, changed examples, next-day recall, observation
   records and revision/retest criteria. No participant observations are fabricated.

## Verification evidence

- Frontend: **683/683 tests**, including scheduling/history/merge, exact review selection,
  failed-load retry preservation, cancellation and the shared interview deck.
- Platform backend: **59/59 tests**; isolated Spring example: **19/19**.
- Packaged HTTP: health/readiness, authentication, real session CSRF, ownership, nested CRUD,
  page contract, stale version, metric exposure and idle graceful shutdown pass.
- Production frontend build and current diagram manifest check pass (295 diagrams/590 assets).
- Browser: **11 route families × 5 widths × 2 themes**, exact-question review journey and
  **16 axe scans**, all pass. This is automated accessibility/interaction evidence, not learner comprehension.
- Content: 68/68 lessons and 83/83 coverage mappings pass; the current-batch corpus renderer/interview parser passes 210 tests. The final deadlock structure/render checks and corpus question parsing pass (five focused tests). The 109-entry migration gate and fourteen marked Java programs pass. The Banker Python model produces the stated output.
- CI now runs PostgreSQL/Python labs, the packaged Spring HTTP smoke and a teaching-container
  readiness/nonroot/SIGTERM check. CI execution itself is not claimed as locally observed.

The Docker Desktop Linux engine is unavailable locally. The authored Dockerfile/CI smoke has
not been executed against a local daemon. H2, teaching identities and Caffeine do not establish
remote TLS, disaster recovery, multi-replica coherence or production load capacity.

## Core accuracy queue — completed October 3

The 37 entries below are now reviewed, with evidence in the October 3 ledger. Each unit read the whole
lesson, verify consequential claims with primary sources, correct answers together, run relevant
examples, retain question identity/migration evidence, and record its scope in the source ledger.

### java-spring: 15 lessons

- [x] [Java Execution Pipeline & JVM Architecture](content/java-spring/01b-java-execution-pipeline.md)
- [x] [Java Memory Model: Values, Objects, Strings, and Concurrency](content/java-spring/01c-java-memory-model.md)
- [x] [OOP Pillars & Dynamic Method Dispatch](content/java-spring/01d-java-oop-pillars.md)
- [x] [Java Classes, Immutability, Records & Modern Language Features](content/java-spring/01e-java-static-final-records.md)
- [x] [Java Interfaces, Functional Interfaces & Lambda Expressions](content/java-spring/01f-java-functional-lambdas.md)
- [x] [Java Collections Framework: List, Set, Queue & PriorityQueue](content/java-spring/01h-java-collections-framework.md)
- [x] [Java Streams API, Lazy Pipelines, and Optional](content/java-spring/01i-java-streams-optional.md)
- [x] [HashMap Bucket Internals, Treeification & ConcurrentHashMap](content/java-spring/01j-java-hashmap-internals.md)
- [x] [Java Reflection, Annotations, and Exception Handling](content/java-spring/01k-java-reflection-exceptions.md)
- [x] [SOLID Principles and Java Design Patterns](content/java-spring/01m-design-patterns-solid.md)
- [x] [Spring IoC Container, Bean Lifecycles & Auto-Configuration](content/java-spring/02-spring-bean-lifecycle.md)
- [x] [Spring MVC Request Lifecycle, Filters & Exception Resolution](content/java-spring/03-spring-mvc-lifecycle.md)
- [x] [Spring Batch Architecture, Chunk Execution Lifecycle & Fault Tolerance](content/java-spring/05-spring-batch-lifecycle.md)
- [x] [Quartz Scheduler Architecture, Clustering & Misfire Policies](content/java-spring/06-quartz-scheduler.md)
- [x] [Spring Boot Internals, Auto-Configuration, and Production Configuration](content/java-spring/07-spring-boot-internals.md)

### os: 4 lessons

- [x] [Process Management](content/os/01-process-management.md)
- [x] [Process Synchronization: Locks, Semaphores, Atomics, and RCU](content/os/04-synchronization.md)
- [x] [File Systems, Inodes, Journaling & Copy-on-Write](content/os/06-file-systems.md)
- [x] [Disk Scheduling & File Allocation](content/os/08-disk-scheduling.md)

### networking: 10 lessons

- [x] [Computer Network Fundamentals, Devices & Topologies](content/networking/00-network-fundamentals.md)
- [x] [Physical Layer: Transmission Media, Encoding, and Channel Capacity](content/networking/00b-physical-layer-media.md)
- [x] [Computer Networks: OSI & TCP/IP Reference Models](content/networking/01-osi-model.md)
- [x] [Data Link Layer, MAC, Framing & ARQ](content/networking/02-data-link-layer.md)
- [x] [IP Addressing, CIDR Subnetting, ARP, DHCP, and NAT](content/networking/03-ip-subnetting.md)
- [x] [Routing Algorithms, Link State & Distance Vector](content/networking/04-routing-algorithms.md)
- [x] [Transport Layer: TCP vs UDP & Connection Management](content/networking/05-tcp-ip.md)
- [x] [TCP Flow and Congestion Control: Windows, Loss, and Pacing](content/networking/06-tcp-congestion.md)
- [x] [Network Security: Cryptography, TLS, Filtering, and Resilience](content/networking/08-network-security.md)
- [x] [Network QoS, Traffic Shaping & Modern Networking](content/networking/09-network-performance-qos.md)

### dbms: 8 lessons

- [x] [DBMS Introduction & Architecture](content/dbms/00-dbms-introduction.md)
- [x] [DBMS Architecture, ANSI-SPARC & Data Independence](content/dbms/01-dbms-architecture.md)
- [x] [Entity-Relationship Modeling and Relational Mapping](content/dbms/02-er-model.md)
- [x] [Relational Algebra, Calculus & Advanced Joins](content/dbms/03-relational-algebra-calculus.md)
- [x] [Keys, Functional Dependencies, and Canonical Covers](content/dbms/04-functional-dependencies-keys.md)
- [x] [Database Indexing & B/B+ Tree Data Structures](content/dbms/05-dbms-indexing.md)
- [x] [Storage Engines, RAID, and Advanced Indexing](content/dbms/05c-storage-raid-indexing.md)
- [x] [Query Processing, Relational Trees, and Cost-Based Optimization](content/dbms/08-query-optimization.md)

## Closure still needs external evidence

- Run the container job with a functioning Docker daemon and record its result; fix any demonstrated failure.
- Conduct at least one beginner and one backend-engineer study session, capture confusion and
  incorrect models, revise from the findings, and retest changed tasks. The pending participant
  question is not answered by elapsed time.
- Merge this isolated branch into the active project through the main thread's integration flow;
  it has not modified or merged the ongoing dark-mode work.

## Current corpus

68 lessons; 32,922 lines; 295 Mermaid sources; 953 interview questions; 42 authored rubrics.


Final package gates: 68/68 lesson structures/syntax and 83/83 coverage mappings; 109/109 migration entries; fourteen marked Java programs compile/run with expected output. The final deadlock structure/render check and corpus question parsing pass; the migration evidence quote was synchronized and all 109 entries pass. Local commit hashes follow below.


## Local integration checkpoint

Implementation/content commit: **`ce82a0b`** on `feat/2026-10-02-curriculum-completion`.
This includes the runnable milestones, review UX, thirteen newly reviewed lessons, source ledger,
CI checks and learner-study protocol. RCA-2026-10-02-10/11/12 link to this resolving commit.
All 39 rubrics remain in canonical lesson Markdown. The final migration gate and six migration-tool
tests pass; all changed question prompts and Mermaid sources match the base. The branch is local
and has not been pushed or merged into the main thread. At this commit, 40 reviews remained;
the following batch updates the queue above to 37.


## Following review batch

Spring REST, normalization and generics add three scoped reviews: **19/56 core**, **37 pending**,
**42 rubrics**. The source ledger records consequential corrections and explicit runtime limits.
The PostgreSQL 16.15 BCNF query returns `S1|Databases|2`; changing one course removes the violation.
The marked Java gate now covers fourteen programs, and three intentionally invalid generic forms
are independently rejected by javac --release 17. Changed-lesson rendering, corpus question parsing,
structural validation and the unchanged migration evidence are checked before this batch's commit.
The generics gate caught seven unformatted angle-bracket types; inline code formatting fixes them,
and the lesson's real-Mermaid structural validation now passes (RCA-2026-10-02-13).

## October 3 completion and next work

All 37 checkboxes above are closed with source-backed corrections and runnable evidence,
completing 56 core reviews. Main CI run 37104855707 passes all four jobs, including the real
teaching-container check; PR #44 and the charcoal dark theme are already merged.

Next: review freshness of the seven AI/ML and five DevOps lessons, extend targeted exercises
and authored feedback, then revise from actual beginner/backend-engineer study observations.
The original Docker-daemon, branch-integration and frontend-CI pending statements above are
superseded by that evidence. Learner testing still requires participants; automated checks do
not substitute for them. Current corpus: **33,232 lines**, **68 lessons**, **295 Mermaid sources**,
**953 interview questions**, **56 authored rubrics**. The [October 3 feedback extension](INTERVIEW_FEEDBACK_2026-10-03.md) adds twelve answer-specific checklists in six reviewed lessons. Counts describe coverage, not teaching quality.

### October 3 feedback follow-up

The 37-review priority is merged in PR #45; main Verify run **37108096621** passes
all four jobs. Twelve new answer rubrics extend the recounted baseline of 44 to 56, including
remote retry ambiguity, spurious wakeups, route update ordering and atomic uniqueness.
The remaining 897 questions still receive the existing generic comparison prompts.
This bounded extension does not close the wider exercise/feedback program, the twelve
AI/ML/DevOps freshness reviews, or the participant study.
