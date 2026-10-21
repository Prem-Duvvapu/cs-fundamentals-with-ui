# Editorial and compatibility maintenance

Process prepared **October 21, 2026**. Repository inventory inspected at
`5c7d746bbd5b6083cf4e70a734f030315f090caf`. This document supplies the missing
maintenance artifact for **CLOSE-05** in the [practical learning plan](../BACKEND_AI_PRACTICAL_LEARNING_PLAN_2026-10-16.md).
It defines work to repeat; it does not establish that future reviews have happened,
that an editor is assigned, or that the whole project is complete.

The learning material has one canonical home under `content/`. Keep the six paths
and practical examples accurate together; reuse the sibling DSA/LLD/HLD lessons
through the [coverage map](../BACKEND_ENGINEERING_COVERAGE_2026-10-17.md).
Do not create another lesson catalog, question bank or copy of a sibling lesson here.

## Review cycle and responsibility

At each release, the release integrator assigns a named editor for the changed
subjects and a reviewer for consequential claims. A technically informed reviewer
can check implementation; a real learner must provide evidence of comprehension.
An AI-generated critique cannot be recorded as a participant session.

| Trigger / cadence | Work required | Completion evidence |
|---|---|---|
| Before each affected release | Review changed mechanisms, prerequisites, examples, answers, rubrics, links and supported versions; assess the neighboring explanations affected by the correction | Scoped review record, executed checks and exact final commit |
| Reported factual error, privacy problem, unsafe example, primary advisory affecting used functionality, or failing compatibility check | Triage before the next affected publication; correct or clearly withdraw the misleading instruction while a repair is prepared | Reproduction/source section, impact, correction and regression evidence; do not wait for the calendar |
| Dependency, engine, model, protocol, schema or infrastructure upgrade | Recheck matching release documentation and runtime behavior before describing the combination as compatible | Declared/resolved/runtime inventory and the affected real integration results |
| Weekly | Triage dependency automation and link-monitor results, including failures and runs that never executed | Dated disposition, responsible person and next action; an unopened PR or missing scheduled run is not a review |
| Monthly for rapidly changing AI/DevOps claims | Revisit provider fields, model/runtime constraints, protocol revisions, engine defaults, deployment examples and maintenance-status claims | Primary links checked on that date, exact versions, corrected scope or an explicit unresolved item |
| At least quarterly across all six paths and example guides | Walk the checklist below; prioritize untested code, security/concurrency boundaries and old version-specific claims | Category-by-category scope, findings, fixes and outstanding owners, not a blanket “still current” label |
| Changed UI, teaching order or difficult explanation | Recheck rendering/accessibility and decide whether the actual learner tasks must be repeated | Automated results plus separately identified manual/participant evidence where performed |

The initial monthly revisit is due **November 21, 2026** and the quarterly sweep by
**January 21, 2027**, measured from this inventory. The integrating owner must assign
the work and record execution; these dates are not a newly installed scheduler.
Releases and concrete failures can require earlier review.

## What to revisit in each path

These are editorial responsibilities, not a new curriculum audit or claims that
all listed technologies have been executed in this repository.

| Path | Prioritize these changing or consequential claims | Existing record to extend |
|---|---|---|
| Operating systems | Separate textbook algorithms from the selected Linux kernel, filesystem and device behavior; verify diagnostic commands and resource units on the actual host | [Core accuracy review](../CORE_ACCURACY_COMPLETION_2026-10-03.md), [bounded OS labs](../examples/labs/README.md) |
| Networking | Protocol/RFC revisions, HTTP/TLS/QUIC distinctions, timeout boundaries, kernel/socket behavior, DNS versus local resolution, and security assumptions | [Core accuracy review](../CORE_ACCURACY_COMPLETION_2026-10-03.md), [network labs](../examples/labs/README.md) |
| DBMS | Name engine/version/configuration for isolation, locking, query plans, durability, recovery and distributed claims; rerun the particular SQL and concurrent schedule | [DBMS sources and observed limits](../CONTENT_ACCURACY_REVIEW_2026-10-01.md), [persistence lab](../examples/backend-persistence/README.md) |
| Java / Spring | Java language guarantee versus JVM implementation; baseline versus newer-JDK features; framework/proxy/security/JPA behavior and the actual managed dependency graph | [Core accuracy review](../CORE_ACCURACY_COMPLETION_2026-10-03.md), [Java plan](../JAVA_LEARNING_PLAN.md), [course-source ledger](JAVA_COURSE_SOURCE_LEDGER.md) |
| AI / ML | Task correctness versus schema/transport success; retrieval relevance versus ANN overlap; evaluation denominators/leakage; model/provider limits, privacy, protocol authority and scenario cost assumptions | [AI/DevOps source review](../AI_ML_DEVOPS_FRESHNESS_REVIEW_2026-10-03.md), [practical evidence ledger](BACKEND_AI_IMPLEMENTATION_RESULTS_2026-10-16.md), [frozen comparison guide](../examples/ai-backend/QUALITY_COMPARISON.md) |
| DevOps | Runtime/cluster defaults, feature gates, manifests, image and binary provenance, rollout/resource symptoms, cloud service scope, telemetry units and infrastructure state/secrets | [AI/DevOps source review](../AI_ML_DEVOPS_FRESHNESS_REVIEW_2026-10-03.md), [operations provenance](../examples/backend-operations/PROVENANCE.json), [operations lab](../examples/backend-operations/README.md) |

