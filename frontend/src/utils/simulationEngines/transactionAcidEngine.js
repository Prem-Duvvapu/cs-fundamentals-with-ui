export const TRANSACTION_SCENARIOS = {
  'state-machine': {
    name: 'ACID State Machine',
    description: 'A fund transfer transaction walks through Active, Partially Committed, and Committed states under the ACID contract.'
  },
  'failure-abort': {
    name: 'Failure & Rollback',
    description: 'A runtime failure mid-transaction forces the Failed state, an UNDO rollback, and the Aborted terminal state proving Atomicity.'
  },
  'wal-logging': {
    name: 'Write-Ahead Logging',
    description: 'Log records are appended and flushed to stable storage BEFORE any dirty data page reaches disk, guaranteeing Durability.'
  },
  'aries-recovery': {
    name: 'ARIES Crash Recovery',
    description: 'After a crash, the three-phase ARIES algorithm reconstructs state via Analysis, Redo (Repeating History), and Undo of losers with CLRs.'
  }
}

export class TransactionAcidEngine {
  constructor() {
    this.activeScenario = 'state-machine'
    this.stepIndex = 0
    this.steps = this.generateSteps()
  }

  setScenario(scenario) {
    this.activeScenario = scenario
    this.stepIndex = 0
    this.steps = this.generateSteps()
  }

