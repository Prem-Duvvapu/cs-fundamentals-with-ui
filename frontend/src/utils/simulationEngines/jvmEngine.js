/**
 * JVM Memory & GC Simulation Engine
 * Simulates object allocation in Eden, Survivor S0/S1 copying, age promotion, and Old Gen / Metaspace.
 */

let nextObjId = 1

export class JvmMemoryEngine {
  constructor(edenCapacity = 6, survivorCapacity = 3, oldCapacity = 8) {
    this.edenCapacity = edenCapacity
    this.survivorCapacity = survivorCapacity
    this.oldCapacity = oldCapacity

    this.eden = []
    this.s0 = []
    this.s1 = []
    this.oldGen = []
    this.metaspace = ['String.class', 'Object.class', 'UserService.class']
    this.activeSurvivor = 0 // 0 for S0, 1 for S1
    this.gcCount = 0
  }

  cloneState() {
    return {
      eden: [...this.eden.map(o => ({ ...o }))],
      s0: [...this.s0.map(o => ({ ...o }))],
      s1: [...this.s1.map(o => ({ ...o }))],
      oldGen: [...this.oldGen.map(o => ({ ...o }))],
      metaspace: [...this.metaspace],
      activeSurvivor: this.activeSurvivor,
      gcCount: this.gcCount
    }
  }

  allocateObject(name = `Obj#${nextObjId++}`, sizeKB = 100, isHumongous = false) {
    const steps = []
    const obj = { id: `obj-${nextObjId}`, name, sizeKB, age: 0, isAlive: true }

    if (isHumongous) {
      steps.push({
        action: 'HUMONGOUS_ALLOCATION',
        description: `⚠️ Large Object "${name}" (${sizeKB}KB) exceeds Eden single-slot threshold. Allocating directly in Old Generation!`,
        state: this.cloneState()
      })
      this.oldGen.push(obj)
      steps.push({
        action: 'ALLOCATED_OLD',
        description: `Allocated "${name}" into Old Gen.`,
        state: this.cloneState()
      })
      return steps
    }

    steps.push({
      action: 'ALLOCATE_START',
      description: `Requesting allocation for "${name}" (${sizeKB}KB) in Eden space.`,
      state: this.cloneState()
    })

    if (this.eden.length >= this.edenCapacity) {
      steps.push({
        action: 'EDEN_FULL',
        description: `⚠️ Eden space FULL (${this.eden.length}/${this.edenCapacity} slots). Triggering Minor GC!`,
        state: this.cloneState()
      })

      const gcSteps = this.triggerMinorGC()
      steps.push(...gcSteps)
    }

    this.eden.push(obj)
    steps.push({
      action: 'ALLOCATED_EDEN',
      description: `✅ Allocated "${name}" inside Eden space. (Eden: ${this.eden.length}/${this.edenCapacity})`,
      state: this.cloneState()
    })

    return steps
  }

  triggerMinorGC() {
    const steps = []
    this.gcCount++

    steps.push({
      action: 'MINOR_GC_START',
      description: `🧹 Minor GC #${this.gcCount} started. Marking live objects in Eden and Survivor spaces...`,
      state: this.cloneState()
    })

    // Randomly simulate ~60% survival rate for realistic GC
    const survivingEden = []
    const deadEden = []

    this.eden.forEach((obj, idx) => {
      // Keep even objects, mark odd objects dead
      if (idx % 2 === 0) {
        obj.age += 1
        survivingEden.push(obj)
      } else {
        obj.isAlive = false
        deadEden.push(obj)
      }
    })

    steps.push({
      action: 'GC_MARKED',
      description: `Marked ${deadEden.length} dead objects for reclamation. ${survivingEden.length} live objects survive.`,
      state: this.cloneState()
    })

    // Copy surviving Eden objects to active Survivor space
    const targetSurvivor = this.activeSurvivor === 0 ? this.s0 : this.s1
    const targetName = this.activeSurvivor === 0 ? 'S0' : 'S1'

    survivingEden.forEach(obj => {
      if (obj.age >= 3) {
        this.oldGen.push(obj)
        steps.push({
          action: 'TENURED_PROMOTION',
          description: `🚀 Object "${obj.name}" reached max tenuring threshold (Age ${obj.age}). Promoted to Old Generation!`,
          state: this.cloneState()
        })
      } else {
        targetSurvivor.push(obj)
      }
    })

    // Clear Eden
    this.eden = []

    // Swap survivor spaces S0 <-> S1
    this.activeSurvivor = this.activeSurvivor === 0 ? 1 : 0
    if (this.activeSurvivor === 0) this.s1 = []
    else this.s0 = []

    steps.push({
      action: 'MINOR_GC_COMPLETE',
      description: `✅ Minor GC complete. Eden cleared. Active survivor swapped to ${this.activeSurvivor === 0 ? 'S0' : 'S1'}.`,
      state: this.cloneState()
    })

    return steps
  }
}
