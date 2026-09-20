import { describe, it, expect, beforeEach } from 'vitest'
import {
  CircuitBreakerEngine,
  CIRCUIT_BREAKER_SCENARIOS,
  evaluateFailureRate
} from '../simulationEngines/circuitBreakerEngine'

describe('evaluateFailureRate (pure sliding-window math)', () => {
  it('does not evaluate a rate below the minimum number of calls', () => {
    const result = evaluateFailureRate(['FAIL', 'FAIL', 'FAIL', 'FAIL'])
    expect(result.total).toBe(4)
    expect(result.ratePercent).toBeNull()
    expect(result.tripsBreaker).toBe(false)
  })

  it('matches the curriculum worked example: 5 failures in 9 calls trips at ~55.6%', () => {
    const outcomes = ['OK', 'OK', 'OK', 'OK', 'FAIL', 'FAIL', 'FAIL', 'FAIL', 'FAIL']
    const result = evaluateFailureRate(outcomes)
    expect(result.total).toBe(9)
    expect(result.failures).toBe(5)
    expect(result.ratePercent).toBeCloseTo(55.56, 1)
    expect(result.tripsBreaker).toBe(true)
  })

  it('does not trip when the failure rate stays under the threshold', () => {
    const outcomes = ['OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'FAIL', 'FAIL']
    const result = evaluateFailureRate(outcomes)
    expect(result.total).toBe(9)
    expect(result.ratePercent).toBeCloseTo(22.22, 1)
    expect(result.tripsBreaker).toBe(false)
  })

  it('only evaluates the most recent 10 calls (the sliding window), not the full history', () => {
    const outcomes = ['FAIL', 'FAIL', 'FAIL', 'FAIL', 'FAIL', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK']
    const result = evaluateFailureRate(outcomes)
    // Window drops the oldest FAIL, leaving 4 fails / 10 calls = 40%, not 5/11.
    expect(result.total).toBe(10)
    expect(result.failures).toBe(4)
    expect(result.tripsBreaker).toBe(false)
  })
})

describe('CircuitBreakerEngine', () => {
  let engine

  beforeEach(() => {
    engine = new CircuitBreakerEngine()
  })

  it('defaults to the healthy-service scenario', () => {
    expect(engine.activeScenario).toBe('healthy-service')
  })

  it('exposes all 4 named scenarios', () => {
    expect(Object.keys(CIRCUIT_BREAKER_SCENARIOS)).toEqual([
      'healthy-service',
      'failure-spike',
      'recovery',
      'failed-recovery'
    ])
  })

  it('healthy-service: breaker never trips, every call reaches the network', () => {
    engine.setScenario('healthy-service')
    const states = engine.steps.map(s => s.state)
    const rejections = engine.steps.filter(s => s.rejected)

    expect(states.every(state => state === 'CLOSED')).toBe(true)
    expect(rejections.length).toBe(0)
  })

  it('failure-spike: trips to OPEN at call 9, matching the curriculum worked example exactly', () => {
    engine.setScenario('failure-spike')
    const call9 = engine.steps.find(s => s.callNumber === 9)
    const call8 = engine.steps.find(s => s.callNumber === 8)

    expect(call8.state).toBe('CLOSED')
    expect(call9.state).toBe('OPEN')
    expect(call9.failureRatePercent).toBeCloseTo(55.56, 1)
  })

  it('failure-spike: call 10 is rejected fast, never reaching the (still-simulated) network', () => {
    engine.setScenario('failure-spike')
    const call10 = engine.steps.find(s => s.callNumber === 10)

    expect(call10.rejected).toBe(true)
    expect(call10.state).toBe('OPEN')
  })

  it('failure-spike: once OPEN, the breaker never re-closes on its own within the same call sequence', () => {
    engine.setScenario('failure-spike')
    const postTripSteps = engine.steps.filter(s => s.callNumber >= 9)
    expect(postTripSteps.every(s => s.state === 'OPEN')).toBe(true)
  })

  it('recovery: OPEN -> HALF_OPEN -> CLOSED once all probe calls succeed', () => {
    engine.setScenario('recovery')
    const states = engine.steps.map(s => s.state)

    expect(states[0]).toBe('OPEN')
    expect(states).toContain('HALF_OPEN')
    expect(states[states.length - 1]).toBe('CLOSED')
  })

  it('recovery: probe calls before the last one stay HALF_OPEN, not CLOSED prematurely', () => {
    engine.setScenario('recovery')
    const probeSteps = engine.steps.filter(s => s.probeIndex > 0)
    expect(probeSteps[0].state).toBe('HALF_OPEN')
    expect(probeSteps[probeSteps.length - 1].state).toBe('CLOSED')
  })

  it('failed-recovery: OPEN -> HALF_OPEN -> OPEN again after a single failed probe', () => {
    engine.setScenario('failed-recovery')
    const states = engine.steps.map(s => s.state)

    expect(states[0]).toBe('OPEN')
    expect(states).toContain('HALF_OPEN')
    expect(states[states.length - 1]).toBe('OPEN')
    expect(engine.steps[engine.steps.length - 1].outcome).toBe('FAIL')
  })

  it('nextStep/prevStep/reset navigate stepIndex within bounds', () => {
    engine.setScenario('failure-spike')
    const total = engine.steps.length

    for (let i = 0; i < total + 3; i++) engine.nextStep()
    expect(engine.getCurrentState().isLast).toBe(true)

    for (let i = 0; i < total + 3; i++) engine.prevStep()
    expect(engine.getCurrentState().isFirst).toBe(true)

    engine.nextStep()
    engine.reset()
    expect(engine.getCurrentState().stepIndex).toBe(0)
  })

  it('setScenario resets stepIndex and regenerates steps', () => {
    engine.setScenario('failure-spike')
    engine.nextStep()
    engine.nextStep()
    expect(engine.stepIndex).toBeGreaterThan(0)

    engine.setScenario('recovery')
    expect(engine.stepIndex).toBe(0)
    expect(engine.activeScenario).toBe('recovery')
  })

  it('ignores an unknown scenario id rather than corrupting state', () => {
    engine.setScenario('failure-spike')
    const before = engine.steps.length
    engine.setScenario('not-a-real-scenario')
    expect(engine.activeScenario).toBe('failure-spike')
    expect(engine.steps.length).toBe(before)
  })
})
