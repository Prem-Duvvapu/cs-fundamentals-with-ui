# Learning, content, interview preparation and UX audit

**Latest status — October 3:** the [37-review completion ledger](CORE_ACCURACY_COMPLETION_2026-10-03.md) completes the remaining core queue: **56/56 scoped core reviews**. Earlier counts below are dated snapshots. AI/ML/DevOps freshness review and real learner evidence remain separate.

**Date:** 2026-10-01
**Audited commit:** `ddeba3d` (`main` at the start of this audit)
**Purpose:** turn a substantial reference library into a dependable, understandable learning and interview-preparation experience.
**Scope:** audit and recommendations only; this report does not implement the proposed changes.

## 1. Executive assessment

The project has a strong foundation: substantial three-tier lessons, worked examples, diagrams,
shared interview questions, real simulation engines, category paths, saved drafts and backups.
A replacement architecture or another broad cosmetic rewrite is not the highest-value next step.

The largest opportunity is to complete the learning loop:

**Choose a suitable goal → understand a small example → predict or change it → explain the
mechanism → receive useful feedback → revisit a weak area → answer an unfamiliar interview question.**

Today, the reading and reference parts are considerably stronger than feedback, deliberate practice,
retention and demonstration of understanding. Several recently added reader interactions also lose
state. Fix those before adding more controls or advertising the revamp as complete.

The most important actions are:

1. Repair reader state, reading-position tracking, question restoration and route titles.
2. Correct misleading interview answers and review simulator teaching data as carefully as Markdown.
3. Give practice questions an answer-quality rubric, follow-ups and worked reasoning.
4. Make review select the exact question and add a manageable, optional repeat-practice queue.
5. Extend the Java beginner approach into a coherent runnable Spring application journey.
6. Verify actual learning tasks, keyboard use and assistive-technology behavior, not only layout.
7. Consolidate the competing plans and publish evidence-based implementation status.

“Best” should mean that users can learn, apply, recall and explain accurately with little friction.
It cannot be established by lesson counts, test counts or visual polish alone.

## 2. Evidence, method and limits

### What was examined

- Repository status and recent commits, including the storage/backup fixes in `ddeba3d`.
- Home, category, topic, search, interview and progress implementations; shared reader, code,
  diagram and practice controls; persistence stores; catalog metadata; discovery backend; CI.
- Authoring contract, design system, existing plans, example project and RCA register.
- Automated inventory of all curriculum Markdown files.
- Representative passages in Java execution, generics, exceptions, JVM, Spring Security,
  OS synchronization, database transactions and model serving, plus retained simulator JSON.
- Current production build in Chromium with real Markdown and **stubbed API responses** from
  the repository's responsive-test harness. These are frontend interaction probes, not a live
  backend integration or deployed-site audit.
- A 375 × 812 light-theme reader screenshot and category screenshot. The reader's first prose
  begins roughly 590px down the viewport; this is an observation, not a universal failure threshold.

### Checks run during this audit

| Check | Current result | What it establishes |
|---|---|---|
| Production build, Node 24.21.0 | Passed | Current source bundles successfully |
| Build-time diagram check | 295 entries / 590 assets current | Manifest, assets and fingerprint consistency |
| Full content validator | 68/68 lessons; 83 applicable coverage entries passed | Structural and parser contract compliance |
| Focused Vitest suites | 24 tests passed in 2 suites | Existing InterviewDeck and learning-backup tests pass |
| Chromium interaction probes | Four findings below; no captured page errors | Specific state/navigation behavior |

Commands: `npm run build --prefix frontend`; `node scripts/validate-content.mjs`;
`npm test --prefix frontend -- --reporter=dot src/utils/__tests__/learningBackup.test.js src/components/__tests__/InterviewDeck.test.jsx`.
Use a supported Node release: the default shell here is Node 20.19.4, while the checks used
`/home/prem/.nvm/versions/node/v24.21.0/bin`.

Audit-session logs are in `/tmp/cs-audit-{build,content,tests,browser}.log`; screenshots are
`/tmp/cs-audit-reader.png` and `/tmp/cs-audit-category.png`. These are temporary local artifacts,
not durable repository attachments. The reproduction steps and observations are preserved below.

**Not performed:** exhaustive factual review of every paragraph, full frontend/backend rerun,
new Java-example execution, live API end-to-end run, diagram browser-decode sweep, full axe audit,
manual screen-reader audit, performance profiling, security penetration test or real learner study.
Earlier test totals are historical evidence, not fresh passes from this audit.

### Content inventory at audit start (October 1)

