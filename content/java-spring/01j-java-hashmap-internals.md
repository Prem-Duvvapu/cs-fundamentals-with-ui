# HashMap Bucket Internals, Treeification & ConcurrentHashMap

## 🟢 Beginner Level

### How Java HashMap Works (Hashing & Bucketing)
A `HashMap` stores key-value pairs using a hash table backed by an array of buckets (`Node<K,V>[] table`).

```
Key ("user_101") ──► hashCode() ──► Hashing Function ──► Index = (n - 1) & hash ──► Bucket[5]
                                                                                       │
                                                                                 [Key | Value]
```

1. **Hash Computation**: `hash = key.hashCode() ^ (hash >>> 16)` (Bit-spread masking to minimize hash collisions).
2. **Bucket Indexing**: `index = (n - 1) & hash` (Bitwise AND with table length minus 1; table capacity is always a power of 2).
3. **Put Operation**: If the bucket is empty, a new `Node` is placed at `table[index]`. If a collision occurs, a linked list is formed.

---

## 🟡 Intermediate Level

### Collision Resolution, Load Factor & Treeification

```
BUCKET INDEX [5] COLLISION RESOLUTION:

Linked List Mode (< 8 collisions):
[Node 1] ──► [Node 2] ──► [Node 3] ──► [Node 4]  (O(K) search time)

Treeification (>= 8 collisions & table.length >= 64):
        [TreeNode 4]
        /          \
   [TreeNode 2]   [TreeNode 6]    (O(log K) Red-Black Tree search time)
   /          \   /          \
 [TN 1]     [TN 3] [TN 5]   [TN 7]
```

#### Key HashMap Parameters:
- **Default Initial Capacity**: `16` (Always powers of 2: 16, 32, 64...).
- **Default Load Factor**: `0.75` (Threshold = $\text{capacity} \times 0.75 = 12$).
- **TREEIFY_THRESHOLD**: `8` (Converts linked list bucket to a Red-Black Tree when elements in a single bucket reach 8 and table capacity $\ge 64$).
- **UNTREEIFY_THRESHOLD**: `6` (Converts Red-Black Tree back to a linked list during resize if nodes drop to 6).
- **MIN_TREEIFY_CAPACITY**: `64` (If table capacity $< 64$, resizes table instead of treeifying).

---

## 🔴 Expert Level

### `ConcurrentHashMap` vs. `HashMap` & Thread-Safe Concurrency

1. **Why `HashMap` is Thread-Unsafe**:
   - In Java 7, concurrent resizing could create cyclic loops in bucket linked lists, causing 100% CPU infinite loops during `get()`.
   - In Java 8+, concurrent `put()` calls can cause silent data loss due to lost updates.

2. **Java 8+ `ConcurrentHashMap` Internals**:
   - Eliminates Segment locking (used in Java 7).
   - Uses **CAS (`compareAndSwap`)** for initializing empty buckets (lock-free).
   - Uses **Synchronized Node Locking** locking strictly the single head `Node` of the bucket during collision insertion, allowing concurrent writes to separate buckets without thread contention.

### Key Interview Questions

#### Q1: Why must table capacity in HashMap always be a power of 2 ($2^k$)?
**Answer**:
1. When capacity $n = 2^k$, the mathematical modulo operation `hash % n` is bitwise identical to `(n - 1) & hash`. Bitwise AND executes in a single CPU cycle, whereas integer division modulo takes dozens of clock cycles.
2. An even power of 2 ensures `(n - 1)` has all lower bits set to `1` (e.g. $16 - 1 = 15 = 00001111_2$), guaranteeing uniform distribution across all bucket indices without clustering on even numbers.

#### Q2: Why must both `equals()` and `hashCode()` be overridden together?
**Answer**:
The `equals()` and `hashCode()` contract specifies:
- If `a.equals(b) == true`, then `a.hashCode()` **MUST** equal `b.hashCode()`.
- If you override `equals()` without `hashCode()`, two logically equal objects will have different default memory-address-based hash codes. They will map to different bucket indices in a `HashMap`, making it impossible to retrieve the stored entry (`map.get(new User(1))` returns `null`).
