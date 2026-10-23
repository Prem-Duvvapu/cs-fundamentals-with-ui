# Practical backend and AI implementation evidence

Historical planning baseline: `c5e5df1`; original implementation branch: `feat/2026-10-16-practical-backend-ai`.
Current releases and scoped evidence are recorded below; historical checkpoints retain their original observations.
Plan: [capabilities and acceptance criteria](../BACKEND_AI_PRACTICAL_LEARNING_PLAN_2026-10-16.md).

## Evidence boundaries

Implementation is in progress. Fixture checks, actual HTTP calls to a local fake, real database queries, small-model training and live generative-model quality are different evidence types. No participant sessions, screen-reader results or paid/cloud execution are claimed.

## Capability ledger

This table includes merged PR86 (October 23) and the explicitly unreleased continuation below. The dated checkpoints
are history; later release evidence supersedes earlier CI-pending statements only for that scope.

| Requirement | Status | Intended outcome / evidence |
|---|---|---|
| AI-01 | Partial: beginner guide and actual classifier | AI/ML from zero |
| AI-02 | Partial: training metrics and diagnostic report | Evaluation foundations |
| AI-03 | Partial: attention/training trace and rubrics | How LLMs work |
| AI-04 | Partial: frozen actual prompt comparison and failure exercises; broader context work open | Prompt and context engineering |
| AI-05 | Partial: structured Project A plus verified bounded native streaming | Model API integration |
| AI-06 | Partial: actual pgvector/index CI verified; semantic quality open | Embeddings and retrieval |
| AI-07 | Partial: lexical plus explicit versioned vector implementation | RAG lifecycle |
| AI-08 | Partial: bounded agent, approval and actual MCP | Tools, agents and MCP |
| AI-09 | Partial: actual paired prompt regression and failure-inclusive reports; human quality open | Quality and regression evaluation |
| AI-10 | Partial: tenant/citation/action enforcement | Security/privacy |
| AI-11 | Partial: serving diagnosis, actual stream cancellation/timings; stage telemetry open | Operations and debugging |
| AI-12 | Partial: actual token usage and failure-inclusive scenario costs; model comparison open | Cost, capacity and model choice |
| AI-13 | Implemented: measured rule baseline, decision records and counterexamples | Adaptation decisions |
| AI-14 | PR80 verified: reviewed AI-authored patches, actual Java/Git/Maven and independent regression tests | AI-assisted engineering |
| AI-15 | Partial: digital PDF and actual OCR CI verified; richer modalities open | Multimodal inputs |
| AI-16 | Partial: actual small-model training | Classical ML lifecycle |
| AI-17 | Local verified: runnable authored ranking and lesson | Recommendation systems |
| D-01 | Partial: failed live task fit and field diagnostics | Wrong but schema-valid extraction |
| D-02 | Partial: actual lexical miss and diagnostic report | Relevant document never retrieved |
| D-03 | Partial: injected wrong generation with correct retrieval | Correct sources, unsupported answer |
| D-04 | Partial: JDBC and HTTP tenant tests | Tenant data appears in another answer |
| D-05 | Partial: actual streaming stalls/cancel/deadlines and overload; AI tracing open | Slow or hanging response |
| D-06 | Partial: local commit/restart/duplicate tests | Tool repeats a write after timeout |
| D-07 | Partial: bounded read-only agent tests | Agent keeps calling tools |
| D-08 | Partial: actual frozen prompt regression with paired cases; model/context upgrades open | Quality drops after an upgrade |
| D-09 | Partial: failure-inclusive cost arithmetic and unknown-usage diagnosis; comparative budget report open | Costs rise without more useful results |
| D-10 | Partial: bounded document fixtures and unknown/provenance checks | PDF/image output misses a value |
| BE-01 / P0 | Partial: real deadlock/memory/highCPU/JFR; configuration and JDI locally verified, release pending; human IDE work open | Debugging workflow: JVM, concurrency, Spring boot/MVC |
| BE-02 / P0 | Partial: real opt-in trace/metrics and incident exercise | Observability: Spring testing/production + cloud operations |
| BE-03 / P0 | Partial: real PG/JPA/pool/migration/restore; expanded concurrency/plans locally verified, release pending | Database incidents: SQL, optimizer, transactions, JPA |
| BE-04 / P0 | Partial: durable local and existing actual-broker CI verified; concurrent rebalance extension compiled/reviewed, actual CI pending | Messaging: distributed DBMS + Spring async |
| BE-05 / P0 | Partial: real HTTP reliability lab | Reliability: Spring caching/async + network application layer |
| BE-06 / P1 | Partial: actual OAuth/JWT, webhooks, SSRF and PR86 sessions/WebSocket; gateway/egress work open | API/security: REST + Spring Security |
| BE-07 / P1 | Verified: actual PostgreSQL/Testcontainers, HTTP concurrency/load, causal flaky fix; rollback linked | Testing/delivery: Spring testing + CI/CD |
| BE-08 / P1 | Partial: actual kind recovery, heap/cgroup OOM and CPU throttling CI verified; IAM/network/cloud cases open | Operations: Docker/Kubernetes/cloud |
| BE-09 / P1 | Partial: actual Git/Linux/offlineMaven/refactor; manual checks open | Everyday engineering: Java execution/Boot + CI/CD |
| BE-10 / P1 | Verified: actual Java21 bounded platform/virtual-thread comparison and no-skip CI | Modern Java choices: JVM/concurrency + Spring |
| CLOSE-01 | Partial: inventory/docs and link-monitor automation | Reconcile status documentation and outdated topic tooling |
| CLOSE-02 | PR82 familiar two-entry revision and execution/OOP/primitive/reference reviews verified; remaining notes and real learner pilot open | Java course familiarity |
| CLOSE-03 | Manual protocol ready; actual assistive-technology/zoom sessions pending | Manual accessibility |
| CLOSE-04 | AI explain/build/debug protocol ready; actual learner/retest evidence pending | Learner comprehension |
| CLOSE-05 | Maintenance process and compatibility inventory prepared; recurring execution remains ongoing | Editorial maintenance |
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

