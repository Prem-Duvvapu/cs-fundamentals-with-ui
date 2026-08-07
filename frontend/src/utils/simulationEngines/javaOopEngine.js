/**
 * Java OOP & Dynamic Method Dispatch (vtable) Simulation Engine
 * Simulates Encapsulation, Abstraction, Inheritance, Polymorphism, and JVM vtable virtual method resolution.
 */

export class JavaOopEngine {
  constructor() {
    this.vtableDog = [
      { slot: 0, methodName: 'makeSound()', resolvedTarget: 'Dog.makeSound() ["Woof!"]' },
      { slot: 1, methodName: 'eat()', resolvedTarget: 'Animal.eat() ["Eating..."]' },
      { slot: 2, methodName: 'fetch()', resolvedTarget: 'Dog.fetch() ["Fetching ball!"]' }
    ]
    this.vtableCat = [
      { slot: 0, methodName: 'makeSound()', resolvedTarget: 'Cat.makeSound() ["Meow!"]' },
      { slot: 1, methodName: 'eat()', resolvedTarget: 'Animal.eat() ["Eating..."]' },
      { slot: 2, methodName: 'purr()', resolvedTarget: 'Cat.purr() ["Purring..."]' }
    ]
    this.activePet = null
    this.dispatchResult = ''
  }

  cloneState() {
    return {
      vtableDog: [...this.vtableDog.map(v => ({ ...v }))],
      vtableCat: [...this.vtableCat.map(v => ({ ...v }))],
      activePet: this.activePet ? { ...this.activePet } : null,
      dispatchResult: this.dispatchResult
    }
  }

  getExecutionSteps() {
    const steps = []

    // Step 1: Class Definition & Inheritance
    steps.push({
      stepNumber: 1,
      stage: 'INHERITANCE',
      title: '1. Abstraction & Inheritance Hierarchy',
      command: 'abstract class Animal { ... } class Dog extends Animal { ... }',
      artifact: 'Class Hierarchy: Dog extends Animal',
      description: 'Abstract class Animal defines common behavior. Subclasses Dog and Cat inherit fields and override abstract methods.',
      state: { ...this.cloneState(), dispatchResult: 'Class structures loaded into Metaspace.' }
    })

    // Step 2: Encapsulation & Access Modifiers
    steps.push({
      stepNumber: 2,
      stage: 'ENCAPSULATION',
      title: '2. Encapsulation & Access Modifiers',
      command: 'private String name; protected int age; public void speak();',
      artifact: 'Access Boundary: private / protected / public',
      description: 'Encapsulation hides internal state behind private/protected fields and exposes controlled public getter/setter methods.',
      state: { ...this.cloneState(), dispatchResult: 'Encapsulation rules verified.' }
    })

    // Step 3: Overloading (Compile-Time Polymorphism)
    steps.push({
      stepNumber: 3,
      stage: 'OVERLOADING',
      title: '3. Method Overloading (Compile-Time Static Binding)',
      command: 'dog.bark(); dog.bark(3); // Same method name, different signatures',
      artifact: 'Static Binding: resolved by javac at compile-time',
      description: 'Method Overloading allows multiple methods in the same class with identical names but different parameter lists. Resolved statically by compiler.',
      state: { ...this.cloneState(), dispatchResult: 'javac resolved static method signature bark(int).' }
    })

    // Step 4: Polymorphic Instantiation & Object Reference
    this.activePet = { referenceName: 'pet', declaredType: 'Animal', actualType: 'Dog', name: '"Buddy"', address: '@0x9A4B' }
    steps.push({
      stepNumber: 4,
      stage: 'POLYMORPHISM_INSTANTIATION',
      title: '4. Runtime Polymorphism Instantiation',
      command: 'Animal pet = new Dog("Buddy");',
      artifact: 'Declared: Animal ➔ Actual: Dog@0x9A4B',
      description: 'Polymorphism allows a superclass reference (Animal) to hold a reference pointer to any subclass object (Dog).',
      state: { ...this.cloneState(), dispatchResult: 'Reference "pet" created pointing to Dog@0x9A4B.' }
    })

    // Step 5: JVM vtable Dynamic Method Dispatch
    this.dispatchResult = 'JVM vtable[0] lookup -> Invoked Dog.makeSound() -> Output: "Woof!"'
    steps.push({
      stepNumber: 5,
      stage: 'VTABLE_DISPATCH',
      title: '5. JVM vtable (Virtual Method Table) Dynamic Dispatch',
      command: 'pet.makeSound(); // invokevirtual opcode',
      artifact: 'JVM vtable Slot #0 -> Dog.makeSound()',
      description: 'When pet.makeSound() is called, the JVM uses the invokevirtual opcode to inspect pet\'s actual runtime type (Dog), looks up slot 0 in Dog\'s vtable, and dispatches Dog.makeSound().',
      state: { ...this.cloneState(), dispatchResult: this.dispatchResult }
    })

    // Step 6: Polymorphic Swapping to Cat
    this.activePet = { referenceName: 'pet', declaredType: 'Animal', actualType: 'Cat', name: '"Whiskers"', address: '@0x7C1F' }
    this.dispatchResult = 'JVM vtable[0] lookup -> Invoked Cat.makeSound() -> Output: "Meow!"'
    steps.push({
      stepNumber: 6,
      stage: 'POLYMORPHIC_SWAP',
      title: '6. Runtime Reference Swapping & vtable Resolution',
      command: 'pet = new Cat("Whiskers"); pet.makeSound();',
      artifact: 'JVM vtable Slot #0 -> Cat.makeSound()',
      description: 'Reassigning pet to Cat@0x7C1F changes runtime type. The same method call pet.makeSound() now dynamically resolves to Cat.makeSound() via Cat\'s vtable!',
      state: { ...this.cloneState(), dispatchResult: this.dispatchResult }
    })

    return steps
  }
}
