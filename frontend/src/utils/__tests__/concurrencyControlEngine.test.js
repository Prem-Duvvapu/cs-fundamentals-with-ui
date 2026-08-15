import { describe, it, expect, beforeEach } from 'vitest'
import { ConcurrencyControlEngine } from '../simulationEngines/concurrencyControlEngine'

describe('ConcurrencyControlEngine', () => {
  let engine

  beforeEach(() => {
    engine = new ConcurrencyControlEngine()
  })

  it('should initialize with Strict 2PL protocol', () => {
    const state = engine.getCurrentState()
    expect(state.protocol).toBe('strict-2pl')
    expect(state.stepIndex).toBe(0)
    expect(state.totalSteps).toBe(5)
  })

  it('should detect deadlock cycles in wait-for-graph mode', () => {
    engine.setProtocol('wait-for-graph')
    while (engine.stepIndex < engine.steps.length - 1) {
      engine.nextStep()
    }
    const finalState = engine.getCurrentState()
    expect(finalState.stepData.hasCycle).toBe(true)
    expect(finalState.stepData.edges.length).toBe(2)
  })

  it('should update timestamp ordering values correctly', () => {
    engine.setProtocol('timestamp-ordering')
    engine.nextStep()
    const state = engine.getCurrentState()
    expect(state.stepData.rTs).toBe(100)
  })
})