  generateSteps() {
    if (this.activeScenario === 'state-machine') {
      return [
        {
          stepNumber: 1,
          title: 'BEGIN TRANSACTION → ACTIVE',
          currentState: 'ACTIVE',
          statePath: ['ACTIVE'],
          sql: 'BEGIN TRANSACTION;',
          accountA: 1000,
          accountB: 500,
          description: 'The transfer of 500 from Account A to Account B starts. The transaction is ACTIVE: all subsequent operations execute inside the private workspace.'
        },
        {
          stepNumber: 2,
          title: 'Debit Executed In Memory (ACTIVE)',
          currentState: 'ACTIVE',
          statePath: ['ACTIVE'],
          sql: 'UPDATE accounts SET balance = balance - 500 WHERE id = 101;',
          accountA: 500,
          accountB: 500,
          description: 'Account A debited by 500, but the modified page lives only in the buffer pool. To other isolated transactions the old value remains visible until commit.'
        },
        {
          stepNumber: 3,
          title: 'Credit Executed In Memory (ACTIVE)',
          currentState: 'ACTIVE',
          statePath: ['ACTIVE'],
          sql: 'UPDATE accounts SET balance = balance + 500 WHERE id = 202;',
          accountA: 500,
          accountB: 1000,
          description: 'Account B credited by 500. Both row versions are uncommitted dirty writes held by this single ACTIVE transaction.'
        },
        {
          stepNumber: 4,
          title: 'Last Statement Done → PARTIALLY COMMITTED',
          currentState: 'PARTIALLY_COMMITTED',
          statePath: ['ACTIVE', 'PARTIALLY_COMMITTED'],
          sql: '-- final statement executed',
          accountA: 500,
          accountB: 1000,
          description: 'All statements finished, yet updates still reside in volatile memory. A crash here would lose them, so the commit record is about to be force-flushed to the WAL.'
        },
        {
          stepNumber: 5,
          title: 'WAL Flushed + COMMIT → COMMITTED',
          currentState: 'COMMITTED',
          statePath: ['ACTIVE', 'PARTIALLY_COMMITTED', 'COMMITTED'],
          sql: 'COMMIT;',
          accountA: 500,
          accountB: 1000,
          description: 'The <commit T1> log record reached disk. The transaction is COMMITTED: Atomicity, Consistency, Isolation and Durability are now guaranteed even against power loss.'
        }
      ]
    }

    if (this.activeScenario === 'failure-abort') {
      return [
        {
          stepNumber: 1,
          title: 'BEGIN TRANSACTION → ACTIVE',
          currentState: 'ACTIVE',
          statePath: ['ACTIVE'],
          sql: 'BEGIN TRANSACTION;\nUPDATE flights SET seats = seats - 1 WHERE flight_id = 77;',
          accountA: null,
          accountB: null,
          description: 'A booking transaction decrements seat count for flight 77 and enters ACTIVE state.'
        },
        {
          stepNumber: 2,
          title: 'Second Statement Raises Runtime Error → FAILED',
          currentState: 'FAILED',
          statePath: ['ACTIVE', 'FAILED'],
          sql: 'INSERT INTO bookings VALUES (...) -- FK violation: passenger_id not found',
          accountA: null,
          accountB: null,
          description: 'The INSERT violates a foreign key constraint. The internal error handler drives the transaction into the FAILED state instead of allowing partial effects.'
        },
        {
          stepNumber: 3,
          title: 'UNDO Rollback Executes (Reverse Pass)',
          currentState: 'FAILED',
          statePath: ['ACTIVE', 'FAILED'],
          sql: 'ROLLBACK;',
          accountA: null,
          accountB: null,
          description: 'Rollback replays the transaction log backwards restoring seats = 12. Every write of the failed transaction is compensated using its before-image.'
        },
        {
          stepNumber: 4,
          title: 'Restore Complete → ABORTED',
          currentState: 'ABORTED',
          statePath: ['ACTIVE', 'FAILED', 'ABORTED'],
          sql: '-- database restored to pre-transaction snapshot',
          accountA: null,
          accountB: null,
          description: 'The database shows zero trace of the transaction: ATOMICITY delivered. The scheduler may retry it as a fresh ACTIVE transaction.'
        }
      ]
    }

    if (this.activeScenario === 'wal-logging') {
      return [
        {
          stepNumber: 1,
          title: '<T1, start> Appended To Log Buffer',
          currentState: 'ACTIVE',
          logRecords: [
            { lsn: 10, record: '<T1, start>', flushed: false }
          ],
          dirtyPageOnDisk: false,
          description: 'Before touching data pages, the DBMS appends <T1, start> to the in-memory log buffer. Log Sequence Number 10 marks the transaction beginning.'
        },
        {
          stepNumber: 2,
          title: 'Update Logged With Before/After Images',
          currentState: 'ACTIVE',
          logRecords: [
            { lsn: 10, record: '<T1, start>', flushed: true },
            { lsn: 20, record: "<T1, UPDATE acct:101, before:1000, after:500>", flushed: false }
          ],
          dirtyPageOnDisk: false,
          description: 'LSN 20 records old and new values for the debit. Only the sequential log append hits disk; the random-access data page stays cached as a dirty page.'
        },
        {
          stepNumber: 3,
          title: 'Commit Record Force-Written First (WAL RULE)',
          currentState: 'PARTIALLY_COMMITTED',
          logRecords: [
            { lsn: 10, record: '<T1, start>', flushed: true },
            { lsn: 20, record: "<T1, UPDATE acct:101, before:1000, after:500>", flushed: true },
            { lsn: 30, record: '<T1, UPDATE acct:202, before:500, after:1000>', flushed: true },
            { lsn: 40, record: '<T1, commit>', flushed: true }
          ],
          dirtyPageOnDisk: false,
          description: 'THE WAL RULE IN ACTION: <T1, commit> is flushed to stable storage at LSN 40 while the dirty data page is STILL NOT on disk. Sequential log I/O replaces slow scattered page writes.'
        },
        {
          stepNumber: 4,
          title: 'Checkpoint Later Flushes Dirty Page',
          currentState: 'COMMITTED',
          logRecords: [
            { lsn: 10, record: '<T1, start>', flushed: true },
            { lsn: 20, record: "<T1, UPDATE acct:101, before:1000, after:500>", flushed: true },
            { lsn: 30, record: '<T1, UPDATE acct:202, before:500, after:1000>', flushed: true },
            { lsn: 40, record: '<T1, commit>', flushed: true },
            { lsn: 50, record: '<checkpoint>', flushed: true }
          ],
          dirtyPageOnDisk: true,
          description: 'Only now does the background writer flush the dirty page. If the system had crashed earlier, ARIES could still redo the change purely from the durable log: DURABILITY.'
        }
      ]
    }

    return [
      {
        stepNumber: 1,
        title: '💥 CRASH! Buffer Pool Lost',
        phase: 'PRE_CRASH',
        t1Status: 'COMMITTED (log up to LSN 40)',
        t2Status: 'ACTIVE (uncommitted writes)',
        redoQueue: [],
        undoQueue: [],
        description: 'Power loss wipes the volatile buffer pool. Disk holds the stale data page plus a durable log containing committed T1 and an uncommitted loser T2.'
      },
      {
        stepNumber: 2,
        title: 'Phase 1 — ANALYSIS Reconstructs Crash State',
        phase: 'ANALYSIS',
        t1Status: 'Winner candidate (commit record found)',
        t2Status: 'Loser candidate (no commit record)',
        redoQueue: ['Dirty Page Table rebuilt', 'Attacker list = { T2 }'],
        undoQueue: [],
        description: 'Scanning forward from the last checkpoint, ARIES rebuilds the Dirty Page Table and identifies T1 as a winner and T2 as a loser requiring rollback.'
      },
      {
        stepNumber: 3,
        title: 'Phase 2 — REDO Repeats History Forward',
        phase: 'REDO',
        t1Status: 'Re-applied from log',
        t2Status: 'Writes re-applied (about to be undone)',
        redoQueue: ['LSN 20 re-applied', 'LSN 30 re-applied', 'Database == exact crash image'],
        undoQueue: [],
        description: 'Every logged operation after the checkpoint is replayed in LSN order, including losers, restoring the precise moment of the crash ("Repeating History").'
      },
      {
        stepNumber: 4,
        title: 'Phase 3 — UNDO Rolls Back Losers With CLRs',
        phase: 'UNDO',
        t1Status: 'Committed result stands',
        t2Status: 'Rolled back to before-image',
        redoQueue: ['Database == crash image'],
        undoQueue: ['Reverse-scan undoes T2 @ LSN 30', 'CLR written: <T2, compensation>', 'T2 removed from attacker list'],
        undoToGo: true,
        description: 'Scanning backwards, T2 writes are undone and Compensation Log Records are emitted so a second crash during recovery cannot resurrect loser changes. Recovery completes atomically.'
      }
    ]
  }

  getCurrentState() {
    return {
      scenario: this.activeScenario,
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
