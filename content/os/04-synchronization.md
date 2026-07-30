# Process Synchronization

## 🟢 Beginner Level

### The Problem
When multiple processes/threads access **shared data** simultaneously, the result depends on the order of execution — this is a **race condition**.

**Example**: Two threads incrementing `counter = 5`:
- Thread 1 reads counter (5), adds 1, writes (6)
- Thread 2 reads counter (5), adds 1, writes (6)
- **Result**: 6 instead of 7!

### Critical Section
The part of code where shared variables are accessed is called the **critical section**. We need to ensure:

1. **Mutual Exclusion**: Only one process in critical section at a time
2. **Progress**: If no one is in critical section, a waiting process can enter
3. **Bounded Waiting**: Processes don't starve indefinitely

---

## 🟡 Intermediate Level

### Peterson's Solution (Software-based)
For two processes:

```c
int flag[2] = {0, 0};
int turn = 0;

// Process 0
flag[0] = 1;
turn = 1;
while (flag[1] && turn == 1);
// Critical Section
flag[0] = 0;
```

Works only for 2 processes, assumes no reordering of instructions.

### Hardware Support
- **Test-and-Set**: Atomic instruction that reads and writes a memory location
- **Compare-and-Swap**: Atomic CAS
- **Memory Barriers**: Prevent instruction reordering (volatile)

### Semaphores (Dijkstra, 1965)
A semaphore `S` is an integer variable accessed via two atomic operations:

- **wait(S) / P(S)**: `while (S <= 0); S--;`
- **signal(S) / V(S)**: `S++;`

**Types**:
- **Binary Semaphore (Mutex)**: 0 or 1 — mutual exclusion
- **Counting Semaphore**: N > 1 — resource management

**Classic Problems**:

#### 1. Producer-Consumer (Bounded Buffer)
```c
semaphore empty = N, full = 0, mutex = 1;

// Producer
produce_item();
wait(empty);
wait(mutex);
add_to_buffer();
signal(mutex);
signal(full);

// Consumer
wait(full);
wait(mutex);
remove_from_buffer();
signal(mutex);
signal(empty);
consume_item();
```

#### 2. Readers-Writers
- Readers read simultaneously
- Writers need exclusive access
- **First readers-writers problem**: Writers may starve
- **Second readers-writers problem**: Readers may starve

#### 3. Dining Philosophers
5 philosophers, 5 forks — need both forks to eat.

**Solutions**:
- Pick up both forks or none (deadlock-free but not concurrent)
- Odd philosophers pick left first, even pick right (deadlock prevention)
- Limit to 4 philosophers eating simultaneously (resource limit)

### Monitors (Hoare / Brinch Hansen)
High-level synchronization construct:

```pascal
monitor Buffer {
    int items[N];
    condition full, empty;
    
    void produce(int item) {
        while (count == N) wait(empty);
        add(item);
        signal(full);
    }
    
    int consume() {
        while (count == 0) wait(full);
        int item = remove();
        signal(empty);
        return item;
    }
}
```

- Only one thread can execute inside the monitor at a time
- `wait()` causes the calling thread to wait and allows others in
- `signal()` wakes a waiting thread

---

## 🔴 Expert Level

### Memory Model & Hardware Primitives

**x86 TSO (Total Store Order)**:
- Stores aren't immediately visible to other cores
- Each core has a store buffer
- **Memory barrier** (`mfence`) drains store buffer

**Weak Memory Models (ARM/PowerPC)**:
- Loads/stores can be reordered arbitrarily
- Need explicit barriers (`dmb`, `dsb`)

### Lock-free Programming
Using CAS to implement data structures without locks:

```c
// Lock-free counter
int atomic_increment(int *value) {
    int old;
    do {
        old = *value;
    } while (CAS(value, old, old + 1) != old);
    return old + 1;
}
```

### ABA Problem
Thread reads A, other threads change A→B→A, CAS succeeds incorrectly.

**Solution**: Use tagged pointers or double-wide CAS (counter + pointer).

### Spinlocks vs Mutexes
- **Spinlock**: Busy-waits (good for short critical sections, no context switch)
- **Mutex**: Blocks, context switch (good for long waits)

### Linux Kernel Synchronization
- **spin_lock()**: For short critical sections, disables preemption
- **mutex_lock()**: For long waits, can sleep
- **rcu_read_lock()**: Read-Copy-Update — readers proceed lock-free
- **futex**: Fast userspace mutex — most of the time in userspace

### RCU (Read-Copy-Update)
- Writers make a copy, update the copy, publish pointer atomically
- Readers never block (no lock, no contention)
- Old copy freed after grace period (all readers finish)
- Used in Linux kernel: network routing, VFS, dentry cache

### Deadlock & Livelock
- **Deadlock**: Processes waiting for each other indefinitely
- **Livelock**: Processes keep changing state trying to resolve, never progress
- **Priority Inversion**: High-priority task blocked by low-priority holding lock
  - Classic example: Mars Pathfinder (1997) — solved by priority inheritance

### Key Interview Questions
1. What is a race condition? Give an example.
2. Difference between mutex and semaphore?
3. Can a binary semaphore be used as a mutex? What's the difference?
4. How does Test-and-Set work internally?
5. Explain the dining philosophers problem and solutions
6. What is a spinlock and when would you use it?
7. Explain RCU — how does it work?
8. What is priority inversion? How does priority inheritance solve it?
9. What is the ABA problem in lock-free algorithms?
10. Compare x86 memory model vs ARM memory model
