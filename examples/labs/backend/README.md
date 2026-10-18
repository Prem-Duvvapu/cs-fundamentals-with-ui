# Backend diagnosis: observe a cause before choosing a fix

These are the first practical **BE-01** (JVM diagnosis) and **BE-03** (database
incidents) exercises. They use original synthetic data and real local processes.
They do not complete those packages: IDE breakpoints, high CPU/JFR, bad Spring
configuration, N+1 queries, pool exhaustion, migration compatibility and restore
still need separate exercises.

Start with [Java concurrency](../../../content/java-spring/01l-java-multithreading-concurrency.md),
[query optimization](../../../content/dbms/08-query-optimization.md) and
[concurrency control](../../../content/dbms/07-concurrency-control.md). Read the
Beginner tier first. A **process** is a running program; a **thread** is one path
of work inside it. A **monitor** protects a Java object. A **transaction** groups
database work until commit or rollback. A **blocker** currently owns a resource
another operation needs.

## Setup and exact commands

Run from the repository root with Python 3.10+, a complete JDK 17+ (`java`, `javac`,
`jcmd`) on PATH, and PostgreSQL 16+ with `psql` on PATH. Java compilation targets
17; use the same JDK for its runtime and diagnostic tools. No Python packages,
Maven download, Docker daemon, cloud account or administrator role is needed.

```sh
java -version
javac -version
psql -X -w -d postgres -At -c 'select version()'
python3 examples/labs/backend/observe.py
python3 examples/labs/backend/database.py
python3 -m unittest discover -s examples/labs -p 'test_backend_*.py' -v
```

The database role needs `CONNECT`, database `CREATE` permission for a disposable
schema, and visibility into its own sessions. Use a dedicated local development
database. Configure `PGHOST`, `PGPORT`, `PGUSER` and `PGDATABASE` for your setup;
unset `PGHOST` to use your normal local Unix socket. Authentication can use your
normal local socket identity or a private password file; the code has no embedded
credentials and never prompts for a password. In CI, configure these through the
job's local PostgreSQL service environment, not a new committed default password.
The database defaults to `postgres` only when `PGDATABASE` is absent.

Both commands print a JSON observation or exit nonzero on failure. An installed
`psql` with an unavailable server fails the integration test: this is not passing
database evidence. Missing JDK/client causes explicit test skips; read the test
summary rather than counting those as exercised scenarios.

## 1. A request is stuck: two threads in a cycle

**Predict.** Alice holds a room's only key and needs Bob's key. Bob holds his key
and needs Alice's. Waiting longer alone cannot resolve the cycle. Predict the
states of `lab-left` and `lab-right` and what a thread dump must show to distinguish
a cycle from an ordinary short wait.

**Run and inspect.** `observe.py` compiles `DebugTarget.java` in a temporary
directory. It launches an owned child with a 64 MiB maximum Java heap. The fixture
starts two daemon threads, each acquires one monitor, then a latch makes both try
the opposite monitor. `ThreadMXBean.findDeadlockedThreads()` confirms the two-thread
cycle before the ready message. The runner addresses only that child's PID with
`jcmd <owned-pid> Thread.print -l` and returns the real dump in `deadlock.thread_dump`.

Find both named threads, their `BLOCKED` state, the monitor each holds and wants,
and the Java-level deadlock section. `deadlock.checks` must have four true values.
A `WAITING` thread alone does not prove deadlock; it might be waiting normally on
a condition. The cycle and held/requested resources are the decisive evidence.

**Change one thing.** Sketch a repair that always acquires `left` before `right` in
both workers. Remove the demonstration latch inside the locks too: that latch was
specifically placed to force the bad interleaving. Predict why one worker can now
finish before the other enters the first monitor. If you modify this fault fixture,
the existing test should stop reporting the expected cycle; add a separate repair
test asserting both workers finish within a deadline rather than weakening the
original fault assertion.

**Debug interview answer.** “I establish the wait-for cycle from a thread dump,
identify the code's inconsistent lock order, and enforce one order. A timeout can
bound a caller's wait but does not automatically release Java monitors held by a
deadlocked thread. I verify thread completion and data invariants after the fix.”
Changing everything to `volatile` does not fix this monitor cycle. Interrupting a
thread blocked on entry to `synchronized` is not a general recovery mechanism.

## 2. Memory stays high: reachable objects versus allocation

**Predict.** The fixture stores twelve 1 MiB byte arrays in the static `CACHE`
list. Finishing the allocation loop does not free them: the list still refers to
them. Predict whether a garbage collection can reclaim those reachable arrays.

**Run and inspect.** The second owned child reports ready after allocating and
touching the arrays. The runner requests `GC.class_histogram`, reads the live
`[B` entry (the JVM name for `byte[]`), sends `c` on its private input pipe, waits
for `CACHE.clear()` acknowledgement, then requests another histogram.
`retained_memory` reports the two byte counts and their difference. The assertion
requires a reduction of at least 8 MiB, not an exact heap size.

One local Java 17 observation released **12,583,072 bytes** of byte arrays. Exact
class totals vary with JDK implementation and startup allocations. The class
histogram operation can trigger collection and has significant diagnostic impact;
this is a small owned lab, not advice to run it repeatedly on a large production
heap. `released_bytes` is not the process RSS decrease: a JVM may retain committed
heap pages for reuse.

**Change one thing.** Temporarily replace `CACHE.clear()` with a no-op and predict
that the retained-byte assertion will fail. Restore it, then explain how a real
cache needs capacity/expiry/eviction appropriate to the product instead of clearing
all entries whenever memory rises. A single histogram cannot identify every root;
a real retention investigation may need a carefully authorized heap dump and paths
to GC roots. Do not confuse high allocation rate with unbounded retained objects.

