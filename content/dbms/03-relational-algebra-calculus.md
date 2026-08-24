# Relational Algebra, Tuple Relational Calculus (TRC) & Advanced Joins

## 🟢 Beginner Level

### The Relational Model in One Picture
The **Relational Model** (E.F. Codd, 1970) represents data as a collection of two-dimensional tables called **Relations**. The killer feature is **closure**: every operator consumes relations and produces a brand-new relation, so operators compose freely — a selection can feed a projection, which feeds a join, arbitrarily deep.

```
RELATION (Table): Employees
┌─────────┬──────────────┬─────────────┬──────────┐
│ emp_id  │ name         │ dept_id     │ salary   │ ◄── Attribute (Degree = 4)
├─────────┼──────────────┼─────────────┼──────────┤
│ 101     │ Alice Smith  │ D01         │ 75000    │ ◄── Tuple (Row)
│ 102     │ Bob Johnson  │ D02         │ 62000    │
│ 103     │ Charlie Lee  │ D01         │ 89000    │
└─────────┴──────────────┴─────────────┴──────────┘
▲ Cardinality = 3 Tuples
```

### Core Vocabulary
- **Domain**: the permitted set of atomic values for one attribute (salaries draw from non-negative integers).
- **Attribute**: a named role played by one domain inside the relation (a column header).
- **Degree**: count of attributes. `Employees` above has degree 4. Schema-level property; rarely changes.
- **Cardinality**: count of tuples currently stored; changes with every INSERT and DELETE.
- **Relation Schema vs Instance**: the schema is the blueprint (names, domains); the instance is the actual rows at a moment in time.
- **NULL**: marker for unknown or inapplicable values; forces **three-valued logic** (TRUE / FALSE / UNKNOWN) and causes most join surprises in practice.

### From SQL to Algebra: The Compilation View
SQL is declarative. The engine translates every query into a tree of algebra operators, and the cost-based optimizer reshapes that tree before execution:

| SQL Feature | Relational Algebra | Comment |
| --- | --- | --- |
| FROM / JOIN | × then σ, or ⋈ directly | Optimizer collapses the pair into ⋈ |
| WHERE | σ condition | Cheapest classic rewrite: push toward leaves |
| SELECT cols | π columns | Carries hidden duplicate elimination |
| GROUP BY / HAVING | γ grouping-aggregation | Extended operator, outside the core Codd set |
| UNION / EXCEPT | ∪ and − | Both sides must be union-compatible |
| ORDER BY | none | Purely physical presentation concern |

### Mental Model
Treat relational algebra as **assembly language for data retrieval**. SQL is the high-level source code; the optimizer is the compiler backend that reorders instructions. Fluency in algebra is exactly what lets you read `EXPLAIN` output and predict plan changes.

## 🟡 Intermediate Level

### The Fundamental Operators (Codd's Six)
- **Selection σ_c(R)**: horizontal subset — tuples of R satisfying predicate c.
- **Projection π_A(R)**: vertical subset — columns in A only, duplicates removed (set semantics).
- **Cartesian Product R × S**: every pairing; output size is |R| · |S| tuples — the operator you must never leave unconstrained.
- **Union R ∪ S**: rows in either input; requires union compatibility (equal degree, aligned domains column-wise).
- **Set Difference R − S**: rows in R with no counterpart in S; also demands union compatibility.
- **Rename ρ_S(A1..An)(R)**: renames the relation and/or attributes so results can join further, including self-joins.

Everything else is derived sugar:

```
                 RELATIONAL ALGEBRA OPERATOR TAXONOMY
                                   │
        ┌──────────────────────────┴──────────────────────────┐
        ▼                                                     ▼
  FUNDAMENTAL (Codd)                                  DERIVED / EXTENDED
  σ   Selection                                       ⋈   Natural Join
  π   Projection                                      ⋈θ  Theta / Equi Join
  ×   Cartesian Product                               ⟕ ⟖ ⟗ Outer Joins
  ∪   Union                                           ÷   Division
  −   Set Difference                                  ⋉ ⋊ Semijoins
  ρ   Rename                                          γ   Grouping / Aggregation
```

