# Reproducible SQL, OS and networking labs

These labs turn a lesson claim into a prediction, an observation and a limitation. Run from the
repository root. Python labs need Python 3; the OS lab needs Linux/WSL and `/proc`. SQL needs
`psql` and a reachable PostgreSQL 16+ database where your role can create temporary tables.
No lab needs an administrator account, packet capture, a public network service or privileged containers.

## First run

```sh
python3 examples/labs/os/observe.py
python3 examples/labs/networking/observe.py
python3 -m unittest discover -s examples/labs -p test_labs.py -v
psql -X -v ON_ERROR_STOP=1 -d postgres -f examples/labs/sql/verify.sql
```

Use PostgreSQL's normal `PGHOST`, `PGPORT`, `PGUSER` and `PGDATABASE` configuration if your database
is elsewhere. Keep passwords in your usual password file or environment; do not paste them into
source or screenshots. An authentication/connection failure means the fixture never ran.
The SQL file wraps temporary objects in a transaction and rolls it back. An error fails the process;
disconnecting also ends the transaction and removes temporary tables. Existing permanent data is untouched.

## SQL: grain, NULL, ordering and transaction boundaries

Prerequisites: [joins](../../content/dbms/03-relational-algebra-calculus.md),
[practical SQL](../../content/dbms/12-sql-querying.md), and
[transactions](../../content/dbms/06-transactions-acid.md).

1. Read the fixture: Ada has orders 100 and 50; Lin has paid 80 and cancelled 80;
   Grace has no order. Ada's 50 order has two payments, 30 and 20.
2. Predict paid-order revenue for each customer before executing the query.
3. Move the status predicate from the LEFT JOIN's ON clause into WHERE and predict which row disappears.
4. Predict the naive sum after joining orders to payment rows. Count both joined rows and distinct orders.
5. Compare pre-aggregation at one row per order. State what each sum measures: order value versus payments.
6. Contrast NOT IN with a NULL-containing set and NOT EXISTS. Explain unknown rather than treating NULL as zero.
7. Compare ROW_NUMBER with DENSE_RANK for Lin's equal amounts. Include a stable tie-breaker when one row is required.
8. Inspect the two ordered pages and EXPLAIN output. An index exists, but a four-row table can validly use a sequential scan.
9. Predict the row after UPDATE then ROLLBACK TO SAVEPOINT. Finally verify the outer rollback cleans the fixture.

| Result | Expected |
|---|---|
| Revenue by customer | Ada 150.00; Lin 80.00; Grace 0.00 |
| Ada naive joined sum | 200.00; three joined payment rows, two distinct orders |
| Ada pre-aggregated order/payments | Ordered 150.00; paid 150.00 |
| Customers without orders using NOT EXISTS | Grace |
| NOT IN with a NULL-containing set | No rows |
| Lin DENSE_RANK by amount | Both orders rank 1 |
| Stable page 1 | 101, 103 |
| Stable page 2 | 102, 104 |
| Post-savepoint amount for order 101 | 100.00 |

The automated checks fail on incorrect results or a missing CHECK constraint. Actual plans, timing
and buffer hits vary by version, statistics, hardware and cache. This fixture verifies correctness,
not index speedup or isolation under concurrent sessions. The concurrency lesson has its separate
two-session locking lab. In production, separate statements/pages under Read Committed need not
share one snapshot; stable ordering alone does not solve concurrent insertion/deletion drift.

## OS: waiting, memory faults and filesystem resources

Prerequisites: [processes](../../content/os/01-process-management.md),
[memory](../../content/os/02-memory-management.md) and [filesystems](../../content/os/06-file-systems.md).

1. Predict the state of a child waiting on a pipe with no data. It normally reports `S`, an interruptible sleep.
2. Release it and sample during bounded CPU work. `R` means runnable or running; a sampled state is not a CPU timeline.
3. Allocate and touch 8 MiB. Compare the added minor faults with the high-water RSS; do not interpret a minor fault as disk I/O.
4. Create 32 empty files and one 256 KiB file in a temporary directory. Compare logical data bytes with filesystem-wide free blocks/inodes.
5. Explain why many tiny files can exhaust inode capacity before byte capacity; the lab does not fill your filesystem to reproduce ENOSPC.
6. Confirm the child exits and the temporary directory is removed. On an assertion failure, inspect the platform and `/proc` availability first.

