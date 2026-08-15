# Java Streams API Lazy Pipeline & Optional

## 🟢 Beginner Level

### What is a Java Stream?
Introduced in Java 8, a **Stream** is a sequence of elements supporting declarative, functional-style transformations.

```
┌──────────────┐     .filter(x > 10)     ┌──────────────┐     .map(x * 2)     ┌──────────────┐     .collect()     ┌──────────────┐
│  Data Source │ ──────────────────────► │ Lazy Stage 1 │ ──────────────────► │ Lazy Stage 2 │ ─────────────────► │ Final Result │
│ (Collection) │                         │ (Filter)     │                     │ (Transform)  │   (Terminal Pull)  │ (List / Set) │
└──────────────┘                         └──────────────┘                     └──────────────┘                    └──────────────┘
```

#### Core Stream Characteristics:
1. **Not a Data Structure**: A Stream does not store data; it conveys elements from a source (Collection, Array, I/O channel) through a computational pipeline.
2. **Functional & Non-Mutating**: Stream operations do not mutate the underlying backing source collection.
3. **Single-Use**: A Stream can only be traversed once. Calling a terminal operation consumes the stream.

---

## 🟡 Intermediate Level

### Intermediate (Lazy) vs. Terminal (Eager) Operations

```
┌─────────────────────────────────────────────────────────────┐
│                 STREAM OPERATION CATEGORIES                 │
├──────────────────────────────┬──────────────────────────────┤
│ INTERMEDIATE (Lazy)          │ TERMINAL (Eager Pull)        │
│ Returns a new Stream:        │ Produces non-stream result:  │
│  - filter(Predicate)         │  - collect(Collector)        │
│  - map(Function)             │  - reduce(BinaryOperator)    │
│  - flatMap(Function)         │  - forEach(Consumer)         │
│  - sorted()                  │  - count(), min(), max()     │
│  - distinct()                │  - findFirst(), anyMatch()   │
└──────────────────────────────┴──────────────────────────────┘
```

#### Vertical Loop Fusion
Instead of processing all elements horizontally through `filter()` into a temporary array and then mapping that array, Java Streams fuse operations **vertically**. Each individual element is evaluated through the entire pipeline before the next element is pulled from the source:

```
Element 12 ──► filter (>10? YES) ──► map (*2 = 24) ──► collect(24)
Element 5  ──► filter (>10? NO)  ──► [Dropped immediately]
Element 20 ──► filter (>10? YES) ──► map (*2 = 40) ──► collect(40)
```

---

## 🔴 Expert Level

### `Optional<T>` Null-Safety Monadic Patterns

`Optional<T>` is a container object designed to explicitly model the potential absence of a value without returning `null`.

```java
// Anti-pattern: Nested Null Checks
String city = null;
if (user != null) {
    Address address = user.getAddress();
    if (address != null) {
        city = address.getCity();
    }
}

// Idiomatic Java 8+ Optional Monadic Flow:
String city = Optional.ofNullable(user)
    .map(User::getAddress)
    .map(Address::getCity)
    .filter(c -> !c.isBlank())
    .orElse("Unknown City");
```

#### Monadic Methods on `Optional`:
- `map(Function<T, R>)`: Transforms value if present; returns `Optional<R>`.
- `flatMap(Function<T, Optional<R>>)`: Flattens nested optionals (avoids `Optional<Optional<R>>`).
- `filter(Predicate<T>)`: Keeps value if predicate matches; returns `Optional.empty()` otherwise.
- `orElseGet(Supplier<T>)`: Lazily computes default fallback only when empty.
- `orElseThrow(Supplier<X>)`: Throws custom domain exception when empty.

### Key Interview Questions

#### Q1: Why should `Optional` NOT be used for class field members or method parameter arguments?
**Answer**:
1. `Optional` is not `Serializable`, breaking serialization in JPA entities, RMI, and distributed caches.
2. Wrapping every field in an `Optional` adds a 16-byte object header wrapper overhead on the Heap for every instance.
3. `Optional` is intended strictly as a **library-level method return type** to explicitly communicate "this query or computation may return empty".

#### Q2: How does `parallelStream()` work under the hood, and when should it be avoided?
**Answer**: `parallelStream()` partitions the data source via a `Spliterator` and executes pipeline stages concurrently across the shared JVM **`ForkJoinPool.commonPool()`**. It should be avoided for:
1. Small datasets (thread coordination and merge overhead outweighs compute gains).
2. Blocking I/O tasks (database queries, network calls), as this starves the common ForkJoinPool used across the entire JVM process.
