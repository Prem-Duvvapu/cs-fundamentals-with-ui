// ER Model & Relational Mapping Simulation Engine

export const ER_MODEL_SCENARIOS = {
  'student-course-mn': {
    id: 'student-course-mn',
    name: '1. Binary Many-to-Many (M:N) & Multivalued Attr',
    description: 'Students enroll in multiple Courses. Demonstrates composite attributes, multivalued phone numbers, derived age, and the M:N junction table mapping rule.'
  },
  'employee-dependent-weak': {
    id: 'employee-dependent-weak',
    name: '2. Weak Entity & Identifying Relationship',
    description: 'Employees have Dependents. Dependents have no independent primary key; demonstrates total participation (double line) and composite PK absorption.'
  },
  'department-doctor-1n': {
    id: 'department-doctor-1n',
    name: '3. One-to-Many (1:N) Relationship',
    description: 'A Department employs many Doctors. Demonstrates placing the 1-side Primary Key as a Foreign Key in the Many-side table without an extra cross table.'
  },
  'person-passport-11': {
    id: 'person-passport-11',
    name: '4. One-to-One (1:1) Relationship',
    description: 'A Person is issued a Passport. Demonstrates placing the Foreign Key on the total participation side to minimize NULL values.'
  },
  'employee-supervisor-unary': {
    id: 'employee-supervisor-unary',
    name: '5. Unary / Recursive (Self-Referencing)',
    description: 'Employees are supervised by Managers within the same entity set. Demonstrates self-referencing foreign keys.'
  }
}

export class ErModelEngine {
  constructor() {
    this.activeScenario = 'student-course-mn'
    this.stepIndex = 0
    this.steps = this.generateSteps()
  }

  setScenario(scenarioId) {
    if (ER_MODEL_SCENARIOS[scenarioId]) {
      this.activeScenario = scenarioId
      this.stepIndex = 0
      this.steps = this.generateSteps()
    }
    return this.getCurrentState()
  }

  getCurrentState() {
    const currentStep = this.steps[this.stepIndex] || this.steps[0]
    return {
      activeScenario: this.activeScenario,
      scenarioMeta: ER_MODEL_SCENARIOS[this.activeScenario],
      stepIndex: this.stepIndex,
      totalSteps: this.steps.length,
      stepData: currentStep,
      isFirst: this.stepIndex === 0,
      isLast: this.stepIndex === this.steps.length - 1
    }
  }

  nextStep() {
    if (this.stepIndex < this.steps.length - 1) {
      this.stepIndex++
    }
    return this.getCurrentState()
  }

  prevStep() {
    if (this.stepIndex > 0) {
      this.stepIndex--
    }
    return this.getCurrentState()
  }

  reset() {
    this.stepIndex = 0
    return this.getCurrentState()
  }

