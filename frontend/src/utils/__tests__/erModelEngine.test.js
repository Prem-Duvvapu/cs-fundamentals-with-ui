import { describe, it, expect, beforeEach } from 'vitest'
import { ErModelEngine, ER_MODEL_SCENARIOS } from '../simulationEngines/erModelEngine'

describe('ErModelEngine', () => {
  let engine

  beforeEach(() => {
    engine = new ErModelEngine()
  })

  it('should initialize with student-course-mn scenario and 4 tables synthesized', () => {
    const state = engine.getCurrentState()
    expect(state.activeScenario).toBe('student-course-mn')
    expect(state.stepIndex).toBe(0)
    expect(state.stepData.relationalTablesCount).toBe(4)
    expect(state.stepData.sqlDDL).toContain('CREATE TABLE student')
    expect(state.stepData.sqlDDL).toContain('CREATE TABLE enrolls_in')
    expect(state.stepData.sqlDDL).toContain('CREATE TABLE student_phone')
  })

  it('should step through and explain why M:N requires junction cross table', () => {
    engine.nextStep()
    const state = engine.getCurrentState()
    expect(state.stepIndex).toBe(1)
    expect(state.stepData.keyRule).toContain('junction table')
  })

  it('should simulate weak entity dependent absorption of parent PK', () => {
    engine.setScenario('employee-dependent-weak')
    const state = engine.getCurrentState()
    expect(state.stepData.relationalTablesCount).toBe(2)
    expect(state.stepData.sqlDDL).toContain('PRIMARY KEY (emp_id, dep_name)')
    expect(state.stepData.entities[1].type).toBe('Weak')
  })

  it('should simulate 1:N department-doctor with 0 extra junction tables', () => {
    engine.setScenario('department-doctor-1n')
    const state = engine.getCurrentState()
    expect(state.stepData.relationalTablesCount).toBe(2)
    expect(state.stepData.sqlDDL).toContain('dept_id INT NOT NULL REFERENCES department(dept_id)')
  })

  it('should simulate 1:1 person-passport and unary recursive employee-supervisor', () => {
    engine.setScenario('person-passport-11')
    expect(engine.getCurrentState().stepData.sqlDDL).toContain('person_id INT UNIQUE NOT NULL REFERENCES person(person_id)')

    engine.setScenario('employee-supervisor-unary')
    expect(engine.getCurrentState().stepData.relationalTablesCount).toBe(1)
    expect(engine.getCurrentState().stepData.sqlDDL).toContain('supervisor_id INT REFERENCES employee(emp_id)')
  })
})
