# Persistence incident lab

Practice database histories, concurrency repairs, query plans and the original incidents using **actual PostgreSQL, Hibernate/JPA, HikariCP and PostgreSQL backup tools**. The data is a small original fixture; there is no real account, payment, customer or external service. Read the linked lessons for the concepts, then use this lab to predict a failure, observe evidence, diagnose it, apply a fix and explain its limits.

Prerequisites: [JPA entity lifecycle and N+1](../../content/java-spring/04-jpa-hibernate-lifecycle.md), [query optimization](../../content/dbms/08-query-optimization.md), [transactions and recovery](../../content/dbms/06-transactions-acid.md), [practical SQL](../../content/dbms/12-sql-querying.md) and [production testing](../../content/java-spring/11-spring-testing-production.md).

## 1. Run the evidence, not just the guard tests

Requirements: Java 17+, Maven, Python 3.12+, and a local PostgreSQL 16 server with matching `psql`, `pg_dump` and `pg_restore` tools. The checked local run used Java 17, PostgreSQL/tools **16.15**, and Spring Boot **4.1.1** dependency management: Hibernate **7.4.5.Final**, HikariCP **7.0.2**, PostgreSQL JDBC **42.7.13**. This is a standalone Maven teaching module, not a Spring service.

From the repository root:

```sh
python3 -m unittest discover -s examples/backend-persistence -p 'test_verify.py' -v
mvn -B -f examples/backend-persistence/pom.xml verify
```

The first command runs **15 provisioning, privacy, cancellation and process-budget guards** without connecting to PostgreSQL. The Maven command resolves the declared dependencies, passes two Java guards and **skips ten actual PostgreSQL tests**. It does not prove database behavior. Run it once before the actual runner: the runner uses offline Maven with empty settings and a finite deadline, so an empty dependency cache fails rather than silently using a different graph. The dedicated workflow performs this dependency-resolution step explicitly.

To run the complete exercise against an already-running local server:

```sh
PERSISTENCE_ADMIN_MODE=socket python3 examples/backend-persistence/verify.py
```

Socket mode uses `/var/run/postgresql`, your operating-system username, and port 5432. That local administrator must be able to create roles and databases, and administer their later cleanup. The generated application role connects over `127.0.0.1` with a generated password, so the existing server must already permit that local password connection. The runner does not install PostgreSQL, change authentication, alter existing roles or modify server configuration. Do not run it against a shared/production server. `PERSISTENCE_ADMIN_PORT` can select another explicitly local port.

For an already-provisioned private local TCP server, set these environment variables without putting the password in shell history:

```sh
export PERSISTENCE_ADMIN_MODE=tcp
export PERSISTENCE_ADMIN_HOST=127.0.0.1
export PERSISTENCE_ADMIN_PORT=5432
export PERSISTENCE_ADMIN_USER=postgres
read -rs 'PERSISTENCE_ADMIN_PASSWORD?Local generated administrator password: '
export PERSISTENCE_ADMIN_PASSWORD
python3 examples/backend-persistence/verify.py
unset PERSISTENCE_ADMIN_PASSWORD
```

The `read` example is for zsh; in bash use `read -rs -p 'Local generated administrator password: ' PERSISTENCE_ADMIN_PASSWORD`. TCP mode requires a runtime administrator password of at least 32 characters. There is no committed default credential. The dedicated workflow creates its own digest-pinned PostgreSQL 16.15 container, generates its administrator password, and uses that container's matching backup tools. `PERSISTENCE_PG_TOOL_CONTAINER` is reserved for that explicitly named owned-container setup.

The actual runner:

1. Generates a unique application role and two unique databases.
2. Executes all **12 Maven tests** across five suites with the ten actual database tests enabled, then rejects missing/skipped/error/failure results.
3. Dumps a separate original fixture and restores it into the second fresh database.
4. Checks data, constraints and sequence behavior.
5. Removes only its two databases and its role, including failure paths; publishes the combined success report only after cleanup succeeds.

Successful output identifies `target/evidence/verification.json`. A failure exits nonzero. Redacted Maven output is in `target/evidence/maven.log`, with individual JUnit XML/text reports under `target/surefire-reports/`. A forced process/host kill can prevent `finally` cleanup; retain the failure logs and have the local server owner inspect only this run's generated resources. Never use a global database/role cleanup command.

