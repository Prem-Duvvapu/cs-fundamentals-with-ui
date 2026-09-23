# Java learning and reader improvement plan

Audience: someone who can use variables, conditions, loops and simple functions.
Java, OOP, JVM, web, SQL and framework knowledge must be taught or linked as a prerequisite.
The goal is a clear path from this starting point to practical backend work and interview depth.

## Baseline and scope

The September 23 audit found strong advanced coverage across 23 Java/Spring lessons,
but a steep opening, fragmented practical foundations, incomplete example context and
several accuracy defects. Structural validation is necessary but does not prove clarity.
The implementation baseline is `b001f1a`: 68 total topics, React 19, Spring Boot 4.1,
and existing bookmarks, completion and progress pages. Preserve those features.

Compare the reader with sibling `hld-with-ui`, adopting its explicit outcomes and useful
practice flows while retaining this project's content-first reading and cross-topic search.
HLD repairs are a separate repository stream, with its own tests and merge process.

## Delivery packages

Each package should be independently reviewable, tested, committed and merged. Check the
latest main before starting another package. Do not mark planned work as delivered.

| Package | Concrete result | Status |
|---|---|---|
| 1. Accuracy and authoring baseline | Fix nonexistent exception, text-block syntax, constructor version claims, dispatch overstatement and bean-mock guidance; define basic-programming audience | Implemented; verification and merge pending |
| 2. Reader navigation | Mobile TOC genuinely closes; subsection links match rendered headings; Study/Simulation selection survives refresh and history; descriptive page titles | Planned |
| 3. Reference OOP lesson | Prerequisites and outcomes, bank-account example, output trace, vocabulary, practice, version-labelled internals | Planned |
| 4. Executable examples | Compile/run examples on declared baseline; distinguish runnable programs, excerpts and deliberate failures | Planned |
| 5. Curriculum metadata | Explicit prerequisite order and outcomes, consistent discovery/previous/next links; safe registration of new topics with coverage checks | Planned |
| 6. Java foundations | Setup/run/debug, types and operators, conditions/loops/methods, arrays, strings, numbers and wrappers | Planned |
| 7. Practical Java | Exceptions and resource handling, files/I/O, date/time, Maven, unit tests, debugging and JDBC prerequisites | Planned |
| 8. Collections and functional Java | Gradual generics, collection selection, equality/hash contracts, lambdas, streams and Optional with exercises | Planned |
| 9. First Spring application | HTTP/JSON prerequisites; reproducible Task Tracker application from first endpoint to validated CRUD | Planned |
| 10. Persistence and transactions | Practical repositories and queries, mappings, pagination, transaction boundaries/propagation and failure scenarios | Planned |
| 11. Production Spring | Security, caching/async, testing and operations connected to the same application | Planned |
| 12. Advanced Java | Memory-model terminology, concurrency, GC, virtual-thread version differences, reflection and performance trade-offs | Planned |
| 13. Practice and discovery | Draft-preserving recall, useful answer explanations, prerequisite guidance and existing progress integration | Planned |
| 14. Final verification | Browser/a11y checks, content and example gates, documentation sync and remaining coverage review | Planned |

## Intended learning sequence

1. Run a small Java program; understand source, compilation and errors at a high level.
2. Use types, operators, conditions, loops, methods, arrays and strings.
3. Create objects; understand references, constructors, encapsulation and interfaces.
4. Handle failures and resources; use equality, collections and basic generics.
5. Read/write data; use date/time; build and test a small application with Maven.
6. Use lambdas, streams and Optional after their imperative equivalents are understood.
7. Learn HTTP/JSON and SQL/JDBC before building Spring endpoints and persistence.
8. Build the Task Tracker through dependency injection, validation, repositories and transactions.
9. Add tests, security and operational behavior, then study concurrency/JVM internals in depth.

Advanced material remains available without making it a compulsory step between two basic lessons.
New lesson boundaries must be chosen by learning dependency, not by achieving a topic count.
Before registering a lesson, map its outcome to the current coverage manifest and avoid duplication.

## Lesson acceptance criteria

- Names prerequisites and observable outcomes in plain language.
- Introduces a concrete problem before unfamiliar terminology; defines new syntax on first use.
- Includes a small worked example and explains its output or state changes step by step.
- Labels runnable code versus excerpts, expected failures and version-specific features.
- Includes predict/change/debug practice with an explained answer.
- Preserves three tiers, useful diagrams, misconception corrections and interview depth.
- Passes the authoring contract without adding filler to meet a line count.

## Reader acceptance criteria

- One page H1; useful page title; keyboard-visible focus and working deep links/history.
- TOC includes meaningful subsections and closed content is neither visible nor focusable.
- Reading, practice and simulations are understandable on 320, 768 and 1440 pixel widths
  in both themes, with no page-level overflow and readable diagrams/code/tables.
- Existing progress and bookmark data remains usable; unfinished answers survive normal navigation.
- Browser tests cover interactions that DOM-only tests cannot establish; automated accessibility
  checks are supplemented by keyboard and visual inspection.

## Separate HLD follow-up

Recheck against matching frontend/backend versions before changing request-flow limits.
Preserve calculator inputs and practice drafts across tab navigation; allow reference-answer
access; reduce mobile chrome; remove duplicate H1s and provide a useful reading TOC.
Coordinate with any concurrent work in that repository and do not overwrite it.

## Verification and merge record

For each package record its PR, tests actually run, limitations and final merge commit here.
Use the repository's frontend/backend/content checks as appropriate; changed diagram sources
or rendering inputs require regenerated assets and decode verification. Review the diff before
committing, wait for required CI, then merge. No package is complete merely because it is written.

Package 1 verification so far: all 68 lessons and 83 manifest entries pass; 53 backend
tests pass; the published JSON text block compiles with `javac --release 17` and produces
the documented JSON. Frontend/build and CI verification are still pending.
