// I/O Systems Simulation Engine: Programmed I/O vs Interrupt vs DMA & Select vs Epoll

export const IO_SCENARIOS = {
  'io-modes': {
    id: 'io-modes',
    name: '1. Programmed I/O vs Interrupt-Driven vs DMA',
    description: 'Compare CPU utilization and execution timelines across Programmed I/O (busy wait), Interrupt-driven I/O, and Direct Memory Access (DMA).'
  },
  'epoll-vs-select': {
    id: 'epoll-vs-select',
    name: '2. Polling Efficiency: select() O(N) vs epoll_wait() O(1)',
    description: 'Demonstrates file descriptor readiness scanning. select() inspects all N file descriptors every call; epoll_wait() returns the ready ready-list directly.'
  }
}

export class IoSystemsEngine {
  constructor() {
    this.activeScenario = 'io-modes'
    this.stepIndex = 0
    this.steps = this.generateSteps()
  }

  setScenario(scenarioId) {
    if (IO_SCENARIOS[scenarioId]) {
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
      scenarioMeta: IO_SCENARIOS[this.activeScenario],
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
    if (this.activeScenario === 'io-modes') {
      return [
        {
          stepNumber: 1,
          title: 'Mode 1: Programmed I/O (Busy Waiting / Polling)',
          description: 'CPU issues I/O command to device controller and enters a tight polling loop checking status register until transfer completes.',
          cpuBusyWait: '100%',
          cpuOtherWork: '0%',
          interruptsCount: 0,
          dmaTransfers: 0,
          status: 'CPU trapped in status checking loop. 100% CPU core wasted checking hardware status bits.',
          timeline: [
            { time: 'T0', cpuState: 'Issue Read Cmd', deviceState: 'Seek Disk' },
            { time: 'T1', cpuState: 'Poll Status (Busy)', deviceState: 'Read Sector' },
            { time: 'T2', cpuState: 'Poll Status (Busy)', deviceState: 'Transfer Byte 1' },
            { time: 'T3', cpuState: 'Poll Status (Done)', deviceState: 'Ready' }
          ]
        },
        {
          stepNumber: 2,
          title: 'Mode 2: Interrupt-Driven I/O',
          description: 'CPU issues I/O command and immediately context-switches to run other user processes. Hardware controller raises IRQ line when data is ready.',
          cpuBusyWait: '15%',
          cpuOtherWork: '85%',
          interruptsCount: 1,
          dmaTransfers: 0,
          status: 'CPU performs useful user compute while disk controller handles hardware reads asynchronously.',
          timeline: [
            { time: 'T0', cpuState: 'Issue Read & Switch', deviceState: 'Seek Disk' },
            { time: 'T1', cpuState: 'Running Process B', deviceState: 'Read Sector' },
            { time: 'T2', cpuState: 'Running Process B', deviceState: 'Raise IRQ Line' },
            { time: 'T3', cpuState: 'Handle ISR & Copy Byte', deviceState: 'Done' }
          ]
        },
        {
          stepNumber: 3,
          title: 'Mode 3: Direct Memory Access (DMA)',
          description: 'CPU initializes DMA controller with Source, Destination, and Byte Count, then releases bus. DMA controller transfers entire data block directly to RAM without CPU intervention.',
          cpuBusyWait: '2%',
          cpuOtherWork: '98%',
          interruptsCount: 1,
          dmaTransfers: 1,
          status: 'Maximum CPU efficiency. CPU receives 1 single interrupt per multi-megabyte block transfer.',
          timeline: [
            { time: 'T0', cpuState: 'Init DMA (Src/Dst/Count)', deviceState: 'Idle' },
            { time: 'T1', cpuState: 'Running Process B', deviceState: 'DMA Bus Master Transfer' },
            { time: 'T2', cpuState: 'Running Process B', deviceState: 'DMA Bus Master Transfer' },
            { time: 'T3', cpuState: 'Handle 1 Completion IRQ', deviceState: 'Transfer Complete' }
          ]
        }
      ]
    } else {
      return [
        {
          stepNumber: 1,
          title: 'select() System Call: O(N) Linear File Descriptor Scan',
          description: 'Application monitors 1,000 socket FDs. select() copies fd_set bitmask from user to kernel space and loops through all 1,000 FDs sequentially every single call.',
          fdsMonitored: 1000,
          fdsReady: 3,
          scansPerformed: 1000,
          complexity: 'O(N) linear scan',
          status: 'Heavy overhead. 997 non-ready descriptors scanned unnecessarily.'
        },
        {
          stepNumber: 2,
          title: 'epoll_wait() System Call: O(1) Event-Driven Ready List',
          description: 'Kernel maintains an internal Red-Black tree of registered FDs and an active ready-list linked list. Device interrupts append ready sockets directly to the ready-list.',
          fdsMonitored: 1000,
          fdsReady: 3,
          scansPerformed: 3,
          complexity: 'O(1) constant time',
          status: 'Optimal efficiency. epoll_wait() copies only the 3 ready FDs directly to user buffer without scanning idle sockets.'
        }
      ]
    }
  }
}