## 2. N+1: equal results, different database work

**Predict.** Three projects each have two tasks. The project-to-tasks relationship is lazy. How many SQL statements execute when a new persistence context loads all projects and then accesses every project's tasks?

**Observe.** `diagnoseNPlusOneUsingActualPreparedStatementsAndEquivalentResults` records Hibernate's actual prepared-statement statistics:

| Query | Projects / tasks returned | Prepared statements |
| --- | --- | --- |
| Select projects, then visit lazy task collections | 3 / 6 | 4: one parent query plus three collection queries |
| Select projects with `left join fetch p.tasks` | Same ordered DTOs | 1 |

Each read uses a fresh `EntityManager`. Fixture creation is outside the measured window, statistics are reset, second-level/query caches are disabled and default batch fetching is zero. DTOs include each project's sorted task titles; equal parent counts alone would miss lost or duplicated child data.

**Diagnose.** Access to `project.tasks()` initiates additional work inside the transaction. A fast local response can conceal excessive round trips in production. These counts measure Hibernate-prepared SQL on this fixture, not every JDBC/protocol command or a throughput/latency benchmark.

**Fix.** Fetch the association required for this particular result, then check both query count and equivalent results. The test's fetch join is deliberately limited to one small collection. It does not justify making every relationship eager or fetch-joining several large collections.

**Change.** Add a fourth project to the fixture and update the expected DTO/count assertions. Predict the naive count before running. Then remove `join fetch` from the fixed query: the count assertion should fail even while results remain equal. Restore the original fixture after experimenting.

**Debug.** If a count unexpectedly stays at one, check whether you reused the first-level context, enabled batch fetching, stopped touching the children, or counted only the initial query. If a real endpoint paginates projects, investigate collection-fetch pagination and row multiplication before copying this query; consider a parent-ID page followed by an explicit fetch or a DTO query.

**Explain in an interview.** “I reproduced N+1 in a fresh context, measured 4 statements for 3 parents and checked all child data. A targeted fetch join reduced it to 1 with equal DTOs. I would separately check pagination, row volume and execution plans before applying it to a production endpoint.”

## 3. Pool exhaustion: timeout, release, recovery

**Predict.** The pool holds at most two connections. What happens when both are borrowed and a third worker requests one? Does increasing a query timeout solve a wait for a free connection?

**Observe.** `boundedPoolExhaustionTimesOutAndRecoversAfterRelease` borrows two actual PostgreSQL connections, observes one Hikari waiter, and requires the third borrow to fail with `SQLTransientConnectionException` near the configured **500 ms acquisition timeout**. It then closes one borrowed connection and successfully executes `SELECT 42` through a new borrow. The recorded local run observed 543 ms; this is a scheduling-sensitive diagnostic, not a performance promise.

**Diagnose.** A pool acquisition timeout means the caller could not obtain a connection within its deadline. It does not by itself prove a slow database query. Check active/idle/waiting connections, transaction age, leak/ownership boundaries, query latency, database locks and total connection capacity across all replicas.

**Fix.** In this fixture the cause is intentionally held connections; release one. In application code use `try`-with-resources or the framework's transaction lifecycle, keep remote calls outside long transactions where possible, and bound concurrent work to the downstream capacity. Raising the pool limit can move the bottleneck into PostgreSQL.

**Change.** Temporarily release a connection before the third borrow; predict that the timeout assertion now fails because the borrow succeeds. Restore the intentional incident afterward.

**Debug.** Separate the acquisition deadline from SQL execution, TCP/socket and transaction deadlines. A worker blocked before acquiring a connection cannot appear as an executing query on PostgreSQL. The lab caps the worker future, executor shutdown, Hikari acquisition and PostgreSQL statements rather than waiting indefinitely.

**Explain in an interview.** “I correlate pool saturation and waiting with database activity, fix leaked or long-held connections, then size the pool against database capacity and replica count. A successful query after release demonstrates recovery; it does not establish the right production pool size.”

## 4. Expand, backfill, contract—and compatible rollback

