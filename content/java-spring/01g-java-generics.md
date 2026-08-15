# Generics, Wildcards (PECS) & Type Erasure

## 🟢 Beginner Level

### Why Java Generics?
Introduced in Java 5, Generics enforce **compile-time type safety** and eliminate the need for manual casting when working with collections.

```java
// BEFORE GENERICS (Pre-Java 5 - Prone to ClassCastException):
List list = new ArrayList();
list.add("Hello");
list.add(100); // Compiles without error!
String s = (String) list.get(1); // RUNTIME ClassCastException!

// WITH GENERICS (Compile-time type check):
List<String> list = new ArrayList<>();
list.add("Hello");
// list.add(100); // COMPILE ERROR: incompatible types
String s = list.get(0); // No explicit cast needed!
```

### Invariance: Why `List<Dog>` is NOT a `List<Animal>`

While Java arrays are **covariant** (`Dog[]` is assignable to `Animal[]`), Java generic collections are strictly **invariant**.

```java
Dog[] dogs = new Dog[2];
Animal[] animals = dogs; // Allowed by compiler!
animals[0] = new Cat();  // ArrayStoreException at RUNTIME!

List<Dog> dogList = new ArrayList<>();
// List<Animal> animalList = dogList; // COMPILE ERROR! Prevented at compile-time.
```

If `List<Dog>` were assignable to `List<Animal>`, a program could insert a `Cat` into the list via the `Animal` reference, violating the type safety of other references expecting only `Dog`s (**Heap Pollution**).

---

## 🟡 Intermediate Level

### Bounded Wildcards & The PECS Golden Rule

To allow safe polymorphism in generic method arguments, Java provides **Wildcards (`?`)**.

```
┌─────────────────────────────────────────────────────────────┐
│                       THE PECS RULE                         │
├──────────────────────────────┬──────────────────────────────┤
│ PRODUCER EXTENDS             │ CONSUMER SUPER               │
│ Use <? extends T> when you   │ Use <? super T> when you     │
│ only READ from collection    │ only WRITE into collection   │
│ (Collection produces data)   │ (Collection consumes data)   │
└──────────────────────────────┴──────────────────────────────┘
```

#### 1. Upper-Bounded Wildcards (`? extends T` - Covariance / Producer)
```java
// You can read Animal instances safely from this list
public double sumWeights(List<? extends Animal> animals) {
    double total = 0;
    for (Animal a : animals) {
        total += a.getWeight(); // Safe READ
    }
    // animals.add(new Dog()); // COMPILE ERROR: cannot write!
    return total;
}
```

#### 2. Lower-Bounded Wildcards (`? super T` - Contravariance / Consumer)
```java
// You can write Dog instances safely into this list
public void addTrainedDogs(List<? super Dog> dogConsumer) {
    dogConsumer.add(new Dog("Rex")); // Safe WRITE
    // Dog d = dogConsumer.get(0);   // COMPILE ERROR: returns Object, not Dog!
}
```

---

## 🔴 Expert Level

### Bytecode Type Erasure & Synthetic Bridge Methods

To preserve binary backward compatibility with pre-Java 5 JVM bytecode, the Java compiler executes **Type Erasure**:

```
SOURCE CODE:
public class Box<T extends Number> {
    private T item;
    public T getItem() { return item; }
}

BYTECODE AFTER TYPE ERASURE (javap -c Box):
public class Box {
    private Number item; // Erased to upper bound (Number)
    public Number getItem() { return item; }
}
```

#### Synthetic Bridge Methods:
When a generic class implements or extends a parameterized supertype with method overriding, Type Erasure creates a signature mismatch in bytecode. The compiler automatically synthesizes a **Bridge Method**:

```java
public class StringComparator implements Comparator<String> {
    public int compare(String a, String b) { return a.compareTo(b); }
    
    // COMPILER AUTO-GENERATES SYNTHETIC BRIDGE METHOD IN BYTECODE:
    // public synthetic bridge int compare(Object a, Object b) {
    //     return compare((String) a, (String) b);
    // }
}
```

### Key Interview Questions

#### Q1: Why can't we instantiate a generic type directly (`new T()`) or create a generic array (`new T[10]`)?
**Answer**: Because of Type Erasure, the type parameter `T` does not exist at runtime (it is erased to `Object`). The JVM does not know what concrete class or memory layout to allocate for `new T()`. Arrays in Java are reified (they enforce their component type at runtime); creating `new T[10]` would create an `Object[]` which would fail array store checks when cast to `T[]`. Workaround: Pass `Class<T> clazz` and use `clazz.getDeclaredConstructor().newInstance()`, or `(T[]) Array.newInstance(clazz, size)`.

#### Q2: What is the difference between `<T extends Comparable<T>>` and `<T extends Comparable<? super T>>`?
**Answer**: `<T extends Comparable<? super T>>` is more flexible. It allows a subclass (e.g. `Dog extends Animal`) to be compared using its superclass's comparison logic (`Animal implements Comparable<Animal>`), without forcing `Dog` to re-implement `Comparable<Dog>`.
