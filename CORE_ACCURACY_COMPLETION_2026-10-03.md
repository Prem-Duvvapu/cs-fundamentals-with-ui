# Core accuracy completion — October 3, 2026

Priority: complete the remaining 37 core reviews before other product work. Each review covers the full lesson, consequential claims and interview answers; this is source-backed technical review, not learner testing or a guarantee about every deployment. Java 17 is the executable baseline; newer language features are labeled. Existing question prompts and diagram sources are preserved unless a correction requires otherwise.

## Review queue

- [x] [01b-java-execution-pipeline.md](content/java-spring/01b-java-execution-pipeline.md)
- [x] [01c-java-memory-model.md](content/java-spring/01c-java-memory-model.md)
- [x] [01d-java-oop-pillars.md](content/java-spring/01d-java-oop-pillars.md)
- [x] [01e-java-static-final-records.md](content/java-spring/01e-java-static-final-records.md)
- [x] [01f-java-functional-lambdas.md](content/java-spring/01f-java-functional-lambdas.md)
- [x] [01h-java-collections-framework.md](content/java-spring/01h-java-collections-framework.md)
- [x] [01i-java-streams-optional.md](content/java-spring/01i-java-streams-optional.md)
- [x] [01j-java-hashmap-internals.md](content/java-spring/01j-java-hashmap-internals.md)
- [x] [01k-java-reflection-exceptions.md](content/java-spring/01k-java-reflection-exceptions.md)
- [x] [01m-design-patterns-solid.md](content/java-spring/01m-design-patterns-solid.md)
- [x] [02-spring-bean-lifecycle.md](content/java-spring/02-spring-bean-lifecycle.md)
- [x] [03-spring-mvc-lifecycle.md](content/java-spring/03-spring-mvc-lifecycle.md)
- [x] [05-spring-batch-lifecycle.md](content/java-spring/05-spring-batch-lifecycle.md)
- [x] [06-quartz-scheduler.md](content/java-spring/06-quartz-scheduler.md)
- [x] [07-spring-boot-internals.md](content/java-spring/07-spring-boot-internals.md)
- [x] [01-process-management.md](content/os/01-process-management.md)
- [x] [04-synchronization.md](content/os/04-synchronization.md)
- [x] [06-file-systems.md](content/os/06-file-systems.md)
- [x] [08-disk-scheduling.md](content/os/08-disk-scheduling.md)
- [x] [00-network-fundamentals.md](content/networking/00-network-fundamentals.md)
- [x] [00b-physical-layer-media.md](content/networking/00b-physical-layer-media.md)
- [x] [01-osi-model.md](content/networking/01-osi-model.md)
- [x] [02-data-link-layer.md](content/networking/02-data-link-layer.md)
- [x] [03-ip-subnetting.md](content/networking/03-ip-subnetting.md)
- [x] [04-routing-algorithms.md](content/networking/04-routing-algorithms.md)
- [x] [05-tcp-ip.md](content/networking/05-tcp-ip.md)
- [x] [06-tcp-congestion.md](content/networking/06-tcp-congestion.md)
- [x] [08-network-security.md](content/networking/08-network-security.md)
- [x] [09-network-performance-qos.md](content/networking/09-network-performance-qos.md)
- [x] [00-dbms-introduction.md](content/dbms/00-dbms-introduction.md)
- [x] [01-dbms-architecture.md](content/dbms/01-dbms-architecture.md)
- [x] [02-er-model.md](content/dbms/02-er-model.md)
- [x] [03-relational-algebra-calculus.md](content/dbms/03-relational-algebra-calculus.md)
- [x] [04-functional-dependencies-keys.md](content/dbms/04-functional-dependencies-keys.md)
- [x] [05-dbms-indexing.md](content/dbms/05-dbms-indexing.md)
- [x] [05c-storage-raid-indexing.md](content/dbms/05c-storage-raid-indexing.md)
- [x] [08-query-optimization.md](content/dbms/08-query-optimization.md)

