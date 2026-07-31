# Database Normalization, Functional Dependencies & Normal Forms

## 🟢 Beginner Level

### What is Database Normalization?
**Normalization** is a systematic schema design technique used to organize relational tables, eliminate redundant data, and prevent **Data Modification Anomalies**.

### Data Modification Anomalies

```
UNNORMALIZED STUDENT_COURSE TABLE:
┌──────────┬──────────────┬────────────┬────────────────────┐
│ Student  │ Department   │ CourseID   │ DeptHead           │
├──────────┼──────────────┼────────────┼────────────────────┤
│ Alice    │ CompSci      │ CS101      │ Dr. Smith          │
│ Alice    │ CompSci      │ CS102      │ Dr. Smith          │
│ Bob      │ Electrical   │ EE201      │ Dr. Johnson        │
└──────────┴──────────────┴────────────┴────────────────────┘
```

1. **Insertion Anomaly**: Cannot add a new Department & DeptHead unless at least one Student enrolls in a course.
2. **Deletion Anomaly**: If Bob drops EE201, the entire record of `Electrical` department and `Dr. Johnson` is lost!
3. **Update Anomaly**: If `Dr. Smith` changes name, every single student row in CompSci must be updated. Missing one causes data inconsistency.

---

## 🟡 Intermediate Level

### Functional Dependencies (FD) & Attribute Closure ($X^+$)

A **Functional Dependency** $X \rightarrow Y$ states that if two tuples agree on attribute set $X$, they must also agree on attribute set $Y$.

#### Attribute Closure Algorithm ($X^+$)
To find all attributes functionally determined by $X$:
1. Initialize $X^+ = X$.
2. For each FD $A \rightarrow B$ in set $F$, if $A \subseteq X^+$, add $B$ to $X^+$.
3. Repeat step 2 until $X^+$ stops growing.

> **Candidate Key Condition**: An attribute set $K$ is a Candidate Key if $K^+ = \text{All Attributes in Relation}$ AND no proper subset of $K$ can determine all attributes.

### Overview of Normal Forms (1NF to BCNF)

| Normal Form | Rule Requirement |
| :--- | :--- |
| **1NF (First Normal Form)** | Attributes must contain only **atomic (indivisible) values** (no arrays or repeating groups). |
| **2NF (Second Normal Form)** | Must be in 1NF AND **no Partial Dependencies** (non-prime attributes must depend on full PK, not a part of a composite PK). |
| **3NF (Third Normal Form)** | Must be in 2NF AND **no Transitive Dependencies** (for every $X \rightarrow Y$, $X$ is a Super Key OR $Y$ is a prime attribute). |
| **BCNF (Boyce-Codd Normal Form)** | Strict version of 3NF: For **EVERY** functional dependency $X \rightarrow Y$, $X$ **MUST be a Super Key**. |

---

## 🔴 Expert Level

### Lossless Join & Dependency Preservation Decomposition

When decomposing a relation $R$ into $R_1$ and $R_2$:
1. **Lossless Join Condition**: $R_1 \cap R_2 \rightarrow R_1$ OR $R_1 \cap R_2 \rightarrow R_2$ must hold in $F^+$ (common attribute must be a key for at least one sub-relation).
2. **Dependency Preservation**: $(F_1 \cup F_2)^+ = F^+$. Every functional dependency can be tested within a single sub-relation without joining.

### 3NF vs BCNF Trade-off

- 3NF is **always achievable** with Lossless Join AND Dependency Preservation.
- BCNF is **always achievable** with Lossless Join, BUT Dependency Preservation is **not guaranteed**.

### Interview Questions

1. **Given $R(A, B, C, D)$ with $FDs = \{A \rightarrow B, B \rightarrow C, C \rightarrow D\}$. Find candidate keys and highest normal form.**
   - *Answer*: $A^+ = \{A, B, C, D\}$, so Candidate Key is $A$. Prime attribute: $\{A\}$. Non-prime attributes: $\{B, C, D\}$. $B \rightarrow C$ is a Transitive Dependency ($B$ is not super key, $C$ is not prime). Relation is in **2NF**.

2. **Why is BCNF strictly stronger than 3NF?**
   - *Answer*: 3NF allows $X \rightarrow Y$ if $Y$ is a prime attribute even when $X$ is not a super key. BCNF removes this exception entirely, eliminating all redundancy caused by functional dependencies.
