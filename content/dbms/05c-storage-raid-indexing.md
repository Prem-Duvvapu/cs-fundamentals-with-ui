# File Organization, RAID Storage Arrays & Advanced Indexing

## 🟢 Beginner Level

### The Warehouse Analogy
Think of a database as a warehouse of boxes (rows) stored on shelves (disk blocks):

- **Heap file** = dumping new boxes wherever there is free space. Putting a box away is instant; finding one specific box means walking every aisle.
- **Sequential (sorted) file** = alphabetized aisles. Finding "Sony" is fast (binary search), but inserting a box between "Sonny" and "Soo" forces you to shift half the aisle.
- **Hash file** = lockers assigned by a formula on the customer's badge number. Walking straight to locker f(badge) takes one step, but "all customers whose name starts with S" requires opening every locker.
- **RAID** = spreading shelves across several rooms with photocopies or checksum sheets, so one flooded room does not destroy the inventory.

### Three File Organization Models

| Organization | Records Placed | Point Lookup | Insert | Range Scan |
| --- | --- | --- | --- | --- |
| Heap (unordered) | First free slot | Full scan O(N) | O(1), append | Painful (unsorted) |
| Sequential (ordered by key) | Sorted position | Binary search O(log N) | O(N) shifting | Excellent |
| Hash | Bucket f(key) | O(1) expected | O(1) | Impossible (unordered) |

### Keeping Sequential Files Sorted Without Rewriting Everything
Sorted files have an Achilles heel: insertion in the middle. Classic file systems solved it with **overflow areas**:

- The file is divided into blocks; each block keeps spare slots, and a shared overflow chain absorbs inserts that do not fit.
- Lookup = binary search the main area, then chase the overflow chain (which is kept sorted but unindexed).
- As overflow chains grow, binary search degrades toward linear scans — so the file is periodically **reorganized** (re-sorted, overflow merged back).
- Databases inherited the lesson differently: instead of physically shifting rows, InnoDB's B+ Tree clustered index IS the sorted file, and page splits replace global reorganization.

### Hash File Internals: Static vs Extendible
- **Static hashing**: h(key) mod B picks one of B fixed buckets. Growth is its doom — once buckets overflow, chains of extra pages form and lookups degrade from O(1) toward O(N). Rehashing into more buckets requires rewriting everything.
- **Extendible hashing**: the bucket directory doubles on demand and buckets split locally using deeper bit prefixes of the hash — only the splitting bucket is rewritten. This preserves expected O(1) lookups at any scale, which is why the idea survives inside modern KV stores and LSM memtable flushing policies.

- Heap files are the default in PostgreSQL and most bulk-loading pipelines precisely because inserts never reorder anything.
- Sequential organization survives inside databases as the **clustered index**: MySQL InnoDB always stores rows sorted by primary key.
- Hash organization appears as explicit hash indexes and internally in join operators, not as a general row store.

### Records, Blocks and the Blocking Factor
Records live inside fixed-size blocks (pages), and block math decides every I/O estimate:

```
Disk block size        =  8192 bytes (8 KB typical)
Record size            =  160 bytes
Usable records/block   =  floor(8192 / 160)      =  51 records
Blocking factor bfr    =  51 records per block

1,000,000-row table    =  ceil(10^6 / 51)  =  ~19,608 blocks

Heap point lookup      =  up to 19,608 block reads   (no index)
Sequential file lookup =  log2(19608) ~ 15 reads     (binary search)
B+ tree lookup         =  2 to 4 reads regardless of table growth
```

Two layout rules follow: **unspanned** storage (a record never crosses a block boundary) wastes the leftover bytes of each block but makes every record fetch a single-block read; and keeping records fixed-length lets the engine compute slot addresses arithmetically instead of walking byte offsets.

### The Storage Hierarchy Latency Ladder
Everything about indexing and RAID exists to minimize expensive trips down this ladder:

| Layer | Random Access | Sequential Throughput | Notes |
| --- | --- | --- | --- |
| CPU L1 cache | ~1 ns | n/a | register-width transfers |
| RAM (DRAM) | ~25-100 ns | ~20 GB/s | buffer pool lives here |
| NVMe SSD | ~20-100 µs | 3-7 GB/s | ~1000x RAM latency |
| SATA SSD | ~100 µs | ~550 MB/s | no seek cost, still protocol-bound |
| 7200 RPM HDD | ~8 ms (seek 4-9 ms + rotation 4.17 ms avg) | 150-250 MB/s | mechanical arm movement |