| Category | Lessons | Source lines | Mermaid diagrams | Interview Q&As | Marked runnable Java programs |
|---|---:|---:|---:|---:|---:|
| OS | 8 | 3,339 | 35 | 112 | 0 |
| Networking | 12 | 5,100 | 51 | 168 | 0 |
| DBMS | 13 | 6,193 | 63 | 183 | 0 |
| Java/Spring | 23 | 11,583 | 92 | 322 | 11 |
| AI/ML | 7 | 3,261 | 36 | 98 | 0 |
| DevOps | 5 | 2,500 | 18 | 70 | 0 |
| **Total** | **68** | **31,976** | **295** | **953** | **11** |

These are the audit-start source measurements; the October 1 content pass raised the live total to 32,309 lines. Counts are not educational-quality scores. Zero Java markers outside
Java is expected and does not mean those categories lack examples. At audit start, all 23 Java/Spring files contained
“Before you start”; the other categories did not use that exact label. That is a consistency signal,
not proof that no prerequisites are explained elsewhere. Six lessons lack the exact `### Further
Reading` heading: all five DevOps lessons and one DBMS lesson; this does not prove they contain no links.

## 3. Preserve these strengths

- Keep the canonical backend topic registry and validated prerequisite graph.
- Keep content-first Study, optional Simulation, and explicit Practice routes.
- Keep expert explanations, misconceptions and trade-offs while improving entry-level teaching.
- Keep pre-rendered diagrams, readable text alternatives, code highlighting and math support.
- Keep optional written answers and explicitly labelled self-assessment. Do not present confidence
  as a verified score or require an answer before allowing a learner to inspect an explanation.
- Keep local learning data, existing bookmarks and completion records compatible. The latest
  commit already adds backup validation and merge safeguards; do not reimplement those blindly.
- Keep the runnable-example gate and independent Task Tracker tests in CI.
- Preserve real simulator engines. Add guidance around them rather than decorative motion.

## 4. Prioritized findings and acceptance criteria

**Priority:** P1 = next implementation wave; P2 = subsequent learning-quality wave;
P3 = optional expansion after evidence of need. No P0 emergency is established by this audit.
**Evidence:** Browser = observed in current build; Source = implementation/content evidence;
Hypothesis = useful proposal requiring validation. Effort S/M/L is relative, not a deadline.

### A01 — Reader child controls reset during parent updates

**P1 · Browser + source · M**
Evidence: [MarkdownRenderer](frontend/src/components/markdown/MarkdownRenderer.jsx),
[TopicViewer](frontend/src/components/TopicViewer.jsx), [CodeBlock](frontend/src/components/markdown/CodeBlock.jsx).

Reproduction: open `/topic/java-execution-pipeline`, wait for the reader, turn on Wrap code for
its first code block, then toggle Focus reading. The observed `aria-pressed` value changes from
`true` to `false`. One initial probe also encountered a detached heading during a scroll action;
that failed action alone is not treated as a separate confirmed defect.

The Markdown component renderers are declared inline. New component identities on a reader
rerender provide a source-supported explanation for descendant remounts. Heading/scroll tracking
and store subscriptions make parent updates normal, not exceptional.

**Do:** stabilize renderer component identities and memoize expensive Markdown work where justified;
inspect copy status and diagram dialog state for the same mechanism.
**Accept:** wrap/copy/dialog state survives focus, font and unrelated progress updates; no detached
or recreated heading tree merely because the active section changes. Add a regression test that
updates the parent, not just a test of the isolated CodeBlock.

### A02 — Reading tracking is unreliable after returning from Practice

**P1 · Browser + source · M**
Evidence: [TopicViewer effects](frontend/src/components/TopicViewer.jsx).

Reproduction: open the Java execution lesson, switch Study → Practice → Study, scroll the last
H3 into view, and inspect `cs-fundamentals-learning-v1`. In the probe the stored heading remained
`beginner-level`, while the last heading was `further-reading`.

Source inspection shows that Practice replaces the article, while observer setup depends on
content/rendererReady/sections rather than the newly mounted article or view lifecycle. Saving
also excludes only `inactive`, rather than requiring an actual visible Study article. Exact
boundary behavior should be isolated in a dedicated regression test before changing it.

**Do:** attach observers to the current mounted article; restore the requested location before
recording a new one; save only meaningful visible reading activity.
**Accept:** direct hashes, refresh, Study/Practice/Simulation transitions and Back/Forward preserve
position; further scrolling updates the saved heading; entering Practice does not mark unseen text read.

### A03 — A saved question outside the loaded page silently changes the task

**P1 · Browser + source · M**
Evidence: [InterviewDeck](frontend/src/components/shared/InterviewDeck.jsx),
[InterviewPage](frontend/src/pages/InterviewPage.jsx).