For every practical example, read its own README and verifier before running it.
Distinguish a pure calculation, simulated dependency, actual loopback HTTP exchange,
real database/broker/container, installed-model inference, and production behavior.
For example, Java virtual-thread evidence belongs to the selected JDK lab; it does
not change the platform's Java 17 baseline. An OCR guard is not actual OCR execution.
A warm-up probe, readiness result, fake payment or single-node cluster proves only
its stated boundary. Preserve owned-resource cleanup and execution budgets.

## Current compatibility inventory

The following is a **checked-in declaration and lockfile snapshot**, not an online
release survey or a new runtime test. Versions were read from the linked files.
“Declared” means configuration requests it; “resolved” means a lockfile or an actual
dependency-resolution receipt identifies it; “tested” requires a command/job that
executed that exact combination and reports failures and skips.

| Component | Declared / locked at this snapshot | Resolution and execution boundary |
|---|---|---|
| Frontend React and routing | [package.json](../frontend/package.json): React `^19.3.0`, React Router DOM `^7.18.3`; [lockfile](../frontend/package-lock.json): `19.3.0` / `7.18.3` | Lockfile v3 records exact package versions; it does not prove installation, browser behavior or future semver resolution |
| Frontend build and tests | Vite `^8.3.0` → locked `8.3.0`; Vitest `^5.0.0` → locked `5.0.0` | Lock metadata requires Vite Node `^20.19.0 \|\| >=22.12.0` and Vitest `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0`; record the actual Node patch in the execution receipt |
| Diagrams and browser tooling | Mermaid `^11.17.2` → `11.17.2`; Playwright `^1.63.0` → `1.63.0` | A changed renderer/font/theme input requires matching regenerated assets and actual decode; a Playwright package version alone does not identify an installed browser binary |
| Analytics | `@vercel/analytics` declared and locked `2.0.1` | Dependency presence does not prove deployment analytics activation or privacy behavior; preserve redaction tests |
| Platform backend | [POM](../backend/pom.xml): Spring Boot parent `4.1.1`, `java.version=17` | Parent declaration is not a lock of every transitive artifact or evidence that the current JAR was built/tested |
| AI example | [POM](../examples/ai-backend/pom.xml): Boot `4.1.1`, Spring AI BOM `2.0.1`, MCP SDK `2.0.0`, PDFBox `3.0.8`, Java 17 | Record effective POM/dependency tree and actual JVM/service tests after changes; this inventory did not resolve Maven or call a model |
| Task Tracker and testing lab | [Tracker POM](../examples/java-spring/task-tracker/pom.xml) and [testing POM](../examples/backend-testing/pom.xml): Boot `4.1.1`, OpenTelemetry BOM `1.67.0`, Java 17 | Testcontainers PostgreSQL is Boot-managed, not directly version-pinned in the testing POM. Obtain the resolved graph and actual container results rather than inventing its version |
| Standalone infrastructure examples | [messaging](../examples/backend-messaging/pom.xml), [data services](../examples/backend-data-services/pom.xml), [reliability](../examples/backend-reliability/pom.xml): `maven.compiler.release=17` | These POMs do not inherit the Boot parent; a framework upgrade does not automatically update every example |
| Java 21 runtime lab | [dated provenance](../examples/java-runtime/JDK_PROVENANCE.json) records Temurin `21.0.12.1+1` and archive checksum; [workflow](../.github/workflows/java-runtime.yml) selects major `21` | A checksum-backed local archive and CI's major-version selector can yield different patch builds; retain each actual runtime observation |
| PostgreSQL/vector integration | [workflow](../.github/workflows/vector-retrieval.yml) declares `pgvector/pgvector:0.8.7-pg16-bookworm`; general [SQL CI](../.github/workflows/verify.yml) declares `postgres:16` | Tags identify requested images, not immutable downloaded image digests or server patch versions; record the observed server/extension/image identity for a run |

