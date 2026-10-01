# Technical accuracy review — 2026-10-01

This ledger implements the accuracy work identified in [the learning/UX audit](PROJECT_LEARNING_UX_AUDIT_2026-10-01.md) (A06) and [the core curriculum audit](CORE_CS_CONTENT_AUDIT_2026-10-01.md) (C05). Its purpose is to prevent learners from memorizing an engine-specific implementation as a universal guarantee or repeating an unsupported production claim in an interview.

## Scope and completion rules

The first package reviews the explanations, diagrams, operational advice, and 14 interview answers in each of two DBMS lessons. It checks the high-risk recovery/isolation claims against primary sources and exercises selected SQL against PostgreSQL. **It is a scoped review of 2 of 68 lessons, not expert approval of the entire curriculum or every algorithm proof.**

The documentation baseline is PostgreSQL **18** and MySQL **8.4**. Runtime experiments used the locally available PostgreSQL **16.15**; they confirm the listed behavior on that version, not a test matrix for PostgreSQL 18, MySQL, device failures, or replication failover. ARIES is explained as a recovery algorithm, separately from either engine's implementation.

For each later package: read the whole lesson; identify the contract, mechanism, version, and failure assumptions; check consequential claims against primary sources; correct the teaching text and corresponding answers/rubrics together; run executable examples where available; regenerate changed diagrams; record verification and remaining limits. A structural content pass is necessary but cannot establish factual correctness or learner comprehension.

## Corrections in the DBMS package

| ID | Lesson / location | Previous claim or gap | Reviewed explanation / evidence |
|---|---|---|---|
| D01 | [Transactions](content/dbms/06-transactions-acid.md), beginner rollback and ACID | Rollback always restores a before-image from an undo log; any statement error automatically rolls back the entire transaction. | Separate InnoDB undo from PostgreSQL aborted-version visibility, and distinguish statement rollback from transaction rollback. See PostgreSQL visibility source and InnoDB error handling below. |
| D02 | Transactions, isolation matrix and doctor trace; Q8 | Repeatable Read universally prevents lost updates; Serializable always detects dependencies and aborts. | Mark lost-update behavior engine-specific. Explain PostgreSQL SSI aborts separately from blocking implementations. The absence of phantoms does not establish serializability. |
| D03 | Transactions, MVCC diagram explanation | A snapshot is effectively one transaction-ID cutoff; readers can never wait. | State the diagram's simplified commit-order assumption. Real snapshots include transactions in progress; locking reads, writer conflicts, and schema locks have different behavior. |
| D04 | Transactions, WAL and LSN; Q1/Q2 | All log records share one universal format; partially committed work exists only in RAM. | Scope the record fields to an illustrative ARIES model. Earlier pages/log records may already be on disk before durable commit. |
| D05 | Transactions, group commit; Q7 | Commits appended during a flush necessarily share it; every SSD has fixed flush latency and 50,000+ commits/sec. | Each commit waits for a flushed position covering its record. Replace hardware promises with an explicitly hypothetical 1 ms / 20-commit calculation. |
| D06 | Transactions, durability table and failure modes; Q9/Q13 | Zero loss under any hardware fault; exactly one second of possible MySQL loss; no process-crash loss for setting 2. | State flush/storage assumptions, configurable intervals, and the manual's scheduling/process-exit caveats. Separate asynchronous acknowledgement, local durability, binary-log durability, and replication failover. |
| D07 | Transactions, checkpoints; Q11 | Fuzzy checkpoints never block queries, all engines use ARIES ATT/DPT records, redo scans backward. | Explain forward analysis and redo, distinguish PostgreSQL checkpointing, and acknowledge I/O/synchronization costs. |
| D08 | Transactions, buffer-policy table and ARIES overview; Q4/Q5/Q10 | 100% of commercial engines use the same recovery design; PostgreSQL performs classic ARIES row undo; every savepoint stores an LSN and emits CLRs. | Scope STEAL/NO-FORCE consequences to classic in-place overwrites. Explain PostgreSQL visibility/subtransactions separately from ARIES undo and InnoDB undo records. |
| D09 | Transactions, worked ARIES trace and diagram; Q5/Q6 | Redo recreates the exact lost RAM state; final compensation jumps past the BEGIN record; ABORT marks completed rollback. | State which log and page writes survived. Redo missing logged history, follow the remaining BEGIN/PrevLSN chain, and distinguish END from abort initiation. Compensation is redoable and never itself undone. |
| D10 | Transactions, engine details and torn-page advice; Q12 | All WAL segments are 16 MB; device sector size alone establishes atomic page-write guarantees. | Identify 16 MB as PostgreSQL's configurable default, and distinguish database page size from device atomic-write behavior. |
| D11 | Transactions, failure modes and misconceptions; Q14 | Any long PostgreSQL transaction retains WAL; CAP means replicas physically change simultaneously. | Separate old-snapshot vacuum bloat from slot/archive/retention causes. Describe linearizability through externally observable operation order. |
| D12 | Transactions, beginner opening and ambiguous commit | No clear outcomes; a commit timeout can be mistaken for rollback. | Add prerequisites, outcomes, and a payment scenario. Explain unknown commit outcomes, unique business idempotency keys, and the separate external-effect boundary. |
| D13 | [Concurrency](content/dbms/07-concurrency-control.md), queue example | A bare locking SELECT may release its claim before processing when used in autocommit. | Provide a PostgreSQL CTE that skips locked candidates, updates the claim status, and returns the claimed payload in one transaction. State empty-result and abandoned-job handling. |
| D14 | Concurrency, timestamp ordering and Thomas Write Rule | Basic timestamp-ordering restarts universally retain their original age; obsolete writes can be ignored without checking later reads. | Distinguish restart timestamps from age-based deadlock-prevention priorities, and explain the read-timestamp rejection before obsolete-write elimination. Full formal proof review remains separate. |
| D15 | Concurrency, MVCC and engine differences; Q14 | MVCC's slogan reads as an unconditional no-wait guarantee; broad locking-scan advice is engine-neutral. | Explain the scope of ordinary snapshot reads. Name InnoDB range/record locks and distinguish PostgreSQL's nonblocking SSI predicate tracking. Preserve the manifest's required MVCC heading phrase. |
| D16 | Concurrency, retry advice and misconceptions | Deadlock and lock-wait timeout can be read as identical rollback boundaries. | State InnoDB's default statement-only timeout rollback, with explicit whole-operation rollback decisions before business retries. |
| D17 | Concurrency, new two-session exercise | Readers have no reproducible way to observe the MVCC/lock distinction. | Add a fixture, session order, expected 10/9 values, rollback/commit variants, and cleanup. The SQL fences were extracted from the lesson for live verification. |

