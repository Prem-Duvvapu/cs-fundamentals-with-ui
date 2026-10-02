import { describe, it, expect } from 'vitest'
import { HashMapEngine } from '../simulationEngines/hashMapEngine'

const actions = (steps) => steps.map((s) => s.action)

describe('HashMapEngine', () => {
  it('starts empty with the documented capacity and threshold', () => {
    const map = new HashMapEngine(8, 0.75)
    const state = map.cloneState()

    expect(state.capacity).toBe(8)
    expect(state.size).toBe(0)
    expect(state.threshold).toBe(6)
    expect(state.buckets).toHaveLength(8)
  })

  it('indexes a key with (capacity - 1) & hash, the same masking Java uses', () => {
    const map = new HashMapEngine(8)
    const index = map.getBucketIndex('alpha')

    expect(index).toBe((8 - 1) & map.hash('alpha'))
    expect(index).toBeGreaterThanOrEqual(0)
    expect(index).toBeLessThan(8)
  })

  it('places an inserted node in the bucket its hash selects', () => {
    const map = new HashMapEngine(8)
    const expectedBucket = map.getBucketIndex('alpha')

    const steps = map.put('alpha', 1)

    expect(actions(steps)).toEqual(['HASH_COMPUTE', 'NODE_INSERTED'])
    expect(map.buckets[expectedBucket].map((n) => n.key)).toEqual(['alpha'])
    expect(map.size).toBe(1)
  })

  it('updates in place rather than chaining when the key already exists', () => {
    const map = new HashMapEngine(8)
    map.put('alpha', 1)
    const steps = map.put('alpha', 2)

    expect(actions(steps)).toContain('KEY_EXISTS_UPDATE')
    expect(map.size).toBe(1)
    const bucket = map.buckets[map.getBucketIndex('alpha')]
    expect(bucket).toHaveLength(1)
    expect(bucket[0].value).toBe(2)
  })

  it('chains colliding keys into one bucket instead of overwriting', () => {
    // Capacity 1 masks every hash to index 0, forcing a guaranteed collision.
    const map = new HashMapEngine(1, 100)
    map.put('a', 1)
    map.put('b', 2)
    map.put('c', 3)

    expect(map.buckets[0].map((n) => n.key)).toEqual(['a', 'b', 'c'])
    expect(map.size).toBe(3)
  })

  it('keeps eight colliding put entries as a list and models a tree on the ninth at capacity 64', () => {
    const map = new HashMapEngine(64, 100)
    map.hash = () => 1
    for (let i = 0; i < 8; i++) {
      expect(actions(map.put(`k${i}`, i))).not.toContain('TREEIFY_TRIGGERED')
    }
    expect(map.cloneState().treeBins).toEqual([])
    expect(actions(map.put('k8', 8))).toContain('TREEIFY_TRIGGERED')
    expect(map.cloneState().treeBins).toEqual([1])
    expect(actions(map.put('k9', 9))).not.toContain('TREEIFY_TRIGGERED')
    expect(actions(map.put('k8', 80))).toEqual(['HASH_COMPUTE', 'KEY_EXISTS_UPDATE'])
    expect(map.size).toBe(10)
  })

  it('grows a collision bin below capacity 64 without falsely marking it as a tree', () => {
    const map = new HashMapEngine(32, 100)
    map.hash = () => 1
    for (let i = 0; i < 8; i++) map.put(`k${i}`, i)
    const steps = map.put('k8', 8)
    expect(actions(steps)).toContain('RESIZE_TRIGGERED')
    expect(actions(steps)).not.toContain('TREEIFY_TRIGGERED')
    expect(map.capacity).toBe(64)
    expect(map.cloneState().treeBins).toEqual([])
    expect(steps[0].state.capacity).toBe(32)
    expect(actions(map.put('k9', 9))).toContain('TREEIFY_TRIGGERED')
  })

  it('splits a modeled tree on growth and untreeifies sides with at most six entries', () => {
    const map = new HashMapEngine(64, 100)
    map.hash = key => key.startsWith('low') ? 1 : 65
    for (let i = 0; i < 7; i++) map.put(`low${i}`, i)
    for (let i = 0; i < 5; i++) map.put(`high${i}`, i)
    expect(map.cloneState().treeBins).toEqual([1])
    map.resize()
    expect(map.buckets[1]).toHaveLength(7)
    expect(map.buckets[65]).toHaveLength(5)
    expect(map.cloneState().treeBins).toEqual([1])
    expect(map.size).toBe(12)
  })

  it('resizes once size exceeds the load-factor threshold', () => {
    const map = new HashMapEngine(8, 0.75) // threshold 6
    for (let i = 1; i <= 6; i++) map.put(`key${i}`, i)
    expect(map.capacity).toBe(8)

    const steps = map.put('key7', 7)

    expect(actions(steps)).toContain('RESIZE_TRIGGERED')
    expect(actions(steps)).toContain('RESIZE_COMPLETE')
    expect(map.capacity).toBe(16)
  })

  it('preserves every entry across a resize and rehashes it to the new index', () => {
    const map = new HashMapEngine(8, 0.75)
    const inserted = []
    for (let i = 1; i <= 7; i++) {
      map.put(`key${i}`, i)
      inserted.push(`key${i}`)
    }

    expect(map.capacity).toBe(16)
    expect(map.size).toBe(7)

    const flattened = map.buckets.flat()
    expect(flattened.map((n) => n.key).sort()).toEqual([...inserted].sort())

    // Every node must sit in the bucket the *new* capacity selects for it.
    map.buckets.forEach((bucket, index) => {
      bucket.forEach((node) => expect((map.capacity - 1) & node.hash).toBe(index))
    })
  })

  it('uses Java string hash spreading including signed hashes', () => {
    const map = new HashMapEngine()

    expect(map.hash('repeatable')).toBe(map.hash('repeatable'))
    expect(map.hash('alpha')).not.toBe(map.hash('beta'))
    expect(map.hash('Aa')).toBe(2112)
    expect(map.hash('BB')).toBe(2112)
    // Independently checked in Java 17: raw hash -1910022912, spread hash -1909992665.
    expect(map.hash('zzzzzzzz')).toBe(-1909992665)
    expect(map.getBucketIndex('zzzzzzzz')).toBeGreaterThanOrEqual(0)
  })

  it('snapshots state per step so replaying the animation cannot mutate the engine', () => {
    const map = new HashMapEngine(8)
    const steps = map.put('alpha', 1)
    const snapshot = steps[0].state

    snapshot.buckets[0].push({ key: 'injected', value: 'x' })
    snapshot.size = 999
    snapshot.treeBins.push(0)

    expect(map.size).toBe(1)
    expect(map.buckets.flat().map((n) => n.key)).toEqual(['alpha'])
    expect(map.cloneState().treeBins).toEqual([])
  })
})
