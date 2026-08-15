import { describe, it, expect } from 'vitest'
import { simulateTokenBucket, simulateLeakyBucket } from '../trafficShapingEngine'

describe('trafficShapingEngine', () => {
  describe('simulateTokenBucket', () => {
    it('should add tokens up to capacity and transmit packets that have tokens', () => {
      // currentTokens = 0, capacity = 10, rate = 5, incoming = 3
      const step1 = simulateTokenBucket(0, 10, 5, 3)
      expect(step1.transmitted).toBe(3)
      expect(step1.dropped).toBe(0)
      expect(step1.tokens).toBe(2) // 5 added - 3 consumed = 2

      // burst exceeding available tokens: currentTokens = 2, capacity = 10, rate = 3, incoming = 8
      const step2 = simulateTokenBucket(2, 10, 3, 8)
      // total tokens available = 2 + 3 = 5
      expect(step2.transmitted).toBe(5)
      expect(step2.dropped).toBe(3)
      expect(step2.tokens).toBe(0)
    })
  })

  describe('simulateLeakyBucket', () => {
    it('should queue burst in buffer and leak packets at constant fixed rate', () => {
      // currentBuffer = 0, capacity = 10, leakRate = 3, incoming = 8
      const step1 = simulateLeakyBucket(0, 10, 3, 8)
      expect(step1.accepted).toBe(8)
      expect(step1.transmitted).toBe(3)
      expect(step1.dropped).toBe(0)
      expect(step1.buffer).toBe(5) // 8 - 3 = 5

      // next tick with 0 incoming packets: drains 3 more
      const step2 = simulateLeakyBucket(step1.buffer, 10, 3, 0)
      expect(step2.transmitted).toBe(3)
      expect(step2.buffer).toBe(2) // 5 - 3 = 2
    })

    it('should drop incoming packets that exceed buffer capacity', () => {
      // currentBuffer = 8, capacity = 10, leakRate = 2, incoming = 6
      const step = simulateLeakyBucket(8, 10, 2, 6)
      expect(step.accepted).toBe(2) // only 2 spots free (10 - 8)
      expect(step.dropped).toBe(4) // 6 - 2 = 4 dropped
      expect(step.transmitted).toBe(2)
      expect(step.buffer).toBe(8) // (8 + 2) - 2 = 8
    })
  })
})
