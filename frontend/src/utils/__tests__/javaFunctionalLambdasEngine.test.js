import { describe, it, expect } from 'vitest'
import { JavaFunctionalLambdasEngine } from '../simulationEngines/javaFunctionalLambdasEngine'

describe('JavaFunctionalLambdasEngine', () => {
  it('should generate all 5 execution steps covering SAM, lambdas, method references, and invokedynamic', () => {
    const engine = new JavaFunctionalLambdasEngine()
    const steps = engine.getExecutionSteps()

    expect(steps).toHaveLength(5)
    expect(steps[0].stage).toBe('SAM_INTERFACE_CONTRACT')
    expect(steps[1].stage).toBe('ANONYMOUS_VS_LAMBDA')
    expect(steps[2].stage).toBe('METHOD_REFERENCES')
    expect(steps[3].stage).toBe('INVOKEDYNAMIC_BOOTSTRAP')
    expect(steps[4].stage).toBe('LAMBDA_EXECUTION')

    // Verify invokedynamic callsite
    expect(steps[3].state.invokedynamicCallSite).toBeDefined()
    expect(steps[3].state.invokedynamicCallSite.opcode).toContain('invokedynamic')

    // Verify execution output
    expect(steps[4].state.lambdaInstance.result).toBe(40)
  })
})
