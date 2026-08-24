# Keys, Functional Dependencies & Minimal Canonical Cover

## 🟢 Beginner Level

### Why Keys Exist
A database key uniquely identifies rows and stitches relationships across tables. Every integrity guarantee you rely on — no duplicate customers, every order pointing at a real product — is enforced through some key.

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

- **Foreign Key (FK)**: attribute referencing the primary key of another relation, enforcing **referential integrity** on insert/delete.
- **Composite Key**: a key made of two or more attributes, none of which alone suffices.
- **Prime Attributes**: attributes belonging to at least one candidate key.
- **Non-Prime Attributes**: everything else — these are the attributes normalization rules protect.

### Key Types Cheat Sheet on One Relation
Take Employees(emp_id, pan_no, email, name):

| Key Type | Definition | Instances Here |
| --- | --- | --- |
| Super Key | any attribute set that is unique in every legal instance | {emp_id}, {email, name}, {emp_id, pan_no} |
| Candidate Key | minimal super key; drop any column and uniqueness dies | {emp_id}, {pan_no}, {email} |
| Primary Key | the candidate key the designer elects; never NULL | emp_id |
| Alternate Keys | losing candidate keys | pan_no, email |
| Foreign Key | references another relation's key | dept_id → Department(dept_id) |

### Functional Dependencies: The Business Rule Behind Keys
An FD X → Y reads "X functionally determines Y": knowing X pins down exactly one value of Y.

- emp_id → salary: an employee has one salary at a time.
- pan_no → name: identity documents pin down the holder's name.
- name ↛ salary: two different Bobs can earn differently — not an FD.
- Crucial: an FD is a **semantic claim** holding on EVERY legal instance, not a coincidence observed in today's rows.

### Natural vs Surrogate: The First Fork
- **Natural key**: built from real-world attributes already unique (PAN number, ISBN, country code IN).
- **Surrogate key**: meaningless identifier manufactured by the DBMS (AUTO_INCREMENT in MySQL, IDENTITY/sequences elsewhere, UUIDs in distributed systems).
- Both appear throughout this file; the production trade-off analysis waits in the Expert Q&A section.

### Superkey Explosion: Why Minimality Matters Numerically
One candidate key of size k inside an n-attribute relation quietly owns many supersets. Take R(A,B,C,D) whose only candidate key is {A}: every set containing A is a superkey — 2³ = 8 of them ({A}, {A,B}, {A,C}, {A,D}, {A,B,C}, {A,B,D}, {A,C,D}, {A,B,C,D}). Only ONE of those eight deserves to become a primary key; the rest waste index bytes and confuse readers. Candidate keys are the compression of uniqueness down to its essential core.

## 🟡 Intermediate Level

### Functional Dependency: Formal Definition
X → Y holds on relation R iff for all pairs of tuples t1, t2 in R: whenever t1[X] = t2[X], necessarily t1[Y] = t2[Y]. Vocabulary:

- **Trivial FD**: Y ⊆ X (e.g. AB → A); always true, never worth enforcing.
- **Full FD** X → Y: Y depends on ALL of X, and removing any attribute from X breaks it.
- **Partial FD**: X is composite and Y already depends on a proper subset of X — the disease 2NF cures.
- **Transitive FD**: X → Y via a middleman Z (X → Z, Z → Y) with Z neither superkey nor part of one — the disease 3NF cures.

### Armstrong's Axioms (Sound and Complete)
1. **Reflexivity**: if Y ⊆ X then X → Y.
2. **Augmentation**: if X → Y then XZ → YZ.
3. **Transitivity**: if X → Y and Y → Z then X → Z.

Derived shortcuts:
- **Union**: X → Y and X → Z give X → YZ.
- **Decomposition**: X → YZ gives both X → Y and X → Z.
- **Pseudotransitivity**: X → Y and WY → Z give WX → Z.

These three axioms generate exactly F⁺ — the set of ALL dependencies implied by F. Nothing more is needed, nothing less suffices.

### Attribute Closure (X)⁺: Algorithm Plus Worked Example
To compute everything determined by attribute set X under F:
1. Initialize closure = X.
2. Scan F: whenever some FD A → B has A ⊆ closure, add B to closure.
3. Repeat until one full pass adds nothing.
4. Verdicts: X is a superkey iff (X)⁺ = all of R; X is a candidate key iff it is a superkey AND no proper subset is.

Worked example. R(A,B,C,D,E,F), F = {A→C, B→D, CD→EF, F→A}. Compute (AB)⁺:

| Pass | FD That Fires | Closure After |
| --- | --- | --- |
| 0 (seed) | initialize | {A, B} |
| 1 | A→C fires (A present) | {A, B, C} |
| 2 | B→D fires (B present) | {A, B, C, D} |
| 3 | CD→EF fires (C,D present), add E,F | {A, B, C, D, E, F} |
| 4 | nothing new fires | stop |

(AB)⁺ = {A,B,C,D,E,F} = R, so AB is a superkey. Minimality check: (A)⁺ = {A,C} ≠ R and (B)⁺ = {B,D} ≠ R, so AB is a genuine **candidate key**. Cost note: with FDs indexed by left-hand side, one closure runs in O(|F| + |R|) — effectively linear.

The same machinery chained on a second probe. Is CD a key of the same relation? Compute (CD)⁺:

| Pass | FD That Fires | Closure After |
| --- | --- | --- |
| 0 (seed) | initialize | {C, D} |
| 1 | CD→EF fires (C,D present) | {C, D, E, F} |
| 2 | F→A fires (F present) | {C, D, E, F, A} |
| 3 | A→C adds nothing new; B→D blocked (no B) | stop |

(CD)⁺ = {A,C,D,E,F} ≠ R (attribute B unreachable) ⇒ CD is NOT even a superkey here. One missing attribute flips the verdict — always finish the closure before judging.

### Closure Pseudocode You Can Reimplement in an Interview

```
CLOSURE(X, F):
    result := X
    repeat until nothing changes:
        for each FD (L -> Rside) in F indexed by LHS:
            if L ⊆ result:
                result := result ∪ Rside
    return result

INDEXING TIP: bucket FDs by their left side; when an LHS first becomes
fully contained in result, fire it once and mark it done. This converts
the naive rescan-everything loop into a single linear sweep.
```

### Finding All Candidate Keys Without Brute Force
Attribute classification prunes the 2ⁿ search space before you start:
1. Attributes appearing ONLY on right-hand sides of F can never be in any candidate key — exclude them from seeds.
2. Attributes appearing ONLY on left-hand sides (or nowhere) must be members of EVERY candidate key — force them into seeds.
3. Ambiguous attributes (both sides) are branch points: try including each or not.

Micro-example. R(A,B,C), F = {A→B, B→C}: only-A-on-LHS forces A into every key; C never appears on any LHS so C belongs to no key. Seed {A}: (A)⁺ = {A,B,C} = R ⇒ the sole candidate key is {A}. Exam-sized problems may still need systematic subset enumeration — but now only over the ambiguous middle set.

### From Closure to Normal Forms
Prime versus non-prime classification plus full/partial/transitive detection is precisely the input that normalization (next topic) consumes: partial and transitive FDs landing on non-prime attributes are what 2NF and 3NF eliminate.

## 🔴 Expert Level

### Canonical Cover Fc: Definition and Full Derivation
A canonical cover Fc of F is an equivalent FD set that is minimal: single-attribute right-hand sides, no extraneous attributes on either side, no redundant dependency. Fc is not unique, but every canonical cover has the same size class, and synthesis algorithms consume it as input.

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

Full derivation on R(A,B,C) with F = {A→BC, B→C, A→B, AB→C}:

1. **Singleton RHS and de-duplicate**: {A→B, A→C, B→C, AB→C}.
2. **Extraneous LHS test on AB→C**: is A extraneous? Ask whether C ∈ (B)⁺ under the current set. (B)⁺ = {B, C} because B→C fires ⇒ yes ⇒ replace AB→C by B→C, which duplicates an existing FD and is dropped. Set: {A→B, A→C, B→C}.
3. **Redundancy tests against current sets**:
   - Remove A→C tentatively: (A)⁺ under {A→B, B→C} = {A,B,C} ∋ C ⇒ A→C is redundant, delete.
   - Remove A→B tentatively: (A)⁺ under {B→C} = {A} ∌ B ⇒ keep it.
   - Remove B→C tentatively: (B)⁺ under {A→B} = {B} ∌ C ⇒ keep it.

Final canonical cover: **Fc = {A→B, B→C}** — four dependencies collapsed to two with zero information loss. Always recompute closures against the CURRENT set after every removal; testing against stale F yields wrong verdicts.

