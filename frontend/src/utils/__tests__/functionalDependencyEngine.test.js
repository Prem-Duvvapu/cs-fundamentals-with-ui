import { describe, it, expect, beforeEach } from 'vitest'
import { FunctionalDependencyEngine } from '../simulationEngines/functionalDependencyEngine'

describe('FunctionalDependencyEngine', () => {
  let engine

  beforeEach(() => {
    engine = new FunctionalDependencyEngine()
  })

  it('should calculate attribute closure correctly for single attribute A', () => {
    // F = { A -> BC, CD -> E, B -> D, E -> A }
    const closureA = engine.computeAttributeClosure(['A'])
    expect(closureA).toEqual(['A', 'B', 'C', 'D', 'E'])
  })

  it('should calculate attribute closure for non-key attributes correctly', () => {
    const closureC = engine.computeAttributeClosure(['C'])
    expect(closureC).toEqual(['C'])

    const closureB = engine.computeAttributeClosure(['B'])
    expect(closureB).toEqual(['B', 'D'])
  })

  it('should generate steps for closure mode and candidate key mode', () => {
    engine.setMode('closure')
    engine.setTargetAttribute('A')
    expect(engine.steps.length).toBeGreaterThan(1)

    engine.setMode('candidate-keys')
    expect(engine.steps.length).toBeGreaterThan(1)
    const state = engine.getCurrentState()
    expect(state.mode).toBe('candidate-keys')
  })
})
