# Deadlocks

## 🟢 Beginner Level

### What is a Deadlock?
A set of processes is **deadlocked** when each process is waiting for an event that only another process in the set can cause.

**Real-world analogy**: Two cars meet at a four-way intersection. Each waits for the other to go first. Neither moves.

### Necessary Conditions (Coffman Conditions)
All four must hold simultaneously:

1. **Mutual Exclusion**: Only one process can use a resource at a time
2. **Hold and Wait**: A process holds at least one resource while waiting for another
3. **No Preemption**: Resources cannot be forcibly taken away
4. **Circular Wait**: There is a cycle of processes each waiting for a resource held by the next

```
P1 → R1 → P2 → R2 → P1
```

---

## 🟡 Intermediate Level

### Resource Allocation Graph (RAG)
A directed graph showing which resources are held by which processes:

```
P1 ──→ R1  (P1 wants R1)
R1 ──→ P2  (R1 is held by P2)
```

- **Cycle in RAG with single-instance resources** → Deadlock
- **Cycle with multiple-instance resources** → Possibility of deadlock (need further analysis)

### Deadlock Handling Strategies

| Strategy | Description | Problem |
|----------|-------------|---------|
| **Prevention** | Ensure at least one Coffman condition never holds | Low resource utilization |
| **Avoidance** | OS knows future requests, avoids unsafe states | Requires future knowledge |
| **Detection** | Allow deadlock, detect it, recover | Recovery cost |
| **Ignorance** | Assume deadlocks never happen (Ostrich algorithm) | Used by most practical OS |

### Deadlock Prevention
Breaking one of the four conditions:

1. **Break Mutual Exclusion**: Sometimes impossible (printer, file locks)
2. **Break Hold & Wait**: Process must request all resources at once — low utilization
3. **Break No Preemption**: Force process to release resources — complex
4. **Break Circular Wait**: Impose a total ordering of resource types

**Resource ordering example**:
```c
// All resources numbered 1..N
// Always acquire in increasing order
acquire(1);
acquire(2);  // Never acquire(2) then acquire(1)
```

---

## 🔴 Expert Level

### Deadlock Avoidance — Banker's Algorithm (Dijkstra)
System is in **safe state** if there exists a **safe sequence** where each process can complete.

**Data structures**:
```
Available[m]    // Available instances of each resource
Max[n][m]       // Maximum demand of each process
Allocation[n][m] // Currently allocated
Need[n][m]      // Remaining need = Max - Allocation
```

**Safety Algorithm**:
1. Find unfinished process with Need ≤ Available
2. If found, assume it finishes (Available += Allocation)
3. Repeat until all finished or no process can proceed
4. If all finish → safe state

**Resource-Request Algorithm**:
When process Pi requests resources:
1. If Request ≤ Need, proceed
2. If Request ≤ Available, tentatively allocate
3. Run safety algorithm — if safe, allocate; else, rollback

### Deadlock Detection
**Wait-for Graph** (single-instance):
- Reduced version of RAG — only show processes
- Cycle in wait-for graph → deadlock

**Detection algorithm (multiple-instance)**:
Similar to Banker's but simpler — look for processes that can complete.

### Recovery Methods
1. **Process Termination**:
   - Abort all deadlocked processes (expensive)
   - Abort one by one (overhead of partial kill)
   - Victim selection: priority, runtime, resources used

2. **Resource Preemption**:
   - Select victim, rollback to safe state, restart
   - **Starvation**: Same process always chosen as victim
   - Solution: Include number of rollbacks in selection cost

### Practical OS Approaches
- **Windows**: Detection only for certain resources (kernel objects)
- **Linux**: Mostly ignores (ostrich) — deadlocks are considered design bugs
- **Databases**: Detection + transaction rollback (victim = lowest cost transaction)
- **Distributed Systems**: Wait-die, Wound-wait schemes

### Two-Phase Locking (2PL) in Databases
- Phase 1: Acquire all locks (growing phase)
- Phase 2: Release locks (shrinking phase)
- 2PL guarantees serializability but is susceptible to deadlocks
- **Strict 2PL**: All locks held until commit (prevents cascading rollbacks)

### Transaction Deadlock in Distributed Systems
- **Wait-Die**: Older transaction waits for younger; younger dies if waiting
- **Wound-Wait**: Older wounds (preempts) younger; younger waits for older
- Both prevent deadlock without requiring global knowledge

### Key Interview Questions
1. What are the four necessary conditions for deadlock?
2. How does the Banker's algorithm work? Give an example
3. Difference between deadlock prevention and avoidance?
4. How would you detect a deadlock in a wait-for graph?
5. What is the Ostrich algorithm?
6. Compare resource ordering vs Banker's algorithm
7. How do databases handle deadlocks?
8. Explain Wait-Die vs Wound-Wait
9. What is a safe state vs unsafe state?
10. Can a cycle in RAG guarantee deadlock? (single vs multi-instance resources)
