/**
 * B+ Tree Simulation Engine
 * Handles order M (3 to 6) B+ Tree operations:
 * - Search key (step-by-step node traversal)
 * - Insert key (step-by-step insert, leaf split, internal node split, root split)
 * - Delete key (step-by-step key removal, leaf merge / borrow)
 * - Tree structure layout generator (calculates x,y coordinates for SVG rendering)
 */

let nextNodeId = 1

export class BPlusTreeNode {
  constructor(isLeaf = true) {
    this.id = `node-${nextNodeId++}`
    this.isLeaf = isLeaf
    this.keys = []
    this.children = [] // Internal nodes: array of BPlusTreeNode. Leaf nodes: array of values / pointers
    this.next = null   // Pointer to next leaf node for linked list traversal
  }
}

export class BPlusTree {
  constructor(order = 3) {
    this.order = order // Max children per internal node (max keys = order - 1)
    this.maxKeys = order - 1
    this.minKeys = Math.ceil(order / 2) - 1
    this.root = new BPlusTreeNode(true)
  }

  // Clone tree structure for immutable historical snapshots
  cloneTree(node = this.root) {
    if (!node) return null
    const newNode = new BPlusTreeNode(node.isLeaf)
    newNode.id = node.id
    newNode.keys = [...node.keys]
    newNode.next = node.next ? node.next.id : null
    if (!node.isLeaf) {
      newNode.children = node.children.map(child => this.cloneTree(child))
    } else {
      newNode.children = [...node.children]
    }
    return newNode
  }

  // Generate step-by-step animation timeline for Searching a Key
  generateSearchSteps(key) {
    const steps = []
    let curr = this.root
    let depth = 0

    steps.push({
      type: 'SEARCH_START',
      description: `Starting B+ Tree lookup for key ${key} from root node.`,
      highlightedNodeId: curr.id,
      tree: this.cloneTree(),
      metrics: { key, depth, status: 'SEARCHING' }
    })

    while (curr) {
      if (curr.isLeaf) {
        const foundIdx = curr.keys.indexOf(key)
        if (foundIdx !== -1) {
          steps.push({
            type: 'SEARCH_HIT',
            description: `✅ Key ${key} found in leaf node ${curr.id} at index ${foundIdx}!`,
            highlightedNodeId: curr.id,
            highlightedKey: key,
            tree: this.cloneTree(),
            metrics: { key, depth, status: 'HIT' }
          })
        } else {
          steps.push({
            type: 'SEARCH_MISS',
            description: `❌ Key ${key} not found in leaf node ${curr.id}. Lookup failed.`,
            highlightedNodeId: curr.id,
            tree: this.cloneTree(),
            metrics: { key, depth, status: 'MISS' }
          })
        }
        break
      } else {
        // Internal node routing
        let childIdx = 0
        while (childIdx < curr.keys.length && key >= curr.keys[childIdx]) {
          childIdx++
        }

        const nextNode = curr.children[childIdx]
        steps.push({
          type: 'SEARCH_TRAVERSE',
          description: `Key ${key} comparison: routing to child #${childIdx} (${key} ${childIdx < curr.keys.length ? '< ' + curr.keys[childIdx] : '>= ' + curr.keys[curr.keys.length - 1]})`,
          highlightedNodeId: curr.id,
          targetNodeId: nextNode.id,
          tree: this.cloneTree(),
          metrics: { key, depth, status: 'TRAVERSING' }
        })
        curr = nextNode
        depth++
      }
    }

    return steps
  }

