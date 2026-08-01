/**
 * Virtual Memory MMU Simulation Engine
 * Simulates Virtual Page to Physical Frame translation, TLB Hit/Miss cache lookups, and Page Fault resolution.
 */

export class VirtualMemoryEngine {
  constructor() {
    this.tlb = [
      { vpn: 1, frame: 5, valid: true },
      { vpn: 3, frame: 12, valid: true }
    ]
    this.pageTable = [
      { vpn: 0, frame: 8, valid: true },
      { vpn: 1, frame: 5, valid: true },
      { vpn: 2, frame: 2, valid: true },
      { vpn: 3, frame: 12, valid: true },
      { vpn: 4, frame: null, valid: false }, // Page on disk
      { vpn: 5, frame: 9, valid: true },
      { vpn: 6, frame: null, valid: false },
      { vpn: 7, frame: 14, valid: true }
    ]
    this.freeFrames = [0, 1, 3, 4, 6, 7, 10, 11, 13, 15]
    this.nextVictimTlbIdx = 0
  }

  cloneState() {
    return {
      tlb: [...this.tlb.map(e => ({ ...e }))],
      pageTable: [...this.pageTable.map(p => ({ ...p }))],
      freeFrames: [...this.freeFrames]
    }
  }

  translate(vpn) {
    const steps = []

    steps.push({
      action: 'TRANSLATE_START',
      description: `🔍 Accessing Virtual Page #${vpn} (Offset 0x0A4). Initiating MMU hardware translation.`,
      highlightVpn: vpn,
      state: this.cloneState()
    })

    // 1. Search TLB Cache
    const tlbMatch = this.tlb.find(e => e.valid && e.vpn === vpn)

    if (tlbMatch) {
      const physicalAddr = (tlbMatch.frame << 12) | 0x0A4
      steps.push({
        action: 'TLB_HIT',
        description: `⚡ TLB HIT! Virtual Page #${vpn} found in TLB Cache ➔ Physical Frame #${tlbMatch.frame} (Phys Addr: 0x${physicalAddr.toString(16).toUpperCase()}). Latency: 1 cycle!`,
        highlightVpn: vpn,
        highlightFrame: tlbMatch.frame,
        isHit: true,
        state: this.cloneState()
      })
      return steps
    }

    // TLB Miss
    steps.push({
      action: 'TLB_MISS',
      description: `❌ TLB MISS! Virtual Page #${vpn} not in TLB. Falling back to Page Table lookup in RAM...`,
      highlightVpn: vpn,
      isHit: false,
      state: this.cloneState()
    })

    // 2. Search Page Table
    const ptEntry = this.pageTable.find(p => p.vpn === vpn)

    if (ptEntry && ptEntry.valid) {
      // Update TLB Cache (LRU replacement)
      this.tlb[this.nextVictimTlbIdx] = { vpn: ptEntry.vpn, frame: ptEntry.frame, valid: true }
      this.nextVictimTlbIdx = (this.nextVictimTlbIdx + 1) % 4

      const physicalAddr = (ptEntry.frame << 12) | 0x0A4
      steps.push({
        action: 'PAGE_TABLE_HIT',
        description: `✅ Page Table Hit. Virtual Page #${vpn} ➔ Physical Frame #${ptEntry.frame}. Cached translation in TLB.`,
        highlightVpn: vpn,
        highlightFrame: ptEntry.frame,
        state: this.cloneState()
      })
    } else {
      // 3. Page Fault Exception
      steps.push({
        action: 'PAGE_FAULT_START',
        description: `🚨 PAGE FAULT EXCEPTION (Valid bit = 0)! Page #${vpn} is not in physical RAM. OS Kernel handling disk read...`,
        highlightVpn: vpn,
        state: this.cloneState()
      })

      const assignedFrame = this.freeFrames.shift() || 15
      ptEntry.frame = assignedFrame
      ptEntry.valid = true

      this.tlb[this.nextVictimTlbIdx] = { vpn: ptEntry.vpn, frame: assignedFrame, valid: true }
      this.nextVictimTlbIdx = (this.nextVictimTlbIdx + 1) % 4

      steps.push({
        action: 'PAGE_FAULT_RESOLVED',
        description: `💾 OS loaded Page #${vpn} from Swap Disk into Physical Frame #${assignedFrame}. Page Table updated.`,
        highlightVpn: vpn,
        highlightFrame: assignedFrame,
        state: this.cloneState()
      })
    }

    return steps
  }
}
