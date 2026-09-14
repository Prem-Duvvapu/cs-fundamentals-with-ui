import { describe, it, expect } from 'vitest'
import { ConsistentHashingEngine } from '../simulationEngines/consistentHashingEngine'

const actions = (steps) => steps.map((s) => s.action)
const mapping = (ring) => Object.fromEntries(ring.keys.map((k) => [k.id, k.mappedServer]))

describe('ConsistentHashingEngine', () => {
  it('places every server on the ring and maps every key on construction', () => {
    const ring = new ConsistentHashingEngine(1)

    expect(ring.ringNodes).toHaveLength(3)
    expect(ring.keys.every((k) => k.mappedServer !== null)).toBe(true)
  })

  it('keeps ring nodes sorted by angle so the clockwise walk is well defined', () => {
    const ring = new ConsistentHashingEngine(3)
    const angles = ring.ringNodes.map((n) => n.angle)

    expect([...angles].sort((a, b) => a - b)).toEqual(angles)
  })

  it('hashes names deterministically into the 0-359 degree ring', () => {
    const ring = new ConsistentHashingEngine(1)

    expect(ring.hashToAngle('Server-A')).toBe(ring.hashToAngle('Server-A'))
    for (const name of ['Server-A', 'Server-Z-v9', '', 'x']) {
      const angle = ring.hashToAngle(name)
      expect(angle).toBeGreaterThanOrEqual(0)
      expect(angle).toBeLessThan(360)
    }
  })

  describe('clockwise key ownership', () => {
    it('assigns a key to the first node at or clockwise of its angle', () => {
      const ring = new ConsistentHashingEngine(1)
      const sorted = [...ring.ringNodes].sort((a, b) => a.angle - b.angle)
      const target = sorted[1]
      const keyAngle = sorted[0].angle + 1 // just past the first node

      expect(ring.findServerForKey(keyAngle)).toBe(target.server)
    })

    it('wraps past 360 back to the first node on the ring', () => {
      const ring = new ConsistentHashingEngine(1)
      const highest = Math.max(...ring.ringNodes.map((n) => n.angle))
      const first = [...ring.ringNodes].sort((a, b) => a.angle - b.angle)[0]

      expect(ring.findServerForKey(highest + 1)).toBe(first.server)
    })

    it('returns null when the ring is empty', () => {
      const ring = new ConsistentHashingEngine(1)
      ring.ringNodes = []

      expect(ring.findServerForKey(100)).toBeNull()
    })
  })

  describe('membership changes', () => {
    it('remaps only a subset of keys when a server joins — the whole point of the scheme', () => {
      const ring = new ConsistentHashingEngine(1)
      const before = mapping(ring)

      const steps = ring.addServer('Server-D')

      expect(actions(steps)).toEqual(['ADD_SERVER'])
      const after = mapping(ring)
      const moved = ring.keys.filter((k) => before[k.id] !== after[k.id])
      expect(moved.length).toBeLessThan(ring.keys.length) // never a full reshuffle
    })

    it('only ever moves keys onto the newly added server', () => {
      const ring = new ConsistentHashingEngine(1)
      const before = mapping(ring)

      ring.addServer('Server-D')
      const after = mapping(ring)

      ring.keys
        .filter((k) => before[k.id] !== after[k.id])
        .forEach((k) => expect(after[k.id]).toBe('Server-D'))
    })

    it('rehomes a removed server\'s keys and leaves the rest alone', () => {
      const ring = new ConsistentHashingEngine(1)
      const before = mapping(ring)
      const victim = ring.keys.find((k) => k.mappedServer)?.mappedServer

      ring.removeServer(victim)

      const after = mapping(ring)
      expect(ring.servers).not.toContain(victim)
      expect(Object.values(after)).not.toContain(victim)
      ring.keys
        .filter((k) => before[k.id] !== victim)
        .forEach((k) => expect(after[k.id]).toBe(before[k.id]))
    })

    it('refuses to empty the ring by removing the last server', () => {
      const ring = new ConsistentHashingEngine(1)
      ring.servers = ['Server-A']
      ring.recomputeRing()

      expect(ring.removeServer('Server-A')).toEqual([])
      expect(ring.servers).toEqual(['Server-A'])
    })
  })

  describe('virtual nodes', () => {
    it('multiplies ring placements per server to smooth distribution', () => {
      const ring = new ConsistentHashingEngine(1)
      expect(ring.ringNodes).toHaveLength(3)

      const steps = ring.setVirtualNodes(4)

      expect(actions(steps)).toEqual(['SET_VNODES'])
      expect(ring.ringNodes).toHaveLength(12) // 3 servers x 4 vnodes
      expect(ring.ringNodes.every((n) => ring.servers.includes(n.server))).toBe(true)
    })

    it('names a single placement after the server and vnodes after their index', () => {
      const single = new ConsistentHashingEngine(1)
      expect(single.ringNodes.map((n) => n.name).sort()).toEqual(['Server-A', 'Server-B', 'Server-C'])

      const many = new ConsistentHashingEngine(2)
      expect(many.ringNodes.map((n) => n.name)).toEqual(
        expect.arrayContaining(['Server-A-v1', 'Server-A-v2'])
      )
    })

    it('keeps every key mapped to a real server after redistribution', () => {
      const ring = new ConsistentHashingEngine(1)
      ring.setVirtualNodes(5)

      ring.keys.forEach((k) => expect(ring.servers).toContain(k.mappedServer))
    })
  })

  it('snapshots state per step so replaying cannot mutate the ring', () => {
    const ring = new ConsistentHashingEngine(1)
    const steps = ring.addServer('Server-D')

    steps[0].state.servers.push('Ghost')
    steps[0].state.keys[0].mappedServer = 'Ghost'

    expect(ring.servers).not.toContain('Ghost')
    expect(ring.keys[0].mappedServer).not.toBe('Ghost')
  })
})
