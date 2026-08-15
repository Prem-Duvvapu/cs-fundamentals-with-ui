# File Organization, RAID Storage Arrays & Advanced Indexing

## 🟢 Beginner Level

### Physical Storage & File Organization Models
A database organizes records inside fixed-size disk blocks (typically 4KB to 16KB):

```
DATABASE FILE ORGANIZATIONS:
1. Heap File (Unordered)       ──► Records placed in random order at end of file. Fast INSERTs, slow O(N) scans.
2. Sequential File (Ordered)   ──► Records sorted by Primary Key. Fast Binary Search O(log N), slow INSERTs.
3. Hash File (Hashed)          ──► Hash function maps search key directly to bucket index. O(1) point lookups.
```

---

## 🟡 Intermediate Level

### Redundant Arrays of Independent Disks (RAID)

RAID balances storage capacity, I/O throughput, and fault tolerance across physical disk arrays:

```
┌───────────┬──────────────────────────────────┬──────────────────┬────────────────────────┐
│ RAID Level│ Strategy                         │ Capacity         │ Fault Tolerance        │
├───────────┼──────────────────────────────────┼──────────────────┼────────────────────────┤
│ RAID 0    │ Block Striping (No Parity)       │ N × Disk Size    │ 0 Disks (Data lost!)   │
│ RAID 1    │ Disk Mirroring                   │ 1 × Disk Size    │ N - 1 Disks (Full copy)│
│ RAID 5    │ Block Striping + Dist. Parity (P)│ (N - 1) × Size   │ 1 Disk Failure         │
│ RAID 6    │ Block Striping + Dual Parity(P+Q)│ (N - 2) × Size   │ 2 Simultaneous Failures│
│ RAID 10   │ Mirrored Stripes (1 + 0)         │ (N / 2) × Size   │ 1 Disk per mirror pair │
└───────────┴──────────────────────────────────┴──────────────────┴────────────────────────┘
```

#### RAID 5 Parity Calculation:
Parity block $P = B_1 \oplus B_2 \oplus B_3$. If Disk 2 fails, data is reconstructed via:
$$B_2 = B_1 \oplus B_3 \oplus P$$

---

## 🔴 Expert Level

### Bitmap Indexing & Inverted Indexes

#### 1. Bitmap Indexing (Low-Cardinality Attributes):
Used in OLAP data warehouses for columns with few distinct values (e.g., `Gender` $\in \{\text{M, F}\}$, `MaritalStatus`).
- Generates a compact bit vector per distinct value.
- Complex multi-condition queries execute in CPU registers using bitwise hardware instructions:
  $$\text{BitVector}(\text{Gender} = \text{'F'}) \ \& \ \text{BitVector}(\text{Status} = \text{'Active'})$$

#### 2. Inverted Indexing (Full-Text Search):
Used in search engines (Elasticsearch, Lucene) and database text search (`tsvector` in Postgres):
- Maps individual terms to a **Postings List**:
  ```
  "database" ──► [Doc 1 (pos 3), Doc 3 (pos 1), Doc 7 (pos 12)]
  "index"    ──► [Doc 1 (pos 4), Doc 2 (pos 8), Doc 3 (pos 2)]
  ```
- Fast phrase and multi-keyword intersection using skip lists.

### Key Interview Questions

#### Q1: Why is B+ Tree preferred over Hash Indexing in general relational databases?
**Answer**:
A **Hash Index** provides $O(1)$ point lookups (`WHERE id = 5`), but cannot support **Range Queries** (`WHERE age BETWEEN 20 AND 30`) or prefix sorting (`ORDER BY name`). A **B+ Tree** supports both $O(\log_B N)$ point lookups and $O(\text{range})$ sequential scans because leaf nodes form a doubly-linked list.

#### Q2: What is the "Write Hole" problem in RAID 5 and how do modern storage controllers solve it?
**Answer**:
If power is lost mid-write after data is written but before parity is updated, data and parity become desynchronized. Modern controllers solve this using Non-Volatile RAM (NVRAM) write-back cache batteries or journaling.