The decisive asymmetry: on an HDD a random 8 KB read costs ~8 ms while a sequential read of the same block amid a stream costs microseconds — roughly an **80x gap on SSD-class devices and ~100,000x on HDDs**. Every structure in this topic (B+ Trees, striping, bitmap indexes) is a strategy to turn random I/O into fewer, larger, more predictable I/Os.

### What RAID Solves
A single spinning disk is a single point of failure with limited IOPS. **RAID (Redundant Array of Independent Disks)** virtualizes N physical disks into one logical volume, trading some capacity or performance for fault tolerance, or sacrificing redundancy for raw speed.

## 🟡 Intermediate Level

### RAID Levels at a Glance

| Level | Strategy | Usable Capacity (N disks) | Survives | Small-Write Penalty |
| --- | --- | --- | --- | --- |
| RAID 0 | Striping, no redundancy | N x size | Nothing — any loss kills all | None (fastest) |
| RAID 1 | Full mirroring | 1 x size per mirror pair | All but last disk of a pair | 2 writes (one per copy) |
| RAID 5 | Striping + distributed single parity | (N-1) x size | 1 disk failure | 4 I/Os (read-modify-write) |
| RAID 6 | Striping + dual parity P+Q | (N-2) x size | 2 simultaneous failures | 6 I/Os |
| RAID 10 | Mirrored pairs, striped across pairs | (N/2) x size | 1 disk per pair (worst case 1) | 2 I/Os |

### RAID 5 Rotated Parity Layout (4 Disks)

```
Stripe 0:   A0   B0   C0   P0      P0 = A0 xor B0 xor C0
Stripe 1:   A1   B1   P1   C1      parity ROTATES left each stripe,
Stripe 2:   A2   P2   C2   B2      so no single disk becomes the
Stripe 3:   P3   B3   C3   A3      dedicated parity bottleneck
```

Rotating parity matters for throughput: if parity lived permanently on disk 4, every small write would queue on that one spindle. Rotation spreads the extra write across all members.

### Parity Math: XOR Is Its Own Inverse
Parity is plain bitwise XOR, legal because XOR is self-inverse: (a ⊕ b) ⊕ b = a.

```
Given data bytes:   D1 = 11010010     D2 = 01101110     D3 = 10100101

Parity:  P  =  D1 xor D2 xor D3  =  11010010 xor 01101110  =  10111100
                                 10111100 xor 10100101     =  00011001

Disk holding D2 dies. Rebuild D2 from survivors plus parity:

         D2  =  D1 xor D3 xor P
             =  11010010 xor 10100101  =  01110111
             =  01110111 xor 00011001  =  01101110   (exactly the lost byte)
```

The controller performs this XOR across every stripe of the failed disk while streaming reconstructed blocks to the replacement drive.

### Concrete Array Math: Four 1 TB Disks
Let X = random IOPS deliverable by one disk (e.g., 150 for a 7200 RPM HDD, 10,000+ for an SSD member).

| Metric | RAID 0 | RAID 5 | RAID 6 | RAID 10 |
| --- | --- | --- | --- | --- |
| Usable capacity | 4 TB | 3 TB | 2 TB | 2 TB |
| Random read IOPS | 4X | 4X | 4X | 4X |
| Random write IOPS | 4X | 4X ÷ 4 = 1X | 4X ÷ 6 ≈ 0.67X | 4X ÷ 2 = 2X |
| Failure tolerance | 0 disks | 1 disk | 2 disks | 1 per pair |

- The RAID 5 write penalty dissected: modifying one block needs the OLD data block and OLD parity read (2 reads), then NEW data and NEW parity written (2 writes) — four physical I/Os per logical write. This is why parity RAID is poor for write-heavy OLTP redo logs.
- Rebuild time: streaming 1 TB back at a healthy 200 MB/s takes ≈ 5,000 s ≈ **83 minutes** under ideal conditions; production controllers throttle rebuilds, stretching it to many hours while the array serves degraded traffic.
- Degraded-read tax: until rebuild finishes, every read touching the missing disk must be synthesized by reading all remaining member disks of that stripe — effective read IOPS drop toward (N-1)/N and latencies spike.

