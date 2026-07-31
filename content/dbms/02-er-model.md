# Entity-Relationship (ER) Modeling & Relational Mapping

## 🟢 Beginner Level

### What is ER Modeling?
An **Entity-Relationship (ER) Model** is a high-level conceptual data model used to visually design database schemas before implementing them in SQL tables.

```
┌───────────────────┐              ┌────────────────────┐              ┌───────────────────┐
│     STUDENT       │──────(N)─────│     ENROLLS_IN     │──────(M)─────│      COURSE       │
│  - RollNo (PK)    │              │  - Semester        │              │  - CourseID (PK)  │
│  - Name           │              │  - Grade           │              │  - Title          │
└───────────────────┘              └────────────────────┘              └───────────────────┘
```

### Core Components of ER Diagrams

1. **Entity**: A real-world object or concept (e.g., `Student`, `Department`, `Order`). Represented by a **Rectangle**.
   - **Weak Entity**: An entity that cannot be uniquely identified by its own attributes alone and relies on a identifying parent entity (e.g., `Dependent` relying on `Employee`). Represented by a **Double Rectangle**.
2. **Attribute**: Properties describing an entity. Represented by an **Ellipse**.
   - **Key Attribute**: Primary identifier (underlined text, e.g., <u>`RollNo`</u>).
   - **Composite Attribute**: Made of smaller sub-parts (e.g., `Name` $\rightarrow$ `FirstName`, `LastName`).
   - **Multivalued Attribute**: Can contain multiple values (e.g., `PhoneNumbers`). Represented by a **Double Ellipse**.
   - **Derived Attribute**: Calculated dynamically from other attributes (e.g., `Age` from `DateOfBirth`). Represented by a **Dashed Ellipse**.
3. **Relationship**: Association between entities. Represented by a **Diamond**.

---

## 🟡 Intermediate Level

### Cardinalities & Participation Constraints

- **Mapping Cardinalities**:
  - **1 to 1 (1:1)**: An employee manages at most one department.
  - **1 to Many (1:N)**: A department employs many employees.
  - **Many to Many (M:N)**: Students enroll in multiple courses; courses have multiple students.

- **Participation Constraints**:
  - **Total Participation (Double Line)**: Every entity instance in the entity set MUST participate in the relationship (e.g., every `Loan` must belong to a `Customer`).
  - **Partial Participation (Single Line)**: Some entity instances may not participate (e.g., not all `Employees` manage a `Department`).

### ER Diagram to Relational Table Mapping Rules

1. **Strong Entity Set**: Converts directly to a table. Key attribute becomes Primary Key.
2. **Weak Entity Set**: Converts to a table containing weak attributes + Foreign Key of parent entity. Composite PK = (Parent PK + Partial Key).
3. **Binary 1:1 Relationship**: Place Foreign Key in the table of total participation side.
4. **Binary 1:N Relationship**: Place Foreign Key on the **Many (N)** side table pointing to the 1-side Primary Key.
5. **Binary M:N Relationship**: Create a **Junction (Cross) Table** containing Foreign Keys from both entities as a composite Primary Key.

---

## 🔴 Expert Level

### Specialization, Generalization & Aggregation

- **Generalization**: Bottom-up abstraction combining lower-level entities with common attributes into a higher-level entity (e.g., `Car` and `Truck` $\rightarrow$ `Vehicle`).
- **Specialization**: Top-down division of a high-level entity into sub-entities based on specific characteristics (e.g., `Account` $\rightarrow$ `SavingsAccount`, `CheckingAccount`).
- **Aggregation**: Abstraction treating a relationship set as a higher-level entity set so it can participate in secondary relationships.

### Interview Scenario Questions

1. **How do you map a Multivalued Attribute (e.g., `Student.PhoneNumbers`) to relational tables?**
   - *Answer*: Create a separate table `Student_Phone (Student_RollNo, Phone_Number)`. Composite Primary Key is `(Student_RollNo, Phone_Number)` with `Student_RollNo` referencing `Student(RollNo)`.

2. **What is the minimum number of tables required for an ER diagram with $E_1$ (1) to $E_2$ (N) relationship with total participation on $E_2$?**
   - *Answer*: **2 tables** ($E_1$ table and $E_2$ table with $E_1$'s PK embedded as a Foreign Key in $E_2$).
