# Entity-Relationship (ER) Modeling & Relational Mapping

## 🟢 Beginner Level

### What is the ER Model?
The **Entity-Relationship Model (ER Model)** is a high-level conceptual data model used to visually blueprint the logical structure of a database. It defines the real-world objects (**Entities**), their descriptive properties (**Attributes**), and the associations connecting them (**Relationships**).

```
+---------------------------------------------------------------------------------------------------+
|                                 3-STAGE DATABASE DESIGN LIFECYCLE                                 |
+---------------------------------------------------------------------------------------------------+
| 1. Requirements Analysis   | Interview domain users, gather business workflows and data rules.    |
| 2. Conceptual Design (ER)  | Model entities, relationships, keys, and cardinalities in an ERD.    |
| 3. Logical & Physical DB   | Convert ERD to SQL tables (DDL), apply normalization, and add indexes.|
+---------------------------------------------------------------------------------------------------+
```

---

### Uses & Importance of ER Diagrams (ERD)
- **Direct Conversion to Relational Tables**: Every entity, relationship, and constraint maps cleanly to SQL tables, primary keys, and foreign keys.
- **Real-World Problem Modeling**: Translates complex real-world business domains (e.g. banking, hospital management, university enrollment) into intuitive visual diagrams.
- **Vendor & DBMS Independent**: Requires zero specific knowledge of MySQL, PostgreSQL, or Oracle syntax, functioning as a universal architectural blueprint.
- **Communication Bridge**: Facilitates seamless alignment between non-technical business stakeholders, system architects, and backend engineers.

---

### Complete ER Diagram Symbols Reference

```
+---------------------------------------------------------------------------------------------------+
|                                     STANDARD ER MODEL SYMBOLS                                     |
+------------------------------+------------------------------------+-------------------------------+
| Shape                        | ER Component                       | Example                       |
+------------------------------+------------------------------------+-------------------------------+
| [ Rectangle ]                | Strong Entity Set                  | Student, Employee, Course     |
| [[ Double Rectangle ]]       | Weak Entity Set                    | Dependent, OrderItem          |
| ( Oval / Ellipse )           | Attribute                          | Name, Salary, Title           |
| ( <u>Underlined Oval</u> )   | Key Attribute (Primary Key)        | <u>Roll_No</u>, <u>Emp_ID</u> |
| (( Double Oval ))            | Multivalued Attribute              | Phone_Numbers, Skills         |
| ( Dashed Oval ) - - -        | Derived Attribute                  | Age (from DOB), Total_Amount  |
| ( Oval with Sub-Ovals )      | Composite Attribute                | Address (Street, City, State) |
| < Diamond >                  | Relationship Type                  | Enrolls_In, Works_On          |
| << Double Diamond >>         | Identifying Relationship (Weak)    | Has_Dependents                |
| ─── Single Line ───          | Partial Participation              | Some courses have 0 students  |
| ═══ Double Line ═══          | Total Participation (Mandatory)    | Every student must be enrolled|
+------------------------------+------------------------------------+-------------------------------+
```

---

### Entities and Entity Sets

An **Entity** is a distinct, identifiable real-world object, concept, or event about which data is captured.
- **Real-World Objects**: `Person`, `Car`, `Employee`, `Doctor`.
- **Concepts & Events**: `Course`, `Conference`, `Flight_Reservation`.
- **Things / Artifacts**: `Product`, `Invoice`, `Medical_Record`.

- **Entity Type**: The schema blueprint definition (e.g., `Student` with attributes `Roll_No`, `Name`).
- **Entity Set**: The collection of all entity instances belonging to a specific entity type at a given moment in time (e.g., the set of all active students $\{S_1, S_2, S_3, \dots\}$).
- *Note*: An ER diagram models the structural blueprint (Entity Sets and Types), not individual rows/instances.

```
                  +-----------------------------------+
                  |      EMPLOYEE (Strong Entity)     |
                  |  - <u>Emp_ID</u> (Primary Key)    |
                  |  - Name, Department               |
                  +-----------------+-----------------+
                                    |
                                    | 1
                                    |
                         << Has_Dependents >> (Identifying Relationship)
                                    |
                                    | M (Total Participation ══)
                                    |
                  +=================+=================+
                  ||     DEPENDENT (Weak Entity)     ||
                  || - <u>- - Dep_Name - -</u> (Partial) ||
                  || - Relationship_Type, BirthDate  ||
                  +===================================+
```