A saved `sessions['interview:all:all']` key absent from the loaded questions falls through
`Math.max(0, findIndex(...))`. The browser displayed Q1 without a saved-question recovery notice.
The category deck initially loads 50 questions, so this is relevant to normal pagination.

**Do:** explicitly represent pending restoration; fetch the appropriate page or offer a clear
resume/load action. Scope reveal state to question identity. Remove the obsolete shuffleNonce
state/comment after confirming intended behavior.
**Accept:** save a question beyond page one, reload, and recover that exact question/draft without
silent substitution; removed questions get an explanation and a safe alternative.

### A04 — Browser titles persist across unrelated routes

**P1 · Browser + source · S**
Evidence: [CategoryPage](frontend/src/pages/CategoryPage.jsx), [App](frontend/src/App.jsx).

Reproduction: `/category/java-spring` → “All learning paths”. Both the category and home pages
reported `Java & Spring | CS Fundamentals` as the document title.

**Do:** define titles for every route and a deliberate route focus/announcement policy. Preserve
in-page reading position and tab focus when only the view or hash changes.
**Accept:** home/search/progress/interview/category/topic/error routes identify themselves correctly;
keyboard users can determine where navigation landed without unexpected focus jumps.

### A05 — Review items do not form a complete, actionable review queue

**P1 · Source · M**
Evidence: [PracticeReview](frontend/src/components/shared/PracticeReview.jsx),
[learningState](frontend/src/utils/learningState.js).

Only the first 20 matching entries render; there is no pagination. A review link opens the topic's
Practice view, not the named question. Imported conflicting drafts are retained under alternate
keys with an empty assessment, so the review filter excludes them. The inspected UI does not offer
a general saved-answer manager; `deletePractice` and `isImportedCopyKey` have no UI callers.

**Do:** provide exact-question links, pagination and a saved-answer/conflict view with compare,
copy/adopt and explicitly confirmed delete actions. Keep unknown-topic work recoverable.
**Accept:** the 21st review item and every imported alternate draft are reachable in the product;
selecting an item opens its question; exporting/reimporting does not lose either version.

### A06 — At least one interview answer teaches an overgeneralization

**P1 · Source + official reference · S for correction, L for systematic review**
Evidence: [Spring Security Q4](content/java-spring/09-spring-security.md), line 436.

The answer says HTTP 403 means Spring knows the principal and authorization denied the operation.
That is too absolute: the security filter chain can reject an invalid CSRF token with 403 as well.
The lesson itself includes a CSRF rejection diagram. Explain the usual API distinction without
claiming that a status code proves authentication state. Spring's [architecture documentation](https://docs.spring.io/spring-security/reference/servlet/architecture.html)
and [CSRF documentation](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html)
provide the relevant filter/error-handling context.

**Do:** correct the answer and add a concrete counterexample. Then run a risk-ranked editorial pass
on absolute claims, algorithm assumptions and version-sensitive behavior across all categories.
**Accept:** the learner can explain both ordinary authentication/authorization failures and CSRF
rejection; each reviewed technical claim has an appropriate version/source where needed.

### A07 — Retained simulator teaching data contains unsupported case-study precision

**P1 · Source · M**
Evidence: [B+ tree teaching data](frontend/src/data/dbms-concepts-bplus-tree.json),
[concurrency teaching data](frontend/src/data/dbms-concepts-concurrency.json),
[virtual-thread teaching data](frontend/src/data/concurrency-concepts.json),
[ConceptModuleShell](frontend/src/components/shared/ConceptModuleShell.jsx).

The `productionScenario` fields report precise incidents and performance outcomes without source
attribution: for example 8.2s→45ms p99 after changing locking, and 45,000→3 page reads after reversing
an index prefix. The B+ tree anecdote invites a universal “high cardinality first” rule without
showing predicates, ranges, ordering, data distribution or query plans. Virtual-thread data combines
CPU/socket exhaustion with a large throughput claim without a measured workload explanation.
These files are imported by retained visualizers and the shared shell renders production scenarios.

**Do:** label constructed scenarios as hypothetical and explain assumptions; use measured evidence
and links for real incidents. Review JSON and Markdown together for consistency. Do not treat
content validation of Markdown as coverage of these surfaces.
**Accept:** every quantitative production claim is reproducible/cited or clearly illustrative;
learners explain the mechanism and limits rather than memorize a performance promise.

### A08 — Interview practice stores answers but does not teach answer quality

**P1 · Source + learning-design recommendation · L**
Evidence: [InterviewDeck](frontend/src/components/shared/InterviewDeck.jsx),
[question parser](frontend/src/utils/interviewQuestions.js), current Q&A format.

The deck offers prompt, draft, model answer and three self-ratings. It has no structured checklist
of essential points, partial-credit guidance, follow-up questions or explanation of common weak
answers. A learner can feel confident while missing the mechanism or a critical limitation.

