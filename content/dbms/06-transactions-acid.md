# Database Transactions & ACID Properties

## 🟢 Beginner Level

### What is a Database Transaction?
A **Transaction** is a logical unit of database processing that includes one or more SQL operations (e.g., `SELECT`, `INSERT`, `UPDATE`, `DELETE`).

```sql
BEGIN TRANSACTION;
  UPDATE accounts SET balance = balance - 500 WHERE account_id = 101;
  UPDATE accounts SET balance = balance + 500 WHERE account_id = 202;
COMMIT;
```

### The ACID Properties

1. **Atomicity**: "All or Nothing". Either all operations execute successfully, or the entire transaction is rolled back to its initial state.
2. **Consistency**: Database transitions from one valid state to another, preserving schema invariants, check constraints, and referential integrity.
3. **Isolation**: Concurrent transactions execute independently without visible intermediate states to each other.
4. **Durability**: Once committed, changes survive system crashes, power loss, or OS failures.

---

## 🟡 Intermediate Level

### Transaction State Transition Diagram

```
                 ┌───────────────┐
                 │    Active     │
                 └───────┬───────┘
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
   ┌───────────────────┐    ┌─────────────────┐
   │Partially Committed│    │     Failed      │
   └─────────┬─────────┘    └────────┬────────┘
             │                       │
             ▼                       ▼
   ┌───────────────────┐    ┌─────────────────┐
   │     Committed     │    │     Aborted     │
   │   (Terminated)    │    │  (Rolled Back)  │
   └───────────────────┘    └─────────────────┘
```

1. **Active**: Initial state; transaction is executing operations.
2. **Partially Committed**: Final statement executed, but updates are still in memory buffer pool (not flushed to disk).
3. **Committed**: Write-Ahead Log (WAL) flushed to disk. Transaction permanently succeeded.
4. **Failed**: Transaction interrupted by runtime error, deadlock, or assertion failure.
5. **Aborted**: Rollback executed; database state restored to pre-transaction snapshot.

---

## 🔴 Expert Level

### Write-Ahead Logging (WAL) & ARIES Crash Recovery

Databases guarantee Durability and Atomicity using **Write-Ahead Logging (WAL)**:

> **WAL Protocol Rule**: Log records describing a database update MUST be written and flushed to non-volatile disk BEFORE the corresponding dirty data page is written to disk.

#### ARIES Recovery Algorithm (3 Phases)
1. **Analysis Phase**: Scans log forward from last checkpoint to reconstruct Dirty Page Table (DPT) and Active Transaction Table at crash time.
2. **Redo Phase**: Replays all logged changes forward ("Repeating History") to restore database to exact crash state.
3. **Undo Phase**: Scans log backward rolling back operations of all uncommitted ("loser") transactions using Compensation Log Records (CLRs).

### Interview Questions

1. **What is a Dirty Read, Non-Repeatable Read, and Phantom Read?**
   - *Dirty Read*: Reading uncommitted changes made by another transaction.
   - *Non-Repeatable Read*: Re-reading a row yields modified values because another transaction committed an `UPDATE`.
   - *Phantom Read*: Re-executing a range query yields new rows because another transaction committed an `INSERT`.

2. **How does WAL reduce random disk I/O performance bottlenecks?**
   - *Answer*: Data pages are scattered randomly across disk pages (slow random writes). WAL appends sequential log records to disk (fast sequential I/O), deferring dirty data page flushes to background checkpoints.
