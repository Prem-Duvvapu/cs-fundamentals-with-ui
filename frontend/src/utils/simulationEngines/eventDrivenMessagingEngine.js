/**
 * Event-Driven Messaging Engine
 * Simulates the transactional outbox pattern: atomic DB+outbox writes, a poller relaying
 * pending rows to a broker, at-least-once redelivery, and idempotent-consumer dedup.
 */

export const MESSAGING_SCENARIOS = {
  'happy-path': {
    id: 'happy-path',
    name: 'Happy Path',
    description: 'Outbox write, poller publish, single delivery, single processing.'
  },
  'redelivery-duplicate': {
    id: 'redelivery-duplicate',
    name: 'Crash & Redelivery',
    description: 'The poller crashes after publishing but before marking the row published, causing a duplicate broker delivery — the idempotency check prevents a duplicate side effect.'
  },
  'broker-outage': {
    id: 'broker-outage',
    name: 'Broker Outage & Retry',
    description: 'The broker is unreachable for two poll cycles; the outbox row stays PENDING and is retried until the broker recovers.'
  },
  'poison-message': {
    id: 'poison-message',
    name: 'Poison Message → DLQ',
    description: 'The consumer repeatedly fails to process a message; after the retry budget is exhausted, it is routed to the dead-letter queue instead of retried forever.'
  }
}

const MAX_CONSUMER_RETRIES = 3

export class EventDrivenMessagingEngine {
  constructor() {
    this.activeScenario = 'happy-path'
    this.stepIndex = 0
    this.steps = this.generateSteps()
  }

  setScenario(scenarioId) {
    if (MESSAGING_SCENARIOS[scenarioId]) {
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
      scenarioMeta: MESSAGING_SCENARIOS[this.activeScenario],
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
      case 'redelivery-duplicate':
        return this._redeliveryDuplicateSteps()
      case 'broker-outage':
        return this._brokerOutageSteps()
      case 'poison-message':
        return this._poisonMessageSteps()
      default:
        return this._happyPathSteps()
    }
  }

  _happyPathSteps() {
    const eventId = 'evt-4471-created'
    const idempotencyStore = []
    let inventoryReservedCount = 0

    const steps = [
      {
        title: 'Order created — one atomic DB transaction',
        outboxStatus: 'PENDING',
        brokerQueue: [],
        idempotencyStore: [...idempotencyStore],
        inventoryReservedCount,
        explanation: 'orders row and outbox_message row (status PENDING) are written in the same transaction — either both exist or neither does.'
      }
    ]

    steps.push({
      title: 'Poller publishes the pending row',
      outboxStatus: 'PUBLISHED',
      brokerQueue: [eventId],
      idempotencyStore: [...idempotencyStore],
      inventoryReservedCount,
      explanation: 'The poller reads the PENDING row, sends it to the broker, receives an ack, and marks the row PUBLISHED.'
    })

    steps.push({
      title: 'Consumer receives the message',
      outboxStatus: 'PUBLISHED',
      brokerQueue: [eventId],
      idempotencyStore: [...idempotencyStore],
      inventoryReservedCount,
      explanation: `Consumer checks the idempotency store for "${eventId}" — not present, so this is a new event.`
    })

    idempotencyStore.push(eventId)
    inventoryReservedCount += 1
    steps.push({
      title: 'Consumer processes and acknowledges',
      outboxStatus: 'PUBLISHED',
      brokerQueue: [],
      idempotencyStore: [...idempotencyStore],
      inventoryReservedCount,
      explanation: 'Inventory reserved once, the event id recorded, and the message acknowledged (removed from the broker) in the same transaction.'
    })

    return steps
  }

