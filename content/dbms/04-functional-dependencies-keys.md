# Keys, Functional Dependencies & Minimal Canonical Cover

## 🟢 Beginner Level

### Database Keys Hierarchy

A database key uniquely identifies rows and establishes relationships across tables:

```
┌────────────────────────────────────────────────────────────────────────┐
│                              SUPER KEYS                                │
│   (Any attribute set that uniquely identifies a row in relation R)     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        CANDIDATE KEYS                            │  │
│  │     (Minimal Super Key: No proper subset is a Super Key)         │  │
│  │  ┌─────────────────────────────┐                                 │  │
│  │  │        PRIMARY KEY          │        ALTERNATE KEYS           │  │
│  │  │  (Selected Candidate Key,   │     (Remaining candidate keys)  │  │
│  │  │      strictly NOT NULL)     │                                 │  │
│  │  └─────────────────────────────┘                                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

- **Foreign Key (FK)**: Attribute referencing the Primary Key of another relation, enforcing **Referential Integrity**.
- **Prime Attributes**: Attributes belonging to **any** Candidate Key.
- **Non-Prime Attributes**: Attributes not part of any Candidate Key.

---

## 🟡 Intermediate Level

### Functional Dependencies & Armstrong's Axioms

A **Functional Dependency** $X \rightarrow Y$ holds on relation $R$ if and only if for all pairs of tuples $t_1, t_2 \in R$, whenever $t_1[X] = t_2[X]$, then $t_1[Y] = t_2[Y]$.

#### Armstrong's Axioms (Sound and Complete Inference Rules):
1. **Reflexivity**: If $Y \subseteq X$, then $X \rightarrow Y$.
2. **Augmentation**: If $X \rightarrow Y$, then $XZ \rightarrow YZ$.
3. **Transitivity**: If $X \rightarrow Y$ and $Y \rightarrow Z$, then $X \rightarrow Z$.

#### Secondary Rules:
- **Union**: If $X \rightarrow Y$ and $X \rightarrow Z$, then $X \rightarrow YZ$.
- **Decomposition**: If $X \rightarrow YZ$, then $X \rightarrow Y$ and $X \rightarrow Z$.
- **Pseudotransitivity**: If $X \rightarrow Y$ and $WY \rightarrow Z$, then $WX \rightarrow Z$.

### Attribute Closure Algorithm ($(X)^+$)

To determine all attributes uniquely determined by a set of attributes $X$:
1. Set $\text{Closure} = X$.
2. For each dependency $A \rightarrow B$ in set $F$:
   - If $A \subseteq \text{Closure}$, then $\text{Closure} = \text{Closure} \cup B$.
3. Repeat step 2 until $\text{Closure}$ does not change.
4. **Candidate Key Check**: If $(X)^+ = R$ (all attributes of $R$) and no proper subset of $X$ determines all attributes, $X$ is a **Candidate Key**!

---

## 🔴 Expert Level

### Minimal Canonical Cover ($F_c$) Algorithm

A **Canonical Cover** $F_c$ is a minimal equivalent set of functional dependencies without redundancies.

```
Canonical Cover Algorithm (3 Steps):
Step 1: Singleton Right-Hand Sides
        Transform A -> BC into A -> B, A -> C using Decomposition Rule.

Step 2: Extraneous Attribute Elimination (Left-Hand Side)
        In dependency AB -> C, attribute B is extraneous if (A)+ with respect to F contains C.
        If so, replace AB -> C with A -> C.

Step 3: Redundant Dependency Elimination
        Dependency f: X -> Y is redundant if Y ⊆ (X)+ computed using F - {f}.
        If so, remove f from F.
```

### Key Interview Questions

#### Q1: Given $R(A, B, C, D, E)$ with $F = \{A \rightarrow BC, CD \rightarrow E, B \rightarrow D, E \rightarrow A\}$. Find all Candidate Keys.
**Answer**:
1. Compute $(A)^+$: $A \rightarrow BC \rightarrow D (B \rightarrow D) \rightarrow E (CD \rightarrow E) \implies (A)^+ = \{A, B, C, D, E\}$. So **$A$ is a Candidate Key**.
2. Since $E \rightarrow A$, $(E)^+ \supseteq (A)^+ = \{A, B, C, D, E\}$. So **$E$ is a Candidate Key**.
3. Since $CD \rightarrow E$, $(CD)^+ \supseteq (E)^+ = \{A, B, C, D, E\}$. Check subsets: $(C)^+ = \{C\}$, $(D)^+ = \{D\}$. So **$CD$ is a Candidate Key**.
4. Since $B \rightarrow D$, $(BC)^+ \supseteq (CD)^+ = \{A, B, C, D, E\}$. Subsets $(B)^+ = \{B, D\}$, $(C)^+ = \{C\}$. So **$BC$ is a Candidate Key**.
- Total Candidate Keys: **$\{A, E, CD, BC\}$**.

#### Q2: What is the difference between Super Key and Candidate Key?
**Answer**:
- A **Super Key** is any attribute set that uniquely identifies a row (can have redundant extra attributes, e.g. $\{emp\_id, name, email\}$).
- A **Candidate Key** is a minimal Super Key with zero extraneous attributes (removing any single attribute destroys the unique identification property).
