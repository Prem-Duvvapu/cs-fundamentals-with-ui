/**
 * Consistent Hashing Simulation Engine
 * Handles 360-degree hash ring node placement, virtual nodes, key hashing, and minimal remapping animation steps.
 */

export class ConsistentHashingEngine {
  constructor(virtualNodesCount = 1) {
    this.virtualNodesCount = virtualNodesCount
    this.servers = ['Server-A', 'Server-B', 'Server-C']
    this.keys = [
      { id: 'user_101', angle: 45, mappedServer: null },
      { id: 'user_202', angle: 110, mappedServer: null },
      { id: 'user_303', angle: 190, mappedServer: null },
      { id: 'user_404', angle: 260, mappedServer: null },
      { id: 'user_505', angle: 320, mappedServer: null }
    ]
    this.recomputeRing()
  }

  cloneState() {
    return {
      servers: [...this.servers],
      virtualNodesCount: this.virtualNodesCount,
      ringNodes: [...this.ringNodes.map(rn => ({ ...rn }))],
      keys: [...this.keys.map(k => ({ ...k }))]
    }
  }

  hashToAngle(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash) % 360
  }

  recomputeRing() {
    const ringNodes = []

    this.servers.forEach(server => {
      for (let v = 0; v < this.virtualNodesCount; v++) {
        const vnodeName = this.virtualNodesCount === 1 ? server : `${server}-v${v + 1}`
        const angle = this.hashToAngle(vnodeName)
        ringNodes.push({ name: vnodeName, server, angle })
      }
    })

    ringNodes.sort((a, b) => a.angle - b.angle)
    this.ringNodes = ringNodes

    // Remap keys clockwise
    this.keys.forEach(k => {
      k.mappedServer = this.findServerForKey(k.angle)
    })
  }

  findServerForKey(keyAngle) {
    if (this.ringNodes.length === 0) return null

    for (const node of this.ringNodes) {
      if (node.angle >= keyAngle) return node.server
    }
    return this.ringNodes[0].server // Wrap around 360 -> 0
  }

  addServer(serverName) {
    const steps = []
    const prevKeys = this.keys.map(k => ({ id: k.id, server: k.mappedServer }))

    this.servers.push(serverName)
    this.recomputeRing()

    const remappedCount = this.keys.filter((k, idx) => k.mappedServer !== prevKeys[idx].server).length

    steps.push({
      action: 'ADD_SERVER',
      description: `➕ Added ${serverName} to ring. Total servers: ${this.servers.length}. Remapped ${remappedCount}/${this.keys.length} keys (~${Math.round((remappedCount / this.keys.length) * 100)}%).`,
      state: this.cloneState()
    })

    return steps
  }

  removeServer(serverName) {
    const steps = []
    if (this.servers.length <= 1) return steps

    const prevKeys = this.keys.map(k => ({ id: k.id, server: k.mappedServer }))
    this.servers = this.servers.filter(s => s !== serverName)
    this.recomputeRing()

    const remappedCount = this.keys.filter((k, idx) => k.mappedServer !== prevKeys[idx].server).length

    steps.push({
      action: 'REMOVE_SERVER',
      description: `❌ Removed ${serverName} from ring. Remapped ${remappedCount}/${this.keys.length} affected keys to adjacent clockwise servers.`,
      state: this.cloneState()
    })

    return steps
  }

  setVirtualNodes(vCount) {
    const steps = []
    this.virtualNodesCount = vCount
    this.recomputeRing()

    steps.push({
      action: 'SET_VNODES',
      description: `Updated Virtual Nodes per server to ${vCount}. Ring positions redistributed evenly.`,
      state: this.cloneState()
    })

    return steps
  }
}
