# Query Processing & Cost-Based Query Optimization

## 🟢 Beginner Level

### What is Query Processing?
**Query Processing** refers to the sequence of activities involved in extracting data from a database system. It translates high-level SQL declarative queries into low-level execution primitives.

```
SQL Query String: SELECT name FROM users WHERE age > 25;
                           │
                           ▼
                 ┌───────────────────┐
                 │  Parser & Lexer   │ ──► Syntax Tree
                 └─────────┬─────────┘
                           ▼
                 ┌───────────────────┐
                 │ Logical Optimizer │ ──► Relational Algebra Tree
                 └─────────┬─────────┘
                           ▼
                 ┌───────────────────┐
                 │Physical Optimizer │ ──► Cost-Based Physical Plan
                 └─────────┬─────────┘
                           ▼
                 ┌───────────────────┐
                 │ Execution Engine  │ ──► Result Rows
                 └───────────────────┘
```

---

## 🟡 Intermediate Level

### Relational Algebra Equivalence Rules

The logical query optimizer transforms query trees into equivalent algebra expressions to reduce intermediate result set sizes:

1. **Predicate Pushdown**: Move $\sigma_{predicate}$ as deep down the query tree as possible to filter tuples before performing expensive joins.
2. **Projection Pushdown**: Eliminate unused columns early using $\pi$ to save memory bandwidth.

```
UNOPTIMIZED PLAN:
  Projection π_name ──► Selection σ_age > 25 ──► Join ⋈ ──► [User Table x Order Table]

OPTIMIZED PLAN:
  Projection π_name ──► Join ⋈ ──► [Filter σ_age > 25 (User Table)] x Order Table
```

---

## 🔴 Expert Level

### Join Algorithms & Physical Execution Strategies

| Join Algorithm | Mechanism | Time Complexity | Memory Requirements | Best Used When |
| :--- | :--- | :--- | :--- | :--- |
| **Nested-Loop Join** | For each row in outer table, scan inner table. | $O(N \times M)$ | $O(1)$ | Small outer table and indexed inner key. |
| **Block Nested-Loop**| Reads blocks of outer table into memory buffer. | $O(\frac{N}{B} \times M)$ | $O(B)$ memory buffer | Small tables, no indexes available. |
| **Sort-Merge Join** | Sorts both inputs on join key, then merges. | $O(N \log N + M \log M)$ | $O(N + M)$ | Inputs already sorted or range join predicates. |
| **Hash Join** | Builds in-memory hash table on build input, probes with probe input. | $O(N + M)$ | $O(N)$ hash table | Large unsorted datasets with equality joins. |

### Statistics & Cost-Based Optimizer (CBO)

The Physical Optimizer uses database statistics stored in system catalogs:
- Number of tuples ($N_r$), block count ($B_r$).
- Column cardinality $V(A, r)$ (distinct values).
- Equi-width & Equi-depth **Histograms**.

> **Cost Formula**: $\text{Cost} = (\text{Disk Page Fetches} \times W_{disk}) + (\text{CPU Operator Evaluations} \times W_{cpu})$

### Interview Questions

1. **Why does `EXPLAIN ANALYZE` sometimes show wrong row estimates?**
   - *Answer*: Outdated database statistics, correlated column predicates (violating independence assumption), or complex UDFs.

2. **What is Vectorized Query Execution (Volcano Iterator Model vs Engine JIT Compilation)?**
   - *Answer*: Traditional Volcano iterator (`next()`) processes one tuple at a time causing heavy virtual function call overhead. Vectorized execution processes batches of 1024 tuples using SIMD CPU instructions.