`ExpandContract.java` performs fixed SQL only in the current run's owned schema. `compatibleExpansionBackfillFencedContractAndRollbackPreserveData` exercises this timeline:

| Phase | Old binary: reads/writes `title` | Transitional binary | Evidence |
| --- | --- | --- | --- |
| Original schema | Works | Not deployed yet | Two original rows |
| Expand nullable `display_name` | Continues to work | Reads `COALESCE(display_name,title)` | An actual old-style insert succeeds |
| Backfill and dual write | Works while old column remains | Writes both columns | Old/new readers return equal data |
| Contract after retirement fence | Must already be retired | Move to new-only binary | Unretired fence rejected; injected pre-commit failure rolls DDL back |
| Committed contract | Intentionally fails | New-only writes work | Old read fails with PostgreSQL `42703`; new data preserved |
| Re-expand after new-only retirement fence | Restored | Fallback reader works | Copy new data to `title`, relax new-column NOT NULL, then actual old writer succeeds |

**Predict.** Why is adding a nullable column compatible while dropping a column is not? Why can a reverse migration that merely recreates `title` still break old writers?

**Observe.** The backfill processes two rows per batch, with at most ten batches and a final completeness check. Contract refuses an absent retirement fence, sets the new column NOT NULL, and drops the old column inside an explicit transaction. An injected exception before commit rolls back both DDL and data changes. After the committed contract, a new-only writer adds a fifth row. Re-expansion copies it back and permits a sixth old-style insert; both old and transitional readers see all six rows.

**Diagnose.** A schema can support old reads while still rejecting old writes. Leaving `display_name NOT NULL` would reject the old writer that supplies only `title`. Re-expansion must relax that constraint. Conversely, reintroducing `title NOT NULL` rejects a new-only writer that supplies only `display_name`: retire those incompatible binaries before backward migration.

**Fix.** Coordinate readers/writers and schema changes as separate deployable steps. The booleans are explicit teaching inputs representing independently established deployment retirement; they are **not** automatic proof that every instance, job or rollback artifact is gone. Backfill must finish, new writes must remain compatible, and validation must precede contract. A lingering old writer can reintroduce NULL new values and make contract fail safely.

**Change.** Remove the `DROP NOT NULL` step from backward expansion. Predict the old insert fails; observe PostgreSQL's constraint error. Restore the step. Try a false retirement fence and explain why the lab refuses the operation before DDL.

**Debug.** Inspect which binary wrote which columns and when. Pre-commit rollback differs from a backward migration after a committed release. A lossy transform cannot generally recover its original values by reversing column names. This fixture is a lossless rename with tiny data, PostgreSQL transactional DDL and short bounded locks; it does not prove zero-downtime migration, concurrent backfill correctness, cross-database DDL semantics or production rollback safety. The backward copy is intentionally tiny; a large table needs a separately planned bounded migration.

**Explain in an interview.** “I expand compatibly, deploy fallback reads and compatible writes, backfill and validate, then retire incompatible binaries before contract. Rollback must preserve data written after cutover and restore old write constraints, not just old column names. I validate that with an actual old writer.”

## 5. Restore a backup into a fresh owned database

**Predict.** Is `pg_dump` returning exit code zero enough to establish a useful backup? Would a row count catch missing foreign keys? Should a failed insert roll an identity sequence back?

**Observe.** `verify.py` creates three synthetic accounts and three entries linked by a foreign key. It runs real `pg_dump --format=custom` for that owned schema, then real `pg_restore --exit-on-error --single-transaction` into the second new database. It compares ordered JSON datasets, rejects an invalid foreign key and a negative balance, and checks restored identity behavior. The rejected CHECK insert consumes identity 4; `nextval` returns **5**, because sequence increments do not roll back with the failed insert.

**Diagnose.** A readable archive is not yet a verified application restore. Check actual data, relationships, constraints, indexes/ownership as relevant, sequences and the application's query/write path. This fixture checks data equality, foreign-key and CHECK enforcement, and identity state. It does not validate every database object or extension.

**Fix.** Restore into an isolated destination before considering cutover. This runner never restores over the source or any existing database. It uses `--no-owner --no-privileges` and the generated role, so it does not prove production ownership/grants have been restored. The dump is temporary and deleted; both generated databases and the role are removed even when a check fails.

