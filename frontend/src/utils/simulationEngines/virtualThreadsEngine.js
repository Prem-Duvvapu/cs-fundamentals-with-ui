/**
 * Virtual Threads (Project Loom) Engine
 * Simulates M:N Virtual Thread to Carrier OS Thread mounting, unmounting during blocking I/O, and carrier reallocation.
 */

let nextVThreadId = 1

export class VirtualThreadsEngine {
  constructor(carrierCount = 2) {
    this.carrierCount = carrierCount
    this.carriers = Array.from({ length: carrierCount }, (_, i) => ({
      id: `Carrier-OS-${i + 1}`,
      mountedVThread: null,
      status: 'IDLE'
    }))
    this.virtualThreads = []
  }

  cloneState() {
    return {
      carriers: this.carriers.map(c => ({ ...c, mountedVThread: c.mountedVThread ? { ...c.mountedVThread } : null })),
      virtualThreads: this.virtualThreads.map(vt => ({ ...vt }))
    }
  }

  spawnVirtualThreads(count = 4) {
    const steps = []
    const newThreads = []

    for (let i = 0; i < count; i++) {
      const vt = {
        id: `VT-${nextVThreadId++}`,
        status: 'RUNNABLE', // RUNNABLE, MOUNTED, PARKED_IO, COMPLETED
        carrierId: null,
        pinned: false
      }
      this.virtualThreads.push(vt)
      newThreads.push(vt)
    }

    steps.push({
      action: 'SPAWN_VTHREADS',
      description: `Spawned ${count} lightweight Virtual Threads (Memory: ~1KB each). Status: RUNNABLE.`,
      state: this.cloneState()
    })

    // Auto-schedule onto available carriers
    const schedSteps = this.schedule()
    steps.push(...schedSteps)

    return steps
  }

  schedule() {
    const steps = []

    this.carriers.forEach(carrier => {
      if (!carrier.mountedVThread) {
        const runnableVT = this.virtualThreads.find(vt => vt.status === 'RUNNABLE')
        if (runnableVT) {
          runnableVT.status = 'MOUNTED'
          runnableVT.carrierId = carrier.id
          carrier.mountedVThread = runnableVT
          carrier.status = 'RUNNING'

          steps.push({
            action: 'MOUNT_VTHREAD',
            description: `✨ Mounted ${runnableVT.id} onto ${carrier.id}. Carrier Thread is executing bytecode.`,
            state: this.cloneState()
          })
        }
      }
    })

    return steps
  }

  triggerIO(vtId) {
    const steps = []
    const vt = this.virtualThreads.find(t => t.id === vtId)
    if (!vt || vt.status !== 'MOUNTED') return steps

    const carrier = this.carriers.find(c => c.id === vt.carrierId)

    steps.push({
      action: 'BLOCKING_IO_REQUEST',
      description: `🌐 ${vt.id} initiated blocking I/O (e.g. HTTP call / DB query).`,
      state: this.cloneState()
    })

    // Unmount!
    vt.status = 'PARKED_IO'
    vt.carrierId = null
    if (carrier) {
      carrier.mountedVThread = null
      carrier.status = 'IDLE'
    }

    steps.push({
      action: 'UNMOUNT_VTHREAD',
      description: `🚀 UNMOUNTED! ${vt.id} unmounted from ${carrier.id} and parked. ${carrier.id} is now FREE for other Virtual Threads!`,
      state: this.cloneState()
    })

    // Immediately schedule waiting runnable threads onto the now-free carrier
    const schedSteps = this.schedule()
    steps.push(...schedSteps)

    return steps
  }

  completeIO(vtId) {
    const steps = []
    const vt = this.virtualThreads.find(t => t.id === vtId)
    if (!vt || vt.status !== 'PARKED_IO') return steps

    vt.status = 'RUNNABLE'

    steps.push({
      action: 'IO_COMPLETE',
      description: `✅ I/O finished for ${vt.id}. Status changed to RUNNABLE. Waiting for carrier scheduling...`,
      state: this.cloneState()
    })

    const schedSteps = this.schedule()
    steps.push(...schedSteps)

    return steps
  }
}
