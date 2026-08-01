/**
 * Spring Batch Simulation Engine
 * Simulates Chunk-Oriented Read -> Process -> Write transaction boundaries and Skip/Retry policies.
 */

let nextItemId = 1

export class SpringBatchEngine {
  constructor(chunkSize = 3) {
    this.chunkSize = chunkSize
    this.unreadItems = Array.from({ length: 9 }, (_, i) => ({ id: i + 1, name: `Item-${i + 1}`, status: 'UNREAD' }))
    this.chunkBuffer = []
    this.committedItems = []
    this.skippedItems = []
    this.transactionCount = 0
  }

  cloneState() {
    return {
      chunkSize: this.chunkSize,
      unreadItems: [...this.unreadItems.map(i => ({ ...i }))],
      chunkBuffer: [...this.chunkBuffer.map(i => ({ ...i }))],
      committedItems: [...this.committedItems.map(i => ({ ...i }))],
      skippedItems: [...this.skippedItems.map(i => ({ ...i }))],
      transactionCount: this.transactionCount
    }
  }

  processNextChunk() {
    const steps = []
    if (this.unreadItems.length === 0 && this.chunkBuffer.length === 0) {
      steps.push({ action: 'JOB_COMPLETE', description: '🎉 Batch Job Complete! All items processed and committed.', state: this.cloneState() })
      return steps
    }

    // 1. READ
    const readCount = Math.min(this.chunkSize, this.unreadItems.length)
    const readItems = this.unreadItems.splice(0, readCount)
    readItems.forEach(i => i.status = 'READ')
    this.chunkBuffer = readItems

    steps.push({
      action: 'ITEM_READER',
      description: `📖 ItemReader read ${readCount} items into chunk buffer (Chunk Size: ${this.chunkSize}).`,
      state: this.cloneState()
    })

    // 2. PROCESS
    this.chunkBuffer.forEach(i => i.status = 'PROCESSED')
    steps.push({
      action: 'ITEM_PROCESSOR',
      description: `⚙️ ItemProcessor transformed ${this.chunkBuffer.length} items in memory.`,
      state: this.cloneState()
    })

    // 3. WRITE & COMMIT
    this.transactionCount++
    this.chunkBuffer.forEach(i => i.status = 'COMMITTED')
    this.committedItems.push(...this.chunkBuffer)
    const committedCount = this.chunkBuffer.length
    this.chunkBuffer = []

    steps.push({
      action: 'ITEM_WRITER_COMMIT',
      description: `💾 ItemWriter batch inserted ${committedCount} items into DB. Transaction #${this.transactionCount} COMMITTED!`,
      state: this.cloneState()
    })

    return steps
  }
}