#### Strong vs. Weak Entity Sets
1. **Strong Entity**: Possesses a **Key Attribute (Primary Key)** capable of uniquely identifying each instance independently. Represented by a single **Rectangle**.
2. **Weak Entity**: Cannot be uniquely identified by its own attributes alone and depends on an **Identifying Strong Entity** for existence and identity.
   - Uses a **Partial Key / Discriminator** (marked with a dashed underline `<u>- - - -</u>`).
   - Connected via a **Double Diamond (Identifying Relationship)**.
   - Its participation in the identifying relationship is always **Total Participation (Double Line)**.
   - *Example*: An `Employee` (Strong) and their `Dependent` (Weak). A dependent cannot exist in the company health insurance registry without the parent employee.

---

### Types of Attributes in ER Model

```
                                          +-------------------------+
                                          |   TYPES OF ATTRIBUTES   |
                                          +------------+------------+
                   +------------------+----------------+------------------+------------------+
                   |                  |                                   |                  |
                   v                  v                                   v                  v
          +------------------+  +------------------+             +------------------+  +------------------+
          |  Key Attribute   |  | Composite Attr.  |             | Multivalued Attr.|  |  Derived Attr.   |
          |  <u>Roll_No</u>  |  | Address -> City  |             | (( Phone_No ))   |  | ( Age ) from DOB |
          +------------------+  +------------------+             +------------------+  +------------------+
```

1. **Key Attribute**: Uniquely identifies each entity in the entity set. Drawn as an oval with **underlined text** (e.g., <u>`Roll_No`</u>, <u>`ISBN`</u>).
2. **Composite Attribute**: Composed of multiple constituent sub-attributes that can be divided into smaller meaningful components.
   - *Example*: `Address` $\rightarrow$ (`Street_Number`, `City`, `State`, `Zip_Code`).
   - *Example*: `Full_Name` $\rightarrow$ (`First_Name`, `Middle_Initial`, `Last_Name`).
3. **Multivalued Attribute**: Can hold more than one value for a single entity instance. Represented by a **Double Oval**.
   - *Example*: `(( Phone_Numbers ))` (a student may have 3 active SIM cards).
   - *Example*: `(( Technical_Skills ))` (`['Java', 'SQL', 'Docker']`).
4. **Derived Attribute**: Not physically stored; dynamically calculated or derived from another stored attribute. Represented by a **Dashed Oval**.
   - *Example*: `( Age )` dynamically derived from `Date_Of_Birth` via formula $\text{Age} = \text{CURRENT\_DATE} - \text{DOB}$.
   - *Example*: `( Total_Order_Price )` derived from $\sum (\text{Quantity} \times \text{Unit\_Price})$.

---

## 🟡 Intermediate Level

### Complete Visual Blueprint: Entity with All Attribute Types

```
                       ( <u>Roll_No</u> ) [Key Attribute]
                             |
       ( First_Name )        |       ( ( Phone_No ) ) [Multivalued]
             \               |              /
              ( Name ) ── [ STUDENT ] ── ( ( Email_IDs ) )
             /               |              \
       ( Last_Name )         |       ( Age ) [Derived from DOB]
  [Composite Attribute]      |             :
                       ( Address )   ( Date_Of_Birth )
                        /   |   \
                   Street City Zip
```

---

### Degree of a Relationship Set
The **Degree** refers to the number of distinct entity sets participating in a relationship set:

```
[1. Unary / Recursive (Degree 1)]
    +--------------------------------+
    |                                | (Supervisor)
    v                                |
[ EMPLOYEE ] ─── < Manages > ────────+
    | (Supervisee)
    +--------------------------------+

[2. Binary (Degree 2)]
[ STUDENT ] ─────── < Enrolls_In > ─────── [ COURSE ]

[3. Ternary (Degree 3)]
[ SUPPLIER ] ────+
                 |
[ PART ] ────────┼─── < Supplies_To > ─── [ PROJECT ]
```

1. **Unary / Recursive Relationship (Degree 1)**: The same entity set participates more than once in different roles.
   - *Example*: `Employee` manages other `Employees` (Role: Supervisor $\leftrightarrow$ Subordinate).
   - *Example*: `Person` is married to `Person`.
2. **Binary Relationship (Degree 2)**: Two distinct entity sets participate (most common relationship in database modeling).
   - *Example*: `Student` enrolls in `Course`.
3. **Ternary Relationship (Degree 3)**: Three distinct entity sets participate simultaneously.
   - *Example*: `Supplier` supplies a `Part` for a specific `Project`.
4. **N-ary Relationship (Degree N)**: $N$ entity sets participate in a single complex association.

---

### Mapping Cardinalities (Multiplicities)

Cardinality specifies the maximum number of entity instances in one set that can be associated with entity instances in another set:

