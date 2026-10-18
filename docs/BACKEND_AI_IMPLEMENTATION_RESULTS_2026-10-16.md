# Practical backend and AI implementation evidence

Baseline: `c5e5df1`. Branch: `feat/2026-10-16-practical-backend-ai`.
Plan: [capabilities and acceptance criteria](../BACKEND_AI_PRACTICAL_LEARNING_PLAN_2026-10-16.md).

## Evidence boundaries

Implementation is in progress. Fixture checks, actual HTTP calls to a local fake, real database queries, small-model training and live generative-model quality are different evidence types. No participant sessions, screen-reader results or paid/cloud execution are claimed.

## Capability ledger

| Requirement | Status | Intended outcome / evidence |
|---|---|---|
| AI-01 | Partial: beginner guide and actual classifier | AI/ML from zero |
| AI-02 | Partial: training metrics and diagnostic report | Evaluation foundations |
| AI-03 | Partial: attention/training trace and rubrics | How LLMs work |
| AI-04 | Partial: prompt/context and failure exercises | Prompt and context engineering |
| AI-05 | Partial: executable A | Model API integration |
| AI-06 | Partial: actual pgvector/index CI verified; semantic quality open | Embeddings and retrieval |
| AI-07 | Partial: lexical plus explicit versioned vector implementation | RAG lifecycle |
| AI-08 | Partial: bounded agent, approval and actual MCP | Tools, agents and MCP |
| AI-09 | Partial: per-field/slice/failure report, local tests | Quality and regression evaluation |
| AI-10 | Partial: tenant/citation/action enforcement | Security/privacy |
| AI-11 | Partial: serving failure diagnosis; telemetry open | Operations and debugging |
| AI-12 | Partial: capacity/quality trade-off exercise | Cost, capacity and model choice |
| AI-13 | Pending | Adaptation decisions |
| AI-14 | Pending | AI-assisted engineering |
| AI-15 | Partial: digital PDF and actual OCR CI verified; richer modalities open | Multimodal inputs |
| AI-16 | Partial: actual small-model training | Classical ML lifecycle |
| AI-17 | Local verified: runnable authored ranking and lesson | Recommendation systems |
| D-01 | Partial: failed live task fit and field diagnostics | Wrong but schema-valid extraction |
| D-02 | Partial: actual lexical miss and diagnostic report | Relevant document never retrieved |
| D-03 | Partial: injected wrong generation with correct retrieval | Correct sources, unsupported answer |
| D-04 | Partial: JDBC and HTTP tenant tests | Tenant data appears in another answer |
| D-05 | Partial: deadlines/overload tests; tracing open | Slow or hanging response |
| D-06 | Partial: local commit/restart/duplicate tests | Tool repeats a write after timeout |
| D-07 | Partial: bounded read-only agent tests | Agent keeps calling tools |
| D-08 | Pending | Quality drops after an upgrade |
| D-09 | Pending | Costs rise without more useful results |
| D-10 | Partial: bounded document fixtures and unknown/provenance checks | PDF/image output misses a value |
| BE-01 / P0 | Partial: real JVM deadlock/memory lab | Debugging workflow: JVM, concurrency, Spring boot/MVC |
| BE-02 / P0 | Partial: real opt-in trace/metrics and incident exercise | Observability: Spring testing/production + cloud operations |
| BE-03 / P0 | Partial: real PG/JPA/pool/migration/restore labs | Database incidents: SQL, optimizer, transactions, JPA |
| BE-04 / P0 | Partial: durable local and actual-broker CI verified; extensions open | Messaging: distributed DBMS + Spring async |
| BE-05 / P0 | Partial: real HTTP reliability lab | Reliability: Spring caching/async + network application layer |
| BE-06 / P1 | Partial: actual JWT/JWKS/owner tests and OWASP matrices | API/security: REST + Spring Security |
| BE-07 / P1 | Pending | Testing/delivery: Spring testing + CI/CD |
| BE-08 / P1 | Pending | Operations: Docker/Kubernetes/cloud |
| BE-09 / P1 | Partial: actual Git/Linux/offlineMaven/refactor; manual checks open | Everyday engineering: Java execution/Boot + CI/CD |
| BE-10 / P1 | Pending | Modern Java choices: JVM/concurrency + Spring |
| CLOSE-01 | Partial: inventory/docs and link-monitor automation | Reconcile status documentation and outdated topic tooling |
| CLOSE-02 | Pending | Java course familiarity |
| CLOSE-03 | Pending | Manual accessibility |
| CLOSE-04 | Pending | Learner comprehension |
| CLOSE-05 | Pending | Editorial maintenance |
| CLOSE-06 | Partial: seven AI lessons with three rubrics each | Practice consistency |

