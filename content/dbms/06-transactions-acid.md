# Database Transactions & ACID Properties

## 🟢 Beginner Level

### The ATM Withdrawal Analogy
Picture an ATM handing you cash: it must **debit your account** and **dispense the notes** as one inseparable act. If the power dies after the notes come out but before the debit, the bank loses money; if the debit lands but the dispenser jams, you lose money. A **transaction** is the wrapper that makes the two actions indivisible: either both effects exist forever, or neither ever happened. Every ACID property defends one slice of that promise against crashes, concurrent users, and failing hardware.

### What is a Database Transaction?
A **Transaction** is a logical unit of database processing that includes one or more SQL operations (e.g., `SELECT`, `INSERT`, `UPDATE`, `DELETE`) executed as a single all-or-nothing unit of work.

```sql
BEGIN TRANSACTION;
  UPDATE accounts SET balance = balance - 500 WHERE account_id = 101;
  UPDATE accounts SET balance = balance + 500 WHERE account_id = 202;
COMMIT;
```
If any statement fails, issuing `ROLLBACK` reverses every change made so far in the transaction, restoring the pre-transaction state.

### The Four ACID Properties
1. **Atomicity**: "All or Nothing". Either all operations execute successfully, or the entire transaction is rolled back to its initial state. Enforced by the **undo log** plus Write-Ahead Logging. Without it, a mid-transfer crash leaves money debited but never credited.
2. **Consistency**: The database moves from one valid state to another, preserving schema invariants: `CHECK` constraints, foreign keys, unique keys, triggers, and application-defined business rules (debits equal credits). Enforced jointly by the DBMS constraint engine and correctly written transactions. Note: this is **not** the same "C" as in CAP theorem (covered in Expert Level).
3. **Isolation**: Concurrent transactions execute as if each had the database to itself, with no visible intermediate states leaking between them. Implemented by locking protocols or Multi-Version Concurrency Control (MVCC). Without it, two clerks updating the same ledger cell silently erase each other's edits.
4. **Durability**: Once `COMMIT` returns success, changes survive system crashes, power loss, or OS failures. Implemented by **Write-Ahead Logging**: the commit record is flushed to non-volatile storage before the commit is acknowledged to the client.

### Autocommit and Implicit Transactions
Every SQL statement runs inside some transaction, whether you open one or not:
1. **Autocommit mode** (default in MySQL and PostgreSQL): each statement is its own tiny transaction, committed immediately; a multi-statement business operation left in autocommit is really N independent mini-transactions with zero atomicity across them.
2. **Explicit transactions** (`BEGIN ... COMMIT`) are how you group work; connection pools often run with autocommit disabled during transactions and must return connections in a clean state, or the next borrower inherits an unexpectedly open transaction.
3. **Implicit transactions** appear around DDL in some engines: MySQL commits your open transaction before executing DDL, PostgreSQL wraps every statement, including DDL, in a transaction (a genuinely useful property: you can roll back a schema migration).

### Transaction State Transition Diagram

```
                     BEGIN
                       │
                       ▼
                  +---------+
     +────────────│ ACTIVE  │────────── read / write ─────────+
     │            +─────────+                                 │
     │  (restart        │                                     │
     │   or kill)       │ last statement executed             │ error /
     │                  ▼                                     │ deadlock
     │        +─────────────────────+                         │
     │        │ PARTIALLY COMMITTED │─────────────────────────┼───> +────────+
     │        +─────────┬───────────+        failure          │     │ FAILED │
     │                  │                                     │     +───┬────+
     │    commit record │                                     │         │
     │    flushed to    ▼                                     │         │ rollback
     │    stable disk +───────────+                           │ completes│
     │                │ COMMITTED │                          ▼         ▼
     │                +───────────+                    +──────────+ +---------+
     │                                                 │ ABORTED  │
     +────────────────────────────────────────────────>+──────────+
```

