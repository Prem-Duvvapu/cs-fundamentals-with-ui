# Query Processing & Cost-Based Query Optimization

## 🟢 Beginner Level

### The GPS Navigation Analogy
SQL is declarative: you state WHAT you want (all users older than 25), never HOW to fetch it. That makes the database a GPS navigator: your destination is the result set, but dozens of routes can reach it — scan this table first or that one, nest the loops or build a hash? The navigator picks using live traffic data; the optimizer picks using **statistics** about your tables (how many rows, how many distinct cities, how clustered). And like a GPS running on outdated maps, an optimizer with stale statistics confidently picks terrible routes.

### What Is Query Processing?
**Query processing** is the pipeline that converts a SQL string into executed rows:

```
SQL TEXT
   -> Parser / Lexer             checks syntax, builds a parse tree
   -> Binder / Analyzer          resolves tables, columns, types against catalog
   -> Logical Rewriter           applies relational-algebra equivalence rules
   -> Physical Optimizer (CBO)   enumerates candidate plans, prices each with
                                 statistics, keeps the cheapest
   -> Execution Engine           runs the winning plan, streams results
```

### Logical Plan vs Physical Plan
One algebraic expression maps to many physical plans. For SELECT name FROM users WHERE age > 25:

```
Plan A:  Seq Scan users  ->  Filter age > 25          touches every row
Plan B:  Index Scan on idx_users_age                   touches only matches,
                                                       plus random row fetches
```

If the query matched 90% of rows, Plan A wins despite touching everything — sequential I/O beats millions of random probes. Choosing correctly requires **cost estimation**, which is the entire game at higher levels.

## 🟡 Intermediate Level

### Relational Algebra Equivalence Rules (the Rewriter's Toolbox)
The logical optimizer transforms the parse tree into cheaper equivalent trees using provable rules:

1. **Cascade of selections**: σa(σb(R)) = σ(a∧b)(R) — merge consecutive filters into one pass.
2. **Commutativity of selections**: filter order among independent predicates is free; put the most selective first.
3. **Push selections through joins**: if predicate p references only R's attributes, σp(R ⋈ S) = σp(R) ⋈ S. This is the single highest-value rule — filtering before joining shrinks the join input.
4. **Cascade and push projections**: drop unused columns as early as possible; narrower tuples mean more tuples per memory page.
5. **Commutativity of joins**: R ⋈ S = S ⋈ R.
6. **Associativity of joins**: (R ⋈ S) ⋈ T = R ⋈ (S ⋈ T) — this unlocks all join orders.
7. **Selection splits over union/difference** and distributes across join keys when it constrains them.
8. Combined, rules 3, 5, 6 let the optimizer seek the join order minimizing intermediate result size.

### Heuristic Rewrite Pipeline
Before any costing, rule-based rewrites shrink the tree:

```
UNOPTIMIZED TREE:
  project(name)  ->  select(age > 25)  ->  join(users, orders)

AFTER PUSHDOWN AND REORDERING:
  project(name)
     -> join( select(age > 25) applied to users ,
              select(total > 100) applied to orders )
```

Both compute identical answers, but the optimized version filters each table before the join instead of joining full tables first.

### Projection Pushdown Has Its Own Arithmetic
Filtering shrinks row counts; projecting shrinks row width — both multiply into I/O savings:

```
orders row:  order_id 8B  customer_id 8B  status 12B  items jsonb ~150B
             total 200 bytes per tuple

Query needs: SELECT customer_id FROM orders WHERE status = 'PENDING';

Late projection : join carries 200 B tuples through every operator
Early projection: drop items immediately -> tuples shrink to ~28 B,
                  ~7x more tuples per memory page, hash tables and
                  sort runs shrink by the same factor
```

Column stores (Parquet, ClickHouse, Redshift) push this to the limit — unneeded columns are never read from disk at all.

### Subquery Unnesting and Decorrelation
The rewriter must also flatten SQL's imperative nesting back into algebra:

1. `WHERE x IN (SELECT ...)` becomes a **semi-join** (each outer row emitted at most once).
2. `NOT IN`/`EXISTS` variants become anti-joins — with a famous NULL-semantics trap that makes naive NOT IN catastrophically slow against nullable columns.
3. Correlated scalar subqueries (`SELECT (SELECT max(x) ...)` per row) become aggregates joined on the correlation key; engines that fail this rewrite execute the subquery once per outer row.
4. CTEs: PostgreSQL inlined them (materializing only when recursive, side-effecting, or referenced multiple times) starting with version 12.

### Cardinality Estimation: Selectivity Formulas
The cost model's raw fuel is the estimated output size of each operator. From catalog statistics (N rows in R, V(A,R) distinct values in column A):

- Equality: sel(σ A = c) = 1 ÷ V(A,R)
- Range: sel(σ A > c) = (High − c) ÷ (High − Low) under the uniformity assumption
- Conjunction (independence assumption): sel(p ∧ q) = sel(p) × sel(q)
- Disjunction: sel(p ∨ q) = sel(p) + sel(q) − sel(p) × sel(q)

Worked micro-example — users with N = 1,000,000:

```
V(city) = 500      ->  sel(city = 'Mumbai') = 1/500       = 0.0020
ages span 0..80    ->  sel(age > 60)        = (80-60)/80  = 0.25

Conjunction (assuming independence):
sel(city = 'Mumbai' AND age > 60) = 0.002 x 0.25 = 0.0005
Estimated rows                    = 1,000,000 x 0.0005 = 500 rows
```

Real distributions violate these assumptions constantly — cities are not uniform and city/age are often correlated — which is why histograms exist (Expert level).

### Histograms: Equi-Width vs Equi-Depth, Worked
Take 8 salary values: 5, 5, 6, 7, 8, 90, 95, 100 and estimate `salary < 25` (true answer: 5 of 8 rows).

```
EQUI-WIDTH buckets (fixed value range, 0..100 in four buckets):
  [0-25]   [26-50]   [51-75]   [76-100]
     5        0         0          3    row counts per bucket
Estimate for < 25 : uniform-within-bucket interpolation ~ 2.5 rows
Reality           : 5 rows   -> badly wrong; the dense bucket hides skew

EQUI-DEPTH buckets (~equal row counts, variable value ranges):
  [5-7]   [8]   [90]   [95-100]
Estimate for < 25 : bucket [5-7] fully inside -> ~3 rows + fraction of [8]
```

Equi-depth adapts to skew — dense regions get narrow buckets, sparse regions wide ones — which is why PostgreSQL builds equi-depth histograms and keeps a separate MCV list for the most skewed values.

### Cost Model
Costs combine I/O and CPU, weighted per engine:

Cost = (page fetches × W_io) + (operator evaluations × W_cpu)

- PostgreSQL's planner costs: seq_page_cost = 1.0, random_page_cost = 4.0, cpu_tuple_cost = 0.01 by default — lowering random_page_cost toward 1 on fast SSDs nudges the planner toward index scans.
- The dominant term in practice is almost always the **cardinality estimate**, because page counts derive from it multiplicatively.

### Join Algorithms Compared

| Algorithm | Mechanism | Complexity | Memory | Best When |
| --- | --- | --- | --- | --- |
| Nested loop (tuple) | Per outer row, rescan inner | O(N × M) | O(1) | Tiny inputs |
| Block nested loop | Load outer blocks into memory | O(N/M_buf × M) | Buffer pool chunk | No usable index |
| Indexed nested loop | Probe inner index per outer row | O(N × log M) | Index cached | Small outer, indexed inner, few matches |
| Sort-merge | Sort both on key, merge | O(N log N + M log M) | Sort runs | Inputs pre-sorted, range joins |
| Hash join | Build table on smaller input, probe | O(N + M) | Build side fits RAM | Large unsorted equi-joins |