- Broader live-model/semantic-quality evidence: bounded local runs are recorded below; paid/cloud execution and human answer-support assessment are not performed.
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

### Optional Java21 runtime checkpoint

Source `94bab74` (root `50dd095`) passed all5 actual native tests without skips using a checksum-verified owned Temurin21 JDK; system/platformJava17 stays unchanged. Twelve healthy calls reached downstream maxima2/2/12 for platform-limited/virtual-limited/virtual-unlimited, with actual `isVirtual` evidence. A client timeout experiment explicitly shows remote work can outlive client permits and verifies zero handlers after cleanup. A bounded CPU worker used2.000CPU seconds; namedRUNNABLE thread and196 matching actualJFR samples identify the hot loop. The dedicatedJDK21 CI job must execute all5 cases without skips; timings/sample counts are dated observations, not universal performance claims.

### Rule baseline and adaptation decisions

The no-model evaluator passed11 focused Java tests and the packaged30/20-case verifier with intentionally unusable provider settings. Actual rule results:29/30 dev,17/20 public-held-out full field matches;1/3 review cases remain in denominators. Known out-of-vocabulary/negation limits and a schema-valid wrong synonym example are taught. Four written decisions compare rules, a classifier, prompting/RAG and conditional fine-tuning; no training/quality gain is invented. New reports retain raw and LF-normalized hashes: the historical local-model report used LF input, current checkout CRLF, and normalized hashes prove unchanged JSONL. Public-held-out results are already-inspected regression evidence, not independent prospective model selection.

### Completed code frozen for requested PR76 merge

- Controlled-workflow evaluator source `8901acf` (root `f18625e`): six new tests, full source-package suite80executed/11existing native skips, and actual packaged standalone50-case execution passed. It records13 completed tasks,33 expected refusals,four bounded stops,44 fixture proposals andzero observed invariant/contract failures. Actual response timeout occurs after the commit signal, then the file is reopened/reconciled/replayed. A negative observer test proves database mutations are detected independently of labels. Root adds the normal Boot-JAR dispatch and packaged verifier. Fixture output is not live-agent, controller, MCP or payment quality evidence.
- OAuth source `8899891` (root `7853a42`):2Java guards,4Python client guards and13actual HTTP groups passed against a framework AS and unmodified TaskTracker source built privately. Code replay, S256/verifier/state/exactredirect failures, scope/owner/audience/signature/expiry and existingBasicCSRF boundaries are observed. Generated keys/users are not tracked; owned processes/source-copy/H2 are removed. OIDC/refresh/deployedrevocation and productionidentity operations are outside this milestone. Actual dedicated CI remains required.
- Operations source `71173c5` (root `50301f9`):9native guards, Java17probe compilation and Python syntax passed. No actual local cluster execution is claimed. The dedicated pinnedkind CI must prove namespaceUID, ServiceDNS/auth, readyendpoint withdrawal, samePod/no-restart recovery, failed-startup logs and oldreplica availability, rollback and cleanup beforemerge. OOM/PV/multinode/cloudIAM/NetworkPolicy exercises remain open.
- Streaming code is unfinished in a separate worktree and excluded from this requested release. Integrated full verification and every final-head remote gate must pass; source-package evidence alone does not authorize a merge with failing integration checks.

## PR76 merged release evidence — October18

[PR76](https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui/pull/76) merged at18:02:44UTC as
`1db0e242fe61754d7f3bd964e8881227b389eb58`. All16 final-head checks succeeded, including actual
OAuth HTTP, kind recovery, PostgreSQL incidents, Java21, brokers, vector retrieval, PDF/OCR,
full Verify, security and deployment preview. The original main worktree was fast-forwarded cleanly.
This resolves the CI-pending statements in the immediately preceding frozen-release checkpoint
for their stated scope. It does not close semantic model quality, manual accessibility, learner
comprehension, OOM/cloud/network or other explicit remaining roadmap requirements.

## Streaming implementation — next release

New isolated native-client exercise targets AI-05/11/12: bounded NDJSON and strict UTF-8 framing,
explicit cancellation/deadline/incomplete outcomes, first parsed nonempty content, optional provider
usage and nanosecond durations, and dated scenario arithmetic with failure-inclusive costs.
The normal teaching-JAR dispatch and four-case owned HTTP verifier are integrated into Verify.
Auth/CSRF/extraction behavior is unchanged. Fixture results are transport evidence; they are not
quality, hosted billing or capacity evidence. Final test/live observations are recorded below
when complete; this checkpoint is not itself a release/acceptance claim.

