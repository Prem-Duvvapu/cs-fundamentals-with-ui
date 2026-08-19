import { describe, it, expect, beforeEach } from 'vitest'
import { DesignPatternsEngine } from '../simulationEngines/designPatternsEngine'

describe('DesignPatternsEngine', () => {
  let engine

  beforeEach(() => {
    engine = new DesignPatternsEngine()
  })

  it('should demonstrate Singleton multithreaded race condition and solution steps', () => {
    let state = engine.getCurrentState()
    expect(state.activeScenario).toBe('singleton-race')
    expect(state.stepData.thread1State).toContain('instance == null')

    engine.nextStep()
    state = engine.getCurrentState()
    expect(state.stepData.instancesCreated.length).toBe(2)

    engine.nextStep()
    state = engine.getCurrentState()
    expect(state.stepData.status).toContain('THREAD SAFE')
  })

  it('should step through Observer pattern event subscription and dispatch', () => {
    engine.setScenario('observer-eventbus')
    let state = engine.getCurrentState()
    expect(state.stepData.observers.length).toBe(3)

    engine.nextStep()
    engine.nextStep()
    state = engine.getCurrentState()
    expect(state.stepData.logs.some(log => log.includes('[NOTIFY]'))).toBe(true)
  })
})
