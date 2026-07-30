# CPU Scheduling

## 🟢 Beginner Level

### What is CPU Scheduling?
The OS decides **which process runs next** on the CPU. The component that makes this choice is the **scheduler**.

### Key Concepts
- **CPU Burst**: Time a process spends actively computing
- **I/O Burst**: Time a process spends waiting for I/O
- **Preemptive**: Scheduler can interrupt a running process
- **Non-preemptive**: Running process runs until it voluntarily yields

### Scheduling Criteria
| Metric | Description |
|--------|-------------|
| **CPU Utilization** | Keep CPU as busy as possible |
| **Throughput** | Number of processes completed per time unit |
| **Turnaround Time** | Total time from submission to completion |
| **Waiting Time** | Total time spent waiting in ready queue |
| **Response Time** | Time from submission to first response |

---

## 🟡 Intermediate Level

### Basic Scheduling Algorithms

#### 1. First-Come, First-Served (FCFS)
```
Process  | Burst Time
P1       | 24
P2       | 3
P3       | 3

If order: P1 → P2 → P3
Waiting: P1=0, P2=24, P3=27  →  Average = 17

If order: P2 → P3 → P1
Waiting: P2=0, P3=3, P1=6  →  Average = 3
```

**Problem**: Convoy effect (short processes stuck behind long ones)

#### 2. Shortest Job First (SJF)
Optimal for minimum average waiting time — but impossible to know future burst lengths.

- **Non-preemptive**: Once CPU assigned, process runs to completion
- **Preemptive (SRTF)**: If new process has shorter remaining time, preempt

#### 3. Priority Scheduling
Each process gets a priority number. Lower number = higher priority.

**Problem**: Starvation — low-priority processes may never run.

**Solution**: **Aging** — gradually increase priority of waiting processes.

#### 4. Round Robin (RR)
Each process gets a fixed **time quantum** (q). After q expires, process is moved to the end of ready queue.

```
Process: P1(24), P2(3), P3(3)  q = 4

P1(4) → P2(4 →3 done) → P3(4 →3 done) → P1(4) → P1(4) ...
```

- q large → FCFS behavior
- q small → too many context switches
- Rule of thumb: 80% of CPU bursts should be less than q

---

## 🔴 Expert Level

### Multi-level Queue Scheduling
Ready queue is partitioned into multiple queues with different priorities:

```
┌─────────────────────┐
│ System Processes    │  Priority 0 (highest)
├─────────────────────┤
│ Interactive (fore)  │  Priority 1
├─────────────────────┤
│ Batch (background)  │  Priority 2 (lowest)
└─────────────────────┘
```

Each queue has its own scheduling algorithm.

### Multi-level Feedback Queue (MLFQ)
Processes can **move between queues** based on behavior:

```
Q0 (RR, q=8)    → Interactive processes
Q1 (RR, q=16)   → Mixed behavior
Q2 (FCFS)       → CPU-bound processes
```

**Rules**:
1. If Priority(A) > Priority(B), A runs
2. If same priority, Round Robin
3. When process uses entire quantum, demote one level
4. After time period S, move all processes back to top queue (priority boost)

### Linux CFS (Completely Fair Scheduler)
- Uses red-black tree (O(log n)) instead of O(1) runqueue
- Tracks `vruntime` — weighted by nice value

```c
// Simplified CFS target_latency = 20ms for 4 processes
// Each process gets target_latency / n = 5ms slice
slice = (process.weight / total_weight) × period
```

- If only 1 process running, can use up to `sched_latency_ns` (default 24ms)
- **No fixed time slices** — proportional fairness

### O(1) Scheduler (pre-2.6.23)
- 140 priority levels (0-99 real-time, 100-139 nice)
- Two arrays: active and expired
- Bitmap-based O(1) selection of highest priority

### Real-time Scheduling
- **EDF (Earliest Deadline First)**: Optimal for dynamic systems
- **Rate Monotonic (RM)**: Static priority based on period length
- **Priority Inversion**: High-priority blocked waiting for low-priority's resource
  - Solved by **Priority Inheritance Protocol**

### Multiprocessor Scheduling
- **SMP (Symmetric Multi-Processing)**: All CPUs share memory
- **Load Balancing**: Move processes between CPUs
- **Processor Affinity**: Keep process on same CPU (cache warm)
- **Gang Scheduling**: Schedule threads of same process simultaneously

### Key Interview Questions
1. FCFS vs SJF vs RR — when to use each?
2. What is the convoy effect?
3. How does MLFQ prevent starvation?
4. How does Linux CFS work internally?
5. What is priority inversion and how to solve it?
6. Compare O(1) scheduler vs CFS
7. What is processor affinity?
8. Explain EDF vs Rate Monotonic scheduling
9. How do you calculate average waiting time for RR?
10. What happens if time quantum in RR is too small / too large?