### Worked Example: Nested Loop vs Hash Join
Setup: R (outer) = 10,000 tuples occupying 100 pages; S (inner) = 1,000,000 tuples occupying 10,000 pages (100 tuples per 8 KB page); memory available M = 1,000 buffer pages.

```
1) TUPLE-AT-A-TIME NESTED LOOP  (R outer)
   cost = B_R + T_R x B_S = 100 + 10,000 x 10,000 = 100,000,100 page reads
   HDD at 8 ms/read  ->  ~9.3 days
   SSD at 0.1 ms     ->  ~2.8 hours

2) BLOCK NESTED LOOP  (R fully cached: ceil(100/998) = 1 pass over S)
   cost = B_R + 1 x B_S = 100 + 10,000 = 10,100 page reads
   HDD  ->  ~81 seconds ;  SSD  ->  ~1 second

3) INDEXED NESTED LOOP  (S has B+ tree on join key, upper levels cached)
   cost = B_R + T_R x probe = 100 + 10,000 x ~2 = ~20,100 logical reads,
   mostly cache hits; shines only if few rows match per outer row

4) HASH JOIN  (build on R, probe with S)
   I/O  = 3 x (B_R + B_S) = 3 x 10,100 = 30,300 page transfers,
          nearly all SEQUENTIAL  ->  ~243 MB
   NVMe ->  well under 1 second ;  HDD sequential  ->  ~1.6 seconds
   CPU  = O(N + M), linear
```

Verdict: block nested loop minimizes page-touch counts here, but hash join wins wall-clock on spinning disks because its I/O is sequential while nested loop re-reads S randomly. If S carried a good join index and each outer row matched ~1 row, indexed nested loop could beat both. The optimizer's choice flows entirely from cardinality estimates — get those wrong and it will happily run option 1 for nine days.

### Reading EXPLAIN ANALYZE
Plain EXPLAIN shows estimates; EXPLAIN ANALYZE actually executes and prints reality:

```
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;

BEFORE THE INDEX EXISTS:
Seq Scan on orders
  Filter: (customer_id = 42)
  Rows Removed by Filter: 999850
  Planning Time: 0.21 ms
  Execution Time: 212.4 ms

AFTER CREATE INDEX ON orders (customer_id) PLUS ANALYZE:
Index Scan using idx_orders_customer on orders
  Index Cond: (customer_id = 42)
  Buffers: shared hit=4
  Execution Time: 0.09 ms
```

How to read it like an engineer: compare **estimated rows vs actual rows** at every node — divergence above one order of magnitude means statistics are lying; check `Rows Removed by Filter` (work thrown away per node); read BUFFERS output to separate logical hits from physical reads; sum node times along the critical path rather than trusting totals alone.

## 🔴 Expert Level

### Statistics Vectors Inside Real Engines
- **PostgreSQL pg_stats**: per column it stores n_distinct (negative values encode "fraction of table"), most_common_vals/freqs (MCV lists capturing skew), histogram_bounds (equi-depth buckets covering non-MCV values, default_statistics_target = 100 buckets), and correlation (physical clustering of the column). ANALYZE samples 300 × statistics_target rows; autovacuum triggers autoanalyze after roughly 50 + 10% of rows change. Correlated columns need CREATE STATISTICS (extended objects: dependencies, ndistinct, MCV lists) because single-column stats multiply badly.
- **MySQL InnoDB persistent stats**: n_diff_pfx cardinalities derived from innodb_stats_persistent_sample_pages = 20 pages per index; at optimization time the engine additionally performs up to 8 index dives for range estimates. Recompute with ANALYZE TABLE; STATS_AUTO_RECALC refreshes automatically after ~10% churn.
- **SQL Server**: DBCC SHOW_STATISTICS exposes the density vector plus a ≤201-step histogram; auto-create kicks in on optimizer demand, auto-update after 500 + 20% modifications (pre-2016) or dynamic sqrt-based thresholds (2016+, compat-dependent). Its notorious ascending-key problem: fresh rows beyond the histogram's max are underestimated until update, strangling date-ordered workloads with nested-loop plans.

