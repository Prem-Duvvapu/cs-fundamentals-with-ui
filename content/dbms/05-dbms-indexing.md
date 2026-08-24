# Database Indexing & B/B+ Tree Data Structures

## 🟢 Beginner Level

### The Textbook Index Analogy
Finding the chapter on "sorting" in a 1,200-page textbook by reading every page is a **full table scan**. Instead, you open the index at the back, see "sorting … page 214", and jump straight there. A database index is exactly that back-of-book index: a small, sorted auxiliary structure whose entries point to where the real rows live. The database pays for it twice — extra disk space, and extra work on every write — so that reads stop being linear searches.

### What Is an Index?
An **Index** is a disk-resident data structure (almost always a B+ Tree) that maps search-key values to row locations.

- **Read path**: turns an O(N) table scan into an O(log N) tree descent — a few page reads instead of thousands.
- **Storage cost**: typically 10% to 40% of the table size, depending on key width and fill factor.
- **Write cost**: every INSERT/UPDATE/DELETE on indexed columns must update the tree (plus the write-ahead log), so ingest throughput drops.
- **Transparency**: the SQL text never changes; the optimizer decides whether to use the index.

### Why Not Just Scan the Table?
Concrete numbers make the trade obvious. Assume an `orders` table with 100 million rows at ~150 bytes each:

```
Table size            100,000,000 x 150 B  =  15 GB  =  ~915,000 pages of 16 KB
Full sequential scan  (HDD at 180 MB/s)    =  ~85 seconds
Full sequential scan  (NVMe SSD at 3 GB/s) =  ~5 seconds
B+ tree point lookup  (3 page reads)       =  ~0.3 ms on SSD (cold cache)
Point-lookup speedup                       =  ~15,000x faster than scanning
```

The wider the table and the more selective your predicate, the bigger the win. Conversely, a query that matches half the table gains nothing — reading 15 GB sequentially beats 50 million random lookups.

### The Classic Index Types

| Type | Built On | Leaf Entry Contains | Limit Per Table |
| --- | --- | --- | --- |
| Primary index | Ordered key field of the data file | Key + anchor to first record of each block | One (defines physical order) |
| Clustered index | The key the table is physically sorted by | The entire row (InnoDB) or the row itself nearby | Exactly one |
| Secondary (non-clustered) | Any other column(s) | Key + row locator: PK value (InnoDB) or RID (SQL Server heap) | Many |
| Dense | Any key | One entry per search-key value | Either density possible |
| Sparse | Sorted data file only | One entry per block (first key of the block) | Only on the physical sort key |

- **Dense vs Sparse**: a dense index answers "does key K exist?" directly from the index. A sparse index locates the **block** containing K, then searches inside the block. Sparse indexing is only possible when the data file is physically ordered by the search key — which is why it appears on the clustering key and nowhere else.
- **Clustered vs Secondary**: there can be only one physical row order, hence one clustered index per table. Everything else is secondary and must "hop" to the row.

### What Does an Index Cost You?
1. **Space**: a secondary index on a 100M-row table with 8-byte keys costs roughly 3 to 4 GB (key + PK pointer + page overhead).
2. **Write amplification**: inserting into a table with 5 secondary indexes performs 6 tree modifications (1 clustered + 5 secondary), each generating redo log records.
3. **Locking hotspots**: monotonic keys concentrate all inserts on the rightmost leaf page, serializing concurrent writers.
4. **Optimizer risk**: more indexes means more plan choices — outdated statistics can steer the optimizer into the wrong one.

Rule of thumb: index columns that appear in WHERE joins and ORDER BY clauses **with high selectivity**, and audit for unused indexes quarterly.

## 🟡 Intermediate Level

### B-Tree vs B+ Tree: The Structural Difference

