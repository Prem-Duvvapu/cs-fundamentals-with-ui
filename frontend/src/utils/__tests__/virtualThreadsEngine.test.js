import { describe, it, expect } from 'vitest'
import { VirtualThreadsEngine } from '../simulationEngines/virtualThreadsEngine'

const actions = (steps) => steps.map((s) => s.action)
const mounted = (engine) => engine.virtualThreads.filter((vt) => vt.status === 'MOUNTED')

describe('VirtualThreadsEngine', () => {
  it('starts with idle carriers and no virtual threads', () => {
    const loom = new VirtualThreadsEngine(2)

    expect(loom.carriers).toHaveLength(2)
    expect(loom.carriers.every((c) => c.status === 'IDLE' && c.mountedVThread === null)).toBe(true)
    expect(loom.virtualThreads).toEqual([])
  })

  describe('M:N scheduling', () => {
    it('mounts only as many virtual threads as there are carriers', () => {
      const loom = new VirtualThreadsEngine(2)
      const steps = loom.spawnVirtualThreads(5)

      expect(actions(steps)).toContain('SPAWN_VTHREADS')
      expect(loom.virtualThreads).toHaveLength(5)
      expect(mounted(loom)).toHaveLength(2) // bounded by carrier count, not thread count
      expect(loom.virtualThreads.filter((vt) => vt.status === 'RUNNABLE')).toHaveLength(3)
    })

    it('marks a carrier running and links it to the thread it carries', () => {
      const loom = new VirtualThreadsEngine(1)
      loom.spawnVirtualThreads(1)

      const carrier = loom.carriers[0]
      const vt = loom.virtualThreads[0]
      expect(carrier.status).toBe('RUNNING')
      expect(carrier.mountedVThread.id).toBe(vt.id)
      expect(vt.carrierId).toBe(carrier.id)
    })

    it('never mounts one virtual thread onto two carriers', () => {
      const loom = new VirtualThreadsEngine(3)
      loom.spawnVirtualThreads(3)

      const carried = loom.carriers.map((c) => c.mountedVThread?.id).filter(Boolean)
      expect(new Set(carried).size).toBe(carried.length)
    })
  })

  describe('blocking I/O', () => {
    it('unmounts the parked thread and frees its carrier — the point of Loom', () => {
      const loom = new VirtualThreadsEngine(1)
      loom.spawnVirtualThreads(1)
      const vt = loom.virtualThreads[0]

      const steps = loom.triggerIO(vt.id)

      expect(actions(steps)).toContain('BLOCKING_IO_REQUEST')
      expect(actions(steps)).toContain('UNMOUNT_VTHREAD')
      expect(vt.status).toBe('PARKED_IO')
      expect(vt.carrierId).toBeNull()
    })

    it('immediately reuses the freed carrier for a waiting thread', () => {
      const loom = new VirtualThreadsEngine(1)
      loom.spawnVirtualThreads(2) // one mounted, one waiting
      const [first, second] = loom.virtualThreads

      const steps = loom.triggerIO(first.id)

      expect(actions(steps)).toContain('MOUNT_VTHREAD')
      expect(second.status).toBe('MOUNTED')
      expect(loom.carriers[0].mountedVThread.id).toBe(second.id)
    })

    it('ignores an I/O request for a thread that is not mounted', () => {
      const loom = new VirtualThreadsEngine(1)
      loom.spawnVirtualThreads(2)
      const waiting = loom.virtualThreads[1]

      expect(loom.triggerIO(waiting.id)).toEqual([])
      expect(loom.triggerIO('VT-does-not-exist')).toEqual([])
    })

    // Regression: the unmount description dereferenced `carrier.id` outside the `if (carrier)`
    // guard, so a thread whose carrierId no longer resolved crashed the simulation.
    it('does not throw when the parked thread has a stale carrier reference', () => {
      const loom = new VirtualThreadsEngine(1)
      loom.spawnVirtualThreads(1)
      const vt = loom.virtualThreads[0]
      vt.carrierId = 'Carrier-OS-that-no-longer-exists'

      expect(() => loom.triggerIO(vt.id)).not.toThrow()
      expect(vt.status).toBe('PARKED_IO')
    })
  })

  describe('I/O completion', () => {
    it('returns the thread to RUNNABLE and remounts it when a carrier is free', () => {
      const loom = new VirtualThreadsEngine(1)
      loom.spawnVirtualThreads(1)
      const vt = loom.virtualThreads[0]
      loom.triggerIO(vt.id)

      const steps = loom.completeIO(vt.id)

      expect(actions(steps)).toContain('IO_COMPLETE')
      expect(actions(steps)).toContain('MOUNT_VTHREAD')
      expect(vt.status).toBe('MOUNTED')
    })

    it('leaves the thread RUNNABLE when every carrier is busy', () => {
      const loom = new VirtualThreadsEngine(1)
      loom.spawnVirtualThreads(2)
      const [first, second] = loom.virtualThreads
      loom.triggerIO(first.id) // second takes the carrier

      loom.completeIO(first.id)

      expect(first.status).toBe('RUNNABLE')
      expect(second.status).toBe('MOUNTED')
    })

    it('ignores completion for a thread that is not parked', () => {
      const loom = new VirtualThreadsEngine(1)
      loom.spawnVirtualThreads(1)

      expect(loom.completeIO(loom.virtualThreads[0].id)).toEqual([])
      expect(loom.completeIO('VT-nope')).toEqual([])
    })
  })

  it('snapshots state per step so replaying cannot mutate the engine', () => {
    const loom = new VirtualThreadsEngine(1)
    const steps = loom.spawnVirtualThreads(1)

    steps[0].state.virtualThreads[0].status = 'COMPLETED'
    steps[0].state.carriers[0].status = 'GONE'

    expect(loom.virtualThreads[0].status).toBe('MOUNTED')
    expect(loom.carriers[0].status).toBe('RUNNING')
  })
})