### Join Order Enumeration: System R Dynamic Programming
- Selinger-style DP: find cheapest plans bottom-up over subsets of relations — exact optimum costs O(3ⁿ)-ish time/memory, so engines cap it.
- Left-deep trees were classically preferred (one input always a base relation → index/pipeline friendly); modern optimizers also explore bushy shapes.
- **Interesting orders** matter: a plan that delivers rows sorted on a useful key earns credit (sort-merge feeding ORDER BY, index nested loops feeding GROUP BY).
- PostgreSQL falls back to the genetic algorithm GEQO once relations ≥ geqo_threshold (default 12), trading optimality for compile time.
- Cardinality errors compound multiplicatively down the tree: three successive 10x underestimates yield a 1000x lie, which is exactly how 24-second dashboards happen.

### Parameter Sniffing and Generic Plans
- **SQL Server**: compiled plans are cached and reused; the first execution's parameter values are sniffed into the plan. A query tuned for the common case then executes with an atypical parameter (returning 5 rows vs 5 million) and reuses the wrong plan. Fixes: OPTION (RECOMPILE) per statement, OPTIMIZE FOR / OPTIMIZE FOR UNKNOWN hints, filtered indexes/statistics, and Parameter Sensitive Plan optimization introduced in SQL Server 2022 (multiple plans per query for divergent ranges).
- **PostgreSQL**: prepared statements run custom plans for the first 5 executions, then flip to a parameter-agnostic generic plan if not clearly worse — tunable via plan_cache_mode (force_custom_plan / force_generic_plan).

### Execution Engine Models: Volcano vs Vectorized vs JIT
- **Volcano iterator model**: every operator exposes next() returning one tuple; composable but pays virtual-call overhead per row — negligible for heavy joins, dominant for trivial scans over billions of narrow rows.
- **Vectorized execution**: operators process batches (~1024 tuples) tight loops, unlocking SIMD instructions and cache-friendly access (DuckDB, ClickHouse, SQL Server batch mode over columnstore).
- **JIT compilation**: PostgreSQL 11 compiles expression trees to native code via LLVM — big wins for CPU-bound analytical queries, net loss for sub-millisecond OLTP where compilation overhead exceeds execution.
- Pipelined operators stream rows without materializing; blocking ones (sorts, hash builds) materialize — spilling to temp files via external merge sort or grace/hash partitioning once work_mem is exhausted, which multiplies I/O visibly in plans as "spill" warnings.

### Translating Plan Vocabulary Across Engines
The same physical concepts wear different names in each engine's EXPLAIN output:

| Concept | PostgreSQL | MySQL | SQL Server |
| --- | --- | --- | --- |
| Full table read | Seq Scan | type = ALL (Extra: Using where) | Table Scan |
| B+ tree lookup | Index Scan / Index Only Scan | type = ref / range | Index Seek |
| In-memory hash build + probe | Hash Join | Using join buffer (hash join, 8.0+) | Hash Match |
| External spill | temp file in plan output | Using temporary | Hash Warning (spill event) |
| Estimated vs actual | rows=... vs actual rows | filtered/% of examined | EstimateRows vs ActualRows |

Learning one engine's plan language transfers directly — only the syntax rotates.

### Failure Modes: When Good Plans Go Bad
1. **Stale statistics**: after bulk loads without ANALYZE, row estimates collapse and the planner flips to nested loops over millions of rows — the classic 1000x regression.
2. **Correlated predicates vs independence assumption**: filtering city = 'Mumbai' AND zip = '400001' — two conditions pointing at the same rows — yields a product-of-selectivities underestimate, cascading into join-order disasters.
3. **Parameter sniffing** (above): right plan, wrong parameters.
4. **Non-sargable predicates**: YEAR(created_at) = 2026 wraps the column in a function so no index seek applies — rewrite as created_at ≥ '2026-01-01' AND < '2027-01-01'. Implicit type casts do the same damage invisibly (varchar_col = 42 numeric in MySQL casts every value).
5. **Hash spill**: build side exceeding work_mem forces partitioned spills and temp-file storms.
6. **Search-space pruning**: wide star-schema queries falling off DP onto greedy/GEQO paths occasionally emit cartesian blowups; manual join-order hints become justified escape hatches.

