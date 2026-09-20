import { describe, it, expect, beforeEach } from 'vitest'
import { EventDrivenMessagingEngine, MESSAGING_SCENARIOS } from '../simulationEngines/eventDrivenMessagingEngine'

describe('EventDrivenMessagingEngine', () => {
  let engine

  beforeEach(() => {
    engine = new EventDrivenMessagingEngine()
  })

  it('defaults to the happy-path scenario', () => {
    expect(engine.activeScenario).toBe('happy-path')
    expect(engine.steps.length).toBeGreaterThan(1)
  })

  it('exposes all 4 named scenarios', () => {
    expect(Object.keys(MESSAGING_SCENARIOS)).toEqual([
      'happy-path',
      'redelivery-duplicate',
      'broker-outage',
      'poison-message'
    ])
  })

  it('happy path: outbox row goes PENDING -> PUBLISHED and inventory is reserved exactly once', () => {
    engine.setScenario('happy-path')
    const first = engine.steps[0]
    const last = engine.steps[engine.steps.length - 1]

    expect(first.outboxStatus).toBe('PENDING')
    expect(last.outboxStatus).toBe('PUBLISHED')
    expect(last.inventoryReservedCount).toBe(1)
    expect(last.brokerQueue).toEqual([]) // acknowledged, removed from the broker
  })

  it('redelivery-duplicate: the outbox row stays PENDING through the crash, even though the broker already has the message', () => {
    engine.setScenario('redelivery-duplicate')
    const crashStep = engine.steps[1]

    expect(crashStep.outboxStatus).toBe('PENDING')
    expect(crashStep.brokerQueue).toContain('evt-4471-created')
  })

  it('redelivery-duplicate: the broker delivers the message twice, but the idempotency check keeps the side effect to exactly one reservation', () => {
    engine.setScenario('redelivery-duplicate')
    const republishStep = engine.steps.find(s => s.title.includes('republishes'))
    const lastStep = engine.steps[engine.steps.length - 1]

    // This is the core mechanic the topic teaches: at-least-once delivery means 2 copies
    // reach the broker queue, but the consumer's idempotency check must prevent the
    // downstream side effect (inventory reservation) from happening twice.
    expect(republishStep.brokerQueue).toEqual(['evt-4471-created', 'evt-4471-created'])
    expect(lastStep.inventoryReservedCount).toBe(1)
    expect(lastStep.idempotencyStore).toEqual(['evt-4471-created'])
  })

  it('broker-outage: the outbox row is retried while PENDING and never lost, eventually publishing once the broker recovers', () => {
    engine.setScenario('broker-outage')
    const outageSteps = engine.steps.filter(s => s.outboxStatus === 'PENDING')
    const lastStep = engine.steps[engine.steps.length - 1]

    expect(outageSteps.length).toBeGreaterThanOrEqual(2) // at least 2 failed publish attempts
    expect(lastStep.outboxStatus).toBe('PUBLISHED')
    expect(lastStep.brokerQueue).toContain('evt-4471-created')
  })

  it('broker-outage: retryCount increases monotonically and never resets mid-scenario', () => {
    engine.setScenario('broker-outage')
    const retryCounts = engine.steps.map(s => s.retryCount)
    for (let i = 1; i < retryCounts.length; i++) {
      expect(retryCounts[i]).toBeGreaterThanOrEqual(retryCounts[i - 1])
    }
  })

  it('poison-message: fails exactly MAX_CONSUMER_RETRIES times before routing to the DLQ, never retrying forever', () => {
    engine.setScenario('poison-message')
    const failureSteps = engine.steps.filter(s => s.title.includes('fails'))
    const lastStep = engine.steps[engine.steps.length - 1]

    expect(failureSteps.length).toBe(3)
    expect(lastStep.dlq).toEqual(['evt-9981-malformed'])
  })

  it('nextStep/prevStep/reset navigate stepIndex within bounds', () => {
    engine.setScenario('happy-path')
    const total = engine.steps.length

    for (let i = 0; i < total + 3; i++) engine.nextStep()
    expect(engine.getCurrentState().stepIndex).toBe(total - 1)
    expect(engine.getCurrentState().isLast).toBe(true)

    for (let i = 0; i < total + 3; i++) engine.prevStep()
    expect(engine.getCurrentState().stepIndex).toBe(0)
    expect(engine.getCurrentState().isFirst).toBe(true)

    engine.nextStep()
    engine.reset()
    expect(engine.getCurrentState().stepIndex).toBe(0)
  })

  it('setScenario resets stepIndex and regenerates steps for the new scenario', () => {
    engine.setScenario('happy-path')
    engine.nextStep()
    engine.nextStep()
    expect(engine.stepIndex).toBeGreaterThan(0)

    engine.setScenario('broker-outage')
    expect(engine.stepIndex).toBe(0)
    expect(engine.activeScenario).toBe('broker-outage')
  })

  it('ignores an unknown scenario id rather than corrupting state', () => {
    engine.setScenario('happy-path')
    const before = engine.steps.length
    engine.setScenario('not-a-real-scenario')
    expect(engine.activeScenario).toBe('happy-path')
    expect(engine.steps.length).toBe(before)
  })
})
