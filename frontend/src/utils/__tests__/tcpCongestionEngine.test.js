import { describe, it, expect } from 'vitest'
import { TcpCongestionEngine } from '../simulationEngines/tcpCongestionEngine'

const actions = (steps) => steps.map((s) => s.action)

describe('TcpCongestionEngine', () => {
  it('opens in slow start with cwnd = 1 MSS and a seeded history point', () => {
    const tcp = new TcpCongestionEngine('Reno', 16)

    expect(tcp.cwnd).toBe(1)
    expect(tcp.ssthresh).toBe(16)
    expect(tcp.phase).toBe('SLOW_START')
    expect(tcp.history).toEqual([{ rtt: 0, cwnd: 1, ssthresh: 16, phase: 'SLOW_START' }])
  })

  describe('slow start', () => {
    it('doubles cwnd every RTT', () => {
      const tcp = new TcpCongestionEngine('Reno', 64)

      tcp.nextRtt()
      expect(tcp.cwnd).toBe(2)
      tcp.nextRtt()
      expect(tcp.cwnd).toBe(4)
      tcp.nextRtt()
      expect(tcp.cwnd).toBe(8)
      expect(tcp.phase).toBe('SLOW_START')
    })

    it('switches to congestion avoidance when cwnd reaches ssthresh', () => {
      const tcp = new TcpCongestionEngine('Reno', 8)

      tcp.nextRtt() // 2
      tcp.nextRtt() // 4
      const steps = tcp.nextRtt() // 8 == ssthresh

      expect(actions(steps)).toContain('SSTHRESH_REACHED')
      expect(tcp.cwnd).toBe(8)
      expect(tcp.phase).toBe('CONGESTION_AVOIDANCE')
    })
  })

  describe('congestion avoidance', () => {
    it('grows cwnd linearly by 1 MSS per RTT (the AI of AIMD)', () => {
      const tcp = new TcpCongestionEngine('Reno', 4)
      tcp.nextRtt() // 2
      tcp.nextRtt() // 4 -> congestion avoidance
      expect(tcp.phase).toBe('CONGESTION_AVOIDANCE')

      const steps = tcp.nextRtt()
      expect(actions(steps)).toContain('AIMD_LINEAR_GROWTH')
      expect(tcp.cwnd).toBe(5)

      tcp.nextRtt()
      expect(tcp.cwnd).toBe(6)
    })
  })

  describe('loss response', () => {
    it('Reno halves cwnd and stays in congestion avoidance (fast recovery)', () => {
      const tcp = new TcpCongestionEngine('Reno', 64)
      tcp.nextRtt() // 2
      tcp.nextRtt() // 4
      tcp.nextRtt() // 8

      const steps = tcp.triggerLoss()

      expect(actions(steps)).toContain('PACKET_LOSS_RENO')
      expect(tcp.ssthresh).toBe(4) // floor(8 / 2)
      expect(tcp.cwnd).toBe(4) // cwnd drops to the new ssthresh, not to 1
      expect(tcp.phase).toBe('CONGESTION_AVOIDANCE')
    })

    it('Tahoe collapses cwnd to 1 and restarts slow start', () => {
      const tcp = new TcpCongestionEngine('Tahoe', 64)
      tcp.nextRtt() // 2
      tcp.nextRtt() // 4
      tcp.nextRtt() // 8

      const steps = tcp.triggerLoss()

      expect(actions(steps)).toContain('PACKET_LOSS_TAHOE')
      expect(tcp.ssthresh).toBe(4) // both algorithms halve ssthresh
      expect(tcp.cwnd).toBe(1) // ...but Tahoe restarts from 1
      expect(tcp.phase).toBe('SLOW_START')
    })

    it('never drops ssthresh below 2 MSS', () => {
      const tcp = new TcpCongestionEngine('Reno', 16)
      expect(tcp.cwnd).toBe(1)

      tcp.triggerLoss() // floor(1/2) = 0, clamped to 2

      expect(tcp.ssthresh).toBe(2)
    })

    it('resumes exponential growth after a Tahoe collapse', () => {
      const tcp = new TcpCongestionEngine('Tahoe', 64)
      tcp.nextRtt()
      tcp.nextRtt()
      tcp.nextRtt() // cwnd 8
      tcp.triggerLoss() // cwnd 1, ssthresh 4

      tcp.nextRtt()
      expect(tcp.cwnd).toBe(2)
      tcp.nextRtt()
      expect(tcp.cwnd).toBe(4)
      expect(tcp.phase).toBe('CONGESTION_AVOIDANCE') // reached the new ssthresh
    })
  })

  describe('history', () => {
    it('appends one plottable point per RTT, including the loss event', () => {
      const tcp = new TcpCongestionEngine('Reno', 8)
      tcp.nextRtt()
      tcp.nextRtt()
      tcp.triggerLoss()

      expect(tcp.history).toHaveLength(4) // seed + 2 RTTs + loss
      expect(tcp.history.map((h) => h.rtt)).toEqual([0, 1, 2, 3])
      expect(tcp.history.at(-1).cwnd).toBe(tcp.cwnd)
      expect(tcp.history.at(-1).ssthresh).toBe(tcp.ssthresh)
    })

    it('advances the RTT counter on both growth and loss', () => {
      const tcp = new TcpCongestionEngine('Reno', 8)
      tcp.nextRtt()
      expect(tcp.rtt).toBe(1)
      tcp.triggerLoss()
      expect(tcp.rtt).toBe(2)
    })
  })

  it('snapshots state per step so replaying cannot mutate the engine', () => {
    const tcp = new TcpCongestionEngine('Reno', 8)
    const steps = tcp.nextRtt()

    steps[0].state.cwnd = 9999
    steps[0].state.history.push({ rtt: 99 })

    expect(tcp.cwnd).toBe(2)
    expect(tcp.history).toHaveLength(2)
  })
})
