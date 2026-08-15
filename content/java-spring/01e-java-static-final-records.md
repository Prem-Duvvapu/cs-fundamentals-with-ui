# Static, Final, Immutable Classes & Java Records

## 🟢 Beginner Level

### The `static` Keyword: Class-Level State
The `static` modifier binds a variable or method to the **Class blueprint** itself rather than to individual object instances.

```
┌─────────────────────────────────────────────────────────────┐
│                 METASPACE CLASS METADATA                    │
│ Class: Configuration                                        │
│  - static String ENV = "PROD" (1 shared memory location)    │
│  - static int instanceCounter = 42                          │
└─────────────────────────────────────────────────────────────┘
          ▲                              ▲
          │                              │
[ Instance 1 @0x101 ]          [ Instance 2 @0x102 ]
(Reads Configuration.ENV)      (Reads Configuration.ENV)
```

- **Static Variable**: Allocated once when the class is loaded; shared across all instances.
- **Static Method**: Called directly via `ClassName.methodName()`. Cannot reference `this` or non-static instance fields.
- **Static Block (`<clinit>`)**: Executes once when the class is loaded by the ClassLoader to initialize static state.

---

## 🟡 Intermediate Level

### The `final` Modifier: Enforcing Invariance

1. **Final Variable**: Single assignment only. Must be initialized either at declaration, in an instance initializer, or in the constructor. Once assigned, its reference or primitive value cannot change.
2. **Final Method**: Prohibits subclasses from overriding the method. Ensures core invariant logic cannot be altered.
3. **Final Class**: Prohibits inheritance entirely (`public final class String`). All methods in a final class are implicitly final.

### The Immutable Class Pattern & Defensive Copying

An **Immutable Object** is an object whose internal state cannot be modified after construction.

#### The 5 Rules for Creating Immutable Classes in Java:
1. Declare the class as `final` so it cannot be subclassed.
2. Make all fields `private` and `final`.
3. Do not provide any setter / mutator methods.
4. If fields reference mutable objects (e.g. `java.util.Date`, `List`, `Map`), perform **Defensive Copying** in the constructor.
5. Perform **Defensive Copying** in getter methods to prevent callers from receiving direct pointers to internal mutable objects.

```java
public final class ImmutablePerson {
    private final String name;
    private final List<String> hobbies;

    public ImmutablePerson(String name, List<String> hobbies) {
        this.name = name;
        // Defensive copy on instantiation
        this.hobbies = new ArrayList<>(hobbies);
    }

    public List<String> getHobbies() {
        // Defensive copy on getter
        return Collections.unmodifiableList(new ArrayList<>(this.hobbies));
    }
}
```

---

## 🔴 Expert Level

### Java 14+ Records: Transparent Immutable Data Carriers

A **Record** is a specialized, compact class in Java designed purely to carry immutable data with value-based equality semantics.

```java
public record UserDto(long id, String email, Instant createdAt) {
    // Compact constructor for validation and normalization
    public UserDto {
        if (id <= 0) throw new IllegalArgumentException("ID must be positive");
        email = email.toLowerCase().trim();
    }
}
```

#### What the Compiler Automatically Generates for Records:
1. `private final` fields for all declared components.
2. A **Canonical Constructor** matching the component signature.
3. Public accessor methods named after components (`id()`, `email()`, `createdAt()` — note: **no** `get` prefix!).
4. Value-based `equals()` and `hashCode()` comparing component values rather than memory pointers.
5. A descriptive `toString()` (e.g. `UserDto[id=101, email=alice@..., createdAt=...]`).
6. Enforces that the record implicitly extends `java.lang.Record` and is implicitly `final`.

### Key Interview Questions

#### Q1: Why can't a Java Record extend another class?
**Answer**: Java does not support multiple class inheritance. Because all Record types implicitly extend `java.lang.Record`, they cannot extend any other class. However, Records are permitted to implement any number of interfaces (e.g. `implements Serializable, Comparable<UserDto>`).

#### Q2: What is the difference between a shallow copy and a deep copy in Java?
**Answer**:
- **Shallow Copy**: Copies the primitive fields and the *memory reference addresses* of nested objects. Both original and cloned objects point to the identical child objects on the Heap.
- **Deep Copy**: Recursively creates new independent instances of all nested mutable child objects, ensuring mutations to the clone do not affect the original object.
