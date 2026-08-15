import { describe, it, expect } from 'vitest'
import { JavaStaticFinalRecordsEngine } from '../simulationEngines/javaStaticFinalRecordsEngine'

describe('JavaStaticFinalRecordsEngine', () => {
  it('should generate all 5 sequential steps covering static, final, immutability, and records', () => {
    const engine = new JavaStaticFinalRecordsEngine()
    const steps = engine.getExecutionSteps()

    expect(steps).toHaveLength(5)
    expect(steps[0].stage).toBe('METASPACE_STATIC')
    expect(steps[1].stage).toBe('FINAL_MODIFIER')
    expect(steps[2].stage).toBe('IMMUTABLE_CLASS_PATTERN')
    expect(steps[3].stage).toBe('JAVA_RECORDS')
    expect(steps[4].stage).toBe('RECORD_VALUE_EQUALITY')

    // Verify state mutation and record presence
    expect(steps[3].state.recordInstance).toBeDefined()
    expect(steps[3].state.recordInstance.components.email).toContain('alice@csfundamentals.com')
  })
})