**Do:** add an author-reviewed rubric to a pilot set of 20–30 high-value questions across Java,
Spring, OS, networking and DBMS before expanding. Support a short spoken-style answer, deeper
mechanism, example, trade-off, misconception and one follow-up. Use optional detail levels.
Keep one canonical content source; introduce structured fields through a deliberate parser/API
contract, not a second hand-maintained question bank.
**Accept:** learners can compare their own explanation against concrete criteria; model answers
remain available immediately; self-ratings are never labelled objectively graded mastery.

**October 1 checkpoint:** the 20-question pilot is implemented: four questions each in Java
OOP, Spring MVC, process management, TCP, and transactions/ACID carry six authored checks
(spoken opening, mechanism, example, limit, misconception, follow-up). The deck reveals the
model answer immediately and keeps the rubric in optional details; unrubriced questions keep
general prompts. The rubric remains in the lesson Markdown and flows through the existing
interview API. This meets the pilot scope, while partial-credit examples and wider editorial
coverage still need review before claiming A08 complete across the curriculum.

### A09 — Recall practice lacks attempts, delayed review and mixed-question sessions

**P2 · Source + hypothesis · L**
Evidence: [learningState](frontend/src/utils/learningState.js): each question holds its latest draft,
assessment and timestamp, not an attempt history or due date.

**Do:** add a small, optional review session that mixes weak concepts with previously understood
ones. Preserve attempt history and separate “I read this” from “I explained this without help.”
Start with a transparent scheduling rule; allow postpone/reset and avoid streak penalties.
An optional mock interview can present 5–8 questions with follow-ups and a final review summary.
**Accept:** a learner can complete a bounded session, inspect why items appeared, revisit a weak
answer later, and compare attempts. No unsupported readiness percentage or hiring guarantee.

### A10 — Recommended learning is ordered, but not goal- or prerequisite-aware

**P1 · Source · M**
Evidence: [progressStats](frontend/src/utils/progressStats.js),
[TopicService](backend/src/main/java/com/csfundamentals/service/TopicService.java).

`getNextTopic()` selects the first incomplete topic in global category order. It does not use the
learner's active category, available time or prerequisite completion. Catalog outcomes exist but
are currently single broad statements. A single topic difficulty label can obscure the fact that
every lesson has all three tiers; exceptions are an “expert” topic at position five of the Java path.

**Do:** offer “Start here”, “Continue this path” and “Review weak concepts” as distinct actions.
Make prerequisite gaps visible without locking users out. Clarify entry level versus deepest level.
Add 2–4 observable outcomes when a lesson warrants them, rather than generic objective padding.
**Accept:** a Java learner gets a relevant next step with a reason; unmet prerequisites are linked;
completion and understanding remain separate; advanced users can skip foundational guidance.

### A11 — Java foundations improve the opening, but Spring needs an end-to-end lab sequence

**P1/P2 · Source · L**
Evidence: [Task Tracker](examples/java-spring/task-tracker/README.md),
[Java learning plan](JAVA_LEARNING_PLAN.md), [revamp content track](UI_UX_REVAMP_PLAN.md).

The runnable project currently teaches in-memory wiring and HTTP, explicitly excluding persistence,
security and production deployment. Introductory additions do not provide executable verification
of the later JPA, transaction, security, caching and production topics.

**Do, in order:** (1) verify Java/tooling prerequisites; (2) plain Java tests and manual composition;
(3) HTTP/validation/error responses; (4) persistence and transaction boundaries with rollback tests;
(5) ownership and authentication/authorization with rejection tests; (6) observability and a
measured failure; (7) caching/async only after the underlying consistency problem is understood.
Keep starter and completed checkpoints understandable, with commands, expected output and recovery
from common setup mistakes. Audit strings/equality, packages/imports, build dependencies, time APIs,
resource handling and SQL/JDBC coverage before proposing focused new lessons.
**Accept:** a beginner can run and modify each milestone, trace one successful request, diagnose one
failure and explain the design choice. Register any genuinely new lessons in a separate integration
unit before one-file authoring; do not silently expand the registry during a content rewrite.

### A12 — Make worked learning consistent across all six categories

**P2 · Sampled source + hypothesis · L**
Evidence: [authoring contract](content/CONTENT_SPEC.md), inventory above, sampled Java/OS/AI lessons.

Java now consistently names prerequisites and outcomes. Other topics often begin directly with
mechanisms. Some “Predict” exercises state the answer in the same sentence, reducing the opportunity
to attempt retrieval. Long source files and diagram quotas are useful structural safeguards, but
are not evidence that a learner can solve a new problem.