**Change.** Temporarily change one original balance before the snapshot, rerun, and inspect the changed dataset hash. Separately omit a restore operation or break a constraint in a private experiment: the corresponding assertion must fail. Never experiment against a real application database.

**Debug.** Confirm tool/server version compatibility, source selection, archive format, restore exit status, destination ownership and constraint failures. The lab uses matching PostgreSQL 16.15 tools and a new destination, with SQL/lock/process deadlines. It does not demonstrate production RPO/RTO, point-in-time recovery, replication, high availability, disaster-region recovery, encryption/key recovery or backup retention.

**Explain in an interview.** “A backup is credible when I have restored it into isolation and checked data plus application invariants. I measure restore duration and recovery objectives separately. A successful small logical restore is not evidence of high availability or a production recovery SLA.”

## 6. Read committed, repeatable read and serializable: observe the history

Read [transactions](../../content/dbms/06-transactions-acid.md) and [concurrency control](../../content/dbms/07-concurrency-control.md), then inspect `PostgresIsolationTest`. Each history uses two real JDBC connections and committed SQL, not an in-memory isolation simulator.

**Predict.** A reader sees `(id=1,value=10)`. Another transaction changes it to 20 and inserts a matching second row. What can the reader see before the writer commits, after that commit, and in a fresh transaction?

| Requested isolation | While writer is uncommitted | Reader after writer commits | Fresh reader transaction |
| --- | --- | --- | --- |
| Read uncommitted | Original value 10, count 1 | Value 20, count 2 | Value 20 |
| Read committed | Original value 10, count 1 | Value 20, count 2 | Value 20 |
| Repeatable read | Original value 10, count 1 | Value 10, count 1 | Value 20 |
| Serializable | Original value 10, count 1 | Value 10, count 1 | Value 20 |

**Observe.** These assertions deliberately capture PostgreSQL 16 behavior. Its read-uncommitted setting behaves as read committed; its repeatable-read snapshot prevents the phantom in this history. A generic minimum-guarantees table is insufficient to predict an engine's behavior. The report retains the requested JDBC value, actual `SHOW transaction_isolation` text and observed values/counts.

**Diagnose.** Read committed takes a new snapshot for each statement. Repeatable read keeps the transaction snapshot. That repeatable view does not alone protect a constraint involving several rows: the separate duty-roster history starts with two active workers; two repeatable-read transactions each read two, deactivate a different worker, and both commit with **zero active**. No single row suffered a lost update, but the cross-row invariant failed.

**Fix.** The serializable variant performs the same overlapping read decisions. PostgreSQL rejects one transaction with `40001`. A command in that still-failed transaction returns `25P02`; repeating only the failed statement cannot repair it. `TransactionRetry.run` rolls back, closes the borrow and starts the **whole decision** in a fresh transaction. Its second read sees one active worker and leaves that worker active. The recorded transaction IDs differ.

**Change.** In the private fixture, replace serializable with repeatable read while keeping the invariant assertion: predict why the assertion fails. Restore the original level. Explain why locking every relevant invariant row can be another design, and why locking only the row each worker modifies would not protect this example.

**Interview answer.** “I choose isolation from the invariant and the engine's actual behavior. PostgreSQL repeatable read prevents these phantom reads yet permits this write skew. Serializable detects the conflicting decisions; I retry the complete aborted transaction, re-read and revalidate, with a finite attempt budget.”

## 7. Retry a known aborted transaction, stop when the budget ends

**Predict.** Is a duplicate-key error retryable? Is a connection drop during commit proof that no change committed?

**Observe.** The exhaustion case forces **three actual `40001` conflicts** against successive competing commits. The helper stops at three fresh transaction IDs and preserves the competitor's value 3. A real duplicate-key `23505` stops after one attempt. The helper also excludes `08006` and lock-timeout `55P03` from automatic retry; those exclusions are policy assertions, not induced network-failure evidence.

**Diagnose.** Only `40001` and `40P01` are recognized as known-aborted transaction states in this small helper. It never converts unknown commit outcome into “failed, safe to repeat.” An external side effect inside the closure would not be undone by SQL rollback. Use idempotency/outbox mechanisms for that boundary.