Streaming local verification completed:117Java tests discovered,106executed successfully,
11existing optionalPG/OCR skips; all17 new streaming/cost tests ran without skips. The packaged
four-case streaming verifier and existing actual HTTP/CSRF/RAG/action/MCP/50-case evaluation smoke
passed. A single actual installed `qwen2.5:0.5b` call onOllama0.32.5 completed with first parsed
content2,382ms,total2,643ms,36input/10output reported tokens; cachedinput remainednull. The inspected
GGUF digest/runtime and zero-download provenance are recorded beside the sanitized report. This
is transport evidence with acceptance not evaluated; no model-quality or billing claim follows.
Independent review caught the unpublished cloud-tag guard defect, corrected with regression tests
and recorded inRCA2026-10-18-07. Final-head remote release gates are still required.

## PR77 merged release evidence — October 18

[PR77](https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui/pull/77) merged at 18:16:06 UTC as
`f82ad332c83abe6cef336c85071b402af41a3753`. All 11 final-head checks passed, including full
frontend responsive/accessibility/diagram checks, actual practical-AI integration, pgvector,
PDF/OCR, platform backend, labs, containers, security and deployment preview. Workflows scoped to
unmodified identity/operations/runtime/persistence directories were not triggered for this PR;
their PR76 evidence remains separate. The new streaming module is delivered for its stated scope.

## Signed webhooks and testing — next release

The [webhook lab](../examples/backend-webhooks/README.md) uses exact-body/tenant/timestamp HMAC,
strict compatible payload versions, one local receipt/effect/balance transaction, concurrency,
restart reconciliation and key overlap/retirement. Integrated local verification passed all
8 Java tests, 5 harness guards and 29 actual packaged HTTP cases without skips. The response
really times out after an observed commit, then an owned JVM is killed and the same file reopened;
replay produces no second effect. This is one local database boundary, not a remote-payment or
multi-node exactly-once guarantee. Source `deda749`, integrated `dd9b492`.

The [testing lab](../examples/backend-testing/README.md) imports unchanged Task Tracker source.
Four local Java stub/statistics/synchronization tests and the evidence guards pass. The four
actual PostgreSQL/Testcontainers cases compile but cannot run against this WSL environment's
unavailable Docker daemon. Dedicated CI must execute all eight Java cases without skips and prove
concurrent persisted rows, real migration constraints/restart, error-inclusive bounded load,
observed pool starvation/recovery and owned cleanup. No current local throughput numbers or
PostgreSQL outcome is invented. Source `d990d49`, integrated `489d6bd`.

[Java source inventory](JAVA_COURSE_SOURCE_LEDGER.md) now accounts for all 40 course entries,
31 distinct links, seven Drive URLs, 22 identical Zoho HTML shells and two OneDrive URLs. Entry 3
has no source; entry 39 returned HTTP 401. HTTP availability is not factual-review evidence.
The earlier three-page execution PDF remains the only documented complete source review;
remaining note/image review, familiar navigation and real two-lesson pilot stay open.

[Manual access protocol](MANUAL_ACCESSIBILITY_PROTOCOL.md) and the expanded
[learner tasks](../LEARNER_USABILITY_STUDY.md) make CLOSE-03/04 executable by real participants.
No participant, screen-reader announcement, browser-zoom observation or comprehension success
is fabricated. Required human observations and revision/retest remain pending.

Before the next release, testing-harness review also corrected cleanup after an already-exited
Maven parent. The integrated six Python guards include an actual surviving fork/held-stdout/TERM
regression and allowlisted diagnostics privacy checks; all pass. The four local Java guards still
pass. Actual Testcontainers/HTTP/load cases remain awaiting mandatory CI at this checkpoint.


## PR78 release reconciliation — October 21

[PR78](https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui/pull/78) merged October 18 at 18:33:23 UTC
as 1d4eaaa7e32fba03303ed46988f019d124151522. All 14 final-head checks passed. This supersedes
the preceding historical Testcontainers-CI-pending statements for that release. The actual artifact
records PostgreSQL 16.15, eight Java tests with zero failures/errors/skips, unchanged Task Tracker
source, 24 concurrent inserts/25 total distinct rows, migrations and restart. The 60-attempt measured
workload retains 24 healthy successes, 12 deliberately starved HTTP 500s and 24 recovered successes;
owned application/container cleanup is verified. These are bounded single-run observations, not
production throughput or saturation claims. Webhook, kind, trace, identity and full platform gates
also passed at that final head.

## October 21 completion continuation

The independent [OOP source review](JAVA_OOP_SOURCE_REVIEW_2026-10-21.md) covers all 11 original
PDF pages, diagrams and handwritten code. Java 17 evidence includes one original runnable program
and four expected compilation failures. Source rights and remaining sources are still separate
from this factual review; no notes/PDF/images were republished. S01 is updated in the source
ledger, with CLOSE-02 still open for the remaining notes, familiar navigation and real pilot.

