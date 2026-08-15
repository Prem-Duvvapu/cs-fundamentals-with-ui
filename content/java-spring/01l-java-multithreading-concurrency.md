# Java Multithreading, Monitors, CAS & ThreadPool Executors

## 🟢 Beginner Level

### Thread 6-State Lifecycle in Java (`java.lang.Thread.State`)

The JVM defines exactly 6 distinct thread states in `Thread.State`:

```
                 ┌────────────────────────────────────────────────────────┐
                 │                       NEW                              │
                 │                 (new Thread())                         │
                 └───────────────────────────┬────────────────────────────┘
                                             │ .start()
                                             ▼
                 ┌────────────────────────────────────────────────────────┐
                 │                    RUNNABLE                            │
                 │              (Ready / Running on OS CPU)               │
                 └───────────▲───────────────────────────────┬────────────┘
         Lock Acquired       │                               │ Blocked on synchronized
                             │                               ▼
                 ┌───────────┴──────────┐        ┌────────────────────────┐
                 │       WAITING        │        │        BLOCKED         │
                 │ (wait, join, park)   │        │(Waiting for MonitorLock│
                 └───────────▲──────────┘        └────────────────────────┘
         Timeout Expired     │
                             │ .wait(timeout), sleep()
                 ┌───────────┴──────────┐
                 │    TIMED_WAITING     │
                 │  (sleep, join(ms))   │
                 └──────────────────────┘
                             │
                             │ run() finishes
                             ▼
                 ┌──────────────────────┐
                 │     TERMINATED       │
                 │  (Execution finished)│
                 └──────────────────────┘
```

---

## 🟡 Intermediate Level

### Java Memory Model: `volatile` & Memory Barriers

In modern multi-core architectures, each CPU core has private L1/L2 caches.

```
Core 1 (Thread A) ──► L1 Cache [ flag = true ] ──┐
                                                  ▼
                                           [ Main Memory ]  ◄── (Without volatile, Thread B reads stale cached 0)
                                                  ▲
Core 2 (Thread B) ──► L1 Cache [ flag = false ] ─┘
```

1. **Visibility Guarantee**: Reading or writing a `volatile` variable establishes a **Happens-Before** memory edge. Writes to `volatile` variables bypass CPU caches and flush directly to Main Memory.
2. **Hardware Memory Barriers**: Prevents the compiler and CPU instruction reordering pipeline from moving instructions across the volatile barrier.
3. **Atomicity**: `volatile` guarantees visibility, but does **NOT** provide atomicity for compound operations like `count++` (`read -> modify -> write`).

---

## 🔴 Expert Level

### Synchronized Object Monitors, CAS & `ThreadPoolExecutor`

#### 1. Synchronized Object Monitor Layout (`ObjectMonitor` in C++ HotSpot):
Every Java object header contains a **Mark Word** pointing to an `ObjectMonitor`:
- **Entry Set (`_EntryList`)**: Holds threads waiting to acquire the monitor lock (`BLOCKED` state).
- **Owner (`_Owner`)**: Holds the pointer to the thread currently executing inside `synchronized`.
- **Wait Set (`_WaitSet`)**: Holds threads that released the lock via `object.wait()` (`WAITING` state). Calling `object.notify()` transfers a thread from the Wait Set back to the Entry Set.

#### 2. CAS (Compare-And-Swap) & Atomic Variables:
`AtomicInteger`, `AtomicReference`, and `LongAdder` achieve lock-free thread safety using CPU hardware atomic instructions (`LOCK CMPXCHG` on x86):

$$\text{CAS}(V, E, N): \text{If Memory value } V == \text{Expected } E \rightarrow \text{Update } V = N \text{ else Retry}$$

#### 3. `ThreadPoolExecutor` Execution Policy:
When submitting a task (`execute(Runnable)`):
1. If active threads $< \text{corePoolSize}$, spawn a new Worker thread.
2. If active threads $\ge \text{corePoolSize}$, push task into the **`BlockingQueue`** (Work Queue).
3. If the queue is full and active threads $< \text{maximumPoolSize}$, spawn a new temporary Worker thread.
4. If active threads $== \text{maximumPoolSize}$ and queue is full, trigger **`RejectedExecutionHandler`** (`AbortPolicy`, `CallerRunsPolicy`, `DiscardPolicy`).

### Key Interview Questions

#### Q1: What is the ABA Problem in CAS and how does `AtomicStampedReference` solve it?
**Answer**:
- **ABA Problem**: Thread 1 reads value $A$. Thread 2 changes $A \rightarrow B \rightarrow A$. Thread 1 executes `CAS(A, C)` and succeeds because the value is currently $A$, oblivious to the intermediate state mutation.
- **Solution**: `AtomicStampedReference<V>` pairs the object reference with an integer timestamp/version counter, executing `CAS(expectedRef, newRef, expectedStamp, newStamp)`.

#### Q2: Why should `Executors.newFixedThreadPool()` and `newCachedThreadPool()` be avoided in production?
**Answer**:
- `newFixedThreadPool`: Uses an **unbounded** `LinkedBlockingQueue` (`Integer.MAX_VALUE`). If producers outpace consumers, the queue consumes all available heap memory, triggering `OutOfMemoryError`.
- `newCachedThreadPool`: Has `maximumPoolSize = Integer.MAX_VALUE` and a `SynchronousQueue`. High traffic bursts spawn thousands of concurrent OS threads, causing thread starvation, CPU thrashing, and process crashes.
- *Best practice*: Manually instantiate `ThreadPoolExecutor` with a bounded queue and explicit rejection policies.
