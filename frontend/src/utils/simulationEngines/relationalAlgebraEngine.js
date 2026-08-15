// Relational Algebra & Calculus Simulation Engine

export const INITIAL_EMPLOYEES = [
  { emp_id: 101, name: 'Alice', dept_id: 'D01', salary: 75000 },
  { emp_id: 102, name: 'Bob', dept_id: 'D02', salary: 62000 },
  { emp_id: 103, name: 'Charlie', dept_id: 'D01', salary: 89000 },
  { emp_id: 104, name: 'Diana', dept_id: 'D03', salary: 54000 },
  { emp_id: 105, name: 'Evan', dept_id: null, salary: 68000 }
]

export const INITIAL_DEPARTMENTS = [
  { dept_id: 'D01', dept_name: 'Engineering', location: 'Floor 4' },
  { dept_id: 'D02', dept_name: 'Product', location: 'Floor 3' },
  { dept_id: 'D04', dept_name: 'Marketing', location: 'Floor 2' }
]

export class RelationalAlgebraEngine {
  constructor() {
    this.employees = [...INITIAL_EMPLOYEES]
    this.departments = [...INITIAL_DEPARTMENTS]
    this.currentOperation = 'selection' // selection, projection, cartesian, inner-join, left-join, right-join, full-join, division
    this.stepIndex = 0
    this.steps = this.generateSteps(this.currentOperation)
  }

  setOperation(op) {
    this.currentOperation = op
    this.stepIndex = 0
    this.steps = this.generateSteps(op)
  }

