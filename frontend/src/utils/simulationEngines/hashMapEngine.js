/**
 * HashMap & ConcurrentHashMap Simulation Engine
 * Handles hash bucket indexing, collision linked-list chaining, treeification at 8 elements, and resize.
 */

export class HashMapEngine {
  constructor(initialCapacity = 8, loadFactor = 0.75) {
    this.capacity = initialCapacity
    this.loadFactor = loadFactor
    this.buckets = Array.from({ length: initialCapacity }, () => [])
    this.size = 0
  }

  cloneState() {
    return {
      capacity: this.capacity,
      loadFactor: this.loadFactor,
      size: this.size,
      threshold: Math.floor(this.capacity * this.loadFactor),
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
    return Math.abs(hash)
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
      description: `Key "${key}" ➔ hashCode = ${rawHash}. Target bucket = (capacity - 1) & hash = ${bucketIdx}.`,
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

    // Check treeification (>= 8 elements in chain)
    if (bucket.length >= 8) {
      steps.push({
        action: 'TREEIFY_TRIGGERED',
        description: `🌳 Bucket #${bucketIdx} reached 8 elements! Linked-list converted into Red-Black Tree for O(log N) lookup.`,
        highlightBucket: bucketIdx,
        state: this.cloneState()
      })
    }

    // Check resize threshold
    const threshold = Math.floor(this.capacity * this.loadFactor)
    if (this.size > threshold) {
      steps.push({
        action: 'RESIZE_TRIGGERED',
        description: `⚠️ HashMap size (${this.size}) > Threshold (${threshold}). Doubling array capacity to ${this.capacity * 2} and rehashing all entries!`,
        highlightBucket: bucketIdx,
        state: this.cloneState()
      })
      this.resize()
      steps.push({
        action: 'RESIZE_COMPLETE',
        description: `✅ Array capacity doubled to ${this.capacity}. Rehashed all keys into new bucket indices.`,
        highlightBucket: null,
        state: this.cloneState()
      })
    }

    return steps
  }

  resize() {
    const oldBuckets = this.buckets
    this.capacity *= 2
    this.buckets = Array.from({ length: this.capacity }, () => [])
    this.size = 0

    oldBuckets.forEach(b => {
      b.forEach(node => {
        const newIdx = (this.capacity - 1) & node.hash
        this.buckets[newIdx].push(node)
        this.size++
      })
    })
  }
}
