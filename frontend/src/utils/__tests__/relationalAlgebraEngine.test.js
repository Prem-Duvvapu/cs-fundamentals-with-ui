import { describe, it, expect, beforeEach } from 'vitest'
import { RelationalAlgebraEngine } from '../simulationEngines/relationalAlgebraEngine'

describe('RelationalAlgebraEngine', () => {
  let engine

  beforeEach(() => {
    engine = new RelationalAlgebraEngine()
  })

  it('should initialize with selection operation steps', () => {
    const state = engine.getCurrentState()
    expect(state.operation).toBe('selection')
    expect(state.stepIndex).toBe(0)
    expect(state.totalSteps).toBeGreaterThan(1)
    expect(state.employees.length).toBe(5)
    expect(state.departments.length).toBe(3)
  })

  it('should correctly filter salary > 65000 in selection operation', () => {
    engine.setOperation('selection')
    while (engine.stepIndex < engine.steps.length - 1) {
      engine.nextStep()
    }
    const finalState = engine.getCurrentState()
    expect(finalState.stepData.resultRows.length).toBe(3) // Alice (75000), Charlie (89000), Evan (68000)
    const names = finalState.stepData.resultRows.map(r => r.name)
    expect(names).toContain('Alice')
    expect(names).toContain('Charlie')
    expect(names).toContain('Evan')
    expect(names).not.toContain('Bob')
  })

  it('should correctly execute inner equi-join and left outer join', () => {
    engine.setOperation('inner-join')
    while (engine.stepIndex < engine.steps.length - 1) {
      engine.nextStep()
    }
    let state = engine.getCurrentState()
    expect(state.stepData.resultRows.length).toBe(3) // Alice (D01), Charlie (D01), Bob (D02)

    engine.setOperation('left-join')
    while (engine.stepIndex < engine.steps.length - 1) {
      engine.nextStep()
    }
    state = engine.getCurrentState()
    expect(state.stepData.resultRows.length).toBe(5) // All 5 employees preserved
    const nullDept = state.stepData.resultRows.find(r => r.name === 'Evan')
    expect(nullDept.dept_name).toBe('NULL')
  })
})
