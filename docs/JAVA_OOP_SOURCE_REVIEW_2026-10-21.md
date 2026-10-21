# Java familiar-course OOP source review — October 21, 2026

The OOP document linked by course entry 1 has now received an actual eleven-page
text and image review. Its vocabulary and progression can remain useful revision
cues, but several categorical claims need qualification before they become interview
answers. The canonical OOP lesson already explains most of those qualifications.
This record completes one source review, not the forty-entry course alignment or
the real two-lesson learner pilot required by CLOSE-02.

## Source identity and inspection bounds

| Evidence | Observed value |
|---|---|
| Indexed source | S01, entry 1 in the [source ledger](JAVA_COURSE_SOURCE_LEDGER.md) |
| Public source | [OOP concepts PDF](https://drive.google.com/file/d/1eg_I2kdII2_KPtzGifky-YEvFcgaCX4H/view) |
| Displayed filename | `#1_OOPS Concepts In Java.pdf` |
| Download | Public Drive download with normal redirects; no account, cookies or access bypass |
| Request bounds | 30 seconds; maximum 8 MiB; completed in approximately 3.4 seconds |
| Actual size | 2,703,416 bytes |
| SHA-256 | `e1498c3483367b3b7ff8fdf10d0b11437651a44f67ed683e1e179a6236f824a7` |
| Pages | 11; page numbers below mean one-based PDF page order |
| Inspection | Apache PDFBox 3.0.8: page-separated text extraction and every page rendered at 120 DPI; all eleven images visually inspected, including diagrams and handwritten code |
| Access limitation | The web reader could not open the Drive viewer. The bounded public PDF download succeeded; this review is based on the PDF, not the viewer response |
| Canonical comparison | [OOP Pillars & Dynamic Method Dispatch](../content/java-spring/01d-java-oop-pillars.md), repository baseline `1d4eaaa7e32fba03303ed46988f019d124151522` |
| Local Java | OpenJDK `17.0.20.1`, build `17.0.20.1+1-1-24.04-Ubuntu`; examples compiled with `--release 17` |

PDF metadata contained no title. The filename is an identification aid, not proof of
authorship or a license. PDF/text/PNG working copies stayed outside the repository;
this record contains no source-page reproductions or transcriptions. Explanations
and runnable programs below are independently written. Public accessibility does
not establish permission to republish the notes.

## Page-by-page findings and canonical mapping

The **section** column names exact headings in the existing canonical lesson.
It records where a clarification belongs, not a claim that an unread source has
equivalent depth. Rows cover every PDF page, including continuation pages.

| PDF pages | Reviewed subject | Finding and recommended teaching treatment | Existing canonical section |
|---|---|---|---|
| 1 | Overview and procedural/OOP comparison | Keep organization around objects as an introductory distinction. Replace blanket claims about procedural reuse, hiding and overloading with language-specific examples; these capabilities are not a universal paradigm checklist. Objects can model software concepts too. | `1. From separate variables to an object`; opening account problem |
| 2 | State, behavior, class blueprint and start of a class sketch | Useful beginner model. Separate a class description, an instance and a variable holding its reference. Arrays are objects too; a physical-world counterpart is unnecessary. [JLS §4.3.1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-4.html#jls-4.3.1) | `1. From separate variables to an object` |
| 3 | Class sketch continuation, allocation and abstraction | Explain `new`, constructor execution and reference assignment. An ordinary method can already provide abstraction; an abstract class is not required for every abstraction. | `2. Run your first account class`; `The four OOP pillars` |
| 4 | Interface/implementation sketch and security rationale | Hidden implementation is not authentication or confidentiality. The sketch omits return types and implementations of some declared operations; do not label it a compilable program. [JLS §9.4](https://docs.oracle.com/javase/specs/jls/se17/html/jls-9.html#jls-9.4) | `The four OOP pillars`; `Interfaces, abstract classes, and default methods` |
| 5 | Encapsulation and accessor sketch | Accessors alone do not preserve valid state. The sketch also has inconsistent field/accessor names. Teach validation and a deliberate operation before unrestricted setters. | `3. Trace the state and protect its rules`; `Visibility and API boundaries` |
| 6 | Accessor calls, inheritance overview and inheritance forms | Distinguish class extension from interface implementation; not every parent declaration is inherited. Avoid presenting reuse alone as a reason to extend. [JLS §8.2](https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.2) | `Inheritance, interfaces, and composition`; `Overriding, hiding, and access rules` |
| 7 | Parent/child sketch, calls and parent-to-child drawing | Inherited accessible methods can be called through a child. Member lookup still starts from the expression's compile-time type; see the failing `BadMember` example below. | `Inheritance, interfaces, and composition`; `How overload resolution works` |
| 8 | Continuation plus single/multilevel/hierarchical drawings | These are useful informal family trees. Label parent and child explicitly; their downward arrows are not UML generalization-arrow notation. No additional Java inheritance mechanism is implied. | `Inheritance, interfaces, and composition` |
| 9 | Multiple-parent drawing and polymorphism | Java has one direct class superclass and multiple interface types. Interfaces do not automatically eliminate conflicting defaults; explicit resolution can be required. [JLS §§8.1.4–8.1.5](https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.1.4), [§9.4.1.3](https://docs.oracle.com/javase/specs/jls/se17/html/jls-9.html#jls-9.4.1.3) | `Interfaces, abstract classes, and default methods`; interview Q7 |
| 10 | Overload and override examples | The arity example is useful. Explain two decisions: compile-time signature selection, then runtime receiver dispatch for an overridable instance method. [JLS §§15.12.2, 15.12.4.4](https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.12.2) | `Compile-Time Polymorphism (Overloading) vs. Runtime Polymorphism (Overriding)`; `How overload resolution works` |
| 11 | Dispatch continuation, override constraint, IS-A/HAS-A and ownership relationships | Correct the identical-return-type claim: reference returns may be covariant. Separate design ownership from garbage collection; losing a whole's reference does not destroy an externally reachable part. [JLS §8.4.5](https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.4.5), [§12.6.1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-12.html#jls-12.6.1) | `Overriding, hiding, and access rules`; `Inheritance, interfaces, and composition`; interview Q6 |

Priorities are **high** for state invariants, conflicting defaults, return covariance
and overload/dispatch distinctions; **medium** for abstraction/security and
compilability; **editorial** for diagram notation and paradigm comparisons.

The canonical lesson already distinguishes abstraction from encapsulation, protects
the account's state, qualifies composition ownership, demonstrates interface
implementations, explains covariance and resolves the default-method conflict.
Its dispatch section also distinguishes observable JVM behavior from a mandatory
physical vtable layout; see [JVMS `invokevirtual`](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-6.html#jvms-6.5.invokevirtual)
and [implementation freedom](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html#jvms-2.7).
This source review does not identify a need to replace the canonical lesson with the
notes' wording or duplicate its diagrams.

## Independent Java 17 evidence

Save the following entire original program as `ReviewChecks.java` in a disposable
directory. It uses no dependencies, preview features or later-JDK APIs.

```java
public class ReviewChecks {
    static class Base {
        Object label() { return "base"; }
        String choose(Object input) { return "base-object"; }
        String choose(String input) { return "base-string"; }
    }
    static final class Derived extends Base {
        @Override String label() { return "derived"; }
        @Override String choose(Object input) { return "derived-object"; }
    }
    interface Left { default String mode() { return "left"; } }
    interface Right { default String mode() { return "right"; } }
    static final class Resolved implements Left, Right {
        @Override public String mode() { return Right.super.mode(); }
    }
    static final class UnsafeLimit {
        private int value;
        void set(int value) { this.value = value; }
        int value() { return value; }
    }
    static final class SafeLimit {
        private int value;
        void increase(int amount) {
            if (amount < 0 || amount > Integer.MAX_VALUE - value) {
                throw new IllegalArgumentException("invalid increase");
            }
            value += amount;
        }
        int value() { return value; }
    }
    static final class Part { String name() { return "still accessible"; } }
    static final class Whole {
        private final Part part = new Part();
        Part expose() { return part; }
    }
    public static void main(String[] args) {
        Base receiver = new Derived();
        Object argument = "text";
        System.out.println(receiver.label());
        System.out.println(receiver.choose(argument));
        System.out.println(receiver.choose("text"));
        System.out.println(new Resolved().mode());
        UnsafeLimit unsafe = new UnsafeLimit();
        unsafe.set(-1);
        System.out.println("private field, invalid state=" + unsafe.value());
        SafeLimit safe = new SafeLimit();
        safe.increase(7);
        try { safe.increase(-1); }
        catch (IllegalArgumentException expected) {
            System.out.println("rejected; value=" + safe.value());
        }
        Whole whole = new Whole();
        Part escaped = whole.expose();
        whole = null;
        System.out.println(escaped.name());
    }
}
```

Commands actually run:

```sh
javac --release 17 -Xlint:all ReviewChecks.java
java ReviewChecks
```

Compilation exited 0 without warnings; execution exited 0 and printed exactly:

```text
derived
derived-object
base-string
right
private field, invalid state=-1
rejected; value=7
still accessible
```

The first line demonstrates a legal `String` return replacing an `Object` return.
The next two lines isolate signature selection from receiver dispatch. The fourth
line uses an explicit interface-default choice. The next two show why a private
field plus an unrestricted setter is insufficient for a non-negative invariant.
The final line proves that an escaped reference remains usable after a different
reference is cleared. It does **not** measure when either object is collected;
there is no GC request, finalizer, timing assumption or destruction observation.
Reachability is a separate issue from a domain's intended ownership policy.

### Expected compilation failures

Save each block separately under its shown filename. Run
`javac --release 17 -XDrawDiagnostics Filename.java`. All four commands were run
and returned exit 1. Diagnostic keys below are observed on the stated JDK;
human-readable wording and columns can vary by compiler version.

**`BadDefaults.java` — two unrelated defaults require a decision.**

```java
interface East { default void run() {} }
interface West { default void run() {} }
class BadDefaults implements East, West {}
```

Observed: `compiler.err.types.incompatible`, with
`compiler.misc.incompatible.unrelated.defaults` (one error). Explicitly choosing a
default, as in `Resolved`, fixes this particular conflict.

**`BadReturn.java` — covariance does not allow an unrelated primitive return.**

```java
class ReturnParent { Object result() { return "ok"; } }
class BadReturn extends ReturnParent { @Override int result() { return 1; } }
```

Observed: `compiler.err.override.incompatible.ret` and
`compiler.err.method.does.not.override.superclass` (two errors).

**`BadMember.java` — the runtime child does not expand the declared parent API.**

```java
class ParentView {}
class ChildView extends ParentView { void extra() {} }
class BadMember { void check() { ParentView p = new ChildView(); p.extra(); } }
```

Observed: `compiler.err.cant.resolve.location.args` for `extra` on `ParentView`
(one error). This is member lookup, not a failed runtime override.

**`BadPrivate.java` — an unrelated top-level caller cannot directly read a private field.**

```java
class Owner { private int value; }
class BadPrivate { int read(Owner owner) { return owner.value; } }
```

Observed: `compiler.err.report.access` (one error). This is the Java source access
rule, not a claim that an interface or private field authenticates a remote user.
See [JLS §6.6.1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-6.html#jls-6.6.1).

## What this closes and what still needs evidence

- **Closed for S01 only:** actual accessible PDF identity, all-page visual/text
  inspection, factual findings, exact canonical section mapping, Java 17 primary
  references and independently executed positive/negative examples.
- **Still open:** the remaining source documents, course-entry-specific checks
  beyond S01, the course-order navigation, foundation/build-time coverage gaps,
  any reproduction rights decision, and the real two-lesson recognition pilot.
- **Canonical follow-up:** keep the existing explanations and stable lesson IDs.
  A useful learner task is to predict `derived-object` versus `base-string`,
  explain the unsafe setter and resolve the default conflict. These are proposed
  tasks; this review contains no claim that a human learner completed them.
- **Pilot acceptance:** use the [actual learner protocol](../LEARNER_USABILITY_STUDY.md),
  record where the learner struggles, revise and retest. Automated compilation
  proves program behavior, not familiarity, comprehension or interview readiness.

No canonical content, code, routing, progress state, diagrams, question identities
or course ledger was modified by this isolated review unit. The integrating change
must link this record and update S01's status without marking CLOSE-02 complete.
