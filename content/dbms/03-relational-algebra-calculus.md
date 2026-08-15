# Relational Algebra, Tuple Relational Calculus (TRC) & Advanced Joins

## 🟢 Beginner Level

### Relational Model Fundamentals
The **Relational Model** (E.F. Codd, 1970) represents data as a collection of two-dimensional tables called **Relations**.

```
RELATION (Table): Employees
┌─────────┬──────────────┬─────────────┬──────────┐
│ emp_id  │ name         │ dept_id     │ salary   │ ◄── Attributes (Degree = 4)
├─────────┼──────────────┼─────────────┼──────────┤
│ 101     │ Alice Smith  │ D01         │ 75000    │ ◄── Tuple (Row)
│ 102     │ Bob Johnson  │ D02         │ 62000    │
│ 103     │ Charlie Lee  │ D01         │ 89000    │
└─────────┴──────────────┴─────────────┴──────────┘
▲ Cardinality = 3 Tuples
```

- **Domain**: Permissible set of atomic values for each attribute.
- **Degree**: Total number of attributes (columns) in the relation.
- **Cardinality**: Total number of tuples (rows) in the relation.

---

## 🟡 Intermediate Level

### Relational Algebra Operator Catalog

Relational Algebra is a procedural formal query language where operations take relations as input and produce a new relation as output:

```
                            RELATIONAL ALGEBRA OPERATORS
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        ▼                                                                 ▼
Fundamental Operators                                            Extended / Derived Operators
- Selection (σ): σ_salary > 70000(Employees)                     - Natural Join (⋈): Emp ⋈ Dept
- Projection (π): π_name, salary(Employees)                       - Theta Join (⋈_θ): Emp ⋈_Emp.dept=Dept.dept Dept
- Cartesian Product (×): Emp × Dept                               - Left Outer Join (⟕): Preserves left rows
- Union (∪): R ∪ S (Union compatible)                            - Right Outer Join (⟖): Preserves right rows
- Set Difference (−): R − S                                      - Full Outer Join (⟗): Preserves all rows
- Rename (ρ): ρ_E(Employees)                                     - Division Operator (÷): Matches all
```

#### Outer Joins Comparison:
1. **Inner Join ($\bowtie$)**: Returns only matching tuples satisfying the join predicate.
2. **Left Outer Join ($⟕$)**: Keeps all tuples from the left relation, padding `NULL` for missing right attributes.
3. **Right Outer Join ($⟖$)**: Keeps all tuples from the right relation, padding `NULL` for missing left attributes.
4. **Full Outer Join ($⟗$)**: Retains all tuples from both relations with `NULL` padding where unmatched.
5. **Division ($\div$)**: $R \div S$ returns tuples in $R$ that pair with **every single tuple** in relation $S$.

### Tuple Relational Calculus (TRC)

Tuple Relational Calculus is a non-procedural, declarative query language:

$$\{ t \mid P(t) \}$$

Example — Find names of employees earning $> \$70,000$:
$$\{ t \mid \exists e \in \text{Employees} (e[\text{salary}] > 70000 \land t[\text{name}] = e[\text{name}]) \}$$

---

## 🔴 Expert Level

### Row-Oriented vs. Column-Oriented Storage Engines

| Feature | Row-Oriented (PostgreSQL / MySQL InnoDB) | Column-Oriented (Snowflake / ClickHouse / Redshift) |
| :--- | :--- | :--- |
| **On-Disk Layout** | Consecutive bytes of entire row ($emp\_id, name, salary$) | Consecutive values of a single column across all rows |
| **Best For** | **OLTP** (Point lookups, `INSERT`, `UPDATE`, single-row ACID) | **OLAP** (Aggregations, `SUM(salary)`, scans over billions of rows) |
| **I/O Efficiency** | Reads entire row even if only 1 column is needed | Reads **only the required column blocks** from disk |
| **Compression Ratio** | Low (heterogeneous data types in block) | **Very High (5x-10x)** (homogeneous types, RLE, Dictionary encoding) |

### Key Interview Questions

#### Q1: What is Relational Completeness and why does it matter?
**Answer**:
A database query language is defined as **Relationally Complete** if it can express any query that can be formulated in basic Relational Algebra (or first-order predicate calculus). SQL and TRC are relationally complete. Relational completeness guarantees that expressive power is not sacrificed when abstracting physical storage details.

#### Q2: Explain the algorithmic difference between Hash Join and Sort-Merge Join.
**Answer**:
- **Hash Join**: In-memory hash table is built on the smaller (build) input relation using the join key. The larger (probe) relation is then streamed and hashed to find matching rows. Optimal for unsorted inputs ($O(M + N)$ time complexity).
- **Sort-Merge Join**: Both relations are first sorted on the join key ($O(M \log M + N \log N)$), then merged via a two-pointer linear scan ($O(M + N)$). Preferred when inputs are already indexed/sorted or during memory pressure (can spill sorted runs to disk).
