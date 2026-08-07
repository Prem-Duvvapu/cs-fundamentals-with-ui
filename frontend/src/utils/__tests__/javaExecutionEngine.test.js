import { describe, it, expect } from 'vitest'
import { JavaExecutionEngine } from '../simulationEngines/javaExecutionEngine'

describe('JavaExecutionEngine', () => {
  it('generates execution pipeline steps correctly', () => {
    const engine = new JavaExecutionEngine()
    const steps = engine.getExecutionSteps()

    expect(steps.length).toBe(5)
    expect(steps[0].stage).toBe('SOURCE')
    expect(steps[1].stage).toBe('COMPILATION')
    expect(steps[2].stage).toBe('CLASSLOADER')
    expect(steps[3].stage).toBe('VERIFIER')
    expect(steps[4].stage).toBe('EXECUTION')
    expect(steps[4].state.isJitCompiled).toBe(true)
    expect(steps[4].state.output).toBe('Hello Java!')
  })
})
