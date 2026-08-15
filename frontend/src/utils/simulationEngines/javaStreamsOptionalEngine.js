/**
 * Java Streams API Lazy Pipeline & Optional Simulation Engine
 * Simulates Lazy Evaluation, Intermediate Pipeline Chaining, Terminal Pull Execution, Short-circuiting, and Optional Monadic Chaining.
 */

export class JavaStreamsOptionalEngine {
  constructor() {
    this.sourceData = [12, 5, 8, 20, 3, 15]
    this.pipelineStages = ['source (6 items)', 'filter(n > 10)', 'map(n * 2)']
    this.processedItems = []
    this.terminalResult = null
    this.optionalState = { value: 'User@0x1A', isPresent: true, transformed: null }
    this.auditLog = ''
  }

  cloneState() {
    return {
      sourceData: [...this.sourceData],
      pipelineStages: [...this.pipelineStages],
      processedItems: [...this.processedItems],
      terminalResult: this.terminalResult,
      optionalState: { ...this.optionalState },
      auditLog: this.auditLog
    }
  }

  getExecutionSteps() {
    const steps = []

    // Step 1: Stream Pipeline Construction (Lazy Intermediate Ops)
    steps.push({
      stepNumber: 1,
      stage: 'STREAM_PIPELINE_CREATION',
      title: '1. Stream Source & Lazy Intermediate Operations',
      command: 'Stream<Integer> s = list.stream().filter(n -> n > 10).map(n -> n * 2);',
      artifact: 'Pipeline: Source ➔ filter(n > 10) ➔ map(n * 2) [NOT EXECUTED YET!]',
      description: 'Stream intermediate operations (filter, map, sorted, flatMap) are strictly LAZY. Calling them simply constructs a linked list of java.util.stream.Sink pipeline nodes without processing any items.',
      state: { ...this.cloneState(), auditLog: 'Constructed lazy pipeline descriptor; 0 elements processed.' }
    })

    // Step 2: Terminal Operation Pull-Based Trigger
    this.processedItems = [
      { item: 12, passedFilter: true, mappedValue: 24, includedInOutput: true },
      { item: 5, passedFilter: false, mappedValue: null, includedInOutput: false },
      { item: 8, passedFilter: false, mappedValue: null, includedInOutput: false },
      { item: 20, passedFilter: true, mappedValue: 40, includedInOutput: true },
      { item: 3, passedFilter: false, mappedValue: null, includedInOutput: false },
      { item: 15, passedFilter: true, mappedValue: 30, includedInOutput: true }
    ]
    this.terminalResult = [24, 40, 30]
    steps.push({
      stepNumber: 2,
      stage: 'TERMINAL_COLLECT_TRIGGER',
      title: '2. Terminal Operation (collect) Triggers Vertical Fusion Flow',
      command: 'List<Integer> result = s.collect(Collectors.toList()); // Result: [24, 40, 30]',
      artifact: 'Vertical Fusion: Each element passes filter -> map -> collect one-by-one in a single pass',
      description: 'The terminal operation (collect, reduce, count) pulls data through the pipeline using "Vertical Loop Fusion". Instead of filtering the whole array and then mapping the whole array, each element flows end-to-end through all steps in a single cache-efficient pass.',
      state: { ...this.cloneState(), auditLog: 'Terminal collect() executed with vertical fusion. Output: [24, 40, 30].' }
    })

    // Step 3: Short-Circuiting Stream Operations (findFirst / limit)
    steps.push({
      stepNumber: 3,
      stage: 'SHORT_CIRCUIT_OPERATION',
      title: '3. Short-Circuiting Optimization (findFirst / anyMatch)',
      command: 'Optional<Integer> first = list.stream().filter(n -> n > 10).map(n -> n * 2).findFirst();',
      artifact: 'Short-Circuit: Terminates after evaluating first matching element (12 -> 24); elements [5, 8, 20, 3, 15] are NEVER processed!',
      description: 'Short-circuiting operations like findFirst(), findAny(), and limit(1) immediately abort pipeline iteration as soon as the condition is satisfied, avoiding unnecessary CPU computations on remaining elements.',
      state: { ...this.cloneState(), auditLog: 'Short-circuit triggered at element 12 -> Returned Optional.of(24).' }
    })

    // Step 4: Optional<T> Null-Safe Container Mechanics
    this.optionalState = { value: 'null', isPresent: false, transformed: 'DEFAULT_ANONYMOUS' }
    steps.push({
      stepNumber: 4,
      stage: 'OPTIONAL_NULL_SAFETY',
      title: '4. Optional<T> Monadic Chaining (Eliminating NPEs)',
      command: 'String name = Optional.ofNullable(user).map(User::getName).filter(n -> !n.isEmpty()).orElse("Anonymous");',
      artifact: 'Optional Monad: ofNullable ➔ map ➔ filter ➔ orElse("Anonymous")',
      description: 'Optional<T> is a single-value container designed to make the absence of a value explicit in method return signatures. Chaining map(), flatMap(), and filter() avoids nested "if (obj != null)" checks and eliminates NullPointerExceptions.',
      state: { ...this.cloneState(), auditLog: 'Optional safely fell back to orElse fallback "Anonymous".' }
    })

    return steps
  }
}