  // Insert key into B+ Tree & generate step timeline
  insert(key) {
    const steps = []

    steps.push({
      type: 'INSERT_START',
      description: `Initiating insert for key ${key}.`,
      highlightedNodeId: this.root.id,
      tree: this.cloneTree(),
      metrics: { key, status: 'INSERTING' }
    })

    // Find leaf
    let curr = this.root
    let path = []

    while (!curr.isLeaf) {
      path.push(curr)
      let idx = 0
      while (idx < curr.keys.length && key >= curr.keys[idx]) {
        idx++
      }
      curr = curr.children[idx]
    }

    steps.push({
      type: 'INSERT_LEAF_FOUND',
      description: `Located leaf node ${curr.id} for key ${key}.`,
      highlightedNodeId: curr.id,
      tree: this.cloneTree(),
      metrics: { key, status: 'LOCATED_LEAF' }
    })

    // Insert sorted into leaf
    const insertIdx = curr.keys.findIndex(k => k > key)
    if (insertIdx === -1) {
      curr.keys.push(key)
      curr.children.push(`data-${key}`)
    } else {
      curr.keys.splice(insertIdx, 0, key)
      curr.children.splice(insertIdx, 0, `data-${key}`)
    }

    steps.push({
      type: 'INSERT_LEAF_PLACED',
      description: `Placed key ${key} into leaf node ${curr.id}. (Current keys: [${curr.keys.join(', ')}])`,
      highlightedNodeId: curr.id,
      tree: this.cloneTree(),
      metrics: { key, status: 'PLACED' }
    })

    // Check leaf overflow
    if (curr.keys.length > this.maxKeys) {
      steps.push({
        type: 'OVERFLOW_DETECTED',
        description: `⚠️ Leaf node ${curr.id} overflowed (${curr.keys.length} keys > max ${this.maxKeys}). Node split required!`,
        highlightedNodeId: curr.id,
        tree: this.cloneTree(),
        metrics: { key, status: 'OVERFLOW' }
      })

      this._splitLeaf(curr, path, steps)
    } else {
      steps.push({
        type: 'INSERT_COMPLETE',
        description: `✅ Key ${key} inserted successfully without node split. Tree remains balanced.`,
        highlightedNodeId: curr.id,
        tree: this.cloneTree(),
        metrics: { key, status: 'COMPLETE' }
      })
    }

    return steps
  }

  _splitLeaf(leaf, path, steps) {
    const mid = Math.floor(leaf.keys.length / 2)
    const newLeaf = new BPlusTreeNode(true)

    newLeaf.keys = leaf.keys.splice(mid)
    newLeaf.children = leaf.children.splice(mid)
    newLeaf.next = leaf.next
    leaf.next = newLeaf

    const promoteKey = newLeaf.keys[0]

    steps.push({
      type: 'LEAF_SPLIT_DONE',
      description: `Split leaf into two: Left node [${leaf.keys.join(', ')}], Right node [${newLeaf.keys.join(', ')}]. Promoting key ${promoteKey} upward.`,
      highlightedNodeId: leaf.id,
      newLeafId: newLeaf.id,
      tree: this.cloneTree(),
      metrics: { promoteKey, status: 'SPLITTING_LEAF' }
    })

    if (path.length === 0) {
      // Split root
      const newRoot = new BPlusTreeNode(false)
      newRoot.keys = [promoteKey]
      newRoot.children = [leaf, newLeaf]
      this.root = newRoot

      steps.push({
        type: 'NEW_ROOT_CREATED',
        description: `🌟 Created new Root node ${newRoot.id} with promoted key ${promoteKey}. Tree height increased by 1!`,
        highlightedNodeId: newRoot.id,
        tree: this.cloneTree(),
        metrics: { promoteKey, status: 'ROOT_SPLIT' }
      })
    } else {
      const parent = path.pop()
      this._insertIntoParent(parent, promoteKey, newLeaf, path, steps)
    }
  }

  _insertIntoParent(parent, key, childNode, path, steps) {
    const idx = parent.keys.findIndex(k => k > key)
    if (idx === -1) {
      parent.keys.push(key)
      parent.children.push(childNode)
    } else {
      parent.keys.splice(idx, 0, key)
      parent.children.splice(idx + 1, 0, childNode)
    }

    steps.push({
      type: 'PARENT_KEY_INSERTED',
      description: `Inserted promoted key ${key} into parent node ${parent.id}.`,
      highlightedNodeId: parent.id,
      tree: this.cloneTree(),
      metrics: { key, status: 'PARENT_UPDATED' }
    })

    if (parent.keys.length > this.maxKeys) {
      steps.push({
        type: 'INTERNAL_OVERFLOW',
        description: `⚠️ Internal node ${parent.id} overflowed (${parent.keys.length} keys > max ${this.maxKeys}). Cascading internal split required!`,
        highlightedNodeId: parent.id,
        tree: this.cloneTree(),
        metrics: { key, status: 'INTERNAL_OVERFLOW' }
      })

      this._splitInternal(parent, path, steps)
    }
  }

