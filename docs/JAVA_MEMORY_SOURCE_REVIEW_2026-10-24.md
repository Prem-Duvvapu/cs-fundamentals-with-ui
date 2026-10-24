# Java familiar-course memory and garbage-collection review — October 24, 2026

Source **S06**, course entry **9**, has received a complete **12-page text/image review**. The familiar stack/heap → references → generations → collectors sequence can be retained, with the qualifications below. The canonical JVM lesson now adds an original weak-reference exercise and explicit PermGen/CMS version boundaries. The two-entry revision-navigation pilot remains unchanged; recognition, revision and retesting with a real learner are still open.

## Access and identity

| Evidence | Actual observation |
|---|---|
| Public source | [Memory-management notes](https://drive.google.com/file/d/1VLbaVl69r9FlKw2q_nI4qS6mlGx1t9Js/view), S06/entry 9 in the [source ledger](JAVA_COURSE_SOURCE_LEDGER.md) |
| Source title | `#9_Memory_Management.pdf` |
| Ordinary public access | October 23: viewer HTTP 200/88,522 HTML bytes; public Drive download HTTP 200/4,334,529 PDF bytes; 10 MiB cap and 20-second request timeout; no credentials or bypass |
| PDF SHA-256 | `b39e7fa642ee3396546578cedac64c04c8e02e3fe864e2951d2bf9655867bbe8` |
| Inspection | All 12 page texts and all twelve 144-DPI renders; page 2's embedded IDE/code image was inspected visually. PyMuPDF 2.0 in an existing external review environment |
| Execution | OpenJDK `17.0.20.1+1-1-24.04-Ubuntu`; `javac --release 17 -Xlint:all`; one compilation and nine bounded JVM launches |
| Scope | Baseline `7144f1e`; canonical `jvm-gc` lesson, with the separate content commit listed below |

The PDF, page images, extracted text, request headers and disposable compilation files remain outside the repository. Public access does not establish redistribution permission. This package credits the source and publishes original explanations/checks, not the notes, screenshots or a handwritten transcription. The web reader could not open the Drive viewer, while the ordinary public download succeeded; an HTML viewer alone was not counted as a review.

## Page-by-page findings

| Page | Inspected subject | Correction or qualification |
|---|---|---|
| 1 | Stack/heap overview, locals and collector list | Stack/heap is a starting model, not the complete JVM runtime-area inventory. Object fields can contain primitives or references; strength is not determined by stack placement. [JVMS runtime areas](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html#jvms-2.5) |
| 2 | Embedded Java/IDE image and string arrows | The literal/new-string arrows are reversed relative to the code. Equal literals share the interned identity; `new String(literal)` creates a distinct equal `String`. The grey constructor label is an IDE hint, not named-argument syntax. [Java 17 literals](https://docs.oracle.com/javase/specs/jls/se17/html/jls-3.html#jls-3.10.5) |
| 3 | Return and stack-reference removal diagrams | Method-frame return is a useful model; lexical block exit is not an object-freeing operation. Other owners can retain an object, while optimisation can end reference liveness earlier. The existing lesson already distinguishes reachability from scope. |
| 4 | Unreferenced objects and GC scheduling | Eligibility is not immediate reclamation. `System.gc()` supplies no timing/reclamation guarantee, and collection frequency is not simply proportional to heap fullness. [Java 17 GC request contract](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/System.html#gc()) |
| 5 | Strong/weak references and weak-object diagram | A weak-reference wrapper can stay non-null after its referent is cleared. A genuinely strong reachable owner prevents weak reachability; merely running GC does not delete every weak target. [WeakReference](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/ref/WeakReference.html) |
| 6 | Soft references, reassignment and generation layout | Soft and weak reference classes are separate subclasses of `Reference`. Soft-reference clearing is discretionary under memory demand. Reassignment removes one ownership path. The Java-7 PermGen wording conflicts with page 10: HotSpot removed it in Java 8. [SoftReference](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/ref/SoftReference.html), [metadata history](https://docs.oracle.com/javase/8/docs/technotes/guides/vm/gctuning/considerations.html) |
| 7 | Eden and first survivor-copy trace | A small-object generational example is useful with stated collector assumptions. Not every new allocation uses Eden; G1 humongous objects use old regions. Marking follows live objects from roots, rather than marking garbage as the generic algorithm. [G1 layout/collection](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-first-g1-garbage-collector1.html) |
| 8 | Second young collection and survivor ages | Alternating survivor spaces explains copying collectors; it is not every collector's physical layout. Collection age counts survivals rather than elapsed time, and a young collection is not guaranteed to be fast for every workload. |
| 9 | Illustrative age-three promotion | Three is an explicitly chosen teaching threshold, not a universal default. Promotion also depends on occupancy/policy; old-generation objects are not defined by being large or frequently accessed. |
| 10 | Old-generation work, metaspace and compaction | Separate class metadata from objects retained by static fields. Metaspace uses native memory, can be capped and can exhaust; expandable does not mean unlimited. Do not describe historical PermGen as universally unable to grow. [Java 8 metadata guidance](https://docs.oracle.com/javase/8/docs/technotes/guides/vm/gctuning/considerations.html) |
| 11 | Compaction, Serial and Parallel GC | The compaction sketch is useful. Serial can suit small/constrained workloads; parallel collection is not a universal promise of lower pauses or faster requests. [Java 17 collector choices](https://docs.oracle.com/en/java/javase/17/gctuning/available-collectors.html) |
| 12 | CMS/G1 and historical defaults | CMS was removed in JDK 14. G1 includes stop-the-world phases and is not simply a pause-free CMS upgrade. Defaults depend on runtime/resources; source-era Java 8 wording must not become a Java 17 rule. [Removal record](https://docs.oracle.com/en/java/javase/17/migrate/removed-tools-and-components.html), [G1 phases](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-first-g1-garbage-collector1.html) |

The canonical lesson already explains allocation elimination, collector-specific generations, live-object marking, scope versus reachability, metaspace failures and pause goals. The focused addition fills the missing strong/weak/soft wrapper distinction rather than importing twelve pages or rewriting protected questions.

Version boundaries remain explicit. Java 17 ZGC is non-generational in this lesson's baseline; [Java 21 documents an optional generational mode](https://docs.oracle.com/en/java/javase/21/gctuning/available-collectors.html), [Java 23 makes that mode the default](https://docs.oracle.com/en/java/javase/23/gctuning/available-collectors.html), and [Java 24 documents its non-generational-mode removal](https://docs.oracle.com/en/java/javase/24/gctuning/z-garbage-collector.html). These later-version facts were checked in primary documentation, not executed here. Direct web reads of OpenJDK JEP 122/439 returned HTTP 403; Oracle's versioned documentation supplies the relevant verified release facts instead.

## Independently executed checks

This original program, saved as `MemorySourceChecks.java`, checks string identity, reference-class contracts, a retained strong owner and the actual HotSpot non-heap metaspace pool:

```java
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryType;
import java.lang.ref.Reference;
import java.lang.ref.SoftReference;
import java.lang.ref.WeakReference;

public class MemorySourceChecks {
    static void check(boolean condition) {
        if (!condition) throw new AssertionError("memory-source-check");
    }
    public static void main(String[] args) {
        check(Runtime.version().feature() == 17);
        String first = "parcel";
        String sameLiteral = "parcel";
        String distinct = new String(first);
        check(first == sameLiteral);
        check(first != distinct && first.equals(distinct));
        check(distinct.intern() == first);
        System.out.println("literal identity and distinct equal string: PASS");
        check(WeakReference.class.getSuperclass() == Reference.class);
        check(SoftReference.class.getSuperclass() == Reference.class);
        Object task = new Object();
        WeakReference<Object> weak = new WeakReference<>(task);
        SoftReference<Object> soft = new SoftReference<>(task);
        System.gc();
        check(weak.get() == task && soft.get() == task);
        Reference.reachabilityFence(task);
        weak.clear();
        check(weak != null && weak.get() == null);
        check(soft.get() == task);
        soft.clear();
        check(soft != null && soft.get() == null);
        Reference.reachabilityFence(task);
        System.out.println("strong owner and explicit reference clearing: PASS");
        boolean nativeMetaspace = ManagementFactory.getMemoryPoolMXBeans().stream()
            .anyMatch(pool -> pool.getName().equals("Metaspace") && pool.getType() == MemoryType.NON_HEAP);
        check(nativeMetaspace);
        System.out.println("observed HotSpot Metaspace non-heap pool: PASS");
        System.out.println("java feature: " + Runtime.version().feature());
    }
}
```

Compile with `javac --release 17 -Xlint:all MemorySourceChecks.java`, then execute:

```sh
java -Xms16m -Xmx32m -XX:ActiveProcessorCount=2 MemorySourceChecks
java -Xms16m -Xmx32m -XX:ActiveProcessorCount=2 -XX:+DisableExplicitGC MemorySourceChecks
```

Both launches exit zero and print:

```text
literal identity and distinct equal string: PASS
strong owner and explicit reference clearing: PASS
observed HotSpot Metaspace non-heap pool: PASS
java feature: 17
```

`Reference.reachabilityFence` keeps the strong owner live through the check. Explicit `clear()` is an API action, not proof of collector-triggered reclamation; the same assertions also pass when explicit GC is disabled. [Reference contracts](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/ref/Reference.html) distinguish wrapper clearing, returned referents and reachability fences. No assertion predicts when an unowned target is collected.

The learner-facing [ReferenceHandleDemo](../content/java-spring/01-jvm-gc.md#strong-owners-and-weak-or-soft-handles) and its no-`clear()` variation were also compiled/run. All four normal output checks are `true`; removing `clear()` makes only `referent cleared` become `false`, with the strong owner retained through the fence.

A second original program checks a collector-specific allocation counterexample:

```java
import java.lang.ref.Reference;
public class HumongousAllocationCheck {
    public static void main(String[] args) {
        byte[] batch = new byte[2 * 1024 * 1024];
        batch[0] = 42;
        System.gc();
        if (batch[0] != 42) throw new AssertionError("live array changed");
        Reference.reachabilityFence(batch);
        System.out.println("live array: 42");
    }
}
```

Commands actually executed after compilation:

```sh
java -Xms32m -Xmx32m -XX:ActiveProcessorCount=2 -XX:+UseG1GC -XX:G1HeapRegionSize=1m -Xlog:gc+heap=info:file=owned-gc.log HumongousAllocationCheck
java -XX:+UseConcMarkSweepGC -version
java -Xmx32m -XX:ActiveProcessorCount=1 -XX:+PrintCommandLineFlags -version
java -Xmx32m -XX:ActiveProcessorCount=2 -XX:+PrintCommandLineFlags -version
```

The live array remains usable and prints `live array: 42`; the configured G1 log reports `Humongous regions: 3->3`. This demonstrates that the universal Eden claim fails on this configured runtime, not a universal allocation threshold or production performance result. The CMS flag exits **1** with an unrecognised-option diagnostic as expected. The one/two active-CPU launches select Serial/G1 respectively on this host; they observe ergonomics, not collector speed.

All ten commands, including compilation and the runtime-version query, use a 20-second timeout; their captured stdout/stderr was checked to remain below 64 KiB per command. Application checks use at most a 32 MiB configured heap; no host stress, shared-service changes, dependency download or later-JDK execution was performed.

## Canonical change and verification

- Content-only commit **`a27b56fda5b8acaf5a73c3123aecc7d1aee89453`** changes only `content/java-spring/01-jvm-gc.md`.
- The lesson reports **561 lines, six unchanged Mermaid sources and 14 unchanged question objects**, with both authored rubrics and the complete misconceptions/interview/further-reading tail preserved.
- All eight original code fences and all 18 existing outline IDs remain unchanged. One new uniquely named section and its original runnable/output fences are added.
- All six migration entries for this lesson retain their original owners; none uses a literal lesson quote. The mandatory whole migration gate passes **109/109** with zero pending entries.
- Single-file validation passes, all **17** marked curriculum Java programs compile/run against Java 17 with expected output, and **265/265** real Markdown rendering tests pass across all 68 lessons.
- Diagram bodies, CSS, metadata, question identities, navigation mapping and the two-entry revision pilot are unchanged. No browser, participant, manual screen-reader or zoom session is claimed by these component tests.

The [sanitized receipt](evidence/JAVA_MEMORY_SOURCE_2026-10-24.json) binds PDF identity, every inspected page, original checks, the content commit and validation evidence. The baseline ledger listed 26 sources still unreviewed; this unit reviews S06 only and makes no claim about any other pending source. Integrated final-head CI, merge and deployment remain separate release work.
