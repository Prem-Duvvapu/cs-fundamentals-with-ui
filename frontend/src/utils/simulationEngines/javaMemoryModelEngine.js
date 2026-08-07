/**
 * Java Memory Model Simulation Engine
 * Simulates Stack Frame Push/Pop, Primitive Storage, Heap Allocation, Reference Pointers, and Pass-by-Value-Copy.
 */

export class JavaMemoryModelEngine {
  constructor() {
    this.stackFrames = []
    this.heapObjects = []
    this.consoleOutput = []
  }

  cloneState() {
    return {
      stackFrames: this.stackFrames.map(f => ({
        name: f.name,
        variables: f.variables.map(v => ({ ...v }))
      })),
      heapObjects: this.heapObjects.map(o => ({
        address: o.address,
        className: o.className,
        fields: { ...o.fields },
        status: o.status
      })),
      consoleOutput: [...this.consoleOutput]
    }
  }

  getExecutionSteps() {
    const steps = []

    // Step 1: Main Stack Frame & Primitives
    this.stackFrames = [
      {
        name: 'main(String[] args)',
        variables: [
          { name: 'age', type: 'int (Primitive)', value: '25', location: 'Stack Frame' },
          { name: 'isActive', type: 'boolean (Primitive)', value: 'true', location: 'Stack Frame' }
        ]
      }
    ]
    this.heapObjects = []
    this.consoleOutput = ['[main] Primitives age=25, isActive=true allocated directly inside main() Stack Frame.']

    steps.push({
      stepNumber: 1,
      stage: 'PRIMITIVES',
      title: '1. Stack Frame & Primitive Variable Allocation',
      command: 'int age = 25; boolean isActive = true;',
      artifact: 'Stack Frame: main()',
      description: 'Primitives (int, boolean, double) store their actual raw values directly inside the active Thread Stack Frame.',
      state: this.cloneState()
    })

    // Step 2: Heap Object Allocation & Reference
    this.heapObjects.push({
      address: '0x5F3A',
      className: 'User',
      fields: { name: '"Alice"', score: 100 },
      status: 'REFERENCED'
    })
    this.stackFrames[0].variables.push({
      name: 'user',
      type: 'User (Reference)',
      value: '➔ Pointer: @0x5F3A',
      location: 'Stack Frame'
    })
    this.consoleOutput.push('[main] new User("Alice") created on Heap at @0x5F3A. Stack reference variable "user" holds pointer @0x5F3A.')

    steps.push({
      stepNumber: 2,
      stage: 'HEAP_ALLOCATION',
      title: '2. Heap Object Allocation & Reference Pointer',
      command: 'User user = new User("Alice", 100);',
      artifact: 'Heap Memory: User@0x5F3A',
      description: 'new User() allocates instance fields on Heap Memory. The variable "user" on the Stack holds a 64-bit pointer address to @0x5F3A.',
      state: this.cloneState()
    })

    // Step 3: Method Call & Pass-by-Value-Copy
    this.stackFrames.unshift({
      name: 'updateUser(User u, int bonus)',
      variables: [
        { name: 'u', type: 'User (Reference Copy)', value: '➔ Pointer: @0x5F3A', location: 'Stack Frame' },
        { name: 'bonus', type: 'int (Primitive Copy)', value: '50', location: 'Stack Frame' }
      ]
    })
    this.consoleOutput.push('[updateUser] Pushed updateUser() Stack Frame. Passed reference copy @0x5F3A and primitive copy bonus=50.')

    steps.push({
      stepNumber: 3,
      stage: 'METHOD_CALL',
      title: '3. Method Call Stack Frame Push & Pass-by-Value',
      command: 'updateUser(user, 50);',
      artifact: 'Stack Frame: updateUser()',
      description: 'Java is strictly Pass-by-Value. Calling updateUser() pushes a new Stack Frame. Primitives & Reference pointers are copied into the new frame.',
      state: this.cloneState()
    })

    // Step 4: Object Field Mutation via Pointer
    this.heapObjects[0].fields.score = 150
    this.consoleOutput.push('[updateUser] Mutated u.score to 150 on Heap object @0x5F3A.')

    steps.push({
      stepNumber: 4,
      stage: 'MUTATION',
      title: '4. Heap Object Field Mutation via Reference Copy',
      command: 'u.setScore(u.getScore() + bonus);',
      artifact: 'Heap Mutation: User@0x5F3A (score=150)',
      description: 'Modifying object fields inside a method affects the underlying Heap object at @0x5F3A because both stack references point to the same Heap address.',
      state: this.cloneState()
    })

    // Step 5: Method Return & Stack Frame Pop
    this.stackFrames.shift() // Pop updateUser frame
    this.consoleOutput.push('[main] updateUser() completed. Stack Frame popped. Returned to main(). score remains 150.')

    steps.push({
      stepNumber: 5,
      stage: 'FRAME_POP',
      title: '5. Method Return & Stack Frame Deallocation',
      command: 'return; // Stack Frame Popped',
      artifact: 'Stack Popped: updateUser()',
      description: 'When updateUser() finishes, its Stack Frame is instantly popped and deallocated. main() frame resumes execution with updated heap object.',
      state: this.cloneState()
    })

    // Step 6: Nullifying Reference & Garbage Collection Eligibility
    this.stackFrames[0].variables[2].value = 'null'
    this.heapObjects[0].status = 'UNREACHABLE (GC CANDIDATE)'
    this.consoleOutput.push('[main] user = null. Heap object @0x5F3A has 0 incoming stack references -> Unreachable GC Candidate!')

    steps.push({
      stepNumber: 6,
      stage: 'UNREACHABLE',
      title: '6. Reference Nullification & Unreachable GC Candidate',
      command: 'user = null;',
      artifact: 'Garbage Collection Candidate: @0x5F3A',
      description: 'Setting user = null clears the stack reference pointer. Heap object @0x5F3A now has zero incoming references and becomes eligible for Garbage Collection!',
      state: this.cloneState()
    })

    return steps
  }
}
