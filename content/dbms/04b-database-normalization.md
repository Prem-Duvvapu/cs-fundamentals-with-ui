# Database Normalization (1NF to BCNF) & Decompositions

## 🟢 Beginner Level

### What is Normalization?
**Database Normalization** is a systematic process of organizing fields and tables to minimize **data redundancy** and avoid **data modification anomalies**.

```
MODIFICATION ANOMALIES IN UNNORMALIZED TABLES:
┌───────────┬──────────────┬────────────┬────────────────────┐
│ Student   │ Department   │ CourseID   │ DeptHead           │
├───────────┼──────────────┼────────────┼────────────────────┤
│ Alice     │ CompSci      │ CS101      │ Dr. Smith          │
│ Alice     │ CompSci      │ CS102      │ Dr. Smith          │
│ Bob       │ Electrical   │ EE201      │ Dr. Johnson        │
└───────────┴──────────────┴────────────┴────────────────────┘
```

1. **Insertion Anomaly**: Cannot record a newly created Department without at least one enrolled Student.
2. **Deletion Anomaly**: If Bob drops course `EE201`, all department data for `Electrical` and `Dr. Johnson` is wiped out.
3. **Update Anomaly**: If `Dr. Smith` changes name, dozens of duplicate rows must be updated. Missing one creates inconsistent state.

---

## 🟡 Intermediate Level

### Normal Forms Hierarchy (1NF, 2NF, 3NF, BCNF)

```
BCNF ⊂ 3NF ⊂ 2NF ⊂ 1NF
```

| Normal Form | Formal Definition & Test Rule |
| :--- | :--- |
| **1NF** | Every attribute column contains only **atomic (indivisible)** values. No repeating groups or comma-separated lists. |
| **2NF** | In 1NF AND **No Partial Dependencies**.<br>Every Non-Prime attribute must depend on the **entire** Candidate Key, not a proper subset of a composite key. |
| **3NF** | In 2NF AND **No Transitive Dependencies**.<br>For every non-trivial $X \rightarrow Y$: Either **$X$ is a Super Key** OR **$Y$ is a Prime Attribute**. |
| **BCNF** | Boyce-Codd Normal Form: For **EVERY** non-trivial functional dependency $X \rightarrow Y$, **$X$ MUST be a Super Key**. |

---

## 🔴 Expert Level

### Lossless Join & Dependency Preservation Decompositions

When decomposing relation $R$ into sub-relations $\{R_1, R_2\}$:

1. **Lossless Join Decomposition Condition**:
   Decomposition is lossless if and only if the common attribute set is a Super Key for at least one sub-relation:
   $$R_1 \cap R_2 \rightarrow R_1 \quad \text{OR} \quad R_1 \cap R_2 \rightarrow R_2 \quad \text{holds in } F^+$$

2. **Dependency Preservation**:
   Decomposition preserves dependencies if the union of projections of $F$ onto $R_1$ and $R_2$ covers $F$:
   $$(F_1 \cup F_2)^+ = F^+$$

### 3NF vs. BCNF Trade-Off

- **3NF** guarantees **both** Lossless Join and Dependency Preservation.
- **BCNF** guarantees Lossless Join, but Dependency Preservation is **not always achievable**.

### Key Interview Questions

#### Q1: Given $R(A, B, C)$ with $FDs = \{AB \rightarrow C, C \rightarrow B\}$. What is the highest normal form?
**Answer**:
1. Candidate Keys: $(AB)^+ = \{A, B, C\} \implies AB$, and $(AC)^+ = \{A, B, C\} \implies AC$.
2. Prime Attributes: $\{A, B, C\}$. (All attributes are prime!).
3. Check 2NF: No partial dependency since all attributes are prime. $\implies$ In 2NF.
4. Check 3NF: For $C \rightarrow B$, $C$ is not a super key, but $B$ is a **Prime Attribute**! $\implies$ In 3NF.
5. Check BCNF: In $C \rightarrow B$, $C$ is NOT a Super Key. $\implies$ **Fails BCNF**.
- Highest Normal Form: **3NF**.

#### Q2: What is Denormalization and when is it justified in production?
**Answer**:
Denormalization intentionally introduces redundancy into a normalized schema to avoid expensive multi-table SQL `JOIN` operations in high-throughput read-heavy workloads (OLAP, Data Warehouses, Cassandra, Redis).
