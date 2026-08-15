// Query Optimizer & Cost-Based Optimizer (CBO) Simulation Engine

export class QueryOptimizerEngine {
  constructor() {
    this.tableRSize = 10000 // 10,000 tuples
    this.tableSSize = 50000 // 50,000 tuples
    this.bufferPages = 50
    this.stepIndex = 0
    this.steps = this.generateSteps()
  }

  setParams(r, s, m) {
    this.tableRSize = r
    this.tableSSize = s
    this.bufferPages = m
    this.steps = this.generateSteps()
  }

  calculateCosts() {
    // 1 block = 50 tuples
    const Br = Math.ceil(this.tableRSize / 50)
    const Bs = Math.ceil(this.tableSSize / 50)
    const M = this.bufferPages

    const nestedLoop = Br + this.tableRSize * Bs
    const blockNestedLoop = Br + Math.ceil(Br / (M - 2)) * Bs
    const sortMerge = 3 * (Br + Bs)
    const hashJoin = 3 * (Br + Bs)

    return { Br, Bs, nestedLoop, blockNestedLoop, sortMerge, hashJoin }
  }

  generateSteps() {
    const costs = this.calculateCosts()
    const steps = []

    steps.push({
      stepNumber: 1,
      title: 'Canonical Relational Algebra Query Tree (Unoptimized)',
      stage: 'UNOPTIMIZED_TREE',
      treeLayout: [
        'Projection: π_{e.name, d.dept_name, e.salary}',
        '   │',
        'Selection: σ_{e.salary > 80000 AND d.location = "Floor 4"}',
        '   │',
        'Cross Product (×)',
        ' ┌─┴─┐',
        'TableScan(Employees)   TableScan(Departments)'
      ],
      estimatedCost: '500,000,000 intermediate comparisons (EXTREMELY HIGH)',
      description: 'Initial query tree evaluates Cartesian Product FIRST before applying Selection filters, generating huge intermediate relations.'
    })

    steps.push({
      stepNumber: 2,
      title: 'Heuristic Rule 1: Predicate Pushdown (σ)',
      stage: 'PREDICATE_PUSHDOWN',
      treeLayout: [
        'Projection: π_{e.name, d.dept_name, e.salary}',
        '   │',
        'Equi-Join: ⋈_{e.dept_id = d.dept_id}',
        ' ┌─┴─┐',
        'σ_{salary > 80000}(Employees)   σ_{location = "Floor 4"}(Departments)'
      ],
      estimatedCost: '5,000 intermediate comparisons (100x FASTER)',
      description: 'Pushed Selection predicates down to scan operators, filtering out 95% of tuples BEFORE the join!'
    })

    steps.push({
      stepNumber: 3,
      title: 'Heuristic Rule 2: Projection Pushdown (π)',
      stage: 'PROJECTION_PUSHDOWN',
      treeLayout: [
        'Join: ⋈_{dept_id}',
        ' ┌─┴─┐',
        'π_{name, salary, dept_id}(σ(Employees))   π_{dept_id, dept_name}(σ(Departments))'
      ],
      estimatedCost: 'Reduced tuple memory width by 60%',
      description: 'Pushed Projection down to eliminate unused columns (e.g. employee address, phone) from memory buffers.'
    })

    steps.push({
      stepNumber: 4,
      title: 'Cost-Based Optimizer (CBO) Physical Plan Selection',
      stage: 'PHYSICAL_SELECTION',
      costs,
      recommendedAlgorithm: 'Hash Join (Grace Hash)',
      description: `CBO evaluated physical join costs: Hash Join (${costs.hashJoin} I/Os) beats Nested Loop (${costs.nestedLoop} I/Os).`
    })

    return steps
  }

  getCurrentState() {
    return {
      tableRSize: this.tableRSize,
      tableSSize: this.tableSSize,
      bufferPages: this.bufferPages,
      costs: this.calculateCosts(),
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
