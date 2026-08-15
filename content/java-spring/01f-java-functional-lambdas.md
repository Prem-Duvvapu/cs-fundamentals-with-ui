# Interfaces, Functional Interfaces & Lambda Expressions

## 🟢 Beginner Level

### Interface Evolution in Java
Prior to Java 8, interfaces could only declare public abstract methods and constants (`public static final`). Java 8 introduced **default** and **static** methods to enable API evolution (adding new methods to standard interfaces like `java.util.Collection.stream()` without breaking millions of third-party implementations).

```
┌─────────────────────────────────────────────────────────────┐
│                 INTERFACE CONTRACT CAPABILITIES             │
├──────────────────────────┬──────────────────────────────────┤
│ 1. Abstract Methods      │ public int compute(int a, int b) │
│ 2. Default Methods       │ default void log() { ... }       │
│ 3. Static Methods        │ static Calculator factory() {..} │
│ 4. Private Methods (J9+) │ private void helper() { ... }    │
└──────────────────────────┴──────────────────────────────────┘
```

### The `@FunctionalInterface` SAM Contract
A **Functional Interface** is an interface that declares **exactly one abstract method** (known as the Single Abstract Method - SAM). It can have any number of default or static methods.

Standard built-in functional interfaces in `java.util.function`:
1. `Predicate<T>`: `boolean test(T t)` — Evaluates a boolean condition.
2. `Function<T, R>`: `R apply(T t)` — Transforms input `T` into output `R`.
3. `Consumer<T>`: `void accept(T t)` — Consumes input without returning a result.
4. `Supplier<T>`: `T get()` — Produces an instance without requiring input.
5. `UnaryOperator<T>` & `BinaryOperator<T>`: Specialized operations where operand and return types are identical.

---

## 🟡 Intermediate Level

### Lambda Expressions & Method References

```
// Lambda Expression Syntax: (parameters) -> expression / { block }
BinaryOperator<Integer> add = (a, b) -> a + b;

// Method Reference Syntax: ClassName / instance :: methodName
Function<String, Integer> parser = Integer::parseInt;
Consumer<String> printer = System.out::println;
Supplier<List<String>> listFactory = ArrayList::new;
```

#### Lexical Scoping & Variable Capture:
- Lambdas do **not** introduce a new scope for `this`. Inside a lambda, `this` refers to the enclosing class instance (unlike anonymous inner classes where `this` refers to the anonymous class itself).
- Captured local variables must be `final` or **effectively final** (never reassigned after initialization).

---

## 🔴 Expert Level

### Bytecode Internals: `invokedynamic` & `LambdaMetafactory`

Anonymous inner classes historically caused class proliferation on disk (`Main$1.class`) and incurred class loading overhead.

Java 8 lambdas use the **`invokedynamic` (indy)** bytecode instruction:

```
1. javac Compilation:
   - Desugars lambda body into a synthetic private method:
     private static int lambda$main$0(int a, int b) { return a + b; }
   - Emits an invokedynamic instruction referencing BootstrapMethod #0.

2. Runtime First Execution:
   - JVM triggers Bootstrap Method: LambdaMetafactory.metafactory(...).
   - Generates an in-memory CallSite linked to a MethodHandle.
   - Employs java.lang.invoke infrastructure without creating disk files.

3. Subsequent Executions:
   - The CallSite is invoked directly with zero bootstrap overhead at native CPU speed.
```

### Key Interview Questions

#### Q1: Why can't a lambda expression mutate a local primitive variable defined in the enclosing method?
**Answer**: Local variables live on the method's Stack Frame, which gets destroyed when the method returns. If the lambda is executed asynchronously on another thread or stored for later execution, the original stack frame no longer exists. Java captures a *copy* of the variable's value on the Heap. Allowing mutation of the local variable would create a divergence between the stack variable and the heap copy. Requiring `final` or effectively final ensures strict value consistency.

#### Q2: What is the performance difference between a Lambda and an Anonymous Inner Class?
**Answer**:
1. **Memory & Footprint**: Anonymous classes generate extra `.class` files on disk, consume Metaspace for separate Class metadata, and allocate a new object instance on every execution. Lambdas generate no `.class` file on disk and non-capturing lambdas can be cached by the JVM as a single singleton instance.
2. **Linkage**: Lambdas link via `invokedynamic` and JIT inline caching, allowing the HotSpot C2 compiler to aggressively inline the lambda body directly into the calling method.