  generateSteps(op) {
    const steps = []

    switch (op) {
      case 'selection': {
        // Selection: σ_salary > 65000(Employees)
        steps.push({
          stepNumber: 1,
          operationName: 'Selection (σ_salary > 65000)',
          formula: 'σ_{salary > 65000}(Employees)',
          sqlEquivalent: 'SELECT * FROM Employees WHERE salary > 65000;',
          trcFormula: '{ t | t ∈ Employees ∧ t[salary] > 65000 }',
          activeLeftRow: null,
          activeRightRow: null,
          resultRows: [],
          description: 'Evaluating predicate (salary > 65000) for each tuple in Employees relation.'
        })

        let currentResults = []
        this.employees.forEach((emp, idx) => {
          const match = emp.salary > 65000
          if (match) currentResults.push({ ...emp })
          steps.push({
            stepNumber: steps.length + 1,
            operationName: 'Selection (σ)',
            formula: 'σ_{salary > 65000}(Employees)',
            sqlEquivalent: 'SELECT * FROM Employees WHERE salary > 65000;',
            trcFormula: '{ t | t ∈ Employees ∧ t[salary] > 65000 }',
            activeLeftRow: idx,
            activeRightRow: null,
            resultRows: [...currentResults],
            description: `Row ${emp.emp_id} (${emp.name}): Salary $${emp.salary} ${match ? '> $65000 (PASSED - Tuple included)' : '≤ $65000 (FAILED - Filtered out)'}`
          })
        })
        break
      }

      case 'projection': {
        // Projection: π_name, salary(Employees)
        steps.push({
          stepNumber: 1,
          operationName: 'Projection (π_name, salary)',
          formula: 'π_{name, salary}(Employees)',
          sqlEquivalent: 'SELECT DISTINCT name, salary FROM Employees;',
          trcFormula: '{ t | ∃e ∈ Employees (t[name] = e[name] ∧ t[salary] = e[salary]) }',
          activeLeftRow: null,
          activeRightRow: null,
          resultRows: [],
          description: 'Extracting attributes {name, salary} and eliminating non-projected columns (emp_id, dept_id).'
        })

        let currentResults = []
        this.employees.forEach((emp, idx) => {
          currentResults.push({ name: emp.name, salary: emp.salary })
          steps.push({
            stepNumber: steps.length + 1,
            operationName: 'Projection (π)',
            formula: 'π_{name, salary}(Employees)',
            sqlEquivalent: 'SELECT DISTINCT name, salary FROM Employees;',
            trcFormula: '{ t | ∃e ∈ Employees (t[name] = e[name] ∧ t[salary] = e[salary]) }',
            activeLeftRow: idx,
            activeRightRow: null,
            resultRows: [...currentResults],
            description: `Projecting row ${idx + 1}: Emits <${emp.name}, $${emp.salary}>.`
          })
        })
        break
      }

      case 'inner-join': {
        // Natural/Inner Equi-Join: Employees ⋈_dept_id Departments
        steps.push({
          stepNumber: 1,
          operationName: 'Inner Equi-Join (⋈)',
          formula: 'Employees ⋈_{Employees.dept_id = Departments.dept_id} Departments',
          sqlEquivalent: 'SELECT * FROM Employees e INNER JOIN Departments d ON e.dept_id = d.dept_id;',
          trcFormula: '{ t | ∃e ∈ Employees, ∃d ∈ Departments (e[dept_id] = d[dept_id] ∧ t = e ∘ d) }',
          activeLeftRow: null,
          activeRightRow: null,
          resultRows: [],
          description: 'Testing equi-join condition on common foreign key dept_id across both relations.'
        })

        let currentResults = []
        this.employees.forEach((emp, eIdx) => {
          this.departments.forEach((dept, dIdx) => {
            const match = emp.dept_id && dept.dept_id && emp.dept_id === dept.dept_id
            if (match) {
              currentResults.push({
                emp_id: emp.emp_id,
                name: emp.name,
                dept_id: emp.dept_id,
                dept_name: dept.dept_name,
                location: dept.location
              })
            }
            steps.push({
              stepNumber: steps.length + 1,
              operationName: 'Inner Equi-Join (⋈)',
              formula: 'Employees ⋈_{dept_id} Departments',
              sqlEquivalent: 'SELECT * FROM Employees INNER JOIN Departments ON ...',
              trcFormula: '{ t | ∃e, ∃d (e[dept_id] = d[dept_id]) }',
              activeLeftRow: eIdx,
              activeRightRow: dIdx,
              resultRows: [...currentResults],
              description: `Comparing [${emp.name} (dept_id: ${emp.dept_id || 'NULL'})] with [${dept.dept_name} (dept_id: ${dept.dept_id})]: ${match ? 'MATCH! Joined tuple created.' : 'NO MATCH.'}`
            })
          })
        })
        break
      }

      case 'left-join': {
        // Left Outer Join (⟕)
        steps.push({
          stepNumber: 1,
          operationName: 'Left Outer Join (⟕)',
          formula: 'Employees ⟕_{dept_id} Departments',
          sqlEquivalent: 'SELECT * FROM Employees e LEFT JOIN Departments d ON e.dept_id = d.dept_id;',
          trcFormula: 'Preserves all left tuples; pads unmatched right attributes with NULL.',
          activeLeftRow: null,
          activeRightRow: null,
          resultRows: [],
          description: 'Preserves all employee records from left table, padding NULL for unmatched departments.'
        })

        let currentResults = []
        this.employees.forEach((emp, eIdx) => {
          const matchedDepts = this.departments.filter(d => emp.dept_id && d.dept_id === emp.dept_id)
          if (matchedDepts.length > 0) {
            matchedDepts.forEach(dept => {
              currentResults.push({
                emp_id: emp.emp_id,
                name: emp.name,
                dept_id: emp.dept_id,
                dept_name: dept.dept_name,
                location: dept.location
              })
            })
          } else {
            currentResults.push({
              emp_id: emp.emp_id,
              name: emp.name,
              dept_id: emp.dept_id || 'NULL',
              dept_name: 'NULL',
              location: 'NULL'
            })
          }
          steps.push({
            stepNumber: steps.length + 1,
            operationName: 'Left Outer Join (⟕)',
            formula: 'Employees ⟕ Departments',
            sqlEquivalent: 'SELECT * FROM Employees LEFT JOIN Departments ...',
            trcFormula: 'Preserves unmatched left tuples.',
            activeLeftRow: eIdx,
            activeRightRow: null,
            resultRows: [...currentResults],
            description: `Employee ${emp.name} (${emp.dept_id || 'No Dept'}): ${matchedDepts.length > 0 ? 'Matched department found.' : 'Unmatched left tuple preserved with NULL department.'}`
          })
        })
        break
      }

      default: {
        steps.push({
          stepNumber: 1,
          operationName: 'Cartesian Product (×)',
          formula: 'Employees × Departments',
          sqlEquivalent: 'SELECT * FROM Employees CROSS JOIN Departments;',
          trcFormula: '{ t | ∃e ∈ Employees, ∃d ∈ Departments (t = e ∘ d) }',
          activeLeftRow: null,
          activeRightRow: null,
          resultRows: [],
          description: 'Generates cross product grid (M × N tuples).'
        })
      }
    }

    return steps
  }

  getCurrentState() {
    return {
      operation: this.currentOperation,
      stepIndex: this.stepIndex,
      totalSteps: this.steps.length,
      stepData: this.steps[this.stepIndex] || this.steps[0],
      employees: this.employees,
      departments: this.departments
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
}
