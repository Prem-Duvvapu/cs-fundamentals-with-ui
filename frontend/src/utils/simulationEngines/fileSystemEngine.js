// File System Inode & VFS Simulation Engine

export const FILE_SIZE_PRESETS = [
  { label: '4 KB (1 Direct Block)', bytes: 4 * 1024 },
  { label: '48 KB (12 Direct Blocks)', bytes: 48 * 1024 },
  { label: '600 KB (Direct + Single Indirect)', bytes: 600 * 1024 },
  { label: '10 MB (Direct + Single + Double Indirect)', bytes: 10 * 1024 * 1024 }
]

export class FileSystemEngine {
  constructor(blockSizeBytes = 4096) {
    this.blockSizeBytes = blockSizeBytes // 4 KB per block
    this.pointersPerBlock = blockSizeBytes / 4 // 1024 pointers per indirect block (4 bytes per pointer)
    this.targetSizeBytes = 48 * 1024
    this.stepIndex = 0
    this.steps = this.generateSteps()
  }

  setFileSize(bytes) {
    this.targetSizeBytes = Math.max(1, bytes)
    this.stepIndex = 0
    this.steps = this.generateSteps()
    return this.getCurrentState()
  }

  getCurrentState() {
    const currentStep = this.steps[this.stepIndex] || this.steps[0]
    return {
      targetSizeBytes: this.targetSizeBytes,
      targetSizeMB: (this.targetSizeBytes / (1024 * 1024)).toFixed(2),
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
    const totalDataBlocks = Math.ceil(this.targetSizeBytes / this.blockSizeBytes)
    const directLimit = 12
    const singleLimit = directLimit + this.pointersPerBlock // 12 + 1024 = 1036 blocks (~4.04 MB)
    const doubleLimit = singleLimit + (this.pointersPerBlock * this.pointersPerBlock) // 1036 + 1,048,576 (~4 GB)

    const directUsed = Math.min(totalDataBlocks, directLimit)
    const remainingAfterDirect = Math.max(0, totalDataBlocks - directLimit)

    const singleDataUsed = Math.min(remainingAfterDirect, this.pointersPerBlock)
    const singleIndexUsed = singleDataUsed > 0 ? 1 : 0
    const remainingAfterSingle = Math.max(0, remainingAfterDirect - this.pointersPerBlock)

    const doubleDataUsed = Math.min(remainingAfterSingle, this.pointersPerBlock * this.pointersPerBlock)
    const doubleIndexUsed = doubleDataUsed > 0 ? 1 + Math.ceil(doubleDataUsed / this.pointersPerBlock) : 0
    const remainingAfterDouble = Math.max(0, remainingAfterSingle - (this.pointersPerBlock * this.pointersPerBlock))

    const tripleDataUsed = remainingAfterDouble
    const tripleIndexUsed = tripleDataUsed > 0 ? 1 + Math.ceil(tripleDataUsed / (this.pointersPerBlock * this.pointersPerBlock)) + Math.ceil(tripleDataUsed / this.pointersPerBlock) : 0

    const totalMetadataBlocks = singleIndexUsed + doubleIndexUsed + tripleIndexUsed
    const totalPhysicalBlocksTouched = totalDataBlocks + totalMetadataBlocks

    return [
      {
        stepNumber: 1,
        title: `File Allocation Overview (${(this.targetSizeBytes / 1024).toFixed(0)} KB)`,
        description: `File requires ${totalDataBlocks} data blocks (${this.blockSizeBytes / 1024} KB each). Checking Inode direct pointers.`,
        activeTier: 'direct',
        directUsed,
        singleDataUsed,
        singleIndexUsed,
        doubleDataUsed,
        doubleIndexUsed,
        tripleDataUsed,
        tripleIndexUsed,
        totalDataBlocks,
        totalMetadataBlocks,
        totalPhysicalBlocksTouched,
        explanation: directUsed > 0 
          ? `Inode direct pointers [0..11] hold up to 12 data blocks (48 KB). We allocate ${directUsed} direct data block(s). Lookup is O(1) with 0 extra index block overhead.`
          : 'File size is 0 bytes.'
      },
      {
        stepNumber: 2,
        title: 'Single-Indirect Pointer Tier Check',
        description: `Direct pointers capped at 48 KB. ${remainingAfterDirect > 0 ? `File requires ${remainingAfterDirect} additional blocks.` : 'File fits entirely within Direct pointers.'}`,
        activeTier: singleDataUsed > 0 ? 'single' : 'direct',
        directUsed,
        singleDataUsed,
        singleIndexUsed,
        doubleDataUsed,
        doubleIndexUsed,
        tripleDataUsed,
        tripleIndexUsed,
        totalDataBlocks,
        totalMetadataBlocks,
        totalPhysicalBlocksTouched,
        explanation: singleDataUsed > 0
          ? `Single-indirect pointer points to 1 index block containing 1,024 block pointers (~4 MB capacity). Allocated 1 index block + ${singleDataUsed} data blocks.`
          : 'No single-indirect blocks needed for this file size.'
      },
      {
        stepNumber: 3,
        title: 'Double & Triple-Indirect Pointer Tier Check',
        description: `Single-indirect holds up to ~4 MB. ${remainingAfterSingle > 0 ? `Remaining ${remainingAfterSingle} blocks require Double-Indirect pointers.` : 'File size handled within Direct + Single-Indirect.'}`,
        activeTier: doubleDataUsed > 0 ? 'double' : (singleDataUsed > 0 ? 'single' : 'direct'),
        directUsed,
        singleDataUsed,
        singleIndexUsed,
        doubleDataUsed,
        doubleIndexUsed,
        tripleDataUsed,
        tripleIndexUsed,
        totalDataBlocks,
        totalMetadataBlocks,
        totalPhysicalBlocksTouched,
        explanation: doubleDataUsed > 0
          ? `Double-indirect pointer points to an index block of index blocks (~4 GB capacity). Allocated ${doubleIndexUsed} metadata index blocks + ${doubleDataUsed} data blocks.`
          : 'Double-indirect and triple-indirect tiers are unused.'
      }
    ]
  }
}