The resource-incident extension preserves all five original kind checks and adds three mandatory
owned Pod observations: Java heap OOME, actual kernel/cgroup OOMKilled+137, and actual CPU quota/
throttling deltas. All 13 native guards pass, including Java 17 compilation. Actual execution of the
three new resource cases requires the updated no-skip dedicated CI; local Docker is unavailable.
IAM/network restriction scenarios remain open.

The ticket quality comparison freezes candidate 2d1247d before root inspects the independently
authored 20-case holdout (50396ae, LF SHA256 feaa735baddfbc440c0788403445d72484972adb498feb4231ad4c65e4bb3709).
It compares identical cases through original/few-shot prompts plus a no-model reference, retaining
all failure denominators and explicit narrow field gates. AI-authored synthetic labels and
unassessed summary faithfulness are not human calibration or production quality. Final live and
integrated verification results follow when completed.


### October 21 actual comparison and local integration

Both frozen prompt variants and the deterministic reference completed on the same existing local
qwen2.5:0.5b / Ollama 0.32.5. Development exact counts are 3/30, 5/30 and 29/30; independent
synthetic holdout exact counts are 2/20, 8/20 and 6/20. The candidate improves seven holdout cases
and regresses one, but neither model nor rule reaches the held-out 90% gate. The application
retains its original prompt. These are failed narrow quality gates with useful diagnostic evidence,
not successful production-quality or human-learning outcomes. Reports, prompt/dataset hashes,
run order, unknown usage and separate post-hardening development validation are linked from the
[comparison evidence notes](../examples/ai-backend/evidence/README.md).

Local Maven verification discovers 120 tests: 109 execute successfully and eleven pre-existing
optional PostgreSQL/OCR cases skip without their local prerequisites. The new three prompt tests
run without skips. Existing packaged HTTP/auth/CSRF/RAG/tool/MCP/evaluation smoke passes. Eleven
comparison Python guards and the new actual eight-call packaged comparison pass; native operations
contracts pass thirteen tests. The resource Pods and integrated release still require mandatory
final-head remote CI. No Testcontainers/cluster result is inferred from local contract tests.

The integrated content validator passes all 68 lessons/83 manifest entries; all 295 diagram bodies
and 953 question identities are preserved. The focused Markdown/parser suites pass 279 tests,
and all 227 local links inspected in the touched learning/source/evidence documents resolve.


## PR79 merged release evidence — October 21

[PR79](https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui/pull/79) merged at 18:46:07 UTC as
1170bb4a232448cc54fc18e0b80cd5880723ff56. All twelve checks passed at exact head
5c7d746bbd5b6083cf4e70a734f030315f090caf, including frontend browser/accessibility/diagram checks,
platform and practical AI tests, real-backend journey, pgvector, actual OCR, containers, labs,
security and preview. Dedicated unchanged identity/messaging/testing workflows were not triggered;
their earlier release evidence remains separate. The original main worktree was fast-forwarded cleanly.

The [actual kind resource job](https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui/actions/runs/39654843602)
executes all eight cases with zero skips and verified cleanup. Heap allocation produces Java heap
OOME and exit 3/Error. Native allocation records memory.max=100663296 and actual 137/OOMKilled.
The CPU Pod records cpu.max=10000 100000, 8,000ms elapsed, 798,038 additional usage microseconds,
80 additional throttled periods and 5,281,190 additional throttled microseconds. These are bounded
single-run observations, not saturation or capacity measurements. A [sanitized persistent receipt](evidence/RESOURCE_INCIDENTS_2026-10-21.json)
retains selected values and source-log/result hashes; the original CI artifact remains separate.

This release supersedes the preceding resource-CI-pending statements. Neither live prompt meets
the held-out field-quality target; learned semantic relevance, human answer support, remaining
Java source/navigation/pilot work and real learner/manual accessibility checks remain open.

## Editorial maintenance artifact

The [maintenance guide](EDITORIAL_MAINTENANCE.md) supplies CLOSE-05's missing repeatable process:
dated source/evidence receipts, declared/locked/tested compatibility, six-path risk-based review,
joint explanation/code/answer/rubric corrections, protected learner state, release checks and
handoff. Its dependency/workflow snapshot and 41 local links were checked against repository
sources. It does not constitute a new runtime compatibility test, future scheduled execution,
assigned human editor, learner study or completion of other closure requirements.


## Familiar primitive-values source review

The [S03 review](JAVA_PRIMITIVES_SOURCE_REVIEW_2026-10-21.md) covers all ten PDF pages for course
entries 4/5, not merely the public viewer. It records the 2,507,604-byte source hash, Java 17
primary sections, one executed original program and five expected compilation failures. Important
source corrections cover boolean defaults, operand-driven promotion, UTF-16, widening precision
and the exact binary32 value of 0.7f. No overlapping canonical factual error was found; the
existing 13.25 worked example stays intact. Missing beginner details are a separate content unit.
No source pages or transcripts are republished; remaining notes/navigation/real pilot stay open.


## AI-assisted engineering and primitive teaching integration

