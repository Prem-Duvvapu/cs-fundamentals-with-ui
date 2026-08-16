import { describe, it, expect, beforeEach } from 'vitest'
import { DbmsIntroEngine, DBMS_INTRO_SCENARIOS } from '../simulationEngines/dbmsIntroEngine'

describe('DbmsIntroEngine', () => {
  let engine

  beforeEach(() => {
    engine = new DbmsIntroEngine()
  })

  it('should initialize with redundancy-anomaly scenario at step 0', () => {
    const state = engine.getCurrentState()
    expect(state.activeScenario).toBe('redundancy-anomaly')
    expect(state.stepIndex).toBe(0)
    expect(state.isFirst).toBe(true)
    expect(state.stepData.title).toContain('Initial State')
    expect(state.stepData.fileSystemState.salesFile.id).toBe(101)
  })

  it('should step forward and detect data redundancy and inconsistency anomaly', () => {
    engine.nextStep()
    const state = engine.getCurrentState()
    expect(state.stepIndex).toBe(1)
    expect(state.stepData.anomalyAlert).toContain('🚨 File System Anomaly')
    expect(state.stepData.fileSystemState.salesFile.address).toContain('UPDATED')
    expect(state.stepData.fileSystemState.shippingFile.address).toContain('STALE')
  })

  it('should switch across all 4 simulation scenarios and reset steps', () => {
    const scenarios = ['redundancy-anomaly', 'concurrency-race', 'crash-atomicity', 'query-optimization']

    scenarios.forEach((scenarioId) => {
      const state = engine.setScenario(scenarioId)
      expect(state.activeScenario).toBe(scenarioId)
      expect(state.stepIndex).toBe(0)
      expect(state.totalSteps).toBeGreaterThan(0)
      expect(state.stepData).toBeDefined()
    })
  })

  it('should simulate Lost Update in concurrency-race and ARIES rollback in crash-atomicity', () => {
    engine.setScenario('concurrency-race')
    engine.nextStep()
    expect(engine.getCurrentState().stepData.anomalyAlert).toContain('Lost Update')

    engine.setScenario('crash-atomicity')
    engine.nextStep()
    engine.nextStep()
    expect(engine.getCurrentState().stepData.dbmsState.acc101).toContain('RESTORED VIA WAL UNDO PASS')
  })

  it('should demonstrate B+ Tree index seek 62,000x speedup in query-optimization scenario', () => {
    engine.setScenario('query-optimization')
    engine.nextStep()
    const state = engine.getCurrentState()
    expect(state.stepData.dbmsMetrics.diskBlocksRead).toContain('3 Disk Pages Read')
    expect(state.stepData.fileSystemMetrics.diskBlocksRead).toContain('12,500 Disk Blocks Read')
  })
})