1. **Active**: Initial state; the transaction is executing operations and holds whatever locks or snapshots it needs.
2. **Partially Committed**: Final statement executed, but updates may still live only in the volatile buffer pool. The `<commit>` log record has not yet been flushed, so a crash right now would still roll this work back.
3. **Committed**: The commit record reached stable storage. The transaction permanently succeeded; durability now applies.
4. **Failed**: Interrupted by a runtime error, deadlock victim selection, constraint violation, or crash while Active or Partially Committed.
5. **Aborted**: Rollback finished; the database state is logically restored to before the transaction began.

### Anomaly Cheat Sheet
These four anomalies are the vocabulary of isolation. Each is a specific way two overlapping transactions corrupt each other's view of data:

| Anomaly | Symptom | Concrete Example |
| --- | --- | --- |
| Dirty Read | Reading uncommitted values of another transaction | T2 reads balance 500 that T1 wrote but then rolled back |
| Non-Repeatable Read | Same row returns different values on re-read | T1 reads balance twice; T2 commits an UPDATE in between |
| Phantom Read | Re-running a range query returns a different row set | T1 counts open orders twice; T2 INSERTS one in between |
| Lost Update | One overwrite silently erases another committed write | Two withdrawals read balance 100, both write their result, one vanishes |

## 🟡 Intermediate Level

### Isolation Levels vs Anomaly Matrix
SQL defines four isolation levels. Memorize this matrix; it is one of the most frequently drawn interview tables:

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read | Lost Update (read-modify-write) | Write Skew |
| --- | --- | --- | --- | --- | --- |
| READ UNCOMMITTED | Possible | Possible | Possible | Possible | Possible |
| READ COMMITTED | Prevented | Possible | Possible | Possible | Possible |
| REPEATABLE READ | Prevented | Prevented | Engine-specific | Mostly prevented | Possible |
| SNAPSHOT ISOLATION | Prevented | Prevented | Prevented | Same-row: prevented | Possible |
| SERIALIZABLE | Prevented | Prevented | Prevented | Prevented | Prevented |

Engine-specific reality checks:
- **PostgreSQL** implements REPEATABLE READ as **Snapshot Isolation**: each transaction sees one consistent snapshot, so phantoms vanish, but **write skew** remains possible until SERIALIZABLE (which uses Serializable Snapshot Isolation, SSI).
- **MySQL InnoDB** REPEATABLE READ (its default) layers MVCC snapshots with **gap locks / next-key locks** on indexed range scans, blocking phantoms for locked ranges; unindexed scans over-lock and can produce surprise deadlocks.
- **SQL Server** offers READ COMMITTED SNAPSHOT only if enabled per database (`ALTER DATABASE ... SET READ_COMMITTED_SNAPSHOT ON`); otherwise READ COMMITTED takes read locks.
- **Oracle** exposes only READ COMMITTED (statement-level snapshots) and SERIALIZABLE.

### Lost Update: Worked Example at READ COMMITTED
Both PostgreSQL and MySQL at READ COMMITTED happily allow the classic read-modify-write lost update:

```sql
-- Initial state: account 1 has balance = 100
-- SESSION T1
BEGIN;
SELECT balance FROM accounts WHERE id = 1;      -- reads 100
-- SESSION T2 (concurrently)
BEGIN;
SELECT balance FROM accounts WHERE id = 1;      -- also reads 100
-- SESSION T1 continues
UPDATE accounts SET balance = 100 - 40 WHERE id = 1;
COMMIT;                                         -- balance now 60 on disk
-- SESSION T2 continues, unaware
UPDATE accounts SET balance = 100 - 70 WHERE id = 1;
COMMIT;                                         -- overwrites using its stale copy
-- FINAL BALANCE = 30. The 40-dollar withdrawal evaporated.
```

Three fixes, in increasing intrusiveness:
1. **Make the write atomic** so the database computes it: `UPDATE accounts SET balance = balance - 40 WHERE id = 1`. The engine applies it to the latest committed row; no lost arithmetic.
2. **Lock first**: `SELECT balance FROM accounts WHERE id = 1 FOR UPDATE` takes an X lock before reading; T2 blocks until T1 commits.
3. **Escalate isolation**: PostgreSQL REPEATABLE READ turns this exact race into a `could not serialize access` failure (40001) for the second writer via snapshot-isolation **first-committer-wins** on the same row; SERIALIZABLE catches the general case. Caution: MySQL InnoDB REPEATABLE READ does **not** protect this pattern, because `UPDATE` uses a current (locking) read and will apply T2's stale computed value after T1 commits.