### Selection and Projection: The Two You Must Master
- Conjunctive selections cascade: σ_(a∧b)(R) equals σ_a(σ_b(R)). Splitting them lets the optimizer reorder and push each piece independently — the foundation of **predicate pushdown**.
- π eliminates duplicates by definition. π_dept_id over 1M employee rows may return just 100 distinct values, but computing that forces a full sort or hash of the entire column — `SELECT DISTINCT` is never free.
- Composition reads right to left: π_name(σ_salary>70000(Employees)) means filter first, then narrow the width. Reversing the order wastes I/O on dead columns.

### Set Operations and Union Compatibility
- Legal only between union-compatible inputs; mismatched degree raises an error (PostgreSQL 16: `each UNION query must have the same number of columns`).
- Intersection is derived: R ∩ S = R − (R − S).
- Engines implement all three as sort-distinct or hash-distinct pipelines; `EXPLAIN` reveals them as Sort/SetOp or HashAggregate nodes.

### The Join Family on a Concrete Instance

```
INPUTS
  Employees:   (101, Alice, D01)   (102, Bob, NULL)   (103, Carol, D09)
  Departments: (D01, Engineering)  (D02, Sales)
```

| Join Type | Output Tuples | Rows |
| --- | --- | --- |
| Inner ⋈ on dept_id | (101, Alice, D01, Engineering) | 1 |
| Left outer ⟕ | Alice+Engineering; Bob+NULLs; Carol+NULLs | 3 |
| Right outer ⟖ | Alice+Engineering; NULLs+(D02, Sales) | 2 |
| Full outer ⟗ | all 3 employee rows padded + the D02 row padded | 4 |

- **Natural join ⋈** matches all identically-named attributes and coalesces them into one column; **theta join** accepts any predicate; **equi-join** restricts θ to equality, unlocking hash and merge physical algorithms.
- **Semijoin R ⋉ S** equals π_R-attributes(R ⋈ S): keep R rows having SOME match, discard S columns — the algebraic identity behind `WHERE EXISTS`.
- **Outer-join trap**: appending WHERE d.dname = 'Sales' to a ⟕ silently converts it back into an inner join because NULL fails the predicate. Right-side filters belong in the ON clause (or after the join).

### Division (÷): The "For All" Operator, Fully Worked
Business question: which students are enrolled in EVERY required course?

```
SCHEMA    Enrolls(Student, Course)        Required(Course)
DATA      Enrolls = {(Alice,DBMS), (Alice,OS), (Bob,DBMS), (Bob,OS), (Carol,DBMS)}
          Required = {DBMS, OS}
FORMULA   Answer = π_student(Enrolls) − π_student( (π_student(Enrolls) × Required) − Enrolls )
```

Hand evaluation, step by step:
1. π_student(Enrolls) = {Alice, Bob, Carol} — everyone enrolled somewhere.
2. Ideal pairings: {Alice, Bob, Carol} × {DBMS, OS} = 6 hypothetical tuples.
3. Subtract observed reality: ideal − Enrolls = {(Carol,DBMS), (Carol,OS)} — pairings that SHOULD exist but do not.
4. Project the guilty students: {Carol}.
5. Answer = {Alice, Bob, Carol} − {Carol} = **{Alice, Bob}**.

Read it as logic: a student qualifies iff there does NOT exist a required course she lacks. Division is universal quantification made executable, and its SQL incarnation is the famous double NOT EXISTS.

### Tuple Relational Calculus (TRC): Say WHAT, Not HOW
TRC is non-procedural. A query is a set-builder expression {t ∣ P(t)}: return every tuple t for which predicate P holds.

```
1) PLAIN FILTER
   { t ∣ t ∈ Employee ∧ t.salary > 70000 }

2) JOIN VIA EXISTENTIAL QUANTIFIER
   { t.name ∣ ∃e ∈ Employee ∃d ∈ Department
        ( e.dept_id = d.dept_id ∧ d.dname = 'Sales' ∧ t.name = e.name ) }

3) UNIVERSAL QUANTIFIER (division in disguise)
   { s ∣ ∀c ∈ Course ( ∃e ∈ Enrolls ( e.student = s ∧ e.course = c.cid ) ) }
```

- Forms 1 and 2 are **safe**: the result is drawn from values the formula mentions, so the answer set is finite. Unsafe shapes like {t ∣ ¬(t ∈ Employee)} range over an infinite complement and are rejected by practical languages.
- TRC restricted to safe formulas is exactly first-order predicate calculus. Codd's theorem: a language is **relationally complete** iff it can express safe TRC — and SQL qualifies.

### TRC to SQL Translation Table