### Rebuild Behavior Compared (One Dead Disk of Four)

| Level | What Rebuild Reads | What It Writes | URE During Rebuild |
| --- | --- | --- | --- |
| RAID 0 | Nothing — array already lost | n/a | Catastrophic regardless |
| RAID 1 / 10 | 1 TB from the surviving mirror | 1 TB copy to spare | Harmless — plain copy |
| RAID 5 | All 3 TB of survivors + XOR | 1 TB reconstructed | Fatal — no second parity |
| RAID 6 | All 2 TB survivors + P and Q | 1 TB reconstructed | Recoverable via Q parity |

Mirrored rebuilds are both faster (sequential copy from one partner instead of reading every survivor) and safer (a bad sector is an annoyance, not an amputation) — the quantitative core of the RAID 10 recommendation for databases.

### Bitmap Indexing: Bitwise AND Worked Example
For a column with few distinct values, build one bit-vector per value, one bit per row. Sample table (8 rows):

```
RowID :   r1   r2   r3   r4   r5   r6   r7   r8
Gender:    M    F    F    M    F    F    M    F
Region:    N    W    W    W    E    W    N    E

Gender = F      :  0  1  1  0  1  1  0  1
Region = West   :  0  1  1  1  0  1  0  0

AND (both predicates):
                :  0  1  1  0  0  1  0  0      -> rows r2, r3, r6

Gender = M AND Region IN (North, East):
  North vector  :  1  0  0  0  0  0  1  0
  East  vector  :  0  0  0  0  1  0  0  1
  OR            :  1  0  0  0  1  0  1  1
  M vector      :  1  0  0  1  0  0  1  0
  AND           :  1  0  0  0  0  0  1  0      -> rows r1, r7
```

Eight rows need one byte per distinct value; one million rows with 4 gender values need ~500 KB total, versus tens of megabytes for a B+ Tree — and the whole predicate evaluates with word-at-a-time CPU instructions instead of millions of index probes.

- **Rowid encoding**: bit position IS the row number, so a set bit maps directly to a row fetch — no secondary key lookup needed.
- **Range predicates without range scans**: `age BETWEEN 30 AND 39` on a bitmap-per-value column ORs ten vectors; equality-heavy encodings turn ranges into cheap bitwise unions.
- **NULL handling**: a dedicated NULL vector per column (or the complement of all value vectors) keeps three-valued logic intact during AND/OR evaluation.
- **Star schemas**: fact-table joins to small dimensions can be pre-computed as materialized bitmap joins, letting warehouse queries filter millions of facts before touching a single row.

### Inverted Indexes: Postings Lists
An inverted index flips the mapping: instead of documents containing words, it maps each word to the documents — and word positions — containing it.

```
doc1 : "database index tuning guide"
doc2 : "index structure basics"
doc3 : "database internals"

TERM DICTIONARY          POSTINGS LIST
"database"    ->   doc1 (pos 1), doc3 (pos 1)
"index"       ->   doc1 (pos 2), doc2 (pos 1)
"internals"   ->   doc3 (pos 2)
```

- Boolean query `database AND index` intersects the two postings lists → doc1.
- Phrase query `"database index"` additionally checks positional adjacency → only doc1 qualifies.
- This is the core of Lucene/Elasticsearch segments and PostgreSQL's tsvector/GIN full-text indexes.

## 🔴 Expert Level

### Bitmap Internals: Compression and Concurrency
- **Naive bitmaps explode** when cardinality grows: 1M rows × 50,000 distinct values = 6.25 GB of mostly-zero vectors.
- **Roaring Bitmaps** fix this with adaptive 65,536-chunk containers: chunks with ≤4096 set bits use a sorted 16-bit array container; denser ones use a fixed 8 KB bitmap container; long runs compress into run-length containers. AND/OR run container-wise, costing work proportional to populated chunks, not rows.
- Evaluation cost for k predicates over N rows: O(k × N ÷ 64) with word-level parallelism — effectively free compared to any tree traversal.
- **Why bitmaps are OLAP-only**: setting or clearing one bit in a dense container locks the whole vector (and in classic Oracle implementations, the affected range), serializing concurrent writers. Row-by-row OLTP updates shred them.
- Cardinality rule of thumb: bitmaps pay off below roughly 10,000 distinct values on read-mostly analytical columns (gender, status, country, product category); above that, prefer B+ Trees or compressed encodings.

