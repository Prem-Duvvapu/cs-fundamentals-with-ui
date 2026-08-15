// Database Normalization & Decomposition Simulation Engine

export const NORMALIZATION_SCENARIOS = {
  '1nf-violation': {
    name: '1NF Violation (Non-Atomic Values)',
    relation: 'StudentCourses(StudentID, StudentName, CoursesEnrolled)',
    sampleData: [
      { id: 1, name: 'Alice', courses: 'CS101, CS102, MATH201' },
      { id: 2, name: 'Bob', courses: 'EE201, PHYS101' }
    ],
    highestNormalForm: 'UNNORMALIZED',
    violationReason: 'CoursesEnrolled attribute contains multi-valued comma-separated lists violating attribute atomicity.',
    fixDescription: 'Decompose or flatten so each tuple holds strictly one atomic course per row.'
  },
  '2nf-violation': {
    name: '2NF Violation (Partial Dependency)',
    relation: 'OrderItems(OrderID, ItemID, OrderDate, Quantity, ItemPrice)',
    candidateKey: '{OrderID, ItemID}',
    fds: [
      'OrderID, ItemID → Quantity',
      'OrderID → OrderDate (Partial Dependency!)',
      'ItemID → ItemPrice (Partial Dependency!)'
    ],
    highestNormalForm: '1NF',
    violationReason: 'Non-prime attributes OrderDate and ItemPrice depend on proper subsets of candidate key {OrderID, ItemID}.',
    fixDescription: 'Decompose into Orders(OrderID, OrderDate), Items(ItemID, ItemPrice), and OrderDetails(OrderID, ItemID, Quantity).'
  },
  '3nf-violation': {
    name: '3NF Violation (Transitive Dependency)',
    relation: 'Employees(EmpID, Name, DeptID, DeptName, DeptLocation)',
    candidateKey: '{EmpID}',
    fds: [
      'EmpID → Name, DeptID',
      'DeptID → DeptName, DeptLocation (Transitive Dependency!)'
    ],
    highestNormalForm: '2NF',
    violationReason: 'DeptID determines DeptName and DeptLocation, but DeptID is neither a Super Key nor are they Prime Attributes.',
    fixDescription: 'Decompose into Employees(EmpID, Name, DeptID) and Departments(DeptID, DeptName, DeptLocation).'
  },
  'bcnf-violation': {
    name: 'BCNF Violation (Non-SuperKey LHS)',
    relation: 'StudentAdvisor(StudentID, CourseID, AdvisorID)',
    candidateKey: '{StudentID, CourseID}',
    fds: [
      'StudentID, CourseID → AdvisorID',
      'AdvisorID → CourseID (AdvisorID is not a Super Key!)'
    ],
    highestNormalForm: '3NF',
    violationReason: 'In AdvisorID → CourseID, CourseID is a Prime Attribute (so 3NF passes), but AdvisorID is NOT a Super Key.',
    fixDescription: 'Decompose into AdvisorAssignment(AdvisorID, CourseID) and StudentAdvisor(StudentID, AdvisorID).'
  }
}

export class NormalizationEngine {
  constructor() {
    this.scenarioKey = '3nf-violation'
    this.stepIndex = 0
    this.steps = this.generateSteps()
  }

  setScenario(key) {
    this.scenarioKey = key
    this.stepIndex = 0
    this.steps = this.generateSteps()
  }

  generateSteps() {
    const sc = NORMALIZATION_SCENARIOS[this.scenarioKey]
    const steps = []

    steps.push({
      stepNumber: 1,
      title: 'Analyze Initial Relation Schema',
      relation: sc.relation,
      currentNormalForm: sc.highestNormalForm,
      stage: 'ANALYSIS',
      description: `Evaluating schema ${sc.relation} against functional dependencies and candidate keys.`
    })

    steps.push({
      stepNumber: 2,
      title: 'Detect Anomalies & Normal Form Violations',
      relation: sc.relation,
      currentNormalForm: sc.highestNormalForm,
      stage: 'VIOLATION_DETECTED',
      violationReason: sc.violationReason,
      description: sc.violationReason
    })

    steps.push({
      stepNumber: 3,
      title: 'Decompose Relation to Higher Normal Form',
      relation: sc.relation,
      currentNormalForm: 'BCNF',
      stage: 'DECOMPOSED',
      fixDescription: sc.fixDescription,
      description: `Applied lossless decomposition: ${sc.fixDescription}`
    })

    return steps
  }

  getCurrentState() {
    const sc = NORMALIZATION_SCENARIOS[this.scenarioKey]
    return {
      scenarioKey: this.scenarioKey,
      scenario: sc,
      stepIndex: this.stepIndex,
      totalSteps: this.steps.length,
      stepData: this.steps[this.stepIndex] || this.steps[0]
    }
  }

  nextStep() {
    if (this.stepIndex < this.steps.length - 1) this.stepIndex++
    return this.getCurrentState()
  }

  prevStep() {
    if (this.stepIndex > 0) this.stepIndex--
    return this.getCurrentState()
  }

  reset() {
    this.stepIndex = 0
    return this.getCurrentState()
  }
}