### Watching the Other Anomalies Happen
Non-repeatable read under READ COMMITTED (permitted):

```sql
-- SESSION T1
BEGIN;
SELECT balance FROM accounts WHERE id = 1;      -- sees 100
-- SESSION T2
UPDATE accounts SET balance = 200 WHERE id = 1;
COMMIT;                                         -- new committed value visible immediately
-- SESSION T1 again
SELECT balance FROM accounts WHERE id = 1;      -- sees 200: same txn, different answer!
COMMIT;
```

Phantom under READ COMMITTED (permitted):

```sql
-- SESSION T1
BEGIN;
SELECT COUNT(*) FROM orders WHERE status = 'open';   -- counts 10
-- SESSION T2
INSERT INTO orders (id, status) VALUES (99, 'open');
COMMIT;                                              -- new committed row exists
-- SESSION T1 re-runs the same predicate
SELECT COUNT(*) FROM orders WHERE status = 'open';   -- counts 11: a phantom appeared
COMMIT;
```

At PostgreSQL REPEATABLE READ both re-runs would return the original answers (100, then 10) because the whole transaction shares one snapshot; MySQL REPEATABLE READ behaves the same for plain SELECTs thanks to MVCC, while additionally gap-locking the scanned range against inserts.

### Write-Ahead Logging (WAL): The Durability Engine
**WAL Protocol Rule**: log records describing a change MUST reach stable storage BEFORE the corresponding dirty data page is written to disk, and the `<commit>` record MUST be flushed before the transaction is acknowledged.

```
   COMMIT PIPELINE (happy path)
   1. change applied in buffer pool (dirty page, stays cached)
   2. log record appended to WAL buffer
   3. COMMIT record appended
   4. fsync WAL to disk          <=== the only mandatory synchronous I/O
   5. acknowledge to client
   6. later: checkpoint lazily writes dirty pages (background)
```

Anatomy of an update log record (fields separated below by spaces):

```
   +------------------------------------------------------------------------+
   prev_LSN   TxnID   type=UPDATE   page_id   offset   old_image   new_image
   +------------------------------------------------------------------------+
```

The principal log record types every recovery algorithm consumes:

| Record Type | Purpose | Written When |
| --- | --- | --- |
| start | Marks a transaction active | First operation of Ti |
| update | Old/new image for one page change | Every insert, update, delete |
| commit | Durability point once flushed | Client issues COMMIT |
| CLR (compensation) | Redo-only record of an undo step | During rollback / ARIES UNDO |
| checkpoint begin/end | Anchors recovery scan start | Periodically, fuzzily |

Why WAL wins on performance: data pages are scattered randomly across the disk (slow random writes), while the log is pure sequential append (fast). WAL defers all random page flushing to background checkpoints, converting thousands of random I/Os into one sequential stream.

### Group Commit and Flush Settings
One `fsync` per commit serializes throughput at roughly `1 / fsync_latency`: a 1 ms SSD fsync caps a single stream near 1000 commits per second. **Group commit** fixes this: many concurrently committing transactions share one fsync, because the log flush at time T carries every commit record appended up to T. Under load, a 1 ms fsync batching 100 committers lifts the ceiling toward 100,000 commits per second. This is why throughput climbs with concurrency on WAL databases, up to lock-contention limits.

