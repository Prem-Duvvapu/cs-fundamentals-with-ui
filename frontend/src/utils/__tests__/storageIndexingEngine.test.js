import { describe, it, expect, beforeEach } from 'vitest'
import { StorageIndexingEngine } from '../simulationEngines/storageIndexingEngine'

describe('StorageIndexingEngine', () => {
  let engine

  beforeEach(() => {
    engine = new StorageIndexingEngine()
  })

  it('should initialize with RAID 5 mode', () => {
    const state = engine.getCurrentState()
    expect(state.mode).toBe('raid')
    expect(state.stepIndex).toBe(0)
    expect(state.totalSteps).toBe(3)
  })

  it('should simulate disk failure and parity reconstruction in RAID 5', () => {
    engine.nextStep()
    let state = engine.getCurrentState()
    expect(state.stepData.failedDisk).toBe('Disk 2')

    engine.nextStep()
    state = engine.getCurrentState()
    expect(state.stepData.disk2.status).toBe('RECONSTRUCTED')
    expect(state.stepData.disk2.data[0]).toContain('Block A2')
  })

  it('should generate steps for bitmap index and inverted index', () => {
    engine.setMode('bitmap-index')
    expect(engine.steps.length).toBe(2)

    engine.setMode('inverted-index')
    expect(engine.steps.length).toBe(2)
  })
})
