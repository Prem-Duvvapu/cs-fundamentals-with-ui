// Distributed DBMS & 2PC Simulation Engine

export const DISTRIBUTED_MODES = {
  '2pc': {
    name: '2-Phase Commit (2PC Protocol)',
    description: 'Guarantees atomic distributed transactions across Coordinator and Participant Nodes (Prepare -> Vote -> Global Commit).'
  },
  'cap-theorem': {
    name: 'CAP Theorem & Network Partition',
    description: 'Demonstrates trade-off between Consistency (CP) and Availability (AP) during network split-brain partitions.'
  },
  'quorum': {
    name: 'Quorum Consensus (R + W > N)',
    description: 'Configurable replica read/write quorums ensuring strong consistency without global locking.'
  }
}

export class DistributedDbEngine {
  constructor() {
    this.activeMode = '2pc'
    this.stepIndex = 0
    this.steps = this.generateSteps()
  }

  setMode(mode) {
    this.activeMode = mode
    this.stepIndex = 0
    this.steps = this.generateSteps()
  }

  generateSteps() {
    const steps = []

    if (this.activeMode === '2pc') {
      steps.push({
        stepNumber: 1,
        title: 'Phase 1: Coordinator Sends PREPARE Message',
        coordinatorState: 'PREPARING',
        node1State: 'IDLE',
        node2State: 'IDLE',
        node3State: 'IDLE',
        description: 'Coordinator asks participants: "Can you commit transaction TX-101?" Participants lock records and flush Undo/Redo WAL.'
      })
      steps.push({
        stepNumber: 2,
        title: 'Phase 1 Response: All Nodes VOTE_COMMIT',
        coordinatorState: 'COLLECTING_VOTES',
        node1State: 'VOTED_COMMIT (READY)',
        node2State: 'VOTED_COMMIT (READY)',
        node3State: 'VOTED_COMMIT (READY)',
        description: 'All 3 participant nodes respond with VOTE_COMMIT. Nodes are now in prepared state.'
      })
      steps.push({
        stepNumber: 3,
        title: 'Phase 2: Coordinator Broadcasts GLOBAL_COMMIT',
        coordinatorState: 'COMMITTED',
        node1State: 'COMMITTED',
        node2State: 'COMMITTED',
        node3State: 'COMMITTED',
        description: 'Coordinator commits locally and broadcasts GLOBAL_COMMIT. All nodes apply changes and release locks.'
      })
    } else if (this.activeMode === 'cap-theorem') {
      steps.push({
        stepNumber: 1,
        title: 'Normal Operation (No Network Partition)',
        clusterStatus: 'HEALTHY',
        nodeAValue: 42,
        nodeBValue: 42,
        description: 'Cluster nodes A and B are in sync (Value = 42). Both Consistency and Availability are achieved.'
      })
      steps.push({
        stepNumber: 2,
        title: 'NETWORK PARTITION OCCURS!',
        clusterStatus: 'PARTITIONED',
        nodeAValue: 42,
        nodeBValue: 42,
        description: 'Network link severed between Node A (East DC) and Node B (West DC). Incoming write: SET Value = 99 at Node A.'
      })
      steps.push({
        stepNumber: 3,
        title: 'CP System Choice: Reject Writes / Read Stale',
        clusterStatus: 'CP_ENFORCED',
        nodeAValue: 'Write Rejected (503 Service Unavailable)',
        nodeBValue: 42,
        description: 'CP (Google Spanner / HBase): Sacrifices Availability to preserve absolute Consistency across partition.'
      })
      steps.push({
        stepNumber: 4,
        title: 'AP System Choice: Accept Local Writes (Eventual Consistency)',
        clusterStatus: 'AP_ENFORCED',
        nodeAValue: 99,
        nodeBValue: 42,
        description: 'AP (Cassandra / DynamoDB): Sacrifices immediate Consistency to remain 100% Available for writes; reconciles later via Vector Clocks.'
      })
    } else {
      // Quorum R + W > N
      steps.push({
        stepNumber: 1,
        title: 'Quorum Configuration (N=3, W=2, R=2)',
        formula: 'R + W = 2 + 2 = 4 > 3 (STRICT QUORUM SATISFIED)',
        description: 'With N=3 replicas, Write Quorum requires 2 ACKs, and Read Quorum requires 2 ACKs. Guarantees overlap!'
      })
    }

    return steps
  }

  getCurrentState() {
    return {
      mode: this.activeMode,
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