```
                LEVEL 0 :  ROOT (internal)
                     [ 30 ]
                   /        \
                  /          \
   LEVEL 1 :  [ 12 ]         [ 45 ]          (internal nodes hold
   /        \                /        \       only routing keys)
 [5,9]    [12,20]        [31,40]    [45,52]
   <->      <->            <->        <->
   LEVEL 2 : leaves, chained into a doubly-linked list
   (real row payloads live ONLY here)
```

| Property | B-Tree | B+ Tree |
| --- | --- | --- |
| Payload location | Internal nodes AND leaves | Leaves only |
| Internal node contents | Keys + data pointers (fat entries) | Routing keys + child pointers only |
| Fanout | Lower (payload crowds out entries) | Higher (slim entries) |
| Leaf linkage | Isolated nodes | Doubly-linked list |
| Range scan | Tree-walk per key, revisits upper levels | One descent, then ride the leaf chain |
| Point lookup | Sometimes finds data early (no leaf visit) | Always descends to leaf |

Every mainstream engine (InnoDB, PostgreSQL nbtree, Oracle, SQL Server, SQLite) chose the B+ Tree because the linked leaf layer makes range scans and full index scans nearly sequential I/O, and the slim internal entries maximize fanout — and fanout is what keeps the tree shallow.

### Fanout Math: Why a 3-Level Tree Indexes 100 Million Rows
Assume MySQL InnoDB defaults: 16 KB pages, BIGINT keys.

- Internal entry = 8-byte key + 6-byte child page number = 14 bytes → ⌊16384 ÷ 14⌋ ≈ 1170 entries per page. After page headers and the slot directory, use a conservative fanout F ≈ 1000.
- A leaf page storing 150-byte rows holds ≈ ⌊16384 ÷ 150⌋ ≈ 100 rows.
- A tree with root + internals + leaves ("height 3") therefore holds:

```
Capacity(H levels)  =  F raised to (H-1)  x  rows per leaf

Height 2 :   10^3  x 10^2   =   100,000      rows
Height 3 :   10^6  x 10^2   =   100,000,000  rows   (one hundred million)
Height 4 :   10^9  x 10^2   =   100 billion  rows
```

This is the punchline interviewers want: **fanout grows exponentially with height**, so a 3-level B+ Tree reaches any of 100M+ rows in 3 page reads — and the general bound is H = ⌈log_F(N)⌉.

| Access Path | Latency | Relative Cost |
| --- | --- | --- |
| RAM (buffer pool hit) | ~25-100 ns | 1x |
| NVMe SSD random read | ~20-100 µs | ~1000x RAM |
| SATA SSD random read | ~100 µs | ~1000x RAM |
| 7200 RPM HDD random read | ~4 ms rotation + 4-9 ms seek ≈ 8 ms | ~80x SSD |
| Cold 3-level descent on HDD | 3 × 8 ms = 24 ms | why caching the upper levels matters |

### Trace 1: Secondary Index Point Lookup (InnoDB Bookmark Lookup)

```
SELECT * FROM users WHERE email = 'bob@example.com';

idx_users_email : secondary B+ tree, leaf payload = primary key value
PRIMARY KEY id  : clustered B+ tree, leaf payload = entire row

Step 1  Descend idx_users_email root          1 page read
Step 2  Descend its internal level            1 page read (usually cached)
Step 3  Leaf: locate 'bob@example.com'        1 page read, payload = id = 48213
Step 4  Descend clustered tree with id 48213  1 to 3 page reads (root pinned)
Step 5  Clustered leaf returns the full row

Total: 4 to 6 logical page reads, typically 1 to 2 physical reads
```

That Step 4 hop is the famous **bookmark lookup** (SQL Server term) or **backlink lookup**. Because InnoDB secondary leaves store the **primary key value** rather than a physical address, page splits never invalidate secondary indexes — the price is a second tree descent whenever the query selects columns not in the secondary index. SQL Server heaps instead store an 8-byte RID (FileID:PageID:Slot) and patch up moves with forwarding pointers.

### Trace 2: Covering Index — Zero Table Touches