## Integration checkpoints

- Planning documents preserved from the original working tree.
- Resolved and compiled stack: Java 17, Spring Boot 4.1.1; Spring AI 2.0.1 supports Boot 4.1 according to its official getting-started documentation. Actual dependency resolution/compilation is required before declaring compatibility verified.
- Teaching projects remain separate from the educational platform backend.

## Verification

- Eleven Java example tests pass (real local HTTP adapter + MVC authentication/CSRF).
- Packaged HTTP smoke passes: Basic/session/CSRF flow and 30 development + 20 held-out fixture cases.
- Five small-model tests pass. Actual training loss decreases from 0.693147 to 0.406487; held-out accuracy is 23/30 on synthetic data at the validation-selected 0.5 threshold. This is not real-world quality evidence.
- Four inventory tests pass; all 68 canonical metadata records match the browser fixture; exact content audit passes.
- Live local inference: Ollama 0.32.5 / qwen2.5:0.5b (digest in the committed report) completed 20 held-out cases: 20 accepted schemas, **0/20 exact category/priority/order-ID matches**, about 51 seconds total. This model/prompt combination is unsuitable for this task under that metric. The unchanged development spot-check returned high priority and no ID for a normal-priority refund request with an explicit ID. This diagnoses a real failure, not a passing quality gate.
- Platform backend: 63/63 tests pass after updating canonical rubric checks. Frontend: all 265 Markdown rendering tests passed; all 14 parser tests pass after updating the expected total from 56 to 59 and checking the three new canonical IDs.
- ML lesson: 555 lines, existing diagrams/questions preserved, three added scenario rubrics; single-file content validation passes.
- No application CSS or diagram-source changes. Platform UI behavior is unchanged; the ML lesson and rubric integration tests changed.

## External evidence pending

- Live generative-model evaluation: no paid calls authorized; provide bounded opt-in configuration.
- Beginner and backend-engineer participant sessions.
- Manual screen-reader/zoom sessions.
- Remaining external Java course notes and rights/access review.

## Resolving commits and runtime constraints

- `03620b7`: packaged-JAR isolation and first executable foundations; resolves RCA-2026-10-16-01 with sequential packaged smoke evidence.
- `5d01c20`: single-file ML lesson and three interview rubrics.
- RCA-2026-10-16-02: the large-model run was interrupted to release memory. Subsequent one-worker parser verification passed, and the 398 MB smaller model completed its actual held-out run. Future reports checkpoint per case and record model digest/runtime. See the committed evidence notes; live inference must not overlap browser tests here.
- Projects B/C and the remaining backend/closure capabilities remain open. Do not interpret this first package as the full roadmap.

## Knowledge and controlled-action checkpoint

- Eight JDBC knowledge tests: tenant filtering before model calls, unsupported citations, empty retrieval without a model call, revocation during generation, optimistic conflicts/tombstones, freshness, unknown identity, actual file-backed reconstruction.
- Six fake-business workflow tests: ownership/amount policy, exact-action approval, expiry, stable retry keys, timeout-after-commit plus restart, concurrent duplicate approvals. Approval tokens bind tenant and principal as well as exact action/version/expiry. No real payment is performed.
- Four read-only agent tests: lookup/finish, forbidden mutation and changed scope, step cap, cancellation of a stalled proposal. Model execution uses a two-worker executor with no queue and a total deadline.
- Full example Maven verification passes **31/31 tests** (including explicit invalid-model-output and overload HTTP behavior). Packaged cross-feature HTTP smoke passes: authentication/CSRF, two-tenant query/update/revoke, bounded agent, explicit approval/replay, actual MCP and all 50 fixture evaluation cases.
- Actual MCP stdio client/server check passes with official Java SDK 2.0.0; negotiated protocol is **2025-11-25**. Discovery and allowed/forbidden lookups are verified. No newer protocol compatibility or remote OAuth is claimed.
- GitGuardian flagged fixed sample password defaults in the original feature history. Runtime credentials/approval secret are now required, tests/smoke generate ephemeral values, and the isolated feature history will be sanitized before merge. No real credential was exposed.
- Dense vector/ANN retrieval, multimodal inputs, broad evaluations/telemetry and the backend practice track remain pending.

## Security-check remediation and integration policy

