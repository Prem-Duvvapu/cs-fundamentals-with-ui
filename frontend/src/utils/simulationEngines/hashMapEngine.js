/**
 * HashMap & ConcurrentHashMap Simulation Engine
 * Models OpenJDK 17 string-key placement, ordinary put thresholds and resize.
 * Tree bins are represented by a flag; red-black rotations/search are not simulated.
 */

export class HashMapEngine {
  constructor(initialCapacity = 8, loadFactor = 0.75) {
    this.capacity = initialCapacity
    this.loadFactor = loadFactor
    this.buckets = Array.from({ length: initialCapacity }, () => [])
    this.size = 0
    this.treeBins = new Set()
  }

  cloneState() {
    return {
      capacity: this.capacity,
      loadFactor: this.loadFactor,
      size: this.size,
      threshold: Math.floor(this.capacity * this.loadFactor),
      treeBins: [...this.treeBins],
      buckets: this.buckets.map(b => b.map(node => ({ ...node })))
    }
  }

  hash(key) {
    let hash = 0
    const strKey = String(key)
    for (let i = 0; i < strKey.length; i++) {
      hash = (hash << 5) - hash + strKey.charCodeAt(i)
      hash |= 0
    }
    return hash ^ (hash >>> 16)
  }

  getBucketIndex(key, cap = this.capacity) {
    return (cap - 1) & this.hash(key)
  }

  put(key, value) {
    const steps = []
    const rawHash = this.hash(key)
    const bucketIdx = (this.capacity - 1) & rawHash

    steps.push({
      action: 'HASH_COMPUTE',
      description: `Key "${key}" ➔ spread hash = ${rawHash}. Target bucket = (capacity - 1) & hash = ${bucketIdx}.`,
      highlightBucket: bucketIdx,
      state: this.cloneState()
    })

    const bucket = this.buckets[bucketIdx]
    const existingIdx = bucket.findIndex(node => node.key === key)

    if (existingIdx !== -1) {
      bucket[existingIdx].value = value
      steps.push({
        action: 'KEY_EXISTS_UPDATE',
        description: `Key "${key}" found in bucket #${bucketIdx}. Value updated to "${value}".`,
        highlightBucket: bucketIdx,
        state: this.cloneState()
      })
      return steps
    }

    // Insert new node
    const newNode = { key, value, hash: rawHash }
    bucket.push(newNode)
    this.size++

    steps.push({
      action: 'NODE_INSERTED',
      description: `Inserted node ("${key}": "${value}") into bucket #${bucketIdx}. (Bucket chain size: ${bucket.length}).`,
      highlightBucket: bucketIdx,
      state: this.cloneState()
    })

    if (bucket.length >= 9 && !this.treeBins.has(bucketIdx)) {
      if (this.capacity < 64) {
        steps.push({
          action: 'RESIZE_TRIGGERED',
          description: `Bucket #${bucketIdx} requests treeification after ${bucket.length} nodes, but capacity ${this.capacity} is below 64. Resize first.`,
          highlightBucket: bucketIdx,
          state: this.cloneState()
        })
        this.resize()
        steps.push({
          action: 'RESIZE_COMPLETE',
          description: `Capacity doubled to ${this.capacity}; stored spread hashes select the new buckets.`,
          highlightBucket: null,
          state: this.cloneState()
        })
      } else {
        this.treeBins.add(bucketIdx)
        steps.push({
          action: 'TREEIFY_TRIGGERED',
          description: `Bucket #${bucketIdx} is now modeled as a tree bin. This view marks the representation; it does not execute tree search or rotations.`,
          highlightBucket: bucketIdx,
          state: this.cloneState()
        })
      }
    }

    // Check resize threshold
    const threshold = Math.floor(this.capacity * this.loadFactor)
    if (this.size > threshold) {
      steps.push({
        action: 'RESIZE_TRIGGERED',
        description: `HashMap size (${this.size}) > threshold (${threshold}). Doubling capacity to ${this.capacity * 2} using stored spread hashes.`,
        highlightBucket: bucketIdx,
        state: this.cloneState()
      })
      this.resize()
      steps.push({
        action: 'RESIZE_COMPLETE',
        description: `Array capacity doubled to ${this.capacity}. Entries moved to the buckets selected by their stored hashes.`,
        highlightBucket: null,
        state: this.cloneState()
      })
    }

    return steps
  }

  resize() {
    const oldBuckets = this.buckets
    const oldTreeBins = this.treeBins
    this.capacity *= 2
    this.buckets = Array.from({ length: this.capacity }, () => [])
    this.size = 0
    this.treeBins = new Set()

    oldBuckets.forEach((b, oldIndex) => {
      b.forEach(node => {
        const newIdx = (this.capacity - 1) & node.hash
        this.buckets[newIdx].push(node)
        this.size++
      })
      if (oldTreeBins.has(oldIndex)) {
        for (const newIndex of [oldIndex, oldIndex + this.capacity / 2]) {
          if (this.buckets[newIndex].length > 6) this.treeBins.add(newIndex)
        }
      }
    })
  }
}
