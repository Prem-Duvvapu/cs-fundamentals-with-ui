import { describe, it, expect } from 'vitest'
import { networkTopologies } from '../networkTopologyData'

describe('networkTopologyData', () => {
  it('should define all 5 essential network topologies', () => {
    const keys = Object.keys(networkTopologies)
    expect(keys).toContain('star')
    expect(keys).toContain('bus')
    expect(keys).toContain('ring')
    expect(keys).toContain('mesh')
    expect(keys).toContain('hybrid')
  })

  it('should contain all required metadata fields for each topology', () => {
    Object.values(networkTopologies).forEach(topo => {
      expect(topo.id).toBeDefined()
      expect(topo.name).toBeDefined()
      expect(topo.description).toBeDefined()
      expect(topo.faultTolerance).toBeDefined()
      expect(topo.cableCount).toBeDefined()
      expect(topo.broadcastBehavior).toBeDefined()
      expect(topo.cost).toBeDefined()
      expect(Array.isArray(topo.pros)).toBe(true)
      expect(Array.isArray(topo.cons)).toBe(true)
      expect(topo.pros.length).toBeGreaterThan(0)
      expect(topo.cons.length).toBeGreaterThan(0)
    })
  })
})
