/**
 * Java Generics, Wildcards (PECS) & Type Erasure Simulation Engine
 * Simulates Type Invariance, Covariant (? extends T), Contravariant (? super T), and Bytecode Type Erasure with Bridge Methods.
 */

export class JavaGenericsEngine {
  constructor() {
    this.typeHierarchy = ['Object', 'Animal', 'Dog']
    this.producerList = { wildcard: '? extends Animal', items: ['Dog@0x1', 'Cat@0x2'], canRead: true, canWrite: false, readType: 'Animal' }
    this.consumerList = { wildcard: '? super Dog', items: ['Dog@0x1'], canRead: false, canWrite: true, writeType: 'Dog' }
    this.typeErasureArtifact = null
    this.auditLog = ''
  }

  cloneState() {
    return {
      typeHierarchy: [...this.typeHierarchy],
      producerList: { ...this.producerList, items: [...this.producerList.items] },
      consumerList: { ...this.consumerList, items: [...this.consumerList.items] },
      typeErasureArtifact: this.typeErasureArtifact ? { ...this.typeErasureArtifact } : null,
      auditLog: this.auditLog
    }
  }

  getExecutionSteps() {
    const steps = []

    // Step 1: Invariance of Generics
    steps.push({
      stepNumber: 1,
      stage: 'GENERICS_INVARIANCE',
      title: '1. Invariance of Java Generics (No Array-style Covariance)',
      command: 'List<Animal> list = new ArrayList<Dog>(); // COMPILATION ERROR: Incompatible Types!',
      artifact: 'Invariance Rule: List<Dog> is NOT a subtype of List<Animal>',
      description: 'While arrays are covariant (Dog[] is an Animal[]), Java generic collections are invariant. If List<Dog> were assignable to List<Animal>, a caller could add a Cat into a Dog list, causing heap pollution runtime crashes.',
      state: { ...this.cloneState(), auditLog: 'Compiler blocked assignment to prevent heap pollution.' }
    })

    // Step 2: Upper Bounded Wildcards (? extends T) - Producer Extends
    steps.push({
      stepNumber: 2,
      stage: 'UPPER_BOUND_EXTENDS',
      title: '2. Covariance via Upper Bounded Wildcard (? extends Animal)',
      command: 'List<? extends Animal> producer = new ArrayList<Dog>(); Animal a = producer.get(0); // OK to READ',
      artifact: 'Producer Extends: Safe to READ as Animal; BLOCKED from writing new elements',
      description: 'Use <? extends T> when reading data from a collection (Producer). The compiler guarantees that every element in the list is at least an Animal, but disallows adding elements (except null) because the exact concrete subtype is unknown.',
      state: { ...this.cloneState(), auditLog: 'producer.get(0) returns Animal reference safely.' }
    })

    // Step 3: Lower Bounded Wildcards (? super T) - Consumer Super
    steps.push({
      stepNumber: 3,
      stage: 'LOWER_BOUND_SUPER',
      title: '3. Contravariance via Lower Bounded Wildcard (? super Dog)',
      command: 'List<? super Dog> consumer = new ArrayList<Animal>(); consumer.add(new Dog()); // OK to WRITE',
      artifact: 'Consumer Super: Safe to WRITE Dog; Reading returns only Object',
      description: 'Use <? super T> when writing data into a collection (Consumer). The compiler guarantees that the list holds some supertype of Dog (e.g. Animal or Object), so writing a Dog instance into it is always type-safe.',
      state: { ...this.cloneState(), auditLog: 'consumer.add(new Dog()) safely committed.' }
    })

    // Step 4: The Golden PECS Rule in Collections.copy()
    steps.push({
      stepNumber: 4,
      stage: 'PECS_RULE_IN_ACTION',
      title: '4. PECS Rule: Producer Extends, Consumer Super',
      command: 'public static <T> void copy(List<? super T> dest, List<? extends T> src) { ... }',
      artifact: 'PECS: src (Producer) -> dest (Consumer)',
      description: 'The standard library Collections.copy(dest, src) demonstrates PECS: src produces items (reads as ? extends T) and dest consumes items (writes into ? super T).',
      state: { ...this.cloneState(), auditLog: 'Applied PECS contract to maximize method signature flexibility.' }
    })

    // Step 5: Bytecode Type Erasure & Synthetic Bridge Methods
    this.typeErasureArtifact = {
      sourceSignature: 'public class Node<T extends Comparable<T>> { T value; }',
      bytecodeSignature: 'public class Node { Comparable value; }',
      syntheticOpcode: 'checkcast class java/lang/Comparable',
      bridgeMethod: 'public synthetic bridge method compareTo(Object) -> invokes compareTo(Node)'
    }
    steps.push({
      stepNumber: 5,
      stage: 'TYPE_ERASURE_BRIDGE_METHODS',
      title: '5. Bytecode Type Erasure & Synthetic Bridge Methods',
      command: 'javap -c Node.class // Observes type erasure and checkcast opcodes',
      artifact: 'Type Erasure: Generic type parameters erased to Object / Bound in bytecode',
      description: 'For backwards compatibility with pre-Java 5 JVMs, javac erases all generic type parameters, replacing them with Object (or their upper bound). The compiler automatically injects checkcast bytecodes and synthetic bridge methods to preserve polymorphic dispatch.',
      state: { ...this.cloneState(), auditLog: 'Type erasure replaced <T> with Comparable and inserted synthetic bridge methods.' }
    })

    return steps
  }
}