The original development commits contained fixed teaching-only password defaults. GitGuardian flagged the configuration, so runtime values are required and tests/smoke generate credentials. Before pushing the next checkpoint, the agent preserves a local backup branch and folds its own feature commits into a clean snapshot based on `c5e5df1`, using a force-with-lease update on this sole-agent branch. Development hashes above are historical lineage; final CI/merge evidence refers to the sanitized snapshot. Required checks are not bypassed.

Sanitized snapshot: `0dc8d6f612e42f250efc9526408f73aac7bd2094` (exact verified tree preserved). All required checks, GitGuardian and both Verify runs passed on that head. Final API error polish maps agent overload to HTTP 503 and malformed upstream output to 502, with two additional tests; final-head CI is required again before merge. RCA-2026-10-16-01/02/03 are resolved in the sanitized snapshot.

## October 17 coverage extension and merged baseline

PR [#55](https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui/pull/55) merged as `98c0e9e991e09fa5569efaf75fdcebeb9549e393`. Final-head verification, security scanning and deployment checks passed before merge. The merged example suite has 31 tests; earlier 11-test and four-agent-test entries above describe intermediate checkpoints, not the final totals. Credential history remediation is complete; its earlier future-tense notes are historical.

The [backend coverage checklist](../BACKEND_ENGINEERING_COVERAGE_2026-10-17.md) adds BEC-01–BEC-77 to required scope. All 77 are mapped to current owners, baseline limitations and acceptance work; none is newly closed by this documentation. Reuse specific DSA/LLD/published-HLD pages instead of duplicating their lessons. Remaining backend work includes coherent Clean Code, real Kafka/RabbitMQ/Redis and NoSQL exercises, service/gateway/WebSocket integration, resilience/saga recovery, observability, security and load/delivery practice. Existing foundations and runnable milestones remain evidence for their stated scope.

Coverage verification for this documentation checks the exact 77 requested labels in order, unique IDs, reference/local-link resolution and the source routes/content behind the selected sibling links. HTTP success only establishes URL availability; it does not certify all interactions or backend dependencies. No application code, curriculum question/diagram identity or registered-topic count changes here. Live-model task-quality acceptance remains open after the recorded failed local-model result; real learner/manual accessibility gates remain open too.

## October 18 integrated package — local evidence, release pending

- PR #56 merged as `d5d6668c0d65591d7e3544329349f45245c8eb8e` after all checks passed. The 77-item mapping remains a requirement contract, not 77 completed outcomes.
- Integrated the five saved AI lesson changes and recommendation milestone. Every AI lesson now has at least three authored rubrics; totals are 77 rubrics, 953 unchanged question identities, 68 lessons and unchanged diagram sources. Real content validation passed all 68 files. Corpus/Markdown suites passed 279 checks; new link/control/practice checks passed 18.
- Backend Engineering branding preserves technical identifiers, routes, storage/events and legacy backups. The targeted branding runs passed 142 relevant tests; integrated responsive smoke passed 14 routes × five widths × two themes, reader/rail/review journeys, 36 simulator overflow/axe checks per theme and 20 page axe scans. This is automated evidence, not a manual screen-reader or learner session.
- Real JVM and PostgreSQL diagnosis labs passed six tests, including cleanup after injected failure; recommendation lab passed seven. These do not close high-CPU/JFR, IDE/config, N+1, pool, migration/restore or production performance work.
- Evaluator now prevalidates cases and reports field/slice correctness, failure-inclusive denominators and observed quantiles. Example Maven verify passed 39 tests. Historical live report remains 20 schema-accepted / zero complete-field matches and is not retroactively given missing per-field data.
- Platform backend passed 63 tests with canonical rubric-ID assertions. Build and diagram-input check passed without App.css or diagram-source changes.
- The packaged HTTP smoke now passes actual extraction/auth/CSRF, tenant/version/revocation, approval/replay, both 30/20 fixture evaluations and real MCP negotiation. Initial parallel verification missed the startup bound, and a later run timed out MCP initialization while completed HTTP servers were still live. The unchanged JAR MCP check passed alone; stopping only the owned completed HTTP servers before the independent MCP check made the full smoke pass without increasing protocol timeouts. RCA records the failed and passing evidence.
- Link automation passed eleven deterministic tests and validated 18 inventory references. Live audit verified 17 and confirmed HLD cache-aside incompatible: deployed backend model 1.0.0 versus expected 1.0.1. Matching backend source is already merged in HLD; owner redeployment and a passing live audit remain required. No sibling deployment has been performed.
- Messaging module passed eight durable-file/schema tests; two real-broker tests are explicit local skips because Docker is unavailable. Dedicated CI must actually run both; the workflow refuses skipped broker evidence. Rebalance/multiple relay/failover/saga extensions remain open.
- Vector retrieval, bounded reliability and Task Tracker observability are integrated below with their bounded local evidence. Real-service CI remains required. Real participant/manual accessibility and remaining Java course notes remain external closure gates.

### Vector, messaging and reliability integration

- Vector code cherry-picked from `79ca5db` (root `3d33556`), then `c1df27d` hardens actual-PG no-skip evidence and clarifies that rebuild checks are not a hard 30-second end-to-end deadline. Agent's final local Maven run exercised 47 tests and explicitly skipped eight PostgreSQL cases. Real pgvector 0.8.7/PG16 CI evidence is pending; authored vectors are geometry fixtures, not learned semantic-retrieval quality. The default lexical service and all extraction/workflow behavior are retained.
- Reliability package `d983f66` passed all 19 tests and a separately packaged demo with exactly three attempts/three dependency requests/two retries and no admitted work left behind. It uses bounded GET-only automatic retries and treats committed-but-timeout mutation ambiguity as a separate idempotency problem. An initial handoff/admission race was found and fixed before commit; RCA tracks the correction.
- These additions leave real model/embedding quality, full RAG evaluation fixtures, stage telemetry/cost, multimodal, Redis/NoSQL and further production exercises open. No cloud deployment or paid calls are implied.

Dependency automation now includes tracked Maven examples recursively and GitHub Actions, alongside the existing platform/frontend/Docker configuration. Actual version-update PRs remain future scheduled evidence; configuration is not proof that every dependency is vulnerability-free.

### Task Tracker observability checkpoint

Observability package `9c06c7c` adds the actual OpenTelemetry SDK1.67.0 with correlated JSON spans,
fixed-cardinality Micrometer1.17.1 measurements and an executable incident/alert explanation. Agent
verification passed all 29 tests (original19 plus ten additions), the existing packaged production
HTTP smoke and the opt-in observability HTTP mode. Real same-JVM HTTP/async/dependency/JPA evidence
is separate from a deployed collector, alert scheduler or external service. No educational-platform
learner telemetry is added. Whole integrated CI/release remains pending.

Integrated Java verification after vector + evaluator composition: **63 discovered, 55 passed,
eight PostgreSQL cases explicitly skipped locally**; no failures/errors. The dedicated pgvector
CI must execute all eight actual PostgreSQL cases without skips. Later-added OCR cases are verified separately by their own real-engine job. Integrated reliability Maven verification also passed all19.


### Integrated review checkpoint

Implementation checkpoint `a8a161a4def216d37442edea70aa313d297527af` combines the packages above;
its final frontend suite passed **826/826 tests across 64 files**. The four confirmed regressions
and their resolving commits are recorded in [RCA.md](../RCA.md#rca-2026-10-18-01--lesson-artifact-links-resolved-against-application-routes).
Release checks and real pgvector/Kafka/RabbitMQ jobs are pending until the review branch runs in CI.
A passing local run with explicit integration skips is not a passing real-service integration.

### Redis and MongoDB checkpoint

Data-services source `40bcc81` (integrated `c79bf78`) adds actual Redis and MongoDB exercises.
Nine schema/guard/application contracts passed; a separate owned native Redis8.6.2 run passed
all four actual Redis cases without skips. MongoDB's four and the three combined cache/database
cases require the dedicated digest-pinned CI service job. The workflow requires all20 tests and
zero skipped service cases; default local skips are explicit. Tenant/version cache keys and
canonical version checks prevent late stale population or failed invalidation from making old
bytes current, at the documented extra database-query cost. No stampede/failover/recovery or
production-auth deployment is claimed. Final integrated packaged AI HTTP/MCP smoke passed again.

### Document and JWT checkpoints

Digital-PDF/OCR package `d0c9fff` (integrated `986930b`) passed50 tests with3 actual OCR cases explicitly disabled locally. Actual packaged digital-PDF extraction recorded page/line/source hash/runtime provenance, and the existing HTTP/MCP smoke passed. Enabling missing OCR fails explicitly with no published report. Dedicated CI installs Tesseract and must run all3 OCR cases without skips and retain4 provenance artifacts. Generative field quality, complex layout, handwriting and multilingual coverage remain open.

JWT package `d300b9a` (integrated `84b73e1`) passed39 tests and both packaged HTTP modes. Actual HTTP/JWKS tests cover bounded refresh, rotation, issuer/audience/time/algorithm/scopes, owner checks and untrusted credential sources. The full version-labelled OWASP Web2025/API2023 matrices document20 categories with tested controls, procedures and gaps. Full OAuthAS/PKCE/OIDC/refresh/revocation, webhook replay, deployed secrets and broader risk management remain open.

Real-service CI on checkpoint `4902db8` passed Kafka/RabbitMQ, Redis/MongoDB, reliability and observability jobs. Actual pgvector execution exposed a query-plan evidence failure (sort rather than HNSW); it remains a release blocker until corrected and verified on the final head. Unfinished RAG evaluation work is preserved separately and is excluded from this release.


### Release scope frozen for requested merge

[PR #57](https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui/pull/57) contains the completed
packages above. The pgvector query correction is `df001dc` (source `c1fc3b5`); final-head CI must
prove actual HNSW execution and all eight PostgreSQL cases without skips. Before that correction,
the combined PDF/vector/evaluator clean Java build passed74 tests with eleven explicit local
service/OCR skips (85 discovered). Its final packaged smoke is recorded separately. No skipped
local test is represented as actual external-service evidence. Remaining saga, persistence,
everyday-engineering and RAG-evaluation work is isolated from this release. Final merge and check
status live on the linked PR, avoiding a fabricated pre-merge completion claim in this ledger.

The combined clean-build packaged HTTP/MCP smoke also passed after PDF integration; no unfinished RAG evaluator is packaged in that release build.

## October18 merged release and next RAG checkpoint

PR[#57](https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui/pull/57) merged as `ac1cebe14cca7de6ad0fd4e7d6b169372cb7ae10` after exact-head checks: frontend/browser/axe/diagram decode, platform/backend examples, containers and real backend journey, actual pgvectorHNSW, Kafka/RabbitMQ, Redis/MongoDB, realOCR, observability, reliability, deterministiclink contracts and secret scanning. The scheduled/main live link job is separate; the known HLD backend deployment mismatch remains open. Localmain was fast-forwarded and clean.

ProjectB now has original30dev/20held-out query fixtures, actual lexical/store/validator execution, separate retrieval/rank/citation/substring-fact/outcome scores, slice counts and failure-inclusive stage quantiles. Whole Java verify:91 discovered,80 passed,11 explicit localPG/OCR skips; the new six evaluator regressions and packaged50-case CLI passed. Committed copy-fixture reports show21/30 and13/20 expected-fact matches, not model accuracy; no baseline weakness was hidden. Expected labels stay outside generation. Live RAG/embedding semantic quality, human support labels and cross-model comparison remain open.

### Saga, persistence and everyday-engineering integration

- Saga source `3c2f48b` (root `5acd375`):21 discovered,19 local tests passed,2 broker cases explicitly skipped. Eleven new tests exercise actual owned child-JVM exits after reserve/charge/release commits, independently reopened H2 files, ambiguous outcomes, bounded manual review and exact request/tenant compensation. Broker CI must still execute its cases. Fake inventory/payment and three independent local commits are not a global exactly-once/real payment guarantee.
- Persistence source `8a89427` (root `99792bf`): actual PostgreSQL16.15 run passed5 Java tests with no skips,5 verifier guard tests, actual dump/restore data/FK/CHECK/identity verification and owned-resource cleanup. N+1 statements4→1 with equal results; bounded Hikari pool timeout/recovery; expand/backfill/fenced contract and transactional rollback plus old-writer restoration. Digest-pinned container CI transport remains required; small fixtures are not production performance or migration-SLA evidence.
- Engineering workflow source `f7f5e23` (root `ab62eb8`):4 tests and actual CLI passed. Disposable Git bisect identifies the behavioral culprit; append-only revert retains later work;17 golden Java cases preserve refactor behavior. Real owned Linux socket/file/process evidence and actual offline Maven mediation/class loading/config precedence are recorded. Independent-repository isolation and failure cleanup are tested. Manual IDE/unfamiliar-repo/security review tasks stay open.

Four single-file teaching units connect RAG/distributed-data/JPA/SOLID to the runnable evaluation/recovery/persistence/refactor guides. Each passed its content validator (550/581/510/491 lines respectively), with existing diagrams and14 questions per file preserved. No new question/rubric/diagram identity or registration was added. PR76 runs the combined checks.

Observed queue evidence:14 dependency Verify entries and3 project Verify entries were queued during integration. Main/PR trigger deduplication and superseded-PR concurrency reduce repeated work without removing checks; the actual final-head run remains the release evidence.
