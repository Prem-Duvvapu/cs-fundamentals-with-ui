# Database Normalization (1NF to BCNF) & Decompositions

## 🟢 Beginner Level

### What is Normalization?
**Database Normalization** is a systematic process of restructuring tables to minimize **data redundancy** and eliminate **modification anomalies**, guided by progressive quality tiers called normal forms (Codd introduced 1NF-3NF in 1971-72; Boyce and Codd added stricter BCNF in 1974). Each form repairs one structural disease without losing data.

### The Three Anomalies on a Concrete Instance
One wide table storing students, their department, department head, courses and instructors:

```
STUDENTS
┌──────────┬───────────┬─────────────┬──────────┬─────────────┐
│ Student  │ Dept      │ DeptHead    │ CourseID │ Instructor  │
├──────────┼───────────┼─────────────┼──────────┼─────────────┤
│ S1 Alice │ CompSci   │ Dr. Smith   │ CS101    │ Prof. Rao   │
│ S1 Alice │ CompSci   │ Dr. Smith   │ CS102    │ Prof. Iyer  │
│ S3 Cara  │ CompSci   │ Dr. Smith   │ CS103    │ Prof. Rao   │
│ S2 Bob   │ Electrical│ Dr. Johnson │ EE201    │ Prof. Menon │
└──────────┴───────────┴─────────────┴──────────┴─────────────┘
```

1. **Insertion anomaly**: a new Mechanical department headed by Dr. Rao cannot be recorded until its first student enrolls — every row demands a Student value.
2. **Deletion anomaly**: if Bob drops EE201 and his row is deleted, ALL knowledge that Electrical exists under Dr. Johnson evaporates — one DELETE destroys two independent facts.
3. **Update anomaly**: Dr. Smith becomes Dr. Smyth; three scattered cells must change. Miss one and the database asserts both heads simultaneously — no constraint flags the split-brain state.

### Why Redundancy Is Measured in Bytes and Risk
If 40,000 enrollments average 25 rows per department, each department name and head string repeats roughly 25 times: storage waste grows linearly with history, and every duplicate cell is an independent target for future corruption. Normalization trades cheap JOINs for integrity — usually a bargain for OLTP workloads.

## 🟡 Intermediate Level

### Normal Form Hierarchy at a Glance

```
STRICTNESS LADDER (each level contains everything below it)

BCNF ⊂ 3NF ⊂ 2NF ⊂ 1NF
        ▲       ▲       ▲
        │       │       └── atomic values only (no repeating groups)
        │       └────────── non-prime attrs depend on the FULL candidate key
        └────────────────── no transitive escapes through prime attributes
```

| Normal Form | Test That EVERY Non-Trivial FD X → Y Must Pass | Disease Cured |
| --- | --- | --- |
| **1NF** | domains atomic; no comma lists, no nested tables | repeating groups |
| **2NF** | no partial dependency: non-prime Y never depends on part of a composite candidate key | partial dependencies |
| **3NF** | X is a superkey OR (Y − X) contains a prime attribute | transitive dependencies |
| **BCNF** | X MUST be a superkey — the prime-attribute escape hatch is removed | residual determinant anomalies |

Vocabulary: **determinant** = left side X; **dependent** = right side Y; **prime attribute** = member of some candidate key.

### Worked Walkthrough: Six Columns Through Every Form
Running schema: Orders(OrderID, CustID, CustCity, ProdID, ProdName, Qty) with primary key (OrderID, ProdID). Declared FDs:

- f1: OrderID → CustID — each order belongs to one customer
- f2: CustID → CustCity — each customer lives in one city
- f3: ProdID → ProdName — catalog naming rule
- f4: (OrderID, ProdID) → Qty — the order line itself

Prime attributes = {OrderID, ProdID}; non-prime = {CustID, CustCity, ProdName, Qty}.

### Step 1: Reach 1NF by Atomizing Values

```
VIOLATION (repeating group inside cells)
┌─────────┬────────┬──────────┬─────────┬────────────────┬───────┐
│ OrderID │ CustID │ CustCity │ ProdID  │ ProdName       │ Qty   │
├─────────┼────────┼──────────┼─────────┼────────────────┼───────┤
│ 101     │ C7     │ Pune     │ P1,P2   │ Laptop,Monitor │ 2,1   │
└─────────┴────────┴──────────┴─────────┴────────────────┴───────┘

FIX: one fact per row
│ 101     │ C7     │ Pune     │ P1      │ Laptop         │ 2     │
│ 101     │ C7     │ Pune     │ P2      │ Monitor        │ 1     │
```

Every cell atomic, every column single-domain ⇒ **1NF**. All four FDs still share one wide table — which is precisely the remaining problem.

### Step 2: 1NF → 2NF by Removing Partial Dependencies
Test each FD whose dependent set is non-prime against the composite key (OrderID, ProdID):
- f1 and f2 hang off OrderID alone ⇒ PARTIAL violations.
- f3 hangs off ProdID alone ⇒ PARTIAL violation.
- f4 requires the entire key ⇒ full dependency, legal.