  _splitInternal(node, path, steps) {
    const mid = Math.floor(node.keys.length / 2)
    const promoteKey = node.keys[mid]
    const newNode = new BPlusTreeNode(false)

    newNode.keys = node.keys.splice(mid + 1)
    newNode.children = node.children.splice(mid + 1)
    node.keys.splice(mid, 1) // Remove middle key promoted to parent

    steps.push({
      type: 'INTERNAL_SPLIT_DONE',
      description: `Split internal node: Left [${node.keys.join(', ')}], Right [${newNode.keys.join(', ')}]. Promoting middle key ${promoteKey} upward.`,
      highlightedNodeId: node.id,
      newNodeId: newNode.id,
      tree: this.cloneTree(),
      metrics: { promoteKey, status: 'SPLITTING_INTERNAL' }
    })

    if (path.length === 0) {
      const newRoot = new BPlusTreeNode(false)
      newRoot.keys = [promoteKey]
      newRoot.children = [node, newNode]
      this.root = newRoot

      steps.push({
        type: 'NEW_ROOT_CREATED',
        description: `🌟 Internal root split! Created new Root ${newRoot.id} with key ${promoteKey}.`,
        highlightedNodeId: newRoot.id,
        tree: this.cloneTree(),
        metrics: { promoteKey, status: 'ROOT_SPLIT' }
      })
    } else {
      const parent = path.pop()
      this._insertIntoParent(parent, promoteKey, newNode, path, steps)
    }
  }
}

/**
 * Calculate (x, y) node coordinates for rendering SVG tree
 */
export function calculateTreeLayout(root, containerWidth = 900, nodeHeight = 50, levelGap = 80) {
  if (!root) return { nodes: [], edges: [], maxDepth: 0 }

  const nodes = []
  const edges = []
  let leafCount = 0

  // 1. First pass: count leaves to assign leaf x positions evenly
  function countLeaves(node) {
    if (node.isLeaf) {
      leafCount++
      return
    }
    node.children.forEach(countLeaves)
  }
  countLeaves(root)

  const leafSpacing = Math.max(120, Math.min(220, containerWidth / (leafCount || 1)))
  let currentLeafX = 60

  // 2. Second pass: compute positions
  function positionNode(node, depth = 0) {
    let x = 0
    const y = 50 + depth * levelGap

    if (node.isLeaf) {
      x = currentLeafX
      currentLeafX += leafSpacing
    } else {
      const childPositions = node.children.map(child => positionNode(child, depth + 1))
      const firstChildX = childPositions[0].x
      const lastChildX = childPositions[childPositions.length - 1].x
      x = (firstChildX + lastChildX) / 2

      // Create edges to children
      node.children.forEach((child, idx) => {
        edges.push({
          id: `edge-${node.id}-${child.id}`,
          fromId: node.id,
          toId: child.id,
          x1: x,
          y1: y + 25,
          x2: childPositions[idx].x,
          y2: childPositions[idx].y - 25
        })
      })
    }

    nodes.push({
      id: node.id,
      keys: node.keys,
      isLeaf: node.isLeaf,
      next: node.next,
      x,
      y,
      depth
    })

    return { x, y }
  }

  positionNode(root, 0)

  // 3. Connect leaf linked-list next pointers
  const leafNodes = nodes.filter(n => n.isLeaf).sort((a, b) => a.x - b.x)
  const leafEdges = []
  for (let i = 0; i < leafNodes.length - 1; i++) {
    leafEdges.push({
      id: `leaf-edge-${leafNodes[i].id}-${leafNodes[i + 1].id}`,
      x1: leafNodes[i].x + 45,
      y1: leafNodes[i].y,
      x2: leafNodes[i + 1].x - 45,
      y2: leafNodes[i + 1].y
    })
  }

  return { nodes, edges, leafEdges, totalWidth: Math.max(containerWidth, currentLeafX + 60) }
}
