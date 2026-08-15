import { describe, it, expect, beforeEach } from 'vitest'
import { DistributedDbEngine } from '../simulationEngines/distributedDbEngine'

describe('DistributedDbEngine', () => {
  let engine

  beforeEach(() => {
    engine = new DistributedDbEngine()
  })

  it('should initialize with 2PC mode', () => {
    const state = engine.getCurrentState()
    expect(state.mode).toBe('2pc')
    expect(state.stepIndex).toBe(0)
    expect(state.totalSteps).toBe(3)
  })

  it('should step through 2PC from PREPARE to GLOBAL_COMMIT', () => {
    engine.nextStep()
    let state = engine.getCurrentState()
    expect(state.stepData.coordinatorState).toBe('COLLECTING_VOTES')

    engine.nextStep()
    state = engine.getCurrentState()
    expect(state.stepData.coordinatorState).toBe('COMMITTED')
    expect(state.stepData.node1State).toBe('COMMITTED')
  })

  it('should support CAP theorem and Quorum modes', () => {
    engine.setMode('cap-theorem')
    expect(engine.steps.length).toBe(4)

    engine.setMode('quorum')
    expect(engine.steps.length).toBe(1)
  })
})