| Engine Setting | Default | Meaning and Risk Window |
| --- | --- | --- |
| InnoDB `innodb_flush_log_at_trx_commit` | 1 | 1 = fsync per commit (fully durable). 2 = write to OS cache per commit, fsync about once per second: loses roughly the last 1 second of transactions on OS crash. 0 = background thread flushes about once per second: loses about 1 second even on a mere MySQL restart. |
| PostgreSQL `synchronous_commit` | on | off = ack after writing to OS cache; loss window bounded by about 3 times `wal_writer_delay` (default 200 ms, so up to roughly 600 ms of acknowledged commits can vanish on OS crash). |
| PostgreSQL `wal_writer_delay` | 200 ms | How often the WAL writer wakes to flush the log buffer. |
| PostgreSQL `checkpoint_timeout` / `max_wal_size` | 5 min / 1 GB | Larger values spread checkpoints further apart: smoother runtime, longer crash recovery. |
| InnoDB `innodb_redo_log_capacity` | 100 MB | Bigger redo means less aggressive flushing and fuzzier checkpoints. |

### Checkpoints
A checkpoint forces enough of the log and dirty pages to disk that recovery can start scanning from the checkpoint instead of from the dawn of time. Modern engines use **fuzzy checkpoints**: they record which dirty pages existed (a Dirty Page Table) without stalling writes, then let ordinary background flushing converge. Trade-off dial: frequent checkpoints shorten crash recovery but steal I/O from foreground traffic; infrequent checkpoints maximize steady-state throughput but make restart painfully slow after a crash.

### Savepoints and Partial Rollback
Savepoints create resumable markers inside one transaction; rolling back to one undoes only the suffix:

```sql
BEGIN;
INSERT INTO orders VALUES (1, 'book');
SAVEPOINT before_payment;
UPDATE payments SET status = 'charged' WHERE order_id = 1;
ROLLBACK TO SAVEPOINT before_payment;   -- payment undone, insert kept
COMMIT;
```
Internally each partial rollback emits Compensation Log Records, exactly like a miniature ARIES undo pass (next level).

## 🔴 Expert Level

### ARIES Crash Recovery: Full Worked Trace
ARIES (IBM, C. Mohan) restores the database after a crash in three phases: **Analysis**, **Redo**, **Undo**. Walk the following mini-log. A checkpoint completed just before LSN 1 with an empty Dirty Page Table. T1 commits; T2 never does; then the server crashes.

| LSN | Log Record | Page | Old Value | New Value |
| --- | --- | --- | --- | --- |
| 1 | T1, start | | | |
| 2 | T1, UPDATE A | P1 | A = 100 | A = 150 |
| 3 | T2, start | | | |
| 4 | T2, UPDATE B | P2 | B = 500 | B = 520 |
| 5 | T1, UPDATE C | P3 | C = 70 | C = 75 |
| 6 | T1, commit | | | |
| 7 | T2, UPDATE D | P4 | D = 900 | D = 850 |
| 8 | T2, UPDATE B | P2 | B = 520 | B = 545 |
| crash | (T2 never wrote commit) | | | |

Phase 1, **Analysis**:
- Scan forward from the checkpoint. Winner set (committed): `{T1}`. Loser set (started, not committed): `{T2}`.
- Rebuild the Dirty Page Table. Here it starts empty, so the Redo pass must begin at LSN 1.

Phase 2, **Redo** ("Repeating History"):
- Replay every logged change forward in LSN order, winners and losers alike, restoring exact crash-time contents: P1.A = 150, P2.B = 520, P3.C = 75, P4.D = 850, then LSN 8 sets P2.B = 545. Even T2's uncommitted values are momentarily resurrected; that is intentional and required.

Phase 3, **Undo** (losers only, scanned backward), emitting CLRs as it goes:

| CLR LSN | Undoes | Action | UndoNxt Pointer |
| --- | --- | --- | --- |
| 9 | LSN 8 | Restore P2.B = 520 | 4 |
| 10 | LSN 7 | Restore P4.D = 900 | 3 |

- Reaching LSN 3 (T2 start) ends the rollback; ARIES writes `T2 abort`. Final state: A = 150, B = 520, C = 75, D = 900. T1's effects survived (durability); every trace of T2 is gone (atomicity).
- **Idempotency**: CLRs carry an UndoNxt pointer and are themselves redo-only records. If the server crashes again mid-Undo, the restarted Analysis phase sees the CLRs, knows that portion of T2 is already undone, and resumes cleanly. Losers can therefore be rolled back across arbitrarily many repeated crashes.