## Primary-source ledger

Sources were accessed on **2026-10-01**. These links support the specified mechanisms; they are not independent benchmarks or blanket correctness certificates.

| Source | Used to check |
|---|---|
| [PostgreSQL 18: transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html) | Snapshot boundaries, Read Uncommitted mapping, Repeatable Read conflict rejection, write skew and SSI. |
| [PostgreSQL 18: explicit locking](https://www.postgresql.org/docs/18/explicit-locking.html) | Plain SELECT table locks, locking reads, schema conflicts, and deadlock recovery. |
| [PostgreSQL 18: WAL introduction](https://www.postgresql.org/docs/18/wal-intro.html) | Log-before-data ordering, redo, and shared durable flushes. |
| [PostgreSQL 18: WAL settings](https://www.postgresql.org/docs/18/runtime-config-wal.html) and [asynchronous commit](https://www.postgresql.org/docs/18/wal-async-commit.html) | Commit acknowledgement, flush assumptions, full-page images, checkpoint costs and asynchronous-loss behavior. |
| [PostgreSQL 18: replication settings](https://www.postgresql.org/docs/18/runtime-config-replication.html) | Slots and WAL retention limits. |
| [PostgreSQL 18: initdb](https://www.postgresql.org/docs/18/app-initdb.html) | Configurable WAL segment size. |
| [PostgreSQL REL_18_STABLE: tuple visibility](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/access/heap/heapam_visibility.c) and [transaction internals](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/access/transam/README) | Aborted tuple visibility, transactions in progress and savepoint subtransactions. |
| [MySQL 8.4: InnoDB settings](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html#sysvar_innodb_flush_log_at_trx_commit) | Redo write/flush modes, scheduling caveats, storage behavior and binary-log settings. |
| [MySQL 8.4: multiversioning](https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html) | Undo chains, consistent reads, secondary/clustered access and purge horizons. |
| [MySQL 8.4: statement lock footprints](https://dev.mysql.com/doc/refman/8.4/en/innodb-locks-set.html) | Locking scans, missing indexes, record and gap protection. |
| [MySQL 8.4: savepoints](https://dev.mysql.com/doc/refman/8.4/en/savepoint.html) and [error handling](https://dev.mysql.com/doc/refman/8.4/en/innodb-error-handling.html) | Partial rollback, remaining locks, deadlocks versus lock-wait timeouts. |
| [MySQL 8.4: redo log](https://dev.mysql.com/doc/refman/8.4/en/innodb-redo-log.html) and [doublewrite buffer](https://dev.mysql.com/doc/refman/8.4/en/innodb-doublewrite-buffer.html) | Versioned file organization and torn-page protection. |
| [Original ARIES paper, Mohan et al.](https://people.eecs.berkeley.edu/~brewer/cs262/Aries.pdf), especially sections 1, 4, 5 and 6 | Scope of the algorithm, log chains, compensation, checkpoints and repeating logged history. |
| [CMU 15-445/645: timestamp ordering](https://15445.courses.cs.cmu.edu/fall2023/slides/17-timestampordering.pdf), slides 23–25 | Basic timestamp ordering and the read-timestamp check before Thomas Write Rule elimination. |
| [Gilbert and Lynch: Perspectives on the CAP Theorem](https://groups.csail.mit.edu/tds/papers/Gilbert/Brewer2.pdf), section 2 | Externally observable atomic consistency rather than simultaneous replica updates. |
| [PostgreSQL 18: SELECT](https://www.postgresql.org/docs/18/sql-select.html) | SKIP LOCKED queue semantics and locking clauses. |

## Verification and limits

Live PostgreSQL verification used a newly created disposable database, independent sessions, and lock-state observation; the database was dropped afterward. It checked:

1. The authored fixture and plain read return 10 while an update to 9 is uncommitted.
2. The authored locking read waits, then returns 10 after rollback and 9 after commit.
3. The authored queue claim skips a locked first job, persists a second job's `running` status, later claims the first job, and returns no row for an empty queue.
4. Repeatable Read preserves its earlier value across another session's commit and rejects a concurrent update.
5. The authored cleanup successfully drops the fixture.

The tests do **not** simulate power loss, dishonest device caches, filesystem corruption, MySQL internals, replication failover, or an actual ARIES implementation. Durability/recovery assertions are source reviews, not crash-test results. The 68-lesson validator and Markdown/interview rendering checks remain separate from these database observations. Three literal migration-evidence quotes were synchronized with their corrected explanations; their archived question payloads and digests were preserved (see RCA-2026-10-01-03).

## Release checks

| Check | Result |
|---|---|
| `node scripts/validate-content.mjs` | 68/68 lessons and 83/83 coverage entries pass; 295 Mermaid sources parse. |
| Markdown golden-file suite and interview parser suite | 210/210 tests pass across the complete lesson corpus. |
| Model-answer depth without optional rubrics | All 28 reviewed answers satisfy the standalone clause bar; question IDs remain stable. |
| Backend `mvn test` | 59/59 tests pass. |
| `node scripts/audit-simulation-questions.mjs` | 109/109 archived items resolved; current evidence quotes pass. |
| Diagram generation and `--check --decode` | Both changed sources regenerate; all 590 assets browser-decode and 295 manifest entries match. |
| Frontend production build | Passes, including its diagram prebuild gate. |
| Local documentation links | 146 targets checked, none missing. |
| Live PostgreSQL observations | All five checks above pass; disposable database removed. |

This package changes content, diagram assets and review documentation. Frontend application code and backend behavior are unchanged; the relevant corpus/render/parser suites and the complete backend suite were run, rather than asserting that the older full frontend run was rerun for this content package.

## Remaining review queue

| Next package | Claims to verify | Required evidence |
|---|---|---|
| Java/Spring JPA and transaction boundaries | persist/merge/remove state, flush versus commit, EAGER/LAZY contracts, N+1, proxy interception, rollback rules, optimistic locking | Jakarta Persistence specification, Hibernate and Spring references; runnable tests in the existing Task Tracker progression. |
| Java concurrency/JVM | happens-before, volatile versus atomicity, executor sizing, virtual threads and version-dependent pinning/GC | JLS, OpenJDK JEPs and JDK documentation; bounded execution examples. |
| Remaining DBMS lessons | optimizer estimates, index/storage trade-offs, distributed commit/quorums/CAP and executable SQL results | Engine references and original papers; clean schema/seed/query checks. |
| OS | modern Linux EEVDF, memory/page faults, readiness versus completion, filesystem/device assumptions | Current kernel documentation and man pages; bounded diagnosis labs. |
| Networking | TCP/QUIC ordering/retry, TLS/HTTP versions, congestion, subnet and routing assumptions | IETF RFCs and implementation documentation; protocol/command observations. |
| AI/ML and DevOps | changing provider/runtime interfaces, evaluations, cost assumptions, deployment and operational guarantees | Current primary references and reproducible examples, building on the already shipped beginner paths. |

The earlier audits stay open for these packages, broader interview feedback, full lab milestones and learner validation. New technical content should carry the same source/version/failure boundaries as this package.
