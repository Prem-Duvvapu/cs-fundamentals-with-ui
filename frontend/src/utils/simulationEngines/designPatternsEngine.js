// SOLID Principles & Design Patterns Simulation Engine (Singleton Race & Observer Event Bus)

export const DESIGN_PATTERN_SCENARIOS = {
  'singleton-race': {
    id: 'singleton-race',
    name: '1. Singleton Multithreaded Race Condition & Fix',
    description: 'Demonstrates how un-synchronized lazy singletons create dual instances under concurrent thread execution, and how Bill Pugh / volatile DCL fixes it.'
  },
  'observer-eventbus': {
    id: 'observer-eventbus',
    name: '2. Observer Pattern Dynamic Event Dispatch',
    description: 'Demonstrates dynamic subscription and sequential fan-out event dispatch from a Subject to registered Observers.'
  }
}

export class DesignPatternsEngine {
  constructor() {
    this.activeScenario = 'singleton-race'
    this.stepIndex = 0
    this.steps = this.generateSteps()
  }

  setScenario(scenarioId) {
    if (DESIGN_PATTERN_SCENARIOS[scenarioId]) {
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
      scenarioMeta: DESIGN_PATTERN_SCENARIOS[this.activeScenario],
      stepIndex: this.stepIndex,
      totalSteps: this.steps.length,
      stepData: currentStep,
      isFirst: this.stepIndex === 0,
      isLast: this.stepIndex === this.steps.length - 1
    }
  }

  nextStep() {
    if (this.stepIndex < this.steps.length - 1) {
      this.stepIndex++
    }
    return this.getCurrentState()
  }

  prevStep() {
    if (this.stepIndex > 0) {
      this.stepIndex--
    }
    return this.getCurrentState()
  }

  reset() {
    this.stepIndex = 0
    return this.getCurrentState()
  }

  generateSteps() {
    if (this.activeScenario === 'singleton-race') {
      return [
        {
          stepNumber: 1,
          title: 'Step 1: Naive Lazy Initialization (Un-synchronized)',
          description: 'Thread-1 and Thread-2 invoke getInstance() concurrently. Both threads evaluate `if (instance == null)` to TRUE simultaneously.',
          thread1State: 'Checking (instance == null) -> TRUE',
          thread2State: 'Checking (instance == null) -> TRUE',
          instancesCreated: [],
          status: 'RACE CONDITION INITIATED: Both threads pass the null check before either completes instantiation.',
          codeSnippet: `if (instance == null) {
    // Both Thread-1 and Thread-2 reach here!
    instance = new Singleton();
}`
        },
        {
          stepNumber: 2,
          title: 'Step 2: Dual Instantiation (Contract Broken)',
          description: 'Thread-1 creates Instance @0x7f81. Microseconds later, Thread-2 overwrites/creates Instance @0x9a42. Two distinct instances exist in memory!',
          thread1State: 'Created Instance @0x7f81',
          thread2State: 'Created Instance @0x9a42',
          instancesCreated: ['@0x7f81 (Thread-1)', '@0x9a42 (Thread-2)'],
          status: 'SINGLETON VIOLATION: Memory contains 2 distinct objects for a supposedly Singleton class.',
          codeSnippet: `// Instance count = 2! Memory leak and corrupted application state.`
        },
        {
          stepNumber: 3,
          title: 'Step 3: Refactored Solution (Bill Pugh / Volatile DCL)',
          description: 'Using JVM ClassLoader Holder idiom (or Double-Checked Locking with volatile barrier). Class loading guarantees thread-safe, lazy, 0-overhead single instance creation.',
          thread1State: 'Acquired Holder Class -> Instance @0x7f81',
          thread2State: 'Acquired Holder Class -> Same Instance @0x7f81',
          instancesCreated: ['@0x7f81 (Guaranteed Single Instance)'],
          status: 'THREAD SAFE: JVM ClassLoader guarantees exact 1 instance @0x7f81 created during class initialization.',
          codeSnippet: `private static class Holder {
    private static final Singleton INSTANCE = new Singleton();
}`
        }
      ]
    } else {
      return [
        {
          stepNumber: 1,
          title: 'Step 1: Observer Registration (Subscribe)',
          description: 'Subject registers 3 listener services: EmailNotificationObserver, LoggingObserver, and AuditLedgerObserver.',
          observers: ['EmailNotificationObserver', 'LoggingObserver', 'AuditLedgerObserver'],
          eventState: 'Idle (Awaiting events)',
          logs: ['[INIT] Registered 3 observers with Subject bus.']
        },
        {
          stepNumber: 2,
          title: 'Step 2: Event Fired (Publish)',
          description: 'Application fires event `OrderPlacedEvent(OrderID=10492, Amount=$299.00)`. Subject initiates fan-out notification loop.',
          observers: ['EmailNotificationObserver', 'LoggingObserver', 'AuditLedgerObserver'],
          eventState: 'Event: ORDER_PLACED ($299.00)',
          logs: [
            '[INIT] Registered 3 observers with Subject bus.',
            '[EVENT] OrderPlacedEvent triggered on Subject.'
          ]
        },
        {
          stepNumber: 3,
          title: 'Step 3: Sequential Observer Dispatch',
          description: 'Subject executes `observer.update(event)` for each registered listener in order.',
          observers: ['EmailNotificationObserver [DONE]', 'LoggingObserver [DONE]', 'AuditLedgerObserver [DONE]'],
          eventState: 'Dispatch Complete',
          logs: [
            '[INIT] Registered 3 observers with Subject bus.',
            '[EVENT] OrderPlacedEvent triggered on Subject.',
            '[NOTIFY] EmailNotificationObserver: Sent confirmation email for Order #10492',
            '[NOTIFY] LoggingObserver: Appended log line to /var/log/orders.log',
            '[NOTIFY] AuditLedgerObserver: Recorded $299.00 transaction in DB'
          ]
        }
      ]
    }
  }
}
