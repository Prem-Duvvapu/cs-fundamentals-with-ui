/**
 * Circuit Breaker Engine (Resilience4j-style)
 * Simulates the CLOSED -> OPEN -> HALF_OPEN state machine driven by a count-based sliding
 * window of call outcomes, matching the worked example in the event-driven-messaging /
 * microservices-patterns curriculum: windowSize=10, threshold=50%, minimumNumberOfCalls=9.
 */

export const CIRCUIT_BREAKER_SCENARIOS = {
  'healthy-service': {
    id: 'healthy-service',
    name: 'Healthy Service',
    description: 'Every call succeeds — the breaker stays CLOSED and never evaluates a trip.'
  },
  'failure-spike': {
    id: 'failure-spike',
    name: 'Failure Spike',
    description: 'Calls 1-4 succeed, then 5-9 fail. The failure rate crosses the threshold before the window even fills, tripping the breaker OPEN.'
  },
  recovery: {
    id: 'recovery',
    name: 'Recovery',
    description: 'An already-OPEN breaker waits out its timer, moves to HALF_OPEN, and closes again once its probe calls succeed.'
  },
  'failed-recovery': {
    id: 'failed-recovery',
    name: 'Failed Recovery',
    description: 'An already-OPEN breaker moves to HALF_OPEN, but its first probe call fails — it reopens immediately rather than closing.'
  }
}

const SLIDING_WINDOW_SIZE = 10
const FAILURE_RATE_THRESHOLD = 50
const MINIMUM_NUMBER_OF_CALLS = 9
const PERMITTED_CALLS_IN_HALF_OPEN = 3

// Pure, independently-testable: the actual failure-rate math the breaker decides on.
export function evaluateFailureRate(callOutcomes) {
  const window = callOutcomes.slice(-SLIDING_WINDOW_SIZE)
  const total = window.length
  if (total < MINIMUM_NUMBER_OF_CALLS) {
    return { total, failures: 0, ratePercent: null, tripsBreaker: false }
  }
  const failures = window.filter(outcome => outcome === 'FAIL').length
  const ratePercent = (failures / total) * 100
  return { total, failures, ratePercent, tripsBreaker: ratePercent >= FAILURE_RATE_THRESHOLD }
}

export class CircuitBreakerEngine {
  constructor() {
    this.activeScenario = 'healthy-service'
    this.stepIndex = 0
    this.steps = this.generateSteps()
  }

  setScenario(scenarioId) {
    if (CIRCUIT_BREAKER_SCENARIOS[scenarioId]) {
      this.activeScenario = scenarioId
      this.stepIndex = 0
      this.steps = this.generateSteps()
    }
    return this.getCurrentState()
  }

  getCurrentState() {
    const currentStep = this.steps[this.stepIndex] || this.steps[0]
    return {
      activeScenario: this.activeScenario,
      scenarioMeta: CIRCUIT_BREAKER_SCENARIOS[this.activeScenario],
      stepIndex: this.stepIndex,
      totalSteps: this.steps.length,
      stepData: currentStep,
      isFirst: this.stepIndex === 0,
      isLast: this.stepIndex === this.steps.length - 1
    }
  }

  nextStep() {
    if (this.stepIndex < this.steps.length - 1) this.stepIndex++
    return this.getCurrentState()
  }

  prevStep() {
    if (this.stepIndex > 0) this.stepIndex--
    return this.getCurrentState()
  }

  reset() {
    this.stepIndex = 0
    return this.getCurrentState()
  }

  generateSteps() {
    switch (this.activeScenario) {
      case 'failure-spike':
        return this._callSequenceSteps(['OK', 'OK', 'OK', 'OK', 'FAIL', 'FAIL', 'FAIL', 'FAIL', 'FAIL', 'OK'])
      case 'recovery':
        return this._recoverySteps({ probesSucceed: true })
      case 'failed-recovery':
        return this._recoverySteps({ probesSucceed: false })
      default:
        return this._callSequenceSteps(['OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK'])
    }
  }