The [AI-assisted review exercise](../examples/engineering-workflow/AI_ASSISTED_REVIEW.md) uses
three identity-pinned original teaching patches in an owned temporary repository. A real Java 17
compiler rejects the invented String API; a compiling alternative fails the independently written
enterprise/urgency rule; the one-line Locale.ROOT repair passes all seventeen original cases and
three separate Turkish-locale cases. Protected tests remain unchanged, actual jdeps reports only
java.base, and the existing offline Maven probe loads codec 1.0 then 2.0 under dependency management.
The [final-byte local CLI receipt](evidence/AI_ASSISTED_REVIEW_2026-10-21.json) comes from integrated
b3af01c, after the patch fixture formatting/pins were finalized. No stale earlier report is used.
The nine focused tests pass, covering changed fixture rejection, path/test boundaries, CRLF,
owned cancellation, output bounds and preservation of another repository under hostile Git state.
Existing Verify's engineering-workflow discovery includes the new tests; integrated CI/release is
still required. These are reviewed fixtures, not live coding-provider or human comprehension results.
An owned temporary directory and filename allowlist are explicitly not a sandbox for arbitrary Java.

The separate content units c31dc62 and 22fd9bd connect sampling/agents to that exercise and fill
the reviewed primitive gaps. Java memory now includes short, fixed local var, naming legality,
constant assignment versus promotion, float precision loss and overflow-before-widening, with an
actually compiled Java 17 excerpt. Its existing 13.25 example, headings, diagrams, questions and
rubrics are unchanged. The source-review and learner-pilot boundaries remain separate.

Integrated local checks pass: all thirteen engineering-workflow tests (new nine plus existing
four), all 279 focused Markdown/parser tests, all 68 content files/83 manifest entries and all
fifteen marked runnable Java programs. The new numeric excerpt is separately compiled as recorded
in its content unit; it is explicitly an excerpt rather than a newly marked complete program.

## PR80 merged release evidence — October 21

PR [80](https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui/pull/80) merged at
2026-10-21T19:20:08Z as b9dfe35a199e6ad73e4bad012f40360c56e4408a. Exact head
1d6811700e5bd16af40c7a1fcd1b5bf0ac60f909 passed ten checks: Verify frontend, backend,
practical-ai, real-backend-journey, containers and labs, link contracts, GitGuardian and both
Vercel checks. The separate live-destinations job was intentionally skipped by PR policy;
it is not evidence that the HLD deployed mismatch was repaired. This supersedes PR80's preceding
CI-pending statements only. No human learning or model-quality gate is closed.

## Registered-partner SSRF and cancellation continuation — unreleased

The [outbound-request exercise](../examples/backend-ssrf/README.md) supplies an actual HTTP/TLS
BE-06 milestone with an operator registry, operation-specific paths, all-address validation,
numeric-peer connection preserving Host/SNI/certificate checks, redirect refusal and separate
resolver/wire/body/deadline/admission caps. Controlled child-resolver changes are not a public DNS
experiment; pure IPv6 policy checks are not IPv6 transport evidence. The isolated Python module
adds no Spring adapter or production egress enforcement. Its dedicated no-skip CI is required.

Source units 9293497/9cdf4c3/30b6af4 (integrated 58ceb69/6838623/b2e3d00) and the independent Spring Security
content unit 04159fb (integrated 3b87a11) preserve registered lesson/question/rubric/diagram identities.
The numeric-header fix proves a 5,000-digit Content-Length yields a typed body-limit result and
the next admitted request succeeds. RCA12 records cancellation ownership/setup regressions;
RCA13 records framing containment. The final sixteen-test/26-HTTP suite passes without skips,
with exact source hashes and owned cleanup; independent review confirms startup/header and
interrupted-scope-entry regressions. Exact-head CI remains required.

The released comparison and engineering helpers had the same Popen-assignment cancellation gap.
Source fix be2f439 (integrated ec7dff5) passes fifteen engineering tests, thirteen comparison tests
and the packaged eight-call fixture comparison with unchanged 3/2/4 counts. Positioned actual
TERM/INT through either process delivery or another unmasked live thread reproduces all eight
failures on the old modules and proves exact child reaping with the fix. Executable guards restore
caller handlers/masks; unguarded library calls retain host signal policy. No live model was rerun
and no prompt, dataset, model or recorded quality result changed. Final-head CI remains required.

Integrated final-byte local checks: sixteen SSRF tests/26 actual HTTP requests, fifteen engineering
tests and thirteen comparison tests pass; all 68 lessons/83 manifest entries validate. The SSRF
source-bound receipt matches all six implementation/test files. This is not remote release evidence.

## PR81 merged release evidence — October 21

PR [81](https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui/pull/81) merged at
2026-10-21T19:47:09Z as 20285fa5cb8937bd0e9f911e197c2a9f3b5eb324. Exact head
03a8344eeed8a7725708e9075a0206de165b059f passed all twelve checks: dedicated actual-http-tls,
actual-pdf-and-ocr and pgvector; Verify frontend/backend/practical-ai/labs/containers/
real-backend-journey; GitGuardian and both Vercel checks. The no-skip SSRF gate requires sixteen
tests/26 actual HTTP requests, exact source/cleanup observations, typed huge-header recovery,
startup TERM/INT and interrupted handler-installation restoration. This supersedes that module's
preceding release-pending statements. It adds no Spring outbound adapter or production egress proof.