The owned file count is 33 and logical data bytes are 262144. Page-fault counts, RSS, sampled
states and free-space deltas vary with the allocator, filesystem, page size and concurrent host work.
`ru_maxrss` is a process high-water mark, not exact live heap size. Linux reports it in KiB.
The tests require observed allocation faults and bounded computation; they do not require an exact
fault count, a guaranteed `R` sample, disk pressure, swapping, OOM, or CPU-scheduler performance.

## Networking: name resolution, byte streams and HTTP errors

Prerequisites: [TCP/UDP](../../content/networking/05-tcp-ip.md) and
[application protocols](../../content/networking/07-application-layer.md).

1. Resolve localhost. This can use the hosts file and resolver configuration; it does not prove a DNS packet went to a recursive server.
2. Send an HTTP request over TCP and intentionally read at most three bytes per recv call.
3. Reassemble headers/body and verify Content-Length. TCP supplies an ordered stream; recv boundaries are not application messages or packet boundaries.
4. Compare `/ok` (200, `hello`) with `/missing` (404, `not found`). A successful TCP exchange does not imply successful application work.
5. Send one UDP datagram and its application-level acknowledgement on loopback. State what was observed and which guarantees UDP itself does not add.
6. Receive a second `long-message` datagram into a two-byte buffer: Linux returns `lo` and discards the remainder. Datagram boundaries do not promise a sufficiently large application buffer.
7. Verify listeners close. Everything binds to `127.0.0.1` on OS-assigned ports, with two-second socket timeouts.

The expected statuses/bodies are deterministic; address lists and receive-call counts are not.
A successful local UDP exchange establishes neither retransmission nor internet reliability.
This lab does not measure congestion, inspect TLS certificates, capture SYN packets or emulate QUIC.
Those require additional explicitly configured experiments; do not present loopback timing as a production latency target.

## Sources behind the observations

- [PostgreSQL 16 joins](https://www.postgresql.org/docs/16/tutorial-join.html),
  [window functions](https://www.postgresql.org/docs/16/tutorial-window.html), and
  [EXPLAIN](https://www.postgresql.org/docs/16/using-explain.html).
- [Linux proc PID stat](https://man7.org/linux/man-pages/man5/proc_pid_stat.5.html) and
  [getrusage](https://man7.org/linux/man-pages/man2/getrusage.2.html).
- [RFC 9293 TCP](https://www.rfc-editor.org/rfc/rfc9293.html),
  [RFC 9110 HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110.html) and
  [RFC 768 UDP](https://www.rfc-editor.org/rfc/rfc768.html).

## Core accuracy counterexamples — October 3

[The review ledger](../../CORE_ACCURACY_COMPLETION_2026-10-03.md) explains the corrected claims.
Run these additional fixtures; CI executes both:

```sh
psql -X -v ON_ERROR_STOP=1 -d postgres -f examples/labs/sql/accuracy.sql
accuracy_classes=$(mktemp -d)
javac --release 17 -d "$accuracy_classes" examples/labs/java/AccuracyContracts.java
java -cp "$accuracy_classes" AccuracyContracts
rm -r "$accuracy_classes"
```

SQL asserts nullable UNIQUE/CHECK/foreign-key behavior, rejection of false/missing-parent
values, retained duplicate left rows with EXISTS, division, and the empty-requirement case.
Grace has no held certification: she qualifies with an explicit candidate table and an empty
requirement set, but is absent from a candidate universe derived only from Holds. All objects
are temporary, the transaction rolls back, and any failed assertion makes psql fail.

Java asserts failed versus erroneous class initialization, direct propagation of initializer
Errors, primitive widening before boxing during overload resolution, a compatible inherited
logical SAM, Optional.map versus flatMap null results, and comparator-zero TreeSet identity.
Expect one PASS line and exit status zero; these are language/API counterexamples, not JVM
performance measurements. Compilation output is confined to the disposable directory.
