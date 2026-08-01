import { describe, it, expect } from 'vitest'
import { BPlusTree, calculateTreeLayout } from '../simulationEngines/bplusTreeEngine'

describe('BPlusTree Engine', () => {
  it('should insert keys and split leaf nodes correctly when order M is exceeded', () => {
    const tree = new BPlusTree(3) // Max keys per node = 2
    
    // Insert 10, 20 (no split)
    tree.insert(10)
    tree.insert(20)
    expect(tree.root.keys).toEqual([10, 20])
    expect(tree.root.isLeaf).toBe(true)

    // Insert 30 (triggers leaf split and new root creation)
    const steps = tree.insert(30)
    expect(steps.length).toBeGreaterThan(0)
    expect(tree.root.isLeaf).toBe(false)
    expect(tree.root.keys).toEqual([20]) // mid/right split key promoted
    expect(tree.root.children.length).toBe(2)
  })

  it('should generate step-by-step search traversal hits and misses', () => {
    const tree = new BPlusTree(3)
    tree.insert(10)
    tree.insert(20)
    tree.insert(30)

    const hitSteps = tree.generateSearchSteps(20)
    const lastHitStep = hitSteps[hitSteps.length - 1]
    expect(lastHitStep.type).toBe('SEARCH_HIT')

    const missSteps = tree.generateSearchSteps(99)
    const lastMissStep = missSteps[missSteps.length - 1]
    expect(lastMissStep.type).toBe('SEARCH_MISS')
  })

  it('should calculate valid x, y tree layout positioning for SVG rendering', () => {
    const tree = new BPlusTree(3)
    tree.insert(10)
    tree.insert(20)
    tree.insert(30)

    const layout = calculateTreeLayout(tree.root, 800, 50, 80)
    expect(layout.nodes.length).toBe(3) // Root + 2 leaves
    expect(layout.edges.length).toBe(2)
    expect(layout.leafEdges.length).toBe(1)
  })
})
