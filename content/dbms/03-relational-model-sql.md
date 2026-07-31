# Relational Model, Keys & Relational Algebra

## 🟢 Beginner Level

### Relational Model Concepts
Proposed by E.F. Codd in 1970, the **Relational Model** represents data as two-dimensional tables called **Relations**.

- **Relation (Table)**: Named set of rows and columns.
- **Tuple (Row)**: Single record representing an entity instance.
- **Attribute (Column)**: Named property of a relation.
- **Domain**: Set of permissible atomic values for an attribute.

### Types of Database Keys

```
┌─────────────────────────────────────────────────────────────┐
│                       SUPER KEYS                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 CANDIDATE KEYS                        │  │
│  │  ┌─────────────────────────┐                          │  │
│  │  │       PRIMARY KEY       │   ALTERNATE KEYS         │  │
│  │  └─────────────────────────┘                          │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

1. **Super Key**: Any set of attributes that uniquely identifies a row in a relation.
2. **Candidate Key**: A **minimal** Super Key (no proper subset can uniquely identify a row).
3. **Primary Key (PK)**: Candidate Key selected by the DBA to uniquely identify tuples (cannot be NULL).
4. **Alternate Key**: Candidate Keys that were not selected as the Primary Key.
5. **Foreign Key (FK)**: Attribute in a child table referencing the Primary Key of a parent table, enforcing **Referential Integrity**.

---

## 🟡 Intermediate Level

### Relational Algebra Operations

Relational Algebra is a procedural query language that takes one or two relations as input and produces a new relation as output.

| Operation | Symbol | Description | Example |
| :--- | :--- | :--- | :--- |
| **Selection** | $\sigma$ | Filters tuples matching a boolean predicate | $\sigma_{age > 20}(Student)$ |
| **Projection** | $\pi$ | Selects specific columns and eliminates duplicates | $\pi_{name, email}(Student)$ |
| **Union** | $\cup$ | Combines tuples from two union-compatible relations | $CS\_Students \cup IT\_Students$ |
| **Set Difference** | $-$ | Tuples in relation 1 but NOT in relation 2 | $Enrolled\_2025 - Enrolled\_2026$ |
| **Cartesian Product** | $\times$ | Combines every tuple of R1 with every tuple of R2 | $Student \times Course$ |
| **Natural Join** | $\bowtie$ | Combines tuples matching common attribute names | $Student \bowtie Enrollment$ |

### SQL Joins Visualized

- **Inner Join**: Returns rows with matching values in both tables.
- **Left Outer Join**: Returns all rows from left table + matched rows from right table.
- **Right Outer Join**: Returns all rows from right table + matched rows from left table.
- **Full Outer Join**: Returns rows when there is a match in left or right table.

---

## 🔴 Expert Level

### Integrity Constraints

1. **Domain Constraint**: Attribute values must belong to the specified data domain and types.
2. **Key Constraint**: Primary key attributes must be unique and non-null (**Entity Integrity**).
3. **Referential Integrity**: Foreign Key value must either be NULL or match an existing Primary Key value in the referenced table.

### Relational Completeness & Tuple Relational Calculus (TRC)

A query language is **Relational Complete** if it is at least as powerful as basic Relational Algebra. SQL and Tuple Relational Calculus (TRC) are relationally complete declarative query languages.

### Interview Questions

1. **What happens during `ON DELETE CASCADE` vs `ON DELETE SET NULL` on a Foreign Key?**
   - *Answer*: `CASCADE` automatically deletes all child tuples referencing the deleted parent tuple. `SET NULL` updates the child table foreign key column to NULL.

2. **Is Projection ($\pi$) idempotent?**
   - *Answer*: Yes, $\pi_{A}(\pi_{A, B}(R)) = \pi_{A}(R)$.