  _redeliveryDuplicateSteps() {
    const eventId = 'evt-4471-created'
    const idempotencyStore = []
    let inventoryReservedCount = 0

    const steps = [
      {
        title: 'Order created — one atomic DB transaction',
        outboxStatus: 'PENDING',
        brokerQueue: [],
        idempotencyStore: [...idempotencyStore],
        inventoryReservedCount,
        explanation: 'orders row and outbox_message row (status PENDING) committed together.'
      },
      {
        title: 'Poller publishes, then crashes before marking PUBLISHED',
        outboxStatus: 'PENDING', // still PENDING in the DB even though the broker already has it
        brokerQueue: [eventId],
        idempotencyStore: [...idempotencyStore],
        inventoryReservedCount,
        explanation: 'The broker acknowledged the publish, but the poller process died before the UPDATE ... SET status = PUBLISHED committed — the row still reads PENDING.'
      },
      {
        title: 'Next poller cycle re-reads the still-PENDING row and republishes',
        outboxStatus: 'PUBLISHED',
        brokerQueue: [eventId, eventId], // two copies now in flight — the redelivery
        idempotencyStore: [...idempotencyStore],
        inventoryReservedCount,
        explanation: 'A second poller instance sees status = PENDING and publishes again — the consumer will now receive this event twice.'
      }
    ]

    // First delivery — genuinely new.
    idempotencyStore.push(eventId)
    inventoryReservedCount += 1
    steps.push({
      title: 'Consumer processes delivery #1',
      outboxStatus: 'PUBLISHED',
      brokerQueue: [eventId],
      idempotencyStore: [...idempotencyStore],
      inventoryReservedCount,
      explanation: `Idempotency store does not contain "${eventId}" yet — inventory reserved, event id recorded.`
    })

    // Second delivery — the duplicate. inventoryReservedCount must NOT increment again.
    steps.push({
      title: 'Consumer receives delivery #2 (the duplicate)',
      outboxStatus: 'PUBLISHED',
      brokerQueue: [],
      idempotencyStore: [...idempotencyStore],
      inventoryReservedCount,
      explanation: `Idempotency store already contains "${eventId}" — the consumer skips the business side effect and just acknowledges. Inventory reservation count stays at ${inventoryReservedCount}.`
    })

    return steps
  }

  _brokerOutageSteps() {
    const eventId = 'evt-4471-created'
    let retryCount = 0

    const steps = [
      {
        title: 'Order created — one atomic DB transaction',
        outboxStatus: 'PENDING',
        brokerQueue: [],
        retryCount,
        explanation: 'orders row and outbox_message row (status PENDING) committed together.'
      }
    ]

    retryCount += 1
    steps.push({
      title: `Poller attempt ${retryCount}: broker unreachable`,
      outboxStatus: 'PENDING',
      brokerQueue: [],
      retryCount,
      explanation: 'The publish call fails outright — the row stays PENDING, ready for the next poll cycle to retry.'
    })

    retryCount += 1
    steps.push({
      title: `Poller attempt ${retryCount}: broker still unreachable`,
      outboxStatus: 'PENDING',
      brokerQueue: [],
      retryCount,
      explanation: 'Still down. No message is lost — the row simply stays PENDING until a publish attempt actually succeeds.'
    })

    steps.push({
      title: `Poller attempt ${retryCount + 1}: broker has recovered`,
      outboxStatus: 'PUBLISHED',
      brokerQueue: [eventId],
      retryCount,
      explanation: 'The publish now succeeds and the row is marked PUBLISHED — no event was lost across the outage, only delayed.'
    })

    return steps
  }

  _poisonMessageSteps() {
    const eventId = 'evt-9981-malformed'
    const steps = [
      {
        title: 'Message published and delivered to consumer',
        attempt: 0,
        dlq: [],
        explanation: 'The outbox published this event normally; the failure is entirely on the consumer-processing side.'
      }
    ]

    for (let attempt = 1; attempt <= MAX_CONSUMER_RETRIES; attempt++) {
      steps.push({
        title: `Processing attempt ${attempt} of ${MAX_CONSUMER_RETRIES} fails`,
        attempt,
        dlq: [],
        explanation: `The payload fails deserialization or business validation on every attempt — retrying identical input cannot succeed, so the consumer backs off and retries up to ${MAX_CONSUMER_RETRIES} times.`
      })
    }

    steps.push({
      title: 'Retry budget exhausted — routed to dead-letter queue',
      attempt: MAX_CONSUMER_RETRIES,
      dlq: [eventId],
      explanation: `After ${MAX_CONSUMER_RETRIES} failed attempts, the message is moved to the DLQ instead of retried forever, and the original message is acknowledged so processing of subsequent messages can continue.`
    })

    return steps
  }
}