Why Redo repeats history instead of skipping losers: pages on disk may hold arbitrary mixtures of applied and unapplied changes, and physical undo of a half-written page is not meaningful. Only after Redo reconstructs the exact crash state is backward undo well-defined.

### Force / No-Force and Steal / No-Steal Buffer Policies
1. **Force at commit**: flush all of a transaction's dirty pages at commit. Simple recovery, but destroys performance (random I/O in the commit path).
2. **No-force**: dirty pages may stay cached after commit; recovery redoes winners from the log. WAL makes this cheap; nearly every engine chooses no-force.
3. **Steal**: the buffer pool may evict a page containing uncommitted changes. Requires CLRs so losers remain undoable. Chosen by virtually all engines because long transactions would otherwise exhaust memory.
4. **No-steal**: simplest rollback, but one big transaction can wedge the entire buffer pool.

WAL is precisely the combination **no-force + steal + CLRs**: maximum buffering freedom at runtime, with the log as the single source of truth for recovery.

### Why Sequential Log Appends Are the Whole Game
1. The commit path touches exactly one file position: the end of the log. Sequential writes avoid seek costs entirely, which historically meant 100x advantages over random page writes on spinning disks and still means predictable latency on SSDs.
2. Log buffer sizing matters: InnoDB `innodb_log_buffer_size` (default 64 MB) absorbs bursts before flushing; PostgreSQL `wal_buffers` defaults to about 1/32 of shared memory and rarely needs tuning beyond 16 MB.
3. Every durability feature is a variation on the same trick: describe changes compactly in an append-only stream, flush that stream eagerly, and let expensive page reorganization happen lazily in the background.

### Engine Internals: Two Durability Pipelines
- **InnoDB (MySQL)**: changes are wrapped in mini-transactions whose records go to a circular redo log sized by `innodb_redo_log_capacity`. The **doublewrite buffer** first copies flushed pages to a sequential area, defeating torn pages (a 16 KB page half-applied over 4 KB sectors after a crash). Binlog and redo are coordinated by an internal two-phase commit, with binlog group commit batching fsyncs across transactions (`binlog_group_commit_sync_delay` tunes it).
- **PostgreSQL**: WAL lives in 16 MB segments; `full_page_writes` logs the whole page image after a checkpoint boundary, the native defense against torn pages. Transaction status lives in the commit log (`pg_xact`, formerly clog) using 2 bits per transaction: IN_PROGRESS, COMMITTED, ABORTED, SUB_COMMITTED. Frequently-read pages cache inferred statuses as **hint bits** to avoid repeated lookups. `PREPARE TRANSACTION` supports true two-phase commit, but `max_prepared_transactions` defaults to 0, disabling it; orphaned prepared transactions hold locks and block VACUUM until resolved via `pg_prepared_xacts` and `COMMIT PREPARED`.

### Numbers Worth Quoting in Interviews
1. fsync latency dominates commit cost: NVMe roughly 0.05 to 0.5 ms, SATA SSD roughly 0.5 to 2 ms, spinning disk 5 to 10 ms. Single-stream ceilings: about 2000 commits/s on fast NVMe down to about 100/s on HDD.
2. Group commit scales one fsync across N waiting committers: 100 committers sharing a 1 ms fsync moves the theoretical ceiling from 1000/s toward 100,000/s.
3. PostgreSQL asynchronous commit (`synchronous_commit = off`) trades at most about 3 times `wal_writer_delay` (roughly 600 ms default) of acknowledged-work risk for a large latency win on write-heavy endpoints like logging tables.
4. InnoDB `innodb_flush_log_at_trx_commit = 2` risks about 1 second of commits on OS crash; setting 0 risks it even on a clean MySQL restart.
5. Doublewrite roughly doubles page-write traffic during checkpoint bursts; that is the price of torn-page immunity on 4 KB-sector devices.

