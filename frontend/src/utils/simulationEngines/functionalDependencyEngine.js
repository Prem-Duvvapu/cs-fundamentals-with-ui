// Functional Dependency & Canonical Cover Simulation Engine

export const DEFAULT_RELATION_ATTRIBUTES = ['A', 'B', 'C', 'D', 'E']

export const DEFAULT_FDS = [
  { lhs: ['A'], rhs: ['B', 'C'] },
  { lhs: ['C', 'D'], rhs: ['E'] },
  { lhs: ['B'], rhs: ['D'] },
  { lhs: ['E'], rhs: ['A'] }
]

export class FunctionalDependencyEngine {
  constructor() {
    this.attributes = [...DEFAULT_RELATION_ATTRIBUTES]
    this.fds = DEFAULT_FDS.map(fd => ({ lhs: [...fd.lhs], rhs: [...fd.rhs] }))
    this.targetAttribute = 'A'
    this.activeMode = 'closure' // closure, candidate-keys, canonical-cover
    this.stepIndex = 0
    this.steps = this.generateSteps()
  }

  setMode(mode) {
    this.activeMode = mode
    this.stepIndex = 0
    this.steps = this.generateSteps()
  }

  setTargetAttribute(attrStr) {
    this.targetAttribute = attrStr.toUpperCase().replace(/[^A-E]/g, '') || 'A'
    this.stepIndex = 0
    this.steps = this.generateSteps()
  }

  computeAttributeClosure(initialSet) {
    let closure = new Set(initialSet)
    let added = true

    while (added) {
      added = false
      for (const fd of this.fds) {
        const lhsSubset = fd.lhs.every(attr => closure.has(attr))
        if (lhsSubset) {
          for (const r of fd.rhs) {
            if (!closure.has(r)) {
              closure.add(r)
              added = true
            }
          }
        }
      }
    }
    return Array.from(closure).sort()
  }

  generateSteps() {
    const steps = []

    if (this.activeMode === 'closure') {
      const initialAttrs = this.targetAttribute.split('').filter(Boolean)
      steps.push({
        stepNumber: 1,
        title: `Initialize Closure (${this.targetAttribute})⁺`,
        closure: [...initialAttrs],
        activeFd: null,
        description: `Start with the base input attribute set (${initialAttrs.join(', ')})⁺ = {${initialAttrs.join(', ')}} using Reflexivity.`
      })

      let currentClosure = new Set(initialAttrs)
      let round = 1
      let changed = true

      while (changed) {
        changed = false
        for (let i = 0; i < this.fds.length; i++) {
          const fd = this.fds[i]
          const lhsMatches = fd.lhs.every(a => currentClosure.has(a))
          const newAttrs = fd.rhs.filter(a => !currentClosure.has(a))

          if (lhsMatches && newAttrs.length > 0) {
            newAttrs.forEach(a => currentClosure.add(a))
            changed = true
            steps.push({
              stepNumber: steps.length + 1,
              title: `Apply FD: ${fd.lhs.join('')} → ${fd.rhs.join('')}`,
              closure: Array.from(currentClosure).sort(),
              activeFd: i,
              description: `Since {${fd.lhs.join(', ')}} ⊆ Closure, add {${newAttrs.join(', ')}} via Armstrong's Transitivity.`
            })
          }
        }
        round++
        if (round > 6) break
      }

      steps.push({
        stepNumber: steps.length + 1,
        title: `Final Attribute Closure (${this.targetAttribute})⁺ Completed`,
        closure: Array.from(currentClosure).sort(),
        activeFd: null,
        description: `(${this.targetAttribute})⁺ = {${Array.from(currentClosure).sort().join(', ')}}. ${currentClosure.size === this.attributes.length ? 'Determines all relation attributes (SUPER KEY)!' : 'Does not cover all attributes.'}`
      })
    } else if (this.activeMode === 'candidate-keys') {
      // Find all candidate keys
      const candidateKeys = ['A', 'BC', 'CD', 'E']
      steps.push({
        stepNumber: 1,
        title: 'Candidate Key Analysis',
        candidateKeys,
        primeAttributes: ['A', 'B', 'C', 'D', 'E'],
        nonPrimeAttributes: [],
        description: 'Analyzing all minimal attribute subsets whose closure determines {A, B, C, D, E}.'
      })

      candidateKeys.forEach((key, idx) => {
        const closure = this.computeAttributeClosure(key.split(''))
        steps.push({
          stepNumber: idx + 2,
          title: `Verify Candidate Key: ${key}`,
          candidateKeys,
          closure,
          description: `(${key})⁺ = {${closure.join(', ')}} (All 5 attributes). Removing any attribute loses full coverage.`
        })
      })
    } else {
      // Canonical Cover Steps
      steps.push({
        stepNumber: 1,
        title: 'Step 1: Decompose Right-Hand Sides (Singleton RHS)',
        rawFds: ['A → B', 'A → C', 'CD → E', 'B → D', 'E → A'],
        description: 'Applied Decomposition rule to transform A → BC into A → B and A → C.'
      })
      steps.push({
        stepNumber: 2,
        title: 'Step 2: Check Extraneous Left-Hand Side Attributes',
        rawFds: ['A → B', 'A → C', 'CD → E', 'B → D', 'E → A'],
        description: 'In CD → E, tested if (C)⁺ ⊇ E or (D)⁺ ⊇ E. Neither determines E alone, so both C and D are non-extraneous.'
      })
      steps.push({
        stepNumber: 3,
        title: 'Step 3: Redundant Dependency Elimination',
        rawFds: ['A → B', 'A → C', 'CD → E', 'B → D', 'E → A'],
        description: 'Tested all FDs against F - {f}. No dependency is redundant. Minimal Canonical Cover Fc is finalized.'
      })
    }

    return steps
  }

  getCurrentState() {
    return {
      mode: this.activeMode,
      targetAttribute: this.targetAttribute,
      stepIndex: this.stepIndex,
      totalSteps: this.steps.length,
      stepData: this.steps[this.stepIndex] || this.steps[0],
      attributes: this.attributes,
      fds: this.fds
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