**Fix.** Keep the unit of retry an entire bounded transaction. The sample caps attempts at three, schedules no retry after its eight-second budget, and uses a small fixed 10/20 ms teaching delay. Statement/socket/connection deadlines remain independent bounds. This is not a hard preemption deadline or a measured production contention/backoff policy.

**Change.** Set the maximum attempts to one: the successful-recovery scenario must stop with its first serialization failure. Restore the original. Explain how exponential backoff with jitter and a caller deadline would be selected under measured load rather than copied blindly.

**Interview answer.** “Retrying the whole transaction can recover a known serialization abort; it does not make arbitrary errors or unknown commits safe. I cap attempts and total scheduling time, re-read state on each attempt, and keep nontransactional effects outside the retry closure.”

## 8. Actual deadlock, lock-order repair, optimistic versus pessimistic updates

`PostgresLockingTest` uses two worker-owned connections plus one observer. Only its generated schema contains fixture rows.

**Predict.** Worker A updates row 1 then row 2; worker B updates row 2 then row 1. Both hold their first row lock before proceeding. How does this differ from one worker simply waiting for another?

**Observe.** The observer reads `pg_stat_activity` and `pg_blocking_pids` until it sees both directed blocking edges. PostgreSQL chooses one `40P01` victim; its whole transaction is rolled back. The other commits and both row values become 1. The test does not assume which worker loses.

**Fix.** Both repaired workers acquire rows in order 1 then 2. The observer proves the second waits for the first while the reverse edge is absent. Release the holder: both commit and values become 2. Consistent order repairs this two-row workload; other tables, triggers and resources must follow a consistent order too in a real system.

**Diagnose.** A `55P03` lock timeout in the earlier lab is not a `40P01` deadlock. One blocking edge is not a cycle. Correlate blockers, transaction age and the actual SQL state; abort/retry policy must preserve the business invariant.

The second test compares two concurrent counter updates:

| Strategy | Actual observation | Final value/version |
| --- | --- | --- |
| Optimistic `UPDATE ... WHERE version=?` | Both read version 0; one update changes zero rows and rolls back; a fresh decision/transaction succeeds | 2 / 2 |
| Pessimistic `SELECT ... FOR UPDATE` | Observer proves the second worker waits; after release it reads the committed winner's value 1 | 2 / 2 |

**Change.** Remove the optimistic version predicate in the private experiment. Which assertion now fails, and what additional read-modify-write pattern would produce an actual lost update? Restore it. For the deadlock repair, reverse only one worker's row order and predict the return of the cycle.

**Interview answer.** “Optimistic concurrency detects a stale application version by affected-row count; pessimistic locking waits before making the protected decision. Both still use database locks. I choose from conflict rate, invariant scope and wait budgets, then test both successful final state and conflict behavior.”

## 9. Composite covering index: preserve results, inspect actual work

`PostgresAccessPathTest` seeds **20,000 synthetic rows** and uses real `EXPLAIN (ANALYZE, BUFFERS, FORMAT XML)`. The fixed query filters `tenant=42 AND status='open'`, orders by `created_seq,id`, returns payload, and limits to 20.

**Predict.** Which columns should establish the equality prefix and ordering? Does `INCLUDE(payload)` make payload another search key?

**Observe.** Before the index the plan uses a sequential scan and sort. The index `(tenant,status,created_seq,id) INCLUDE(payload)` yields equivalent ordered rows via an index-only scan without a sort. The fixture explicitly vacuums/analyzes first; its observed heap-fetch count is zero. A broad aggregate still chooses a sequential scan. The receipt records sanitized node types, actual/estimated rows, buffers, index size and write WAL counters; it records no query or data values from outside this fixture.

**Diagnose.** A covering index can answer this projection, but visibility checks can still require heap access when pages are not all-visible. `INCLUDE` increases index storage/write work without extending the search-key order. The broad-query case prevents treating “any sequential scan” as a performance bug.