### Production Failure Modes
1. **Torn pages**: storage that applies half a 16 KB page before losing power. Defenses: doublewrite (InnoDB) or full_page_writes (PostgreSQL). Disabling either for speed invites silent corruption, not just data loss.
2. **Lying storage**: Jepsen's storage audits found drives, RAID controllers, and VM hypervisors acknowledging fsync and then dropping data on power cut. Benchmark with `pg_test_fsync` and distrust consumer SSD write caches.
3. **Crash during Partially Committed**: all effects were in the buffer pool; without a flushed commit record ARIES classifies the transaction as a loser and erases it. Correct behavior, frequently mistaken by applications for "the database ate my writes".
4. **Long transactions**: one hour-long transaction pins the WAL/checkpoint horizon in InnoDB and the VACUUM horizon in PostgreSQL, ballooning disk usage and stretching the next crash recovery.
5. **Async-commit amnesia**: teams flip `synchronous_commit = off` for throughput, lose hundreds of milliseconds of "confirmed" orders in a power blip, and misdiagnose it as application bugs. Document the risk window next to the config change.

### Interview Questions

### Q1: Recite the isolation level versus anomaly matrix and add engine caveats.
**Answer**: Rows READ UNCOMMITTED through SERIALIZABLE; columns dirty read, non-repeatable read, phantom, lost update, write skew. Each level prevents everything the previous level does plus one more anomaly. Caveats: PostgreSQL REPEATABLE READ is really Snapshot Isolation (no phantoms, write skew still possible until SERIALIZABLE/SSI); MySQL InnoDB REPEATABLE READ adds gap and next-key locks suppressing phantoms on indexed ranges; SQL Server READ COMMITTED only behaves snapshot-style after enabling READ_COMMITTED_SNAPSHOT.

### Q2: The server crashed after my last statement ran but before COMMIT. Did my work happen?
**Answer**: No. You were in Partially Committed: effects lived in the buffer pool and possibly on disk, but the `<commit>` log record never reached stable storage. ARIES Analysis finds no commit record, classifies the transaction as a loser, Redo rebuilds the crash state, and Undo erases your changes with CLRs. Durability is defined by the flushed commit record, not by statement completion.

### Q3: Why must ARIES Redo replay loser transactions too ("repeating history")?
**Answer**: Because disk pages can contain arbitrary interleavings of committed and uncommitted changes, and neither undo nor redo is safely applicable to a page in an unknown intermediate state. Redoing the entire log from the checkpoint deterministically reconstructs the exact crash-time state, after which backward undo of losers with CLRs is well-defined and idempotent across repeated crashes.

### Q4: Compare force/no-force and steal/no-steal. Which pair do real engines pick and why?
**Answer**: Engines pick no-force + steal. No-force avoids random page writes in the commit path (the log flush suffices; recovery redoes winners). Steal lets the buffer pool evict pages of uncommitted transactions so one giant transaction cannot exhaust memory; CLRs make stealing safe by guaranteeing losers are always undoable. Force and no-steal are the safe-but-slow textbook corners.

### Q5: Is "Consistency" in ACID the same as "Consistency" in CAP?
**Answer**: No. ACID-C means a transaction preserves declared integrity constraints (foreign keys, checks, business invariants) and moves the database between valid states; it is a property of correct transaction logic. CAP-C means linearizability in a distributed store: every operation appears atomic at some instant between invocation and response, even across replicas. A single-node database makes no CAP claim at all; a perfectly linearizable cluster can still host constraint-violating data if the application writes nonsense.

### Q6: What exactly does `innodb_flush_log_at_trx_commit = 2` risk, and how do you reason about such settings?
**Answer**: Commits are written to the OS page cache and fsynced about once per second. A MySQL process crash loses nothing extra (the OS cache survives), but an OS or machine crash loses roughly the last second of acknowledged transactions. Reasoning template for any durability knob: identify the failure boundary (process, OS, machine, data center), the flush boundary (buffer, OS cache, device), and the resulting maximum loss window; then price it against business tolerance.

### Q7: How do savepoints relate to the log?
**Answer**: A `ROLLBACK TO SAVEPOINT` is a scoped undo pass: the engine scans its own log records backward to the savepoint LSN, reverses each change, and emits CLRs marking the region undone, leaving earlier records intact. The outer transaction continues appending after the CLRs, and a final COMMIT makes everything surviving durable in one fsync.
