# Concurrency Control, Serializability & Lock Protocols

## 🟢 Beginner Level

### What is Concurrency Control?
**Concurrency Control** is the database subsystem responsible for interleaving operations of multiple concurrent transactions safely without violating Isolation or Consistency.

### Conflict Operations
Two operations $O_i$ and $O_j$ belonging to different transactions $T_i$ and $T_j$ **conflict** if:
1. They access the **same data item** ($A$).
2. At least **one of the operations is a WRITE ($W(A)$)**.

- $R_i(A)$ and $W_j(A)$ $\rightarrow$ Conflict!
- $W_i(A)$ and $W_j(A)$ $\rightarrow$ Conflict!
- $R_i(A)$ and $R_j(A)$ $\rightarrow$ NO Conflict.

---

## 🟡 Intermediate Level

### Conflict Serializability & Precedence Graphs

A schedule $S$ is **Conflict Serializable** if it is conflict-equivalent to some serial schedule.

#### Precedence Graph Algorithm (Cycle Detection)
To test if schedule $S$ is conflict serializable:
1. Create a node for each transaction $T_i$.
2. Draw a directed edge $T_i \rightarrow T_j$ if an operation of $T_i$ conflicts with a later operation of $T_j$ on the same item.
3. If the graph contains **NO CYCLES**, $S$ is Conflict Serializable! Topologically sort nodes to find equivalent serial order.

```
PRECEDENCE GRAPH WITH CYCLE (NOT SERIALIZABLE):
     ┌───────────┐  W1(A)...R2(A)  ┌───────────┐
     │    T1     │────────────────►│    T2     │
     └───────────┘                 └───────────┘
           ▲                             │
           └─────────────────────────────┘
                    W2(B)...W1(B)
```

---

## 🔴 Expert Level

### Lock-Based Protocols

- **Shared Lock ($S$)**: Acquired for read operations (`SELECT ... LOCK IN SHARE MODE`). Multiple transactions can hold $S$ locks concurrently.
- **Exclusive Lock ($X$)**: Acquired for write operations (`UPDATE`, `DELETE`). Only one transaction can hold $X$ lock.

#### Strict 2-Phase Locking (Strict 2PL)
- **Growing Phase**: Transaction acquires locks but cannot release any lock.
- **Shrinking Phase**: All Exclusive ($X$) locks held by a transaction MUST be retained until the transaction **COMMITS or ABORTS**. Prevents Cascading Rollbacks.

```
LOCK COMPATIBILITY MATRIX:
┌──────────────┬──────────────┬──────────────┐
│ Requested    │ Shared (S)   │ Exclusive(X) │
├──────────────┼──────────────┼──────────────┤
│ Shared (S)   │   ✅ OK      │   ❌ BLOCK   │
│ Exclusive(X) │   ❌ BLOCK   │   ❌ BLOCK   │
└──────────────┴──────────────┴──────────────┘
```

### Deadlock Handling & Prevention

1. **Wait-For Graph (WFG)**: Nodes are active transactions; directed edge $T_1 \rightarrow T_2$ means $T_1$ is waiting for lock held by $T_2$. Cycle detection algorithm runs periodically to abort victim.
2. **Timestamp Protocols**:
   - **Wait-Die (Non-preemptive)**: If older $T_i$ requests item held by younger $T_j$, $T_i$ WAITS. If younger $T_j$ requests item held by older $T_i$, $T_j$ DIES.
   - **Wound-Wait (Preemptive)**: If older $T_i$ requests item held by younger $T_j$, $T_i$ WOUNDS (aborts) $T_j$. If younger requests older, younger WAITS.

### Interview Questions

1. **Explain the difference between Strict 2PL and Rigorous 2PL.**
   - *Answer*: Strict 2PL holds all Exclusive ($X$) locks until commit, while Rigorous 2PL holds ALL locks (both Shared and Exclusive) until commit.

2. **How does Snapshot Isolation differ from Serializable Isolation level?**
   - *Answer*: Snapshot Isolation prevents dirty reads, non-repeatable reads, and phantom reads using MVCC snapshots, but remains vulnerable to **Write Skew anomalies**. Serializable isolation prevents all anomalies.