| Intent | TRC Sketch | SQL |
| --- | --- | --- |
| Filter rows | {t ∣ t ∈ Emp ∧ t.sal > 70000} | `SELECT * FROM emp WHERE sal > 70000` |
| Exists-child semijoin | {d ∣ ∃e ∈ Emp (e.dept = d.id)} | `SELECT * FROM dept d WHERE EXISTS (SELECT 1 FROM emp e WHERE e.dept = d.id)` |
| Missing-child antijoin | {d ∣ ¬∃e ∈ Emp (e.dept = d.id)} | `SELECT * FROM dept d WHERE NOT EXISTS (SELECT 1 FROM emp e WHERE e.dept = d.id)` |
| For-all (division) | {s ∣ ∀c ∃o (o.student = s ∧ o.course = c)} | nested `NOT EXISTS (SELECT 1 FROM products p WHERE NOT EXISTS (...))` |

### Equivalence Rules the Optimizer Exploits
- σ is commutative: σ_a(σ_b(R)) = σ_b(σ_a(R)); conjuncts can be reordered freely.
- σ commutes with π when the selection attributes survive the projection; it always commutes with ⋈ on attributes native to one side (that is pushdown).
- ⋈ is commutative and associative, so join order is a search space (left-deep vs bushy trees) — this is what cost-based join enumeration explores.
- π composes: π_A(π_B(R)) = π_A(R) when A ⊆ B; cascaded projections collapse to the narrowest one.

## 🔴 Expert Level

### Heuristic Rewrites: σ/π Pushdown Cost Comparison
Instance (8 KB pages): Employee has 1,000,000 tuples in 10,000 pages with a clustered B+ tree on dept_id; Department has 100 tuples in 5 pages. Query: names of Sales employees earning above 200,000. Assume Sales owns 10% of employees (100,000 tuples ≈ 1,000 clustered pages) and the salary predicate keeps 5% of those.

| Plan Shape | Execution | Approx Page I/Os |
| --- | --- | --- |
| A: product first | materialize Employee × Department = 100M tuples (≈1M temp pages written and re-read), filter at the very end | ≈ 2,010,005 |
| B: join first, filter on output | hash join priced at 3 × (10,000 + 5) pages | ≈ 30,015 |
| C: push σ down, then index join | 5-page dimension scan locates D02; clustered range scan pulls ≈1,000 pages; salary filter applied on the fly | ≈ 1,010 |

- Plan C beats B by ~30x and A by ~2000x using only two classic heuristics: **push selections down first**, then push projections. These System-R-era rules remain stage zero of every modern optimizer (PostgreSQL 16, MySQL 8.0, SQL Server 2022) before cost-based search refines the plan.
- π pushdown payoff scales with table width: skipping 38 of 40 columns cuts column-store scan bytes roughly 20x, while a row store gains little because it reads whole tuples regardless.
- Corollary for reviews: a WHERE clause inside a view that an outer query never constrains can defeat pushdown across certain constructs (function-wrapped columns, OR chains on different indexes) — check `EXPLAIN` rather than trusting the rewrite.

### Physical Join Algorithms and Their I/O Bills
Shared instance: outer R = 1,000 pages holding 100,000 tuples; inner S = 500 pages; M = 120 available buffer frames; equality predicate.

| Algorithm | Cost Formula | On This Instance | Wins When |
| --- | --- | --- | --- |
| Tuple nested loop | B_R + n_R × B_S | ≈ 50,001,000 | Essentially never |
| Block nested loop | B_R + ⌈B_R / (M−2)⌉ × B_S | 5,500 | No usable index, tight memory |
| Index nested loop | B_R + n_R × c_probe | ≈ 121,000 unfiltered; ≈ 1,010 after heavy σ pushdown | Outer is highly selective, inner indexed |
| Sort-merge | ≈ 3 (B_R + B_S) streaming | 4,500 | Inputs pre-sorted or output must be ordered |
| Grace hash join | ≈ 3 (B_R + B_S) partitioned | 4,500 | Large unsorted equality joins |

- Hash join degrades into recursive partitioning when the build side exceeds memory; sort-merge degrades gracefully by spilling sorted runs and merging in multiple passes — predictable behavior under memory pressure.
- Engine reality: PostgreSQL 16 prices nested loop vs hash vs merge per join from cardinality estimates; MySQL shipped a genuine hash join in 8.0.18, retiring Block Nested Loop for index-less equi-joins; vectorized engines (ClickHouse, DuckDB) push hash joins to GB/s throughput.
- Inequality predicates (ranges, bands) rule out both hash and plain merge — expect nested loop with an appropriate index, or interval-aware structures (R-tree in PostGIS).