```
[1. One-to-One (1:1)]
   Set A (Persons)       Set B (Passports)
     [ P1 ] -----------> [ Pass1 ]
     [ P2 ] -----------> [ Pass2 ]
     [ P3 ] -----------> [ Pass3 ]

[2. One-to-Many (1:N)]
   Set A (Department)    Set B (Doctors)
     [ Dept1 ] --------> [ Doc1 ]
               --------> [ Doc2 ]
               --------> [ Doc3 ]

[3. Many-to-One (N:1)]
   Set A (Surgeries)     Set B (Surgeon)
     [ Surg1 ] --------> [ LeadSurgeon1 ]
     [ Surg2 ] -------->
     [ Surg3 ] --------> [ LeadSurgeon2 ]

[4. Many-to-Many (M:N)]
   Set A (Students)      Set B (Courses)
     [ S1 ] -----------> [ C1 ]
            -----------> [ C2 ]
     [ S2 ] -----------> [ C2 ]
            -----------> [ C3 ]
```

1. **One-to-One (1:1)**: An entity in Set A is associated with at most one entity in Set B, and vice versa.
   - *Example*: One `Citizen` holds exactly one `Passport`.
2. **One-to-Many (1:N)**: An entity in Set A can be associated with any number ($0 \dots N$) of entities in Set B, but an entity in Set B is associated with at most one entity in Set A.
   - *Example*: One `Hospital_Department` employs many `Doctors`.
3. **Many-to-One (N:1)**: Many entities in Set A associate with at most one entity in Set B.
   - *Example*: Many `Students` belong to one `Hostel`.
4. **Many-to-Many (M:N)**: An entity in Set A can associate with multiple entities in Set B, and vice versa.
   - *Example*: `Students` enroll in multiple `Courses`; each `Course` contains multiple enrolled `Students`.

---

### Participation Constraints

Participation defines whether the existence of an entity depends on its participation in a relationship:

```
                  Total Participation (Double Line)           Partial Participation (Single Line)
                          Every Student Must Enroll              Some Courses Have 0 Students
                   [ STUDENT ] ================== < Enrolls_In > ------------------ [ COURSE ]

[Set Representation]
   STUDENTS (Total: S1, S2, S3 all participate)           COURSES (Partial: C4 has 0 students)
     ( S1 ) ---------------------------------------------> ( C1 )
     ( S2 ) ---------------------------------------------> ( C2 )
     ( S3 ) ---------------------------------------------> ( C3 )
                                                           ( C4 ) ◄── Unlinked (Partial)
```

- **Total Participation (Mandatory / Double Line $\mathbf{===}$)**: Every entity instance in the set **MUST** participate in at least one relationship instance. If $S$ is total in $R$, then for every $e \in S$, there exists an association in $R$.
- **Partial Participation (Optional / Single Line $\mathbf{---}$)**: Entities in the set **MAY or MAY NOT** participate in relationship instances. Some instances can exist independently without any links.

---

### Step-by-Step Guide: How to Construct an ER Diagram
1. **Step 1: Identify Entity Sets**: Extract nouns representing physical/logical objects (`Customer`, `Order`, `Product`, `Store`). Draw as **Rectangles**.
2. **Step 2: Identify Relationships**: Extract verbs indicating interactions (`Places`, `Contains`, `Processes`, `Employs`). Draw as **Diamonds**.
3. **Step 3: Attach Attributes**: Break down entities into atomic and composite attributes. Draw as **Ovals**.
4. **Step 4: Select Primary Keys & Discriminators**: Choose unique candidate identifiers for strong entities (`Customer_ID`) and partial keys for weak entities.
5. **Step 5: Determine Cardinalities & Participation**: Mark $(1:1, 1:N, M:N)$ ratios and double lines for mandatory participation.
6. **Step 6: Eliminate Schema Redundancies**: Remove duplicate attributes that can be derived or represented via foreign keys.

---

## 🔴 Expert Level

### Comprehensive ER-to-Relational Table Conversion Rules

Converting an ER Diagram to a 3NF relational database schema follows strict mathematical rules:

```
+---------------------------------------------------------------------------------------------------+
|                                 ER-TO-TABLE CONVERSION ALGORITHM                                  |
+--------------------------+-------------------------------------+----------------------------------+
| ER Element               | SQL Table Mapping Rule              | Resulting Schema & Keys          |
+--------------------------+-------------------------------------+----------------------------------+
| Strong Entity Set        | 1 Table per Entity Set              | Columns = Atomic Attributes      |
|                          |                                     | Primary Key = Key Attribute      |
+--------------------------+-------------------------------------+----------------------------------+
| Weak Entity Set          | 1 Table                             | Columns = Weak Attrs + Parent PK |
|                          |                                     | Composite PK = (Parent PK + Disc)|
+--------------------------+-------------------------------------+----------------------------------+
| Multivalued Attribute    | 1 Separate Table                    | Columns = (Parent PK + Value)    |
|                          |                                     | Composite PK = (Parent PK + Value)|
+--------------------------+-------------------------------------+----------------------------------+
| Composite Attribute      | Flatten into Parent Table           | Sub-parts become direct columns  |
+--------------------------+-------------------------------------+----------------------------------+
| Binary 1:1 Relationship  | Place FK in Total Participation side| No extra table needed            |
|                          | (or merge if both total)            |                                  |
+--------------------------+-------------------------------------+----------------------------------+
| Binary 1:N Relationship  | Place 1-side PK as FK on N-side     | No extra table needed            |
+--------------------------+-------------------------------------+----------------------------------+
| Binary M:N Relationship  | 1 Junction / Cross Table            | Columns = (E1_PK, E2_PK, RelAttrs|
|                          |                                     | Composite PK = (E1_PK, E2_PK)    |
+--------------------------+-------------------------------------+----------------------------------+
| N-ary / Ternary Relation | 1 Bridge Table                      | Columns = (E1_PK, E2_PK, E3_PK)  |
|                          |                                     | Composite PK = All Entity PKs    |
+--------------------------+-------------------------------------+----------------------------------+
```

---

### SQL DDL Implementation Example of ER Mapping

```sql
-- 1. Strong Entity: Student (Composite Name flattened, Roll_No is PK)
CREATE TABLE student (
    roll_no INT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    dob DATE NOT NULL
    -- Note: Age is derived dynamically, NOT stored as a column!
);

-- 2. Multivalued Attribute: Phone_Numbers (Requires separate table)
CREATE TABLE student_phone (
    roll_no INT REFERENCES student(roll_no) ON DELETE CASCADE,
    phone_no VARCHAR(20) NOT NULL,
    PRIMARY KEY (roll_no, phone_no)
);

-- 3. Strong Entity: Course
CREATE TABLE course (
    course_id VARCHAR(10) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    credits INT CHECK (credits > 0)
);

-- 4. Binary M:N Relationship: Enrolls_In (Junction Table)
CREATE TABLE enrolls_in (
    roll_no INT REFERENCES student(roll_no) ON DELETE CASCADE,
    course_id VARCHAR(10) REFERENCES course(course_id) ON DELETE CASCADE,
    enroll_date DATE NOT NULL DEFAULT CURRENT_DATE,
    grade CHAR(2),
    PRIMARY KEY (roll_no, course_id)
);
```

---

### Enhanced ER (EER) Modeling Concepts
- **Generalization (Bottom-Up Abstraction)**: Combining multiple entity sets that share common properties into a generalized superclass (e.g., `Car` and `Truck` generalized into `Vehicle`).
- **Specialization (Top-Down Refinement)**: Subdividing a higher-level entity set into specialized subclasses with distinctive attributes (e.g., `Account` specialized into `Savings_Account` with `Interest_Rate` and `Checking_Account` with `Overdraft_Limit`).
- **Disjoint vs. Overlapping Constraints**:
  - *Disjoint ($d$)*: An entity instance can belong to at most one subclass (e.g., a vehicle is either a Car or a Truck, not both).
  - *Overlapping ($o$)*: An entity instance can belong to multiple subclasses simultaneously (e.g., an employee can be both a `Lecturer` and a `PhD_Student`).
- **Aggregation**: Abstraction that treats an entire relationship set (along with its participating entities) as a single higher-level entity, allowing it to participate in subsequent relationships.

---

### High-Frequency Technical & Gate/Interview Q&As

#### Q1: What is the minimum number of relational tables needed to represent an M:N relationship between two strong entities $E_1$ and $E_2$, where each entity has one multivalued attribute?
**Answer**: **5 tables**:
1. Table for Strong Entity $E_1$.
2. Table for Multivalued Attribute of $E_1$.
3. Table for Strong Entity $E_2$.
4. Table for Multivalued Attribute of $E_2$.
5. Junction Table for the $M:N$ Relationship `(E1_PK, E2_PK)`.

#### Q2: Why is a foreign key placed on the Many (N) side in a 1:N relationship rather than the One (1) side?
**Answer**: Placing the foreign key on the 1-side would require storing multiple values in a single attribute cell for all associated $N$ records, violating **First Normal Form (1NF)** atomicity. Placing the single 1-side Primary Key as a foreign key on the $N$-side ensures that each row on the $N$-side contains exactly one scalar foreign key value, preserving 1NF with zero null-pointer overhead.
