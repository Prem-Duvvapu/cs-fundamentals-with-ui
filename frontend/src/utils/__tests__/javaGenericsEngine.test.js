import { describe, it, expect } from 'vitest'
import { JavaGenericsEngine } from '../simulationEngines/javaGenericsEngine'

describe('JavaGenericsEngine', () => {
  it('should generate all 5 execution steps covering invariance, PECS, and type erasure', () => {
    const engine = new JavaGenericsEngine()
    const steps = engine.getExecutionSteps()

    expect(steps).toHaveLength(5)
    expect(steps[0].stage).toBe('GENERICS_INVARIANCE')
    expect(steps[1].stage).toBe('UPPER_BOUND_EXTENDS')
    expect(steps[2].stage).toBe('LOWER_BOUND_SUPER')
    expect(steps[3].stage).toBe('PECS_RULE_IN_ACTION')
    expect(steps[4].stage).toBe('TYPE_ERASURE_BRIDGE_METHODS')

    // Verify PECS permissions
    expect(steps[1].state.producerList.canRead).toBe(true)
    expect(steps[1].state.producerList.canWrite).toBe(false)
    expect(steps[2].state.consumerList.canWrite).toBe(true)

    // Verify type erasure bridge method
    expect(steps[4].state.typeErasureArtifact.bridgeMethod).toContain('bridge method')
  })
})