**Do:** use a shared teaching pattern: problem → smallest model → fully worked trace → learner
prediction → explained solution → variation → misconception → real constraints. Reveal exercise
solutions separately while preserving accessible direct access. Add a short prerequisite recap and
a glossary at the point of need. Provide a short first pass and deeper optional sections; avoid
turning every section into a collapsed accordion.
**Accept:** a new learner explains one mechanism and solves one changed example; an experienced
reader can still find expert details quickly. Use separate correctness and pedagogy reviews.

### A13 — Simulators need a clear learning task and explicit model limits

**P2 · Sampled source · L**
Evidence: [SchedulingVisualizer](frontend/src/components/visualizers/SchedulingVisualizer.jsx),
[HashMapVisualizer](frontend/src/components/visualizers/java/HashMapVisualizer.jsx), shared shell.

Controls and state displays exist; guided prediction, comparisons and model assumptions are not
consistently expressed across engines. The project should not imply that a simplified visualization
is the exact production implementation or that an engine's metric is a benchmark.

**Do:** begin with two representative engines. Add a question, editable scenario, prediction,
step explanation, visible state change, reset semantics and a return link to the relevant lesson
section. Compare algorithms on the same inputs. Label simplifications and version assumptions.
**Accept:** a learner predicts the next transition, explains the observed change and describes one
limit of the model. Keyboard operation, pause-on-hide and reproducible input/output tests pass.

### A14 — Reader presentation and accessibility need task-based verification

**P1 verification; P2 polish · Browser sample + source · M/L**
Evidence: mobile screenshot; [TopicPage](frontend/src/pages/TopicPage.jsx),
[DiagramViewer](frontend/src/components/markdown/DiagramViewer.jsx), [App.css](frontend/src/App.css).

The sampled mobile reader uses most of its first viewport for navigation and controls. This is a
candidate for consolidation, not justification to remove important actions. Diagram fit/zoom,
copy fallback, sticky headers, tab relationships and route focus require real interaction checks.
The current audit did not establish contrast or WCAG failures.

