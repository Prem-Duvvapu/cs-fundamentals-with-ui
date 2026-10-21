# Java familiar-course reference-values review — October 21, 2026

Source **S04**, mapped to familiar-course entry **6**, has received a complete six-page
text/image review. Its class → string → interface → array sequence is recognizable,
but its wrapper explanation contradicts Java's value-passing and immutability rules.
This record supplies original corrections and independently executed Java 17 evidence;
it does not reproduce the notes or establish a completed learner pilot.

## Access, identity and comparison scope

| Evidence | Observed value |
|---|---|
| Mapping | Entry 6, S04 in the [source ledger](JAVA_COURSE_SOURCE_LEDGER.md) |
| Public document | [Reference/nonprimitive variables PDF](https://drive.google.com/file/d/1y23GVqAKPxQ72ZAP1_uOsJW2XfnBDhX5/view) |
| Download filename | `#6_NonPrimitive_Variables.pdf`, from Content-Disposition |
| Bounded access | Ordinary public Drive download and redirects; 30-second timeout, 8 MiB maximum, five-redirect cap; completed in 3.715 seconds |
| Actual response | HTTP 303 then HTTP 200; 1,796,305 PDF bytes; no login, credentials or access bypass |
| SHA-256 | `9229b0741a131918269a98307d62ddcf73aa6ddc6b910236b18c6d29f41acb5b` |
| Document bounds | Six pages; one-based PDF order below; metadata title absent |
| Inspection | Page-separated text extraction and 120-DPI rendering using already cached Apache PDFBox 3.0.8; every page, handwritten diagram and embedded code image visually inspected |
| Canonical baseline | `b9dfe35a199e6ad73e4bad012f40360c56e4408a`; [memory lesson](../content/java-spring/01c-java-memory-model.md) Git blob `1caa26069cbc3f2a579a9aff049c79cda6da7ae3` |
| Execution baseline | OpenJDK `17.0.20.1`, build `17.0.20.1+1-1-24.04-Ubuntu`; `javac --release 17` |

The PDF, extracted text and rendered pages stay outside the repository. A public link
is not reproduction permission. Do not publish the PDF, screenshots, handwritten text
or copied programs without applicable rights. Keep source credit and independent wording.
The [alignment review](../JAVA_COURSE_ALIGNMENT_REVIEW_2026-10-04.md) and
[learning plan](../JAVA_LEARNING_PLAN.md) define the wider course-alignment work.

## Findings and exact canonical destinations

Names below are existing canonical headings. A mapped destination is not proof that
all source details already have beginner teaching, or that a learner recognizes them.

| PDF page | Inspected subject | Original correction / qualification | Existing destination |
|---|---|---|---|
| 1 | Reference-type list; class and object creation images | `String` is a class type, not a fourth category parallel to classes. Start with class/interface/array references; introduce generic type variables later. A variable stores a reference value, not the object itself. [JLS §4.3](https://docs.oracle.com/javase/specs/jls/se17/html/jls-4.html#jls-4.3) | Memory: `Primitives, references, and variables` |
| 2 | Reference-to-heap arrow; pass-by-value and pointer analogy | The arrow is useful for aliasing. It does not expose an address, pointer arithmetic or C++ reference parameters. Argument values are copied into distinct parameter variables. [JLS §15.12.4.5](https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.12.4.5), [JVMS §2.7](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html#jvms-2.7) | Memory: `Follow one value before drawing memory regions`; `Java is pass-by-value` |
| 2–3 | String pool, equal literals and explicit construction | Immutability does not make every equal string the same object. Literals and string-valued constant expressions are interned; `new String(...)` creates a distinct string object. A fixed-capacity pool or physical partition is not a language guarantee. Use content equality for business comparisons. [String API](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/String.html), [JLS §15.21.3](https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.21.3) | Memory: `Strings, the pool, and immutable values` |
| 3–4 | Interface implementations, declared reference type and actual object diagrams | An interface-typed variable can refer to an implementing class instance; this does not put an object inside another variable. Directly constructing the interface is invalid; an anonymous implementation is a different construct. The displayed call-site sketch also repeats a local identifier and needs distinct names before compiling. [JLS §15.9](https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.9) | OOP: `The four OOP pillars`; `Interfaces, abstract classes, and default methods` |
| 4–5 | Array reference, five indexed cells and multidimensional mention | Arrays are objects with a fixed length and one component type. Reference elements can identify different assignment-compatible object classes; multidimensional arrays contain references to subarrays, which can have different lengths. The sketch is not a promise about native contiguous memory. [JLS Chapter 10](https://docs.oracle.com/javase/specs/jls/se17/html/jls-10.html) | Memory: `Method execution and object layout`; first array-alias example |
| 5 | Eight primitive-to-wrapper mappings; alleged reference-passing advantage | The mappings are correct; the proposed advantage is incorrect. `Integer` is an immutable value-based wrapper, not a mutable shared integer cell. Incrementing a wrapper variable computes and assigns another value; reassigning a copied parameter cannot replace the caller's variable. [Integer API](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Integer.html) | Memory: `Java is pass-by-value`; explicit beginner wrapper trace still missing |
| 5 | Primitive-versus-wrapper placement explanation | Primitive instance fields belong to their containing objects; primitives are not necessarily stack-only. Source declarations do not prove physical allocation after JVM optimization. [JVMS §§2.5–2.7](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html#jvms-2.5) | Memory: `Stack frames, heap objects, and lifetime`; `Escape analysis and runtime allocation` |
| 6 | Collections, boxing and unboxing | Java generic type arguments are reference types, so use `List<Integer>` rather than `List<int>`. Boxing/unboxing bridges primitive values and wrappers; unboxing `null` throws `NullPointerException`. Do not promise a new allocation for every boxing conversion. [JLS §4.5.1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-4.html#jls-4.5.1), [§§5.1.7–5.1.8](https://docs.oracle.com/javase/specs/jls/se17/html/jls-5.html#jls-5.1.7) | Generics: `Put the type promise beside the container`; `Type parameters describe families of classes`; beginner wrapper bridge still missing |
| 6 | `static`, `final` and constant-variable sketch | `final` prevents reassignment after initialization, not mutation of a reached object. `static` is independent and is not required for a local constant. Only a final primitive/String variable initialized with a constant expression is a constant variable in the JLS sense; the handwritten declaration also omits its type. [JLS §4.12.4](https://docs.oracle.com/javase/specs/jls/se17/html/jls-4.html#jls-4.12.4) | Static/final lesson: `final`: One Assignment and Closed Extension Points; `Initialization Order, Safe Publication, and Constant Inlining` |

The important interview correction is the wrapper explanation. Teach three separate
operations: copy a reference, mutate a mutable object, and reassign a variable.
An immutable wrapper supports the first and third; it does not turn Java into
pass-by-reference. Cache behavior must never become a numeric equality contract.

## Independently executed Java 17 program

Save this original program as `ReferenceChecks.java`. It uses no external dependencies
or preview features. The domain, names and program are independently written.

```java
import java.util.ArrayList;
import java.util.List;

public class ReferenceChecks {
    interface Label { String text(); }
    static final class InvoiceLabel implements Label {
        public String text() { return "invoice"; }
    }
    static final class Holder { int count; Integer optional; }
    static Integer increment(Integer value) {
        value++;
        return value;
    }
    static void update(int[] values) {
        values[0] = 9;
        values = new int[] {100};
    }
    public static void main(String[] args) {
        Integer original = 300;
        Integer alias = original;
        Integer changed = increment(original);
        System.out.println("wrapper=" + original + "," + alias + "," + changed);
        System.out.println("sameOriginal=" + (original == alias));
        int[] items = {2};
        int[] shared = items;
        update(shared);
        System.out.println("array=" + items[0] + ",same=" + (items == shared));
        Label label = new InvoiceLabel();
        System.out.println("interface=" + label.text());
        String literal = "service";
        String folded = "ser" + "vice";
        String distinct = new String(literal);
        System.out.println("strings=" + (literal == folded) + "," + (literal == distinct)
                + "," + literal.equals(distinct) + "," + (literal == distinct.intern()));
        List<Integer> counts = new ArrayList<>();
        counts.add(4);
        int unpacked = counts.get(0);
        System.out.println("boxedList=" + unpacked);
        Holder holder = new Holder();
        System.out.println("fieldDefaults=" + holder.count + "," + holder.optional);
        try {
            int absent = holder.optional;
            System.out.println(absent);
        } catch (NullPointerException expected) {
            System.out.println("nullUnboxing=NullPointerException");
        }
        int[][] rows = {new int[] {1}, new int[] {2, 3}};
        System.out.println("rowLengths=" + rows[0].length + "," + rows[1].length);
        final int localLimit = 7;
        final int[] editableContents = {2};
        editableContents[0] = 5;
        System.out.println("finalLocal=" + localLimit + ",arrayContents=" + editableContents[0]);
    }
}
```

Commands actually executed:

```sh
javac --release 17 -Xlint:all ReferenceChecks.java
java ReferenceChecks
```

Compilation and execution both exited 0; compilation produced no warnings. Exact output:

```text
wrapper=300,300,301
sameOriginal=true
array=9,same=true
interface=invoice
strings=true,false,true,true
boxedList=4
fieldDefaults=0,null
nullUnboxing=NullPointerException
rowLengths=1,2
finalLocal=7,arrayContents=5
```

`increment` reassigns its own parameter and returns 301. Both caller variables still
hold 300; the program does not mutate an Integer's stored number. In contrast, `update`
changes the shared array element before replacing only its own parameter reference.
String identity and string content are deliberately tested separately. Boxing lets the
list hold an integer value, while a missing wrapper field cannot be unboxed safely.
The final array's contents change despite its reference being final.

These observations establish these programs' semantics. They do not measure physical
addresses, stack/heap placement, allocation count, pool capacity, GC or performance.

## Expected compilation failures

Each original block was saved separately and compiled with
`javac --release 17 -XDrawDiagnostics Filename.java`. All five commands actually
returned exit **1**. Diagnostic keys below are observed, not promised across compilers.

**`BadInterface.java` — An interface cannot be directly instantiated.**

```java
class BadInterface {
    interface Work { void execute(); }
    Work work = new Work();
}
```

Observed: `compiler.err.abstract.cant.be.instantiated`.

**`BadPrimitiveGeneric.java` — A primitive is not a permitted generic type argument.**

```java
class BadPrimitiveGeneric { java.util.List<int> counts; }
```

Observed: `compiler.err.type.found.req` with `compiler.misc.type.req.ref`.

**`BadFinalReference.java` — A final reference cannot be reassigned.**

```java
class BadFinalReference {
    void change() {
        final int[] counts = {2};
        counts = new int[] {3};
    }
}
```

Observed: `compiler.err.cant.assign.val.to.final.var`.

**`BadRuntimeConstant.java` — A final variable initialized by a method call is not a constant-expression case label.**

```java
class BadRuntimeConstant {
    int read(int input) {
        final int limit = Integer.parseInt("4");
        return switch (input) { case limit -> 1; default -> 0; };
    }
}
```

Observed: `compiler.err.const.expr.req`.

**`BadDuplicateLocal.java` — Two declarations cannot reuse the same local name in this scope.**

```java
class BadDuplicateLocal {
    void create() {
        Object first = new Object();
        Object first = new Object();
    }
}
```

Observed: `compiler.err.already.defined`.

## Canonical lesson findings and remaining acceptance

No confirmed factual error was found in the canonical explanations overlapping this
source. The memory lesson already correctly separates reference copying, mutation,
reassignment, primitive fields and conceptual frame slots, string identity/content,
literals/interning and runtime allocation. The OOP lesson already explains interface
references, and the static/final lesson separates final references from immutable objects.

The beginner gap is a short **boxing → boxed alias → reassignment → null-unboxing**
trace connecting values to reference-based APIs. Merely using `Integer` in generics
examples or discussing wrapper size does not explain this bridge. Prefer a compact
original clarification beside pass-by-value and a link to the existing generics lesson;
retain all current reference, numeric and concurrency examples. The memory lesson is
already 599 validator-reported lines, so a later content-only unit needs a careful
contract-preserving edit rather than unchecked expansion. No lesson was changed here.

Suggested recall task, in original wording: predict whether incrementing a boxed
parameter changes the caller's number, then explain why changing an array element can
be observed by the caller. Follow up with a missing database value: explain what happens
when a nullable Integer is assigned to an int, and choose an explicit domain default or
validation policy rather than silently treating every absence as zero.

This closes actual S04 source inspection and the ledger's entry-6 review status.
It does not complete instructional integration, source rights clearance, any other
source review, learner recognition, interview recall or CLOSE-02. The
[real learner protocol](../LEARNER_USABILITY_STUDY.md) remains a separate acceptance gate.
Only this review artifact and its source-ledger status are changed by this unit.
