import { describe, it, expect } from 'vitest'
import { ConnectionPoolEngine } from '../simulationEngines/connectionPoolEngine'

const actions = (steps) => steps.map((s) => s.action)

describe('ConnectionPoolEngine', () => {
  it('starts with every connection available and an empty wait queue', () => {
    const pool = new ConnectionPoolEngine(3)

    expect(pool.connections).toHaveLength(3)
    expect(pool.connections.every((c) => c.status === 'AVAILABLE')).toBe(true)
    expect(pool.waitQueue).toEqual([])
    expect(pool.getActiveCount()).toBe(0)
  })

  describe('borrowing', () => {
    it('leases a free connection and records the borrower', () => {
      const pool = new ConnectionPoolEngine(2)
      const steps = pool.requestConnection('T1')

      expect(actions(steps)).toEqual(['THREAD_REQUEST', 'BORROW_SUCCESS'])
      const leased = pool.connections.find((c) => c.borrowedBy === 'T1')
      expect(leased.status).toBe('IN_USE')
      expect(pool.getActiveCount()).toBe(1)
    })

    it('hands out distinct connections to concurrent borrowers', () => {
      const pool = new ConnectionPoolEngine(3)
      pool.requestConnection('T1')
      pool.requestConnection('T2')

      const owners = pool.connections.filter((c) => c.status === 'IN_USE').map((c) => c.borrowedBy)
      expect(owners).toEqual(['T1', 'T2'])
      expect(new Set(owners).size).toBe(2)
    })

    it('queues a borrower once the pool is exhausted rather than over-leasing', () => {
      const pool = new ConnectionPoolEngine(2)
      pool.requestConnection('T1')
      pool.requestConnection('T2')

      const steps = pool.requestConnection('T3')

      expect(actions(steps)).toEqual(['THREAD_REQUEST', 'POOL_EXHAUSTED'])
      expect(pool.waitQueue).toEqual(['T3'])
      expect(pool.getActiveCount()).toBe(2) // never exceeds maxPoolSize
    })
  })

  describe('returning', () => {
    it('returns a connection to the pool when nobody is waiting', () => {
      const pool = new ConnectionPoolEngine(2)
      pool.requestConnection('T1')
      const leased = pool.connections.find((c) => c.borrowedBy === 'T1')

      const steps = pool.returnConnection(leased.id)

      expect(actions(steps)).toEqual(['RETURN_SUCCESS'])
      expect(leased.status).toBe('AVAILABLE')
      expect(leased.borrowedBy).toBeNull()
      expect(pool.getActiveCount()).toBe(0)
    })

    it('hands a returned connection straight to the next waiter instead of releasing it', () => {
      const pool = new ConnectionPoolEngine(1)
      pool.requestConnection('T1')
      pool.requestConnection('T2') // queued

      const steps = pool.returnConnection('Conn-1')

      expect(actions(steps)).toEqual(['CONNECTION_HANDOFF'])
      const conn = pool.connections[0]
      expect(conn.status).toBe('IN_USE') // stays leased through the handoff
      expect(conn.borrowedBy).toBe('T2')
      expect(pool.waitQueue).toEqual([])
    })

    it('drains the wait queue in FIFO order', () => {
      const pool = new ConnectionPoolEngine(1)
      pool.requestConnection('T1')
      pool.requestConnection('T2')
      pool.requestConnection('T3')
      expect(pool.waitQueue).toEqual(['T2', 'T3'])

      pool.returnConnection('Conn-1')
      expect(pool.connections[0].borrowedBy).toBe('T2')

      pool.returnConnection('Conn-1')
      expect(pool.connections[0].borrowedBy).toBe('T3')
      expect(pool.waitQueue).toEqual([])
    })

    it('ignores a return for an unknown or already-available connection', () => {
      const pool = new ConnectionPoolEngine(2)

      expect(pool.returnConnection('Conn-99')).toEqual([])
      expect(pool.returnConnection('Conn-1')).toEqual([]) // never borrowed
      expect(pool.getActiveCount()).toBe(0)
    })
  })

  it('snapshots state per step so replaying cannot mutate the pool', () => {
    const pool = new ConnectionPoolEngine(2)
    const steps = pool.requestConnection('T1')

    steps[0].state.connections[0].status = 'LEAKED'
    steps[0].state.waitQueue.push('ghost')

    expect(pool.connections[0].status).toBe('IN_USE')
    expect(pool.waitQueue).toEqual([])
  })
})