**Fix.** Compare result equality and plan work for the actual query. The deep-offset query reads **80 index rows** to return 20; the equivalent tuple-cursor query reads **20**. An `EXPLAIN ANALYZE ... UPDATE` actually executes the update: this test uses an explicit transaction, observes nonzero WAL records, rolls back, and rechecks original query results. Rollback does not erase already-generated WAL. These counts are fixture observations, not throughput or latency promises.

**Change.** Remove `INCLUDE(payload)` and predict why the index-only assertion fails. Restore it. Explain the difference between estimated rows, actual rows per loop, buffer activity and wall-clock latency before proposing an index for production.

**Interview answer.** “I start from filters, ordering and projection, then compare plans and equivalent output. This selective query benefits from the composite covering index, while the broad query does not. I account for visibility, write amplification, index size and workload rather than claiming every index is an improvement.”

## 10. Pagination under insert, delete and mutable ordering

The small feed orders by **`position,id`**: the unique ID is a tie-breaker, not a claim that position never changes. First page `[1,2]` ends at tuple `(20,2)`.

| Change between pages | Offset page (`OFFSET 2`) | Keyset page (`WHERE (position,id)>(20,2)`) |
| --- | --- | --- |
| Insert ID 6 before the cursor | `[2,3]`: duplicates ID 2 | `[3,4]` |
| Delete ID 1 before the cursor | `[4,5]`: skips ID 3 | `[3,4]` |
| Move seen ID 1 after the cursor and unseen ID 4 before it | Not asserted in this case | `[3,1]`: repeats ID 1 and misses moved ID 4 |

**Predict.** Why does a stable tie-breaker avoid equal-key ambiguity but fail to freeze mutable sort values?

**Observe.** A separate repeatable-read transaction retains `[3,4]` as the remaining page despite concurrent insert/delete/reorder commits. Both offset and keyset agree within that snapshot. The test commits that short snapshot afterward; it does not keep a transaction open across web requests.

**Diagnose.** Keyset pagination avoids positional shifts from the first two mutations and limits deep-offset scan work. It is not automatically a snapshot of a changing result set. Decide whether the product promises a live feed, immutable-order traversal, or a stable export. Filters, tenant authorization and the whole ordering tuple must belong to the cursor contract; this SQL exercise does not implement a public cursor API.

**Change.** Remove `id` from `ORDER BY` in a private experiment. Explain why equal positions lose a deterministic order even if one execution happens to look stable. Restore the tie-breaker, then describe the retention and database cost of a long-lived snapshot versus materializing an export.

**Interview answer.** “I use keyset pagination for stable ordered traversal and deep-page efficiency, with a unique tie-breaker. Concurrent updates to the ordering key can still repeat or miss rows. For a stable export I need an explicit snapshot/materialization design and its lifetime/capacity limits.”

## 11. Boundaries, evidence and cleanup

The historical success evidence [2026-10-18-local.json](evidence/2026-10-18-local.json) was recorded on an actual local PostgreSQL 16.15 server, with **5/5 Maven tests, no skips**, five Python guard tests, actual dump/restore and successful resource cleanup. It is a sanitized small-fixture result, not a generated benchmark. The pool's observed milliseconds vary between runs.

The expanded [2026-10-23 local receipt](evidence/2026-10-23-local.json) records PostgreSQL 16.15, Java 17.0.20.1 and **12/12 Maven tests with zero skips**, all ten case groups, equivalent restored data and exact resource cleanup. The 14 Python guards also passed separately, including actual first TERM/INT during child cleanup. This local run does not establish Docker execution.

The expanded runner now requires **12/12 Maven tests with zero skips**, all ten case reports and actual restore before publishing success. Its receipt binds the normalized source hashes before/after execution and records the observed PostgreSQL, JDBC and Java runtime in the isolation case. Inspect `target/evidence/verification.json` from your run; the older five-test receipt does not establish the new cases.

The [dedicated workflow](../../.github/workflows/backend-persistence.yml) exercises the same actual runner with a pinned PostgreSQL 16.15 image, generated secrets and a no-skip gate. Its container provisioning/transport still requires its own CI run; the committed local evidence is not a claim that GitHub Actions or Docker ran locally.

