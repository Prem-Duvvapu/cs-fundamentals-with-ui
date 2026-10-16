# Backend engineering and practical AI/ML learning plan

Prepared: 2026-10-16. Status: **planning complete; implementation pending**.
Baseline: repository `main` at `c5e5df1` (PR #52). This is a new learning-depth roadmap, not a claim that the current application is unfinished or that the work below has shipped.

## 1. Goal, audience and boundaries

Prepare a backend engineer with roughly two or more years of experience to understand, build, test, operate, debug and discuss modern backend and AI features. The AI path assumes **zero AI/ML knowledge**. It may assume basic programming; Java, HTTP, SQL and Spring prerequisites must be explicitly linked rather than silently expected.

The requested outcome has three equally important parts:

1. **Daily work:** build a useful feature and make a defensible implementation choice.
2. **Debugging:** use evidence to distinguish failure causes, fix the right layer and prevent recurrence.
3. **Interviews:** explain the mechanism, example, trade-off and failure case without memorizing isolated definitions.

The primary expansion is the AI/ML learning path discussed with the user, including three connected projects. A supporting backend track closes the production/debugging gaps identified in the preceding review. Platform closure tasks remain visible separately.

This plan extends `plan.md`, `JAVA_LEARNING_PLAN.md` and the dated accuracy reviews; it does not replace their historical evidence. The October 5 UI/UX refinement is delivered and is not a new redesign task here. The Java-by-Shrayansh alignment remains its own source-review task.

Do not add accounts, automatic grading, mandatory paid models, model-training infrastructure, analytics events, a new UI framework or another curriculum registry. Advanced GPU kernels, distributed training, model research and multi-agent orchestration are optional specialist follow-ups, not prerequisites for a competent backend engineer.

## 2. Verified starting point and important corrections

Inspected the current registry, AI lesson headings and relevant sections, example directories, content contract, CI and completion records. This is a scoped planning review, not a fresh sentence-by-sentence technical audit or test run.

- The registered curriculum contains 68 lessons, including seven AI/ML and five DevOps lessons. Completion records report 68 scoped technical reviews, 953 questions and 56 authored rubrics.
- The UI refinement is merged. Its results record explicitly leaves learner sessions and manual screen-reader verification open.
- The existing AI material already covers sampling, ticket classification, AI-assisted coding, tool authorization, MCP distinctions, streaming, cancellation, evaluation, security, cost and access-aware RAG in varying depth. **These are not wholly missing topics.** The work is to connect, clarify, exercise and verify them.
- `examples/labs/aiml/observe.py` provides synthetic metric/feature-availability exercises. It makes no model calls and does not prove live model, vector database or agent behavior.
- Task Tracker already demonstrates practical Spring behavior. Reuse it for backend extensions instead of starting a second unrelated CRUD tutorial.
- Several older plan tables still label delivered features as planned. Reconcile status against code and newer records before prioritizing work.

### Existing AI lesson map

| Canonical topic | Existing source | Retain and deepen |
|---|---|---|
| `ml-fundamentals` | [ML fundamentals](content/aiml/07-ml-fundamentals.md) | Plain-language vocabulary, rules versus learning, classical models, leakage, metrics and model-selection reasoning |
| `llm-parameters` | [Sampling and agents](content/aiml/04-llm-parameters.md) | Tokenization, generation, beginner transformer explanation, prompt/context design, tools, agent/MCP distinctions and coding workflows |
| `embeddings-vector-db` | [Embeddings](content/aiml/01-embeddings-vector-db.md) | Similarity versus relevance, exact/approximate retrieval, filters, index behavior and embedding migrations |
| `rag-architecture` | [RAG](content/aiml/02-rag-architecture.md) | Complete ingestion/query lifecycle, permission enforcement, citations, freshness and evaluation |
| `model-serving` | [Serving](content/aiml/03-model-serving.md) | Application API integration, streaming, performance, costs, rollout and model/provider failure diagnosis |
| `feature-stores` | [Feature stores/MLOps](content/aiml/05-feature-stores.md) | Data/feature lineage, point-in-time correctness, model release lifecycle, drift and delayed labels |
| `recommendation-systems` | [Recommendations](content/aiml/06-recommendation-systems.md) | Candidate/ranking mechanisms, feedback bias, offline versus online metrics and a small worked dataset |

## 3. Instructional design and lesson boundaries

### Required teaching sequence

For each new or substantially improved concept, use:

**Concrete problem → plain-language mental model → vocabulary → smallest worked example → trace/output → change one thing → diagnose a failure → interview explanation.**

- Introduce percentages, probability, vectors and matrix notation through small numbers before formulas. No calculus prerequisite for the beginner path.
- Explain where analogies stop being accurate. A model is not a database, a vector distance is not correctness, and valid JSON is not a correct answer.
- Make prerequisite links explicit. Reading an Expert tier must not be necessary to start the next Beginner tier.
- Preserve canonical topic IDs, heading anchors and question identities whenever possible. Append questions without renumbering existing identities; if the 12–15 question contract is full, improve existing answers/rubrics and place extra practical prompts in lab guides rather than breaking the parser contract.
- Use the existing six-label answer rubric. Each changed lesson should have at least three carefully chosen scenario rubrics, reusing suitable existing questions. This is a priority target, not a demand to create 953 rubrics immediately.
- Every changed lesson gets a predict/change/debug exercise with an explained answer and a link to a runnable artifact where appropriate.

### Where the material lives

Keep the seven canonical AI lessons as concept owners. Put extensive installation steps, incident runbooks, fixtures and project walkthroughs in proposed `examples/ai-backend/` and `examples/labs/backend/` directories. Link them from their owning lesson using the application's supported Markdown-link behavior and verify the links in the browser. Do not turn an existing lesson into a multi-thousand-line manual.

Follow `content/CONTENT_SPEC.md`: one content file per content-edit work unit; no Java/JS/JSON/registration changes within that unit. Separate integration work units own executable examples, CI, documentation and any metadata updates. The current plan requires **no new registered topics**. If implementation demonstrates that a standalone topic is essential, record a separate proposal and revise the authoring/registration contract in an explicitly scoped integration change before adding it; do not assume the “already registered” rule covers a new topic.

Create a plain Markdown learning-path guide at proposed `docs/BACKEND_AI_LEARNING_PATH.md`, linked from the existing lessons and README. It should point to canonical routes and files, not become a second implementation registry.

## 4. AI capability coverage and acceptance map

Every row is required for the practical AI path unless explicitly marked optional. “Extend” means the underlying idea already appears in the corpus; it does not claim a complete lab exists.

| ID | Capability | Planned teaching and practice | Concept owner / evidence |
|---|---|---|---|
| AI-01 | AI/ML from zero | AI/ML/deep learning/generative AI; features/labels; training/inference; regression/classification/clustering; simple rule and classical-model baselines | ML fundamentals; learner predicts a tiny example and explains why ML is or is not warranted |
| AI-02 | Evaluation foundations | Splits before preprocessing, entity/time leakage, imbalance, precision/recall/F1, threshold trade-offs, regression error, calibration versus confidence | ML fundamentals; hand calculation plus executable checks using held-out cases |
| AI-03 | How LLMs work | Tokens, embeddings, attention, transformer blocks conceptually, next-token generation, pretraining, instruction/preference tuning, context window and hallucinations | Sampling + ML foundations; trace a small illustrative sequence without pretending it reproduces a real model |
| AI-04 | Prompt and context engineering | Task instructions, examples, delimiters, context selection, history/truncation, summaries, prompt versions and prompt caching boundaries | Sampling + RAG; compare a controlled prompt change on the same dataset |
| AI-05 | Model API integration | Credentials, provider adapters, structured output, semantic validation, refusals, truncation, streaming, cancellation, usage and bounded retry | Serving + Project A; real HTTP contract tests and opt-in live verification |
| AI-06 | Embeddings and retrieval | Similarity metrics, lexical baseline, dense/hybrid search, reranking, ANN recall, filters and incompatible embedding spaces | Embeddings + Project B; compare exact/ANN/relevance measurements separately |
| AI-07 | RAG lifecycle | Parse/chunk/index/query/cite, document versions and deletions, reindexing, ACL changes, tenant boundaries, missing evidence and abstention | RAG + Project B; permissions, freshness and deletion tests |
| AI-08 | Tools, agents and MCP | Deterministic workflow versus agent, JSON schemas, authorization, MCP host/client/server and discovery, durable execution, human approval, stopping conditions | Sampling + Project C; enforce permissions outside the model and reproduce a retry/restart |
| AI-09 | Quality and regression evaluation | Dataset provenance, expected answers/sources, retrieval and generation metrics, judge limitations, human calibration, versioned reports and release comparison | RAG/Serving/MLOps + shared evaluator; changed prompt/model produces an inspectable report |
| AI-10 | Security/privacy | Direct/indirect prompt injection, unsafe output use, exfiltration, tenant leakage, tools as privileged boundaries, secret handling, retention and audit | All three projects; adversarial cases cannot cross deterministic permission boundaries |
| AI-11 | Operations and debugging | Trace retrieval/model/tools separately; queue/first-token/total latency; failure classification; rate limits, circuit breakers, concurrency and fallbacks | Serving + incident pack; evidence identifies the failing stage |
| AI-12 | Cost, capacity and model choice | Cost per accepted result, token budgets, cache hit rate, quality/cost comparison, hosted versus self-hosted, quantization, context and reasoning-budget trade-offs where supported | Serving; reproducible report with declared assumptions, no undated price claims |
| AI-13 | Adaptation decisions | Prompt versus retrieval versus fine-tuning; data rights, suitability, overfitting, evaluation, adapters/LoRA conceptually and when a template suffices | ML/MLOps; written decision record and counterexample; training a large model is not required |
| AI-14 | AI-assisted engineering | Repository investigation, small code changes, test generation, debugging hypotheses, reviewing diffs and verifying APIs/dependencies; protect secrets and company data | Sampling + coding workflow exercise; human-verifiable patch and regression test |
| AI-15 | Multimodal inputs | Text PDFs versus scans/OCR, tables/layout, images, transcription, input limits, citations to pages and image-borne instructions | Project A extension; annotated PDF/image fixtures with expected extraction and rejection cases |
| AI-16 | Classical ML lifecycle | Missing values, preprocessing fitted on training data, simple training example, reproducible splits, artifact/version records, drift versus quality loss and rollback | ML/MLOps + small optional-dependency Python lab; one actual small model run, not only fabricated predictions |
| AI-17 | Recommendation systems | Candidate retrieval versus ranking, eligibility filters, cold start, biased logs and offline versus online outcomes | Recommendations; small runnable ranking example and explained limits |

For AI-16, actual small-model training is part of learning completion; a Python virtual environment and pinned lightweight dependency are acceptable. It must not require GPU hardware or become a prerequisite for calling a model API. For AI-17, no production recommendation deployment is required.

Optional specialist follow-ups: gradient derivations, training large transformers, distributed GPU parallelism, CUDA kernels, custom inference runtimes, complex multi-agent systems and model research. Provide further-reading links without making these graduation gates.

## 5. Beginner-to-practical learning sequence

1. **Orientation:** AI terminology, one non-AI rule, one classification example and when the rule is preferable (AI-01).
2. **Trust a measurement:** features/labels, leakage, confusion matrices, splits and a tiny classical model (AI-02/16).
3. **Understand generation:** tokens, attention conceptually, sampling, training versus inference and uncertainty (AI-03).
4. **Build Project A:** prompt/context, HTTP model integration, structured extraction, validation and failure handling (AI-04/05).
5. **Measure Project A:** held-out cases, task-specific quality, latency/cost and one controlled model/prompt comparison (AI-09/12).
6. **Build Project B:** embeddings, retrieval, permissions, ingestion changes, citations and abstention (AI-06/07).
7. **Build Project C:** deterministic tools first, then a bounded agent and MCP boundary demonstration (AI-08).
8. **Break and recover all projects:** security, deadlines, provider failures, traces and regression tests (AI-10/11).
9. **Choose adaptations:** compare no AI, a small model, prompting, RAG and fine-tuning for stated constraints (AI-13).
10. **Use AI at work and accept richer inputs:** verified coding workflow, PDFs/OCR and modality-specific tests (AI-14/15).
11. **Explore adjacent ML systems:** feature stores and recommendation mechanisms after the core product path (AI-16/17).

Security and evaluation begin with the first API call; later stages deepen them rather than postponing them. Each stage has an explain/build/debug checkpoint. Learners can study concept tiers before installing project dependencies.

## 6. Three connected projects

Use one small support-service domain and a proposed `examples/ai-backend/` project with independent milestones and run instructions. Keep this separate from the educational platform's backend: it is teaching code, not a new production AI feature on the site. Preserve Task Tracker for the general backend track.

### Shared engineering contract

- Java/Spring first. Verify compatible stable Java/Spring Boot/Spring AI combinations before choosing a pinned stack. Default to the repository's Java baseline where compatible; clearly isolate and document any higher minimum instead of upgrading the entire platform.
- Teach the HTTP/JSON boundary before framework convenience APIs. Implement one provider adapter well; a second can demonstrate a real portability difference after the core works.
- Default execution uses a deterministic local fake provider through HTTP; required CI uses no paid service and no secret keys. Fake responses must be labelled as fixtures.
- Supply opt-in live-model mode, explicit environment variables, request/token caps, a configurable spend ceiling and cleanup. Provider availability or payment must not be needed to read the lessons or run deterministic exercises.
- Supply one locally runnable real model option if feasible for documented hardware. Do not promise acceptable latency on an unmeasured laptop. Record actual model/runtime/license/hardware used.
- No production/customer data. Use original synthetic support documents and orders, two explicit tenants, and a small authorized-user matrix. Include English and a small mixed-language slice where the chosen model claims support; report per-slice errors rather than assuming language parity. Secrets and raw sensitive prompts stay out of logs and committed reports.
- Include filename, imports/configuration, versions, start commands, test commands, expected output, negative cases and reset instructions. Distinguish excerpts from runnable code.
- Live semantic quality is measured separately from deterministic contract correctness. A fake-provider CI pass never closes the live-model acceptance gate.

### Project A — Structured support-ticket extraction

**Outcome:** accept a ticket or small document and return a validated Java object containing category, priority, summary and supported extracted fields.

Implementation milestones:

1. Define schema, field meanings, unknown/null policy and a keyword/template baseline.
2. Call the fake provider with explicit timeout/error behavior; parse complete output into Java types.
3. Add deterministic field validation and semantic checks against source data. Reject unauthorized categories and unsupported values; do not silently “repair” an invented order ID.
4. Add optional streaming for presentation, with partial output marked provisional until validated. Never execute an action from partially parsed tool arguments.
5. Run an opt-in live provider/local model, record versions and evaluate held-out examples.
6. Add text PDF, scanned/image and table fixtures; explain extraction/OCR limits. Every accepted field retains source provenance where applicable. Audio transcription may be an optional extension with its own fixture/evaluation notes.

**Must test:** malformed JSON, schema-valid wrong data, refusal, truncation, timeout, 429, response-size limit, malicious text, disconnect/cancellation, retry exhaustion and missing evidence.

**Interview evidence:** explain why structured output helps, what it cannot guarantee, how to measure extraction correctness and when a rule is enough.

### Project B — Permission-aware knowledge assistant

**Outcome:** answer questions over a small versioned support knowledge base with authorized citations and a useful “insufficient evidence” response.

Implementation milestones:

1. Add ingestion with document ID/version, parser, chunk policy, source locations, embedding model ID and authorization metadata.
2. Establish lexical search first, then a pinned PostgreSQL/pgvector configuration and real index/query exercise. Add hybrid retrieval/reranking only with a measured comparison.
3. Enforce tenant/user permissions in the retrieval path and again before returning sources or executing tools. Include authorization scope and document/embedding version in cache design.
4. Build context within a declared budget and validate citation IDs against retrieved allowed sources. Cite only evidence actually used; generated citations are not trusted automatically.
5. Handle changed/deleted documents, revoked access, duplicate ingestion, reindexing and embedding dimension/model changes without mixing incompatible vectors.
6. Evaluate retrieval separately from generation; demonstrate a retrieval miss, a correct retrieval with a wrong answer and an unanswerable question.

**Must test:** cross-tenant queries, guessed document IDs, revoked ACLs, stale/deleted content, cache isolation, indirect prompt injection, empty retrieval, missing citations and index/model mismatch.

**Interview evidence:** explain chunking/retrieval decisions, freshness and authorization, why vector similarity is not relevance, and how to locate a hallucination's cause.

### Project C — Controlled tool workflow

**Outcome:** investigate an order/ticket and propose a permitted action; execute a mutation only through application policy and an explicit approval bound to that exact action.

Implementation milestones:

1. Implement a deterministic workflow with read-only `lookup_order` and `search_policy` tools. Compare it with an agent only when dynamic selection has a real benefit.
2. Define schemas, authenticated identity, tenant scope, business policy, argument validation and response-size limits in code. Never accept a tenant ID or permission invented by the model as authority.
3. Add a fake consequential operation such as creating a refund request in local storage. Require an expiring approval tied to principal, exact arguments and current resource version; a changed action needs fresh approval.
4. Store durable operation state and an idempotency key. Simulate timeout after commit and process restart; reconcile the outcome before retrying.
5. Add limits for calls, elapsed time, generated tokens and spend. Define terminal success, refusal, tool failure, exhaustion and cancellation states.
6. Demonstrate a local MCP server/client integration for a read-only tool, including host/client/server roles, capability discovery and the separate authorization boundary. MCP connectivity does not grant business permission.

**Must test:** forbidden tool, schema-valid unauthorized argument, altered approval, duplicate delivery, timeout after side effect, restart, infinite-loop proposal, oversized output and malicious tool/document content.

**Interview evidence:** explain workflow versus agent choice, protocol versus authorization, duplicate prevention and why a retry cannot promise universal exactly-once effects. Teach least-privilege tool installation and review of server provenance; remote protocol authentication and per-action business authorization are separate checks.

## 7. Evaluation, security and operational evidence

### Evaluation fixtures and reports

- Start with at least 30 curated development cases and 20 held-out cases per project; include success, ambiguous/unanswerable, adversarial and operational failure categories. These are teaching-suite minimums, not statistically reliable production guarantees.
- Record dataset provenance, expected fields/allowed sources/actions, tenant identity, case type and rationale. Do not tune against the held-out set; version later additions separately.
- Record model/provider/API, prompt/schema, retrieval settings, embedding version, tool policy, source revision and run time. Label repeated stochastic runs and sample size.
- Report Project A schema validity separately from field correctness; Project B retrieval relevance/coverage separately from answer support/citation correctness; Project C deterministic policy violations separately from task completion.
- Record tokens, retries, cancellation, time to first token where applicable, total latency and cost per accepted result. Prices must have provider/date/currency and input/output/cache assumptions; illustrative arithmetic must be labelled.
- Define quality thresholds before evaluating a candidate, based on the baseline and error costs. Require zero observed authorization bypasses/unauthorized side effects in the authored deterministic tests; do not claim this proves universal security.
- Include a documented human correction/appeal path for consequential classifications. Inspect error slices and label disagreement; do not present aggregate accuracy as evidence of equal treatment. Record provider retention/data-use settings for any live run and send only approved synthetic data.
- Use a model judge only as an additional signal with a published rubric and human-checked examples. Neither its rating nor a fluent explanation proves truth.

### Required debugging scenarios

| ID | Symptom | Evidence the learner must collect | Required resolution artifact |
|---|---|---|---|
| D-01 | Wrong but schema-valid extraction | Original source, parsed fields, semantic checks and case label | Minimal counterexample, corrected validation/evaluation case |
| D-02 | Relevant document never retrieved | Parser output, chunk IDs, filters, lexical/dense scores and source version | Identify ingestion/filter/index/ranking layer; rerun retrieval case |
| D-03 | Correct sources, unsupported answer | Exact authorized context, prompt version and cited spans | Evidence policy/abstention improvement and held-out comparison |
| D-04 | Tenant data appears in another answer | Principal, ACL decision, cache keys and retrieval scope | Deterministic isolation fix and cross-tenant regression |
| D-05 | Slow or hanging response | Queue/retrieval/model/tool spans, first-token and total deadlines | Locate bottleneck; bounded behavior and before/after report |
| D-06 | Tool repeats a write after timeout | Durable operation state, idempotency key and committed outcome | Reconciliation logic and crash/retry test |
| D-07 | Agent keeps calling tools | Step history, limits, tool results and termination state | Enforced stop condition and useful failure response |
| D-08 | Quality drops after an upgrade | Versioned prompt/model/index/dataset diff | Controlled comparison, rollback or justified acceptance |
| D-09 | Costs rise without more useful results | Token counts, context/history growth, retries and cache hits | Budget enforcement and cost per accepted result comparison |
| D-10 | PDF/image output misses a value | Source page, OCR/parser output and layout trace | Extraction limitation identified; corrected fixture or explicit refusal |

Every runbook uses **symptom → hypotheses → evidence → root cause → fix → regression test → interview explanation**. Logs must support diagnosis without collecting raw customer content by default.

## 8. Supporting backend engineering track

These packages deepen existing concepts and connect them to daily work. They are part of the broader roadmap, sequenced before or alongside the AI features that depend on them.

| ID / priority | Package and concept owners | Runnable deliverable and completion evidence |
|---|---|---|
| BE-01 / P0 | Debugging workflow: JVM, concurrency, Spring boot/MVC | IDE exception/conditional breakpoints; stack-trace reading; a high-CPU, deadlock, allocation/retention and bad-config lab; collect JFR/thread evidence and explain the diagnosis |
| BE-02 / P0 | Observability: Spring testing/production + cloud operations | Trace one request across HTTP/database/dependency; correlated logs/metrics/traces with OpenTelemetry; distinguish p95 from averages; useful alert, mitigation and postmortem |
| BE-03 / P0 | Database incidents: SQL, optimizer, transactions, JPA | Slow query, N+1, blocking transaction and pool exhaustion; inspect plans/waits; test a compatible migration and restore; compare before/after evidence |
| BE-04 / P0 | Messaging: distributed DBMS + Spring async | Small Kafka producer/consumer lab with ordering, offsets, consumer groups, rebalance, duplicate handling, DLQ, schema change and transactional outbox; crash between delivery steps |
| BE-05 / P0 | Reliability: Spring caching/async + network application layer | Deadline budget, bounded retry+jitter, circuit breaker, bulkhead, backpressure, cancellation and idempotency; inject a slow dependency and prevent retry amplification |
| BE-06 / P1 | API/security: REST + Spring Security | Tenant/object authorization tests, JWT/OAuth validation cases, SSRF restrictions, signed webhook/replay checks, secrets rotation and API compatibility |
| BE-07 / P1 | Testing/delivery: Spring testing + CI/CD | Real dependency Testcontainers exercise, HTTP stub/contract tests, concurrent requests, load-test interpretation, reproducible flaky-test fix and rollback after a bad release |
| BE-08 / P1 | Operations: Docker/Kubernetes/cloud | Diagnose failed probes, OOM kill versus Java OOME, CPU throttling, DNS/service routing, IAM denial and network restrictions; deployment rollback and backup/restore exercise |
| BE-09 / P1 | Everyday engineering: Java execution/Boot + CI/CD | Git bisect/revert, Maven dependency tree/conflict resolution, config precedence, reading an unfamiliar repo, dependency/security-update review, concise PR and incident communication |
| BE-10 / P1 | Modern Java choices: JVM/concurrency + Spring | Version-labelled virtual-thread/pool comparison under a bounded dependency; explain why more concurrency may worsen load; distinguish stable features from previews |

Use one evolving Task Tracker service plus controlled dependency fixtures. Keep infrastructure local/ephemeral by default. Cloud execution is an explicitly budgeted opt-in milestone with cleanup; local success does not establish cloud deployment success.

DSA, LLD and broader system design remain important interview preparation. Link to the sibling learning apps with prerequisites and honest independent-progress wording; verify their actual coverage before claiming a topic is already taught there. Add short decision exercises here for modular monolith versus services, cache consistency, event boundaries and API contracts where they connect to these labs.

## 9. Remaining platform and curriculum closure tasks

| ID | Task | Evidence required to close |
|---|---|---|
| CLOSE-01 | Reconcile status documentation and outdated topic tooling | Current code/release evidence replaces stale active statuses; topic listing matches the canonical registry; removal guidance no longer references removed fallback data |
| CLOSE-02 | Java course familiarity | Review remaining accessible linked notes, source/rights ledger, canonical mapping, independently written corrections and a verified two-lesson pilot before expansion |
| CLOSE-03 | Manual accessibility | Complete keyboard and screen-reader journeys plus actual zoom checks; report tool/browser/assistive technology and fixes |
| CLOSE-04 | Learner comprehension | At least one AI beginner and one backend engineer attempt explain/build/debug tasks; record confusion, revise and retest; generated personas do not count |
| CLOSE-05 | Editorial maintenance | Dated primary sources, dependency/model compatibility records and a periodic freshness checklist; no permanent “latest” claim |
| CLOSE-06 | Practice consistency | Prioritized rubrics and runnable exercises for changed lessons; canonical IDs, review history and saved drafts remain valid |

Participant availability and external-provider access are external dependencies. Finish independent work first and explicitly leave those evidence gates open until performed. Do not mark the entire roadmap complete merely because CI is green.

## 10. Implementation phases and dependency order

Each phase ends with a reviewable artifact and focused verification. Estimates are relative size (S/M/L), not promised completion times. Do not claim this roadmap can be implemented and validated in a two-hour session.

### Phase 0 — Baseline and integration map (S)

- Recheck HEAD, instructions, clean/dirty state and current delivery records.
- Create a results ledger from the IDs in this plan, initially unimplemented.
- Map every AI/BE capability to an exact lesson section, lab and test; identify actual overlap before authoring.
- Verify stack compatibility and decide fake/live profiles, dataset ownership and budgets.
- Reconcile the most misleading current-status documentation without rewriting historical records.

**Exit:** no requirement lacks an owner, artifact or acceptance check; compatibility and run modes documented.

### Phase 1 — Foundations and common debugging skills (M)

- Improve AI-01/02/03/16 and the learning-path guide, preserving existing useful content.
- Produce the tiny classical-model exercise and explain its dataset/splits/results.
- Deliver the first BE-01/02/03 exercises needed to inspect requests, JVM behavior and data access.
- Introduce the shared predict/change/debug and interview-rubric format.

**Exit:** a newcomer can explain training versus inference and diagnose a simple service/data failure with supplied evidence.

### Phase 2 — Project A with evaluation from day one (M)

- Implement fake HTTP model service, provider boundary, structured extraction and validation.
- Add prompt/context versioning, baseline comparison, dataset, report and failure cases.
- Add opt-in live execution; record actual results or keep that gate explicitly pending.
- Link the serving/sampling lessons to the exact runnable milestone.

**Exit:** deterministic contract tests pass; live-quality status is explicit; the learner can explain malformed versus semantically incorrect output.

### Phase 3 — Project B and retrieval lifecycle (L)

- Build lexical baseline and real local vector retrieval, ingestion, tenant filters and citations.
- Add changes/deletions/ACL revocation/cache and embedding-migration cases.
- Compare retrieval and answer quality separately on held-out examples.

**Exit:** real local retrieval and all authored isolation/freshness tests pass; live generation evidence is recorded separately.

### Phase 4 — Reliable side effects and Project C (L)

- Deliver BE-04/05 messaging/retry/idempotency labs before introducing consequential agent actions.
- Build deterministic tool workflow, durable operation state, exact-action approval and limits.
- Demonstrate a bounded agent and local read-only MCP integration.

**Exit:** duplicate/restart/timeout tests preserve the business invariant; no authored unauthorized action succeeds.

### Phase 5 — Production, security and richer inputs (L)

- Complete BE-06/07/08/09/10 and AI-10/11/12/13/14/15/17.
- Add multimodal fixtures, coding-assistant exercise, failure runbooks, cost reports and model/adaptation decision records.
- Exercise telemetry, rollout and rollback; label local/cloud and fake/live evidence.

**Exit:** learner can diagnose each D-01 through D-10 scenario and explain the selected design trade-offs.

### Phase 6 — Learning experience, validation and release (M)

- Verify lesson-to-lab links, canonical order, prerequisites, search/interview parsing and browser navigation in both themes.
- Run repository gates and full project-specific tests; compile/run declared examples.
- Complete available CLOSE tasks, seek real participant/accessibility evidence and report remaining dependencies honestly.
- Update README, CONTEXT, AGENTS, relevant manifests/docs and results ledger with delivered behavior.
- Commit/push/PR and merge only after required final-head checks pass under the user's standing shipping authorization. Preserve unrelated work and do not bypass protections.

**Exit:** each capability has actual evidence or an explicitly open gate; only close the full learning roadmap when all required gates are evidenced.

## 11. Verification and preservation requirements

### Preserve application contracts

- All existing topic URLs, section anchors, question identity, bookmarks, completion, drafts, answer alternatives, history, import/export and review behavior.
- All-category expandable sidebar, search/collapse state and provider location outside the route error boundary.
- Both themes, responsive reading, Markdown/math/code/diagrams and opt-in tour.
- Analytics URL redaction: no query strings/fragments, notes, answers, simulation inputs or custom learning events. Do not add telemetry from the educational site's learners for these labs.
- Learning network native same-tab links and current-subject marker; no implied shared progress.

### Required checks by change type

| Change | Required evidence |
|---|---|
| A canonical lesson | Single-file content validation, human clarity/accuracy review, browser rendering, scenario/rubric parsing and links |
| Marked Java snippet | Compile/run the actual marked source with `scripts/verify-java-examples.mjs`; include deliberately failing cases separately |
| New lab/application | Exact setup/test/cleanup instructions, positive and negative cases, declared versions, deterministic CI and separate optional live results |
| Diagram source or render input | Regenerate both themes, check manifest/fingerprints and browser-decode all generated assets |
| Cross-topic integration | Corpus/coverage/migration gates; topic and outline registration consistency; frontend/backend tests and browser journeys |
| UI/navigation/storage | Relevant interaction tests, both-theme visual/axe checks, real-backend journey and persistence regressions |
| External provider/cloud | Actual run with explicit budget/versions and cleanup; cannot be substituted by mocks or claimed from documentation |

Existing repository commands (inspect current scripts before use):

```bash
node scripts/validate-content.mjs
node scripts/audit-simulation-questions.mjs --check
node scripts/verify-java-examples.mjs
npm test --prefix frontend
mvn test -f backend/pom.xml
npm run diagrams:render --prefix frontend
npm run diagrams:check --prefix frontend
npm run diagrams:decode --prefix frontend
npm run build --prefix frontend
npm run test:responsive --prefix frontend
python3 -m unittest discover -s examples/labs -p test_labs.py -v
```

Run the existing Task Tracker Maven/HTTP/lab jobs when those artifacts change, and preserve `.github/workflows/verify.yml` gates. Add real commands for new projects only once their build files exist; this plan does not invent working commands for unimplemented files. Run focused tests during editing and the required full checks before shipping.

Content units must not delete registered files between operations. Check `RCA.md` before repeated symptoms; add evidence/root cause/fix/verification/prevention for a confirmed regression introduced during implementation.

## 12. Definition of completion and handoff

The **plan deliverable** is complete when this document maps the requested AI and backend capabilities to existing ownership, projects, phases and verifiable acceptance criteria. This does not mean its future implementation is complete.

The **implemented roadmap** is complete only when:

- [ ] AI-01 through AI-17 have reviewed teaching material and their specified exercises/evidence.
- [ ] Projects A/B/C run reproducibly and demonstrate their failure cases.
- [ ] Live-model quality evaluation is recorded; mocks are explicitly distinguished.
- [ ] D-01 through D-10 have reproducible symptoms, diagnostic evidence, fixes and regression checks.
- [ ] BE-01 through BE-10 have the specified practical deliverables.
- [ ] CLOSE-01 through CLOSE-06 are evidenced, including actual learner/manual accessibility work.
- [ ] Existing application/data/privacy/navigation contracts remain intact and required CI passes.
- [ ] Results document lists versions, commands, real counts, limitations, commits and release evidence.

Keep the capability IDs in implementation updates so partial delivery remains clear. Use the companion [implementation prompt](BACKEND_AI_IMPLEMENTATION_PROMPT_2026-10-16.md) to hand this plan to another coding agent.

## 13. Primary references and freshness policy

Use authoritative sources for version-sensitive behavior and verify them again during implementation. The priorities are an engineering recommendation for this audience, not a hiring-market survey or a claim that one stack is universally required.

- [Spring AI reference](https://docs.spring.io/spring-ai/reference/): Java integration, structured outputs, tools, observability, evaluation, RAG and MCP; verify the selected release's compatibility before pinning dependencies.
- [MCP architecture](https://modelcontextprotocol.io/docs/learn/architecture): protocol roles and capability boundaries; distinguish protocol integration from application authorization.
- [OWASP prompt injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/): direct/indirect injection and defense in depth; RAG does not eliminate injection risk.
- [OpenTelemetry Java](https://opentelemetry.io/docs/languages/java/): instrumentation and the telemetry integration used by the diagnostics track.
- [Oracle Java diagnostic tools](https://docs.oracle.com/en/java/javase/25/troubleshoot/diagnostic-tools.html): JFR/JDK diagnostics; use commands supported by the actual lab JDK.
- [PostgreSQL monitoring](https://www.postgresql.org/docs/current/monitoring-stats.html): database activity/waits and operational evidence; pin the lab server version.
- [Apache Kafka design](https://kafka.apache.org/41/design/design/): delivery and processing semantics; use the chosen runtime's matching documentation.
- [Kubernetes application troubleshooting](https://kubernetes.io/docs/tasks/debug/debug-application/): workload diagnosis and cluster evidence.

Review version-sensitive sections before each release and at least quarterly while maintained. Keep timeless concepts separate from provider/model pricing, context limits, runtime defaults and preview features. Retain dated evidence rather than repeatedly relabelling old material “latest.”
