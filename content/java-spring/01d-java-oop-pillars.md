# OOP Pillars & Dynamic Method Dispatch (vtable)

## 🟢 Beginner Level

### The Four Core Pillars of Object-Oriented Programming

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FOUR PILLARS OF OOP                            │
├───────────────────┬───────────────────┬────────────────┬────────────────┤
│ 1. ENCAPSULATION  │ 2. ABSTRACTION    │ 3. INHERITANCE │ 4. POLYMORPHISM│
│ Data hiding via   │ Hiding internal   │ Code reuse &   │ One interface, │
│ private fields &  │ complexity behind │ class taxonomy │ multiple runtime│
│ public methods    │ interfaces        │ (is-a relation)│ implementations│
└───────────────────┴───────────────────┴────────────────┴────────────────┘
```

1. **Encapsulation**: Bundling data (fields) and methods operating on that data within a single class while restricting direct access from outside via `private` access modifiers and validated getters/setters.
2. **Abstraction**: Exposing essential contract features while hiding background operational complexity using `abstract class` and `interface`.
3. **Inheritance**: Deriving new classes (subclasses) from existing parent classes (`extends`), reusing common attributes and behaviors.
4. **Polymorphism**: The ability of an object reference of a supertype to exhibit different runtime behaviors depending on the concrete subclass instance bound to it.

---

## 🟡 Intermediate Level

### Compile-Time Polymorphism (Overloading) vs. Runtime Polymorphism (Overriding)

| Feature | Method Overloading (Compile-Time) | Method Overriding (Runtime) |
| :--- | :--- | :--- |
| **Binding Mechanism** | **Static Binding** by `javac` at compile time | **Dynamic Dispatch** by JVM at runtime |
| **Method Signature** | Same method name, **different parameter types/counts** | **Identical** method name, parameter types, and return type |
| **Class Scope** | Defined within the same class | Defined in subclass overriding superclass method |
| **Bytecode Opcode** | `invokestatic` / `invokespecial` | `invokevirtual` / `invokeinterface` |

---

## 🔴 Expert Level

### JVM Virtual Method Table (vtable) & Dynamic Method Dispatch

When the JVM encounters an `invokevirtual` bytecode instruction:

```
[ Animal pet = new Dog(); ]
pet.makeSound();

1. Inspect pet reference pointer ──► Reads Object Header Mark Word & Klass Word
2. Klass Word points to Dog Class Metadata in Metaspace
3. Inspect Dog's vtable (Virtual Method Table):
   ┌────────┬─────────────────────────────┬───────────────────────────┐
   │ Slot 0 │ Animal.makeSound() Override ──► Dog.makeSound() [Target] │
   ├────────┼─────────────────────────────┼───────────────────────────┤
   │ Slot 1 │ Animal.eat()               ──► Animal.eat() (Inherited)  │
   ├────────┼─────────────────────────────┼───────────────────────────┤
   │ Slot 2 │ Object.toString()           ──► Object.toString()       │
   └────────┴─────────────────────────────┴───────────────────────────┘
4. Indirect jump to Dog.makeSound() native memory pointer
```

- **Monomorphic vs. Megamorphic Call Sites**:
  - If a call site always invokes the exact same concrete class method (**Monomorphic**), the HotSpot JIT performs **Devirtualization / Inline Caching**, replacing indirect vtable pointer lookups with a direct jump or inlined instructions.
  - If > 2 concrete classes pass through the call site (**Megamorphic**), the JIT falls back to a full vtable pointer dereference.

### Key Interview Questions

#### Q1: Can private, static, or final methods be overridden in Java?
**Answer**: No.
- `private`: Not visible to subclasses; thus cannot be overridden.
- `static`: Belongs to the class, not instances. Defining a static method with the same signature in a subclass results in **Method Hiding**, resolved statically by compile-time reference type.
- `final`: Explicitly prohibits overriding; compiler throws an error.

#### Q2: How does the `default` method in Java 8 interfaces resolve the Diamond Problem?
**Answer**: Java resolves interface default method conflicts with two rules:
1. **Classes beat Interfaces**: Superclass method implementations always take precedence over interface default methods.
2. **Most Specific Interface**: If interface B extends interface A, B's default method wins.
3. If two unrelated interfaces provide conflicting default methods, the compiling class **must** explicitly override the method and specify `InterfaceName.super.methodName()`.
