// DBMS Introduction & File System vs DBMS Simulation Engine

export const DBMS_INTRO_SCENARIOS = {
  'redundancy-anomaly': {
    id: 'redundancy-anomaly',
    name: '1. Data Redundancy & Inconsistency Anomaly',
    description: 'Compares how updating a customer address causes inconsistency across isolated departmental files vs atomic propagation in a centralized DBMS table.'
  },
  'concurrency-race': {
    id: 'concurrency-race',
    name: '2. Multi-User Concurrency & Lost Update',
    description: 'Simulates two simultaneous users modifying an account. File systems suffer the Lost Update anomaly; DBMS enforces serializability via locking.'
  },
  'crash-atomicity': {
    id: 'crash-atomicity',
    name: '3. Crash Recovery & Atomicity (WAL / ARIES)',
    description: 'Simulates a sudden power failure during a multi-step bank transfer. File systems leave corrupted files; DBMS ARIES rollback preserves atomicity.'
  },
  'query-optimization': {
    id: 'query-optimization',
    name: '4. Full File Scan vs Cost-Based B+ Tree Seek',
    description: 'Compares linear file scanning across 1,000,000 rows (12,500 disk blocks) vs B+ Tree index seek (3 block reads, 99.98% faster).'
  }
}

export class DbmsIntroEngine {
  constructor() {
    this.activeScenario = 'redundancy-anomaly'
    this.stepIndex = 0
    this.steps = this.generateSteps()
  }