### Projecting FD Sets onto a Decomposition
Dependency preservation checks require projecting F onto each fragment Ri: for every X → Y in F, compute X⁺ under the FULL F, then keep X → (X⁺ ∩ Ri). Micro-run for the cover above split into R1(A,B) and R2(B,C): R1 inherits A→B; R2 inherits B→C; their union rederives F ⇒ preserved. This machinery powers every preservation argument in the next topic.

### Complexity and Practical Bounds
- Single closure: linear time with LHS-indexed FD lookup; naive nested scanning is O(|F|²) per pass — still trivial for exam-sized inputs.
- Enumerating all candidate keys: worst case exponential (up to binomial(C(n, n/2)) minimal keys exist); the classification heuristics above are what make textbook instances tractable.
- Production engines never enumerate keys this way — constraints are declared once and enforced incrementally; closure math is a DESIGN-TIME tool.

### Key Interview Questions

### Q1: R(A,B,C,D,E) with F = {A→BC, CD→E, B→D, E→A}. Find all candidate keys.
**Answer**:
1. (A)⁺ : A gives B,C via A→BC; B gives D; CD gives E ⇒ {A,B,C,D,E} ⇒ **A** is a candidate key.
2. E→A means (E)⁺ ⊇ (A)⁺ = R ⇒ **E** is a candidate key.
3. CD→E chains into E's closure ⇒ (CD)⁺ = R; subsets fail ((C)⁺={C}, (D)⁺={D}) ⇒ **CD** is a candidate key.
4. B→D makes (BC)⁺ ⊇ (CD)⁺ = R; subsets fail ((B)⁺={B,D}, (C)⁺={C}) ⇒ **BC** is a candidate key.
5. Total: **{A, E, CD, BC}**. Note how each discovery reuses the previous closure — order your probes to chain.

### Q2: Super key vs candidate key vs primary key — precise distinctions?
**Answer**: Super key = ANY uniqueness-guaranteeing set, redundancy allowed ({emp_id, name} qualifies but carries dead weight). Candidate key = minimal super key, zero removable attributes. Primary key = whichever candidate key engineering elects for referencing and clustering; the rest become alternate keys. Practical stake: in MySQL InnoDB the primary key IS the clustered index, so a bloated super key as PK bloats every secondary index entry too.

### Q3: Surrogate vs natural keys — how do you actually choose?
**Answer**: Default to an internal surrogate plus UNIQUE constraints on natural identifiers. Reasons:
- BIGINT surrogates are fixed 8 bytes, monotonic, so InnoDB clustered inserts append to the rightmost page instead of splitting random pages; UUIDv4's randomness causes page splits and buffer-pool churn (time-ordered UUIDv7 mitigates this — PostgreSQL 18 even ships a uuidv7() function; store UUIDs as BINARY(16) in MySQL 8).
- Business attributes mutate: when a company renames or recycles emails, a natural PK would cascade updates through every child FK; a surrogate absorbs the change in ONE row.
- Keep natural keys as UNIQUE constraints anyway — they remain queryable, human-meaningful join paths and duplicate guards.
Legitimate natural-key exceptions: ISO country/currency codes where values are stable, tiny, and universally referenced.

### Q4: How do you enumerate candidate keys faster than trying all subsets?
**Answer**: Classify first: RHS-only attributes are excluded everywhere; LHS-only attributes are mandatory everywhere; branch only over ambiguous ones. Prune aggressively: once a set S closes onto R, no superset of S can be a CANDIDATE key (it fails minimality), so cut that entire subtree. Memoize failed closures. For the exam classic above, chaining discoveries (E from A, CD from E, BC from CD) collapses four searches into four cheap closure computations.

### Q5: "Armstrong's axioms are sound and complete" — why does that sentence matter?
**Answer**: Soundness: anything derivable is true in every instance satisfying F — no phantom constraints invented. Completeness: everything entailed by F is derivable — no constraint missed. Together they turn the semantic question "does F imply X→Y?" into a finite algorithmic one: X → Y holds iff Y ⊆ (X)⁺. Closure computation is thus a decision procedure for logical implication over functional dependencies — the backbone of key finding, cover reduction, and preservation checking.

### Q6: Why insist on computing the canonical cover BEFORE normalizing?
**Answer**: The 3NF synthesis algorithm consumes Fc literally: one output relation per FD group. A redundant FD would manufacture a needless table; extraneous LHS attributes would widen primary keys and every index referencing them. Minimality also sharpens violation checks — 2NF, 3NF and BCNF tests iterate over a short, non-redundant basis rather than a noisy FD dump, which is how you avoid false violations caused by derived duplicates.
