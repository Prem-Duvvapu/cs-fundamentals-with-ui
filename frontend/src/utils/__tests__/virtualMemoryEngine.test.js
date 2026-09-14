import { describe, it, expect } from 'vitest'
import { VirtualMemoryEngine } from '../simulationEngines/virtualMemoryEngine'

const actions = (steps) => steps.map((s) => s.action)
const OFFSET = 0x0a4

describe('VirtualMemoryEngine', () => {
  describe('TLB lookup', () => {
    it('resolves a TLB-resident page without touching the page table', () => {
      const mmu = new VirtualMemoryEngine()
      const steps = mmu.translate(1) // vpn 1 is pre-loaded in the TLB

      expect(actions(steps)).toEqual(['TRANSLATE_START', 'TLB_HIT'])
      const hit = steps[1]
      expect(hit.isHit).toBe(true)
      expect(hit.highlightFrame).toBe(5)
    })

    it('computes the physical address as (frame << 12) | offset', () => {
      const mmu = new VirtualMemoryEngine()
      const steps = mmu.translate(3) // vpn 3 -> frame 12, in TLB

      expect(steps[1].description).toContain(((12 << 12) | OFFSET).toString(16).toUpperCase())
    })

    it('falls through to the page table on a TLB miss and caches the translation', () => {
      const mmu = new VirtualMemoryEngine()
      const steps = mmu.translate(0) // valid in page table, absent from TLB

      expect(actions(steps)).toEqual(['TRANSLATE_START', 'TLB_MISS', 'PAGE_TABLE_HIT'])
      expect(mmu.tlb.some((e) => e.vpn === 0 && e.frame === 8 && e.valid)).toBe(true)
    })

    it('serves the second access to the same page straight from the TLB', () => {
      const mmu = new VirtualMemoryEngine()
      mmu.translate(0)
      const again = mmu.translate(0)

      expect(actions(again)).toEqual(['TRANSLATE_START', 'TLB_HIT'])
    })

    it('cycles the TLB victim slot rather than overwriting one entry forever', () => {
      const mmu = new VirtualMemoryEngine()
      mmu.translate(0)
      mmu.translate(2)
      mmu.translate(5)

      const cached = mmu.tlb.filter((e) => e.valid).map((e) => e.vpn)
      expect(new Set(cached).size).toBe(cached.length)
      expect(cached).toEqual(expect.arrayContaining([2, 5]))
    })
  })

  describe('page faults', () => {
    it('raises a fault for a page whose valid bit is 0, then resolves it', () => {
      const mmu = new VirtualMemoryEngine()
      const steps = mmu.translate(4) // valid: false

      expect(actions(steps)).toEqual([
        'TRANSLATE_START', 'TLB_MISS', 'PAGE_FAULT_START', 'PAGE_FAULT_RESOLVED'
      ])
      const entry = mmu.pageTable.find((p) => p.vpn === 4)
      expect(entry.valid).toBe(true)
      expect(entry.frame).not.toBeNull()
    })

    // Regression: the allocator read `this.freeFrames.shift() || 15`. Frame 0 is falsy, so the
    // very first fault handed out frame 15 while *consuming* frame 0 — leaking frame 0 and
    // leaving 15 in the free list to be handed out a second time, mapping two pages to one frame.
    it('assigns the first free frame even when that frame is 0', () => {
      const mmu = new VirtualMemoryEngine()
      expect(mmu.freeFrames[0]).toBe(0) // precondition: the falsy frame really is first

      mmu.translate(4)

      expect(mmu.pageTable.find((p) => p.vpn === 4).frame).toBe(0)
      expect(mmu.freeFrames).not.toContain(0)
    })

    it('never hands the same physical frame to two pages', () => {
      const mmu = new VirtualMemoryEngine()
      mmu.translate(4)
      mmu.translate(6)

      const resident = mmu.pageTable.filter((p) => p.valid).map((p) => p.frame)
      expect(new Set(resident).size).toBe(resident.length)

      // A frame that is now mapped must no longer be advertised as free.
      resident.forEach((frame) => expect(mmu.freeFrames).not.toContain(frame))
    })

    it('draws frames from the free list in order', () => {
      const mmu = new VirtualMemoryEngine()
      const [first, second] = mmu.freeFrames

      mmu.translate(4)
      mmu.translate(6)

      expect(mmu.pageTable.find((p) => p.vpn === 4).frame).toBe(first)
      expect(mmu.pageTable.find((p) => p.vpn === 6).frame).toBe(second)
    })

    it('reports exhaustion instead of inventing a frame when none are free', () => {
      const mmu = new VirtualMemoryEngine()
      mmu.freeFrames = []

      const steps = mmu.translate(4)

      expect(actions(steps)).toContain('NO_FREE_FRAMES')
      expect(actions(steps)).not.toContain('PAGE_FAULT_RESOLVED')
      const entry = mmu.pageTable.find((p) => p.vpn === 4)
      expect(entry.valid).toBe(false)
      expect(entry.frame).toBeNull()
    })
  })

  it('snapshots state per step so the animation cannot mutate the engine', () => {
    const mmu = new VirtualMemoryEngine()
    const steps = mmu.translate(1)

    steps[0].state.freeFrames.push(999)
    steps[0].state.pageTable[0].frame = 123

    expect(mmu.freeFrames).not.toContain(999)
    expect(mmu.pageTable[0].frame).toBe(8)
  })
})