## Evidence and corrections

| Lesson | Consequential claims reviewed / corrections | Primary evidence |
|---|---|---|
| Java execution | File-host restrictions; independent java.* definition guard; lazy resolution; erroneous initialization and diagnostic cause chains; illustrative HotSpot tiers. | [JLS 7](https://docs.oracle.com/javase/specs/jls/se17/html/jls-7.html), [JLS 12](https://docs.oracle.com/javase/specs/jls/se17/html/jls-12.html), [JVMS 5](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-5.html), [ClassLoader](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/ClassLoader.html) |
| Java memory | Reference/value trace; floating-point encoding; volatile ordering; data races need no physical overlap; final-field safety versus publication; interruption cooperation; scalar replacement versus stack allocation; literal interning and strong retention. | [JLS 17](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html), [String API](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/String.html), [JVMS 5](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-5.html) |


| OOP | Overload phases/most-specific rules; covariant dispatch; protected receiver restrictions; optional mutators versus LSP; constructor hazards. | [Primary reference](https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.12.2) |
| Records/static/final | Shallow equality hazards; constructor versions; final-field semantics; initializer Error wrapping; Java 21 record-pattern and sequenced API boundaries. | [Primary reference](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html) |
| Lambdas | Non-sealed SAM contract; Object exclusions; capture identity; checked exceptions in Callable versus java.util.function; nonconstant interface fields. | [Primary reference](https://docs.oracle.com/javase/specs/jls/se17/html/jls-9.html#jls-9.8) |
| Collections | Optional mutations; PriorityQueue arbitrary removal versus head complexity; root-parent boundary; TreeSet comparator/equals consistency; pinned growth source. | [Primary reference](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/PriorityQueue.html) |
| Streams/Optional | Nested mapping shapes; elided peek/count callbacks; Optional null behavior; groupingByConcurrent ownership; resource closing; locale assumption. | [Primary reference](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/stream/Stream.html) |
| HashMap | Full threshold/treeification/source comparison; tree-bin lookup limits and existing example preserved; CHM coordination distinctions; lookup failure versus strong retention. | [Primary reference](https://github.com/openjdk/jdk/blob/jdk-17%2B35/src/java.base/share/classes/java/util/HashMap.java) |
| Reflection/exceptions | Checked Throwable/Error boundaries; finally termination; empty/no Code exception tables; executor Future failures; exports versus opens; retention versus scanning. | [Primary reference](https://docs.oracle.com/javase/specs/jls/se17/html/jls-11.html) |
| SOLID/patterns | Contract-based substitution and injection; outbox duplicates; transactional local dedup versus remote delivery/reconciliation; code-excerpt scope. | [Primary reference](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html) |
| Spring beans | PostConstruct inside BPP; prototype injection lifetime; final proxy constraints; failed-start cleanup; immediate probe release; configurable rollback defaults. | [Primary reference](https://docs.spring.io/spring-framework/reference/core/beans/factory-nature.html) |
| Spring MVC | Advice/filter boundary; async redispatch/interceptor callbacks; body conversion timing; request ID cardinality; stage budgets versus p95 arithmetic. | [Primary reference](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-async.html) |
| Spring Batch | Boot BOM 6.0.5; legacy/new builder distinction; resourceless versus persistent repository; writer Chunk contract; skip-stage recovery; processor-only concurrency in the new model. | [Primary reference](https://github.com/spring-projects/spring-batch/wiki/Spring-Batch-6.0-Migration-Guide) |
| Quartz | Boot BOM 2.5.2; RAM versus JDBC persistence; durability flag; public/internal states; explicit cron catch-up and linked trigger; recoverable claims. | [Primary reference](https://www.quartz-scheduler.org/documentation/quartz-2.5.x/tutorials/tutorial-lesson-09.html) |
| Spring Boot | Boot 4 MVC starter; removed Undertow; Jackson 3; runner/readiness timing; dependency probe policy versus framework defaults. | [Primary reference](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide) |

| Processes | fork/COW, descriptor offsets, exec, waiting/SIGCHLD; runnable POSIX feature-test macro; historical CFS sketch versus EEVDF. | [Primary reference](https://man7.org/linux/man-pages/man2/fork.2.html) |
| Synchronization | wait releases its own monitor; permit restoration; spurious weak CAS; release/acquire edge; lock-free atomic implementation condition; RCU lifetime versus freshness. | [Primary reference](https://eel.is/c++draft/atomics.order) |
| File systems | cross-filesystem rename versus copy/delete; Linux sync versus POSIX; ext4 journal ordering scope; private/shared mappings; unlink versus live references. | [Primary reference](https://man7.org/linux/man-pages/man2/rename.2.html) |
| Disk scheduling | FCFS/SSTF/SCAN arithmetic; finite trace endpoints; C-LOOK return movement; bounded-load fairness; NVMe versus media; fsync failure/directory durability. | [Primary reference](https://docs.kernel.org/block/blk-mq.html) |
| Network fundamentals | switch eligible ports and CAM exhaustion; circuit/datagram distinctions; topology counts; BDP delay assumption; MPLS ordering limits; jitter versus variance; P4 language versus runtime. | [Primary reference](https://www.rfc-editor.org/rfc/rfc3393) |
| Physical media | Gaussian-noise and zero-ISI formula assumptions; power SNR; scrambling versus run limits; NRZI convention; PCM filtering margin. | [Primary reference](https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf) |
| OSI/TCP-IP | router header mutations; unencrypted encapsulation arithmetic; MSS advertisement versus option-adjusted data; naming, proxy, offload and failure boundaries. | [Primary reference](https://www.rfc-editor.org/rfc/rfc9293) |
| Data link | CRC burst bounds; contention/backoff simplification; SR/GBN windows and lifetime assumptions; VLAN MTU; local retries versus remote effects. | [Primary reference](https://www.rfc-editor.org/rfc/rfc1662) |
| IP/subnetting | /26 and VLSM arithmetic; /31 and /32 exceptions; aligned aggregate octets; routing-table lookup; DORA/T1/T2; ND/NAT/traversal boundaries. | [Primary reference](https://www.rfc-editor.org/rfc/rfc3021) |
| Routing | working Dijkstra queue updates and stale entries; nonnegative costs/complexity; per-area topology; RIB/protocol selection order; LOCAL_PREF scope; RPKI limits. | [Primary reference](https://www.rfc-editor.org/rfc/rfc4271) |
| TCP/UDP | sequence trace, half-close, backlog distinctions and existing idempotency corrections preserved; 2×MSL specification versus OS policy; MSS option handling. | [Primary reference](https://www.rfc-editor.org/rfc/rfc9293) |
| Congestion | new-send credit; next-byte ACK; Reno FlightSize threshold, 16.5 versus rounded 16 MSS and temporary recovery inflation; BBR version scope; current CUBIC RFC. | [Primary reference](https://www.rfc-editor.org/rfc/rfc5681) |
| Security | SAN identity versus Common Name; certificate versus PSK handshake; PSK/0-RTT forward-secrecy limits; authenticated webhook versus atomic local dedup/remote contract. | [Primary reference](https://www.rfc-editor.org/rfc/rfc8446) |
| QoS | correct 1 MB/10 Mb/s delay to 0.8 s; token-bucket rolling-window envelope; tenant versus flow fairness; cache key variation; stage budgets versus percentile sums. | [Primary reference](https://www.rfc-editor.org/rfc/rfc2697) |
| DBMS introduction | dialect scope; nullable UNIQUE/FK/CHECK rules; PostgreSQL WAL/status versus generic physical undo; page/scan/tree arithmetic and engine ownership. | [Primary reference](https://www.postgresql.org/docs/18/ddl-constraints.html) |
| DBMS architecture | schema versus deployment tiers; MiB/GiB correction; backfill must capture concurrent writes before cutover; view/security/connection-pool limitations. | [Primary reference](https://www.postgresql.org/docs/18/sql-createview.html) |
| ER modeling | independent surrogate key removes strict key-based weakness while existence dependence remains; alternate NOT NULL keys; missing diagram owner PK/minimum count; offering-section assumption. | [Primary reference](https://db-book.com/slides-dir/PDF-dir/ch6.pdf) |
| Relational algebra/calculus | outer joins require extended algebra; bags/NULL and semijoin multiplicity; empty division candidate universe; filter page savings need an access path; materialization width assumption. | [Primary reference](https://www.postgresql.org/docs/18/queries-table-expressions.html) |
| Keys/FD/cover | full closures/canonical cover and projected-dependency implication; missing employee-department FD; nullable SQL rules; deferred versus deferrable; versioned skip scan. | [Primary reference](https://db-book.com/slides-dir/PDF-dir/ch7.pdf) |
| B/B+ trees | B-tree range traversal is not a full descent per key; sparse page directory scope; unique MVCC dedup allowed versus INCLUDE prohibited; later key columns/skip scan; covering visibility lab. | [Primary reference](https://www.postgresql.org/docs/16/btree-implementation.html) |
| Storage/RAID | two-way mirror assumptions; rebuild output versus aggregate reads; full stripe not atomic; scrub does not identify correct bytes; URE rating versus toy probability; bitmap word work; BRIN selectivity. | [Primary reference](https://docs.kernel.org/admin-guide/md.html) |
| Query optimization | per-loop averages versus total work; buffer reads versus physical I/O; output K in join cost; 52 frames cannot hold 100 uncompressed pages; partition-fit/skew assumptions; custom plans and PostgreSQL memory allowances. | [Primary reference](https://www.postgresql.org/docs/18/using-explain.html) |

## Verification

- Production frontend build, **19/19** gate regression tests, existing SQL fixture and **2/2** OS/network observation tests pass.
- Full content/real-Mermaid validation: **68/68 lessons**, **83/83 coverage entries**, **295 diagrams** pass.
- Whole-corpus Markdown rendering and interview parsing: **210/210 tests** pass; reader controls: **21/21**.
- Java 17 marked lesson compilation/execution: **15/15 programs** pass.
- Additional Java contract fixture and PostgreSQL 16.15 accuracy fixture pass; seven SQL assertions cover null constraints, EXISTS bags and division universes.
- Migration evidence: **109/109** resolved and verified; two corrected literal quotes are synchronized without altering archived question payloads/digests.
- Diagram manifest: **295 entries/590 assets** pass; all 37 changed lessons preserve canonical question prompts and Mermaid sources, so regeneration is unnecessary.
- Platform backend: **59/59 tests**; Spring example: **19/19 tests**, zero failures/errors/skips.
- Authored fork C program compiles with strict C11/POSIX warnings and produces `parentValue=7`, `nextByte=B`, `childExit=0`.
- PostgreSQL covering-index fixture returns `42, 142, 242, 342, 442`; observed heap fetches change from 0 after vacuum to 1 after the payload update, with unchanged results.

The baseline is Java 17, PostgreSQL 16.15 for live SQL, and the repository’s Boot 4.1.1 BOM (Framework 7.0.9, Batch 6.0.5, Quartz 2.5.2). Source review also uses Java 21/25, PostgreSQL 18, MySQL 8.4 and current normative RFCs with their boundaries identified. Dated textbook author slides support stable ER/FD theory, not current engine implementation claims.

Scope: **37/37 requested reviews completed**, completing **56/56 core scoped reviews** together with the previous 19. AI/ML and DevOps freshness review is a separate twelve-lesson queue. Technical review and bounded fixtures do not establish beginner comprehension, every algorithm proof, hardware crash tolerance, or performance guarantees. No learner observations are invented.