  generateSteps() {
    switch (this.activeScenario) {
      case 'student-course-mn':
        return [
          {
            stepNumber: 1,
            title: 'ER Blueprint: Student (M) < Enrolls_In > (N) Course',
            description: 'Student has Key (Roll_No), Composite (Name -> First, Last), Multivalued ((Phone)), Derived (Age). Course has Course_ID, Title, Credits.',
            entities: [
              { name: 'STUDENT [Strong]', type: 'Strong', key: 'Roll_No', attrs: ['First_Name', 'Last_Name', '((Phone_No))', '(Age from DOB)'] },
              { name: 'COURSE [Strong]', type: 'Strong', key: 'Course_ID', attrs: ['Title', 'Credits'] }
            ],
            relationship: { name: 'Enrolls_In', cardinality: 'M:N', participation: 'Student: Total (==) | Course: Partial (--)' },
            relationalTablesCount: 4,
            tablesGenerated: [
              { tableName: 'student', columns: 'roll_no (PK), first_name, last_name, dob' },
              { tableName: 'student_phone', columns: '(roll_no, phone_no) [Composite PK], FK -> student(roll_no)' },
              { tableName: 'course', columns: 'course_id (PK), title, credits' },
              { tableName: 'enrolls_in', columns: '(roll_no, course_id) [Composite PK], grade, enroll_date' }
            ],
            sqlDDL: `CREATE TABLE student (
  roll_no INT PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  dob DATE NOT NULL
);

CREATE TABLE student_phone (
  roll_no INT REFERENCES student(roll_no) ON DELETE CASCADE,
  phone_no VARCHAR(20) NOT NULL,
  PRIMARY KEY (roll_no, phone_no)
);

CREATE TABLE course (
  course_id VARCHAR(10) PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  credits INT
);

CREATE TABLE enrolls_in (
  roll_no INT REFERENCES student(roll_no) ON DELETE CASCADE,
  course_id VARCHAR(10) REFERENCES course(course_id) ON DELETE CASCADE,
  enroll_date DATE DEFAULT CURRENT_DATE,
  grade CHAR(2),
  PRIMARY KEY (roll_no, course_id)
);`
          },
          {
            stepNumber: 2,
            title: 'Why M:N Requires a Junction Cross Table',
            description: 'If you placed course_id inside student, you would need comma-separated values (violating 1NF atomicity). The junction table enrolls_in cleanly decouples the many-to-many relationship.',
            keyRule: 'Rule: Binary M:N relationship always creates 1 dedicated junction table with foreign keys of both entities forming a composite primary key.'
          }
        ]

      case 'employee-dependent-weak':
        return [
          {
            stepNumber: 1,
            title: 'Weak Entity Mapping: Employee (1) << Has >> (M) Dependent',
            description: 'Dependent has only a partial discriminator (Dep_Name). It relies on Employee(Emp_ID) for identity. Participation is Total (Double Rectangle & Double Line).',
            entities: [
              { name: 'EMPLOYEE [Strong]', type: 'Strong', key: 'Emp_ID', attrs: ['Name', 'Salary'] },
              { name: 'DEPENDENT [Weak]', type: 'Weak', key: '- - Dep_Name - - (Partial)', attrs: ['Relationship_Type', 'BirthDate'] }
            ],
            relationship: { name: 'Has_Dependents', cardinality: '1:M (Identifying)', participation: 'Total (==)' },
            relationalTablesCount: 2,
            tablesGenerated: [
              { tableName: 'employee', columns: 'emp_id (PK), name, salary' },
              { tableName: 'dependent', columns: '(emp_id, dep_name) [Composite PK], emp_id (FK), relationship_type, birth_date' }
            ],
            sqlDDL: `CREATE TABLE employee (
  emp_id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  salary DECIMAL(10,2) NOT NULL
);

CREATE TABLE dependent (
  emp_id INT REFERENCES employee(emp_id) ON DELETE CASCADE,
  dep_name VARCHAR(50) NOT NULL,
  relationship_type VARCHAR(20) NOT NULL,
  birth_date DATE,
  PRIMARY KEY (emp_id, dep_name)
);`
          }
        ]

      case 'department-doctor-1n':
        return [
          {
            stepNumber: 1,
            title: 'One-to-Many (1:N): Department (1) < Employs > (N) Doctor',
            description: 'One Department employs many Doctors. Each Doctor belongs to at most one Department. No extra junction table is needed!',
            entities: [
              { name: 'DEPARTMENT [Strong]', type: 'Strong', key: 'Dept_ID', attrs: ['Dept_Name', 'Location'] },
              { name: 'DOCTOR [Strong]', type: 'Strong', key: 'Doctor_ID', attrs: ['Name', 'Specialization'] }
            ],
            relationship: { name: 'Employs', cardinality: '1:N', participation: 'Doctor: Total (==)' },
            relationalTablesCount: 2,
            tablesGenerated: [
              { tableName: 'department', columns: 'dept_id (PK), dept_name, location' },
              { tableName: 'doctor', columns: 'doctor_id (PK), name, specialization, dept_id (FK -> department)' }
            ],
            sqlDDL: `CREATE TABLE department (
  dept_id INT PRIMARY KEY,
  dept_name VARCHAR(50) NOT NULL,
  location VARCHAR(50)
);

CREATE TABLE doctor (
  doctor_id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  specialization VARCHAR(50),
  dept_id INT NOT NULL REFERENCES department(dept_id)
);`
          }
        ]

      case 'person-passport-11':
        return [
          {
            stepNumber: 1,
            title: 'One-to-One (1:1): Person (1) < Has > (1) Passport',
            description: 'Each Person has at most 1 Passport. The foreign key is placed on the side with Total Participation to eliminate NULL values.',
            entities: [
              { name: 'PERSON [Strong]', type: 'Strong', key: 'Person_ID', attrs: ['Name', 'Nationality'] },
              { name: 'PASSPORT [Strong]', type: 'Strong', key: 'Passport_No', attrs: ['Issue_Date', 'Expiry_Date'] }
            ],
            relationship: { name: 'Has_Passport', cardinality: '1:1', participation: 'Passport: Total (==) | Person: Partial (--)' },
            relationalTablesCount: 2,
            tablesGenerated: [
              { tableName: 'person', columns: 'person_id (PK), name, nationality' },
              { tableName: 'passport', columns: 'passport_no (PK), issue_date, expiry_date, person_id (FK UNIQUE -> person)' }
            ],
            sqlDDL: `CREATE TABLE person (
  person_id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  nationality VARCHAR(50)
);

CREATE TABLE passport (
  passport_no VARCHAR(20) PRIMARY KEY,
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  person_id INT UNIQUE NOT NULL REFERENCES person(person_id)
);`
          }
        ]

      case 'employee-supervisor-unary':
        return [
          {
            stepNumber: 1,
            title: 'Unary / Recursive: Employee (Supervisor) < Manages > Employee (Subordinate)',
            description: 'Self-referencing relationship inside the same entity set. Implemented via a self-referencing Foreign Key.',
            entities: [
              { name: 'EMPLOYEE [Strong]', type: 'Strong', key: 'Emp_ID', attrs: ['Name', 'Role', 'Supervisor_ID (Self-FK)'] }
            ],
            relationship: { name: 'Manages', cardinality: '1:N (Recursive Unary)', participation: 'Supervisor: Partial' },
            relationalTablesCount: 1,
            tablesGenerated: [
              { tableName: 'employee', columns: 'emp_id (PK), name, role, supervisor_id (FK -> employee.emp_id)' }
            ],
            sqlDDL: `CREATE TABLE employee (
  emp_id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50),
  supervisor_id INT REFERENCES employee(emp_id)
);`
          }
        ]

      default:
        return []
    }
  }
}
