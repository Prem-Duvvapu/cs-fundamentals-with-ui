# Java familiar-course methods and constructors review — October 23, 2026

Source **S05**, shared by course entries **7 and 8**, has received a complete nine-page
text/image review. Keep the familiar declaration → method forms → varargs → construction
sequence. The canonical OOP lesson now gives original corrections, a method-reading table,
and an independently executable constructor example. The two-entry revision-navigation
pilot remains unchanged; a real learner recognition/revision/retest session is still open.

## Access and identity

| Evidence | Observation |
|---|---|
| Public source | [Methods and constructors PDF](https://drive.google.com/file/d/1KEMCFaA5phnL1qneiWPPsSeDGoRqFyWK/view) |
| Course mapping | S05, entries 7/8 in the [source ledger](JAVA_COURSE_SOURCE_LEDGER.md) |
| Download | Ordinary public Drive download;3,320,264 PDF bytes; 10 MiB read cap and 20-second request timeout; no credentials or access bypass |
| SHA-256 | `285dffd82af4a01ee397e5e52ea0eb32cda361fc3d94e64f4a0f9fad2be076a8` |
| Inspection | Nine pages, extracted text plus every 2× render (144 DPI), including embedded code and IDE hints; PyMuPDF 2.0 in an isolated external review environment |
| Baseline | Merged 438b865; original OOP lesson blob9890c2bebd4039a1f737ee1c1901ef1e99864085 |
| Corrected lesson | Content commit 6b0ca1d; canonical `java-oop-pillars` identity and section anchors retained |
| Actual execution | OpenJDK 17.0.20.1+1-1-24.04-Ubuntu; `javac --release 17` |

The PDF, extracted text, rendered pages and disposable compilation files remain outside
this repository. Public access does not establish redistribution rights. This report
credits the notes and supplies independently written explanations/programs; it publishes
no source PDF, screenshots, copied code or handwritten transcription. The original
HTTP redirect chain/response headers were not retained and are not reconstructed here.

## Page-by-page findings

The destinations are headings in the existing [OOP lesson](../content/java-spring/01d-java-oop-pillars.md),
not a second lesson registry. A source review does not prove a learner understands it.

| PDF page | Inspected material | Correction or qualification | Canonical destination |
|---|---|---|---|
| 1 | Task-oriented methods, sum example and declaration sketch | Separate parameter variables from argument values; declaration sketches are excerpts. Method names conventionally use verbs. | `Read a method declaration` |
| 2 | Access, return declarations, names and method bodies | Reference results also include interface/array types. Private access includes the enclosing top-level nest; protected cross-package access has receiver restrictions. [Access rules](https://docs.oracle.com/javase/specs/jls/se17/html/jls-6.html#jls-6.6) | `Read a method declaration`; `Visibility and API boundaries` |
| 3 | Library/user methods and overload sketches | Return type alone cannot distinguish overloads. The nonvoid body shown as a placeholder needs a return on every normally completing path before compiling. [Method rules](https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.4) | `How overload resolution works` |
| 4 | Override, static, final and abstract methods | Static methods can reach instance members through an explicit reference. Abstract methods also occur in interfaces. A read-only operation need not be static. [Class/instance methods](https://dev.java/learn/language/oop/classes-objects/more-on-classes/), [interface methods](https://docs.oracle.com/javase/specs/jls/se17/html/jls-9.html#jls-9.4) | Method-reading bridge; `Interfaces, abstract classes, and default methods` |
| 5 | Varargs declaration and IDE call images | One final-position array parameter accepts zero/many values or an array. Grey argument labels are IDE hints, not named-argument source syntax. [Formal parameters](https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.4.1) | `How overload resolution works` |
| 6 | Constructor identity, naming, result and final modifier | No hidden class return type exists. A class-named ordinary method is different. The observed no-argument VM initializer descriptor is `()V`, not a Java `void` constructor declaration. [JVMS initializer descriptors](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-4.html#jvms-4.4.2) | `Class initialisation and construction order` |
| 7 | Forbidden modifiers, interfaces, default/no-argument constructors | Constructor modifiers are language restrictions; do not justify them using a blanket static-access ban. Field defaults precede constructor processing, and field initialisers can replace them. [Initialization sequence](https://docs.oracle.com/javase/specs/jls/se17/html/jls-12.html#jls-12.5) | Constructor definitions and `InitialStock` trace |
| 8 | Parameters, private factories and `this` chain | A parameter does not assign a field automatically. Field initialisers run once along a `this` chain. Private construction alone does not enforce singleton identity. [Constructor tutorial](https://dev.java/learn/language/oop/classes-objects/defining-constructors/) | `Delivery` trace and change/debug task |
| 9 | `super` chain and parent parameter requirement | An implicit `super()` requires a suitable accessible no-argument parent constructor; a parent may also offer parameterised constructors. Java 17 first-statement rules are version-bound. [Java 25 flexible bodies](https://docs.oracle.com/en/java/javase/25/language/flexible-constructor-bodies.html) | Delegation paragraph and interview framing |

Highest-priority corrections concern constructor results/defaults and static/abstract
methods. Preserve useful material: explicit no-argument versus compiler-provided default,
last-position varargs, no constructor inheritance/override and deliberate chaining.
The existing lesson already explains protected receivers and overload/dispatch separately.
Java 25's documented rule was checked; no Java 25 execution or broader runtime compatibility
is claimed. Abstract classes can have constructors; interfaces cannot declare them.

## Independently executed checks

Save this entire original program as `MethodConstructorChecks.java` in a disposable
directory. Its nested declarations deliberately check the enclosing private-access
boundary; the simpler learner-facing program remains in the canonical lesson.

```java
public class MethodConstructorChecks {
    interface Capability { int value(); }
    static class Initialised { int number = 7; }
    static class NamedMethod {
        int number;
        void NamedMethod() { number = 9; }
    }
    static class Parent {
        private int number;
        Parent() { number = 1; }
        Parent(int n) { number = n; }
    }
    static class Child extends Parent { Child() { } }
    static class Concrete implements Capability {
        public int value() { return 4; }
    }
    static int throughInstance(Concrete instance) { return instance.value(); }
    static class Sibling {
        static int read(Parent parent) { return parent.number; }
    }
    static class Token {
        private Token() { }
        static Token create() { return new Token(); }
    }
    static int sum(int... values) {
        int result = 0;
        for (int value : values) result += value;
        return result;
    }
    static void check(boolean value) {
        if (!value) throw new AssertionError("source_claim_check");
    }
    public static void main(String[] args) {
        check(new Initialised().number == 7);
        NamedMethod named = new NamedMethod();
        check(named.number == 0);
        named.NamedMethod();
        check(named.number == 9);
        check(Sibling.read(new Child()) == 1);
        check(throughInstance(new Concrete()) == 4);
        check(sum() == 0 && sum(2, 3) == 5 && sum(new int[] {2, 3}) == 5);
        check(Sibling.read(new Parent(6)) == 6);
        check(Token.create() != Token.create());
        System.out.println("PASS: methods and constructor source checks");
    }
}
```

Commands actually executed, without preview features or dependencies:

```sh
javac --release 17 -Xlint:all MethodConstructorChecks.java
java MethodConstructorChecks
javap -s 'MethodConstructorChecks$Initialised'
```

Compilation and execution exit 0; the program throws on any failed check. Observed stdout:

```text
PASS: methods and constructor source checks
```

`javap -s` also reports the implicit no-argument initializer descriptor `()V`.
This is class-file evidence; Java source constructors still declare no return type.

Ten separate intentionally failing files were also compiled with `javac --release 17`;
each exited 1. These are original minimal negative examples, not copied source programs.
Create one file per row, using the given class/filename, then compile that file alone:

| File | Entire source | Expected rejection |
|---|---|---|
| `BadConstructorReturn.java` | `class BadConstructorReturn { BadConstructorReturn(){ return this; } }` | Constructor cannot return a value |
| `MissingParentNoArg.java` | `class OnlyArgument { OnlyArgument(int n){} } class MissingParentNoArg extends OnlyArgument { }` | Implicit parent no-argument call has no matching constructor |
| `BadVarargsPosition.java` | `class BadVarargsPosition { void run(int... values,int last){} }` | Varargs parameter is not last |
| `ReturnOnlyOverload.java` | `class ReturnOnlyOverload { int choose(int n){return n;} String choose(int n){return "x";} }` | Same parameter signature with only a different result |
| `VarargsArrayOverload.java` | `class VarargsArrayOverload { void accept(int... n){} void accept(int[] n){} }` | Varargs/array declarations have the same signature |
| `MissingReturnPath.java` | `class MissingReturnPath { int choose(boolean b){ if(b)return 1; } }` | Nonvoid method can complete without returning a value |
| `StaticConstructor.java` | `class StaticConstructor { static StaticConstructor(){} }` | Forbidden constructor modifier |
| `FinalConstructor.java` | `class FinalConstructor { final FinalConstructor(){} }` | Forbidden constructor modifier |
| `AbstractConstructor.java` | `abstract class AbstractConstructor { abstract AbstractConstructor(); }` | Forbidden constructor modifier |
| `SynchronizedConstructor.java` | `class SynchronizedConstructor { synchronized SynchronizedConstructor(){} }` | Forbidden constructor modifier |

The positive checks also demonstrate that two calls to a private constructor's factory
can create two distinct instances, a static method can invoke an instance operation,
and an interface can declare an abstract operation. They do not certify every possible
access pattern, language feature or production class design.

## Canonical integration and verification

- The content-only commit 6b0ca1d changes just the OOP lesson: 600 newline-terminated lines
  (the validator reports 601 including the trailing empty split), four unchanged Mermaid
  sources and 14 unchanged interview Q&As/rubrics.
- `ConstructorDemo` is a marked Java 17 runnable program with exact output2/5/9 and a
  predict/change/debug exercise. All 16 marked curriculum programs compile/run with their
  expected output. Original code fences, question/rubric text and diagram bodies are preserved.
- Single-file content validation passes. Simulation migration remains 109/109 resolved;
 295 manifest entries / 590 theme assets remain current. No CSS or diagram geometry changes.
- All 265 Markdown rendering tests pass, and the frontend production build passes.
- Actual Chromium presentation at375px and 1440px in both themes confirms the example/output,
  native same-tab source credit, no page overflow, zero article-scoped axe findings and zero
  JavaScript errors. Screenshots were inspected. These use canonical content/API fixtures;
  they are not actual backend, learner, manual screen-reader or browser-zoom observations.

The [persistent receipt](evidence/JAVA_METHODS_SOURCE_2026-10-23.json) binds source PDF identity,
canonical lesson, original checks and scoped browser observations. Final integrated CI/release
remains required. Five of 31 distinct course links now have factual reviews; 26 remain.
CLOSE-02 also requires the real recognition task and revision/retest before expanding the
closed-by-default two-entry revision list. No new course entry or copied lesson metadata is added.