**Do:** audit home/category/study/practice/simulation/search/progress/error states in both themes;
include 200%/400% zoom, keyboard-only use, reduced motion, long titles and screen readers.
Consolidate secondary reader controls and give the content a clearer entry. Verify that focused
controls are not hidden behind sticky UI and that dialog Escape/close restores focus.
**Accept:** no blocked primary task, clipped essential control or unexplained focus loss; automated
axe findings resolved and manual checks recorded. Use WCAG 2.2 AA as the standard, while retaining
the project's stronger 44px mobile control target where practical. AA target-size rules are not
identical to a universal 44px minimum; see the [W3C standard](https://www.w3.org/TR/WCAG22/).

### A15 — Search needs stable section identity and relevance evaluation

**P2 · Source · M**
Evidence: [DiscoveryService](backend/src/main/java/com/csfundamentals/service/DiscoveryService.java),
[SearchPage](frontend/src/pages/SearchPage.jsx), [TopicViewer](frontend/src/components/TopicViewer.jsx).

Backend search reads H1–H6 labels, while the reader navigation resolves H2/H3 using cleaned title
text. Duplicate headings, unsupported heading levels and differing normalization can make a
reported match non-addressable. Search caps results at 50 and has no demonstrated query-quality set.
This audit did not reproduce every mismatch in the browser.

**Do:** provide a stable matched-section identifier or an explicit honest fallback; add typo/alias
handling where actual query tests justify it. Evaluate queries such as “why volatile isn't atomic”,
“Spring transaction rollback”, “left join duplicates”, “TCP slow start” and “CAP during partition”.
**Accept:** expected lessons appear near the top and every advertised section link reaches the
correct section, including duplicate/formatted headings; zero results offer useful next steps.

### A16 — Editorial versioning and documentation disagree with implementation

**P1 · Source · M**
Evidence: [AGENTS.md](AGENTS.md), [CONTEXT.md](CONTEXT.md), [design system](docs/DESIGN_SYSTEM.md),
[content contract](content/CONTENT_SPEC.md), [revamp ledger](UI_UX_REVAMP_PLAN.md).

Examples: top-level stack text still says Spring Boot 3.x while the project uses the 4.1 line;
CONTEXT describes a Node 20 Docker builder while the Dockerfile uses Node 26; design guidance
still describes the old mobile category strip; the content contract says filename prefixes control
order although catalog metadata now does; the C1–C8 ledger says “Not started” beside a checkpoint
that records implementation. JVM text says “recent JDK work” rather than naming the relevant baseline.

**Do:** designate one current implementation ledger, retain old audits as dated history, and sync
stack/ordering/navigation guidance. Add explicit Java 17 / Java 21 / Java 24+ distinctions where
needed. [JEP 491](https://openjdk.org/jeps/491) is a primary reference for the monitor-pinning change.
**Accept:** a new contributor can identify the actual runtime, current behavior, pending work and
verification date without reconciling contradictory documents. Labels distinguish language/API
contracts from implementation details and version-specific behavior.

### A17 — CI needs complete learning journeys, not only isolated component checks

**P1 · Source + current checks · M/L**
Evidence: [verify workflow](.github/workflows/verify.yml),
[responsive harness](scripts/test-responsive-layout.mjs), current browser findings.

The build, validators and focused tests pass while A01–A04 remain observable. The responsive harness
uses stub APIs, and the container smoke checks endpoint availability rather than completing a
learning flow. New controls have less targeted coverage than the established rendering pipeline.

**Do:** add browser regression tests for the confirmed findings; test CategoryPage, CodeBlock,
DiagramViewer and backup UI interactions. Add one real-backend journey for discovery → lesson →
practice; retain fast stubs for deterministic component/layout checks. Guard test catalog drift.
**Accept:** a deliberately reintroduced state-loss or wrong-resume bug fails CI; the live integration
check exercises actual response shapes and question identity rather than just page availability.

### A18 — Measure performance and comprehension before adding more product surface

**P2 · Hypothesis · M**
Evidence: long Markdown rendering, per-heading store updates and per-keystroke draft writes;
no fresh performance profile or learner study was produced here.

**Do:** measure long-lesson scrolling, typing latency with a large answer history, diagram loading,
slow-network recovery and mobile responsiveness. Avoid premature persistence debouncing that loses
last keystrokes. Run a small formative study with beginners and interview-focused learners.
**Accept:** publish environment, workload, task completion, errors and comprehension results.
Use observed bottlenecks to set budgets; do not infer learning effectiveness from time on site.

## 5. Concrete interview-coaching template

Pilot this structure before applying it to all 953 questions:

1. **Prompt:** one clear problem, with constraints when relevant.
2. **30–60 second answer:** direct claim, mechanism, example and important boundary.
3. **Must include:** 3–5 author-reviewed points; distinguish essentials from advanced extras.
4. **Walkthrough:** a trace, short program, query or diagram that supports the answer.
5. **Common weak answer:** explain precisely what is missing or misleading.
6. **Follow-up:** change one condition and ask the learner to adapt their reasoning.
7. **Self-review:** check covered points, record uncertainty and choose whether to revisit.

Example — “Does volatile make `count++` safe?”

- Short answer: a volatile field supplies visibility/ordering guarantees, but increment remains a
  read/modify/write operation; concurrent increments can overwrite one another.
- Show the two-reader lost-update trace. Explain an atomic counter for a simple increment and a
  lock when a larger invariant must change together.
- Essential points: visibility versus atomicity; concrete interleaving; appropriate mechanism;
  limitations when multiple fields form an invariant.
- Follow-up: “What if balance and transaction count must change together?”
- Weak answer to correct: “volatile is thread-safe, so the increment is safe.”

This is an example editorial structure, not an automated score or a universal interview script.
For design questions, lead with clarifying constraints and alternatives. For debugging questions,
lead with evidence and a testable hypothesis rather than a memorized definition.

## 6. Recommended delivery order

| Wave | Work | Completion gate |
|---|---|---|
| 1. Trust and continuity | A01–A07, A16; tests from A17 | Confirmed browser problems fixed; misleading claims corrected; recoverable saved work; current ledger |
| 2. Interview learning loop | A08–A10; exact review links before scheduling | Pilot rubrics and bounded review sessions evaluated with learners |
| 3. Understand by building | A11–A13 | Runnable Spring milestones and representative cross-category learning tasks |
| 4. Usability and accessibility | Start A14 checks in Wave 1; finish A14–A15, A17–A18 | Both themes, keyboard/zoom checks, relevant search, live integration and measured performance |
| 5. Expand only from evidence | Extend proven teaching/rubric patterns | No loss of technical accuracy, expert depth, compatibility or accessibility |

Work in reviewable packages. A content-authoring package changes one lesson; registration, UI,
example application, tests and documentation are separate integration packages. Do not copy all
recommendations into one giant unverified patch. Preserve current local user data through migrations.

## 7. Suggested learner-study tasks and success evidence

Recruit a small formative group spanning basic-programming beginners and experienced interview
candidates; five to eight participants can be a practical first round, not a statistical guarantee.

| Task | Observe | Desired evidence |
|---|---|---|
| Choose where to begin Java | Path choice and prerequisite confusion | Learner explains why the starting point fits |
| Predict a reference-assignment result | Reasoning before showing solution | Correct object/reference model, not guessed output |
| Trace a Spring POST request | Controller/service/repository boundaries | Explains input, state change, response and failure |
| Explain a transaction failure | Atomicity and boundary reasoning | Handles a changed scenario without repeating definitions |
| Return tomorrow to weak questions | Resume/review discoverability | Exact draft/question recovered without assistance |
| Use the reader with keyboard/zoom | Focus and control usability | All essential tasks completed without blocked controls |

Record failures and revise the relevant lesson or interaction. Recheck a changed example after a
delay to distinguish immediate recognition from retained understanding. Do not publish participant
answers or recordings without consent; synthetic examples are sufficient for ordinary test fixtures.

## 8. Other useful improvements, after the core work

- **Cross-topic synthesis:** trace one request through DNS/TCP, reverse proxy, Spring, connection
  pool, SQL/index/transaction and deployment. Link existing lessons; avoid a duplicate curriculum.
- **Glossary and comparisons:** visibility/atomicity, process/thread, session/token, flush/commit,
  index/constraint, concurrency/parallelism. Define terms at first use before adding a global index.
- **Report a problem:** a small issue-report action that captures topic and section, never drafts
  by default. Establish a correction/review owner and date.
- **Version and source notes:** explicit baselines and short primary-source references, especially
  for runtime internals, security, cloud services and performance claims.
- **Offline/print:** evaluate a downloadable study summary or reading cache after confirming user
  demand; avoid introducing stale caches or an offline promise that only some routes satisfy.
- **Accounts/sync:** optional later convenience. Keep local-first use and export viable; do not
  introduce mandatory signup before a learner can read or practise.
- **AI feedback:** optional later experiment with source-grounded rubrics and clear uncertainty.
  Do not transmit private drafts by default or substitute fluent generated feedback for verified
  correctness. Human/editorial rubrics and deterministic examples should work without it.

## 9. Release acceptance checklist

- [ ] A01–A07 verified with regression evidence, not only code inspection.
- [ ] Every new learning feature preserves existing bookmarks/drafts and supports recovery.
- [ ] Pilot lessons have a problem, explicit prerequisites, trace, attempt and explained correction.
- [ ] Interview rubrics distinguish essential points, limitations and follow-up reasoning.
- [ ] Review opens exact questions and can reach every saved/alternate answer.
- [ ] Runnable examples pass on their declared versions; excerpts are labelled accurately.
- [ ] Simulator explanations and numeric claims are reviewed alongside Markdown.
- [ ] Real-backend journey, full relevant tests, build/content gates and diagram decode pass.
- [ ] Keyboard, zoom, reduced-motion, mobile and both-theme checks are recorded.
- [ ] At least one formative learner round informs the next iteration; limitations are stated.
- [ ] README, CONTEXT, AGENTS, design guidance and active ledger agree with the shipped behavior.

## 10. External basis for recommendations

- The [IES practice guide on organizing instruction and study](https://ies.ed.gov/ncee/wwc/PracticeGuide/1)
  supports combining worked examples with practice, connecting representations, retrieval and
  spaced study. Applying those principles to this adult CS product is a design recommendation,
  not evidence that this particular implementation improves interview outcomes.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and
  [focus-not-obscured guidance](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum)
  inform accessibility acceptance criteria. Automated scans alone do not establish conformance.
- Official Spring and OpenJDK references are linked beside the technical/version findings above.

**Overall recommendation:** finish reliable learning continuity and trustworthy explanations first,
then add feedback and repeat practice, then expand the runnable learning journey. Treat visual
refinement as support for those tasks rather than the definition of completion.

## Implementation checkpoint — October 1

The first remediation branch addresses the confirmed continuity failures. Reader controls now
retain their state across reader updates (A01), heading restoration and tracking run only against
the mounted Study article (A02), a missing saved interview question is shown explicitly and can
be fetched from later pages (A03), and non-topic routes set their own browser titles (part of
A04). Progress review can page through the queue, show imported alternatives, and link to an
exact question (part of A05). The Spring Security 403 answer has a CSRF counterexample (part of
A06), and retained simulator scenarios no longer present invented incident metrics as measured
war stories (A07). Documentation versions and implementation ledgers were synchronized (part of
A16). The browser regression harness now checks continuity journeys and runs axe on seven routes
in both themes (part of A14/A17). The next-lesson suggestion follows recent category and unmet
prerequisites (part of A10); interview practice offers general comparison prompts (part of A08).
The simulation-question migration gate also needed one evidence quote updated after the earlier
OOP lesson rewrite; the migrated question and its explanation remain in the lesson.

The October 1 AI/ML and DevOps pass adds a beginner outcome and practical backend scenario to all twelve lessons, reorders their catalog prerequisites for a usable path, and updates Kubernetes Service networking and LLM tool-interface guidance against primary documentation. This improves the entry point and factual freshness but does not substitute for a learner study or corpus-wide expert review.

The browser accessibility gate now waits for the applied theme and the lazy OS simulator before scanning. That exposed low-contrast simulator controls in the light theme and an active-state badge in the dark theme; their text/fill tokens were corrected and both themes are checked again in Chromium.

The saved-answer manager now covers the remaining A05 actions: review/all filters, comparison,
non-destructive adoption and confirmed deletion. Its action announcement now appears only after a change, leaving Progress loading status unambiguous. Named main-landmark focus on pathname changes, with query/hash and guided-tour focus preserved, completes the A04 route policy. The 20-question A08 rubric pilot now gives five core subjects answer-specific comparison criteria. The DBMS pilot also corrected Q1, Q3, Q9, Q13, and Q14 using PostgreSQL and MySQL manuals, including the distinction between vacuum bloat and WAL retention. The remaining work is material: a corpus-wide, sourced accuracy review (A06); broader rubrics and
partial-credit examples (A08); review sessions/history (A09); explained learner goals and prerequisites
(A10); Spring lab milestones (A11); broader teaching-pattern work (A12); guided simulator
learning tasks (A13); manual accessibility/zoom review (A14); section-stable search and relevance
evaluation (A15); a live-backend learning journey (A17); and performance and learner evidence
(A18). The checklist above stays open until those acceptance criteria are met.

The [core CS content audit](CORE_CS_CONTENT_AUDIT_2026-10-01.md) now inventories all
56 OS, networking, DBMS and Java/Spring lessons, with a topic-by-topic work queue and
separate evidence for the missing beginner openings, reproducible network/OS labs,
seeded SQL examples, and later runnable Spring milestones. It explicitly leaves full
expert accuracy review and learner validation open.

The [technical accuracy ledger](CONTENT_ACCURACY_REVIEW_2026-10-01.md) records further A06 progress: the DBMS transaction/recovery lesson and concurrency lesson now distinguish PostgreSQL, InnoDB, and ARIES mechanisms, with configuration-aware durability advice and matching interview answers. A reproducible PostgreSQL read/lock exercise and a transactional queue-claim example were verified in independent sessions. A06 remains open for the broader source-review queue, and this content package does not close the lab, learner-validation, or UI acceptance criteria.

## October 2 checkpoint — A06/A11 initial JPA milestone

The JPA lesson and fourteen answers received source-backed lifecycle, fetching, flush/commit,
proxy/rollback and locking corrections. Task Tracker adds a persistence profile and twelve tests
with failure predictions and database close/reopen evidence. A06 remains open beyond the three
scoped reviews; A11 remains open for migrations, fetching/pagination, full CRUD, security, caching
and operations. See the [accuracy ledger](CONTENT_ACCURACY_REVIEW_2026-10-01.md) and
[learner walkthrough](examples/java-spring/task-tracker/README.md). This package does not close
manual usability, accessibility, performance, or learner-comprehension findings.


## October 2 continuation checkpoint

The [delivery checkpoint](CURRICULUM_COMPLETION_2026-10-02.md) supersedes the earlier pending
milestone descriptions: seeded SQL plus OS/loopback networking labs, Spring migrations/relationships/
pagination/security/caching/operations, and optional spaced-review histories/mixed sessions are
implemented in an isolated branch. Twenty-two more rubrics bring authored feedback to 42 questions.
The [source ledger](CONTENT_ACCURACY_REVIEW_2026-10-01.md) now covers nineteen scoped core reviews;
37 core reviews remain. [Learner study tasks](LEARNER_USABILITY_STUDY.md) are prepared, but real
sessions, revisions informed by them and retesting remain open. Container checks require a running
daemon/CI result. Do not close those items from structural tests or an automated browser pass alone.

## October 3 checkpoint — requested charcoal dark mode

The user requested LeetCode-inspired dark mode. The shared theme now has neutral charcoal
surfaces, quieter accents, readable syntax comments, theme-aware selection/scrollbars and focus
outlines for editable controls/summaries. The [design system](docs/DESIGN_SYSTEM.md) records
palette decisions and desktop previews. Twenty-seven theme tests pass, including contrast pairs
in both themes; the complete frontend suite passes 711/711 and the backend passes 59/59. The production build, 590 diagram browser decodes and responsive browser harness
pass: thirteen route families at five widths in both themes, keyboard theme switching/reload,
exact-question review and sixteen axe scans with no violations. Desktop/mobile previews were
manually inspected. These checks support A14/A17; real learner sessions, zoom/reduced-motion
coverage and comprehension/performance evidence remain separate acceptance work.
