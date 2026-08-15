# Database Indexing & B/B+ Tree Data Structures

## 🟢 Beginner Level

### What is Database Indexing?
An **Index** is an auxiliary data structure that improves the speed of data retrieval operations on a database table at the cost of additional writes and storage space.

### Index Types

1. **Primary Index**: Defined on an ordered key field of a data file (Primary Key).
2. **Clustered Index**: Data rows in the table are physically sorted on disk in the order of the clustered index key (Only 1 Clustered Index per table, e.g., InnoDB Primary Key).
3. **Secondary (Non-Clustered) Index**: Logical index built on non-ordering fields. Contains index keys and pointers (row IDs / PKs) to physical data pages.
4. **Dense Index**: Has an index record for EVERY search key value in the data file.
5. **Sparse Index**: Has index records for only SOME search key values (requires sorted data file).

---

## 🟡 Intermediate Level

### B-Trees vs. B+ Trees

Database storage engines use **B+ Trees** rather than binary search trees or standard B-Trees for disk indexing.

```
                         ┌──────────────┐
                         │   [20 | 50]  │   ◄── Root Node
                         └──────┬───────┘
           ┌────────────────────┴────────────────────┐
           ▼                                         ▼
     ┌──────────┐                              ┌──────────┐
     │  [5 | 10]│                              │ [30 | 40]│   ◄── Internal Nodes
     └────┬─────┘                              └────┬─────┘
   ┌──────┴──────┐                           ┌──────┴──────┐
   ▼             ▼                           ▼             ▼
 ┌───┬───┐    ┌───┬───┐                   ┌───┬───┐    ┌───┬───┐
 │ 5 │ 8 │───►│10 │15 │──────────────────►│30 │35 │───►│40 │48 │   ◄── Leaf Nodes (Linked List)
 └───┴───┘    └───┴───┘                   └───┴───┘    └───┴───┘
```

#### Structural Differences

| Property | B-Tree | B+ Tree |
| :--- | :--- | :--- |
| **Data Storage** | Data pointers stored in internal AND leaf nodes | Data pointers stored **ONLY in leaf nodes** |
| **Leaf Node Connection**| Leaf nodes are isolated | Leaf nodes form a **Doubly Linked List** |
| **Branching Factor** | Lower (data pointers take space in internal nodes) | **Higher** (internal nodes only store search keys) |
| **Range Query Speed** | Slow (requires tree traversal for each key) | **Extremely Fast** (sequential linked list traversal) |

---

## 🔴 Expert Level

### Node Splitting & Rebalancing Algorithm in B+ Trees

When inserting a key into a B+ Tree node of order $M$:
1. If node contains fewer than $M-1$ keys, insert in sorted order.
2. If node overflows ($M$ keys):
   - Split node into two nodes containing $\lceil M/2 \rceil$ and $\lfloor M/2 \rfloor$ keys.
   - For **Leaf Node Split**: Copy the smallest key of right child up to parent node and maintain leaf linked-list pointers.
   - For **Internal Node Split**: Push the median key UP to parent node (do not keep copy in right child).

### Disk I/O Complexity

- Height of B+ Tree with fanout $B$ containing $N$ records: $H \approx \log_B(N)$.
- For $N = 10,000,000$ rows and page size 16KB ($B \approx 1000$):
  - Tree height $= \log_{1000}(10^7) = 3$ disk reads!

### Interview Questions

1. **Why does MySQL InnoDB use Primary Key as Clustered Index pointer for Secondary Indexes instead of direct physical disk offsets?**
   - *Answer*: If page splits or compaction reorders table rows on disk, physical offsets change. Using Primary Keys avoids updating secondary index pointers on every row re-location.

2. **What is Index Condition Pushdown (ICP) and Cover Indexing?**
   - *Answer*: A **Covering Index** satisfies a query entirely from index leaf nodes without touching data pages (`SELECT id, age FROM users WHERE age > 25`). **ICP** pushes `WHERE` predicates down to the storage engine layer during index scans.
