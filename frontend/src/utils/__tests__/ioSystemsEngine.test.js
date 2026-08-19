import { describe, it, expect, beforeEach } from 'vitest'
import { IoSystemsEngine } from '../simulationEngines/ioSystemsEngine'

describe('IoSystemsEngine', () => {
  let engine

  beforeEach(() => {
    engine = new IoSystemsEngine()
  })

  it('should initialize with Programmed I/O showing 100% busy wait', () => {
    const state = engine.getCurrentState()
    expect(state.activeScenario).toBe('io-modes')
    expect(state.stepData.cpuBusyWait).toBe('100%')
  })

  it('should show DMA reducing CPU busy-wait to 2%', () => {
    engine.nextStep() // Interrupt-driven
    engine.nextStep() // DMA
    const state = engine.getCurrentState()
    expect(state.stepData.cpuBusyWait).toBe('2%')
    expect(state.stepData.dmaTransfers).toBe(1)
  })

  it('should compare select() O(N) vs epoll O(1) scanning', () => {
    engine.setScenario('epoll-vs-select')
    const selectState = engine.getCurrentState()
    expect(selectState.stepData.scansPerformed).toBe(1000)

    engine.nextStep()
    const epollState = engine.getCurrentState()
    expect(epollState.stepData.scansPerformed).toBe(3)
  })
})
