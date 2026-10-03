# Interview feedback extension — October 3, 2026

The requested 37 core accuracy reviews were completed first and merged in
[PR #45](https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui/pull/45). Main Verify
run **37108096621** passes frontend, backend, labs and container jobs. This next
package adds twelve answer-specific checklists to the recounted baseline of 44, for **56 total**. The earlier status documents carried forward an outdated count of 42; the new whole-corpus checks detect that mismatch.
It preserves all model answers, question prompts, stable IDs and Mermaid sources.

## What the learner gets

Reveal the model answer, then expand **Answer checklist and follow-up** in either
topic or category practice. Each checklist gives an opening statement, causal
mechanism, concrete example, limit, common mistake and transfer question. The same
Markdown source serves both views. There is no automatic interview-readiness score.

| Lesson | Question IDs | What the additional feedback tests |
|---|---|---|
| [Streams and Optional](content/java-spring/01i-java-streams-optional.md) | `java-streams-optional-q7`, `java-streams-optional-q9` | Eager argument evaluation versus lazy fallback; elided callbacks and delivery guarantees. |
| [Spring Batch](content/java-spring/05-spring-batch-lifecycle.md) | `spring-batch-lifecycle-q4`, `spring-batch-lifecycle-q12` | Persistent restart evidence; uncertain remote outcomes and stable operation identities. |
| [Synchronization](content/os/04-synchronization.md) | `synchronization-q3`, `synchronization-q12` | Predicate rechecking; priority inversion and external-I/O limits. |
| [Physical media](content/networking/00b-physical-layer-media.md) | `physical-layer-media-q5`, `physical-layer-media-q12` | Formula assumptions; power SNR conversion and theoretical capacity versus payload throughput. |
| [Routing](content/networking/04-routing-algorithms.md) | `routing-algorithms-q2`, `routing-algorithms-q13` | Longest prefix match; mixed forwarding-state versions during convergence. |
| [Functional dependencies and keys](content/dbms/04-functional-dependencies-keys.md) | `functional-dependencies-keys-q5`, `functional-dependencies-keys-q12` | Closure and minimality; database arbitration of concurrent customer creation. |

## Source and scope checks

- [Java 17 Optional](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Optional.html) and [Stream](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/stream/Stream.html) define fallback suppliers and omitted intermediate callbacks.
- [Spring Batch repository configuration](https://docs.spring.io/spring-batch/reference/job/configuring-repository.html) and [the Batch 6 migration guide](https://github.com/spring-projects/spring-batch/wiki/Spring-Batch-6.0-Migration-Guide) distinguish persistent execution state from resourceless defaults. The remote-action rubric follows the reviewed lesson's explicit idempotency/outbox assumptions; it does not promise receiver deduplication from an outbox alone.
- [Java 17 Object.wait](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Object.html#wait()) and [Linux RT mutexes](https://docs.kernel.org/locking/rt-mutex.html) support predicate rechecking and priority inheritance.
- [Shannon's original paper](https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf) supports the Gaussian-channel model already reviewed in the lesson; arithmetic and units are rechecked, rather than treating capacity as measured throughput.
- [RFC 1812](https://www.rfc-editor.org/rfc/rfc1812) and [RFC 5715](https://www.rfc-editor.org/rfc/rfc5715) support longest-match forwarding and inconsistent forwarding state during convergence.
- [Database System Concepts, relational design chapter](https://db-book.com/slides-dir/PDF-dir/ch7.pdf) and [PostgreSQL 18 constraints](https://www.postgresql.org/docs/18/ddl-constraints.html) support closure/minimality and database uniqueness. The concrete closure uses the previously reviewed dependency set; SQL behavior is kept separate from relational key theory.

## Verification

The package checks the entire curriculum renders and parses; all authored rubrics
separate from their standalone model answers. Backend tests fetch both question
pages and confirm all twelve new IDs retain all six labels without trailing-section
or following-question leakage. Content, real Mermaid syntax, migration evidence
and prebuilt diagram gates are rerun. No diagram assets require regeneration
because every diagram source is preserved. Final local results:

- **68/68 lessons**, **83/83 coverage entries**, and **295 real Mermaid diagrams** pass structural validation.
- **211 corpus-rendering/parser tests** and **12 InterviewDeck tests** pass; the new parser assertion was rerun after correcting the inherited count.
- **60/60 backend tests** pass, including canonical rubric preservation across both question pages.
- **109/109 migration entries** and **295 diagram manifest entries/590 theme assets** pass.
- Production frontend build and `git diff --check` pass.
- All six edited lessons retain their complete prior text when the twelve inserted rubrics are removed, confirming unchanged prompts, model answers and diagrams.
- Capacity arithmetic and all illustrated closure/minimality checks pass.

The earlier count of 42 is corrected to a verified parent-commit count of 44;
RCA-2026-10-03-03 records the reporting failure and prevention.

## Follow-up status

- The separate freshness review is now complete; see [the twelve-lesson ledger](AI_ML_DEVOPS_FRESHNESS_REVIEW_2026-10-03.md).
- Broader worked exercises, diagnosis tasks and authored feedback; **897 of 953**
  questions still use the existing generic comparison prompts.
- Actual beginner/backend-engineer sessions under [the learner study protocol](LEARNER_USABILITY_STUDY.md), then revisions and retesting based on observations.

The corpus at this feedback package was **68 lessons, 33,232 lines, 295 diagrams, 953 questions and 56 rubrics**. The subsequent freshness package brings lines to **33,450** without adding questions or rubrics.
Structural checks and factual source review do not establish learner comprehension.

Implementation and local verification commit: **`f01f46a`** on `feat/2026-10-03-interview-feedback`.
