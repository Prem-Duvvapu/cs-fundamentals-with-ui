# Java familiar-course primitive-values source review — October 21, 2026

Source S03, shared by familiar-course entries **4 and 5**, has now received a
complete ten-page text/image review. Its progression from values to conversions
and floating-point bits is useful, but several rules and one reconstructed number
need correction. This review records original explanations and independently run
Java 17 checks. It does not import the notes or complete the course-alignment pilot.

## Access, identity and comparison scope

| Evidence | Observed value |
|---|---|
| Index and mapping | S03 in the [source ledger](JAVA_COURSE_SOURCE_LEDGER.md); entries 4/5 share one document |
| Public document | [Primitive variables PDF](https://drive.google.com/file/d/1vWVJ9nAIbih0vier0XD-jFaUCujWuYnU/view) |
| Download filename | `#4_Primitive_Variables.pdf`, from the response's Content-Disposition |
| Bounded access | Public Drive download, ordinary redirects, 30-second timeout and 8 MiB maximum; completed in approximately 3 seconds |
| Actual response | HTTP 303 followed by HTTP 200; 2,507,604 PDF bytes; no account, credentials or access bypass |
| SHA-256 | `e0864c6f07918d8a79fa07a2ecc8886cef11c5437c4e0f71326280bb7e53248e` |
| Document bounds | 10 pages, numbered below by one-based PDF order; metadata title absent |
| Inspection | Page-separated extraction and 120-DPI rendering with the already available Apache PDFBox 3.0.8; all ten handwritten pages and diagrams visually inspected |
| Reader limitation | The web reader could not open the Drive viewer; inspection used the successfully downloaded PDF |
| Canonical comparison | [Java memory-model lesson](../content/java-spring/01c-java-memory-model.md); Git content blob `0419a22dd22d644d52108a3f8c5f280dc8838cd0` at baseline `5c7d746bbd5b6083cf4e70a734f030315f090caf` |
| Execution | OpenJDK `17.0.20.1`, build `17.0.20.1+1-1-24.04-Ubuntu`; `javac --release 17` |

The PDF and inspection images/text remain outside the repository. No page images,
transcript or source programs are republished here. Public access is not a license;
retain the source link and obtain applicable rights before reproducing its material.
See the [alignment review](../JAVA_COURSE_ALIGNMENT_REVIEW_2026-10-04.md) and
[Java learning plan](../JAVA_LEARNING_PLAN.md) for the wider scope.

## Findings and exact canonical destinations

Section names below are existing headings in the canonical memory-model lesson.
Some source topics need a future beginner teaching expansion; matching a heading
does not establish equivalent detail or learner recognition.

| PDF page | Subject inspected | Correction or qualification | Canonical section |
|---|---|---|---|
| 1 | Variables, declarations and typing | Static typing does not require spelling every local type: Java 17 permits `var` inference while preserving a fixed inferred type. [JLS §14.4.1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-14.html#jls-14.4.1) | `Primitives, references, and variables` |
| 1 | Identifier and naming rules | Distinguish naming style from legality. `_` alone is a keyword on this baseline; `_count` is different. Boolean literals are lowercase `true`/`false`. [JLS §§3.8–3.10.3](https://docs.oracle.com/javase/specs/jls/se17/html/jls-3.html#jls-3.8) | `Primitives, references, and variables` |
| 2 | Type tree, character and byte ranges | Eight primitive types is correct. `char` is a UTF-16 code unit, not merely an ASCII value; one supplementary code point needs two code units. The byte range is correct. [JLS §4.2](https://docs.oracle.com/javase/specs/jls/se17/html/jls-4.html#jls-4.2) | `Primitives, references, and variables` |
| 3 | Two's complement and short | Preserve the complement-plus-one example, but avoid sign-magnitude reasoning: an 8-bit signed value's most significant place has weight −128, not a separate sign attached to seven magnitude bits. [JLS §4.2.1](https://docs.oracle.com/javase/specs/jls/se17/html/jls-4.html#jls-4.2.1) | `Primitives, references, and variables` |
| 4 | Integer widths/ranges, long suffix and boolean | The integer ranges are correct. Boolean fields/array components default to **false**, not true; locals require definite assignment. Java does not promise one-bit boolean storage. [JLS §4.12.5](https://docs.oracle.com/javase/specs/jls/se17/html/jls-4.html#jls-4.12.5), [JVMS §2.3.4](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html#jvms-2.3.4) | `Primitives, references, and variables`; `Method execution and object layout` |
| 5 | Widening and narrowing | These are specified conversions, not simply increasing/decreasing byte counts. Widening can lose precision; narrowing integral values discards high bits. The illustrated casts 128→−128 and 148→−108 are correct. Assignment also permits certain representable constant expressions without a cast. [JLS §§5.1.2–5.2](https://docs.oracle.com/javase/specs/jls/se17/html/jls-5.html#jls-5.1.2) | `Primitives, references, and variables` |
| 6 | Expression promotion and variable kinds | Arithmetic promotion follows operand types, not whether a computed value overflows. Even two small byte variables add as int. Int addition can wrap before its result is assigned to long. [JLS §5.6](https://docs.oracle.com/javase/specs/jls/se17/html/jls-5.html#jls-5.6), [§15.18.2](https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.18.2) | `Primitives, references, and variables`; `Stack frames, heap objects, and lifetime` |
| 7 | Static state, parameters and binary32 fields | Qualify shared static state by runtime class identity, including its defining loader. Parameters receive argument values. The 1/8/23 binary32 field split is correct. [JVMS §5.3](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-5.html#jvms-5.3), [JLS §4.12.5](https://docs.oracle.com/javase/specs/jls/se17/html/jls-4.html#jls-4.12.5) | `Java is pass-by-value`; `Stack frames, heap objects, and lifetime`; `Worked example: encoding 13.25 as IEEE-754 binary32` |
| 8 | Normalization, exponent bias and reconstruction | Retain the exact 4.125 example: its biased exponent is 129 and its complete binary32 word is `0x40840000`. The implicit-leading-one formula is for normal values; subnormals/zero/special exponent patterns need separate treatment. [Float API](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Float.html#floatToIntBits(float)) | `Worked example: encoding 13.25 as IEEE-754 binary32` |
| 9 | Repeating binary expansion and assembly | The repeating-fraction idea is correct. Use the complete stored fraction and rounding, rather than a short handwritten partial sum, to establish the actual float value. | `Worked example: encoding 13.25 as IEEE-754 binary32` |
| 10 | Reconstructed 0.7f and decimal recommendation | Actual `0.7f` is `0.699999988079071044921875`, not approximately `0.699707031`. Decimal arithmetic is a domain choice; constructing BigDecimal from an already rounded binary input does not restore the original decimal intent. [BigDecimal API](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/math/BigDecimal.html) | `Worked example: encoding 13.25 as IEEE-754 binary32`; `Failure modes and diagnostic reasoning` |

The highest-impact corrections are the boolean default, type-driven promotion,
widening precision and the reconstructed floating-point value. The naming-style
distinction is editorial; it must not displace the practical number examples.

## Independently executed Java 17 program

Save this original program as `PrimitiveChecks.java`. It needs no external libraries
or preview features. The example covers the consequential distinctions without
copying the source's class sketches.

```java
import java.math.BigDecimal;
import java.util.Locale;

public class PrimitiveChecks {
    private boolean enabled;
    private static boolean shared;

    public static void main(String[] args) {
        System.out.println("defaults=" + new PrimitiveChecks().enabled + "," + shared);
        System.out.println("omega=" + (int) '\u03a9');
        String symbol = "\uD83D\uDE42";
        System.out.println("utf16=" + symbol.length() + ",codePoints=" + symbol.codePointCount(0, symbol.length()));
        byte left = 1, right = 2;
        var sum = left + right;
        byte constant = 1 + 2;
        System.out.println("sum=" + sum + ",constant=" + constant);
        System.out.println("casts=" + (byte) 128 + "," + (byte) 148);
        System.out.println("minusThree=" + Integer.toBinaryString(((byte) -3) & 0xff));
        int largest = Integer.MAX_VALUE;
        long overflowThenWiden = largest + 1;
        long widenThenAdd = (long) largest + 1;
        System.out.println("add=" + overflowThenWiden + "," + widenThenAdd);
        int exact = 16_777_217;
        float rounded = exact;
        System.out.println("widenedThenBack=" + (int) rounded);
        for (float value : new float[] {4.125f, 0.7f}) {
            int bits = Float.floatToIntBits(value);
            System.out.printf(Locale.ROOT, "bits=%08x,exponent=%d%n", bits, (bits >>> 23) & 255);
            System.out.println("exactDecimal=" + new BigDecimal((double) value).toPlainString());
        }
        System.out.println("decimalInput=" + new BigDecimal("0.7").toPlainString());
    }
}
```

Commands actually executed:

```sh
javac --release 17 -Xlint:all PrimitiveChecks.java
java PrimitiveChecks
```

Both exited 0; compilation produced no warnings. Exact output:

```text
defaults=false,false
omega=937
utf16=2,codePoints=1
sum=3,constant=3
casts=-128,-108
minusThree=11111101
add=-2147483648,2147483648
widenedThenBack=16777216
bits=40840000,exponent=129
exactDecimal=4.125
bits=3f333333,exponent=126
exactDecimal=0.699999988079071044921875
decimalInput=0.7
```

The non-ASCII character and surrogate pair distinguish code units from code points.
The arithmetic results show that widening the destination does not retroactively
widen an earlier addition. The integer-to-float conversion loses one unit despite
being a widening conversion. The BigDecimal constructor is used deliberately to
expose the **exact binary value**: widening a finite float to double is exact, so
it does not introduce another rounding step. The final line starts with decimal
text instead and preserves that decimal input. This is representation evidence,
not a measurement of object sizes, allocation locations, GC or performance.

## Expected compilation failures

Save each block separately under its shown filename. For each file, run
`javac --release 17 -XDrawDiagnostics Filename.java`. All five commands were
executed and returned exit **1**, with the diagnostic keys stated below.
Diagnostic wording can vary by compiler; these are the observed Java 17 results.

**`BadBoolean.java` — uppercase text is not the lowercase boolean literal.**

```java
class BadBoolean { boolean enabled = True; }
```

Observed: `compiler.err.cant.resolve.location` for variable `True`.

**`BadLocal.java` — fields' default initialization does not initialize a local.**

```java
class BadLocal { boolean read() { boolean value; return value; } }
```

Observed: `compiler.err.var.might.not.have.been.initialized`.

**`BadByteSum.java` — arithmetic type is int even when the runtime sum would fit.**

```java
class BadByteSum { byte read(byte a, byte b) { return a + b; } }
```

Observed: `compiler.err.prob.found.req` with `possible.loss.of.precision: int, byte`.
Contrast the successful `byte constant = 1 + 2` in the runnable program.

**`BadUnderscore.java` — a lone underscore is not a Java 17 identifier.**

```java
class BadUnderscore { int _ = 1; }
```

Observed: `compiler.err.underscore.as.identifier`.

**`BadInferred.java` — inferred types do not become dynamic types.**

```java
class BadInferred { void change() { var count = 1; count = "one"; } }
```

Observed: `compiler.err.prob.found.req` with `inconvertible.types: java.lang.String, int`.

## Canonical lesson findings and remaining acceptance

No confirmed factual error was found in the canonical lesson's explanations
overlapping this source review. It already states UTF-16 rather than ASCII,
unspecified boolean storage width, byte arithmetic promotion, integer wraparound,
local definite assignment, default-initialized fields/arrays, exact binary32
encoding and BigDecimal's binary-versus-decimal constructor distinction.

There are coverage gaps for a subsequent scoped teaching unit: the existing
primitive table has no `short` row, and it does not fully teach naming legality,
`var`, the constant-assignment exception or widening precision loss. These are
missing beginner detail, not proof that its existing statements are false. Prefer
a compact original expansion in `Primitives, references, and variables`; retain
the existing 13.25 worked example rather than duplicating the notes' diagrams.

This closes actual S03 inspection for entries 4/5, not their full instructional
integration. The integrating owner should link this record from S03's ledger row.
Other source documents, course-order navigation and the [real learner pilot](../LEARNER_USABILITY_STUDY.md)
remain separate. Compilation proves these language examples behave as reported;
it does not prove novice comprehension, interview recall, permission to reproduce
the notes or completion of CLOSE-02. No canonical lesson, source ledger, question,
rubric, diagram, code or global project document was changed by this review unit.


### Subsequent canonical integration

Separate content-only commit 22fd9bd fills the identified beginner gaps with a short row,
fixed local var/naming rules, constant assignment versus promotion and a compact conversion/
overflow excerpt. The new excerpt was compiled on Java 17 and its printed values verified.
The original 13.25 section, headings, diagram bodies and interview/rubric tail remain unchanged.
This later integration does not change the source identity or the earlier review's evidence scope.
