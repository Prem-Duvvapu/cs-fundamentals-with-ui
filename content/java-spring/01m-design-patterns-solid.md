# SOLID Principles & Java Design Patterns

## 🟢 Beginner Level

### What is a Software Design Pattern?
A **Design Pattern** is a proven, reusable structural template that addresses common recurring software architecture challenges. Design patterns are *not* concrete libraries or algorithms; rather, they provide high-level blueprints and best practices for object instantiation, structural coupling, and behavioral coordination.

### Why Patterns & SOLID Matter
- **Code Maintainability**: Prevents rigid, fragile codebases where a small change in one module breaks unrelated modules.
- **Architectural Flexibility**: Allows extending application features without rewriting core tested logic.
- **Shared Technical Vocabulary**: Enables developers to communicate complex object relationships using concise terms like *"Factory"*, *"Strategy"*, or *"Observer"*.

### Single Inheritance & Interface Method Resolution
Java enforces single class inheritance (`extends`) to prevent the **Diamond Problem** of multiple inheritance. Multiple interfaces (`implements`) are permitted because default method conflicts are explicitly resolved by compiler rules.

---

## 🟡 Intermediate Level

### The 5 SOLID Design Principles

```
+---------------------------------------------------------------------------------------------------+
|                                      SOLID PRINCIPLES CHEATSHEET                                  |
+---+-----------------------------------+-----------------------------------------------------------+
| S | Single Responsibility (SRP)       | A class should have one, and only one, reason to change.  |
| O | Open/Closed (OCP)                 | Open for extension, closed for modification.             |
| L | Liskov Substitution (LSP)         | Subtypes must be substitutable for their base types.      |
| I | Interface Segregation (ISP)       | Prefer small, focused interfaces over monolithic ones.    |
| D | Dependency Inversion (DIP)        | Depend on abstractions (interfaces), not concrete classes.|
+---+-----------------------------------+-----------------------------------------------------------+
```

#### 1. Single Responsibility Principle (SRP)
- **Violation**: A `Invoice` class that calculates total prices, formats PDF reports, and sends email notifications.
- **Refactored**: Separate into `InvoiceCalculator`, `InvoicePdfFormatter`, and `EmailNotificationService`.

#### 2. Open/Closed Principle (OCP)
- **Violation**: Using `if/else` or `switch` statements on payment types inside a `PaymentProcessor`. Adding a new payment type requires modifying the processor.
- **Refactored**: Implement a `PaymentStrategy` interface with `CreditCardPayment` and `PayPalPayment` classes.

#### 3. Liskov Substitution Principle (LSP)
- **Violation**: Class `Square extends Rectangle`. Overriding `setWidth(w)` changes both width and height, breaking `Rectangle`'s contract.
- **Refactored**: Separate `Shape` interface with `getArea()` method.

#### 4. Interface Segregation Principle (ISP)
- **Violation**: A monolithic `MultiFunctionPrinter` interface forcing a basic `SimplePrinter` to implement unused `fax()` and `scan()` methods.
- **Refactored**: Break into `Printer`, `Scanner`, and `Fax` interfaces.

#### 5. Dependency Inversion Principle (DIP)
- **Violation**: `OrderService` directly instantiating `private MySQLDatabase db = new MySQLDatabase()`.
- **Refactored**: `OrderService` depends on a `DatabaseRepository` interface injected via constructor.

---

## 🔴 Expert Level

### Core Gang of Four (GoF) Design Patterns in Java

#### 1. Singleton Pattern (Thread-Safe Bill Pugh / Enum)
Ensures a class has only one instance and provides a global point of access.

```java
// Thread-Safe Bill Pugh Singleton
public class DatabaseConnectionPool {
    private DatabaseConnectionPool() {}

    private static class Holder {
        private static final DatabaseConnectionPool INSTANCE = new DatabaseConnectionPool();
    }

    public static DatabaseConnectionPool getInstance() {
        return Holder.INSTANCE;
    }
}
```

#### 2. Factory Method Pattern
Defines an interface for creating objects, but lets subclasses decide which class to instantiate.

```java
public interface Notification {
    void send(String message);
}

public class NotificationFactory {
    public static Notification createNotification(String channel) {
        if ("EMAIL".equalsIgnoreCase(channel)) return new EmailNotification();
        if ("SMS".equalsIgnoreCase(channel)) return new SmsNotification();
        throw new IllegalArgumentException("Unknown channel: " + channel);
    }
}
```

#### 3. Builder Pattern
Constructs complex objects step-by-step with fluent method chaining and immutability.

```java
public class UserProfile {
    private final String username;
    private final String email;
    private final int age;

    private UserProfile(Builder b) {
        this.username = b.username;
        this.email = b.email;
        this.age = b.age;
    }

    public static class Builder {
        private String username;
        private String email;
        private int age;

        public Builder username(String u) { this.username = u; return this; }
        public Builder email(String e) { this.email = e; return this; }
        public Builder age(int a) { this.age = a; return this; }
        public UserProfile build() { return new UserProfile(this); }
    }
}
```

#### 4. Observer Pattern
Defines a 1-to-N dependency where multiple observer objects are notified automatically of any state changes in a subject.

```java
public interface Observer {
    void update(String event);
}

public class EventPublisher {
    private final List<Observer> observers = new ArrayList<>();

    public void subscribe(Observer o) { observers.add(o); }
    public void notifyAll(String event) {
        observers.forEach(o -> o.update(event));
    }
}
```

#### 5. Strategy Pattern
Encapsulates interchangeable family algorithms behind a common interface.

```java
public interface DiscountStrategy {
    double applyDiscount(double price);
}

public class ShoppingCart {
    private DiscountStrategy strategy;
    public void setStrategy(DiscountStrategy s) { this.strategy = s; }
    public double checkout(double total) {
        return strategy != null ? strategy.applyDiscount(total) : total;
    }
}
```

---

### Key Interview Questions
1. What are the SOLID principles? Explain each with a short example.
2. How do you implement a thread-safe Singleton in Java without synchronized overhead?
3. What is the difference between Factory Method and Abstract Factory patterns?
4. How does the Observer pattern decouple publishers and subscribers in event-driven systems?
5. When should you use Strategy pattern over traditional `if/else` branching?
