# Distributed DBMS, 2-Phase Commit (2PC) & CAP Theorem

## 🟢 Beginner Level

### Distributed Databases: Scaling Concepts

```
VERTICAL SCALING (Scale-Up)               HORIZONTAL SCALING (Scale-Out)
┌────────────────────────┐                ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Bigger CPU, More RAM   │                │ Node 1   │  │ Node 2   │  │ Node 3   │
│ (Single Server Limit)  │                └──────────┘  └──────────┘  └──────────┘
└────────────────────────┘                (Partitioning / Sharding across cluster)
```

- **Replication**: Copying the same dataset across multiple nodes for high availability.
- **Partitioning (Sharding)**: Splitting a large table into distinct ranges/hash buckets across nodes.

---

## 🟡 Intermediate Level

### Two-Phase Commit (2PC) Protocol

The **2-Phase Commit (2PC)** protocol guarantees atomic commits across multiple distributed database nodes:

```
COORDINATOR                              PARTICIPANT NODES (N1, N2, N3)
    │                                                 │
    ├─────────── 1. PREPARE Message ─────────────────►│ (Acquires locks, writes undo/redo WAL)
    │                                                 │
    │◄────────── 2. VOTE_COMMIT / VOTE_ABORT ─────────┤
    │                                                 │
    ▼ (If ALL voted COMMIT)                           ▼
    ├─────────── 3. GLOBAL_COMMIT ───────────────────►│ (Applies changes to database)
    │                                                 │
    │◄────────── 4. ACK Response ─────────────────────┤
```

> **2PC Blocking Limitation**: If the Coordinator crashes after participants vote `COMMIT`, participants remain locked waiting indefinitely (**Blocking Protocol**).

---

## 🔴 Expert Level

### The CAP Theorem & PACELC Theorem

In a distributed data store, you can guarantee at most **two out of three** properties during a network partition:

```
                      Consistency (C)
                     /               \
                    /                 \
                   /                   \
                  /                     \
       Availability (A) ───────────── Partition Tolerance (P)
```

- **CP (Consistency + Partition Tolerance)**: Rejects writes if nodes cannot reach consensus (e.g. Google Spanner, HBase, MongoDB master).
- **AP (Availability + Partition Tolerance)**: Accepts writes on both sides of partition; reconciles later using Eventual Consistency (e.g. Cassandra, DynamoDB, CouchDB).

#### Quorum Consensus Formula:
To ensure strong consistency in an $N$-node replica cluster with $R$ read nodes and $W$ write nodes:

$$R + W > N$$

$$\text{Example } (N=3, W=2, R=2): \quad 2 + 2 = 4 > 3 \implies \text{Read Quorum always intersects Write Quorum!}$$

### Key Interview Questions

#### Q1: How does 3-Phase Commit (3PC) solve the blocking problem of 2PC?
**Answer**:
3PC introduces an intermediate **Pre-Commit** state and timeouts. If the coordinator crashes during `Pre-Commit`, participants can safely time out and commit or abort without remaining blocked, provided network partitions do not occur.

#### Q2: What is the PACELC Theorem?
**Answer**:
An extension of the CAP theorem: **If Partition ($P$)**, choose between **Availability ($A$)** and **Consistency ($C$)**; **Else ($E$)**, choose between **Latency ($L$)** and **Consistency ($C$)** during normal operations.