| Boundary | Enforcement |
| --- | --- |
| JDBC destination | Explicit IPv4 loopback, generated source DB and matching role; no URL options |
| Administrator destination | Explicit socket or `127.0.0.1` TCP mode; no ambient `PGHOSTADDR`, service or options override |
| Ownership | UUID-generated DBs/role/schema; strict identifiers; cleanup targets only tracked resources |
| Credentials | Generated runtime secrets, environment transport, no secret CLI argument; administrator variables excluded from Maven's environment |
| Connection work | Pool max 2 (3 for two-worker-plus-observer tests), generated role connection limit 4, 500 ms acquisition, 250 ms validation; JDBC connect 2 s and socket 3 s |
| SQL | 3 s statement, 1 s default lock, 5 s idle-in-transaction limits; concurrency histories use explicit 2.2 s lock / 2.5 s statement limits; bounded backfill |
| Processes | 480 s work budget, separate 90 s exact-cleanup budget; 30 s PG tools, Maven 180 s; finite binary input/output and owned process-group termination |
| Resources | JUnit 30 s/original test, 35 s/concurrency test; owned executors/connections/EntityManagers/pools closed; temporary archive removed |
| Publication | Previous success report removed at run start; new success only after cleanup; failed/skipped actual tests reject verification |

Runtime artifacts stay under ignored `target/`; only reviewed sanitized evidence is committed. No learner telemetry is collected. The module deliberately does not add a second CRUD app, an in-memory substitute for PostgreSQL evidence, production credentials, or cloud dependencies.

TERM/INT cancellation is opt-in for the executable, leaves library callers’ signal handlers/masks unchanged, and defers delivery across process ownership and exact database cleanup. Repeated cancellation cannot interrupt that finite cleanup; SIGKILL or host failure can. Twelve actual tests and successful cleanup must be established by the runner, not inferred from compilation or guard tests.

The current 15 Python guards include actual first TERM/INT during handler restoration on both
normal and error exits with caller/nested scopes. Both handlers and outer state must be restored
even if the restored caller raises; its original exception and any body-error context propagate.
This supplements the historical local receipt's 14 guards; final actual-service CI verifies the
current helper separately from those earlier database observations.

Primary references: [Hibernate fetching strategies](https://docs.hibernate.org/orm/7.4/userguide/html_single/#fetching), [Hikari configuration](https://github.com/brettwooldridge/HikariCP#configuration-knobs-baby), [PostgreSQL 16 pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/16/app-pgrestore.html), [ALTER TABLE locks and constraints](https://www.postgresql.org/docs/16/sql-altertable.html) and [sequence non-rollback behavior](https://www.postgresql.org/docs/16/functions-sequence.html). Versions and references checked 2026-10-18.

Concurrency references checked 2026-10-23: [PostgreSQL 16 isolation](https://www.postgresql.org/docs/16/transaction-iso.html), [explicit locking and deadlocks](https://www.postgresql.org/docs/16/explicit-locking.html), [index-only scans and visibility](https://www.postgresql.org/docs/16/indexes-index-only-scans.html), and [LIMIT/OFFSET ordering and work](https://www.postgresql.org/docs/16/queries-limit.html). These explain the engine behavior the fixed local histories exercise.

The command helper defers cancellation through the complete stop/wait/pipe-close sequence. A
positioned regression sends the first actual TERM or INT after a READY-confirmed, TERM-ignoring
child reaches cleanup. The owned child must be killed and waited, its pipes closed, caller
handlers/masks restored and a separate process group left alive before cancellation is delivered.
This is bounded executable cleanup, not a SIGKILL or production database recovery guarantee.

Primary PostgreSQL16 references checked2026-10-23: [transaction isolation](https://www.postgresql.org/docs/16/transaction-iso.html), [serialization failure handling](https://www.postgresql.org/docs/16/mvcc-serialization-failure-handling.html), [explicit locking/deadlocks](https://www.postgresql.org/docs/16/explicit-locking.html) and [index-only/covering scans](https://www.postgresql.org/docs/16/indexes-index-only-scans.html). The sample deliberately rejects23505 automatically; PostgreSQL documents cases where application-specific retry may be appropriate. Determine that from the invariant rather than treating every unique violation as transient or permanently nonretryable.
