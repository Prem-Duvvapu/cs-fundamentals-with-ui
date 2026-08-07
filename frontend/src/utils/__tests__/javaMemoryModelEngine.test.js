import { describe, it, expect } from 'vitest'
import { JavaMemoryModelEngine } from '../simulationEngines/javaMemoryModelEngine'

describe('JavaMemoryModelEngine', () => {
  it('simulates stack frame push/pop and heap allocation correctly', () => {
    const engine = new JavaMemoryModelEngine()
    const steps = engine.getExecutionSteps()

    expect(steps.length).toBe(6)
    expect(steps[0].stage).toBe('PRIMITIVES')
    expect(steps[1].stage).toBe('HEAP_ALLOCATION')
    expect(steps[2].stage).toBe('METHOD_CALL')
    expect(steps[3].stage).toBe('MUTATION')
    expect(steps[4].stage).toBe('FRAME_POP')
    expect(steps[5].stage).toBe('UNREACHABLE')

    // Verify Heap mutation at step 4
    expect(steps[3].state.heapObjects[0].fields.score).toBe(150)
    // Verify stack frame pop at step 5
    expect(steps[4].state.stackFrames.length).toBe(1)
    // Verify unreachable GC candidate at step 6
    expect(steps[5].state.heapObjects[0].status).toBe('UNREACHABLE (GC CANDIDATE)')
  })
})