### Row-Oriented vs Column-Oriented Storage Engines

| Feature | Row Store (PostgreSQL, MySQL InnoDB) | Column Store (Snowflake, ClickHouse, Redshift) |
| --- | --- | --- |
| On-Disk Layout | whole tuple contiguous (emp_id, name, salary bytes together) | one attribute's values contiguous across tuples |
| Best Workload | OLTP point lookups, single-row ACID writes | OLAP aggregation over billions of rows |
| I/O for 1 of 40 columns | pays for all 40 columns' bytes | reads 1/40th of the segment |
| Compression | weak (heterogeneous bytes adjacent) | strong 5x-10x (dictionary, RLE, bit-packing) |
| Update Cost | cheap per-row writes with undo/redo support | costly segment rewrites; batch-oriented |

Algebra connection: σ maps to scan-and-filter in both worlds, but π is nearly free physically on column stores (skip unread segments), which is why projection pushdown transforms OLAP economics and barely moves OLTP. Hybrid HTAP systems (Oracle In-Memory dual format, TiFlash replicas) maintain both representations simultaneously.

### Key Interview Questions

### Q1: What is relational completeness and why should a practitioner care?
**Answer**: A language is relationally complete when it expresses everything expressible in safe TRC, equivalently basic relational algebra. SQL, TRC, DRC and QBE all qualify, so no business question expressible in first-order logic hits a wall. Recursive queries (org charts, transitive closure) EXCEED algebra and arrive as bolt-on extensions like `WITH RECURSIVE` — knowing this boundary explains their awkward ergonomics.

### Q2: Defend hash join versus sort-merge join for a given workload.
**Answer**: Default to hash join for large unsorted equality inputs: linear O(M+N), no pre-sorting, partitions parallelize cleanly. Pick sort-merge when inputs already arrive ordered via index scans, when output ordering on the join key saves a later sort, or under extreme memory pressure where multi-pass merge spill behavior is more predictable than recursive hash partitioning. Neither handles theta conditions — nested loop with an index remains the fallback.

### Q3: Express the division operator in pure SQL.
**Answer**: Translate ∀ into a double negation ¬∃¬∃:

```sql
SELECT c.cust_name
FROM Customers c
WHERE NOT EXISTS (
  SELECT 1 FROM Products p
  WHERE NOT EXISTS (
    SELECT 1 FROM Orders o
    WHERE o.cid = c.cid AND o.pid = p.pid));
```

Reading: the customer qualifies when there does NOT exist a product for which she lacks an order. The COUNT variant (`GROUP BY cid HAVING COUNT(DISTINCT pid) = (SELECT COUNT(*) FROM Products)`) is terser but silently wrong if Orders may reference retired products, inflating the satisfied count relative to reality.

### Q4: NATURAL JOIN is elegant algebra. Why do production style guides ban it?
**Answer**: Its semantics bind to column NAMES: adding a shared audit column such as `updated_at` to both tables silently changes which rows match; renaming one column silently breaks matching. Explicit ON or USING clauses document intent and survive schema drift. Companion trap: a restrictive WHERE on the NULL-padded side of an outer join quietly collapses it back to an inner join.

### Q5: The planner chose nested loop for a 1M-row join. Is that a bug?
**Answer**: Usually optimal, not a bug. After σ_dname='Sales' pushes down, the dimension side is one row; an index probe fetching its 100,000 employees (≈1,000 clustered pages) beats building a hash table over all 10,000 fact pages. Trust cardinality estimates and keep statistics fresh (`ANALYZE` in PostgreSQL; autovacuum triggers it by default) — stale histograms flip plans catastrophically, which is the actual bug people usually witness.

### Q6: Algebra is set-based, SQL is bag-based. Where does the difference bite?
**Answer**: Three classic leaks. SELECT col keeps duplicates while algebraic π removes them, so DISTINCT ambushes you with a sort or hash. UNION ALL versus UNION differ by an entire dedupe pipeline. Parent-to-child joins fan out parent rows where the algebraist expects semijoin semantics — the correct tool is EXISTS, not JOIN. Naming bag semantics unprompted signals genuine depth in interviews.
