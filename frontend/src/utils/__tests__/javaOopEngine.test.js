import { describe, it, expect } from 'vitest'
import { JavaOopEngine } from '../simulationEngines/javaOopEngine'

describe('JavaOopEngine', () => {
  it('simulates OOP hierarchy and JVM vtable dynamic method dispatch', () => {
    const engine = new JavaOopEngine()
    const steps = engine.getExecutionSteps()

    expect(steps.length).toBe(6)
    expect(steps[0].stage).toBe('INHERITANCE')
    expect(steps[1].stage).toBe('ENCAPSULATION')
    expect(steps[2].stage).toBe('OVERLOADING')
    expect(steps[3].stage).toBe('POLYMORPHISM_INSTANTIATION')
    expect(steps[4].stage).toBe('VTABLE_DISPATCH')
    expect(steps[5].stage).toBe('POLYMORPHIC_SWAP')

    // Verify vtable resolution at step 5
    expect(steps[4].state.dispatchResult).toContain('Dog.makeSound()')
    // Verify polymorphic swap resolution at step 6
    expect(steps[5].state.dispatchResult).toContain('Cat.makeSound()')
  })
})
