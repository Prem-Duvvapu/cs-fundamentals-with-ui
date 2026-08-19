// Disk Scheduling Simulation Engine (FCFS, SSTF, SCAN, C-SCAN)

export const DISK_ALGORITHMS = {
  fcfs: 'FCFS (First Come First Served)',
  sstf: 'SSTF (Shortest Seek Time First)',
  scan: 'SCAN (Elevator Algorithm)',
  cscan: 'C-SCAN (Circular SCAN)'
}

export class DiskSchedulingEngine {
  constructor(initialHead = 50, requests = [95, 180, 34, 119, 11, 123, 62, 64], maxCylinder = 199) {
    this.initialHead = initialHead
    this.requests = requests
    this.maxCylinder = maxCylinder
    this.algorithm = 'fcfs'
    this.stepIndex = 0
    this.steps = this.generateSteps()
  }

  setAlgorithm(algo) {
    if (DISK_ALGORITHMS[algo]) {
      this.algorithm = algo
      this.stepIndex = 0
      this.steps = this.generateSteps()
    }
    return this.getCurrentState()
  }

  setHeadAndRequests(head, requests) {
    this.initialHead = Math.max(0, Math.min(this.maxCylinder, head))
    if (Array.isArray(requests) && requests.length > 0) {
      this.requests = requests.map(r => Math.max(0, Math.min(this.maxCylinder, r)))
    }
    this.stepIndex = 0
    this.steps = this.generateSteps()
    return this.getCurrentState()
  }

  getCurrentState() {
    const currentStep = this.steps[this.stepIndex] || this.steps[0]
    return {
      algorithm: this.algorithm,
      algorithmName: DISK_ALGORITHMS[this.algorithm],
      initialHead: this.initialHead,
      requests: this.requests,
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

  computeSequence() {
    const head = this.initialHead
    const reqs = [...this.requests]

    if (this.algorithm === 'fcfs') {
      return reqs
    } else if (this.algorithm === 'sstf') {
      const seq = []
      let curr = head
      const remaining = [...reqs]
      while (remaining.length > 0) {
        remaining.sort((a, b) => Math.abs(a - curr) - Math.abs(b - curr))
        const next = remaining.shift()
        seq.push(next)
        curr = next
      }
      return seq
    } else if (this.algorithm === 'scan') {
      // SCAN right towards maxCylinder, then left
      const right = reqs.filter(r => r >= head).sort((a, b) => a - b)
      const left = reqs.filter(r => r < head).sort((a, b) => b - a)
      return [...right, this.maxCylinder, ...left]
    } else if (this.algorithm === 'cscan') {
      // C-SCAN right towards maxCylinder, jump to 0, then right
      const right = reqs.filter(r => r >= head).sort((a, b) => a - b)
      const left = reqs.filter(r => r < head).sort((a, b) => a - b)
      return [...right, this.maxCylinder, 0, ...left]
    }
    return reqs
  }

  generateSteps() {
    const sequence = this.computeSequence()
    let currentHead = this.initialHead
    let accumSeek = 0

    const steps = [
      {
        stepNumber: 1,
        title: `Initial State (Head at Cylinder ${this.initialHead})`,
        currentHead: this.initialHead,
        targetCylinder: null,
        stepSeekDistance: 0,
        accumulatedSeekDistance: 0,
        servicedSoFar: [],
        remainingRequests: [...sequence],
        explanation: `Disk head starts at cylinder ${this.initialHead}. Request queue: [${this.requests.join(', ')}].`
      }
    ]

    sequence.forEach((target, idx) => {
      const distance = Math.abs(target - currentHead)
      accumSeek += distance
      steps.push({
        stepNumber: idx + 2,
        title: `Step ${idx + 1}: Seek to Cylinder ${target}`,
        currentHead: target,
        targetCylinder: target,
        stepSeekDistance: distance,
        accumulatedSeekDistance: accumSeek,
        servicedSoFar: sequence.slice(0, idx + 1),
        remainingRequests: sequence.slice(idx + 1),
        explanation: `Moved head from ${currentHead} to ${target} (${distance} cylinders). Total seek: ${accumSeek} cylinders.`
      })
      currentHead = target
    })

    return steps
  }
}
