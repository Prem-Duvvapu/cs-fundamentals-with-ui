# JVM Architecture, Garbage Collection & Thread Lifecycles

## 🟢 Beginner Level

### What is the Java Virtual Machine (JVM)?
The **JVM (Java Virtual Machine)** is an abstract computing machine that provides a runtime environment in which Java bytecodes (`.class` files) can be executed across any operating system (**Write Once, Run Anywhere - WORA**).

```
┌───────────────────────────────────────────────────────────┐
│                     JVM RUNTIME MEMORY                    │
├───────────────────────────────┬───────────────────────────┤
│       HEAP MEMORY             │     NON-HEAP MEMORY       │
│  ┌─────────────────────────┐  │  ┌─────────────────────┐  │
│  │ Young Gen (Eden, S0, S1)│  │  │ Metaspace (Class    │  │
│  ├─────────────────────────┤  │  │ Metadata, Methods)  │  │
│  │ Old Gen (Tenured)       │  │  └─────────────────────┘  │
│  └─────────────────────────┘  │  ┌─────────────────────┐  │
│                               │  │ Thread Stacks & PC  │  │
│                               │  │ Registers per thread│  │
│                               │  └─────────────────────┘  │
└───────────────────────────────┴───────────────────────────┘
```

### Java Thread 6-State Lifecycle

A Java Thread managed by `java.lang.Thread` transitions across 6 distinct states during its lifecycle:

```
                          ┌──────────────┐
                          │     NEW      │
                          └──────┬───────┘
                                 │ thread.start()
                                 ▼
                          ┌──────────────┐
            ┌────────────►│   RUNNABLE   │◄────────────┐
            │             └──────┬───────┘             │
            │                    │                     │
            │ Lock Acquired      │ Waiting for Lock    │ Wait Time Ended / Notified
            │                    ▼                     │
    ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
    │   BLOCKED    │      │   WAITING    │      │TIMED_WAITING │
    └──────────────┘      └──────────────┘      └──────────────┘
                                 │
                                 │ Thread completes run()
                                 ▼
                          ┌──────────────┐
                          │  TERMINATED  │
                          └──────────────┘
```

---

## 🟡 Intermediate Level

### JVM Memory Management & Garbage Collectors

1. **Young Generation**:
   - **Eden Space**: Where new objects are allocated first.
   - **Survivor Spaces (S0 / S1)**: Objects that survive a **Minor GC** are copied back and forth between S0 and S1 while incrementing their age counter.
2. **Old Generation (Tenured)**: Holds long-lived objects that exceed the age threshold (`-XX:MaxTenuringThreshold=15`). Cleaned via **Major GC / Full GC**.
3. **Metaspace**: Replaced PermGen in Java 8. Resides in native off-heap memory to store class metadata, bytecode, and method structures.

#### Production Garbage Collectors (G1GC vs ZGC)

| GC Algorithm | Strategy | Max Heap Support | Pause Times | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **G1GC (Garbage First)** | Region-based concurrent collection | Up to 64 GB | $< 200\text{ms}$ | Default general-purpose production GC |
| **ZGC (Z Garbage Collector)** | Colored Pointers & Load Barriers | Up to **16 TB** | **$< 1\text{ms}$** | Low-latency real-time enterprise APIs |
| **Shenandoah** | Concurrent compaction collector | Up to 100 GB | $< 10\text{ms}$ | Low-latency applications |

---

## 🔴 Expert Level

### Project Loom: Platform Threads vs. Virtual Threads (Java 21+)

Prior to Java 21, every Java `Thread` was a **Platform Thread** mapped 1:1 to an Operating System Kernel Thread (costing 1 MB stack memory per thread). **Virtual Threads (Loom)** are lightweight user-mode threads managed by the JVM.

```
JAVA PLATFORM THREADS (1:1 OS Thread)     JAVA VIRTUAL THREADS (M:N Carrier Threads)
Java Thread 1 ──► OS Kernel Thread 1      Virtual Thread 1 ──┐
Java Thread 2 ──► OS Kernel Thread 2      Virtual Thread 2 ──┼─► ForkJoinPool Carrier OS Thread
Java Thread 3 ──► OS Kernel Thread 3      Virtual Thread 3 ──┘
```

> **Virtual Thread Unpinning**: When a Virtual Thread executes a blocking I/O operation (e.g. `socket.read()`, `db.query()`), the JVM **unmounts** the Virtual Thread from its Carrier OS Thread, freeing the OS Thread to run other Virtual Threads!

### Interview Questions

1. **What is Virtual Thread Pinning and how do you prevent it?**
   - *Answer*: Virtual Thread Pinning occurs when a Virtual Thread cannot be unmounted from its Carrier Thread during blocking I/O because it is inside a `synchronized` block or native JNI call. Prevent pinning by replacing `synchronized` with `java.util.concurrent.locks.ReentrantLock`.

2. **How does ZGC achieve sub-millisecond pause times regardless of heap size?**
   - *Answer*: ZGC uses **Colored Pointers** (storing GC metadata in unused bits of 64-bit object reference pointers) and **Load Barriers** to perform object compaction concurrently while application threads run.
