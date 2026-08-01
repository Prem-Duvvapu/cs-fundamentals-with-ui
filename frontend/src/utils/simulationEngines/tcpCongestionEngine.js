/**
 * TCP Congestion Control Engine
 * Simulates cwnd (Congestion Window) dynamics across Slow Start, Congestion Avoidance, and Fast Recovery / Loss Collapse.
 */

export class TcpCongestionEngine {
  constructor(algo = 'Reno', initialSsthresh = 16) {
    this.algo = algo
    this.cwnd = 1
    this.ssthresh = initialSsthresh
    this.rtt = 0
    this.phase = 'SLOW_START' // SLOW_START, CONGESTION_AVOIDANCE, RECOVERY
    this.history = [{ rtt: 0, cwnd: 1, ssthresh: initialSsthresh, phase: 'SLOW_START' }]
  }

  cloneState() {
    return {
      algo: this.algo,
      cwnd: this.cwnd,
      ssthresh: this.ssthresh,
      rtt: this.rtt,
      phase: this.phase,
      history: [...this.history.map(h => ({ ...h }))]
    }
  }

  nextRtt() {
    const steps = []
    this.rtt++

    if (this.phase === 'SLOW_START') {
      // Exponential growth: cwnd doubles every RTT
      this.cwnd *= 2
      if (this.cwnd >= this.ssthresh) {
        this.phase = 'CONGESTION_AVOIDANCE'
        steps.push({
          action: 'SSTHRESH_REACHED',
          description: `📈 RTT #${this.rtt}: cwnd (${this.cwnd} MSS) reached ssthresh (${this.ssthresh} MSS). Transitioning to CONGESTION AVOIDANCE (linear growth +1 MSS/RTT).`,
          state: this.cloneState()
        })
      } else {
        steps.push({
          action: 'SLOW_START_GROWTH',
          description: `🚀 RTT #${this.rtt}: SLOW START exponential doubling. cwnd doubled to ${this.cwnd} MSS packets in flight.`,
          state: this.cloneState()
        })
      }
    } else if (this.phase === 'CONGESTION_AVOIDANCE') {
      // Linear growth: cwnd increases by +1 per RTT
      this.cwnd += 1
      steps.push({
        action: 'AIMD_LINEAR_GROWTH',
        description: `📈 RTT #${this.rtt}: CONGESTION AVOIDANCE linear probe (+1 MSS). cwnd increased to ${this.cwnd} MSS packets.`,
        state: this.cloneState()
      })
    }

    this.history.push({ rtt: this.rtt, cwnd: this.cwnd, ssthresh: this.ssthresh, phase: this.phase })
    return steps
  }

  triggerLoss() {
    const steps = []
    this.rtt++

    const oldCwnd = this.cwnd
    this.ssthresh = Math.max(2, Math.floor(this.cwnd / 2))

    if (this.algo === 'Tahoe') {
      this.cwnd = 1
      this.phase = 'SLOW_START'
      steps.push({
        action: 'PACKET_LOSS_TAHOE',
        description: `🔥 RTT #${this.rtt}: PACKET LOSS DETECTED! TCP Tahoe set ssthresh = ${this.ssthresh} MSS and collapsed cwnd to 1 MSS (Full Slow Start restart).`,
        state: this.cloneState()
      })
    } else {
      // Reno Fast Recovery: halve cwnd
      this.cwnd = this.ssthresh
      this.phase = 'CONGESTION_AVOIDANCE'
      steps.push({
        action: 'PACKET_LOSS_RENO',
        description: `⚡ RTT #${this.rtt}: PACKET LOSS DETECTED! TCP Reno Fast Recovery set ssthresh = ${this.ssthresh} MSS and halved cwnd to ${this.cwnd} MSS.`,
        state: this.cloneState()
      })
    }

    this.history.push({ rtt: this.rtt, cwnd: this.cwnd, ssthresh: this.ssthresh, phase: this.phase })
    return steps
  }
}