```sql
CREATE INDEX idx_orders_customer_status ON orders (customer_id, status);

EXPLAIN SELECT customer_id, status
FROM orders
WHERE customer_id = 42;
-- Plan shows Extra: "Using index"
-- Meaning: the secondary leaf ALREADY contains customer_id, status and the
-- hidden primary key, so the clustered tree is never consulted.
```

Fetching N matching rows without a covering index costs 1 index descent plus N random clustered-tree hops (each potentially a cold SSD read). With the covering index it is 1 descent plus a short sequential walk along linked leaves. This is exactly why `SELECT *` defeats covering strategies — every extra selected column widens the required index.

### Composite Indexes and the Leftmost Prefix Rule
A composite B+ Tree sorts by column A, then B, then C — like a phone book sorted by surname then firstname. You cannot efficiently look someone up by firstname alone.

```
INDEX (tenant_id, status, created_at)

WHERE tenant_id = ?                            seek using column 1
WHERE tenant_id = ? AND status = ?             seek using columns 1-2
WHERE tenant_id = ? AND created_at > ?         seek column 1, filter column 3
WHERE tenant_id = ? AND status = ? AND created_at > ?
                                               full 3-column seek (range LAST)
WHERE status = ?                               cannot seek, prefix is broken
```

- **Design order**: equality predicates first, the range predicate last — an early range column prevents the following columns from contributing to the seek (they degrade to filters inside the scanned range).
- **ORDER BY bonus**: an index on (a, b) satisfies ORDER BY a, b without a sort step.
- **Skip-scan exception**: MySQL 8.0.13+ and Oracle can skip a missing low-cardinality prefix, but this is a fallback, not a design principle; PostgreSQL has no skip scan.

### When an Index Hurts
1. **Low selectivity**: WHERE status = 'ACTIVE' matching 30M of 100M rows means 30M random leaf-to-table hops — far worse than one 15 GB sequential scan. The optimizer correctly ignores the index.
2. **Write-heavy tables**: every index adds tree maintenance to each DML; high-ingest logging tables often drop all but the essential index.
3. **Tiny tables**: a few thousand rows fit in a handful of pages; scanning them is faster than a descent and cheaper on cache.
4. **Redundant indexes**: index (A) is wasted if (A, B) exists — the longer one serves all of (A)'s queries.

## 🔴 Expert Level

### Inside the Page: Physical Node Layout
A B+ Tree node is exactly one disk page. InnoDB's 16 KB index page anatomy:

```
Offset 0        FIL Header (38B): page number, page type, prev/next
                page links, newest modification LSN
Offset 38       Index Header: number of records, level (0 = leaf),
                index id, garbage list, last-insert direction/position
Offset ~58      FSEG entries and free-space bookkeeping
Offset ~112     User record heap: records allocated downward from here;
                two sentinel records (infimum and supremum) bracket them
Page end        Page Directory: slot array pointing to every 4th-8th
                record, enabling in-page binary search; FIL Trailer (8B)
```

- **In-page search**: the slot directory gives binary search inside the page; the tree search is thus binary search at every scale.
- **PostgreSQL nbtree** differs: 8 KB pages, block 0 is a metapage, and it implements Lehman-Yao concurrency with a high-key (upper-bound sentinel) per page plus a right-sibling link, so readers never latch parent pages while a split is in flight. Since PostgreSQL 13, leaf pages can deduplicate duplicate keys into posting-list tuples.

