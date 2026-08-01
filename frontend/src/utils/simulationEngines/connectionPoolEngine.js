/**
 * HikariCP Connection Pool Simulation Engine
 * Simulates connection borrowing, leasing, wait queueing, and pool exhaustion timeouts.
 */

let nextThreadId = 1

export class ConnectionPoolEngine {
  constructor(maxPoolSize = 4) {
    this.maxPoolSize = maxPoolSize
    this.connections = Array.from({ length: maxPoolSize }, (_, i) => ({
      id: `Conn-${i + 1}`,
      status: 'AVAILABLE', // AVAILABLE, IN_USE, LEAKED
      borrowedBy: null,
      borrowTime: null
    }))
    this.waitQueue = []
  }

  cloneState() {
    return {
      maxPoolSize: this.maxPoolSize,
      connections: this.connections.map(c => ({ ...c })),
      waitQueue: [...this.waitQueue]
    }
  }

  requestConnection(threadName = `Thread-${nextThreadId++}`) {
    const steps = []

    steps.push({
      action: 'THREAD_REQUEST',
      description: `📥 ${threadName} requested a database connection from HikariCP pool.`,
      state: this.cloneState()
    })

    const freeConn = this.connections.find(c => c.status === 'AVAILABLE')

    if (freeConn) {
      freeConn.status = 'IN_USE'
      freeConn.borrowedBy = threadName
      freeConn.borrowTime = Date.now()

      steps.push({
        action: 'BORROW_SUCCESS',
        description: `✅ ${threadName} borrowed ${freeConn.id} from pool. (Active connections: ${this.getActiveCount()}/${this.maxPoolSize}).`,
        state: this.cloneState()
      })
    } else {
      this.waitQueue.push(threadName)
      steps.push({
        action: 'POOL_EXHAUSTED',
        description: `⚠️ Pool EXHAUSTED (${this.maxPoolSize}/${this.maxPoolSize} in use)! ${threadName} placed in FIFO Wait Queue.`,
        state: this.cloneState()
      })
    }

    return steps
  }

  returnConnection(connId) {
    const steps = []
    const conn = this.connections.find(c => c.id === connId)
    if (!conn || conn.status === 'AVAILABLE') return steps

    const returningThread = conn.borrowedBy

    if (this.waitQueue.length > 0) {
      const nextThread = this.waitQueue.shift()
      conn.borrowedBy = nextThread
      conn.borrowTime = Date.now()

      steps.push({
        action: 'CONNECTION_HANDOFF',
        description: `🔄 ${returningThread} returned ${conn.id}. Immediately handed off to waiting ${nextThread}!`,
        state: this.cloneState()
      })
    } else {
      conn.status = 'AVAILABLE'
      conn.borrowedBy = null
      conn.borrowTime = null

      steps.push({
        action: 'RETURN_SUCCESS',
        description: `✅ ${returningThread} returned ${conn.id} to pool. Connection is now AVAILABLE.`,
        state: this.cloneState()
      })
    }

    return steps
  }

  getActiveCount() {
    return this.connections.filter(c => c.status === 'IN_USE' || c.status === 'LEAKED').length
  }
}