## Two-entry familiar Java revision view — unreleased

The existing Java category route now offers **Revisit Java-by-Shrayansh**, closed initially,
with the first two reviewed entries in course order: OOP then JDK/runtime/JVM. It resolves actual
catalog topics and reuses LessonRow, bookmark/completion and learning state. Three section links
per entry, existing Practice, optional saved-reading links, original clarifications and native
source-credit links introduce no new catalog, route, preference or saved-data identity.

Four focused component tests pass, including every hash through the actual Markdown outline
pipeline, absent-catalog suppression, Java-only rendering and shared state. All830 frontend tests
and the production build pass. CSS changes regenerate all295 diagram
fingerprints; all590 existing SVG bytes are unchanged. Browser keyboard/history/target/containment,
open-content axe and the real-backend section journey are required release checks. These tests do
not establish that a real learner recognizes the course or understands either lesson; CLOSE-02
remains open until the participant task, revisions and retest are actually recorded.

The focused real-browser journey passes all six theme/width combinations, native Enter/Space and
closed-content focus, shared bookmarks/completion/drafts, exact section navigation and Back/Forward;
four open-content axe scans pass. The first broad local run found only an incorrect desktop
44px bookmark expectation in the new harness (mobile retains44px; existing desktop controls40px);
the assertion now matches the documented breakpoint contract. Final presentation wraps desktop
section links compactly and keeps the chevron beside a wrapped mobile title/count. Final-head CI
must rerun the full responsive and real-backend journeys before merge.

The separate S04 source review 3477425 (integrated a87cd58) covers all six actual PDF pages/images
and corrects wrapper mutability/pass-by-reference claims with executed Java 17 counterexamples.
The one-file teaching unit 04d0f0f (integrated 9c49d9c) adds boxing, immutable Integer alias
reassignment and null unboxing at600 reported lines. All22 headings, four diagram bodies,
eleven prior fenced examples and the whole misconception/interview/rubric/Further Reading tail
are unchanged. The new excerpt actually prints301 /300 then throws NullPointerException;
the existing marked ReferenceDemo still compiles/runs with its expected output. Broader source
review and real learner recognition remain open. RCA14 records and resolves a local documentation
merge error before publication; complete instructions and architecture tails are preserved.

The first PR82 CI run completed the real-backend journey but exposed a missing literal migration
citation in the compressed reference prose. Source c0a424a (integrated7ea7a72) restores the exact
explanation at600 lines; the unchanged migration gate passes109/109. RCA15 records the omitted
local gate and requires it for future paraphrases as well as deletions. No migration ledger or
test is weakened; final-head CI remains required. The final integrated reader/component run passes
269 tests and the full content gate passes68/68 with83 mappings.

## PR82 merged release evidence — October 21

PR [82](https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui/pull/82) merged at
2026-10-21T20:14:42Z as 0b934e5369b535bb788c228b74e6103635499dd1. Exact head
ed9703fb551894e27ab44b031d874530f0f8f51c passed all nine checks: Verify frontend/backend/
practical-ai/labs/containers/real-backend-journey, GitGuardian and both Vercel checks.
Frontend includes the full familiar-revision keyboard/history/shared-state journey, open-content
axe scans in both themes, all830 unit tests,590 diagram decodes,68/83 content checks and the
unchanged109-entry migration gate. The real-backend check independently follows the new course
link to actual rendered content and checks canonical titles/counts. This supersedes preceding
PR82 release-pending statements; no learner recognition, screen-reader or zoom session is claimed.

## Configuration and JDI continuation — unreleased

Source c8e92fc0930c298b16eb90c40a1a0fda081d73df (integrated 1148cf4) supplies
`examples/backend-debugging`. Six actual launches demonstrate resource/profile/environment/CLI
precedence with safe origins, real bound exposure and health/metrics HTTP, plus typed bad-port
configuration-condition conversion and repaired startup. Unchanged TaskTracker source/resources
provide real default/production beans; no test-property precedence or actuator/env endpoint is used.

The actual JDI exercise compiles unchanged domain source with debug symbols, launches its own
synthetic target behind an ephemeral loopback listener, evaluates three observed breakpoint states
with one match, steps into service/repository and observes the caught IllegalArgumentException.
All six native tests pass, including real cancellation ownership, bounded execution/output, report
privacy, source preservation and cleanup. Dedicated final-head CI must prove the actual integration
cases; compilation or the four guard tests alone cannot close them. No GUI/human IDE, unfamiliar
repository, private configuration inspection or production debugger session is claimed.

Follow-up ef46260a570a582b160332ea767be7e7ccf4c564 (integrated 9fa4862) records the actual
runtime of every Spring child, including failed startup, the debugger and its attached debuggee.
Compiler target17 is separate metadata; all actual child feature gates require17. Protocol-reported
debuggee version may omit a build suffix and is not substituted for Runtime.version(). The final
six-test run and exact workflow evidence checks pass with imported sources and cleanup verified.
The [persistent local receipt](evidence/BACKEND_DEBUGGING_2026-10-21.json) retains actual safe
origins, runtime/event observations and source/report hashes. No other-major runtime was executed;
negative receipt tests are not a cross-JDK experiment. Remote release CI remains required.

