# Process Management

## 🟢 Beginner Level

### What is a Process?
A **process** is a program in execution. While a program is a passive entity (just code on disk), a process is an active entity with its own memory space, registers, and state.

**Analogy:** A program is like a recipe book; a process is the act of cooking that recipe.

### Process States
A process goes through multiple states during its lifecycle:

```
NEW → READY → RUNNING → TERMINATED
            ↑    ↓
          WAITING
```

| State | Description |
|-------|-------------|
| **NEW** | Process is being created |
| **READY** | Process is loaded in memory, waiting for CPU |
| **RUNNING** | Process is currently executing on CPU |
| **WAITING** | Process is waiting for I/O or event |
| **TERMINATED** | Process has finished execution |

### Process Control Block (PCB)
The OS maintains a **PCB** for every process — a data structure containing:

```
┌─────────────────────────┐
│ Process ID (PID)         │
│ Process State            │
│ Program Counter          │
│ CPU Registers            │
│ Memory Limits            │
│ List of Open Files       │
└─────────────────────────┘
```

### Context Switching
When the CPU switches from one process to another, the OS saves the current process's state (into its PCB) and loads the saved state of the next process. This is **context switching** — pure overhead with no useful work done.

---

## 🟡 Intermediate Level

### Process vs Thread

| Feature | Process | Thread |
|---------|---------|--------|
| Memory Space | Separate (isolated) | Shares with process |
| Creation Time | Slow | Fast |
| Context Switch | High overhead | Low overhead |
| Communication | IPC (pipes, sockets, shared memory) | Direct memory access |
| Fault Isolation | Yes (one crash doesn't affect others) | No (thread crash kills process) |

### Types of Threads
- **User-Level Threads**: Managed by user library, no kernel involvement, faster but cannot leverage multiple CPUs
- **Kernel-Level Threads**: Managed by OS, slower creation but can run on multiple CPUs in parallel
- **Hybrid Threads**: Many-to-many model (e.g., Solaris)

### Scheduling Queues
The OS maintains multiple queues for process management:

1. **Job Queue** — all processes in the system
2. **Ready Queue** — processes in memory, ready to run
3. **Device Queue** — processes waiting for I/O devices

### Operations on Processes
- **Process Creation**: `fork()` (Unix) / `CreateProcess()` (Windows)
- **Process Termination**: `exit()` — frees resources, notifies parent
- **Zombie Process**: Child terminated but parent hasn't called `wait()`
- **Orphan Process**: Parent terminated before child (adopted by `init`)

### Interprocess Communication (IPC)
- **Shared Memory**: Fast, but requires synchronization (producer-consumer problem)
- **Message Passing**: `send()` / `receive()` — no conflicts but slower
- **Pipes**: Unidirectional byte stream (named pipes allow bidirectional)
- **Sockets**: Communication across network

---

## 🔴 Expert Level

### Process Model in Linux (Task Struct)
Linux's `task_struct` (~2KB per process on x86) contains:

```c
struct task_struct {
    volatile long state;            // running, waiting, stopped, zombie
    pid_t pid;                      // process ID
    struct task_struct *parent;     // parent process
    struct list_head children;      // list of children
    struct mm_struct *mm;           // memory descriptor
    struct files_struct *files;     // open file descriptors
    struct signal_struct *signal;   // signal handlers
    struct fs_struct *fs;           // filesystem info
    // ... 100+ more fields
};
```

### CFS (Completely Fair Scheduler)
Modern Linux uses CFS which models CPU as:

```
vruntime = actual_runtime × (nice_0_weight / process_weight)
```

- Each process gets a `vruntime` that tracks its weighted runtime
- CFS picks the process with **smallest vruntime** (most under-served)
- Uses **red-black tree** (O(log n) insert/delete) for ready queue

### Copy-on-Write (COW)
`fork()` doesn't duplicate the entire address space. Instead:
1. Parent and child share the same physical pages
2. Pages are marked read-only
3. On write, a page fault triggers actual copy of that page
4. Saves memory and avoids unnecessary copying

### vfork() vs fork()
- `vfork()`: Parent blocks, child borrows parent's memory — no COW
- Used when child immediately calls `exec()` — avoid copying pages that will be thrown away

### Namespaces & Control Groups (cgroups)
- **Namespaces**: Isolate process view (PID, network, mount, user, UTS, IPC)
- **cgroups**: Limit resource usage (CPU, memory, I/O) per process group
- Together they form the foundation of **containers** (Docker)

### Real-time Processes
- **SCHED_FIFO**: First-in-first-out, runs until blocked or yields
- **SCHED_RR**: Round-robin within priority class
- **SCHED_DEADLINE**: Earliest deadline first (EDF) — guarantees CPU time

### Key Interview Questions
1. Difference between process and program?
2. What happens during context switch (assembly level)?
3. How does fork() work internally?
4. What is a thundering herd problem?
5. Explain COW in Linux fork()
6. How are containers different from VMs (namespace/cgroup perspective)?
7. Zombie vs orphan process — how to handle zombies?
8. What is the `init` process and PID 1 responsibility?
