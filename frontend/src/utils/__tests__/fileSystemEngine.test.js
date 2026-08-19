import { describe, it, expect, beforeEach } from 'vitest'
import { FileSystemEngine } from '../simulationEngines/fileSystemEngine'

describe('FileSystemEngine', () => {
  let engine

  beforeEach(() => {
    engine = new FileSystemEngine()
  })

  it('should allocate 1 direct block for 4 KB file without metadata overhead', () => {
    engine.setFileSize(4 * 1024)
    const state = engine.getCurrentState()
    expect(state.stepData.directUsed).toBe(1)
    expect(state.stepData.singleIndexUsed).toBe(0)
    expect(state.stepData.totalPhysicalBlocksTouched).toBe(1)
  })

  it('should use single-indirect index block when file size exceeds 48 KB', () => {
    engine.setFileSize(600 * 1024)
    const state = engine.getCurrentState()
    expect(state.stepData.directUsed).toBe(12)
    expect(state.stepData.singleDataUsed).toBeGreaterThan(0)
    expect(state.stepData.singleIndexUsed).toBe(1)
  })

  it('should calculate double-indirect allocation for 10 MB files', () => {
    engine.setFileSize(10 * 1024 * 1024)
    const state = engine.getCurrentState()
    expect(state.stepData.directUsed).toBe(12)
    expect(state.stepData.doubleIndexUsed).toBeGreaterThan(0)
  })
})