  // Drives CLOSED -> (possibly) OPEN purely from a scripted sequence of call outcomes,
  // re-deriving the trip decision from evaluateFailureRate() rather than hardcoding it.
  _callSequenceSteps(outcomes) {
    const steps = [
      {
        callNumber: 0,
        state: 'CLOSED',
        outcome: null,
        rejected: false,
        callOutcomes: [],
        failureRatePercent: null,
        explanation: `Breaker starts CLOSED. Sliding window size ${SLIDING_WINDOW_SIZE}, threshold ${FAILURE_RATE_THRESHOLD}%, minimum ${MINIMUM_NUMBER_OF_CALLS} calls before any evaluation.`
      }
    ]

    const callOutcomes = []
    let state = 'CLOSED'

    outcomes.forEach((outcome, idx) => {
      const callNumber = idx + 1

      if (state === 'OPEN') {
        // Breaker already tripped — this call never reaches the network.
        steps.push({
          callNumber,
          state,
          outcome: null,
          rejected: true,
          callOutcomes: [...callOutcomes],
          failureRatePercent: evaluateFailureRate(callOutcomes).ratePercent,
          explanation: `Call ${callNumber} rejected immediately (CallNotPermittedException) — the breaker is OPEN and never attempts the network call.`
        })
        return
      }

      callOutcomes.push(outcome)
      const evaluation = evaluateFailureRate(callOutcomes)

      if (evaluation.tripsBreaker) {
        state = 'OPEN'
        steps.push({
          callNumber,
          state,
          outcome,
          rejected: false,
          callOutcomes: [...callOutcomes],
          failureRatePercent: evaluation.ratePercent,
          explanation: `Call ${callNumber} ${outcome === 'OK' ? 'succeeded' : 'failed'}. Failure rate over the last ${evaluation.total} calls is ${evaluation.ratePercent.toFixed(1)}% — at or above the ${FAILURE_RATE_THRESHOLD}% threshold, so the breaker trips OPEN.`
        })
      } else {
        steps.push({
          callNumber,
          state,
          outcome,
          rejected: false,
          callOutcomes: [...callOutcomes],
          failureRatePercent: evaluation.ratePercent,
          explanation: evaluation.ratePercent === null
            ? `Call ${callNumber} ${outcome === 'OK' ? 'succeeded' : 'failed'}. Only ${evaluation.total} call(s) recorded — below the minimum of ${MINIMUM_NUMBER_OF_CALLS}, so no rate is evaluated yet.`
            : `Call ${callNumber} ${outcome === 'OK' ? 'succeeded' : 'failed'}. Failure rate over the last ${evaluation.total} calls is ${evaluation.ratePercent.toFixed(1)}% — below the ${FAILURE_RATE_THRESHOLD}% threshold, breaker stays CLOSED.`
        })
      }
    })

    return steps
  }

  _recoverySteps({ probesSucceed }) {
    const steps = [
      {
        callNumber: 0,
        state: 'OPEN',
        outcome: null,
        rejected: false,
        probeIndex: 0,
        explanation: 'Breaker is already OPEN from a prior outage — every call fails fast without reaching the network.'
      },
      {
        callNumber: 0,
        state: 'HALF_OPEN',
        outcome: null,
        rejected: false,
        probeIndex: 0,
        explanation: `The wait duration has elapsed. The breaker moves to HALF_OPEN and will permit ${PERMITTED_CALLS_IN_HALF_OPEN} probe calls through to test recovery.`
      }
    ]

    if (probesSucceed) {
      for (let i = 1; i <= PERMITTED_CALLS_IN_HALF_OPEN; i++) {
        const isLastProbe = i === PERMITTED_CALLS_IN_HALF_OPEN
        steps.push({
          callNumber: i,
          state: isLastProbe ? 'CLOSED' : 'HALF_OPEN',
          outcome: 'OK',
          rejected: false,
          probeIndex: i,
          explanation: isLastProbe
            ? `Probe call ${i} of ${PERMITTED_CALLS_IN_HALF_OPEN} succeeded. All probes succeeded — the breaker closes and the sliding window resets.`
            : `Probe call ${i} of ${PERMITTED_CALLS_IN_HALF_OPEN} succeeded. Still gathering probe results before deciding.`
        })
      }
    } else {
      steps.push({
        callNumber: 1,
        state: 'OPEN',
        outcome: 'FAIL',
        rejected: false,
        probeIndex: 1,
        explanation: 'Probe call 1 failed. Even one failed probe in HALF_OPEN reopens the breaker immediately — the wait-duration timer restarts.'
      })
    }

    return steps
  }
}
