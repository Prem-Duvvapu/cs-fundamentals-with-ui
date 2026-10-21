# Java familiar-course source ledger

Observed October 18, 2026 against the source index commit
[`fe88afa`](https://github.com/Prem-Duvvapu/Java-by-Shrayansh/blob/fe88afafdbc0aa7c7fe07c67db67b46d89d32f71/README.md).
This makes the earlier review's inventory step concrete. It does **not** import the notes or
claim that every note has been read. Keep the [earlier three-page PDF findings](../JAVA_COURSE_ALIGNMENT_REVIEW_2026-10-04.md)
and [Java learning plan](../JAVA_LEARNING_PLAN.md) alongside this record.

## What was actually checked

- The public GitHub API still reports the same index commit. It contains 40 numbered entries,
  39 linked entries and 31 distinct link strings. Entry 3 has no document link.
- Seven distinct links use Drive, 22 use Zoho, and two use OneDrive. Several course entries
  intentionally reuse one link. The two OneDrive links appear to refer to sections of one notebook;
  URL count is not proof of independent document count or identical content.
- Bounded HTTP samples fetched each distinct link once, at most 1 MiB and an 8-second request
  timeout with four workers. Thirty links returned HTTP 200; the entry-39 OneDrive link returned
  HTTP 401. This is one dated access observation, not a finding of permanent deletion.
- All 22 Zoho responses had the same 27,561-byte HTML shell/hash. A successful shell response
  does not prove the note text or images loaded. Drive viewer pages and the entry-40 OneDrive
  HTML likewise are not evidence of a factual source review.
- The execution-pipeline PDF has the earlier three-page factual review. The OOP PDF now has
  an [eleven-page text/image review](JAVA_OOP_SOURCE_REVIEW_2026-10-21.md), Java 17 primary-source
  checks and independent runnable/negative-compile examples. The shared primitive-values PDF
  now has a [ten-page review](JAVA_PRIMITIVES_SOURCE_REVIEW_2026-10-21.md) for entries 4/5.
  The references/nonprimitive-values PDF now has a [six-page review](JAVA_REFERENCES_SOURCE_REVIEW_2026-10-21.md)
  for entry 6, including wrapper and reference-copy corrections. Remaining notes still need review.
  Do not label a destination reviewed from its heading alone.

No license or reproduction permission is inferred from a public link or the repository owner.
The earlier review found no repository license; linked handwritten notes may have different rights
holders. Link/credit the material and write original explanations/examples. Do not republish source
PDFs, screenshots or transcriptions without an applicable license/permission.

## Forty-entry mapping

These are verified existing **destination files**, not verified equivalence to the source notes.
A missing focused destination is explicit. The Java category's optional **Revisit Java-by-Shrayansh**
disclosure implements two reviewed entries, OOP then JDK/runtime/JVM, with canonical lessons,
section/Practice links and shared saved state. Remaining course navigation and the actual two-lesson
learner pilot remain open; this inventory and automated UI checks do not prove familiarity.

| Entry | Familiar concept | Existing destination / gap | Source | Review state |
|---|---|---|---|---|
| 1 | OOP pillars | [OOP pillars](../content/java-spring/01d-java-oop-pillars.md) | S01 | [All 11 pages reviewed](JAVA_OOP_SOURCE_REVIEW_2026-10-21.md); learner pilot pending |
| 2 | JVM, runtime and JDK | [JVM, runtime and JDK](../content/java-spring/01b-java-execution-pipeline.md) | S02 | Prior PDF review; learner pilot pending |
| 3 | Public classes and source files | [Public classes and source files](../content/java-spring/01b-java-execution-pipeline.md) | None linked | No linked source; verify against JLS |
| 4 | Primitive values | [Primitive values](../content/java-spring/01c-java-memory-model.md) | S03 | [All 10 pages reviewed](JAVA_PRIMITIVES_SOURCE_REVIEW_2026-10-21.md); beginner conversions integrated; learner pilot pending |
| 5 | Floating-point representation | [Floating-point representation](../content/java-spring/01c-java-memory-model.md) | S03 | [All 10 pages reviewed](JAVA_PRIMITIVES_SOURCE_REVIEW_2026-10-21.md); beginner conversions integrated; learner pilot pending |
| 6 | References and non-primitive values | [References and non-primitive values](../content/java-spring/01c-java-memory-model.md) | S04 | [All 6 pages reviewed](JAVA_REFERENCES_SOURCE_REVIEW_2026-10-21.md); beginner wrapper bridge and learner pilot pending |
| 7 | Methods | [Methods](../content/java-spring/01d-java-oop-pillars.md) | S05 | Source text/images not reviewed |
| 8 | Constructors | [Constructors](../content/java-spring/01d-java-oop-pillars.md) | S05 | Source text/images not reviewed |
| 9 | Memory and garbage collection | [Memory and garbage collection](../content/java-spring/01-jvm-gc.md) | S06 | Source text/images not reviewed |
| 10 | Class forms | [Class forms](../content/java-spring/01d-java-oop-pillars.md) | S07 | Source text/images not reviewed |
| 11 | Generic classes | [Generic classes](../content/java-spring/01g-java-generics.md) | S07 | Source text/images not reviewed |
| 12 | Enums, POJOs and final classes | [Enums, POJOs and final classes](../content/java-spring/01e-java-static-final-records.md) | S08 | Source text/images not reviewed |
| 13 | Singletons and immutability | [Singletons and immutability](../content/java-spring/01e-java-static-final-records.md) | S09 | Source text/images not reviewed |
| 14 | Interfaces | [Interfaces](../content/java-spring/01d-java-oop-pillars.md) | S10 | Source text/images not reviewed |
| 15 | Default/static/private interface methods | [Default/static/private interface methods](../content/java-spring/01d-java-oop-pillars.md) | S10 | Source text/images not reviewed |
| 16 | Functional interfaces and lambdas | [Functional interfaces and lambdas](../content/java-spring/01f-java-functional-lambdas.md) | S11 | Source text/images not reviewed |
| 17 | Reflection | [Reflection](../content/java-spring/01k-java-reflection-exceptions.md) | S12 | Source text/images not reviewed |
| 18 | Annotations | [Annotations](../content/java-spring/01k-java-reflection-exceptions.md) | S13 | Source text/images not reviewed |
| 19 | Exceptions | [Exceptions](../content/java-spring/01k-java-reflection-exceptions.md) | S14 | Source text/images not reviewed |
| 20 | Operators | Foundations gap: audit operator/control-flow teaching before choosing a section | S15 | Source text/images not reviewed |
| 21 | Control flow | Foundations gap: audit operator/control-flow teaching before choosing a section | S16 | Source text/images not reviewed |
| 22 | Collection contracts | [Collection contracts](../content/java-spring/01h-java-collections-framework.md) | S17 | Source text/images not reviewed |
| 23 | Comparison and priority queues | [Comparison and priority queues](../content/java-spring/01h-java-collections-framework.md) | S17 | Source text/images not reviewed |
| 24 | Deque and list | [Deque and list](../content/java-spring/01h-java-collections-framework.md) | S17 | Source text/images not reviewed |
| 25 | HashMap | [HashMap](../content/java-spring/01j-java-hashmap-internals.md) | S18 | Source text/images not reviewed |
| 26 | LinkedHashMap and TreeMap | [LinkedHashMap and TreeMap](../content/java-spring/01h-java-collections-framework.md) | S18 | Source text/images not reviewed |
| 27 | Sets | [Sets](../content/java-spring/01h-java-collections-framework.md) | S18 | Source text/images not reviewed |
| 28 | Streams | [Streams](../content/java-spring/01i-java-streams-optional.md) | S19 | Source text/images not reviewed |
| 29 | Concurrency foundations | [Concurrency foundations](../content/java-spring/01l-java-multithreading-concurrency.md) | S20 | Source text/images not reviewed |
| 30 | Thread lifecycle and communication | [Thread lifecycle and communication](../content/java-spring/01l-java-multithreading-concurrency.md) | S21 | Source text/images not reviewed |
| 31 | Join, daemon and priorities | [Join, daemon and priorities](../content/java-spring/01l-java-multithreading-concurrency.md) | S22 | Source text/images not reviewed |
| 32 | Locks and conditions | [Locks and conditions](../content/java-spring/01l-java-multithreading-concurrency.md) | S23 | Source text/images not reviewed |
| 33 | CAS and lock-free coordination | [CAS and lock-free coordination](../content/java-spring/01l-java-multithreading-concurrency.md) | S24 | Source text/images not reviewed |
| 34 | ThreadPoolExecutor | [ThreadPoolExecutor](../content/java-spring/01l-java-multithreading-concurrency.md) | S25 | Source text/images not reviewed |
| 35 | Future, Callable and CompletableFuture | [Future, Callable and CompletableFuture](../content/java-spring/01l-java-multithreading-concurrency.md) | S26 | Source text/images not reviewed |
| 36 | Pool choices | [Pool choices](../content/java-spring/01l-java-multithreading-concurrency.md) | S27 | Source text/images not reviewed |
| 37 | Scheduling and shutdown | [Scheduling and shutdown](../content/java-spring/01l-java-multithreading-concurrency.md) | S28 | Source text/images not reviewed |
| 38 | Virtual threads and ThreadLocal | [Virtual threads and ThreadLocal](../content/java-spring/01-jvm-gc.md) | S29 | Source text/images not reviewed |
| 39 | Lombok | Build-time code-generation gap: audit dependencies before a Lombok example | S30 | HTTP 401; source review pending |
| 40 | Sequenced collections (Java 21) | [Sequenced collections (Java 21)](../content/java-spring/01h-java-collections-framework.md) | S31 | Source text/images not reviewed |

## Deduplicated access record

Open a source once, then record findings for every mapped entry it actually contains. The
original index preserves the full OneDrive share URLs; the ledger links its frozen source lines
instead of duplicating opaque share-query strings. No original note contents are stored here.

| Source | Entries | Link | Observed response | Factual-review evidence |
|---|---|---|---|---|
| S01 | 1 | [Source S01](https://drive.google.com/file/d/1eg_I2kdII2_KPtzGifky-YEvFcgaCX4H/view) | Public PDF downloaded October 21, 2,703,416 bytes | [11-page review and Java 17 checks](JAVA_OOP_SOURCE_REVIEW_2026-10-21.md) |
| S02 | 2 | [Source S02](https://drive.google.com/file/d/1orNECv5ucicgyhcC58tsQ10lTqj0Xc0K/view) | 200 viewer/HTML; document content unverified | Earlier three-page PDF review only |
| S03 | 4, 5 | [Source S03](https://drive.google.com/file/d/1vWVJ9nAIbih0vier0XD-jFaUCujWuYnU/view) | Public PDF downloaded October 21, 2,507,604 bytes | [10-page review and Java 17 checks](JAVA_PRIMITIVES_SOURCE_REVIEW_2026-10-21.md) |
| S04 | 6 | [Source S04](https://drive.google.com/file/d/1y23GVqAKPxQ72ZAP1_uOsJW2XfnBDhX5/view) | Public PDF downloaded October 21, 1,796,305 bytes | [6-page review and Java 17 checks](JAVA_REFERENCES_SOURCE_REVIEW_2026-10-21.md) |
| S05 | 7, 8 | [Source S05](https://drive.google.com/file/d/1KEMCFaA5phnL1qneiWPPsSeDGoRqFyWK/view) | 200 viewer/HTML; document content unverified | Pending |
| S06 | 9 | [Source S06](https://drive.google.com/file/d/1VLbaVl69r9FlKw2q_nI4qS6mlGx1t9Js/view) | 200 viewer/HTML; document content unverified | Pending |
| S07 | 10, 11 | [Source S07](https://drive.google.com/file/d/1eE5Pculcp0qem6tMPHDz9h-jhMclzGIt/view) | 200 viewer/HTML; document content unverified | Pending |
| S08 | 12 | [Source S08](https://notebook.zohopublic.in/public/notes/u3i1se962d56445eb4118ab4e4c0ca99e4728) | 200 HTML shell; note content unverified | Pending |
| S09 | 13 | [Source S09](https://notebook.zohopublic.in/public/notes/u3i1s340edd3a883b4ef7ac90874731c865b0) | 200 HTML shell; note content unverified | Pending |
| S10 | 14, 15 | [Source S10](https://notebook.zohopublic.in/public/notes/u3i1s033d318172e442b8b8f242767b93776c) | 200 HTML shell; note content unverified | Pending |
| S11 | 16 | [Source S11](https://notebook.zohopublic.in/public/notes/u3i1sa79b68153abe44d5aa93cc1d5b9f4dd9) | 200 HTML shell; note content unverified | Pending |
| S12 | 17 | [Source S12](https://notebook.zohopublic.in/public/notes/u3i1sae669a127ac24a07842a488207750a7c) | 200 HTML shell; note content unverified | Pending |
| S13 | 18 | [Source S13](https://notebook.zohopublic.in/public/notes/u3i1sd9ea4e81ceef491cb4bd1ee221daa89f) | 200 HTML shell; note content unverified | Pending |
| S14 | 19 | [Source S14](https://notebook.zohopublic.in/public/notes/u3i1se54e2f3438a84f42bec26cf3336a5226) | 200 HTML shell; note content unverified | Pending |
| S15 | 20 | [Source S15](https://notebook.zohopublic.in/public/notes/u3i1s38886070c7a74e9db5b0ec3b1697f7f8) | 200 HTML shell; note content unverified | Pending |
| S16 | 21 | [Source S16](https://notebook.zohopublic.in/public/notes/u3i1sa26424f5a9614b35897900c90fb2c402) | 200 HTML shell; note content unverified | Pending |
| S17 | 22, 23, 24 | [Source S17](https://notebook.zohopublic.in/public/notes/u3i1sf9bea7a6f25c4a60941d06a07ac8d76c) | 200 HTML shell; note content unverified | Pending |
| S18 | 25, 26, 27 | [Source S18](https://notebook.zohopublic.in/public/notes/74tdo79dc003d7a2846b9afdfa3f5df7f5d32) | 200 HTML shell; note content unverified | Pending |
| S19 | 28 | [Source S19](https://notebook.zohopublic.in/public/notes/74tdod05928d081b5484fbfd5937d4129fa64) | 200 HTML shell; note content unverified | Pending |
| S20 | 29 | [Source S20](https://notebook.zohopublic.in/public/notes/74tdo52a4834de5554f09bc9ec3f11572cd11) | 200 HTML shell; note content unverified | Pending |
| S21 | 30 | [Source S21](https://notebook.zohopublic.in/public/notes/74tdo47dcfcf05e644cf192c411a6d78ec1dc) | 200 HTML shell; note content unverified | Pending |
| S22 | 31 | [Source S22](https://notebook.zohopublic.in/public/notes/74tdob1b1f9bf584f44228974656f4d93519d) | 200 HTML shell; note content unverified | Pending |
| S23 | 32 | [Source S23](https://notebook.zohopublic.in/public/notes/74tdo36e9543c1b8941ea9099d9f04b190404) | 200 HTML shell; note content unverified | Pending |
| S24 | 33 | [Source S24](https://notebook.zohopublic.in/public/notes/74tdof6d5236d9b234442a814277c786bc6a2) | 200 HTML shell; note content unverified | Pending |
| S25 | 34 | [Source S25](https://notebook.zohopublic.in/public/notes/74tdo0e297bb7d6dd4d45a837d13f60fedc3f) | 200 HTML shell; note content unverified | Pending |
| S26 | 35 | [Source S26](https://notebook.zohopublic.in/public/notes/74tdo4a0bd722efc748d0909fbb498fa21b18) | 200 HTML shell; note content unverified | Pending |
| S27 | 36 | [Source S27](https://notebook.zohopublic.in/public/notes/74tdo77c24fe4d4df41c582e9041230f2cd6e) | 200 HTML shell; note content unverified | Pending |
| S28 | 37 | [Source S28](https://notebook.zohopublic.in/public/notes/74tdo985cdf57a9bc40bdb37a4468a09b9554) | 200 HTML shell; note content unverified | Pending |
| S29 | 38 | [Source S29](https://notebook.zohopublic.in/public/notes/74tdo3074d38916474ae096fe57ad9f2ff54b) | 200 HTML shell; note content unverified | Pending |
| S30 | 39 | [Original index entry 39](https://github.com/Prem-Duvvapu/Java-by-Shrayansh/blob/fe88afafdbc0aa7c7fe07c67db67b46d89d32f71/README.md#L79) | 401; access not established | Pending |
| S31 | 40 | [Original index entry 40](https://github.com/Prem-Duvvapu/Java-by-Shrayansh/blob/fe88afafdbc0aa7c7fe07c67db67b46d89d32f71/README.md#L81) | 200 viewer/HTML; document content unverified | Pending |

## Next review unit and acceptance

1. Use the completed OOP and execution source reviews for the two-lesson pilot. For each next
   unreviewed source, inspect every page/image and record identity and actual access limits.
   Never count an HTML shell or a familiar heading as a factual review.
2. Compare each proposed clarification with Java 17 JLS/JVMS/API documentation and an independently
   written runnable example. Keep Java 21 virtual-thread/sequenced-collection cases version-labelled.
3. Pilot execution and OOP as two canonical lessons: recognizable concepts, plain mental model,
   runnable program/output, misconception and interview explanation. Use source links for credit;
   preserve original wording/examples, lesson IDs and saved practice data.
4. Run exact destination/section-link and content/example checks, then conduct the real recognition
   task in [the learner protocol](../LEARNER_USABILITY_STUDY.md). Record the learner's confusion,
   revise and retest before expanding the whole course-order view.
5. Reuse one review for a genuinely shared document, but check that it contains both indexed topics.
   Treat unresolved links, unreviewed images, new feature prerequisites and missing foundations as
   separate gaps. Recheck the source commit before the next wave and retain dated review evidence.

This ledger closes source **inventory**, not CLOSE-02. The unreviewed notes, foundations/build-time
coverage, broader familiar navigation, rights decisions and actual two-lesson pilot remain open.