### Inverted Index Internals (Lucene Lineage)
- **Term dictionary as an FST**: Lucene stores the sorted term dictionary as a Finite State Transducer sharing prefixes/suffixes — lookups cost O(length of term), not O(log terms).
- **Postings compression**: document IDs are delta-encoded within each posting list (store gaps, which are small), then compressed with FOR/PFor frame-of-reference schemes; frequent terms shrink to a few bytes per million entries.
- **Skip pointers**: sparse jump entries inside long posting lists turn intersections from O(|A| × |B|) scanning into galloping advances; modern top-k retrieval adds WAND/MaxScore pruning that skips documents that cannot enter the result set.

### Beyond B+ Trees: BRIN and Bloom
- **BRIN (Block Range Index, PostgreSQL 9.5+)**: stores min/max of every block range (default 128 pages per range). A 1 TB append-only events table indexed on `created_at` might need a ~20 GB B+ Tree but only a **few megabytes** of BRIN summary — provided physical row order correlates with the column (correlation ≈ 1). Updates that shuffle order silently destroy its usefulness.
- **Bloom filters**: probabilistic set membership with tunable false-positive rate p ≈ (1 − e^(−k·n/m))ᵏ for k hashes, n keys, m bits; ~10 bits per key yields ~1% false positives. Engines embed them above SSTables (RocksDB, Cassandra) and as a PostgreSQL extension to skip partitions/index probes that cannot possibly match.

### RAID Internals: Stripe Units and Write Patterns
- Stripe/chunk sizes range 64 KB to 512 KB (mdadm default chunk = 512 KB; hardware controllers often 64-256 KB). Large chunks favor sequential streams; smaller chunks spread random I/O wider across spindles.
- **Full-stripe writes** (application writes exactly one complete stripe) skip the read-modify-write dance entirely — write-throughput-optimal. Log-structured filesystems such as ZFS achieve this naturally, which is why ZFS RAIDZ largely sidesteps the RAID 5 write penalty.
- Controller write-back cache coalesces small writes into stripes; without protection this cache becomes a durability liability (see write hole below).

### The RAID 5 Write Hole
If power fails between writing the data blocks and the parity block of one stripe (or vice versa, given out-of-order write-back caches), the stripe enters an inconsistent state where parity no longer equals the XOR of data. The array cannot detect this — everything looks readable — so corruption surfaces later, either on an unrelated disk failure (rebuild materializes garbage) or during scrubbing.

Mitigations, in increasing robustness:

1. **Battery/supercap-backed NVRAM** on hardware controllers holds in-flight writes across power loss until flushed atomically.
2. **Journaling**: Linux md `--write-journal` (a dedicated journal device records intent), ZFS intent log, WAFL-style transactional layouts.
3. **Full-stripe / log-structured writers** (ZFS RAIDZ) avoid partial-stripe parity updates altogether.
4. **Periodic scrubbing** verifies parity against data continuously, catching silent desynchronization early — schedule weekly/monthly depending on array age.
5. **Dual parity (RAID 6 / RAID-Z2)** does not fix the hole itself but removes the catastrophic outcome of hitting a URE during rebuild (below).

### URE Math: The Rebuild Window of Vulnerability
Unrecoverable Read Error specs: consumer drives ~1 per 10¹⁴ bits read; enterprise ~10¹⁵. Rebuilding a failed 1 TB member of a 4-disk RAID 5 requires reading all 3 TB of survivors:

```
Bits read during rebuild   =  3 TB x 8  =  2.4 x 10^13 bits
Expected UREs (consumer)   =  2.4 x 10^13 / 10^14  =  0.24
P(at least one URE)        =  1 - e^(-0.24)        ~=  21%
Same math on 10^15 drives  ~=  2%
```

