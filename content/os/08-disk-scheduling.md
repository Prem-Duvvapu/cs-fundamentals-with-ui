# Disk Scheduling & File Allocation

## 🟢 Beginner Level

### What is Disk Scheduling?
Disk scheduling is the technique used by operating systems to determine the order in which disk I/O requests are serviced. Because physical hard disk drives (HDDs) involve mechanical movement (positioning the disk head over concentric tracks/cylinders), the sequence of servicing requests has a massive impact on overall system performance.

```
┌───────────────────────────────────────────────────────────┐
│                      HDD Physical Geometry                 │
│                                                           │
│    [Platter] ────►  (Cylinder 0)                         │
│                     (Cylinder 1)                          │
│                     (Cylinder ... N)                      │
│                                                           │
│    [Read/Write Head] ───► Moves back & forth (Seek Time)  │
└───────────────────────────────────────────────────────────┘
```

### HDD Latency Components
- **Seek Time**: Time required to move the read/write head arm to the target cylinder/track. (Dominates HDD latency, typically 3-15 ms).
- **Rotational Latency**: Time spent waiting for the target sector to rotate underneath the head.
- **Transfer Time**: Time required to transfer data bytes from platter surface to disk controller buffer.

*Note*: Solid State Drives (SSDs) and NVMe drives have no moving mechanical arms (0 ms seek time). Therefore, traditional seek-based disk scheduling is unnecessary on SSDs, where simple FIFO (NOOP) or queue-depth scheduling is used instead.

---

## 🟡 Intermediate Level

### Classic Disk Scheduling Algorithms

Given a disk with 200 cylinders ($0-199$), head starting at cylinder $50$, and request queue: `[95, 180, 34, 119, 11, 123, 62, 64]`.

#### 1. FCFS (First-Come, First-Served)
Requests are processed strictly in arrival order.
- **Sequence**: $50 \rightarrow 95 \rightarrow 180 \rightarrow 34 \rightarrow 119 \rightarrow 11 \rightarrow 123 \rightarrow 62 \rightarrow 64$
- **Total Head Movement**: $|95-50| + |180-95| + |34-180| + |119-34| + |11-119| + |123-11| + |62-123| + |64-62| = 640$ cylinders.
- **Pros**: Fair, no starvation.
- **Cons**: Wild oscillations across disk, high total seek distance.

#### 2. SSTF (Shortest Seek Time First)
Selects the request closest to current head position.
- **Sequence**: $50 \rightarrow 62 \rightarrow 64 \rightarrow 34 \rightarrow 11 \rightarrow 95 \rightarrow 119 \rightarrow 123 \rightarrow 180$
- **Total Head Movement**: $236$ cylinders.
- **Pros**: Drastically reduces total seek time compared to FCFS.
- **Cons**: Can cause **starvation** for requests located at disk extremes if inner/outer requests keep arriving.

#### 3. SCAN (Elevator Algorithm)
Disk arm moves in one direction servicing all requests until reaching the end of the disk, then reverses direction.
- **Sequence (moving right towards 199)**: $50 \rightarrow 62 \rightarrow 64 \rightarrow 95 \rightarrow 119 \rightarrow 123 \rightarrow 180 \rightarrow 199 \text{ (edge)} \rightarrow 34 \rightarrow 11$
- **Total Head Movement**: $|199-50| + |199-11| = 149 + 188 = 337$ cylinders.
- **Pros**: Prevents starvation, predictable bounded wait time.
- **Cons**: Favors requests near disk edges/ends over middle.

#### 4. C-SCAN (Circular SCAN)
Moves in one direction servicing requests. When reaching the end, returns to cylinder $0$ without servicing requests on the return journey.
- **Sequence (moving right towards 199)**: $50 \rightarrow 62 \rightarrow 64 \rightarrow 95 \rightarrow 119 \rightarrow 123 \rightarrow 180 \rightarrow 199 \rightarrow 0 \rightarrow 11 \rightarrow 34$
- **Total Head Movement**: Uniform wait time across all cylinders.

---

## 🔴 Expert Level

### LOOK and C-LOOK Variants
Standard SCAN and C-SCAN always travel all the way to the boundary cylinders ($0$ or $199$).
- **LOOK**: Moves in one direction servicing requests, but reverses as soon as there are no further requests in that direction (without traveling to the physical disk edge).
- **C-LOOK**: Moves in one direction, reverses at the last request in that direction, jumps directly to the lowest requested cylinder, and continues.

### File Allocation Methods
How the OS allocates disk blocks to files:

| Allocation Method | Block Structure | Random Access Speed | External Fragmentation |
|:---|:---|:---|:---|
| **Contiguous Allocation** | Sequential adjacent disk blocks | Fast $O(1)$ | High (requires defragmentation) |
| **Linked Allocation** | Each block contains pointer to next block | Slow $O(N)$ sequential traversal | Zero |
| **Indexed Allocation** | Inode contains array of block pointers | Fast $O(1)$ direct access | Zero |

### Key Interview Questions
1. Compare FCFS, SSTF, SCAN, and C-SCAN disk scheduling algorithms.
2. Why does SSTF suffer from process starvation, and how does SCAN solve it?
3. What is the difference between SCAN and LOOK algorithms?
4. Why are disk scheduling algorithms largely irrelevant for modern NVMe SSDs?
5. Compare Contiguous, Linked, and Indexed File Allocation methods.
