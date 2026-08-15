# Java Memory Model: Primitives, References, Stack & Heap

## 🟢 Beginner Level

### Stack Memory vs. Heap Memory

```
┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐
│        THREAD CALL STACK             │       │              JVM HEAP                │
├──────────────────────────────────────┤       ├──────────────────────────────────────┤
│ Frame: calculateTotal()              │       │                                      │
│  - int qty = 5 (Value in frame)      │       │ Object: Order@0x4A1                  │
│  - Order order ──────────────────────┼───────►  { id: 101, item: "Laptop" }         │
├──────────────────────────────────────┤       │                                      │
│ Frame: main(String[] args)           │       │ Object: Customer@0x9B2               │
│  - Customer c ───────────────────────┼───────►  { name: "Alice" }                   │
└──────────────────────────────────────┘       └──────────────────────────────────────┘
```

1. **Stack Memory**:
   - Thread-private memory allocated per thread.
   - Holds Stack Frames containing method local variables, primitive values (`int`, `boolean`, `double`), and object reference pointers.
   - Automatically allocated and deallocated in LIFO order upon method entry/return with zero Garbage Collection overhead.
2. **Heap Memory**:
   - Shared globally across all threads in the JVM process.
   - Holds all Java Objects (`new MyClass()`), Arrays, and String Pool objects.
   - Memory reclaim is managed automatically by the Garbage Collector (G1GC, ZGC).

---

## 🟡 Intermediate Level

### Java Pass-by-Value Mechanics (The Reference Copy Dilemma)

> [!IMPORTANT]
> **Java is strictly 100% Pass-by-Value at all times!**

When an object reference is passed into a method parameter:
1. Java copies the **value of the memory reference pointer** (e.g. `0x4A1`) onto the callee's stack frame.
2. **Mutating object state** (`order.setItem("Phone")`) mutates the shared underlying object on the Heap.
3. **Reassigning the parameter reference** (`order = new Order()`) merely overwrites the local copied reference on the callee stack frame; the caller's reference remains completely unchanged!

```java
public void modify(Order order) {
    order.setItem("Phone");  // MUTATES heap object shared with caller
    order = new Order(202);  // REASSIGNS local copied pointer; NO effect on caller!
}
```

---

## 🔴 Expert Level

### Escape Analysis & Scalar Replacement

The HotSpot C2 JIT Compiler analyzes object lifetimes via **Escape Analysis**:

```
GlobalEscape  ──► Object escapes method and thread (e.g. returned or stored in static field) ──► Allocated on HEAP
ArgEscape     ──► Object passed as method argument but does not escape thread                ──► Allocated on HEAP
NoEscape      ──► Object is created and destroyed strictly within the method scope          ──► SCALAR REPLACEMENT!
```

- **Scalar Replacement**: If an object does not escape the local method scope, the JVM does **not** allocate the object on the Heap at all. Instead, it disassembles the object into its individual primitive fields ("scalars") and allocates them directly in CPU registers or on the local Stack Frame.
- **Lock Elision**: If an object does not escape a single thread, synchronized locks on that object are automatically stripped away by the JIT compiler.

### Key Interview Questions

#### Q1: What causes a `java.lang.StackOverflowError` vs. a `java.lang.OutOfMemoryError: Java heap space`?
**Answer**:
- `StackOverflowError`: Occurs when deep or infinite recursion exhausts the thread stack size configured via `-Xss` (e.g. 1MB).
- `OutOfMemoryError: Java heap space`: Occurs when live heap allocations exceed the maximum configured heap limit (`-Xmx`) and the Garbage Collector cannot reclaim enough memory to satisfy a new allocation.

#### Q2: Are Java Primitives ever allocated on the Heap?
**Answer**: Yes. When primitive fields are declared as instance variables inside a class (e.g. `class User { int age; }`), they are stored directly inside the object's memory layout on the Heap. Primitives are stored on the Stack only when declared as local variables inside method scopes.
