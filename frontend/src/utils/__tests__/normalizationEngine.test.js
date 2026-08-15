import { describe, it, expect, beforeEach } from 'vitest'
import { NormalizationEngine, NORMALIZATION_SCENARIOS } from '../simulationEngines/normalizationEngine'

describe('NormalizationEngine', () => {
  let engine

  beforeEach(() => {
    engine = new NormalizationEngine()
  })

  it('should initialize with default 3nf-violation scenario', () => {
    const state = engine.getCurrentState()
    expect(state.scenarioKey).toBe('3nf-violation')
    expect(state.stepIndex).toBe(0)
    expect(state.totalSteps).toBe(3)
  })

  it('should transition across steps and reach DECOMPOSED stage', () => {
    engine.setScenario('2nf-violation')
    engine.nextStep()
    let state = engine.getCurrentState()
    expect(state.stepData.stage).toBe('VIOLATION_DETECTED')

    engine.nextStep()
    state = engine.getCurrentState()
    expect(state.stepData.stage).toBe('DECOMPOSED')
    expect(state.stepData.currentNormalForm).toBe('BCNF')
  })

  it('should correctly switch across all 4 anomaly scenarios', () => {
    const scenarios = Object.keys(NORMALIZATION_SCENARIOS)
    scenarios.forEach(key => {
      engine.setScenario(key)
      const state = engine.getCurrentState()
      expect(state.scenario.name).toBeDefined()
      expect(state.stepData.description).toBeDefined()
    })
  })
})
