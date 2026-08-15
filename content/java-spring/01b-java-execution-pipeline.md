# Java Execution Pipeline & JVM Architecture

## 🟢 Beginner Level

### The Java Execution Philosophy: "Write Once, Run Anywhere" (WORA)
Java achieves cross-platform portability by decoupling source code compilation from host-specific machine architecture.

```
+------------------+         javac compiler          +--------------------+
|    Main.java     |  ────────────────────────────►  |     Main.class     |
| (Human Readable) |                                 | (JVM Bytecode IR)  |
+------------------+                                 +--------------------+
                                                                │
                                                                ▼
                                                    +-----------------------+
                                                    |  JVM ClassLoader      |
                                                    |  & Execution Engine   |
                                                    +-----------------------+
                                                                │
                                       ┌────────────────────────┼────────────────────────┐
                                       ▼                        ▼                        ▼
                               [ Windows x86_64 ]       [ Linux ARM64 ]           [ macOS M-Series ]
```

1. **`javac` Compilation**: Compiles `.java` source code into intermediate, architecture-neutral **Bytecode** instructions (`.class` files).
2. **JVM Execution**: The Java Virtual Machine (JVM) interprets bytecode or compiles hot loops into native assembly machine code via the Just-In-Time (JIT) compiler.

---

## 🟡 Intermediate Level

### ClassLoader Subsystem & Parent Delegation Model

The JVM loads classes dynamically into memory via a 3-tier hierarchical delegation chain:

```
                  ┌────────────────────────────────────────┐
                  │ 1. BOOTSTRAP CLASSLOADER (C++ Native)  │
                  │    Core Runtime: java.base, rt.jar     │
                  └───────────────────▲────────────────────┘
                                      │  (Parent-First Delegation)
                  ┌───────────────────┴────────────────────┐
                  │ 2. PLATFORM / EXTENSION CLASSLOADER    │
                  │    JDK Modules, lib/ext/*.jar          │
                  └───────────────────▲────────────────────┘
                                      │  (Parent-First Delegation)
                  ┌───────────────────┴────────────────────┐
                  │ 3. APPLICATION / SYSTEM CLASSLOADER    │
                  │    Application Classpath: ./target/    │
                  └────────────────────────────────────────┘
```

#### The Loading Flow:
1. When a class (e.g. `Main.class`) is referenced, the **Application ClassLoader** delegates to the **Platform ClassLoader**.
2. The **Platform ClassLoader** delegates to the **Bootstrap ClassLoader**.
3. If the Bootstrap ClassLoader cannot find the class, it delegates back down the chain.
4. **Why Parent Delegation?** Security and consistency. Prevents malicious code from overriding core classes (e.g. replacing `java.lang.String` or `java.lang.System` with trojanized implementations).

---

## 🔴 Expert Level

### Bytecode Verifier, Interpreter & JIT Compiler (Tiered Compilation)

```
Bytecode (.class) ──► [ Bytecode Verifier ] ──► [ Template Interpreter (Immediate Execution) ]
                                                            │
                                              [ HotSpot Profiler Counter ]
                                                            │ (Method count > 10,000)
                                                            ▼
                                              [ C1 / C2 JIT Compiler ] ──► [ Optimized x86 Assembly ]
```

1. **Bytecode Verifier**: Before execution, ensures bytecode does not violate JVM constraints (no stack overflow/underflow, no type safety violations, valid operand stack depths).
2. **Interpreter**: Executes bytecode instructions immediately line-by-line using opcode interpretation loops.
3. **C1 (Client) & C2 (Server) JIT Compilers**:
   - Analyzes execution hotspots via method call counters and loop backedge counters.
   - Compiles frequently executed bytecode into optimized native machine code (x86_64 / ARM64) with optimizations like loop unrolling, escape analysis, and lock coarsening.

### Key Interview Questions

#### Q1: What is the difference between JDK, JRE, and JVM?
**Answer**: 
- **JVM (Java Virtual Machine)**: The abstract runtime machine that executes bytecode, manages memory, and performs garbage collection.
- **JRE (Java Runtime Environment)**: JVM + Core runtime libraries (`java.base`, etc.) needed to run Java programs.
- **JDK (Java Development Kit)**: JRE + Development tools (`javac` compiler, `javap` disassembler, `jdb`, `jconsole`).

#### Q2: What is ClassLoader leak and how does it cause Metaspace OutOfMemoryError?
**Answer**: When web application containers (e.g. Tomcat) redeploy an application without restarting the JVM, static variables or ThreadLocal references holding pointers to objects loaded by a custom WebAppClassLoader prevent the classloader from being garbage collected. Metaspace becomes exhausted by accumulated orphaned class metadata, triggering `java.lang.OutOfMemoryError: Metaspace`.