[Verify](../.github/workflows/verify.yml) selects Node major 22 and Java major 17;
the [link workflow](../.github/workflows/learning-links.yml) selects Node major 24.
These selectors do not specify patch builds. Existing dated execution receipts live
in the [implementation ledger](BACKEND_AI_IMPLEMENTATION_RESULTS_2026-10-16.md)
and linked CI runs. Historical success must retain its original source commit and
scope; it is not automatically test evidence for this snapshot or a later upgrade.

Use compatibility language such as “compiled and passed these cases on X/Y, at
commit Z.” Never turn “newer available,” “documentation supports this line,” “the
dependency resolved,” or “a fixture passed” into “latest,” “secure,” “production
ready,” or “all supported combinations tested.” A security claim requires the
specific primary advisory, affected usage and verified mitigation; this snapshot
performs no vulnerability assessment.

## Source and evidence receipt

For a meaningful correction or freshness check, append a dated entry to the relevant
existing ledger. Use the fields below; do not repeatedly overwrite historical
observations with a new date.

| Field | Required content |
|---|---|
| Identity and ownership | Date/time, editor/reviewer, issue or local finding ID, capability IDs where relevant, exact source commit and affected lesson/section/example |
| Claim and authority | The claim being checked, primary URL, version/edition, precise section, access date, and pinned source revision/hash when it materially identifies the evidence |
| Access and rights | Actual content inspected: text, every relevant image/page or code. Record viewer-only/inaccessible sections explicitly. Public access is not a reproduction license; link and write original explanations |
| Compatibility | Declared POM/package/image/model settings; resolved dependency graph or lock; observed JVM/Node/Python/database/broker/browser/OS versions relevant to the result |
| Reproduction | Exact commands, prerequisites, isolated resource names, input provenance, budgets/deadlines, expected versus actual result and cleanup outcome |
| Evidence type and limits | Fixture/real dependency/live model/manual participant; exact case/test counts, failures, errors and skips; what was not measured or could not run |
| Decision and follow-up | Correction or no-change rationale, reviewer disposition, remaining limitations, responsible person, next trigger/due date, commit and final release/check links |

For AI receipts also retain model digest and observed runtime, prompt/template,
schema/tool/knowledge versions, dataset identity, split/label provenance, tuning
history, per-case/slice regressions and failure-inclusive denominators. Keep summary
faithfulness separate from scored fields. Once a held-out set is inspected or used
for selection, call it regression data; a later blind comparison requires a new
independent set. Follow the [frozen protocol](../examples/ai-backend/COMPARISON_PROTOCOL.md).

Prices must name provider/model, date, currency, charging units and relevant cached
or reasoning-token assumptions, or be explicitly invented scenario rates. Unknown
usage/cost stays unknown, not zero. A cheaper accepted subset can conceal failed
attempts; retain those costs and failures in the stated business-result denominator.

## Correct one explanation across all its surfaces

1. Read the [authoring contract](../content/CONTENT_SPEC.md), the full affected topic
   and its existing evidence. Locate the same claim in diagrams, runnable code,
   misconceptions, interview answers, optional rubrics and practical guides.
2. Confirm the fault using the appropriate primary section and independent example.
   Fix the underlying explanation; do not add an exception sentence beside a
   contradictory table, diagram or model answer.
3. Keep the beginner problem, definitions, worked trace and interview explanation
   consistent. Preserve useful content and prerequisites while meeting the depth
   contract. Label excerpts, runnable programs and intentional failures accurately.
4. Correct each affected model answer and authored rubric together. Preserve the
   standalone answer-depth bar and the six rubric labels. Run the shared parser and
   renderer checks rather than maintaining separate topic/category answers.
5. Correct Mermaid source when necessary, regenerate both themes and validate the
   matching manifest/fingerprint/decode. Never keep a false diagram merely to
   preserve its cache hash; never hand-edit a generated SVG to mask wrong source.
6. Preserve question wording when it remains accurate. Saved practice keys use the
   normalized prompt plus topic scope in [learningState.js](../frontend/src/utils/learningState.js),
   not just `Q1` order. If the prompt itself must change, explicitly review saved-state
   impact and provide a tested migration/compatibility decision before release.
7. Preserve canonical topic IDs, routes, category ownership, heading anchors used by
   reading bookmarks, storage/event keys and backup formats. Product-name changes
   are not permission to rename stored identities. Any unavoidable identity change
   needs a deliberate application migration and tests outside the content unit.