Decompose, relocating each violating dependency into its own relation:

```
Orders(OrderID, CustID, CustCity):     (101, C7, Pune)
Products(ProdID, ProdName):            (P1, Laptop)   (P2, Monitor)
OrderItems(OrderID, ProdID, Qty):      (101, P1, 2)   (101, P2, 1)
```

Dependencies REMOVED from the wide table: f1 and f2 now internal to Orders, f3 internal to Products; f4 remains as OrderItems' key constraint. Lossless preview: Orders ∩ OrderItems = {OrderID}, a key of Orders ⇒ rejoining cannot fabricate rows.

### Step 3: 2NF → 3NF by Removing the Transitive Chain
Inside Orders(OrderID, CustID, CustCity): f1 composed with f2 yields OrderID → CustCity through middleman CustID, where CustID is NOT a key of Orders and CustCity is non-prime ⇒ textbook transitive violation. Split on the middleman:

```
Customers(CustID, CustCity):           (C7, Pune)
Orders(OrderID, CustID):               (101, C7)
```

Dependency RELOCATED: f2 lives entirely inside Customers where CustID IS the key. No non-key-to-non-key determination path survives anywhere ⇒ **3NF**.

### Step 4: BCNF Audit of All Four Relations
Ask of every determinant: is it a superkey of ITS OWN relation?

| Relation | Determinants | Verdict |
| --- | --- | --- |
| Customers(CustID, CustCity) | CustID | key ⇒ BCNF ✓ |
| Products(ProdID, ProdName) | ProdID | key ⇒ BCNF ✓ |
| Orders(OrderID, CustID) | OrderID | key ⇒ BCNF ✓ |
| OrderItems(OrderID, ProdID, Qty) | (OrderID, ProdID) | whole key ⇒ BCNF ✓ |

For THIS schema the walk ends at BCNF with zero extra splits and dependency preservation intact. The next step shows why that happy ending is not guaranteed in general.

### Step 5: When BCNF Demands Surgery That 3NF Forbids
Teaching(Student, Instructor, Course) with:
- h1: Instructor → Course — every instructor teaches exactly one course
- h2: (Student, Course) → Instructor — a student meets each course under one instructor

Candidate keys: {Student, Course} directly; also {Student, Instructor} because h1 lifts Instructor → Course, so (Student,Instructor)⁺ covers R. Both Course and Instructor are therefore **prime** ⇒ h1 passes 3NF via the prime-RHS escape clause, yet FAILS BCNF since Instructor is not a superkey: Teaching is in **3NF but not BCNF**.

Split on h1:

```
T1(Instructor, Course):    (Rao, DBMS)   (Mehta, OS)
T2(Student, Instructor):   (Anil, Rao)   (Anil, Mehta)   (Bina, Rao)
```

