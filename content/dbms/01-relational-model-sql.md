# Database Management Systems: Relational Model, Indexing & ACID

## 🟢 Beginner Level

### What is a Database Management System (DBMS)?
A **DBMS** is software system that enables users to create, maintain, query, and administer structured databases safely, concurrently, and efficiently.

### Relational Model Fundamentals
In a Relational DBMS (RDBMS), data is organized into tables (relations) consisting of **Rows (Tuples)** and **Columns (Attributes)**.

- **Primary Key (PK)**: Unique identifier for each row in a table.
- **Foreign Key (FK)**: A column referencing the Primary Key of another table, establishing relationships.
- **Index**: A data structure (B+ Tree or Hash) that speeds up data retrieval.

---

## 🟡 Intermediate Level

### B+ Tree Indexing
Modern databases (MySQL InnoDB, PostgreSQL) use **B+ Trees** for index structures on disk:

```
                  ┌──────────────┐
                  │   [20 | 50]  │   ◄── Root Node
                  └──────┬───────┘
          ┌──────────────┴──────────────┐
          ▼                             ▼
    ┌──────────┐                  ┌──────────┐
    │  [5 | 10]│                  │ [30 | 40]│   ◄── Internal Nodes
    └────┬─────┘                  └────┬─────┘
  ┌──────┴──────┐               ┌──────┴──────┐
  ▼             ▼               ▼             ▼
┌───┬───┐    ┌───┬───┐       ┌───┬───┐    ┌───┬───┐
│ 5 │ 8 │───►│10 │15 │──────►│30 │35 │───►│40 │48 │   ◄── Leaf Nodes (Linked List)
└───┴───┘    └───┴───┘       └───┴───┘    └───┴───┘
```

**Key Advantages of B+ Trees:**
1. **Fan-out**: High branching factor reduces tree height to 3 or 4 levels even for millions of records.
2. **Sequential Scans**: Leaf nodes form a doubly linked list, enabling fast range queries (`WHERE age BETWEEN 20 AND 30`).

### ACID Guarantees in Transactions

| Property | Meaning | Mechanism |
| :--- | :--- | :--- |
| **Atomicity** | All operations in a transaction succeed or all roll back ("All or Nothing"). | Undo Log / WAL |
| **Consistency** | Database moves from one valid state to another, enforcing constraints. | Schema Validation & FKs |
| **Isolation** | Concurrent transactions execute without interfering with each other. | Locks & MVCC |
| **Durability** | Committed data is permanently saved even if system crashes. | Redo Log / Write-Ahead Logging |

---

## 🔴 Expert Level

### Concurrency Control & Two-Phase Locking (2PL)
To prevent race conditions, databases use **Strict 2-Phase Locking (Strict 2PL)**:

1. **Growing Phase**: Transaction acquires Shared ($S$) or Exclusive ($X$) locks as needed.
2. **Shrinking Phase**: All locks held by the transaction are released **only upon Commit/Rollback**.

```
Lock Count
  ▲
  │     /───────\  Growing Phase (Acquiring locks)
  │    /         \
  │   /           \
  │  /             \─────── Shrinking Phase (Release at Commit)
  └───────────────────────────────► Time
```

### Multi-Version Concurrency Control (MVCC)
- Readers do not block Writers, and Writers do not block Readers.
- Every update creates a new version of the row with a transaction timestamp ($XMIN$, $XMAX$).
- Read views take a snapshot of the committed data at transaction start.

### Key Interview Questions
1. Compare Clustered Index vs Secondary (Non-Clustered) Index in InnoDB.
2. What are Dirty Reads, Non-Repeatable Reads, and Phantom Reads?
3. Explain Isolation Levels: Read Uncommitted, Read Committed, Repeatable Read, Serializable.
4. How does Write-Ahead Logging (WAL) guarantee Durability?