Roughly one in five consumer-array rebuilds hits an unreadable sector — and RAID 5 has no second parity to fall back on, so the array dies. Add the chance of a **second** mechanical failure during the 83-minute-plus rebuild window (all survivors now spin under maximum stress), and the case for RAID 6/10 on arrays built from large nearline drives becomes quantitative, not superstitious.

### Failure Modes Summary
1. **RAID 0 in production**: zero tolerance; annualized failure rate scales ~linearly with member count.
2. **RAID 5 write hole + URE during rebuild**: the classic silent-corruption double jeopardy.
3. **Bitmap indexes under OLTP writes**: vector locking serializes concurrent updates.
4. **BRIN after heavy updates**: min/max ranges widen until the index filters nothing.
5. **Hash files under growth**: bucket overflow chains degrade O(1) toward O(N) without periodic rehashing (extendible/dynamic hashing fixes this at complexity cost).
6. **Inverted-index stop-word bloat**: unbounded postings lists for common terms; solved by stop-word removal plus delta/Roaring-style compression.

### High-Frequency Interview Q&As

### Q1: Why is a B+ Tree preferred over a hash index in general-purpose relational engines?
**Answer**: Hash indexes answer only exact-match equality in O(1); they cannot serve range predicates (`age BETWEEN 20 AND 30`), prefix searches (`LIKE 'abc%'`), ORDER BY, or sorting, because hashing deliberately destroys key order. A B+ Tree delivers ordered leaves: point lookups in O(log N) plus efficient ranges, prefix scans and index-order output. Engines therefore default to B+ Trees and confine hashes to niches — MySQL MEMORY tables, InnoDB's Adaptive Hash Index (auto-built hot-path memoization over B+ Tree pages), and PostgreSQL's WAL-logged HASH index (production-grade only since version 10).

### Q2: How does RAID 5 reconstruct data when one disk fails, and why is parity rotated?
**Answer**: Parity P = B₁ ⊕ B₂ ⊕ B₃ makes every byte reconstructible: B₂ = B₁ ⊕ B₃ ⊕ P, since XOR is self-inverse. The controller replays this across all stripes onto the hot spare. Rotation distributes parity writes evenly across members; a fixed-parity disk would become the write bottleneck for every small update in the array.

### Q3: When does a bitmap index beat a B+ Tree, quantitatively?
**Answer**: On low-cardinality, read-mostly analytical columns — practical threshold around ≤10,000 distinct values (often far fewer: gender, status, region). K predicates over N rows evaluate as O(K·N/64) word-wise AND/OR/XOR entirely in CPU registers, versus K separate B+ Tree descents plus row fetches. The same property disqualifies them for OLTP: updating one bit locks the vector, and high-cardinality columns produce gigantic sparse vectors unless Roaring-style compression is applied.

### Q4: Why do OLTP deployments prefer RAID 10 over RAID 5 for WAL/redo volumes?
**Answer**: Redo logs are small synchronous random writes — exactly RAID 5's worst case. RAID 10 pays 2 I/Os per write (mirror pair); RAID 5 pays 4 (read old data + old parity, write both). RAID 10 also rebuilds faster (copy from one live mirror partner instead of reading and XOR-ing every survivor) and shrugs off UREs during rebuild, while RAID 5's rebuild is where the ~21% consumer-drive URE risk lands.

### Q5: What actually happens to performance and safety while a RAID 5 array is degraded?
**Answer**: Every read that would have touched the dead disk must be synthesized from all remaining members of its stripe, so random-read IOPS collapse toward (N−1)/N of normal and latency spikes; the background rebuild then competes with production I/O for bandwidth, extending the vulnerable window to hours on throttled controllers. Safety-wise the array is one failure away from total loss, and that failure may be a single URE rather than a whole disk.

### Q6: What is a BRIN index and when does it beat a B+ Tree?
**Answer**: BRIN stores only per-block-range min/max summaries — orders of magnitude smaller than a full B+ Tree (megabytes vs gigabytes on terabyte tables). It answers a predicate by skipping ranges whose min/max exclude the search value, which is powerful exclusively when physical row order tracks the indexed column — classically append-only timestamped data. Under random updates the ranges' min/max widen until the index degenerates toward a full scan.
