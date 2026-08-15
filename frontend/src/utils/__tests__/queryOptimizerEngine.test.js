import { describe, it, expect, beforeEach } from 'vitest'
import { QueryOptimizerEngine } from '../simulationEngines/queryOptimizerEngine'

describe('QueryOptimizerEngine', () => {
  let engine

  beforeEach(() => {
    engine = new QueryOptimizerEngine()
  })

  it('should initialize with 4 optimization pipeline steps', () => {
    const state = engine.getCurrentState()
    expect(state.stepIndex).toBe(0)
    expect(state.totalSteps).toBe(4)
    expect(state.costs.hashJoin).toBeLessThan(state.costs.nestedLoop)
  })

  it('should transition from unoptimized tree to pushdown and physical selection', () => {
    engine.nextStep()
    let state = engine.getCurrentState()
    expect(state.stepData.stage).toBe('PREDICATE_PUSHDOWN')

    engine.nextStep()
    state = engine.getCurrentState()
    expect(state.stepData.stage).toBe('PROJECTION_PUSHDOWN')

    engine.nextStep()
    state = engine.getCurrentState()
    expect(state.stepData.stage).toBe('PHYSICAL_SELECTION')
  })
})
