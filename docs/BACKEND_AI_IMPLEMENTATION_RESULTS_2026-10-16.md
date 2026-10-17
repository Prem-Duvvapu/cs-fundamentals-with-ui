# Practical backend and AI implementation evidence

Baseline: `c5e5df1`. Branch: `feat/2026-10-16-practical-backend-ai`.
Plan: [capabilities and acceptance criteria](../BACKEND_AI_PRACTICAL_LEARNING_PLAN_2026-10-16.md).

## Evidence boundaries

Implementation is in progress. Fixture checks, actual HTTP calls to a local fake, real database queries, small-model training and live generative-model quality are different evidence types. No participant sessions, screen-reader results or paid/cloud execution are claimed.

## Capability ledger

| Requirement | Status | Intended outcome / evidence |
|---|---|---|
| AI-01 | Pending | AI/ML from zero |
| AI-02 | Pending | Evaluation foundations |
| AI-03 | Pending | How LLMs work |
| AI-04 | Pending | Prompt and context engineering |
| AI-05 | Partial: executable A | Model API integration |
| AI-06 | Pending | Embeddings and retrieval |
| AI-07 | Partial: versioned lexical/JDBC RAG | RAG lifecycle |
| AI-08 | Partial: bounded agent, approval and actual MCP | Tools, agents and MCP |
| AI-09 | Pending | Quality and regression evaluation |
| AI-10 | Partial: tenant/citation/action enforcement | Security/privacy |
| AI-11 | Pending | Operations and debugging |
| AI-12 | Pending | Cost, capacity and model choice |
| AI-13 | Pending | Adaptation decisions |
| AI-14 | Pending | AI-assisted engineering |
| AI-15 | Pending | Multimodal inputs |
| AI-16 | Partial: actual small-model training | Classical ML lifecycle |
| AI-17 | Pending | Recommendation systems |
| D-01 | Pending | Wrong but schema-valid extraction |
| D-02 | Pending | Relevant document never retrieved |
| D-03 | Pending | Correct sources, unsupported answer |
| D-04 | Partial: JDBC and HTTP tenant tests | Tenant data appears in another answer |
| D-05 | Pending | Slow or hanging response |
| D-06 | Partial: local commit/restart/duplicate tests | Tool repeats a write after timeout |
| D-07 | Partial: bounded read-only agent tests | Agent keeps calling tools |
| D-08 | Pending | Quality drops after an upgrade |
| D-09 | Pending | Costs rise without more useful results |
| D-10 | Pending | PDF/image output misses a value |
| BE-01 / P0 | Pending | Debugging workflow: JVM, concurrency, Spring boot/MVC |
| BE-02 / P0 | Pending | Observability: Spring testing/production + cloud operations |
| BE-03 / P0 | Pending | Database incidents: SQL, optimizer, transactions, JPA |
| BE-04 / P0 | Pending | Messaging: distributed DBMS + Spring async |
| BE-05 / P0 | Pending | Reliability: Spring caching/async + network application layer |
| BE-06 / P1 | Pending | API/security: REST + Spring Security |
| BE-07 / P1 | Pending | Testing/delivery: Spring testing + CI/CD |
| BE-08 / P1 | Pending | Operations: Docker/Kubernetes/cloud |
| BE-09 / P1 | Pending | Everyday engineering: Java execution/Boot + CI/CD |
| BE-10 / P1 | Pending | Modern Java choices: JVM/concurrency + Spring |
| CLOSE-01 | Partial: inventory/tool guidance repaired | Reconcile status documentation and outdated topic tooling |
| CLOSE-02 | Pending | Java course familiarity |
| CLOSE-03 | Pending | Manual accessibility |
| CLOSE-04 | Pending | Learner comprehension |
| CLOSE-05 | Pending | Editorial maintenance |
| CLOSE-06 | Pending | Practice consistency |

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
