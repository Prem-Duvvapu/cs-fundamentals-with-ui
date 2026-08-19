import { describe, it, expect, beforeEach } from 'vitest'
import { DiskSchedulingEngine } from '../simulationEngines/diskSchedulingEngine'

describe('DiskSchedulingEngine', () => {
  let engine

  beforeEach(() => {
    engine = new DiskSchedulingEngine()
  })

  it('should calculate FCFS total seek distance for fixed request queue', () => {
    engine.setAlgorithm('fcfs')
    const lastStep = engine.steps[engine.steps.length - 1]
    expect(lastStep.accumulatedSeekDistance).toBe(644)
  })

  it('should assert SSTF total seek distance is less than or equal to FCFS total', () => {
    engine.setAlgorithm('fcfs')
    const fcfsTotal = engine.steps[engine.steps.length - 1].accumulatedSeekDistance

    engine.setAlgorithm('sstf')
    const sstfTotal = engine.steps[engine.steps.length - 1].accumulatedSeekDistance

    expect(sstfTotal).toBeLessThanOrEqual(fcfsTotal)
    expect(sstfTotal).toBe(236)
  })

  it('should support SCAN and C-SCAN algorithm modes', () => {
    engine.setAlgorithm('scan')
    expect(engine.steps.length).toBeGreaterThan(1)

    engine.setAlgorithm('cscan')
    expect(engine.steps.length).toBeGreaterThan(1)
  })
})
