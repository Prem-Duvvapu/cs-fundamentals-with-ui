// Concurrency Control & Deadlock Simulation Engine

export const CONCURRENCY_PROTOCOLS = {
  'strict-2pl': {
    name: 'Strict 2-Phase Locking (Strict 2PL)',
    description: 'Growing Phase acquires Shared/Exclusive locks. Exclusive locks are held strictly until transaction COMMIT or ABORT, preventing cascading rollbacks.'
  },
  'timestamp-ordering': {
    name: 'Timestamp Ordering Protocol (TO)',
    description: 'Transactions are ordered by timestamp TS(T). Read and Write operations are tested against R-TS(Q) and W-TS(Q) to guarantee conflict serializability.'
  },
  'thomas-write-rule': {
    name: 'Thomas Write Rule (TO Modification)',
    description: 'Allows out-of-order writes to be quietly ignored if a newer write already occurred (TS(T) < W-TS(Q)), increasing concurrency.'
  },
  'wait-for-graph': {
    name: 'Deadlock Detection (Wait-For Graph)',
    description: 'Dynamic cycle detection on directed transaction resource dependency graph T1 -> T2 -> T3 -> T1.'
  }
}

export class ConcurrencyControlEngine {
  constructor() {
    this.activeProtocol = 'strict-2pl'
    this.stepIndex = 0
    this.steps = this.generateSteps()
  }

  setProtocol(proto) {
    this.activeProtocol = proto
    this.stepIndex = 0
    this.steps = this.generateSteps()
  }

  generateSteps() {
    const steps = []

    if (this.activeProtocol === 'strict-2pl') {
      steps.push({
        stepNumber: 1,
        title: 'T1: Requests Shared Lock S(A)',
        activeTransaction: 'T1',
        dataItem: 'Item A',
        lockType: 'Shared (S)',
        status: 'GRANTED',
        activeLocks: { 'A': ['T1 (S)'], 'B': [] },
        description: 'T1 successfully acquires Shared Lock on Item A for reading.'
      })
      steps.push({
        stepNumber: 2,
        title: 'T2: Requests Exclusive Lock X(B)',
        activeTransaction: 'T2',
        dataItem: 'Item B',
        lockType: 'Exclusive (X)',
        status: 'GRANTED',
        activeLocks: { 'A': ['T1 (S)'], 'B': ['T2 (X)'] },
        description: 'T2 acquires Exclusive Lock on Item B for write modification.'
      })
      steps.push({
        stepNumber: 3,
        title: 'T1: Requests Exclusive Lock X(B) (WAITING)',
        activeTransaction: 'T1',
        dataItem: 'Item B',
        lockType: 'Exclusive (X)',
        status: 'BLOCKED (WAITING)',
        activeLocks: { 'A': ['T1 (S)'], 'B': ['T2 (X)'] },
        description: 'Item B is currently held by T2 in Exclusive mode. T1 is put into WAITING state.'
      })
      steps.push({
        stepNumber: 4,
        title: 'T2: COMMIT & Release Locks',
        activeTransaction: 'T2',
        dataItem: 'All Items',
        lockType: 'RELEASE',
        status: 'COMMITTED',
        activeLocks: { 'A': ['T1 (S)'], 'B': ['T1 (X)'] },
        description: 'T2 commits and releases X(B). Lock X(B) is immediately granted to waiting transaction T1.'
      })
      steps.push({
        stepNumber: 5,
        title: 'T1: COMMIT & Release Locks',
        activeTransaction: 'T1',
        dataItem: 'All Items',
        lockType: 'RELEASE',
        status: 'COMMITTED',
        activeLocks: { 'A': [], 'B': [] },
        description: 'T1 completes, commits and releases all locks. Schedule is strictly serializable.'
      })
    } else if (this.activeProtocol === 'timestamp-ordering') {
      steps.push({
        stepNumber: 1,
        title: 'Initialize Timestamps',
        activeTransaction: 'TS(T1)=100, TS(T2)=200',
        dataItem: 'Item Q',
        status: 'INIT',
        rTs: 0,
        wTs: 0,
        description: 'System initializes timestamps: TS(T1) = 100, TS(T2) = 200, R-TS(Q) = 0, W-TS(Q) = 0.'
      })
      steps.push({
        stepNumber: 2,
        title: 'T1: READ(Q) Execution',
        activeTransaction: 'T1 (TS=100)',
        dataItem: 'Item Q',
        status: 'PASSED',
        rTs: 100,
        wTs: 0,
        description: 'TS(T1) >= W-TS(Q) (100 >= 0). Read permitted! Updated R-TS(Q) = max(0, 100) = 100.'
      })
      steps.push({
        stepNumber: 3,
        title: 'T2: WRITE(Q) Execution',
        activeTransaction: 'T2 (TS=200)',
        dataItem: 'Item Q',
        status: 'PASSED',
        rTs: 100,
        wTs: 200,
        description: 'TS(T2) >= R-TS(Q) and TS(T2) >= W-TS(Q) (200 >= 100). Write permitted! Updated W-TS(Q) = 200.'
      })
    } else {
      // Deadlock Wait-For Graph
      steps.push({
        stepNumber: 1,
        title: 'T1 holds Lock(A), T2 holds Lock(B)',
        activeTransaction: 'T1, T2',
        hasCycle: false,
        edges: [],
        description: 'No deadlock. Both transactions hold independent resources.'
      })
      steps.push({
        stepNumber: 2,
        title: 'T1 requests Lock(B) held by T2',
        activeTransaction: 'T1 -> T2',
        hasCycle: false,
        edges: [{ from: 'T1', to: 'T2', item: 'Lock(B)' }],
        description: 'Added dependency edge T1 -> T2. Wait-for graph is acyclic.'
      })
      steps.push({
        stepNumber: 3,
        title: 'T2 requests Lock(A) held by T1 (DEADLOCK DETECTED!)',
        activeTransaction: 'T2 -> T1',
        hasCycle: true,
        edges: [
          { from: 'T1', to: 'T2', item: 'Lock(B)' },
          { from: 'T2', to: 'T1', item: 'Lock(A)' }
        ],
        description: 'CYCLE DETECTED: T1 -> T2 -> T1. System triggers Deadlock Victim Selection to abort T2.'
      })
    }

    return steps
  }

  getCurrentState() {
    return {
      protocol: this.activeProtocol,
      stepIndex: this.stepIndex,
      totalSteps: this.steps.length,
      stepData: this.steps[this.stepIndex] || this.steps[0]
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
}
