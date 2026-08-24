# Concurrency Control, Serializability & Lock Protocols

## 🟢 Beginner Level

### The Shared Spreadsheet Analogy
Two colleagues open the same budget spreadsheet. Both see "Travel: 100". One types 150, the other types 180, and whoever saves last silently wins; the first edit evaporates without any error message. Databases face this constantly, thousands of times per second. **Concurrency control** is the referee: it uses locks, timestamps, or multi-version snapshots so that simultaneous edits compose into some sensible sequential story instead of random data loss.

### What Is Concurrency Control and a Schedule?
**Concurrency Control** is the database subsystem responsible for interleaving operations of multiple concurrent transactions safely, without violating Isolation or Consistency. A **schedule** (history) is the actual chronological order in which operations from concurrent transactions execute. A schedule is **serial** if its operations never interleave; serial schedules are always correct but waste all parallelism. The goal is to accept interleaved schedules that are provably equivalent to some serial one.

### Vocabulary You Will Hear
1. **Degree of concurrency**: how many transactions are mid-flight at once; higher degree means more interleaving and more anomaly risk.
2. **Conflict pair**: two operations from different transactions on the same item where at least one writes.
3. **Serializable schedule**: an interleaved schedule indistinguishable in outcome from running everyone one at a time.
4. **Recoverable schedule**: no transaction commits before every transaction whose data it read has committed (the bare minimum for crash correctness).

### Conflict Operations
Two operations Oi and Oj belonging to different transactions Ti and Tj **conflict** if both conditions hold:
1. They access the **same data item**.
2. At least **one of them is a WRITE**.

| Pair | Conflict? | Why |
| --- | --- | --- |
| Ri(A) then Rj(A) | No | Reads change nothing; order irrelevant |
| Ri(A) then Wj(A) | Yes | Swapping order changes what Ti reads |
| Wi(A) then Rj(A) | Yes | Swapping order changes what Tj reads |
| Wi(A) then Wj(A) | Yes | Final value of A depends on execution order |

Operations on different items never conflict, which is why interleaving unrelated work is always safe.

### When Interleaving Goes Wrong
T1 transfers 40 out of balance 100 while T2 transfers 70 out of the same balance. Interleaved read-modify-write lets both read 100, then write 60 and 30; the final state reflects only one withdrawal and the bank loses money. Everything in this topic exists to make that outcome impossible. The rest of the vocabulary follows from one question: which interleavings are safe to accept?

## 🟡 Intermediate Level

### Serializability and Precedence Graphs
Two schedules are **conflict-equivalent** if they involve the same transactions and every pair of conflicting operations appears in the same relative order. A schedule is **conflict-serializable** if it is conflict-equivalent to some serial schedule.

Precedence graph test:
1. Create one node per transaction.
2. For each conflicting pair where an operation of Ti precedes an operation of Tj on the same item, draw the directed edge Ti → Tj.
3. If the graph has **no cycles**, the schedule is conflict-serializable, and a topological sort gives an equivalent serial order. A cycle proves impossibility.

### Worked Example: Decide Schedule S Step by Step
Given `S: R1(A), W2(A), W1(B), R2(B)`:

Step 1, enumerate conflicting pairs:

| Pair (in order) | Items | Edge Added |
| --- | --- | --- |
| R1(A) before W2(A) | same item, one write | T1 → T2 |
| W1(B) before R2(B) | same item, one write | T1 → T2 |

No other cross-transaction pairs share an item, so no more edges exist.

```
      EDGE 1:  R1(A) precedes W2(A)     =>   T1 ----> T2
      EDGE 2:  W1(B) precedes R2(B)     =>   T1 ----> T2
      +--------+                 +--------+
      │   T1   │ ==============> │   T2   │
      +--------+                 +--------+
      No edge returns from T2 to T1  =>  ACYCLIC  =>  SERIALIZABLE
      Equivalent serial schedule:  T1 followed by T2
```

Contrast with a cyclic schedule `S': R1(A), W2(A), W2(B), W1(B)`:

```
      +--------+    R1(A) before W2(A):  T1 --> T2    +--------+
      │   T1   │ ------------------------------------> │   T2   │
      +--------+                                       +--------+
          ▲                                                │
          │            W2(B) before W1(B):  T2 --> T1      │
          └────────────────────────────────────────────────┘
      CYCLE T1 -> T2 -> T1  =>  NOT CONFLICT-SERIALIZABLE
```

Interview tip: enumerate pairs systematically by item; missing one pair is how candidates wrongly declare a cyclic graph acyclic.

### Sanity Check by Swapping
Conflict-equivalence gives a hand-friendly verification method: two ADJACENT operations from different transactions that do not conflict may be swapped without changing the outcome. If legal swaps can bubble one transaction's operations together, the resulting serial schedule proves serializability directly. For S above: W2(A) sits between R1(A) and W1(B); since A and B are different items, swap W2(A) rightward past W1(B), yielding R1(A), W1(B), W2(A), R2(B) which is exactly the serial schedule T1 then T2. In the cyclic counterexample no sequence of legal swaps separates the transactions, matching the graph verdict.

### View Serializability: The Broader Notion
Conflict serializability is sufficient but not necessary. Two schedules are **view-equivalent** if every transaction reads the same initial values, every read sees the same writer's write, and every item ends with the same final writer. A schedule can be view-serializable without being conflict-serializable only through **blind writes** (writes with no preceding read of that item by the same transaction); deciding view serializability in general is NP-complete, which is why every real engine implements the tractable conflict notion (or snapshot equivalents).

### Two-Phase Locking (2PL)
2PL guarantees conflict-serializability with two phases per transaction:
1. **Growing phase**: acquire shared (S) and exclusive (X) locks as needed; release nothing.
2. **Shrinking phase**: after releasing the first lock, no new lock may ever be acquired.

```
   LOCK COUNT
      ▲
      │        /\
      │       /  \        growing: acquire only
      │      /    \       shrinking: release only
      │     /      \
      │    /        \
      └───/──────────\──────────────────▶ time
          ▲          ▲
      lock point   first unlock
```

Variants:
1. **Basic 2PL**: as above; deadlocks possible; cascading aborts possible.
2. **Strict 2PL**: all X locks held until COMMIT/ABORT.
3. **Rigorous 2PL**: all locks, S and X, held until COMMIT/ABORT.
4. **Conservative (static) 2PL**: pre-declare and take every lock up front; deadlock-free but impractical when access sets are unknown.

### Graph-Based Protocol: The Tree Protocol
When data items form a tree (for example an index hierarchy), the tree protocol grants lock orders only root-to-leaf along edges: to lock a node you must hold a lock on its parent. It is deadlock-free and unlocks may happen anytime, delivering better throughput than naive 2PL on hierarchies; the cost is that it cannot always serialize schedules 2PL would allow, since transactions must touch the root even for leaf-only work.

