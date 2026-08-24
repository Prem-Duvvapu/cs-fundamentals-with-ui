import { describe, it, expect, beforeEach } from 'vitest'
import { TransactionAcidEngine } from '../simulationEngines/transactionAcidEngine'

describe('TransactionAcidEngine', () => {
  let engine

  beforeEach(() => {
    engine = new TransactionAcidEngine()
  })

  it('should initialize with the ACID state machine scenario', () => {
    const state = engine.getCurrentState()
    expect(state.scenario).toBe('state-machine')
    expect(state.stepIndex).toBe(0)
    expect(state.totalSteps).toBe(5)
  })

  it('should reach COMMITTED through the full state path on transfer scenario', () => {
    while (engine.stepIndex < engine.steps.length - 1) {
      engine.nextStep()
    }
    const finalState = engine.getCurrentState()
    expect(finalState.stepData.currentState).toBe('COMMITTED')
    expect(finalState.stepData.statePath).toEqual(['ACTIVE', 'PARTIALLY_COMMITTED', 'COMMITTED'])
    expect(finalState.stepData.accountA).toBe(500)
    expect(finalState.stepData.accountB).toBe(1000)
  })

  it('should drive failure scenario to ABORTED after FAILED rollback', () => {
    engine.setScenario('failure-abort')
    while (engine.stepIndex < engine.steps.length - 1) {
      engine.nextStep()
    }
    const finalState = engine.getCurrentState()
    expect(finalState.stepData.statePath).toEqual(['ACTIVE', 'FAILED', 'ABORTED'])
  })

  it('should enforce WAL rule: commit record flushed before dirty page reaches disk', () => {
    engine.setScenario('wal-logging')
    engine.nextStep()
    engine.nextStep()
    const midState = engine.getCurrentState()
    const commitRecord = midState.stepData.logRecords.find(lr => lr.record.includes('commit'))
    expect(commitRecord.flushed).toBe(true)
    expect(midState.stepData.dirtyPageOnDisk).toBe(false)

    while (engine.stepIndex < engine.steps.length - 1) {
      engine.nextStep()
    }
    expect(engine.getCurrentState().stepData.dirtyPageOnDisk).toBe(true)
  })

  it('should complete ARIES recovery in UNDO phase with CLR compensation for loser T2', () => {
    engine.setScenario('aries-recovery')
    while (engine.stepIndex < engine.steps.length - 1) {
      engine.nextStep()
    }
    const finalState = engine.getCurrentState()
    expect(finalState.stepData.phase).toBe('UNDO')
    expect(finalState.stepData.undoQueue.some(entry => entry.includes('CLR'))).toBe(true)
    expect(finalState.stepData.t1Status.toLowerCase()).toContain('committed')
  })
})
