import { describe, it, expect } from 'vitest'
import { JavaStreamsOptionalEngine } from '../simulationEngines/javaStreamsOptionalEngine'

describe('JavaStreamsOptionalEngine', () => {
  it('should generate all 4 execution steps covering lazy pipeline, terminal collect, short-circuit, and optional', () => {
    const engine = new JavaStreamsOptionalEngine()
    const steps = engine.getExecutionSteps()

    expect(steps).toHaveLength(4)
    expect(steps[0].stage).toBe('STREAM_PIPELINE_CREATION')
    expect(steps[1].stage).toBe('TERMINAL_COLLECT_TRIGGER')
    expect(steps[2].stage).toBe('SHORT_CIRCUIT_OPERATION')
    expect(steps[3].stage).toBe('OPTIONAL_NULL_SAFETY')

    // Verify terminal collect output
    expect(steps[1].state.terminalResult).toEqual([24, 40, 30])
  })
})