## PR83 merged release evidence — October 21

PR [83](https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui/pull/83) merged at
2026-10-21T20:31:47Z as fb2fd2d6cdfb4e2bb6eaa7f3036b6567a5435b4d. Exact head
79b16209708f87843ed97513b7cc8a8cb71fa4a9 passed all ten checks: dedicated actual-spring-jdi;
Verify frontend/backend/practical-ai/labs/containers/real-backend-journey; GitGuardian and both
Vercel checks. The dedicated job requires six actual Spring configuration launches, observed
Java17 runtimes, actual JDI breakpoint/step/exception events and owned cleanup with zero skips.
This supersedes the configuration/JDI module's preceding release-pending statements. It does
not establish GUI IDE proficiency, other-major compatibility or a real learner session.

## Concurrent Kafka recovery continuation — unreleased

Sources59ac491/2f8ebb0 (rebased integration; original local0aa6bb7/305da3b) add a real Kafka group scenario to the existing
messaging lab. Two owner threads poll a fresh two-partition topic; broker membership/assignment and
callbacks independently establish one→two→one ownership. The departing member commits a local
effect without its offset. The survivor must observe the identical partition/offset/event, report
durable deduplication, accept a fresh marker and demonstrate actual final broker commits. The
owned topic/group, owner threads and job containers must all be removed before cleanup is claimed.

Independent review identified pending-wakeup ordering around explicit unsubscribe. The final test
uses owner-thread close, whose pinned Kafka client disables wakeups before revocation, and forces
a wakeup immediately before close with completed offsets still present. A successful callback commit
and matching final broker offset are mandatory; genuine errors are not swallowed. This is controlled
member close, not process kill, session expiry, broker failover, throughput or global exactly-once proof.

The initial native suite discovered22 tests, passing19 with the three actual broker cases explicitly
skipped because Docker is unavailable locally. Final source compilation passes and independent
review finds no remaining concrete blocker. The dedicated actual-brokers workflow requires all
three broker test classes without skips plus the complete rebalance receipt. Actual execution and
release remain pending until that job succeeds; no native observation is promoted to broker evidence.

## Nginx gateway continuation — unreleased

Sources132f5b3/33f15ce/a5b685e (integratedb1570bc/3c2cfe1/99e89a2) add the isolated
[gateway learning journey](../examples/backend-gateway/README.md). The unchanged service retains
Basic authentication, role/owner checks and CSRF while actual Nginx controls routing, forwarding,
request bounds and a per-peer limiter. The auth subrequest is a fixed one-row read, not a new
stateless authentication service. Native14/14 guards pass independently, including Java17 fixture
compilation and the leader-exit descendant cleanup regression recorded in RCA16.

The dedicated actual-nginx-http job must execute all20 HTTP assertions without skips and verify
source hashes, actual Nginx1.30.6, worker replacement, response/log distinctions, and exact labelled
resource cleanup. No local Docker/Nginx execution is claimed. TLS, multi-node fairness, production
proxy trust/egress, capacity and cloud policy remain separate work. Final-head CI/release is pending.

## PR84 merged release evidence — October 21

PR [84](https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui/pull/84) merged at
2026-10-21T20:40:52Z as941e8a2d979f317e61fe92087893d22adecb63f9. All ten checks passed at
exact head9cc3fc411863c7d64d410db1cac552e784a625bb, including actual-brokers, Verify's six jobs,
GitGuardian and both Vercel checks. The [actual broker job](https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui/actions/runs/39671778169/job/119471229127)
ran all22 tests without skips, required the three broker suites and verified exact cleanup.

The [persistent sanitized receipt](evidence/KAFKA_REBALANCE_2026-10-21.json) retains the original
artifact/report and executed-source hashes. Actual broker state moves one→two→one; partition1,
offset0 is applied by B without a broker commit, replayed by A with no second effect, then followed
by a fresh offset1 record and actual next-offset2 commit. Both owner threads stop; the generated
topic/group and job containers are removed. This supersedes Kafka's preceding CI-pending notes,
not the open multi-broker/failover/process-crash or global exactly-once limitations.

### Gateway real-service setup failure and repair — October23

PR85's first actual-nginx-http run39672590492 failed before HTTP because the internal-only gateway
had a null actual port binding. Its failed receipt confirms zero cases and successful cleanup;
this is a release blocker. Source1c095b7 adds a gateway-only publishing bridge, actual network/
loopback-binding observations, typed missing-binding rejection and cleanup for both exact networks.
All15 native guards pass. RCA-2026-10-23-01 distinguishes the observation from the upstream report
and leaves actual20-case CI/release pending. The backend remains on the internal network only;
the gateway ingress bridge is not a production outbound firewall.

### Gateway actual network proof and diagnostic resource repair — October23

Run39996822363 confirms the original network diagnosis: actual Docker29.4.2 reports running Nginx
with null publication before ingress attachment, then the correct loopback mapping and internal-
only backend membership afterward. Four real HTTP assertions pass. A second diagnostic JVM then
fails native thread creation under the configured32-PID/96MiB probe limits. The failed receipt
records cleanup; exact cgroup exhaustion was not observed. Source2f326b6 reuses the existing server
JVM for the same fixed forged-identity service request, retaining all20 assertions and requiring
an observed single JVM/PID cap. All15 native guards pass. RCA-2026-10-23-02 records evidence and
limits; complete actual Nginx CI remains pending before merge.

