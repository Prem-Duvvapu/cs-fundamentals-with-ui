# Persistence incident lab

Practice four database incidents using **actual PostgreSQL, Hibernate/JPA, HikariCP and PostgreSQL backup tools**. The data is a small original fixture; there is no real account, payment, customer or external service. Read the linked lessons for the concepts, then use this lab to predict a failure, observe evidence, diagnose it, apply a fix and explain its limits.

Prerequisites: [JPA entity lifecycle and N+1](../../content/java-spring/04-jpa-hibernate-lifecycle.md), [query optimization](../../content/dbms/08-query-optimization.md), [transactions and recovery](../../content/dbms/06-transactions-acid.md), [practical SQL](../../content/dbms/12-sql-querying.md) and [production testing](../../content/java-spring/11-spring-testing-production.md).

## 1. Run the evidence, not just the guard tests

Requirements: Java 17+, Maven, Python 3.12+, and a local PostgreSQL 16 server with matching `psql`, `pg_dump` and `pg_restore` tools. The checked local run used Java 17, PostgreSQL/tools **16.15**, and Spring Boot **4.1.1** dependency management: Hibernate **7.4.5.Final**, HikariCP **7.0.2**, PostgreSQL JDBC **42.7.13**. This is a standalone Maven teaching module, not a Spring service.

From the repository root:

```sh
python3 -m unittest discover -s examples/backend-persistence -p 'test_verify.py' -v
mvn -B -f examples/backend-persistence/pom.xml verify
```

The first command checks five provisioning/privacy guards without connecting to a database. The default Maven run passes two Java guards and **skips the three actual PostgreSQL tests**. It does not prove N+1, connection recovery, migrations or restore.

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
2. Executes all five Maven tests with actual database tests enabled, then rejects skipped/error/failure results.
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

## 6. Boundaries, evidence and cleanup

The success evidence [2026-10-18-local.json](evidence/2026-10-18-local.json) was recorded on an actual local PostgreSQL 16.15 server, with **5/5 Maven tests, no skips**, five Python guard tests, actual dump/restore and successful resource cleanup. It is a sanitized small-fixture result, not a generated benchmark. The pool's observed milliseconds vary between runs.

The [dedicated workflow](../../.github/workflows/backend-persistence.yml) exercises the same actual runner with a pinned PostgreSQL 16.15 image, generated secrets and a no-skip gate. Its container provisioning/transport still requires its own CI run; the committed local evidence is not a claim that GitHub Actions or Docker ran locally.

| Boundary | Enforcement |
| --- | --- |
| JDBC destination | Explicit IPv4 loopback, generated source DB and matching role; no URL options |
| Administrator destination | Explicit socket or `127.0.0.1` TCP mode; no ambient `PGHOSTADDR`, service or options override |
| Ownership | UUID-generated DBs/role/schema; strict identifiers; cleanup targets only tracked resources |
| Credentials | Generated runtime secrets, environment transport, no secret CLI argument; administrator variables excluded from Maven's environment |
| Connection work | Pool max 2, 500 ms acquisition, 250 ms validation; JDBC connect 2 s and socket 3 s |
| SQL | 3 s statement, 1 s lock, 5 s idle-in-transaction limits; bounded backfill |
| Processes | 30 s PG-tool deadline; Maven 180 s, then terminate/kill only its owned process group |
| Resources | JUnit 30 s/test; owned executors/connections/EntityManagers/pools closed; temporary archive removed |
| Publication | Previous success report removed at run start; new success only after cleanup; failed/skipped actual tests reject verification |

Runtime artifacts stay under ignored `target/`; only reviewed sanitized evidence is committed. No learner telemetry is collected. The module deliberately does not add a second CRUD app, an in-memory substitute for PostgreSQL evidence, production credentials, or cloud dependencies.

Primary references: [Hibernate fetching strategies](https://docs.hibernate.org/orm/7.4/userguide/html_single/#fetching), [Hikari configuration](https://github.com/brettwooldridge/HikariCP#configuration-knobs-baby), [PostgreSQL 16 pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/16/app-pgrestore.html), [ALTER TABLE locks and constraints](https://www.postgresql.org/docs/16/sql-altertable.html) and [sequence non-rollback behavior](https://www.postgresql.org/docs/16/functions-sequence.html). Versions and references checked 2026-10-18.
