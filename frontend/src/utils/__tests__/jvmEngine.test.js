import { describe, it, expect } from 'vitest'
import { JvmMemoryEngine } from '../simulationEngines/jvmEngine'

const actions = (steps) => steps.map((s) => s.action)
const names = (objects) => objects.map((o) => o.name)

describe('JvmMemoryEngine', () => {
  describe('allocation', () => {
    it('allocates a normal object into Eden', () => {
      const heap = new JvmMemoryEngine(6, 3, 8)
      const steps = heap.allocateObject('Order', 100)

      expect(actions(steps)).toEqual(['ALLOCATE_START', 'ALLOCATED_EDEN'])
      expect(names(heap.eden)).toEqual(['Order'])
      expect(heap.oldGen).toHaveLength(0)
    })

    it('routes a humongous object straight to Old Gen, bypassing Eden', () => {
      const heap = new JvmMemoryEngine(6, 3, 8)
      const steps = heap.allocateObject('BigBlob', 9000, true)

      expect(actions(steps)).toEqual(['HUMONGOUS_ALLOCATION', 'ALLOCATED_OLD'])
      expect(names(heap.oldGen)).toEqual(['BigBlob'])
      expect(heap.eden).toHaveLength(0)
    })

    // Regression: `nextObjId++` lived in the default parameter, so it only advanced when the
    // caller omitted a name. Two explicitly-named objects both came back as `obj-1`.
    it('gives every object a unique id, including explicitly-named ones', () => {
      const heap = new JvmMemoryEngine(6, 3, 8)
      heap.allocateObject('Alpha', 10)
      heap.allocateObject('Beta', 10)
      heap.allocateObject(undefined, 10) // defaulted name

      const ids = heap.eden.map((o) => o.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('triggers a Minor GC when Eden is full, then admits the new object', () => {
      const heap = new JvmMemoryEngine(4, 3, 8)
      for (let i = 0; i < 4; i++) heap.allocateObject(`E${i}`, 10)

      const steps = heap.allocateObject('Trigger', 10)

      expect(actions(steps)).toContain('EDEN_FULL')
      expect(actions(steps)).toContain('MINOR_GC_START')
      expect(names(heap.eden)).toEqual(['Trigger'])
    })
  })

  describe('minor GC', () => {
    // Regression: survivors were evacuated into S0 and then S0 was immediately cleared by the
    // swap logic, so every Minor GC threw away the objects it had just copied.
    it('keeps evacuated survivors instead of wiping the space it just filled', () => {
      const heap = new JvmMemoryEngine(4, 3, 8)
      for (let i = 0; i < 4; i++) heap.allocateObject(`E${i}`, 10)

      heap.triggerMinorGC()

      const survivors = [...heap.s0, ...heap.s1]
      expect(survivors.length).toBeGreaterThan(0)
      expect(names(survivors)).toEqual(['E0', 'E2']) // even indices survive, odd are collected
    })

    it('clears Eden and swaps the active survivor space', () => {
      const heap = new JvmMemoryEngine(4, 3, 8)
      for (let i = 0; i < 4; i++) heap.allocateObject(`E${i}`, 10)
      expect(heap.activeSurvivor).toBe(0)

      heap.triggerMinorGC()

      expect(heap.eden).toHaveLength(0)
      expect(heap.activeSurvivor).toBe(1)
      expect(heap.s0).toHaveLength(2) // copied into the to-space
      expect(heap.s1).toHaveLength(0) // from-space emptied
    })

    it('ages survivors on every collection', () => {
      const heap = new JvmMemoryEngine(4, 3, 8)
      for (let i = 0; i < 4; i++) heap.allocateObject(`E${i}`, 10)

      heap.triggerMinorGC()
      expect([...heap.s0, ...heap.s1].every((o) => o.age === 1)).toBe(true)

      heap.triggerMinorGC()
      expect([...heap.s0, ...heap.s1].every((o) => o.age === 2)).toBe(true)
    })

    it('counts collections', () => {
      const heap = new JvmMemoryEngine(4, 3, 8)
      heap.triggerMinorGC()
      heap.triggerMinorGC()
      expect(heap.gcCount).toBe(2)
    })

    it('does not collect Old Gen during a Minor GC', () => {
      const heap = new JvmMemoryEngine(4, 3, 8)
      heap.allocateObject('Tenured', 9000, true)

      heap.triggerMinorGC()

      expect(names(heap.oldGen)).toContain('Tenured')
    })
  })

  describe('tenuring', () => {
    // Regression: because survivors were wiped each GC, nothing ever aged past 1 and this
    // promotion path — a headline feature of the simulation — could never execute.
    it('promotes an object to Old Gen once it reaches the tenuring threshold', () => {
      const heap = new JvmMemoryEngine(4, 3, 8)
      for (let i = 0; i < 4; i++) heap.allocateObject(`E${i}`, 10)

      heap.triggerMinorGC() // age 1
      heap.triggerMinorGC() // age 2
      const steps = heap.triggerMinorGC() // age 3 -> promoted

      expect(actions(steps)).toContain('TENURED_PROMOTION')
      expect(names(heap.oldGen)).toEqual(expect.arrayContaining(['E0', 'E2']))
      expect([...heap.s0, ...heap.s1]).toHaveLength(0)
    })

    it('keeps objects below the threshold in a survivor space', () => {
      const heap = new JvmMemoryEngine(4, 3, 8)
      for (let i = 0; i < 4; i++) heap.allocateObject(`E${i}`, 10)

      heap.triggerMinorGC()
      const steps = heap.triggerMinorGC()

      expect(actions(steps)).not.toContain('TENURED_PROMOTION')
      expect(heap.oldGen).toHaveLength(0)
      expect([...heap.s0, ...heap.s1]).toHaveLength(2)
    })
  })

  it('snapshots state per step so the animation cannot mutate the heap', () => {
    const heap = new JvmMemoryEngine(6, 3, 8)
    const steps = heap.allocateObject('Order', 100)

    steps[0].state.eden.push({ name: 'injected' })
    steps[0].state.metaspace.push('Injected.class')

    expect(names(heap.eden)).toEqual(['Order'])
    expect(heap.metaspace).not.toContain('Injected.class')
  })
})