**Debug interview answer.** “I separate allocation pressure from retention. Here a
static collection keeps byte arrays reachable. Removing those references changes
the live histogram; it does not guarantee the OS immediately receives every page.
I would validate the cache policy and compare repeated evidence under a workload.”

## 3. A query reads too much: inspect the access path

**Predict.** There are 10,000 jobs and 1,000 customers, ten jobs per customer. The
primary-key index is on `id`, but the query filters on `customer_id=42`. Predict
how many rows match and why an index on a different column may not help.

**Run and inspect.** `database.py` creates a UUID-named schema, one table and the
original synthetic rows in an atomic setup transaction. It runs `EXPLAIN (ANALYZE,
BUFFERS, FORMAT JSON)` before and after adding `jobs(customer_id)` and refreshing
statistics. The actual root row count must be **10** both times. Read
`plans.before_types`, `plans.after_types`, the actual rows, rows removed by filter,
buffer counts and the execution time in each full JSON plan.

One local PostgreSQL 16 observation changed **Seq Scan → Bitmap Heap Scan + Bitmap
Index Scan**, with shared-hit blocks at the root **304 → 10**. Reported execution
times were 2.599 ms and 0.126 ms in that run. Those are observations, not a stable
speedup promise: cache state, host activity, settings and statistics affect plans
and timings. The test deliberately checks correct results, not a minimum speedup
or a universal planner choice. Shared buffer hits/reads do not directly measure
physical disk I/O; `Actual Rows` is per-loop information.

**Change one thing.** Change the predicate to select almost all customers; predict
why a sequential scan could again be cheaper. Keep the expected result count in
sync if experimenting. Also compare selecting only indexed columns with selecting
the payload; explain why a covering index has storage/write/visibility trade-offs.
The runner adds only one index and does not disable planner strategies to force a
preferred answer.

**Debug interview answer.** “I verify the query and cardinality, inspect its actual
access path and buffer work, then add an index matching the selective predicate.
I verify unchanged results and observe the new plan. Indexes add write and storage
cost; the best plan depends on selectivity, not the mere existence of an index.”

## 4. An update times out: identify the blocker

**Predict.** The holder transaction updates row 1 and leaves it uncommitted. A
second transaction updates row 1. Predict whether that means the CPU is busy and
whether retrying repeatedly would release the holder's lock.

**Run and inspect.** Two owned `psql` children report their backend PIDs. The holder
updates its row. The waiter uses a **3-second lock timeout** and **4-second
statement timeout**. A separate observation connection samples only the known
waiter PID and unique application name. It records `pg_stat_activity` wait fields
and `pg_blocking_pids(waiter)` and requires the known holder in the blocker list.
The waiter then must exit with **SQLSTATE 55P03** (`lock_not_available`). A local
observation showed `wait_event_type=Lock`, `wait_event=transactionid`, and precisely
the holder's PID as a blocker. The exact wait event may differ between supported
versions and execution paths; a transaction-ID wait can represent a conflicting
row update.

The `finally` block rolls back/closes the owned holder, closes the waiter and drops
only the generated schema. No unrelated backend is canceled or terminated. An
additional test injects a failure after plan inspection and verifies the created
schema was still removed. This demonstrates cleanup after a controlled exception,
not recovery after power failure or a forcibly killed runner.

**Change one thing.** Commit/roll back the holder before starting the conflicting
update; predict that the expected-lock-timeout test should fail because the fault
is gone. In a real service, keep transactions short and investigate unexpected
idle transactions. Retry only a suitable whole unit of work with a bounded policy;
blind retries can add more waiting requests and exhaust a connection pool.

**Debug interview answer.** “A timeout is a symptom. I correlate the waiting
operation with its blocker and transaction boundary before taking action. I end
the transaction I own, verify the waiter recovers, and shorten the transaction or
fix its missing completion path. A lock timeout differs from a statement timeout
and from proving a deadlock cycle.”

## Bounds, cleanup and troubleshooting

- Java children self-expire after 25 seconds; startup, compilation, attachment and
  subprocess waits also have deadlines. A stalled attach fails the lab. The runner
  terminates/kills only the exact children it created and removes its own files.
- The runner accepts no externally supplied PID or Java main-class selector.
  Attachment requires the same effective local user/group and compatible runtime
  support. Do not disable production attachment policies to make this lab pass.
- PostgreSQL accepts local Unix sockets and explicit loopback hosts only. Remote
  hosts/addresses, host lists, service profiles and database connection URIs are
  refused. Child `PGOPTIONS` is removed; `psql -X` ignores user startup commands.
- The schema name is generated internally and never supplied by a learner. Setup,
  query, lock and cleanup operations are bounded. Cleanup failure is an error.
  An abrupt runner kill/server failure can still leave a schema; it is not an
  automatic repair tool. Never broadly drop objects by matching a prefix.
- No heap dumps, real customer tables, production credentials or payment actions
  are used. Existing servers are neither restarted nor reconfigured.

## Primary references

- [JDK 17 jcmd commands and diagnostic impact](https://docs.oracle.com/en/java/javase/17/docs/specs/man/jcmd.html).
- [Java ThreadMXBean deadlock detection](https://docs.oracle.com/en/java/javase/17/docs/api/java.management/java/lang/management/ThreadMXBean.html#findDeadlockedThreads()).
- [PostgreSQL 16 EXPLAIN and actual plans](https://www.postgresql.org/docs/16/using-explain.html).
- [PostgreSQL 16 session activity and wait events](https://www.postgresql.org/docs/16/monitoring-stats.html).
- [PostgreSQL 16 lock and statement timeouts](https://www.postgresql.org/docs/16/runtime-config-client.html).