Losslessness holds (shared attribute Instructor is T1's key). But h2, (Student, Course) → Instructor, is derivable ONLY by re-joining T1 ⋈ T2 — it belongs to neither projection ⇒ **dependency preservation is lost**: enforcement would need a join inside every INSERT trigger. This exact tension is the exam's favorite question.

## 🔴 Expert Level

### The Binary Lossless-Join Theorem: Exact Usage
Decomposition of R into R1 and R2 is lossless iff (R1 ∩ R2) → (R1 − R2) or (R1 ∩ R2) → (R2 − R1) holds in F⁺. Recipe:
1. Compute the shared attribute set.
2. Take its closure under the FULL original F.
3. Check whether that closure swallows all of R1 or all of R2.
4. Yes ⇒ lossless; no ⇒ rejoining can emit spurious tuples.

Applied above: Orders ⋈ Customers share {CustID}; (CustID)⁺ ⊇ CustCity ⇒ Customers fully covered ⇒ lossless. Counterexample for intuition: splitting R(A,B) into R1(A) and R2(B) shares NOTHING, so rejoining computes the Cartesian product — 3 real facts become 9 stored pairs of phantom data.

### Generalizing Beyond Two Pieces: the Chase Test
For k-way decompositions the binary theorem does not directly apply. The tableau/chase algorithm assigns one tagged row per fragment, repeatedly equates symbols wherever an FD fires, and declares losslessness iff some row becomes fully distinguished. It is the decision procedure behind formal schema-evolution tools — name it in interviews even though hand-chasing stays rare outside academia.

### 3NF Synthesis Algorithm (Bernstein 1976): Steps and Micro-Run
1. Compute a canonical cover Fc of F.
2. Group Fc by identical left side; create ONE relation per group holding the LHS plus its RHS attributes.
3. If NO produced schema contains a candidate key of R, add one extra relation consisting of that candidate key.
4. Drop any schema fully contained in another (redundancy elimination).

Micro-run: R(A,B,C), Fc = {A→B, B→C}. Groups yield R1(A,B) and R2(B,C); A alone is a candidate key ((A)⁺ = ABC) and already sits inside R1 ⇒ no extras; nothing nests ⇒ output {R1(A,B), R2(B,C)} — exactly the shape our walkthrough produced. The guarantee: synthesis always achieves 3NF with BOTH lossless join and dependency preservation; it never promises BCNF.

### BCNF Decomposition Algorithm and Its Price
Algorithm: while some non-trivial FD X → A violates BCNF (X not a superkey):
1. Form R1 = X⁺ (the violator's full closure) and R2 = R − (X⁺ − X).
2. Recurse on both pieces; X is a key of R1 so each split is provably lossless.

The price: projected dependencies can vanish, exactly as h2 did in Step 5. Consequences in production: constraints move into triggers, application logic, or periodic validation queries; some teams deliberately stop at 3NF to keep CHECK-enforceable dependencies. Remember the hierarchy result: 3NF is the strongest normal form that guarantees both properties simultaneously.

### Beyond BCNF (Orientation Only)
4NF targets multivalued dependencies — two independent 1:N facts stored together (Employee ⟶ Skills, Employee ⟶ Languages) multiply rows into an unwanted cross product; split them apart. 5NF handles join dependencies where only three-way projections rejoin losslessly. Both are rare in OLTP practice but standard interview trivia.

### Denormalization: When Breaking the Rules Pays
- **OLAP star schemas**: a fact table of ~1B rows joined to five normalized dimensions becomes a denormalized wide dimension; scan-friendly columnar storage then beats JOIN pipelines.
- **Read-heavy caches**: materialized views precompute hot aggregates (PostgreSQL: `REFRESH MATERIALIZED VIEW CONCURRENTLY` keeps readers online during refresh).
- **Numbers**: five chained JOINs at ~10 ms planner overhead each versus a single flat read at ~40 ms pays off once reads dominate writes by three orders of magnitude; below that, update amplification wins.
- Guardrails: derive-on-write updates, idempotent rebuild jobs, drift-detection queries comparing aggregate against source counts.

### Key Interview Questions

### Q1: R(A,B,C) with F = {AB→C, C→B} — what is the highest normal form?
**Answer**:
1. Candidate keys: (AB)⁺ = ABC and (AC)⁺ = ACB ⇒ both AB and AC are keys.
2. Prime attributes: {A, B, C} — ALL attributes are prime.
3. 2NF: vacuously satisfied since every attribute is prime (no non-prime exists).
4. 3NF: for C→B, C is not a superkey BUT B is prime ⇒ passes.
5. BCNF: C is not a superkey ⇒ fails.
Highest form: **3NF**. This relation is the canonical proof that 3NF ⊃ BCNF strictly.

### Q2: Why can BCNF fail dependency preservation? Give the canonical example.
**Answer**: When violating FDs interlock through prime attributes (Step 5's Teaching relation). Decomposing on Instructor → Course isolates that FD inside T1 while (Student, Course) → Instructor survives only as a cross-relation constraint requiring a join. Root cause: BCNF forces a split on EVERY non-key determinant, but preservation requires each FD to live wholly inside ONE fragment — the two demands collide when candidate keys share attributes. Synthesis (3NF) keeps FDs whole by tolerating the redundancy BCNF removes.

### Q3: Recite the 3NF synthesis algorithm and its two guarantees.
**Answer**: Canonical cover first; group by LHS into one relation per group; add a relation containing a candidate key if none emerged; drop contained schemas. Guarantees: the result is in 3NF, and it preserves dependencies AND joins losslessly — provided the input was a genuine canonical cover and the key-backstop step ran. It is the algorithmic answer whenever an interviewer asks how to normalize automatically.

### Q4: How do you PROVE a decomposition lossless in an exam setting?
**Answer**: Invoke the binary theorem concretely: write the intersection set, compute its closure under the full F, show containment of one entire fragment. For our walkthrough: R1 = Orders(OrderID, CustID), R2 = Customers(CustID, CustCity); intersection = {CustID}; (CustID)⁺ = {CustID, CustCity} ⊇ R2 ⇒ lossless. Mention the chase algorithm for three-plus fragments to display breadth.

### Q5: When is denormalization justified in production?
**Answer**: Read-dominated workloads with stable update paths: OLAP marts (star schemas on Snowflake/Redshift), leaderboard counters in Redis, materialized views over PostgreSQL replicas, event-sourced read models rebuilt idempotently. Justify with measured numbers (JOIN latency × QPS vs refresh cost), keep a normalized source of truth, and automate consistency checks — denormalization without reconciliation tooling is technical debt with interest.

### Q6: True or false: every BCNF relation is in 3NF, every 3NF in 2NF, every 2NF in 1NF?
**Answer**: All true. BCNF's test (every determinant a superkey) strictly implies 3NF's weaker disjunction (superkey OR prime RHS): whenever the superkey clause fails, 3NF may still pass via primality, never conversely. A 3NF violation would itself be either partial or transitive-on-non-prime, which 2NF already excludes, so 3NF ⊆ 2NF. And 2NF's definition presupposes 1NF atomicity by construction.