### Node Split Walkthrough (Order m = 4, Max 3 Keys per Node)
Convention (matches this platform's simulator): order m ⇒ maximum m − 1 = 3 keys per node, minimum ⌈m/2⌉ − 1 = 1 key. Insert keys 10, 20, 30, 40, 50, then 60 into an empty tree:

```
INSERT 10, 20, 30        LEAF [10,20,30]            (exactly full, legal)

INSERT 40                overflow: [10,20,30,40]
   split at middle  ->   LEFT [10,20]   RIGHT [30,40]
   COPY-UP: separator 30 copied into new ROOT [30]
   leaves stay chained:  [10,20] <-> [30,40]

INSERT 50                50 >= 30 routes right: [30,40,50]  fits, no split

INSERT 60                overflow: [30,40,50,60]
   split            ->   [30,40]   [50,60]
   COPY-UP: separator 50 -> ROOT [30,50]

FINAL TREE (height 2)
          [ 30 , 50 ]
          /        \
    [10,20]      [30,40] <-> [50,60]
```

- **Leaf split = COPY-UP**: the separator is COPIED to the parent and also stays in the right leaf, because range scans traverse leaves and must still find 30 there.
- **Internal split = PUSH-UP**: when the root itself eventually overflows, its median key MOVES up into a new root — it exists only at the parent level. Each root overflow raises the height by exactly 1; the tree grows from the top, never sideways, which is why balance is guaranteed without rotations.
- **Real engines deviate deliberately**: PostgreSQL picks the split point by physical tuple size and MOVES the boundary tuple (avoiding duplicate separators for monotonically increasing keys); InnoDB splits at the page middle but detects strictly ascending inserts and leaves the old page empty instead (its insertion-point heuristic), reclaiming space later via MERGE_THRESHOLD-triggered merges at 50% occupancy. Fill factor knobs: PostgreSQL fillfactor 90 (leaves), SQL Server fillfactor applied at rebuild time only.

### Caching Reality: Steady-State I/O
- The root page is essentially permanently resident in the buffer pool; internal levels exceed 99% hit rate after warm-up.
- A warmed 3-level lookup therefore costs about **1 physical read** (~100 µs on SSD, ~8 ms on HDD) — not 3.
- After a cold restart (cache flushed), the first burst of queries eats 3 physical reads each; this is why post-deploy latency spikes happen.
- Sizing guidance: InnoDB buffer pool ≈ 60-75% of machine RAM; verify with EXPLAIN (ANALYZE, BUFFERS) in PostgreSQL — shared hit vs read counters expose logical vs physical I/O.

### B+ Tree vs LSM-Tree: The Write-Optimized Challenger
B+ Trees mutate pages in place (with WAL protection). LSM-trees (RocksDB, Cassandra, HBase, MyRocks) never modify data in place: writes land in an in-memory memtable, flush as immutable SSTable files, and background **compaction** continuously merges overlapping runs (size-tiered or leveled) so old versions are discarded.

| Property | B+ Tree (in-place) | LSM, Leveled (RocksDB-style) |
| --- | --- | --- |
| Point read | 1-3 page descents | Probe each level; bloom filters cut misses |
| Range read | Excellent (linked leaves) | Merge across all levels |
| Write amplification | ~2-4x (record + WAL + split rewrite) | ~10-30x (compaction rewrites data repeatedly) |
| Space amplification | ~1.15-1.33x (fill factor 66-90%) | ~1.1-2x bounded by level ratios |
| Sweet spot | Read-heavy OLTP (PostgreSQL, InnoDB) | Write-heavy ingestion (telemetry, message metadata) |

Interview framing: B+ trees buy read performance with in-place write cost; LSMs buy write throughput with read amplification and compaction CPU. Neither dominates — engines pick per workload.

### Failure Modes
1. **Index bloat from random keys**: UUIDv4 inserts hit arbitrary leaves, forcing 50/50 splits everywhere; average fill drops toward 66%, inflating the tree ~1.5x and diluting the buffer pool. Fixes: time-ordered IDs (UUIDv7, ULID, Snowflake), periodic REINDEX / pg_repack, OPTIMIZE TABLE in MySQL.
2. **Duplicate-heavy secondary indexes**: an index on `status` with 3 distinct values across 100M rows builds a massive tree of equal-key runs (InnoDB appends the hidden PK to make entries unique, so it is not literally duplicated — but the scan still returns millions of rows). Prefer a composite index led by a selective column, or a partial index (CREATE INDEX … WHERE status = 'PENDING' in PostgreSQL).
3. **Rightmost hotspot**: monotonic keys serialize all writers onto one leaf page; partitioned indexes or randomized prefixes trade locality for spread.
4. **Stale statistics steering the planner away** from a good index — covered in depth in the Query Optimization topic.
5. **Unused-index tax**: write amplification and backup bloat with zero read benefit; hunt with pg_stat_user_indexes.idx_scan or MySQL sys.schema_unused_indexes.

### High-Frequency Interview Q&As

### Q1: Why is the PRIMARY KEY the clustered index in MySQL InnoDB?
**Answer**: Some physical row order must exist, and InnoDB makes it the PK's B+ Tree, with full rows in its leaves. Two consequences: (1) secondary index leaves store PK values, not physical addresses, so page splits and row migrations never require rewriting secondary indexes; (2) a table declared without a PK silently gets one — the first NOT NULL UNIQUE index, else a hidden 6-byte monotonic row id (GEN_CLUST_INDEX), which reintroduces the rightmost-hotspot and locality problems. PostgreSQL contrasts: it uses an unordered heap with independent indexes, relying on HOT updates (no indexed column changed → no index maintenance) to soften the cost.

### Q2: What exactly does a covering index eliminate?
**Answer**: The bookmark lookup. If every column referenced by the query (SELECT, WHERE, JOIN, ORDER BY) lives in the index's own leaves, the engine answers from the index alone — visible as "Using index" (MySQL EXPLAIN Extra) or an Index Only Scan (PostgreSQL). For N matched rows you save N random clustered-tree hops and replace them with sequential leaf-chain walking. SQL Server supports adding payload-only columns via INCLUDE so they widen the leaf without entering the seek key.

### Q3: B+ Tree or hash index — how do you choose?
**Answer**: Hash gives O(1) exact-match probes but nothing else: no ranges (BETWEEN, <, >), no prefix LIKE 'abc%', no ORDER BY satisfaction, no sorting. A B+ Tree gives O(log N) point lookups plus all of the above via ordered leaves, so it is the relational default. Hash earns its place for: MEMORY-engine lookups, InnoDB's Adaptive Hash Index (which automatically memoizes hot index-page searches into an in-memory hash), and specialized structures like Redis or extendible hashing in academic settings. PostgreSQL's HASH index became production-grade (WAL-logged) only in version 10.

### Q4: Dense vs sparse indexes — why can't a secondary index be sparse?
**Answer**: Sparse indexing anchors each block to the first key of that block, which is only meaningful if the file is physically sorted on the search key. A table has exactly one physical order, so only the clustering key admits a sparse index; every secondary key is unordered relative to the rows and must be dense. Modern descendant: BRIN (Block Range Index) in PostgreSQL stores per-block-range min/max summaries — a lossy, tiny "sparse" cousin ideal for append-only time-series where physical order correlates with the indexed column.

### Q5: Why are random UUIDv4 primary keys considered an anti-pattern in InnoDB?
**Answer**: Three compounding effects: (1) randomness scatters inserts across the whole key space, triggering page splits everywhere and dropping average page fill to ~66% (about 1.5x space); (2) the working set stops fitting in cache because "hot" inserts no longer touch one page — expect more SSD/HDD reads per insert; (3) the 36-character PK is replicated into every secondary index leaf, multiplying the damage. Time-ordered identifiers (AUTO_INCREMENT BIGINT, Snowflake, ULID, UUIDv7) restore right-edge locality.

### Q6: How do you order columns in a composite index?
**Answer**: Equality predicates go first, the range predicate goes last, and the resulting sequence should also match frequent ORDER BY patterns. Among several equality columns, put the most selective first when you also care about skip-scan behavior and tighter range bounding; the leftmost-prefix rule governs which queries can seek at all. Validate with the actual plan: a seek whose "read ahead" is enormous signals the range opened too early.