8. For content work, use one file per authoring unit and a separate commit. Integrate
   related example/test/diagram/documentation changes through the release owner;
   follow the repository's README/CONTEXT/AGENTS synchronization rule.

Do not put learner answers, notes, simulation inputs, real tickets, private model
responses, credentials or browser profiles into receipts or analytics. Use synthetic
fixtures and sanitized outcomes. Keep `redactAnalyticsUrl` and query/fragment
redaction regressions, with no custom learner-content events. Sibling links stay
native and same-tab; each deployment keeps independent progress.

## Periodic checklist and release checks

For each scheduled sweep, record checked, corrected, explicitly deferred or not
applicable for each row; a missing result remains unverified.

- Check primary links against the actual claim/version, not just HTTP availability.
- Review deprecated/preview APIs, changing defaults, engine assumptions and source dates.
- Reconcile declared dependencies, resolved artifacts and observed runtime versions.
- Run the actual examples affected by changes and read failure paths/cleanup evidence.
- Recheck prompt/model/schema/data changes against the frozen evaluation protocol.
- Compare explanation, diagram, output, misconception, answer and rubric consistency.
- Verify prerequisites, internal section links, code-block labels and both themes.
- Preserve saved progress, backups, privacy and cross-project navigation contracts.
- Review unresolved link findings, skipped jobs, expired artifacts and unexecuted checks.
- Assign unresolved items and a due date; separate technical checks from real learner
  and manual accessibility evidence using the [learner protocol](../LEARNER_USABILITY_STUDY.md).

From the repository root, use the locked dependencies and supported tools. Commands
below are a release checklist, **not checks executed by this policy-only change**.
Run targeted checks first and the required integration jobs for the affected scope:

```sh
node scripts/validate-content.mjs
node scripts/audit-simulation-questions.mjs --check
node scripts/verify-java-examples.mjs
npm test --prefix frontend
npm run build --prefix frontend
npm run test:responsive --prefix frontend
npm run diagrams:decode --prefix frontend
mvn test -f backend/pom.xml
```

If Mermaid inputs changed, run `npm run diagrams:render --prefix frontend` before
the build/decode checks. Example changes also require their own README commands
and relevant dedicated [workflows](../.github/workflows): PostgreSQL/pgvector,
brokers, OAuth, signed webhooks, actual Testcontainers, OCR, operations and Java 21
are separate evidence. A Maven suite with optional integrations skipped is not
equivalent to those real jobs. Preserve no-skip gates and inspect their artifacts.

For a dependency change, capture `mvn -B dependency:tree -f <example>/pom.xml` and
`mvn -B help:effective-pom -f <example>/pom.xml` for that same checkout before
interpreting its tests. Record the installed compiler/runtime and container identities;
do not substitute a cached build from another branch. Do not run a paid model or deploy a service just
to refresh a version label.

For sibling-link checks use the exact inventory, deterministic and bounded live
commands in [link maintenance](LEARNING_LINK_MAINTENANCE.md). Its exit codes
separate confirmed failures from inconclusive outages; a green fixture cannot close
a deployed incompatibility. Record the owning-app repair and reverify the actual
learner page rather than replacing a broken deep link with a homepage.

## Existing automation and handoff

[Dependabot](../.github/dependabot.yml) is configured weekly for frontend npm,
Maven under `/backend` and `/examples/**`, the frontend/backend Dockerfiles and
GitHub Actions. It does not perform factual editing, model evaluation or every
example Dockerfile review. Review changelogs, managed dependency differences and
the real affected workflows before merging; an automated update is not approval.

The link workflow declares Monday/Thursday **03:17 UTC**, manual dispatch and its
specific push/PR filters. Its configured JSON retention is **14 days**. Preserve
the relevant sanitized receipt before artifacts expire. Configuration proves a
schedule exists; check actual run status/time before claiming monitoring executed.
No automatic messages or issues to other people are part of this process.

At handoff, the release integrator supplies the exact final commit/PR, completed
checks and artifact links, unresolved items with owners, due dates and the next
review trigger. Record which integration jobs did not run because of path filters
or missing infrastructure. Retain the original scope of older source reviews and
learner sessions; do not relabel them as fresh evidence.

This artifact closes preparation of the editorial maintenance process. Recurring
execution, named future ownership, remaining course-source reviews, broader model
quality, actual learner studies and manual accessibility are separate work. Their
absence must remain visible in the [implementation ledger](BACKEND_AI_IMPLEMENTATION_RESULTS_2026-10-16.md).
