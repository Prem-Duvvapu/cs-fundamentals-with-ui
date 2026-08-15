// Storage Engine, RAID & Advanced Indexing Simulation Engine

export const STORAGE_MODES = {
  'raid': {
    name: 'RAID 5 Array Parity & Disk Recovery',
    description: 'Block striping across N=3 disks with distributed parity P = B1 ⊕ B2. Demonstrates fault tolerance and disk reconstruction upon failure.'
  },
  'bitmap-index': {
    name: 'Bitmap Indexing (Low Cardinality Bitwise Operations)',
    description: 'Vector bit representations for discrete columns (Gender, Status) evaluated using CPU bitwise AND/OR operations.'
  },
  'inverted-index': {
    name: 'Inverted Index (Full-Text Search Engine)',
    description: 'Tokenized terms mapped to postings lists of document IDs for fast keyword intersection.'
  }
}

export class StorageIndexingEngine {
  constructor() {
    this.activeMode = 'raid'
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

    if (this.activeMode === 'raid') {
      steps.push({
        stepNumber: 1,
        title: 'Normal RAID 5 State (Disks Healthy)',
        disk1: { status: 'ONLINE', data: ['Block A1 (1100)', 'Block B1 (1010)'] },
        disk2: { status: 'ONLINE', data: ['Block A2 (1001)', 'Block B2 (0110)'] },
        disk3: { status: 'ONLINE', data: ['Parity AP (0101)', 'Parity BP (1100)'] },
        failedDisk: null,
        description: 'All 3 disks online. Parity block AP = A1 ⊕ A2 (1100 ⊕ 1001 = 0101).'
      })
      steps.push({
        stepNumber: 2,
        title: 'DISK 2 CRASH / FAILURE EVENT!',
        disk1: { status: 'ONLINE', data: ['Block A1 (1100)', 'Block B1 (1010)'] },
        disk2: { status: 'FAILED (DEAD)', data: ['??? (LOST)', '??? (LOST)'] },
        disk3: { status: 'ONLINE', data: ['Parity AP (0101)', 'Parity BP (1100)'] },
        failedDisk: 'Disk 2',
        description: 'Disk 2 hardware failure! Data blocks A2 and B2 become unreachable.'
      })
      steps.push({
        stepNumber: 3,
        title: 'Reconstruct Lost Block A2 using Parity',
        disk1: { status: 'ONLINE', data: ['Block A1 (1100)', 'Block B1 (1010)'] },
        disk2: { status: 'RECONSTRUCTED', data: ['Block A2 (1001)', 'Block B2 (0110)'] },
        disk3: { status: 'ONLINE', data: ['Parity AP (0101)', 'Parity BP (1100)'] },
        failedDisk: null,
        description: 'Reconstruction formula: A2 = A1 ⊕ AP = 1100 ⊕ 0101 = 1001. 100% Data recovered!'
      })
    } else if (this.activeMode === 'bitmap-index') {
      steps.push({
        stepNumber: 1,
        title: 'Bitmap Index Vectors for Customers Table',
        bitmaps: {
          'Gender = F': '10110',
          'Gender = M': '01001',
          'Status = VIP': '11010',
          'Status = Regular': '00101'
        },
        query: "SELECT * FROM Customers WHERE Gender = 'F' AND Status = 'VIP';",
        description: 'Loaded bitmap vectors for 5 customer records.'
      })
      steps.push({
        stepNumber: 2,
        title: 'Execute Bitwise AND in CPU Register',
        bitmaps: {
          'Vector 1 (Gender=F)': '1 0 1 1 0',
          'Vector 2 (Status=VIP)': '1 1 0 1 0',
          'Result (AND)': '1 0 0 1 0'
        },
        matchingRows: [1, 4],
        description: 'Bitwise operation 10110 & 11010 = 10010. Matches Customer #1 and Customer #4 in 1 CPU cycle!'
      })
    } else {
      // Inverted Index
      steps.push({
        stepNumber: 1,
        title: 'Tokenized Inverted Index Postings List',
        postings: {
          'database': [1, 3, 5],
          'indexing': [2, 3, 4],
          'distributed': [3, 5]
        },
        query: "Search: 'database' AND 'indexing'",
        description: 'Postings lists loaded for terms.'
      })
      steps.push({
        stepNumber: 2,
        title: 'Intersect Postings Lists: [1, 3, 5] ∩ [2, 3, 4]',
        matchingDocs: [3],
        description: 'Intersection matches Document 3! Returned in sub-millisecond time.'
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