### High-Frequency Interview Q&As

### Q1: When does the optimizer pick the wrong join order or join algorithm?
**Answer**: Almost always via bad cardinality estimates, not bad code: stale statistics after ETL, correlated columns breaking the independence assumption, skewed data hidden behind averages, parameter sniffing reusing a foreign plan, UDFs whose selectivity is opaque, or huge queries pushed from exhaustive DP onto heuristic/genetic search. The fix hierarchy: refresh statistics, verify with EXPLAIN ANALYZE estimate-vs-actual gaps, add extended statistics, rewrite sargably, hint only as a last resort.

### Q2: Nested loop or hash join — what is the actual decision boundary?
**Answer**: Nested loop wins when the outer input is small and the inner lookup is indexed or cheap — especially when few rows match per outer row (OLTP point-ish joins). Hash join wins for large unsorted inputs joined on equality with substantial output (analytics). Sort-merge wins when inputs already arrive sorted (from indexes) or for range/non-equi joins, and when memory is too tight to hold a hash table. Engines encode exactly this logic in cost formulas driven by estimated sizes.

### Q3: What does EXPLAIN ANALYZE tell you that plain EXPLAIN cannot?
**Answer**: Ground truth. Plain EXPLAIN renders the plan with estimated costs/rows; ANALYZE also executes, exposing actual row counts, actual per-node milliseconds, loop counts (nested-loop iterations multiply apparent costs), rows removed by filters, memory used vs spilled to disk, buffer hits vs reads, and JIT time. Comparing estimated vs actual rows per node is the fastest way to locate the statistic lie poisoning the whole plan.

### Q4: Explain parameter sniffing end to end.
**Answer**: First execution of a parameterized statement compiles a plan specialized for the sniffed parameter values; that plan is cached and reused for all later executions. When the value distribution is skewed — one customer with 5 orders, another with 5 million — the cached plan fits one regime and sabotages the other. Remedies: OPTION (RECOMPILE), OPTIMIZE FOR UNKNOWN, plan guides, filtered statistics per regime, PostgreSQL's custom-plan switch (plan_cache_mode), and SQL Server 2022 Parameter Sensitive Plans.

### Q5: Volcano iterators vs vectorization vs JIT — how do modern engines execute plans?
**Answer**: Classic Volcano pulls one tuple per next() call through operator trees — elegant, but per-row virtual-call overhead dominates cheap scans. Vectorized engines push batches of ~1024 tuples through tight loops exploiting SIMD caches (DuckDB, ClickHouse, SQL Server batch mode). JIT compilation (PostgreSQL 11 LLVM, Spark Tungsten) eliminates interpretation entirely for CPU-heavy expressions. Rule of thumb: vectorization for analytics, plain iteration for latency-critical OLTP, JIT selectively for complex expressions.

### Q6: Why does wrapping an indexed column in a function destroy index usage, and how do you fix it?
**Answer**: A B+ Tree stores ordered raw key values; the predicate YEAR(col) = 2026 asks for a function output, which exists nowhere in the index, forcing evaluation per row — a full scan. Fix by rewriting into half-open range form: col ≥ '2026-01-01' AND col < '2027-01-01'. Same disease, other symptoms: implicit casts (varchar_col = 12345 casting every stored value), collation mismatches, leading-wildcard LIKE '%abc'. Where the functional form is unavoidable, create a function-based/expression index (CREATE INDEX ON t ((YEAR(col))) in MySQL, ((lower(email))) in PostgreSQL) so the indexed expression matches the predicate.
