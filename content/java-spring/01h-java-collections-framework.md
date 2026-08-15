# Collections Framework: List, Set, Queue & PriorityQueue

## 🟢 Beginner Level

### Hierarchy of the Java Collections Framework
All core collection classes in Java reside in the `java.util` package and descend from the `Iterable<E>` and `Collection<E>` interfaces (with `Map<K, V>` as an independent hierarchy).

```
                            ┌───────────────────┐
                            │    Iterable<E>    │
                            └─────────▲─────────┘
                                      │
                            ┌─────────┴─────────┐
                            │   Collection<E>   │
                            └─────────▲─────────┘
            ┌─────────────────────────┼─────────────────────────┐
            │                         │                         │
  ┌─────────┴─────────┐     ┌─────────┴─────────┐     ┌─────────┴─────────┐
  │      List<E>      │     │      Set<E>       │     │     Queue<E>      │
  │ (Ordered, Indexed)│     │ (Unique Elements) │     │  (FIFO / Priority)│
  └─────────▲─────────┘     └─────────▲─────────┘     └─────────▲─────────┘
      ┌─────┴─────┐             ┌─────┴─────┐             ┌─────┴─────┐
      │           │             │           │             │           │
  ArrayList   LinkedList     HashSet     TreeSet     ArrayDeque  PriorityQueue
```

---

## 🟡 Intermediate Level

### Core Collection Implementations Compared

| Data Structure | Underlying Engine | Time Complexity (Get) | Time Complexity (Add) | Memory Footprint & Cache Locality |
| :--- | :--- | :--- | :--- | :--- |
| **`ArrayList`** | Contiguous `Object[]` array | **$O(1)$** (Random access) | **$O(1)$** amortized | **High density**, exceptional CPU cache locality |
| **`LinkedList`** | Doubly-linked Node objects | $O(N)$ (Pointer traversal) | $O(1)$ at head/tail | **40 bytes/node**, poor cache locality, GC churn |
| **`ArrayDeque`** | Circular ring buffer array | $O(1)$ at head/tail | $O(1)$ amortized | **Zero node allocations**, beats LinkedList for Stack/Queue |
| **`HashSet`** | Backed by `HashMap<E, Object>` | **$O(1)$** average | **$O(1)$** average | Stores dummy `PRESENT` static object as map value |
| **`PriorityQueue`** | Complete Binary Min-Heap array | $O(1)$ (`peek`) | **$O(\log N)$** (`offer`) | Array-based heap with `siftUp()` and `siftDown()` |

---

## 🔴 Expert Level

### ArrayList 1.5x Dynamic Growth & PriorityQueue Sift Mechanics

#### 1. ArrayList Capacity Growth Invariant:
When `size == elementData.length`, calling `add(E)` invokes `grow(minCapacity)`:
$$\text{newCapacity} = \text{oldCapacity} + (\text{oldCapacity} \gg 1) \approx 1.5 \times \text{oldCapacity}$$
A new contiguous block is allocated on the Heap and elements are copied via native `System.arraycopy()`.

#### 2. PriorityQueue Array-Backed Complete Binary Tree:
For any element stored at array index $k$:
- **Parent Index**: $\text{parent}(k) = \frac{k - 1}{2} = (k - 1) \gg 1$
- **Left Child**: $\text{left}(k) = 2k + 1$
- **Right Child**: $\text{right}(k) = 2k + 2$

```
PRIORITYQUEUE ARRAY: [ 5, 25, 10, 30, 40, 50, 15 ]
REPRESENTED AS MIN-HEAP BINARY TREE:
                 5 (Index 0)
               /   \
   (Index 1) 25     10 (Index 2)
            /  \    /  \
           30  40  50  15
```

- **`offer(E)` (siftUp)**: Appends element at the end of the array (index $N$) and bubbles up by comparing with parent until the Min-Heap property ($\text{parent} \le \text{child}$) is satisfied ($O(\log N)$).
- **`poll()` (siftDown)**: Replaces the root (index 0) with the last element of the array and bubbles down by swapping with the smaller of its children until restored ($O(\log N)$).

### Key Interview Questions

#### Q1: Why does `ArrayDeque` outperform `LinkedList` when implementing a Queue or Stack?
**Answer**: 
1. `ArrayDeque` uses a circular indexed contiguous array with bitwise wrap-around (`(head - 1) & (length - 1)`), avoiding the allocation of temporary Node wrapper objects.
2. `LinkedList` allocates a new 40-byte `Node` object for every single element inserted, generating significant heap memory fragmentation and GC pressure.
3. Contiguous arrays enjoy sequential CPU L1/L2 cache prefetching, whereas linked list pointer dereferencing causes frequent CPU cache misses.

#### Q2: What causes `ConcurrentModificationException` during collection iteration?
**Answer**: Java collections maintain an internal modification counter (`modCount`). When an iterator is initialized, it captures `expectedModCount = modCount`. If structural modifications (`add()`, `remove()`, `clear()`) occur directly on the collection while the iterator is active, `modCount != expectedModCount` triggers an immediate fail-fast `ConcurrentModificationException`. To safely remove elements during iteration, use `iterator.remove()`.