### Lock Upgrades: The Sneaky Deadlock
A transaction holding S may request an upgrade to X on the same item (read then modify). Two transactions upgrading the same item simultaneously deadlock in a way compatibility tables hide: each holds S (compatible with the other's S) while each waits for the other's release. Engines handle this via U (update) locks that queue ahead of further S grants, or by detecting upgrade-waits as ordinary waits in the wait-for graph. Interview one-liner: upgrades are the classic case where "reads don't conflict" stops being true over time.

### Why Strict 2PL Implies Strictness
"Strict" is a formal property: committed values are the only values other transactions can observe. Holding X locks until commit guarantees it mechanically:
1. Another transaction cannot read your uncommitted write because reading requires sharing or acquiring a lock you still hold, so it blocks: **dirty reads become impossible**.
2. Another transaction cannot overwrite your uncommitted write for the same reason, so if you later abort, nobody built dependent work on top of you: **cascading rollbacks become impossible** and every schedule is recoverable.
3. Commit order becomes serialization order: under Rigorous 2PL transactions serialize exactly in commit order, which also answers "in what order did these overlap?" for auditors.

Lock compatibility matrix:

| Requested vs Held | Shared (S) | Exclusive (X) |
| --- | --- | --- |
| Shared (S) | Granted | Block |
| Exclusive (X) | Block | Block |

### Graph-Based Protocol: The Tree Protocol
When data items form a tree (for example an index hierarchy), the tree protocol grants lock orders only root-to-leaf along edges: to lock a node you must hold a lock on its parent. It deadlock-free and unlocks may happen anytime, delivering better throughput than naive 2PL on hierarchies; the cost is that it cannot always serialize schedules 2PL would allow, since transactions must touch the root even for leaf-only work.

### SQL Locking Surface You Should Know
```sql
BEGIN;
SELECT * FROM seats WHERE flight_id = 7 AND seat_no = '12A' FOR UPDATE;
UPDATE seats SET passenger = 'RAVI' WHERE flight_id = 7 AND seat_no = '12A';
COMMIT;
-- queue workers grab disjoint rows, never blocking each other:
SELECT * FROM jobs WHERE status = 'pending'
  FOR UPDATE SKIP LOCKED LIMIT 1;
-- error out immediately instead of waiting on a competitor:
SELECT * FROM inventory WHERE sku = 'X' FOR UPDATE NOWAIT;
```
`SKIP LOCKED` is the standard pattern for job queues: workers never block each other and never double-process a row.

### Timestamp Ordering (TSO) and Thomas Write Rule
Assign each transaction a unique start timestamp TS. Basic TSO enforces serial equivalence in timestamp order:
1. Reject (abort and restart) any read arriving after a younger transaction wrote the item.
2. Reject any write arriving after either a younger read or a younger write of the item.
The **Thomas Write Rule** refines the stale-write case: if an older transaction tries to write an item already written by a younger one, the write is simply **ignored** (the item keeps the newer timestamp) instead of aborting anyone, because that obsolete write could never be observed anyway. TSO is deadlock-free since nobody waits, at the price of restarts under contention; modern in-memory engines like Hekaton and Silo descend from this family.

### MVCC: Readers Never Block Writers
Multi-Version Concurrency Control keeps multiple versions of each row so readers get a consistent snapshot without taking read locks:
1. Every row version carries creator and killer transaction ids (PostgreSQL calls them xmin/xmax).
2. Readers consult a snapshot of "which transactions were running when I started" and pick the newest version visible to them.
3. Writers create new versions rather than overwriting in place; old versions linger until garbage collection (VACUUM in PostgreSQL, purge in InnoDB).
This eliminates read-write blocking wholesale: reporting queries no longer stall OLTP writes. MySQL InnoDB REPEATABLE READ additionally takes gap/next-key locks on indexed range scans, which is how phantoms get blocked despite snapshot reads.

### Multiversion 2PL
Engines hybridize the ideas: writers take true X locks and keep undo chains for old versions (multiversion 2PL). Readers stay lock-free against snapshots, while writer-writer conflicts still serialize physically. This is essentially MySQL InnoDB's model and Oracle's, trading a little reader freshness complexity for bounded undo growth.

### Deadlocks: Detection, Prevention, Timeouts
A deadlock is a cycle of transactions each waiting for a lock another holds.

```
   T1 holds X(A) ......... wants X(B)
   T2 holds X(B) ......... wants X(A)
   WAIT-FOR GRAPH:
        T1 -------- waiting for -------> T2
         ▲                                │
         └──────────── waiting for -------┘
   CYCLE  =>  DEADLOCK
```

1. **Detection** (InnoDB default): maintain a wait-for graph; when a wait forms, walk it looking for a cycle. On detection choose the victim with the smallest undo cost, roll it back, and return error 1213. Detection runs promptly (well under a second on healthy systems); MySQL recommends turning `innodb_deadlock_detect` off only for extreme hot-row workloads, falling back to `innodb_lock_wait_timeout` (default 50 s).
2. **Timeouts** (the fallback): if you wait longer than `innodb_lock_wait_timeout`, error 1205 releases you. Simple but slow; 50 seconds is an eternity for a web request, so most applications layer their own shorter statement timeouts.
3. **Prevention via timestamps**, using original timestamps even across restarts so progress is guaranteed:
   - **Wait-Die** (non-preemptive): older waits for younger holder; younger requesting from older dies immediately and retries later. Older transactions gain priority; young ones may die repeatedly before doing work.
   - **Wound-Wait** (preemptive): older wounds (aborts) a younger holder instantly; younger waits for older. Fewer total aborts in many workloads, at the cost of killing completed work.

Worked micro-example: T1 (older) holds A and wants B; T2 (younger) holds B and wants A. Wait-Die: when T2 requests A it dies instantly, breaking the cycle while T1 waits harmlessly. Wound-Wait: T1 requesting B wounds T2 instantly; the cycle never forms because elders preempt juniors.

## 🔴 Expert Level

### Inside the InnoDB Lock System
1. **Lock modes beyond S/X**: intention locks (IS, IX) mark table-level intent so table and row locks coexist; auto-inc locks coordinate ID generation.
2. **Record locks** pin index records; **gap locks** pin ranges between index records (purely preventive: they stop inserts, they do not conflict with each other); **next-key locks** combine record plus preceding gap; **insert intention locks** signal an intending inserter and wait out conflicting gap holders.
3. Which lock you get under REPEATABLE READ depends on access shape: a unique-index equality lookup (`WHERE id = 5`) takes a bare record lock, while a range scan next-key locks everything touched. An **unindexed predicate** escalates to scanning every row, effectively locking far beyond intent, and is the classic source of mystery deadlocks.
4. Locks live in hash tables guarded by latches; thousands of threads contending on one hot row burn CPU in the lock queue before any logical row limit matters. For extreme hot-row contention (hundreds of waiters), MySQL's guidance is to disable deadlock detection (`innodb_deadlock_detect = off`) and let timeouts bound waits, because cycle-checking itself becomes the bottleneck.
5. There is no lock escalation in InnoDB (per-row bitmaps instead of promoting to table locks), unlike SQL Server, which escalates toward table locks around 5000 locks on one statement and surprises bulk loaders.

### PostgreSQL MVCC Internals: xmin, xmax, Snapshots, VACUUM
1. Each tuple header stores xmin (creator xid), xmax (deleter/invalidator xid), plus infomask hint bits. INSERT sets xmin; DELETE sets xmax; UPDATE inserts a new tuple whose xmin equals the old tuple's xmax (HOT updates skip index maintenance when indexed columns did not change).
2. Visibility check: a tuple is visible if xmin committed before my snapshot and xmax is absent or invisible to my snapshot, resolved against the commit log (`pg_xact`). Snapshot Isolation at REPEATABLE READ uses one snapshot per transaction; READ COMMITTED takes a fresh snapshot per statement.
3. Old versions are garbage, not history: VACUUM reclaims tuples invisible to every future snapshot. A long-running transaction pins the horizon; one day-old idle-in-transaction session under heavy update load can generate millions of dead tuples and gigabytes of bloat within hours.
4. Transaction ids are 32-bit and wrap around; aggressive freezing plus anti-wraparound autovacuum guards against catastrophic wraparound loss, and PostgreSQL will forcibly shut down a cluster approaching the 2-billion safety boundary. Wraparound emergencies are entirely caused by neglected vacuuming of busy tables.

### Serializable Snapshot Isolation (SSI) and OCC
Optimistic Concurrency Control executes without locks in three phases: read into a private workspace, validate that no serialization conflict arose, write. It shines at low conflict rates and collapses under high contention due to retry storms.

Snapshot Isolation permits **write skew**: two transactions each read a disjoint set, each writes a disjoint set, yet the combination violates an invariant. Canonical example: the rule "at least one doctor must remain on call". Alice checks Bob is off-call, pages herself into cardiology; Bob simultaneously checks Alice is off-call and pages himself into oncology. Neither write conflicts with the other directly, SI accepts both, and now zero doctors are on call.

PostgreSQL SERIALIZABLE implements SSI: it tracks read-write antidependencies (SIREAD locks) among snapshots and aborts one transaction when a dangerous structure appears (two consecutive rw edges forming a pivot). Expect occasional false-positive `40001 serialization_failure`; correct clients wrap work in retry loops. That is the price of full serializability without read locks.

### Lock Contention Diagnostics You Should Be Able to Name
1. InnoDB: `SHOW ENGINE INNODB STATUS` (transactions section, lock waits), performance_schema `data_locks` and `data_lock_waits`, and the `sys.innodb_lock_waits` convenience view joining blocker and waiter.
2. PostgreSQL: `pg_locks` joined to `pg_stat_activity`, plus `pg_blocking_pids(pid)` to identify the culprit instantly; `wait_event_type = Lock` marks stuck backends.
3. Symptoms versus causes: long lock-wait queues point to hot rows or missing indexes (scans locking extra rows); rising deadlock rates usually mean inconsistent access ordering across codepaths; bloat alongside waits means a pinned VACUUM horizon, not a locking bug.

### Trade-Offs With Numbers
1. Lock timeout versus deadlock detection: relying on the default 50 s `innodb_lock_wait_timeout` turns every deadlock into a 50 s stall; detection converts it to a sub-second rollback. With hundreds of threads on one hot row, detection cost grows with waiter count and disabling detection plus short explicit timeouts (for example `SET innodb_lock_wait_timeout = 2`) wins overall.
2. OCC retries explode with conflict rate: expected attempts are roughly 1/(1-p); at 10% conflict about 1.11 attempts, at 50% about 2, at 90% about 10. Above roughly 30% contention pessimistic locking beats optimism decisively.
3. MVCC costs memory and disk invisibly: 95%-read workloads run near lock-free speed, while churning workloads pay continuous VACUUM/purge tax; a forgotten open transaction is the most common cause of sudden bloat incidents.
4. Hot-row ceilings: a single-row counter updated via strict 2PL serializes behind one X lock; practical ceilings land near a few thousand updates per second regardless of hardware, which is why sharded counters, batched deltas, or queue patterns exist.

### Choosing a Strategy by Workload

| Workload Shape | Recommended Mechanism | Reasoning |
| --- | --- | --- |
| Job queue with many workers | SELECT FOR UPDATE SKIP LOCKED | Disjoint claims, zero blocking, natural retry semantics |
| Mixed OLTP + heavy reporting | MVCC snapshots (PG default) | Readers never stall writers; isolation without locks |
| Hot single-row counter | Batched atomic UPDATE or sharded counters | Avoids X-lock serialization ceiling entirely |
| Low-conflict edits (CMS drafts) | Optimistic version column | No lock round trips; conflicts rare enough that retries are cheap |
| Cross-row invariant (on-call rule) | SERIALIZABLE / explicit range lock | Only serializability-class mechanisms see write skew |

### Why 2PL Guarantees Serializability (Proof Sketch)
Define each transaction's **lock point** as the moment it holds its maximum lock count. Under 2PL, if Ti's lock point precedes Tj's, then Ti and Tj cannot conflict in the order Tj-then-Ti: producing such a conflicting pair would require Ti to acquire a lock after its lock point, which the shrinking phase forbids. Therefore every precedence-graph edge runs forward along lock-point order, edges cannot form cycles, and a topological sort by lock points yields an equivalent serial schedule. This is also why releasing locks early (violating 2PL) breaks safety: a post-shrink acquisition can create backwards edges, and backwards edges are exactly what cycles need.

### Intention Locks and Granularity
Hierarchical locking solves a real conflict: how can a table-level operation (ALTER TABLE, full-table scan) coexist with row-level writers? Before touching rows, transactions place intention flags at the table level: IX before any X row lock, IS before any S row lock. Table-level S/X requests then check only these two flags instead of millions of rows:
1. A table X request conflicts with both IX and IS and waits; a table S conflicts with IX but coexists with IS.
2. Row operations never block each other through the table level because IX-IX is compatible.
3. The general lesson for interviews: multi-granularity locking trades a little metadata bookkeeping (two extra modes) for cheap conflict detection across every level of a hierarchy.

### Failure Modes Worth Naming in Interviews
1. **Phantom behavior under REPEATABLE READ differs by engine**: PostgreSQL RR gives a fixed transaction snapshot, so pure re-reads never show new rows, but nothing stops a concurrent INSERT committing into your logical range (write skew surfaces instead). MySQL RR next-key locks actively block inserts into scanned index ranges, but only ranges actually scanned, and unindexed filters over-lock.
2. **Lost updates survive READ COMMITTED everywhere**: both engines allow the two-statement read-modify-write race shown earlier; only atomic single-statement updates, explicit FOR UPDATE, or stricter isolation close it. PostgreSQL RR happens to catch the same-row variant via first-committer-wins, MySQL RR does not, a genuinely asymmetric fact interviewers love.
3. **Cascading aborts** return if anyone relaxes lock holding below strict: if T2 reads T1's dirty write and T1 aborts, T2 must abort too, recursively; strictness is what makes aborts local.
4. **Starvation**: continuously granted S locks can starve a pending X request indefinitely unless writers jump the queue; textbook fixes are writer-priority queuing or fair FIFO grant order as InnoDB practices.

### Interview Questions

### Q1: Explain the difference between Strict 2PL and Rigorous 2PL.
**Answer**: Strict 2PL holds all exclusive (write) locks until commit or abort, releasing S locks possibly earlier; Rigorous 2PL holds ALL locks, shared and exclusive, until termination. Rigorous 2PL additionally guarantees the serialization order equals commit order, which simplifies reasoning about external effects such as messages or emails sent based on committed reads.

### Q2: Why does holding X locks until commit make 2PL "strict"?
**Answer**: Strict means no transaction may read or overwrite values written by an uncommitted one. Since writing requires the X lock and it is retained until termination, nobody can touch those uncommitted values. Dirty reads vanish, cascading rollbacks become impossible, every schedule is recoverable, and a transaction's abort affects only itself.

### Q3: Walk me through deciding whether a given schedule is conflict-serializable.
**Answer**: List all cross-transaction operation pairs sharing an item where at least one is a write. For each pair ordered (Ti before Tj), add edge Ti → Tj. Then test the precedence graph for cycles, for instance with DFS or topological sort. Acyclic means serializable and a topological order gives an equivalent serial schedule; cyclic proves none exists. Always enumerate pairs per item systematically, because one missed pair flips the verdict.

### Q4: How does Snapshot Isolation differ from Serializable, concretely?
**Answer**: SI gives each transaction a consistent snapshot and first-committer-wins on direct write-write conflicts, eliminating dirty reads, non-repeatable reads, and phantoms. It still allows write skew, where two transactions act on each other's stale state through disjoint reads and writes, violating inter-item invariants like the on-call-doctors example. Serializable (via SSI in PostgreSQL, or full-locking serializable elsewhere) additionally prevents those rw-dependency anomalies, at the cost of aborts/retries and bookkeeping overhead.

### Q5: Compare Wait-Die and Wound-Wait. Which aborts less?
**Answer**: Both use timestamps to prevent deadlock and preserve original timestamps across restarts so everyone eventually finishes. Wait-Die lets the elder wait and kills young contenders early; it performs more aborts of young transactions but those have typically done little work. Wound-Wait preempts young lock holders when an elder arrives; mixed workloads usually see fewer total aborts, but it can kill substantial completed work. Neither starves once timestamps are preserved; naive restart schemes do.

### Q6: How does MVCC eliminate read-write blocking, and what hidden costs appear?
**Answer**: Writers produce new versions instead of mutating in place, and readers select the newest version visible to their snapshot without acquiring read locks, so readers and writers never queue on each other. Costs: storage for dead versions until VACUUM/purge, visibility checks against the commit log (mitigated by hint bits), sensitivity to long-running transactions pinning the cleanup horizon, and in MySQL the extra gap/next-key locking required to suppress phantoms under RR.

### Q7: Can MySQL InnoDB at REPEATABLE READ still exhibit anomalies? Give specifics.
**Answer**: Yes. The plain SELECT-then-UPDATE lost-update pattern persists because UPDATE uses current reads and will apply a stale computed value after a competitor commits; protect it with atomic updates or FOR UPDATE. Next-key locks cover only ranges actually scanned, so unindexed predicates lock vastly more rows and manufacture deadlocks. And RR says nothing about cross-row invariants, so write-skew style anomalies persist until SERIALIZABLE or explicit locking is used.
