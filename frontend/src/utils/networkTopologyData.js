export const networkTopologies = {
  star: {
    id: 'star',
    name: 'Star Topology',
    description: 'All nodes are independently connected to a central hub or switch via dedicated point-to-point links.',
    faultTolerance: 'Moderate (Single cable failure isolates only that node; Central switch failure halts entire network)',
    cableCount: 'N links (where N is the number of nodes)',
    broadcastBehavior: 'Central switch unicasts to destination MAC or hub broadcasts to all ports',
    cost: 'Low to Moderate',
    pros: ['Easy to install and reconfigure', 'Single node failure does not disrupt others', 'Centralized diagnostics and management'],
    cons: ['Single Point of Failure at central hub/switch', 'High cabling requirements compared to bus topology'],
    nodes: ['Node A', 'Node B', 'Node C', 'Node D'],
    center: 'Central Switch / Hub'
  },
  bus: {
    id: 'bus',
    name: 'Bus Topology',
    description: 'All nodes share a single central transmission line (backbone trunk) terminated at both ends with impedance matching terminators.',
    faultTolerance: 'Low (A break in the central backbone cable halts all communication across the entire bus)',
    cableCount: '1 main backbone trunk + N drop cables',
    broadcastBehavior: 'All packets are broadcast to all nodes; destination host accepts while others discard',
    cost: 'Low',
    pros: ['Minimal cabling required', 'Very cheap and easy to set up for small legacy LANs'],
    cons: ['High collision rate with heavy traffic (CSMA/CD required)', 'Hard to troubleshoot line faults', 'Backbone break splits or crashes the entire network'],
    nodes: ['Node A', 'Node B', 'Node C', 'Node D'],
    center: 'Shared Backbone Cable'
  },
  ring: {
    id: 'ring',
    name: 'Ring Topology',
    description: 'Each node connects to exactly two neighboring nodes forming a continuous unidirectional or bidirectional closed loop (e.g. Token Ring, FDDI).',
    faultTolerance: 'Low (Single node or cable break breaks loop unless dual counter-rotating rings are deployed)',
    cableCount: 'N links',
    broadcastBehavior: 'Token / frame circulates unidirectionally from node to node until destination receives or returns to sender',
    cost: 'Moderate',
    pros: ['Deterministic access time (no collisions with token passing)', 'Equal access opportunity for all nodes'],
    cons: ['Adding or removing a node breaks the ring temporarily', 'Single node failure can halt entire network ring'],
    nodes: ['Node A', 'Node B', 'Node C', 'Node D'],
    center: 'Closed Circular Loop'
  },
  mesh: {
    id: 'mesh',
    name: 'Full Mesh Topology',
    description: 'Every node has a dedicated point-to-point physical link to every other node in the network.',
    faultTolerance: 'Highest (Massive redundancy; multiple alternative routes if links fail)',
    cableCount: 'N(N - 1) / 2 dedicated physical links',
    broadcastBehavior: 'Direct point-to-point unicast transmissions with zero intermediate forwarding hops',
    cost: 'Extremely High',
    pros: ['Robust against multiple simultaneous link failures', 'Maximum security and privacy (dedicated channels)', 'Zero traffic contention'],
    cons: ['Extremely high cabling cost (O(N^2))', 'High number of physical I/O ports required per device'],
    nodes: ['Node A', 'Node B', 'Node C', 'Node D'],
    center: 'Full Point-to-Point Mesh'
  },
  hybrid: {
    id: 'hybrid',
    name: 'Hybrid / Tree Topology',
    description: 'A combination of two or more distinct topologies (e.g., Star-Bus or hierarchical Tree topology used in modern campus LANs).',
    faultTolerance: 'High (Branch failures do not affect root or other branches)',
    cableCount: 'Varies based on hierarchy (typically N - 1 links in pure tree)',
    broadcastBehavior: 'Hierarchical forwarding through Core, Distribution, and Access layer switches',
    cost: 'Moderate to High',
    pros: ['Extremely scalable for enterprise networks', 'Easier fault isolation by branch hierarchy'],
    cons: ['Complex design and network management requirements', 'Core switch failure isolates multiple subnets'],
    nodes: ['Core Switch', 'Dist 1 (Star A, B)', 'Dist 2 (Star C, D)'],
    center: 'Hierarchical Multi-Tier Backbone'
  }
}