  setScenario(scenarioId) {
    if (DBMS_INTRO_SCENARIOS[scenarioId]) {
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
      scenarioMeta: DBMS_INTRO_SCENARIOS[this.activeScenario],
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
    switch (this.activeScenario) {
      case 'redundancy-anomaly':
        return [
          {
            stepNumber: 1,
            title: 'Initial State: Customer Profile Stored in 3 Department Files',
            description: 'Customer "Alice Smith" (ID: 101) lives at "123 Elm St, NY". In a traditional file system, Sales, Shipping, and Billing maintain independent spreadsheets.',
            fileSystemState: {
              salesFile: { id: 101, name: 'Alice Smith', address: '123 Elm St, NY', phone: '555-0101' },
              shippingFile: { id: 101, name: 'Alice Smith', address: '123 Elm St, NY', carrier: 'FedEx' },
              billingFile: { id: 101, name: 'Alice Smith', address: '123 Elm St, NY', balance: '$250.00' }
            },
            dbmsState: {
              customersTable: [{ id: 101, name: 'Alice Smith', address: '123 Elm St, NY', phone: '555-0101' }],
              ordersTable: [{ orderId: 501, customerId: 101, carrier: 'FedEx', balance: '$250.00' }]
            },
            status: 'INITIAL_SYNC',
            anomalyAlert: null
          },
          {
            stepNumber: 2,
            title: 'Customer Requests Address Change to "456 Oak Ave, CA"',
            description: 'Alice calls Sales department to update her address. Sales updates their local file. Shipping and Billing are unaware.',
            fileSystemState: {
              salesFile: { id: 101, name: 'Alice Smith', address: '456 Oak Ave, CA (UPDATED)', phone: '555-0101' },
              shippingFile: { id: 101, name: 'Alice Smith', address: '123 Elm St, NY (STALE!)', carrier: 'FedEx' },
              billingFile: { id: 101, name: 'Alice Smith', address: '123 Elm St, NY (STALE!)', balance: '$250.00' }
            },
            dbmsState: {
              customersTable: [{ id: 101, name: 'Alice Smith', address: '456 Oak Ave, CA (UPDATED)', phone: '555-0101' }],
              ordersTable: [{ orderId: 501, customerId: 101, carrier: 'FedEx', balance: '$250.00' }]
            },
            status: 'UPDATE_APPLIED',
            anomalyAlert: '🚨 File System Anomaly: Address updated in Sales file ONLY. Shipping and Billing files hold stale addresses.'
          },
          {
            stepNumber: 3,
            title: 'Order Dispatch: File System Delivery Failure vs DBMS Consistency',
            description: 'Shipping dispatches order #501. The file system reads shipping.csv and sends the package to the wrong state! The DBMS joins orders with customers table and sends to the correct new address.',
            fileSystemState: {
              salesFile: { id: 101, name: 'Alice Smith', address: '456 Oak Ave, CA', status: 'Active' },
              shippingFile: { id: 101, name: 'Alice Smith', address: '123 Elm St, NY', status: 'SHIPPED TO WRONG ADDRESS! ❌' },
              billingFile: { id: 101, name: 'Alice Smith', address: '123 Elm St, NY', status: 'INVOICE MAILED TO OLD ADDRESS! ❌' }
            },
            dbmsState: {
              customersTable: [{ id: 101, name: 'Alice Smith', address: '456 Oak Ave, CA', status: 'Active' }],
              ordersTable: [{ orderId: 501, customerId: 101, status: 'SHIPPED TO 456 OAK AVE, CA ✅' }]
            },
            status: 'CONCLUDED',
            anomalyAlert: '✅ DBMS Single Source of Truth prevents millions of dollars in lost shipments and billing disputes.'
          }
        ]

      case 'concurrency-race':
        return [
          {
            stepNumber: 1,
            title: 'Initial Balance: $1,000.00 (Two Users Connect)',
            description: 'User A (ATM Deposit $500) and User B (Mobile Withdrawal $200) initiate transactions on Account 101 simultaneously.',
            fileSystemState: {
              fileData: { account: 101, balance: 1000 },
              userARead: 1000,
              userBRead: 1000,
              activeLocks: 'None (Unsafe Raw File Access)'
            },
            dbmsState: {
              tableRow: { account: 101, balance: 1000 },
              activeLock: 'None',
              txStatus: 'Ready'
            },
            status: 'CONCURRENT_READ'
          },
          {
            stepNumber: 2,
            title: 'Unsynchronized Writes: Lost Update Anomaly in File System',
            description: 'User A computes 1000 + 500 = $1500 and writes to file. Milliseconds later, User B (who read old balance 1000) computes 1000 - 200 = $800 and overwrites the file!',
            fileSystemState: {
              fileData: { account: 101, balance: 800 },
              userAWritten: 1500,
              userBWritten: 800,
              result: 'CRITICAL LOST UPDATE: $500 DEPOSIT VANISHED! ❌'
            },
            dbmsState: {
              tableRow: { account: 101, balance: 1500 },
              activeLock: 'User A holds RowExclusiveLock; User B queued in Lock Manager wait queue ⏳',
              txStatus: 'Serializing'
            },
            status: 'RACE_DETECTED',
            anomalyAlert: '🚨 File System Lost Update: User A\'s $500 deposit was completely wiped out by User B\'s uncoordinated write.'
          },
          {
            stepNumber: 3,
            title: 'DBMS Strict 2PL Resolution: Correct Balance $1,300.00',
            description: 'User A commits ($1500) and releases lock. User B acquires lock, reads fresh balance $1500, subtracts $200, and writes $1300.',
            fileSystemState: {
              fileData: { account: 101, balance: 800 },
              finalError: 'Loss of $500.00 (Customer Dispute)'
            },
            dbmsState: {
              tableRow: { account: 101, balance: 1300 },
              activeLock: 'Released',
              txStatus: 'SERIALIZABLE COMMIT ✅'
            },
            status: 'CONCLUDED',
            anomalyAlert: '✅ DBMS Lock Manager & 2-Phase Locking guarantees 100% mathematical transaction correctness.'
          }
        ]

      case 'crash-atomicity':
        return [
          {
            stepNumber: 1,
            title: 'Step 1: Debit $200 from Account 101 ($1000 -> $800)',
            description: 'A bank transfer of $200 from Alice (Acc 101) to Bob (Acc 102) begins. Account 101 is debited in memory.',
            fileSystemState: {
              acc101: { balance: '$800.00 (Saved to File)' },
              acc102: { balance: '$500.00 (Unchanged)' },
              recoveryLog: 'None'
            },
            dbmsState: {
              acc101: { balance: '$800.00 (Dirty Buffer Page)' },
              acc102: { balance: '$500.00' },
              walLog: 'LSN 101: UPDATE Acc 101 balance = 800 (Prev: 1000, TX: 99)'
            },
            status: 'STEP_1_OK'
          },
          {
            stepNumber: 2,
            title: '⚡ SYSTEM POWER FAILURE / OS KERNEL CRASH OCCURS! ⚡',
            description: 'Power cuts out before Account 102 could be credited! The machine shuts down abruptly.',
            fileSystemState: {
              acc101: { balance: '$800.00 (Written on Disk)' },
              acc102: { balance: '$500.00 (Never modified)' },
              crashResult: 'PERMANENT CORRUPTION: $200.00 DISAPPEARED INTO THIN AIR! ❌'
            },
            dbmsState: {
              walLogDisk: 'LSN 101: TX 99 active (NO COMMIT RECORD FOUND ON DISK)',
              ariesEngine: 'Restart Recovery Initiated...'
            },
            status: 'CRASHED',
            anomalyAlert: '🚨 File System Atomicity Violation: System left in half-completed state with $200 missing.'
          },
          {
            stepNumber: 3,
            title: 'DBMS ARIES Crash Recovery: Automatic Rollback to $1,000.00',
            description: 'On reboot, DBMS ARIES scans WAL log. TX 99 is uncommitted -> ARIES executes UNDO pass, restoring Account 101 to $1,000.00.',
            fileSystemState: {
              acc101: '$800.00 (Permanent Loss)',
              acc102: '$500.00 (No record of transfer)'
            },
            dbmsState: {
              acc101: '$1,000.00 (RESTORED VIA WAL UNDO PASS ✅)',
              acc102: '$500.00',
              txResult: 'ABORTED & ROLLED BACK CLEANLY'
            },
            status: 'CONCLUDED',
            anomalyAlert: '✅ DBMS Write-Ahead Logging (WAL) ensures 100% all-or-nothing Atomic transaction execution.'
          }
        ]

      case 'query-optimization':
        return [
          {
            stepNumber: 1,
            title: 'Query: SELECT * FROM customers WHERE customer_id = 874239;',
            description: 'Looking up a single customer in a 1,000,000-record dataset (100MB data file, 12,500 OS disk blocks of 8KB each).',
            fileSystemMetrics: {
              method: 'Sequential Linear Scan (read file from byte 0 to 100MB)',
              diskBlocksRead: 0,
              timeElapsed: '0 ms',
              cpuUsage: '0%'
            },
            dbmsMetrics: {
              method: 'B+ Tree Clustered Index Seek',
              diskBlocksRead: 0,
              timeElapsed: '0 ms',
              bufferCacheHit: '99%'
            },
            status: 'INITIAL_QUERY'
          },
          {
            stepNumber: 2,
            title: 'Execution: 12,500 Block Reads vs 3 Tree Level Reads',
            description: 'The file system must read every single byte until the record is found. DBMS traverses Root -> Internal Node -> Leaf Block.',
            fileSystemMetrics: {
              method: 'Sequential Scan (O(N))',
              diskBlocksRead: '12,500 Disk Blocks Read (100 MB I/O)',
              timeElapsed: '2,480 ms (Slow Disk I/O)',
              cpuUsage: '88% (String Parsing per line)'
            },
            dbmsMetrics: {
              method: 'B+ Tree Seek (O(log N))',
              diskBlocksRead: '3 Disk Pages Read (24 KB I/O)',
              timeElapsed: '0.04 ms (Sub-millisecond)',
              cpuUsage: '0.1% (Binary search in page)'
            },
            status: 'CONCLUDED',
            anomalyAlert: '🚀 DBMS B+ Tree index seek is ~62,000x faster than linear file system scanning and saves 99.98% disk I/O.'
          }
        ]

      default:
        return []
    }
  }
}