## Authenticated session/WebSocket continuation — unreleased

Source6d5c389 plus the admission correctionb93a49d (integrated337d267/68ab14c) add a narrowly
scoped session-login/socket exercise using unchanged Task Tracker production source. All22 actual
HTTP/session/WebSocket cases,9 policy tests and5 Python harness tests pass without skips. Actual
Java17, Boot4.1.1, Framework7.0.9 and Tomcat11.0.24 are observed. The
[local final-source receipt](evidence/WEBSOCKET_SESSIONS_2026-10-21.json) binds the checked source,
JAR and sanitized transport observations. Remote integrated release remains required.

RCA17 records the reproduced invalidation-before-admission defect and live-session membership fix.
A test-only filter holds a real authenticated upgrade across actual reauthentication; the old
principal is refused and the fresh session succeeds. Other cases cover fixation/CSRF, exact Origin,
roles, whole/fragmented message bounds, ACK pressure, command/idle limits, logout, independent
servlet expiry, unchanged REST checks and shutdown. This is local JSON echo with bounded state,
not distributed revocation, TCP receive-window saturation, TLS, production capacity or a human
browser/learner session. BEC12/56 and BE06 advance; broader service/gateway work remains separate.

### WebSocket cold-run preparation and cleanup — October23

PR86's first dedicated job failed with only a generic LabFailure; its raw private output was
correctly withheld, but the exact failing phase was not retained. An independently controlled
Maven cache proved old skipTests preparation succeeds without resolving the JUnit provider and
then fails offline. Sourcef31d66a prepares through all9 policy tests, retains full offline transport
verification and adds phase/owned-test-line-only diagnostics. The repaired controlled cache passes
both preparation and offline verification. The [new final-source local receipt](evidence/WEBSOCKET_SESSIONS_2026-10-23.json)
records all22 actual cases and observed offline/preparation metadata; the October21 receipt remains
historical. All8 Python guards pass, including scope-entry restoration and first-signal successful
cleanup; the original cleanup implementation fails both new signal subcases. RCA-2026-10-23-03
records these scoped observations. Remote actual-service CI remains a release gate.

## PR86 merged release evidence — October23

PR [86](https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui/pull/86) merged at
2026-10-23T18:05:39Z asb1487113ba27b35cf1a4e85e83659a9d5a119c3f. Exact head
f7b2a41d4d3ad054e021bc0bdd81aa41c81fcd41 passed all ten checks: actual-session-websocket,
Verify's six jobs, GitGuardian and both Vercel checks. The actual job39998324394 observes Java
17.0.20.1+1, all22 transport cases,9 preparation policy tests followed by offline verification,
source hashes matching the submitted head, closed application contexts and zero active reservations.
This supersedes earlier WebSocket release-pending notes, not human/browser, distributed-session
or TCP-stall limitations. Core platform and real-backend browser checks also pass.

### Gateway timeout evidence correction — October23

Run39999874593 proves13 actual HTTP assertions and the single-JVM32-PID diagnostic setup before
a stalled-body EOF defeats the old client408 expectation. Source0e4192e records wire outcome
separately and additionally requires the exact Nginx log408, while retaining logs on failed runs.
All16 native guards pass, including controlled realTCP408-versus-EOF distinction; final actual
Nginx all20-case execution remains pending. RCA-2026-10-23-06 records the missing historical logs
and selected-source finalization behavior without claiming every disconnect is a timeout.

## Expanded PostgreSQL concurrency continuation — unreleased

Source8d10fbd extends the existing [persistence incident guide](../examples/backend-persistence/README.md)
with real PostgreSQL16 isolation histories, repeatable-read write skew, serializable rejection and
whole fresh-transaction retry, finite exhaustion/nonretryable-state policy, observed two-way blocker
cycle and consistent-order repair, OCC/pessimistic updates, composite covering-index XML plans and
mutable-order pagination counterexamples. Existing JPA/pool/migration/restore exercises are retained.

The [final-source local receipt](../examples/backend-persistence/evidence/2026-10-23-local.json)
records all12 actual tests without skips, ten case groups, source identity, equivalent restored
data/constraints/sequence state, observed Java17/PostgreSQL16.15/JDBC42.7.13 and exact generated
role/database removal. All14 Python guards pass, including the positioned actual TERM/INT cleanup
regression whose original code failed both subcases (RCA-2026-10-23-09). No shared server was stopped.

The dedicated workflow resolves the complete Maven provider graph before provisioning its owned
PostgreSQL container, then requires the full offline actual suite, case receipt and cleanup. Final
Docker CI/platform checks and release remain required. Known-aborted retry scheduling is not a
hard preemption deadline; policy assertions for unknown connections/lock timeouts are not induced
network-failure evidence. No replication, HA, other-engine, production capacity or human outcome
is established. This advances BE03 and BEC14–19/23/37/69 without closing their full learning gates.
