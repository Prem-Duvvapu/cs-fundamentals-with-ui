import { describe, it, expect } from 'vitest'
import { JavaCollectionsEngine } from '../simulationEngines/javaCollectionsEngine'

describe('JavaCollectionsEngine', () => {
  it('should generate all 5 execution steps covering ArrayList, LinkedList, HashSet, ArrayDeque, and PriorityQueue', () => {
    const engine = new JavaCollectionsEngine()
    const steps = engine.getExecutionSteps()

    expect(steps).toHaveLength(5)
    expect(steps[0].stage).toBe('ARRAYLIST_CAPACITY_GROWTH')
    expect(steps[1].stage).toBe('LINKEDLIST_NODES')
    expect(steps[2].stage).toBe('HASHSET_MAP_BACKING')
    expect(steps[3].stage).toBe('ARRAYDEQUE_RING_BUFFER')
    expect(steps[4].stage).toBe('PRIORITY_QUEUE_HEAP')

    // Verify ArrayList capacity growth
    expect(steps[0].state.arrayListState.capacity).toBe(6)

    // Verify PriorityQueue sift-up root
    expect(steps[4].state.minHeapState[0]).toBe(5)
  })
})
