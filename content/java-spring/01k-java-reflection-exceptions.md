# Java Reflection API, Annotations & Exception Unwinding

## 🟢 Beginner Level

### Java Exception Hierarchy: Checked vs. Unchecked

All exceptions in Java descend from the `java.lang.Throwable` class:

```
                          ┌────────────────────────┐
                          │  java.lang.Throwable   │
                          └───────────▲────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              │                                               │
    ┌─────────┴─────────┐                           ┌─────────┴─────────┐
    │     Exception     │                           │       Error       │
    │ (Recoverable Apps)│                           │ (Fatal JVM/System)│
    └─────────▲─────────┘                           └───────────────────┘
              │                                      - OutOfMemoryError
  ┌───────────┴───────────┐                          - StackOverflowError
  │                       │
┌─┴─────────────────┐   ┌─┴─────────────────┐
│ Checked Exception │   │Unchecked Exception│
│(Compile-time check│   │ (RuntimeException)│
└───────────────────┘   └───────────────────┘
 - IOException           - NullPointerException
 - SQLException          - IllegalArgumentException
 - ClassNotFoundException- ArrayIndexOutOfBounds
```

1. **Checked Exceptions (`Exception` subclasses except `RuntimeException`)**: The compiler forces the method to either handle the exception via `try-catch` or declare it via `throws`.
2. **Unchecked Exceptions (`RuntimeException` subclasses)**: Indicate programmer logic errors; compile-time declaration is optional.

---

## 🟡 Intermediate Level

### Try-with-Resources & `AutoCloseable`

Prior to Java 7, closing I/O resources in `finally` blocks was verbose and prone to exception suppression bugs.

```java
// Java 7+ Try-With-Resources (Guarantees deterministic resource cleanup)
try (BufferedReader br = new BufferedReader(new FileReader("data.txt"));
     Connection conn = dataSource.getConnection()) {
    return br.readLine();
} // Automatically invokes close() on both resources in reverse declaration order!
```

- Any class implementing `java.lang.AutoCloseable` or `java.io.Closeable` can be managed by `try-with-resources`.
- **Suppressed Exceptions**: If an exception occurs in both the `try` block and the auto-generated `close()` invocation, the `try` exception is thrown and the `close()` exception is attached as a **Suppressed Exception** (`e.getSuppressed()`).

---

## 🔴 Expert Level

### Java Reflection API, Dynamic Proxies & Annotation Processing

**Reflection** allows inspection and manipulation of classes, constructors, methods, and fields at runtime without compile-time knowledge.

```java
// Inspecting and invoking private methods via Reflection
Class<?> clazz = Class.forName("com.csfundamentals.service.PaymentService");
Object instance = clazz.getDeclaredConstructor().newInstance();

Method method = clazz.getDeclaredMethod("processInternal", BigDecimal.class);
method.setAccessible(true); // Bypasses private encapsulation checks (JVM SecurityManager / Module System)
method.invoke(instance, new BigDecimal("99.99"));
```

#### Reflection in Modern Frameworks (Spring / Hibernate):
1. **Dependency Injection**: Spring uses Reflection to scan `@Autowired`, `@Component`, and `@Value` annotations and inject fields.
2. **JDK Dynamic Proxies (`java.lang.reflect.Proxy`)**: Creates runtime interface implementations for `@Transactional`, `@PreAuthorize`, and `@Async` interceptors without generating disk `.class` files.
3. **CGLIB / ByteBuddy**: Subclasses concrete classes dynamically at runtime using bytecode generation when target beans do not implement interfaces.

### Key Interview Questions

#### Q1: What is the performance cost of Reflection in Java?
**Answer**:
1. **Dynamic Resolution**: Method/field lookup involves string comparisons and type signature verification on every invocation.
2. **Security & Access Checks**: The JVM must check `setAccessible` caller permissions.
3. **No JIT Inlining**: JIT compilers cannot easily inline reflective invocations (`Method.invoke()`), preventing optimization passes. *Modern HotSpot JIT mitigates this after ~15 invocations via Inflation to dynamic bytecode accessors.*

#### Q2: What is the difference between `Class.forName("com.mysql.cj.jdbc.Driver")` and `MyClass.class`?
**Answer**:
- `Class.forName(name)`: Loads and **initializes** the class dynamically at runtime, executing its static initializer blocks (`<clinit>`). (Historically used to register JDBC drivers).
- `MyClass.class` (Class Literal): Resolved at compile-time without necessarily triggering static class initialization until first static field/method access.
