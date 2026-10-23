# Root Cause Analysis Register

This file records confirmed regressions introduced or exposed during agent-driven work. Its purpose
is to make repeated symptoms searchable and to preserve the verified fix and prevention steps.
Do not add hypothetical risks, credentials, personal data, or raw logs containing secrets.

## How to use this register

1. Search this file by the exact symptom, command, component, port, or error text before debugging.
2. Add an entry when an agent-created change causes a regression, or when concurrent agent work
   exposes a repeatable workflow failure.
3. Use an ID in the form `RCA-YYYY-MM-DD-NN` and record evidence, not guesses.
4. Mark the entry resolved only after the fix is tested. Link the resolving commit when available.
5. If prevention is not yet automated, leave that action explicitly open.

## Incident index

| ID | Symptom | Area | Status | Resolution |
|---|---|---|---|---|
| [RCA-2026-08-30-01](#rca-2026-08-30-01--startsh-failed-with-bashr) | `/usr/bin/env: ‘bash\r’: No such file or directory` | Local launcher | Resolved | `c792a5a` |
| [RCA-2026-08-30-02](#rca-2026-08-30-02--topic-header-consumed-the-reading-viewport) | Topic chrome occupied much of the viewport | Reader UI | Resolved | `4dea181`, merged by `923da21` |
| [RCA-2026-08-31-01](#rca-2026-08-31-01--route-tests-failed-during-parallel-content-rewrites) | Registered topic temporarily reported missing | Agent workflow | Resolved | Avoid multi-call delete/recreate edits |
| [RCA-2026-08-31-02](#rca-2026-08-31-02--final-interview-answer-absorbs-further-reading) | Final answer includes Further Reading | Interview deck | Resolved | `d2d81ff` |
| [RCA-2026-08-31-03](#rca-2026-08-31-03--unsupported-topics-show-an-unrelated-simulation) | Topic opens the wrong simulator | Simulation routing | Resolved | `d2d81ff`, `1f0c6e5` |

---

## RCA-2026-08-30-01 — `start.sh` failed with `bash\r`

**Status:** Resolved
**Affected area:** `start.sh`, WSL/Linux startup  
**Observed symptom:** Running `./start.sh` produced
`/usr/bin/env: ‘bash\r’: No such file or directory`.

### Impact

The one-command local launcher could not start either Spring Boot or Vite on Linux-compatible
environments. Running `start.sh` without `./` also failed, but that second message was normal shell
`PATH` behaviour rather than a project defect.

### Root cause

`start.sh` had CRLF line endings, so Linux interpreted its shebang interpreter as `bash\r`.
The repository had no Git attribute forcing shell scripts to LF, and the executable bit was not
recorded in Git.

### Resolution and verification

- Normalised the complete script to LF.
- Added `*.sh text eol=lf` to `.gitattributes`.
- Recorded mode `100755` for `start.sh`.
- Verified the file type, first bytes, and `bash -n start.sh`.
- Committed the repair as `c792a5a` (`fix: preserve Unix launcher line endings`).

### Prevention

- Keep the shell-script EOL rule in `.gitattributes`.
- Run `bash -n start.sh` after launcher changes.
- Do not rely on editor or host-OS line-ending defaults for executable scripts.

---

## RCA-2026-08-30-02 — Topic header consumed the reading viewport

**Status:** Resolved  
**Affected area:** `TopicPage`, `TopicViewer`, `MarkdownRenderer`, responsive CSS  
**Observed symptom:** A selected lesson showed Back/Home navigation, category context, the long
topic title twice, and Study/Simulation controls before leaving useful space for the article.

### Impact

Long titles were especially disruptive on small screens. The sticky topic header remained tall
while scrolling, so the issue affected every topic route rather than a single lesson.

### Root cause

- The page rendered both a Back link and a Home breadcrumb.
- The current topic title appeared in the breadcrumb, the page H1, and the Markdown H1.
- JavaScript toggled `topic-page-header--compact`, but no compact-state CSS existed.
- Mobile stacked all controls vertically, and the TOC initially opened above the article.

### Resolution and verification

- Reduced the breadcrumb to one **All topics** link plus category context.
- Made `TopicPage` the single semantic H1 owner and suppressed the Markdown metadata H1.
- Added a one-line compact desktop toolbar and allowed the mobile header to scroll away.
- Defaulted the TOC closed below 1024px and corrected competing sticky offsets.
- Added regression tests for title uniqueness, navigation deduplication, compact scrolling, and
  breakpoint-aware TOC behaviour.
- Verified 208 focused reader/Markdown tests and a production Vite build.
- Committed as `4dea181` and merged to `main` by `923da21`.

### Prevention

- Every topic route must expose exactly one H1.
- Any state-driven CSS class must have a tested visual rule before shipment.
- Responsive reader changes require tests at both sides of the 1024px TOC breakpoint.
- Avoid duplicating equivalent navigation actions in the same page header.

---

## RCA-2026-08-31-01 — Route tests failed during parallel content rewrites

**Status:** Resolved
**Affected area:** Parallel agent workflow, content route-integrity tests
**Observed symptom:** `mvn test` reported `Registered topic has no content: dbms/concurrency-control`
while the lesson was being rebuilt.

### Impact

Three backend assertions failed even though the route registration was unchanged. The failure made
a healthy backend appear broken and could have prompted an unnecessary registration change.

### Root cause

A content agent deleted the old Markdown file in one operation and recreated the replacement in a
later operation. Because all agents share one working tree, the backend suite observed that
intermediate state. The same risk existed for other lessons undergoing delete-then-rewrite edits.

### Resolution and verification

- Classified the failure as transient only after checking the shared Git status and confirming the
  assigned agent was actively rebuilding that exact file.
- Deferred the backend rerun until all assigned files were restored and passed scoped validation.
- No backend or route-registration code was changed.
- Reran the complete backend suite after the content batch: 32 tests passed with zero failures.

### Prevention

- Content agents must not leave a registered file deleted between tool calls.
- Prepare a complete replacement and apply it in one operation, or edit the existing file in place.
- Do not run route-integrity or all-content suites while another agent owns a content rewrite.
- Before responding to a missing-content failure, check `git status` and active agent ownership.

---

## RCA-2026-08-31-02 — Final interview answer absorbs Further Reading

**Status:** Resolved
**Affected area:** `TopicViewer.jsx`, interview-question parsing and rendering
**Observed symptom:** The last interview answer can contain the lesson's `### Further Reading`
heading and links, and answer Markdown is displayed as plain paragraph text.

### Impact

The final recall card presents unrelated source material as part of its answer. Markdown constructs
such as inline code, links and math also lose their intended rendering, reducing readability and
making the deck unsuitable for reuse in category-wide Interview Mode.

### Root cause

The current regular expression searches the whole lesson and terminates an answer only at the next
question or end of file. It does not first enter the exact `### Interview Questions` section or stop
at the next H3, so the final answer naturally runs through `### Further Reading`. `InterviewDeck`
then places the captured Markdown inside a plain `<p>`.

### Resolution and verification

- Replaced the loose regex with `frontend/src/utils/interviewQuestions.js`, a fence-aware,
  section-aware parser mirroring `DiscoveryService`'s Java parser; it enters the exact
  `### Interview Questions` section and stops at the next H3, so the final answer no longer runs
  through `### Further Reading`.
- Extracted `components/shared/InterviewDeck.jsx`, shared by the per-topic deck and category
  Interview Mode, rendering answers through `MarkdownRenderer` instead of a plain `<p>`.
- Landed in `d2d81ff` (P3/P5 discovery API, visualizer registry, and simulation-question
  migration gate) with matching test coverage across the 63-file corpus.

### Prevention

- Parsers must use the curriculum's explicit section boundaries rather than EOF as structure.
- Test the final element in every repeated Markdown construct; middle-item tests miss EOF bugs.

---

## RCA-2026-08-31-03 — Unsupported topics show an unrelated simulation

**Status:** Resolved
**Affected area:** `TopicPage` visualizer routing and category visualizer hubs
**Observed symptom:** Some topics open a category hub that silently selects its first or fallback
simulation instead of showing an exact topic-specific experience.

### Impact

Practical SQL can fall back to relational algebra; Java HashMap, concurrency and Spring production
topics can fall back to the Java execution pipeline; ML fundamentals can fall back to embeddings.
The UI therefore implies that a relevant simulation exists when it does not.

### Root cause

`TopicPage` routes nearly every topic in a category to one monolithic hub. Hub defaults are valid
for their original modes but are not a complete topic-ID mapping, and there is no explicit
unsupported state controlling whether the Simulation tab should appear.

### Resolution and verification

- Replaced the broad category switches with `components/visualizers/topicVisualizerRegistry.jsx`,
  a topic-ID-to-lazy-visualizer registry: `direct(Component)` for a standalone visualizer,
  `hub(CategoryVisualizer, topicId)` for a hub sub-tab, and no entry at all for a topic with no
  exact-match visualizer.
- Consistent hashing was rewired to `distributed-databases-cap`, its correct curriculum owner
  (previously wired to no topic).
- `TopicPage.jsx` now hides the Simulation tab entirely when the registry has no entry for the
  topic, instead of falling back to a hub's default sub-tab.
- Landed in `d2d81ff` plus the P3 simulator-triage commits (`8682b87`, `74e3825`, `81cbd9d`,
  `1f0c6e5`), which also removed the 18 non-retained visualizers whose fallback this bug used to
  expose.

### Prevention

- Every optional feature route must model unsupported state explicitly.
- Do not use a category default to satisfy a topic-specific contract.

## RCA-2026-09-23-01 — Closed mobile table of contents remained visible

- Evidence: the audit observed `aria-expanded=false` at 320px while the TOC still occupied
  121.25px; toggling changed the attribute but not visibility.
- Root cause: `.study-navigation nav { display: flex }` overrode the browser's default
  display rule for the HTML `hidden` attribute. DOM tests checked semantics without CSS.
- Resolution: apply the flex layout only to `nav:not([hidden])`.
- Verification: the responsive browser gate now checks actual visibility before and after
  toggling at every tested width/theme, and checks subsection coverage against rendered headings.
- Prevention: retain DOM interaction tests and browser-computed visibility checks together.
- Resolving commit: `e66fc56` (reader navigation and portable diagrams, PR #40).

## RCA-2026-09-23-02 — Diagram fingerprints differed between Windows and Linux

- Evidence: all 295 diagram fingerprints were stale locally on a clean rendering baseline,
  while the same main revision passed Linux CI. Renderer and CSS text inputs already normalized LF.
- Root cause: the font subset's character set removed newline but retained carriage return
  from CRLF Markdown sources, making its fingerprint depend on checkout line endings.
- Resolution: exclude both line-ending characters in a shared font-character helper and include
  that helper in rendering-input fingerprints; regenerate the complete diagram manifest.
- Verification: regression tests compare CRLF/LF input and preserve non-ASCII glyphs, ASCII
  coverage, deduplication and order independence. Build/decode verification follows regeneration.
- Prevention: CI runs the charset regression tests; diagram checks validate the helper fingerprint.
- Resolving commit: `e66fc56` (reader navigation and portable diagrams, PR #40).

## RCA-2026-09-23-03 — Container omitted the diagram font helper

- Evidence: PR #40's container job failed after extracting the charset helper, while the
  local build and Vercel deployment passed. Docker copied only `render-diagrams.mjs`.
- Root cause: the new imported helper was available in full checkouts but missing from
  the frontend image's explicitly selected script files.
- Resolution: copy both renderer scripts into `/app/scripts/` in the builder stage.
- Verification: PR #40 passed the container build/start checks after the fix; frontend and backend jobs also passed before merge.
- Prevention: treat renderer imports as container inputs and retain container CI alongside
  full-checkout builds; a successful local build alone is not the release gate.
- Resolving commit: `cdbc35a` (container helper copy, PR #40).

## RCA-2026-09-23-04 — OOP title rendered as body text during review

- Evidence: final mobile review of PR #41 displayed `c# OOP Pillars` in the article.
- Root cause: a stray character prefixed the Markdown title during authoring. Existing
  gates validated tiers and body rendering but did not require a valid first-line title.
- Resolution: remove the prefix and check every curriculum file's document title.
- Verification: the new inventory regression test passes across all 68 lessons; PR CI
  reruns the full renderer suite before merge. The defect was caught before release.
- Prevention: retain the title gate and visual review alongside structural validation.
- Resolving commit: `5dd45cc`.

## RCA-2026-10-01-01 — Reader controls and reading location reset across view changes

- Evidence: the browser audit reproduced a code block's Wrap state changing from pressed to
  unpressed after Focus reading, and a saved heading remaining at `beginner-level` after
  Study → Practice → Study and a later scroll. These are regressions in the agent-built reader.
- Root cause: inline React Markdown renderer functions changed identity on parent renders,
  remounting their stateful descendants. Heading observation was tied to fetched content rather
  than the mounted Study article, while an active-section effect could save an old/default heading
  before restoration finished.
- Resolution: stabilize and memoize Markdown rendering; restore the requested/saved heading before
  observing; reconnect observation when Study mounts and save only visible Study headings.
- Verification: parent-rerender control regression, full frontend suite (663 tests), and the
  Chromium Study/Practice/Study plus code-wrap journey passed.
- Prevention: test stateful child controls through parent updates and reading continuity through
  real route/view transitions, not only isolated controls.
- Resolving commit: `93d059d`.

## RCA-2026-10-01-02 — Saved interview session silently opened a different question

- Evidence: a saved category-session key outside the first 50 loaded questions displayed Q1
  without warning. Progress review also linked to the topic Practice tab without targeting the
  named question.
- Root cause: `Math.max(0, findIndex(...))` converted a missing stable question key into index
  zero; the review URL omitted that key.
- Resolution: show an explicit missing-question state with a fetch-later-pages action or a safe
  first-question choice, and encode exact question keys in progress-review links.
- Verification: later-page resume, missing-key, exact-link and browser recovery tests passed;
  the full frontend suite passed 663/663.
- Prevention: model an absent persisted identifier as an explicit state; test restoration when the
  target lies beyond initial pagination and when content changes.
- Resolving commit: `93d059d`.

## RCA-2026-10-01-03 — Lesson rewrites left migration-ledger quotes stale

- Evidence: `node scripts/audit-simulation-questions.mjs --check` found that migrated quiz
  `5572a6d7bb74` referenced wording no longer present in `01d-java-oop-pillars.md`.
- Root cause: the prior agent-authored OOP lesson rewrite preserved the explanation that private
  methods cannot be overridden but changed its wording without updating the literal evidence
  quote in `SIMULATION_QUESTION_MIGRATION.json`.
- Resolution: point the ledger at the lesson's current, equivalent sentence. The source question
  and migrated explanation remain intact.
- Verification: the migration gate passes with 109/109 items resolved and zero pending.
- Prevention: run the migration gate after any rewrite of a lesson named as a ledger target.
- Resolving commit: `93d059d` (initial OOP occurrence).
- DBMS recurrence: the October 1 accuracy review changed three transaction-lesson evidence
  sentences. The migration gate identified interview `51ef3c150fa5` and quiz `4acd99ff6bb9` /
  `e296148a8b37` as stale. Their source payloads remain archived unchanged; current lesson
  explanations retain the concepts while correcting the legacy overclaims. The three evidence
  quotes now point to the revised WAL ordering, partial-commit and ARIES explanations.
- Recurrence prevention: inspect all migration-ledger references before editing a target lesson;
  synchronize evidence as an integration unit and run the gate before committing. Never restore
  an inaccurate sentence merely to satisfy a literal evidence check.
- DBMS resolving commit: `8931526`; the follow-up documentation commit records this hash.

## RCA-2026-10-01-04 — Browser accessibility scan could miss a lazy simulator and selected theme

- Evidence: the responsive check first passed, then an identical run reported low contrast in
  the process simulator. A stricter run found the active-state badge also failed in dark mode.
  The old scan waited for the page heading but did not wait for the lazy simulator or the
  applied theme, so it could scan a different DOM or theme on different runs.
- Root cause: the harness accumulated `addInitScript` theme setters across navigations and
  used page-heading readiness as a proxy for theme and simulator readiness. The simulator
  also used a light info fill with white text and an active badge with fixed white text.
- Resolution: set theme storage in the current page, wait for `html[data-theme]` and the
  simulator action buttons, include contrast details on failure, darken the light warning
  text and action fill, and use theme-aware inverse text on the active badge.
- Verification: final responsive run covers 10 route families at five widths in both themes
  and 14 axe scans, including the mounted simulator; the generated 590 diagram assets pass
  XML and Chromium decode checks, and the production build succeeds.
- Prevention: accessibility checks for lazy routes must assert the feature is mounted and
  the requested theme is applied before axe runs; contrast failures should report actual
  foreground/background colors and ratios.
- Resolving commit: `8b2c4f3`.

## RCA-2026-10-01-05 — Empty saved-answer status made progress loading ambiguous

- Evidence: the first complete frontend run after the saved-answer manager landed reported
  `ProgressPage`'s loading-state test failing because the page contained more than one
  `role="status"` element. The manager rendered an empty live status before any action.
- Root cause: the manager kept a focus target mounted at all times so it could focus the
  result of an adoption or deletion, but assigned `role="status"` to that empty element.
  This created an unnecessary live region alongside the legitimate loading status.
- Resolution: render the focusable status only after an action produces a message. Keep
  the manager's empty section mounted so deleting the last answer still has a focus target.
- Verification: the Progress and saved-answer focused suites pass 14/14 tests; the
  full frontend suite passed 669/669, and the production build and browser journey passed.
- Prevention: action announcements should be absent before an action and tests should
  assert that loading and post-action statuses remain distinguishable.
- Resolving commit: `903d126`.

## RCA-2026-10-01-06 — Pilot rubric browser assertion raced lazy Markdown

- Evidence: the first responsive-browser run after adding the interview-rubric journey
  reported missing inline code and follow-up immediately after opening the checklist.
  The rerun passed when those rendered elements were awaited.
- Root cause: the assertion read the `<details>` body before the lazy Markdown renderer
  completed its Suspense boundary. It treated an intermediate loading state as final content.
- Resolution: wait for the rendered inline code and follow-up text, with a bounded timeout
  and the observed checklist text in the failure message.
- Verification: the final browser run passed 10 route families at five widths in both
  themes, 14 axe scans, and the rubric-specific journey.
- Prevention: browser assertions for lazy content must wait for the content itself,
  not only the control that opens it.
- Resolving commit: `ac05000`.

## RCA-2026-10-02-01 — Transaction diagram label failed Mermaid parsing

- Evidence: the real Mermaid validator rejected JPA diagram 3; both theme renders also failed.
- Root cause: an authored sequence-message label contained an unescaped semicolon, which Mermaid
  treated as a statement separator. Mocked Markdown tests correctly did not establish diagram validity.
- Resolution: use plain text without the separator and regenerate both themed assets.
- Verification: require the real source parser, diagram generation and browser decode before release.
- Prevention: validate changed Mermaid sources before rendering or declaring content complete.
- Resolving commit: `5d0ebe0`. The 68-lesson parser, generation and 590-asset browser decode passed before release.

## RCA-2026-10-02-10 — Servlet security configuration broke the non-web persistence test

- Evidence: `FilePersistenceTest` failed because its non-web context had no `HttpSecurity` bean;
  the other sixteen example tests passed.
- Root cause: the new filter-chain configuration applied to every application type.
- Resolution: condition servlet security on `ConditionalOnWebApplication.Type.SERVLET`.
- Verification: rerun the entire example suite, including both application close/reopen contexts.
- Prevention: retain the non-web file-persistence test when adding web/security configuration.
- Resolving commit: `ce82a0b`; nineteen example tests and the packaged HTTP verifier pass.


## RCA-2026-10-02-11 — Real servlet error dispatch changed CSRF 403 into 401

- Evidence: all MockMvc security tests passed, but the packaged HTTP smoke received 401 with an empty body for an authenticated POST missing CSRF. Allowing ERROR dispatch restored the expected 403 while direct protected requests remained denied.
- Root cause: the secure deny-all fallback applied again to the container's error dispatch. MockMvc does not reproduce every embedded-container dispatch after `sendError`.
- Resolution: permit only `DispatcherType.ERROR` within the chain so the configured error response can render; `/error` is not generally made public. Retain the packaged socket/CSRF check.
- Verification: rerun the nineteen example tests and the real HTTP script. The shutdown assertion accepts the JVM's normal SIGTERM exit 143 as well as 0 and requires the server's graceful-completion log; exit 0 alone was an incorrect harness assumption.
- Prevention: keep real HTTP rejection, readiness, metrics and SIGTERM checks alongside MockMvc; do not infer servlet-container behavior from mocked dispatch alone.
- Resolving commit: `ce82a0b`; nineteen example tests and the packaged HTTP/CSRF/SIGTERM verifier pass.


## RCA-2026-10-02-12 — 2PC wording correction left migration evidence stale

- Evidence: the migration gate rejected `legacy-json:dbms-concepts-distributed:root:interview:5563ba3f1e56` because its literal quote was absent after this accuracy review. The original question prompt and fourteen-answer section were still present.
- Root cause: the reviewed answer correctly allowed recovery through authoritative decision evidence instead of implying only direct coordinator contact; the integration ledger still quoted the older sentence. This recurs under RCA-2026-10-01-03.
- Resolution: update only that entry's `evidence.contains` to the revised answer sentence. Preserve its source payload, digest, question identity and migrated disposition.
- Verification: require all 109 migration entries to pass and verify unchanged question prompts/diagram sources before the local commit.
- Prevention: inspect migration references before future target-lesson edits and synchronize literal evidence as a separate integration unit; never restore an inaccurate claim to pass the gate.
- Resolving commit: `ce82a0b`; 109/109 migration entries and all six migration-tool tests pass.

## RCA-2026-10-02-13 — Generic type prose was parsed as raw HTML

- Evidence: the revised generics lesson failed the structural gate with seven raw HTML tags;
  all fourteen marked programs compiled, so compilation did not catch the rendering defect.
- Root cause: new explanatory prose and a rubric used parameterized type names without inline
  backticks. Markdown interprets their angle brackets as HTML rather than visible Java syntax.
- Resolution: wrap each prose type expression in inline code; retain the question identities,
  example output and four migration evidence sentences.
- Verification: require the real-Mermaid content gate, focused lesson rendering and whole-corpus
  interview parsing before committing. The fixed lesson passes structural validation.
- Prevention: format Java types as inline code while authoring; keep the raw-HTML gate even when
  compiler and renderer smoke checks pass.
- Resolving commit: pending this local review batch.

## RCA-2026-10-03-01 — Uncommitted theme work lost from a temporary checkout

- Evidence: after the environment restart, `/tmp/cs-fundamentals-jpa` was absent; its branch
  remained at `94e545e`, while the new theme edits/tests had not been committed. The merged
  JPA package remained intact, and newer curriculum work was already on main (`ff8a80b`).
- Root cause: an unfinished task relied on an ephemeral worktree surviving an environment
  restart. A Git branch alone cannot preserve uncommitted working files.
- Resolution: restore the theme on a new branch from current main, using the persistent project
  checkout; preserve the newer curriculum changes and rerun verification before merge.
- Verification: all 711 frontend and 59 backend tests, production build, 590 diagram decodes,
  thirteen responsive route families in both themes and sixteen axe scans pass.
- Prevention: use persistent checkouts for work spanning restarts and checkpoint reviewable
  changes in commits; do not treat temporary worktree state as durable task storage.
- Resolving commit: `55f2468`; the follow-up documentation commit records this hash.

## RCA-2026-10-03-02 — Accuracy corrections invalidated migration evidence quotes

- Evidence: the migration gate rejected quiz `99c3014eb151` after the SAM answer gained the required non-sealed boundary. The final package gate also rejected query-optimization quiz `265c78e2e50c` after the merge-join eligibility correction.
- Root cause: the accuracy correction changed a sentence used as literal evidence without updating that integration reference.
- Resolution: retain the corrected answer and synchronize both affected `evidence.contains` references; archived question/payload/digest remain unchanged.
- Verification: all 109 migration entries pass; nineteen gate regression tests, 210 corpus/parser tests and 68/68 lesson validation checks pass.
- Prevention: inspect target evidence before each content unit and run the gate after each review package; do not restore an inaccurate sentence to satisfy a literal check.
- Resolving commit: `9963f4a`; this documentation follow-up records the completed package.

## RCA-2026-10-03-03 — Authored rubric totals inherited an outdated snapshot

- Evidence: the new whole-corpus frontend/backend assertions expected 54 rubrics after twelve additions, but both found 56. Reading the parent commit confirms 44 existing blocks; the status documents had reported 42.
- Root cause: the current report inherited an earlier tally rather than recounting all canonical lesson answers after the core accuracy package. The five-subject pilot test verified only its original twenty rubrics.
- Resolution: correct the current total to 56, preserve dated historical records, and state the recounted baseline of 44 in the follow-up ledger. No questions or model answers were removed to make a count pass.
- Verification: whole-corpus frontend parsing checks all 56 authored blocks are complete and separate from model answers; backend pagination checks the same total and all twelve newly authored question IDs. Final run results are recorded in the feedback ledger.
- Prevention: recount canonical content and run both whole-corpus checks before publishing a new feedback total. Update the assertions intentionally when adding or removing authored rubrics.
- Resolving commit: `f01f46a`; this follow-up records the verified implementation commit.

## RCA-2026-10-03-04 — Reader control assertion raced TOC extraction

- Evidence: push Verify run 37117838915 failed one of 712 frontend tests at `TopicViewer.test.jsx:182`: lesson headings were mounted, but the table-of-contents list was still empty. The same-head PR Verify run 37117848524 passed all 712 tests. Application and test source were unchanged in the initial content commit `05a3642`.
- Root cause: the existing interaction test awaited the Markdown content and reader shell, then synchronously queried a TOC link. `TopicViewer` extracts headings into section state in an effect after renderer readiness; visible lesson text did not prove that later update had finished.
- Resolution: await the actual accessible `Read Beginner Level` link before clicking it and asserting scrolling. Preserve the behavior assertions rather than retrying the whole suite or adding arbitrary sleeps.
- Verification: all 21 focused TopicViewer tests pass after the correction; the full frontend CI suite must pass on the resolving head before merge. The release ledger/PR records final results.
- Prevention: assertions for derived navigation must await the navigation target itself, not only the content or controls that precede it. This parallels the earlier lazy-Markdown browser race in RCA-2026-10-01-06.
- Resolving commit: `98a1ad5`.

## RCA-2026-10-04-01 — Category expansion reset across real lesson routes

- Evidence: the new Chromium journey reported an expansion reset in all six categories,
  although the isolated `TopicPage` navigation test passed.
- Root cause: expansion state initially belonged to `TopicPage`. The real application uses
  a pathname-keyed `AppErrorBoundary`, so navigating to another lesson remounted that page.
  The isolated test omitted this deliberate route remount.
- Resolution: keep expansion state in `TopicExpansionProvider`, mounted outside the keyed
  boundary in `App`. Preserve the current-lesson default and session-only state.
- Verification: the regression integration test now remounts routes by pathname; retain
  the Chromium expansion/keyboard/hash/reload journey for all six categories.
- Prevention: test shared route state against the actual application remount lifecycle;
  do not weaken error-boundary recovery to preserve local page state.

- Resolving commit: `05f8b5dbaef4b7c987813dff6d5ba01d51b170b9`.

## RCA-2026-10-16-01 — Teaching JAR smoke overlapped packaging on Windows storage

- Evidence: all eleven new AI example tests passed, but Spring Boot repackage failed moving `ai-backend-example-0.0.1-SNAPSHOT.jar.original` while the owned HTTP smoke process was executing that output JAR under `/mnt/c`.
- Root cause: the smoke command started before the Maven verify session completed. The build and runtime shared a mutable JAR on Windows-backed storage; the move failed and the smoke also reported a missing Logback class while packaging was in progress. The exact filesystem locking behavior was not independently measured.
- Resolution: stop the owned smoke process, complete packaging first, then launch the packaged smoke sequentially. The smoke will also copy the completed JAR to its own temporary directory to avoid retaining a lock on build output.
- Verification: sequential package completed and the packaged HTTP smoke passed all 50 fixture cases after the temporary-JAR change; record the resolving commit in the implementation results ledger.
- Prevention: await successful build completion before dependent runtime checks; use immutable temporary runtime artifacts.

## RCA-2026-10-16-02 — Live inference competed with browser-test memory

- Evidence: the installed 7B Ollama runner used about 4.9 GiB RSS on a 6.8 GiB WSL instance; available memory fell below 0.5 GiB and Vitest failed during jsdom import with ENOMEM before collecting tests.
- Root cause: a real inference experiment and frontend verification ran concurrently without sufficient memory headroom. The evaluator also wrote its report only at the end, so interrupted runs lost per-case diagnostic results.
- Resolution: stop only the owned evaluator, unload the model loaded for that experiment, serialize inference and browser verification, and atomically checkpoint evaluation progress after each case. Use a smaller explicitly reviewed local model for subsequent experiments.
- Verification: free memory returned above 5 GiB; all 14 parser tests passed with one worker. The smaller 0.5B model completed all 20 held-out cases; its atomic per-case report records completion and model/runtime provenance. The final field-quality score is zero, which is reported as a failed model-task fit rather than a test pass.
- Prevention: measure available memory and account for model/runtime/KV-cache plus test-runner use before inference. Live runs require recorded model digest/runtime and must not overlap browser tests on this constrained environment.

RCA-2026-10-16-01 resolving commit: `03620b7`. RCA-2026-10-16-02 resolving commit is recorded in the implementation ledger after commit.


## RCA-2026-10-16-03 — Secret scanner rejected sample configuration defaults

- Evidence: PR #55 GitGuardian check 117118376379 identified a Generic Password in the new teaching application's configuration in original development commit `03620b7`.
- Root cause: the loopback teaching example used fixed sample password defaults. They were not deployed credentials, but violated the repository's secret-scanning policy and could be copied into an unsafe deployment.
- Resolution: require runtime passwords/approval secret; generate ephemeral test and smoke credentials; preserve a local backup then sanitize only the agent's new feature history before force-with-lease push. No check exemption or credential output is required.
- Verification: all 29 example tests and the packaged authenticated cross-feature smoke pass with generated values. Final-head GitGuardian/CI checks must pass before merge.
- Prevention: examples fail closed without explicit credentials; deterministic tests generate their own values rather than embedding defaults in configuration.
- Resolving commit: final sanitized checkpoint, recorded in the implementation ledger after creation.


## RCA-2026-10-18-01 — Lesson artifact links resolved against application routes

- Evidence: twelve existing relative links from canonical lessons to example guides resolved under the deployed application instead of the source repository. The SPA could return its shell for that path, so HTTP 200 alone did not establish a usable guide.
- Root cause: the Markdown renderer had no curriculum source location and used browser-relative URL resolution for source-relative Markdown links.
- Resolution: resolve known curriculum files to their registered topic route and other source-relative artifacts to the canonical repository. Preserve native absolute, root-relative, fragment and query links and the existing unsafe-protocol filter.
- Verification: five real-renderer regressions cover artifact links, cross-category lessons, unknown lessons, existing native links and unsafe protocols; all eighteen related renderer/control/deck tests passed. Full frontend verification passed 826 tests.
- Prevention: treat source-relative Markdown links as a rendering contract; test the resulting anchor destination rather than only HTTP availability.
- Resolving commit: `a8a161a4def216d37442edea70aa313d297527af`.

## RCA-2026-10-18-02 — Completed HTTP smoke servers competed with independent MCP startup

- Evidence: a parallel local verification missed application readiness; a subsequent serial HTTP/evaluation run reached MCP but timed out its initialization while the completed HTTP fixture/application remained live. The same packaged JAR passed the isolated MCP check. The phased full smoke then passed.
- Root cause: the harness retained two no-longer-needed owned servers while launching an independent JVM on the constrained local environment. This was unnecessary resource overlap; an out-of-memory event was not measured in these runs.
- Resolution: stop only the completed smoke's owned HTTP servers before running the independent MCP subprocess, retaining bounded cleanup in the finalizer. Build completion precedes the smoke.
- Verification: packaged HTTP, authentication/CSRF, tenant/version/revocation, approved replay, both 30/20 fixture splits and real MCP negotiation passed in sequence without increasing protocol timeouts.
- Prevention: scope child-process lifetime to the evidence phase that needs it, and serialize resource-heavy local verification.
- Resolving commit: `a8a161a4def216d37442edea70aa313d297527af`.

## RCA-2026-10-18-03 — Oversized embedding numbers escaped the typed upstream boundary

- Evidence: an embedding response containing the finite JSON number 1e100 raised Jackson's numeric conversion exception while converting to float, instead of the intended bounded provider failure.
- Root cause: JSON numeric validity was checked before conversion, but float conversion itself could fail outside the provider's typed error translation.
- Resolution: normalize conversion failures into the embedding-provider failure boundary, producing the existing HTTP 502 behavior and preventing index publication.
- Verification: the invalidDimensionsTypesZeroVectorsAndWrongBatchAreRejected regression covers oversized numbers, invalid dimensions/types, zero vectors and batch mismatch. Integrated Java verify passed 55 tests with eight actual PostgreSQL cases explicitly skipped locally; dedicated CI must execute those cases.
- Prevention: validate the target numeric representation as well as JSON token type; malformed upstream output must remain within a typed failure boundary.
- Resolving commit: `3d33556` (source package `79ca5db`).

## RCA-2026-10-18-04 — Reliability admission raced executor handoff

- Evidence: a logically idle slot could receive an OVERLOADED result while its executor worker was still returning, where the next call should observe the circuit's OPEN state.
- Root cause: direct executor handoff and logical admission did not share a complete release/publication ordering; executor availability briefly lagged the logical slot.
- Resolution: use explicit semaphore admission with a bounded handoff buffer, and release admission before publishing completion. Requests still do not wait for capacity and admitted work remains bounded.
- Verification: all nineteen reliability tests and the packaged retry demo passed, including immediate rejection, cancellation, half-open behavior and zero admitted/active work after completion.
- Prevention: test the boundary between logical capacity, executor lifecycle and externally visible completion; do not hide admission races behind retrying tests.
- Resolving commit: `9ef9961` (source package `d983f66`).


## RCA-2026-10-18-05 — Join-first vector query did not establish HNSW execution

- Evidence: actual pgvector CI run39126466506 executed all63 tests without skips and failed the index-plan assertion. The plan used tenant primary-key scans, a nested join and a sort; disabling sequential scans did not force or prove an HNSW access path. Kafka/RabbitMQ and Redis/MongoDB jobs passed separately.
- Root cause: the nearest-neighbor ORDER BY/LIMIT shared a query level with the canonical-document join. The planner could choose the cheaper primary-key path for the tiny fixture, so the query/test did not demonstrate the intended vector access path.
- Resolution: materialize a bounded, tenant-partition-scoped nearest-candidate phase before the current enabled/version authorization join. The explicit diagnostic discourages both sequential scans and sorts, runs EXPLAIN ANALYZE BUFFERS, and requires positive actual loops on the named HNSW index. Normal application queries retain planner freedom; no index speedup is claimed.
- Verification: targeted local compilation/regressions passed thirteen tests with eight actual PostgreSQL cases explicitly skipped. Final-head real-service CI must pass the unchanged eight-case no-skip gate before merge; this record does not substitute for that evidence.
- Prevention: distinguish index existence, eligible SQL, planned access and actual index execution. Preserve tenant/freshness checks when making nearest-neighbor access eligible; never weaken the assertion to accept a sort.
- Resolving commit: `df001dc155fd87822eb657045cd046e4883b781f` (source `c1fc3b5`).


## RCA-2026-10-18-06 — Workflow evaluator report retained raw fixture evidence

- Evidence: the first ProjectC privacy regression found a synthetic private marker in the report. An expected-evidence match had been copied into `result.evidence`. This was an evaluator-output bug involving fictional fixtures, not a business-data or model disclosure.
- Root cause: the evaluator reused raw values needed for internal assertions as externally emitted evidence instead of separating observation from a safe assertion label.
- Resolution: compare raw evidence internally; emit only numbered output-check labels or a small allowlist of non-sensitive operational names. Reports omit prompts, tool payloads and approval tokens.
- Verification: `fiftyRealApplicationCasesKeepTaskRefusalAndPolicyMetricsSeparate` now passes, the full source-package suite passes, and the actual packaged50-case report was independently scanned for private markers, tokens, JDBC and absolute temporary paths. An independent negative observer test verifies policy violations can still be detected without outputting raw values.
- Prevention: separate internal sensitive observation from published evidence; assert both behavior and report privacy. These are synthetic tests, not proof that all future real inputs are safe to log.
- Resolving commit: `f18625e` (source `8901acfd89350ac479d1e19601ce15871f2e1f3e`).

## 2026-10-18-07 — incomplete cloud-tag rejection in unpublished streaming draft

**Finding:** independent prerelease review found the new loopback streaming constructor rejected
`:cloud` but allowed Ollama's documented `:120b-cloud` form. Loopback alone cannot establish local
inference because a daemon can proxy a cloud model. No cloud-model request or data disclosure was
observed; the draft was not released.

**Correction:** reject known cloud suffix forms, cover both forms/case variants in the actual
client tests, and state the residual alias/custom-daemon boundary in the guide. Optional live
checks use an explicitly inspected, already-installed local model; no download or paid call is
required. Keep operator-declared command provenance separate from independently observed inventory.

## 2026-10-18-08 — container idle timeout beat webhook body handling

**Observed failure:** the new lab's actual incomplete-body HTTP test received 500 after 2.088 seconds.
Its original two-second container idle-read budget fired before the application body timer of
2.5 seconds. Passing signature/transaction unit tests had not exercised that transport ordering.

**Correction and regression:** the owned loopback listener now allows five seconds for the container
idle read; the application body timer can return its fixed 408 first. The packaged regression
requires an actual 408 within four seconds and records measured duration (3.227 seconds in the
source checkpoint). SQL locks/queries and injected post-commit delay retain separate budgets.
This resolves the observed ordering; it does not claim a hard end-to-end preemption deadline.

## 2026-10-18-09 — test-runner cleanup depended on parent liveness

**Finding:** the new testing harness originally terminated its owned process group only while the
Maven parent was alive. A parent can exit while a fork retains stdout, leaving the read loop to
reach its deadline with a surviving child. Review identified the ownership/liveness mismatch.

**Correction and evidence:** cleanup now always targets the exact group created with
`start_new_session`, with bounded TERM grace, KILL fallback and parent reaping. An actual fork
regression exits its parent, holds stdout and ignores TERM; it verifies the corrected deadline
path leaves no executable child. Six Python guards pass, including a privacy regression that
keeps injected secrets/errors out of the allowlisted failure diagnostics. No foreign process
name scan or global container cleanup is used.

## 2026-10-18-10 — pinned PostgreSQL image rejected before Testcontainers startup

**Observed:** PR78's actual test job failed in class setup, while four native Java guards passed.
The completed diagnostic reproduced Testcontainers rejecting the exact `postgres:16.15@sha256:...`
image string as an incompatible substitute before Docker/application startup. Owned native
probe resources were cleaned; this was not a PostgreSQL query/load failure.

**Minimum release correction:** explicitly declare that the already-pinned official PostgreSQL
image is compatible with `postgres`, as required by Testcontainers' image identity check. The
image digest and actual server-version assertion remain unchanged. No skip, fallback database,
relaxed counts or bypass is introduced. Actual Docker CI must still execute all eight Java cases
and validate the load/cleanup report before merge. New implementation work is frozen per request.


## 2026-10-21-11 — unpublished comparison cancellation, inventory and freeze binding

**Observed:** independent prerelease review reproduced SIGTERM stopping the comparison wrapper
while its newly created Java process group remained alive. The first draft also checked a prompt
version name without enforcing the frozen instruction hash; its in-process inventory relied on
socket timeouts rather than a whole-phase deadline. No released API or application default changed.

**Cause:** normal child-error cleanup did not cover the wrapper's default SIGTERM exit; version
labels were treated as sufficient attribution; inventory work preceded the overall run timer.

**Correction:** resolving commit babf8f57cd5646758694f861d9ed8e33a838bb3f translates SIGTERM into
owned-child cleanup and an interrupted report, restores the previous handler, validates actual
reported prompt hashes against Java-17-compiled frozen commit 2d1247d, and executes inventory in
an owned worker with a hard ten-second execution budget, output cap and proxy bypass. The overall
clock starts before inventory; the separate bounded child-cleanup allowance is declared. Hash
binding is explicitly narrower than independent build/JAR or daemon attestation.

**Verification and prevention:** all eleven Python guards pass, including actual Java SIGTERM,
slow-drip inventory deadline, output cap and frozen-hash mismatch regressions. The packaged HTTP
exercise passes eight calls with exact counts 3/4, 2/4 and 4/4 and preserves its injected failure
and paired regression. Both gates now run in Verify. The already-completed development report is
retained byte-for-byte, with a separate dated validation record; no observations are fabricated
or silently backfilled. Actual held-out execution uses the hardened wrapper.

## RCA-2026-10-21-12 — cancellation interrupted subprocess ownership and scope entry

**Observed:** positioned actual TERM immediately after real Popen returned, before its caller
assigned the handle, left an owned child alive in both released comparison and engineering
helpers. All eight new boundary subcases fail against b9dfe35: TERM loses the ownership marker;
INT reaches the original caller handler. The test fallback killed and waited for each exact
owned child. The unpublished SSRF module had the same assignment/registration window. A second
independent SSRF probe delivered TERM during signal-handler installation, before context entry
returned, and proved its TERM handler remained installed because __exit__ never ran.

**Cause:** finally-based cleanup assumed a child handle had already reached its owner. A main-thread
signal mask alone cannot prevent Python's main-thread handler running when another live thread
receives the signal. The SSRF class context manager also relied on exit for setup rollback.

**Resolution:** executable opt-in TERM/INT guards defer cancellation briefly across Popen assignment
and active registration inside an already-active finally. Once ownership exists, pending delivery
unwinds the existing finite cleanup. Caller signal masks are unchanged, prior handlers/state are
restored, and repeated cancellation does not interrupt owned cleanup. SSRF context entry rolls back
both handlers and outer state if setup is interrupted. Library calls alone do not install this
process-wide policy. No preexec_fn, foreign-process scan or SIGKILL cleanup guarantee is introduced.

**Verification/prevention:** engineering's fifteen tests and comparison's thirteen include actual
TERM/INT before the Popen wrapper returns, delivered directly or to an unmasked live thread while
the main thread masks that signal. An observer proves handler execution before return; tests require
the child already waited, /proc absent and pipes closed before their fallback. Restoration is tested
on success, spawn failure and cancellation. Packaged comparison still observes eight calls and exact
3/2/4 counts with the original default. SSRF adds the analogous four-case matrix and actual TERM/INT
scope-entry interruption/restoration; its final sixteen-test/26-HTTP suite and source-bound receipt
are verified independently. Future owned-child harnesses must test the assignment boundary and
setup failure, not only cancellation after work starts.

**Resolving commits:** ec7dff5 (source be2f4395c7e5e6bd001bbc22b0baad0f63e188c9),
6838623 (source 9cdf4c3) and b2e3d00 (source 30b6af45e1fd6e64513c17a5901cd1a3c0f36b26).

## RCA-2026-10-21-13 — huge decimal framing escaped the typed fetch result

**Observed:** an actual HTTP response contained a 5,000-digit Content-Length that fit the lab's
16KiB wire cap. Python's integer-conversion digit limit raised ValueError outside the typed
fetch rejection boundary. This was found in the unpublished SSRF module; no foreign service was
contacted and no released platform endpoint was affected.

**Cause:** decimal syntax and wire size were checked, but unbounded conversion preceded the
application body-cap comparison. Syntactically decimal input need not be safely convertible.

**Resolution:** compare canonical decimal length/text against the finite body cap before converting
the now-bounded value. Leading zeros are normalized for comparison; malformed, duplicate and
over-limit framing retain explicit rejection. The real 5,000-digit regression requires body_limit
and a successful next request through the same one-slot fetcher, proving capacity recovery.

**Verification/prevention:** actual transport and recovery pass in the final sixteen-test/26-request
suite, with no skips and complete owned-resource cleanup. The dedicated CI requires this exact
case and rejections in its sanitized report. Check target numeric representation and conversion
limits wherever untrusted decimal headers cross a typed boundary.

**Resolving commit:** 6838623 (source 9cdf4c3).

## RCA-2026-10-21-14 — documentation conflict resolution consumed unchanged tails

**Observed:** the unpublished Java-pilot rebase reported 1,796 deleted lines. Inspection found
AGENTS.md reduced to 19 lines and CONTEXT.md to 18. The intended edits were additive; no feature
required deleting their remaining instructions or architecture. No truncated document was pushed.

**Cause:** a local conflict-resolution expression enabled DOTALL for the conflict bodies but also
used an unrestricted dot in its closing-marker match. That final match consumed the unchanged
remainder of files whose conflict occurred near the top. The two end-of-file conflicts hid this
mistake because they had no following tail.

**Resolution:** reconstruct all four documents with git merge-file from the exact current main,
original base and pilot commit; combine only the additive conflict bodies using newline-bounded
marker matches. The complete unchanged tails are retained. Do not resolve whole-file Markdown
conflicts using a greedy regular expression.

**Verification/prevention:** restored AGENTS.md to 816 lines and CONTEXT.md to 717. Their final
diffs against main contain only seven/eight additions and zero deletions; README has six additions
and zero deletions before the separate source-review note. Every reconstructed file matched the
complete three-way result; no conflict markers remain and whitespace checks pass. Inspect the
whole diff and document beginning/end after conflict resolution, including files with early
conflicts. A successful rebase exit alone does not establish preservation.

**Resolving commit:** bf55826.

## RCA-2026-10-21-15 — reference prose compression invalidated migrated-question evidence

**Observed:** PR82 frontend job119453693487 in run39666746310 failed the existing migration gate
for legacy-json:java-fundamentals-memory:javamemory:quiz:0deb0d64ed30. All109 entries were resolved,
but the exact cited sentence was absent from the memory lesson. Earlier local lesson/render checks
passed; they do not verify the separate simulator-question migration ledger.

**Cause:** the S04 boxing addition compressed related reference prose to retain the600-line contract.
It preserved the mechanism, all question IDs, eleven prior code blocks, headings, diagrams and
interview tail, but paraphrased an existing literal citation outside those protected regions.
The full migration gate was omitted from that content unit's local verification.

**Resolution:** restore the exact sentence about copied parameters and independent variable storage
within the existing two-line explanation. Keep copied-reference mutation and both pass-by-reference
misconceptions explicit. The lesson remains600 reported lines; no ledger entry, disposition,
expected quote, question, diagram or test gate is weakened.

**Verification/prevention:** the unchanged real migration gate passes109/109 resolved with zero
pending; the exact topic contract passes600 lines/four diagrams/fourteen questions/three mappings.
All protected blocks/headings/tail remain unchanged. Require the migration gate after prose
compression and paraphrase, not just simulator deletion; a semantic equivalent does not satisfy
an intentionally literal evidence contract. Final-head CI must rerun before merge.

**Resolving commit:** 7ea7a72 (source c0a424a500db4ab0b6cfcfd26195d075d6234ab4).

## RCA-2026-10-23-04 — first cancellation interrupted ordinary cache-runner cleanup

**Observed:** independent review positioned the first SIGINT during normal successful cleanup of
an actual READY-confirmed TERM-ignoring child. The runner sent TERM, then cancellation escaped
before wait/KILL. The child remained running with its pipe closed; review finally removed only
its exact owned process group. Earlier tests delivered cancellation before cleanup and missed this
window because their requested flag suppressed subsequent signals.

**Cause:** Popen assignment was deferred but the ordinary finally's stop/wait/stream-close sequence
was not. Ownership after startup alone does not prevent a new signal from interrupting teardown.

**Resolution:** defer cancellation across the entire active cleanup finally, then deliver it after
owned termination/wait and pipe closure. Preserve library caller policy and masks, non-group
behavior and unrelated groups. Descendant termination is not a claim of grandchild reaping.

**Verification/prevention:** four Python tests pass. The positioned READY-confirmed regression covers
first TERM and INT during otherwise successful cleanup, requires direct child already waited with
SIGKILL, PID absent, streams closed, original handlers/mask restored and another real group still
alive. An in-memory original-implementation mutation fails both signal subcases; test fallback
reaps its exact children. Final changed-runner native Redis verification passes all9 cases without
skips, actual Redis8.6.2/Java17, owned workspace removed. Actual combined MongoDB cases still require
CI. Cover first cancellation during normal completion as well as startup and already-cancelled work.

**Resolving commit:**eeea2db (source fa91c02a5cb8247f1b718803704dc5141b088f6f).

## RCA-2026-10-23-05 — MongoDB refused the CI host kernel before tests

**Observed:** PR87 run39999159858/job120570429199 retained the owned service state: Redis running,
MongoDB exited1, oomKilled=false. MongoDB message12257600 explicitly identifies its kernel
compatibility guard and SERVER-121912. No Maven/service cases executed. The earlier run failed
similarly without retaining sufficient startup evidence; it was not a cache assertion failure.

**Cause:** an image digest pins database/userspace bytes, not the Docker daemon host kernel.
The unqualified latest runner could use a kernel in MongoDB8's documented TCMalloc-incompatible
range. The failed artifact did not retain the exact kernel version, so no exact value is invented.
Official MongoDB8.0 notes identify Linux6.19 through7.0.13 and state7.0.14+ resolves that issue.

**Resolution:** use the supported Ubuntu22.04 LTS service runner, observe the actual Docker daemon
kernel/architecture/OS/version before service creation and explicitly reject the documented range.
Keep the pinned MongoDB image and its startup guard. Retain bounded runtime metadata with failure
artifacts; do not downgrade to an old image or disable a guard to manufacture test execution.

**Verification/prevention:** the [selected actual startup receipt](docs/evidence/MONGODB_STARTUP_2026-10-23.json)
records state, vendor message ID and original artifact hash without credentials or raw private
configuration. The next final-head job must observe a permitted daemon kernel and execute all17
actual service cases with zero skips. An allowed kernel excludes this one incompatibility; it does
not certify every future platform. Real service verification and merge remain pending.

**Resolving commit:**ce4a103; supported-runner execution pending.
## RCA-2026-10-21-16 — gateway launcher exit left an owned descendant running

**Observed:** independent prerelease review of gateway source33f15ce launched a disposable
new-session command whose leader exited0 while a live descendant retained stdout. The actual
deadline returned with the captured pipe closed but the owned descendant still running. The
reviewer removed only that newly created group afterward. No Docker service or foreign process
was used in this reproduction.

**Cause:** commands.stop() gated process-group signalling on the direct child's poll() result.
An exited launcher does not establish that its owned group or inherited pipe writers stopped.
The existing startup tests covered an executing leader and missed this later lifetime boundary.

**Resolution:** signal the owned new-session group even after its leader exits, bounded-wait the
direct child and close the pipe. Keep non-group mode limited to its individual child and leave
unrelated groups alone. A grandchild reaped by its OS parent is not falsely reported as reaped
by this runner; the regression requires it absent or no longer running.

**Verification/prevention:** the positioned regression waits for actual leader exit before
exercising deadline and TERM/INT paths. It requires the direct launcher reaped, captured stdout
closed, descendant absent/nonrunning, original handlers restored and a separate real group still
alive. A second actual non-group timeout forbids killpg. All14 native guards pass, including
prior startup/scope-entry cancellation and actual Java17 fixture compilation. Dedicated actual
Nginx/container CI is still required and is not implied by this process-only observation.

**Resolving commit:**99e89a2 (source a5b685edce3a2ca7f3ddf5f65d1eb0d104ed7254).

## RCA-2026-10-23-01 — requested gateway port was not an actual Docker binding

**Observed:** PR85 actual-nginx-http job119474051306 in run39672590492 failed during prepare:
NetworkSettings.Ports[8080/tcp] was null, then len(null) raised TypeError. No HTTP case executed;
the failed artifact records an empty case list and verified owned cleanup. Other green checks
cannot establish this missing integration behavior.

**Cause:** the gateway was attached exclusively to an internal bridge, and the runner treated
an accepted publish request as an actual host mapping. The null value was also not handled as
a typed setup failure. Upstream Moby discussion53256 reports the same internal-only mapping
behavior; that report supports the diagnosis but does not prove this lab's repaired execution.

**Resolution:** retain task/probe only on the owned internal backend network; attach only the
gateway to a second owned publishing bridge. Inspect actual network membership/internal flags
and a single127.0.0.1 host binding. Record before-attachment publication/running state and the
observed Docker server version. Reject absent, multiple, nonloopback or invalid bindings with
a typed failure. Cleanup checks labels/IDs and removes both exact networks. The ingress bridge
can provide outbound routing and is explicitly not production egress enforcement.

**Verification/prevention:**15 native guards pass, including null/empty/nonloopback/invalid-port
rejection and cleanup of the additional network while preserving unrelated resources. Actual
20-case Nginx CI, source binding, network observations and owned cleanup remain required before
merge. Do not substitute HostConfig's requested binding or a community report for actual mapping.

**Resolving commit:**1c095b7; final actual-service evidence pending.

## RCA-2026-10-23-02 — a second gateway diagnostic JVM exceeded its finite setup

**Observed:** actual job120562398597 in run39996822363 now confirms the network repair on
Docker29.4.2: Nginx was running with null publication before the ingress join; afterward its actual
loopback mapping and isolated backend membership passed. Four actual HTTP cases passed. The next
docker exec started a second Java process in the probe's configured32-PID/96MiB container and
failed pthread_create(EAGAIN), then OutOfMemoryError while starting HttpClient's selector thread.
The failed receipt confirms exact cleanup. No cgroup counter history was retained, so the exact
exhausted OS resource is not independently proven and this is not Java heap-exhaustion evidence.

**Cause:** an unnecessary second JVM duplicated runtime/thread overhead inside a finite container.
Native compilation could not reveal the actual container resource interaction.

**Resolution:** the existing diagnostic server performs the same fixed unauthenticated GET with
forged identity metadata through one shared bounded HTTP client. It returns the observed service401
alongside sanitized forwarding metadata. No target URL or credentials are accepted or forwarded.
The harness observes one Java process and the declared32-PID cap; old direct-launch mode is rejected.
The20 mandatory HTTP assertions and the service's unchanged security boundary remain intact.

**Verification/prevention:** all15 native guards pass, including actual Java17 compilation and
rejection of unknown/obsolete launch modes before network access. Exact-head actual Nginx CI must
still establish all20 cases, actual single-JVM/network observations and cleanup. Keep setup and
native compilation distinct from real container execution; inspect process/PID/native-memory
constraints before treating every OutOfMemoryError as a heap-size problem.

**Resolving commit:**2f326b6; actual final-service verification pending.

## RCA-2026-10-21-17 — late WebSocket admission revived a revoked session

**Observed:** prerelease review identified invalidate-before-reserve ordering in source6d5c389.
A focused actual registry regression failed: after invalidate(oldId) returned with no reservations,
reserve(alice,oldId) still returned a new reservation. The old test covered only invalidation
following admission. No released platform endpoint or external session was affected.

**Cause:** invalidation closed existing reservations but recorded no live authentication state;
reserve accepted any retained request's principal and session ID. A request authenticated before
reauthentication can reach the endpoint later. Tomcat getId alone does not establish validity.

**Resolution:** successful form login registers the live session ID and principal in a bounded
map; destruction/rotation removes membership under the admission lock. Admission never creates
authentication membership, checks the exact principal and rejects stale requests with401.
Registration validates servlet session liveness under the same lock; bind also rechecks membership.
The map has at most32 entries, removes destroyed IDs and clears at shutdown, avoiding unbounded
revocation tombstones. Existing connection/capacity release remains idempotent.

**Verification/prevention:**9 policy tests pass, including late admission after invalidation,
a retained Alice principal against Bob's rotated session, and registration after destruction.
The real transport test pauses an actual authenticated Alice upgrade after the security chain,
performs Bob form login/ID rotation over HTTP, then releases the request:401 is mandatory and a
fresh Bob socket must echo successfully. All22 actual transport cases and5 Python harness guards
pass, preserving established-socket logout, independent actual expiry, original REST owner/CSRF,
ACK/message limits and cleanup. The sanitized source-bound receipt records actual Java17,
Boot4.1.1,Framework7.0.9 and Tomcat11.0.24; dedicated final-head CI remains required. Cover both
orders around revocation, not just closing already-admitted sockets.

**Resolving commit:**68ab14c (source b93a49d; original module6d5c389).

## RCA-2026-10-23-03 — WebSocket preparation hid offline test prerequisites

**Observed:** PR86 actual-session-websocket job119475144049 in run39672905738 returned only
LabFailure with no completed transport receipt. That historical report does not identify a unique
Maven failure phase. A separate controlled repository overlay omitted only Surefire's dynamically
selected JUnit provider: old skipTests packaging exited0, then offline verification exited1 with
surefire-junit-platform unavailable. The original local warm cache masked this prerequisite defect.

**Cause:** preparing package dependencies with tests skipped does not execute provider selection.
The failure report suppressed all child output, including safe phase/test identity, so it could
not distinguish missing prerequisites from a transport assertion. Local success was insufficient
fresh-runner evidence; no runtime claim is inferred from the old generic failure.

**Resolution:** prepare packages while running all9 policy tests, require their no-skip report,
then run the full verification offline. Record observed preparation test count and offline mode.
Failure receipts expose only fixed phase, exit code, a missing-provider boolean, owned suite names
and source-line numbers from new bounded reports. Raw messages, credentials, cookies, paths and
response bodies are excluded. Stale or foreign reports cannot supply diagnostics.

The module also contained the reviewed scope-entry and normal-cleanup guard gaps: place thread-
local state assignment inside restoration try and defer the first TERM/INT through complete
termination/wait/pipe close. Existing caller policy, masks, nested state and other groups remain.

**Verification/prevention:** the controlled missing-provider overlay now downloads the provider
through actual policy preparation and passes offline verification (both exits0). All22 actual
HTTP/session/socket cases,9 policy tests and8 Python guards pass on final local sources. Diagnostic
privacy/staleness cases pass. Actual first-signal cleanup tests use a READY-confirmed TERM-ignoring
child; the original close implementation fails both signal subcases, while the fix requires the
child already killed/waited, pipes closed and an unrelated group alive. Actual positioned scope-
entry TERM/INT cover caller and nested restoration. Final remote CI remains required; the old
failure is not declared fully diagnosed until the new actual-service check passes.

**Resolving commit:**f31d66a; source-bound final local receipt WEBSOCKET_SESSIONS_2026-10-23.json.

## RCA-2026-10-21-18 — AI runner scope entry left thread-local state changed

**Observed:** independent review delivered actual SIGINT immediately after compare_tickets assigned
its thread-local cancellation scope but before its restoration try began. The caller's handler was
preserved, but scope state was not restored. Review restored its owned state afterward; no children
or external calls were involved. The new observation runner reused this existing helper.

**Cause:** state assignment preceded the restoration try. Tests covered installed-handler and Popen
boundaries, not cancellation from the caller/outer handler at this earlier entry mutation.

**Resolution:** move scope assignment inside the existing try/finally; preserve caller handlers,
masks, nested scope and cancellation propagation. No prompt, dataset or model behavior changes.

**Verification/prevention:** actual positioned TERM/INT tests cover caller-handler and nested-guard
entry, unreachable body, no swallowed cancellation and normal nested LIFO restoration. Existing
Popen/live-thread and caller-policy tests remain. Current comparison suite passes15 tests; the
observation guards pass5, including the actual packaged fixture. Frozen packaged comparison still
has8 HTTP calls and unchanged3/2/4 matches. Source f3e483a integrates6cd3070; final CI is required.

**Resolving commit:**f3e483a (source6cd30702a156b385dbe09abcb99b2da8202cedf3).

## RCA-2026-10-23-07 — first cancellation escaped AI child teardown

**Observed:** the reused bounded_child helper also stopped children outside cancellation deferral.
Positioned actual TERM/INT after a deadline began cleanup of a READY-confirmed TERM-ignoring child;
both cases escaped with child.returncode=None. Test fallback killed/reaped only its exact child.
The old requested flag protected repeated signals but did not protect the first signal in cleanup.

**Resolution:** defer cancellation through selector closure, owned-group termination, direct-child
wait and pipe closure, then deliver it. Keep caller policy, unrelated groups and original timeout
behavior. Imports alone do not replace host signal handlers; no SIGKILL cleanup promise is made.

**Verification/prevention:** both old-code signal cases fail the child-wait invariant. After the fix,
the child is already SIGKILL-waited, PID absent, pipe closed, original handlers/mask restored and a
separate group alive. All15 comparison guards,5 observation guards and the actual packaged8-call
comparison pass. Preserve startup, scope-entry and first-cancellation teardown as separate cases.

**Resolving commit:**1c510cb.

## RCA-2026-10-23-08 — equivalent AI timeouts received different trace categories

**Observed:** integrated Maven verification failed the actual pipeline's stage attribution gate.
A separate SDK regression proves the adapter's native HttpTimeoutException wrapper is classified
TRANSPORT although the timed Future.get path is DEADLINE. The native wrapper and wait can finish
in either order; the historical generic failure did not retain its precise enum, so that initial
run's unique path is not invented.

**Cause:** trace classification recognized provider_deadline but treated all exceptional HTTP
completion wrappers as generic transport errors, including HttpTimeoutException and its connect
timeout subclass. The original public ModelFailure codes were already different and stay unchanged.

**Resolution:** classify both known HTTP timeout wrappers as DEADLINE for tracing, keep non-timeout
network failures TRANSPORT, and add fixed scenario/enum-only fixture failure diagnostics. No public
exception, prompt, default or application acceptance rule is changed.

**Verification/prevention:** the old SDK regression fails expectedDEADLINE/actualTRANSPORT. The new
case checks all3 causal stages, same exception identity, connect/response timeouts, a NoRoute control
and no raw private event/error export. Full Maven passes128 tests with11 explicit optional PG/OCR
skips; all117 local executions pass. The actual packaged fixture retains12 scenarios/14 operations/
11 HTTP/83 spans,7 known/5 unknown usage; all20 Python guards and packaged comparison pass. Dedicated
real PG/OCR and final-head CI remain required. Timing races must not silently change failure meaning.

**Resolving commit:**1c510cb.
**RCA-2026-10-23-05 verification update:** actual job120574386977/run40000312697 observes
Docker kernel6.8.0-1064-azure and executes all17 service cases without skips. The selected CI
receipt is docs/evidence/CACHE_SERVICES_CI_2026-10-23.json. Historical exact bad-kernel value stays
unknown; no guard was disabled and no test gate was weakened. Final integrated release is pending.
## RCA-2026-10-23-06 — gateway timeout expectation confused server and wire status

**Observed:** actual gateway job120572873600 in run39999874593 passes13 HTTP assertions,
including the direct service401, and observes one diagnostic JVM under the configured32-PID cap.
The stalled-body client then receives EOF before any HTTP status, raising RemoteDisconnected.
Cleanup succeeds. The old failed run did not retain gateway logs before teardown, so its server
status is not invented from that EOF.

**Cause:** the test assumed every request classified408 by Nginx must transmit a408 status line.
Selected Nginx1.30.6 ngx_http_finalize_request sends request-timeout outcomes through request
termination before the normal special-response path. Server classification and client observation
are different evidence. The late-only log collection hid the missing distinction on early failure.

**Resolution:** record HTTP408 and EOF-before-status as separate wire outcomes; never relabel EOF.
Final acceptance also requires exactly the stalled-body access-log entry with status408, so arbitrary
disconnects cannot pass. Keep all20 assertions. Retain bounded credential-redacted gateway logs
before failed-run cleanup; cancellation still propagates after owned cleanup.

**Verification/prevention:** all16 native guards pass. A real owned TCP fixture separately emits408
or closes after reading the first body byte; the client must report the two different outcomes,
without a fabricated status or leaked thread. These fixtures are not Nginx evidence. Final actual
CI must establish the wire observation plus matching server408 and all remaining cases. The prior
run's missing log cannot be retroactively inferred. Source: Nginx1.30.6 request finalization and
client_body_timeout documentation, checked2026-10-23.

**Resolving commit:**0e4192e; final actual Nginx evidence pending.

## RCA-2026-10-23-09 — first cancellation escaped persistence child cleanup

**Observed:** the expanded persistence command helper performed its final stop/wait/pipe closure
outside cancellation deferral. A positioned test sent the first actual TERM and INT when a
READY-confirmed TERM-ignoring owned child entered deadline cleanup. Both original subcases
returned with child.returncode=None; test fallback removed and waited only its exact children.

**Cause:** startup ownership deferral did not cover first cancellation during ordinary teardown.
The earlier SQL-resource cleanup guard and startup-signal cases exercised different boundaries.

**Resolution:** defer the entire owned child stop/wait/stream-close sequence, then propagate the
pending cancellation. Preserve non-group/library behavior and caller signal handlers/masks.

**Verification/prevention:** the original implementation fails both new signal subcases; the
corrected14-test guard suite passes. The positioned test requires SIGKILL fallback completed,
direct child reaped/PID absent, all pipes closed, caller policy restored and another real process
group alive. Actual final-source PostgreSQL16.15 verification also passes all12 tests without
skips, ten case groups, real backup/restore and exact owned database/role removal. Source receipt
is examples/backend-persistence/evidence/2026-10-23-local.json. No Docker or SIGKILL-cleanup
guarantee is inferred.

**Resolving commit:**8d10fbd.

## RCA-2026-10-23-10 — patch prefixes hid a required lesson section

**Observed:** the DBMS transactions reference lesson retained eight literal leading plus signs
in ordinary Markdown prose, including `+### Common Misconceptions`. Actual Chromium in both
themes renders the marker text and zero misconception headings. Blame binds those bytes to
89315267f2eaee72e73bf58eb1f4986946b78c3b. The final pre-fix main frontend check also passed
content validation (PR88 job120595913566); previous structural success did not prove a heading.

**Cause:** patch-like addition prefixes were committed as lesson bytes. The exact original
authoring mechanism is not retained. The validator's unanchored heading regex matches inside
that paragraph; it can also match code or an earlier tier. It checked a substring rather than
the reader's rendered section structure.

**Resolution:** remove only the eight prefixes in a one-file content unit. Reuse the reader's
parsed Markdown outline to require a level-three misconception heading within the Expert tier.
Code, prose, h4 headings and prior-tier examples cannot substitute for the required section.
No general ban on legal Markdown plus-list syntax or fenced diff examples is introduced.

**Verification/prevention:** the new gate rejects the original lesson before repair, then all
68 lessons pass after repair. All 20 content/migration/charset script tests pass, including
12 validator tests with backtick/tilde/indented code, malformed prefixes, inline formatting,
LF/CRLF and tier placement. Actual before/after Chromium observes 0→1 misconception headings
and visible→absent patch text in both themes. All original code/diagram and question/rubric
text is unchanged; the 109-item literal migration gate and 295-diagram/590-asset check pass.
The selected receipt is docs/evidence/RENDERED_SECTIONS_2026-10-23.json. Final integrated CI
remains required; this is a rendering/contract repair, not new learner or technical-review proof.

**Resolving commits:**3f1c7c5 (shared parsed-outline gate),c55471e (exact prose repair).

## RCA-2026-10-23-11 — debugging guard entry and normal cleanup escaped restoration

**Observed:** positioned actual TERM/INT against the unchanged debugging helper fail six
subcases. Immediately after thread-local assignment, caller-handler and outer-guard cancellation
leave the inner scope installed. During normal successful cleanup of a READY-confirmed
TERM-ignoring child, cancellation escapes after real group TERM with returncode=None. Test
fallbacks restore state and kill/wait only exact disposable children; an unrelated group survives.

**Cause:** cancellation_guard assigned its state before the restoration try. OwnedProcess.close
closed its selector and performed stop/wait/pipe closure outside cancellation deferral. Startup
ownership tests exercised other timing windows and did not establish these two guarantees.

**Resolution:** place scope assignment inside its try/finally and defer the whole close sequence.
Keep the original caller handlers/masks, nested LIFO state, library/no-guard behavior, finite
waits, exact new-session groups and cleanup of descendants after launcher exit. No imported
Task Tracker source/resources or fixed JDI target changes.

**Verification/prevention:** regression commit08a3b3a fails six actual signal subcases against
old code. Fixed code passes all nine native tests, including six actual Spring configuration
launches and real JDI conditional/step/caught-exception events. Root independently reruns all
three new guard tests successfully. The tests cover scope entry from caller/nested handlers and
the first signal during normal teardown, plus actual child wait/closed pipes and another group
remaining alive. Fresh sanitized receipts preserve actual Java17 runtime, imported sources and
owned cleanup. The selected local record is docs/evidence/BACKEND_DEBUGGING_CLEANUP_2026-10-23.json;
its additional module snapshot is explicitly post-run rather than an independent execution
attestation. Dedicated final-head actual-service CI remains required. Other helper copies are
being audited separately; this entry does not certify every process wrapper.

**Resolving commit:**ad3281e16a2ed55508d6e544b267c7a9e2182fb4.

## RCA-2026-10-23-12 — engineering command entry and cleanup escaped its opt-in guard

**Observed:** actual TERM/INT on baseline22fab5a fail eight positioned subcases: four caller/nested
scope-entry cases leave thread-local state installed, two deadline cases leave a READY-confirmed
child running with stdout open, and two successful-command cases leave stdout open. Exact test
fallbacks reap owned children; an unrelated group remains alive. The sanitized process-audit
receipt retains baseline hashes and observations, including controls and evidence limits.

**Cause:** commands.py assigned scope state before its restoration try and performed its finally
stop/wait/stdout close outside deferral. Startup-only guards did not cover first-signal teardown.

**Resolution:** move assignment into the restoration try and defer complete command cleanup.
Keep library policy, finite bounds, non-group behavior and exact group ownership. The AI-review
path opts in; runner.py and linux_probe.py do not. The guide now states that actual boundary.

**Verification/prevention:** three new positioned tests cover all eight failing signal subcases.
The full18-test discovery passes actual Git/bisect/revert/Java/offline Maven/Linux and patch review;
root repeats18/18 in41.834s. Source/test discovery in Verify still includes these regressions.
No real learner or repository-wide arbitrary-BaseException guarantee is inferred. Dedicated final
integrated checks remain required. See docs/PROCESS_LIFECYCLE_AUDIT_2026-10-23.md.

**Resolving commit:**d9bc81a9747c35cef69ce48d3b25ff576de96d36.

## RCA-2026-10-23-13 — first cancellation interrupted resolver finalization

**Observed:** four actual TERM/INT subcases against the old SSRF resolver leave an owned timed-out
worker/pipe or successful worker registry/event incomplete. Timeout cases position the first
signal at actual KILL after an actual fixture-worker timeout; success cases position it at the
second communicate. These are trusted checked-in resolver fixture plans, not request exemptions.

**Cause:** existing Popen ownership deferral did not cover Resolver.resolve's complete finally
stop/communicate/active-registry/event sequence. Correct scope entry alone did not protect it.

**Resolution:** defer the full finalization sequence under the existing executable policy before
delivering cancellation. Preserve library handlers/masks, numeric-peer/original-host TLS identity,
all-address/origin validation, request bounds and no-redirect/no-forwarding constraints.

**Verification/prevention:** a282b3e reproduces the four old failures. Fixed18-test actual verifier
passes without skips, retaining26 actual HTTP requests, TLS, framing rejection/recovery and exact
cleanup. New tests require closed pipes, terminal waited child, absent PID, cleared registry,
recorded event, restored policy and recovery while an unrelated group survives. Root repeats
all18 in7.312s. The source-bound module receipt and dedicated workflow include the new test and
four cleanup evidence rows. No production egress, IPv6 transport or SIGKILL guarantee is inferred;
final integrated actual-service CI remains required.

**Resolving commit:**a3679dd793101418e5599401f34497bf03d6d362.

## RCA-2026-10-23-14 — gateway cleanup remained cancellable after safe scope entry

**Observed:** four actual TERM/INT cleanup subcases fail: timeout leaves a READY-confirmed owned
child/stdout unfinished and successful-command teardown leaves stdout open. Four positioned
scope-entry controls already pass on the original helper; they are not newly fixed failures.

**Cause:** complete finally stop/wait/pipe close remained outside deferral although assignment,
scope restoration and exited-leader group ownership had previously been corrected.

**Resolution:** defer the existing complete cleanup sequence. Retain caller/nested policy,
non-group semantics, finite waits, exact session-group cleanup and unrelated-process survival.
No auth, proxy, HTTP/log contract, Java fixture, Nginx config or service input changes.

**Verification/prevention:** three added tests retain entry controls plus timeout/success actual
regressions; all19 native tests pass, independently repeated by root in4.857s. All20 actual
Nginx HTTP assertions, log distinction, source integrity, one-JVM/PID bound and owned Docker
cleanup stay mandatory in the dedicated workflow. Local19-test success is not gateway execution;
final integrated actual-Nginx CI remains required. See the shared sanitized lifecycle audit.

**Resolving commit:**ff1f31ac5fa37aa553fcd487235e1f52c1a85596.

## RCA-2026-10-23-15 — replication receipt staging followed a preexisting symlink

**Observed:** independent actual two-cluster PostgreSQL16.15 review of96b6a51 completes all
database histories/cleanup but changes a controlled private symlink victim and publishes a
symlink as its success report. Existing checked_destination protects the final path; it does not
protect an independently opened fixed sibling .tmp. The selected sanitized evidence is
docs/evidence/REPLICATION_PUBLICATION_REVIEW_2026-10-23.json; no victim/private path is published.

**Cause:** deterministic staging write_text opens a preexisting link before replace. Final-path
validation and valid database assertions cannot establish safe report publication ownership.

**Resolution:** write through an exclusively created unpredictable staging handle, close it,
atomically replace the checked destination and remove exact staging state under deferral. If
cancellation becomes deliverable after rename, remove only the newly installed device/inode;
preserve a different file concurrently installed at the destination. CI requires a bounded regular
nonsymlink receipt. This retains ordinary last-writer replacement, not hostile-filesystem isolation.

**Verification/prevention:** all18 guards pass, including actual TERM/INT at staging creation,
rename and normal staging cleanup, fixed symlink-victim preservation and concurrent replacement
preservation. Root repeats18/18 in12.587s; another reviewer repeats four publisher/path cases.
The corrected local actual receipt binds all three current Python sources and retains four real
PostgreSQL starts, stale-read/fence, local fenced promotion, fresh rebuild replay and exact cleanup.
No fsync/host-failure, binary-attestation, multi-host HA or production SLA claim is added. Dedicated
final-head native actual-service CI and merged release remain required.

**Resolving commit:**9794e2cc9fb5525a9c85c688ed16a05d2c5598fd.

## RCA-2026-10-23-16 — a restored caller signal handler could interrupt remaining scope restoration

**Observed:** independent actual TERM/INT delivery immediately after restoring a caller handler
on normal scope exit leaves thread-local state installed in debugging, engineering, gateway and
SSRF. TERM also skips restoration of the second handler. All eight initial probe cases fail on
a5886ef. Equivalent scoped helpers in replication, persistence, Redis, WebSocket and AI comparison
contain the same loop. Tests-first commits reproduce88 actual signal failures across nine copies:
12 each in the first four (normal/body-error/entry-rollback × caller/nested × TERM/INT), eight each
in the other five (normal/body-error × caller/nested × TERM/INT). Advisory unguarded-startup
probes are not included in this confirmed count.

**Cause:** a sequential restoration loop followed by outer-state assignment assumes restored
caller handlers cannot raise during the loop. Earlier safe entry/child cleanup fixes addressed
different boundaries and did not establish exception-safe exit restoration.

**Resolution:** nested finally blocks restore SIGTERM, SIGINT and outer thread-local state even
if an already restored caller handler raises. SSRF uses the same helper for entry rollback and
ordinary exit. Preserve exact caller exception identity, existing body-error context, masks,
nested guard state and library/import behavior. No new handler policy, signal mask, model call,
prompt/default change or service business behavior is added.

**Verification/prevention:** source-bound evidence in
docs/evidence/PROCESS_SCOPE_RESTORATION_2026-10-23.json preserves initial old/new probe rows,
tests-first/fix commits, source identities, log digests and exact scope. The original independent
eight-case probe now passes all cases. Root reruns the full11 debugging tests in51.003s,
including actual Spring/configuration repair and JDI; native engineering20, gateway21, SSRF20,
replication19, persistence15, Redis5, WebSocket9 and comparison16 all pass. SSRF retains26 actual
HTTP/TLS requests, zero skips and explicit restoration rows/source binding. A refreshed actual
private PostgreSQL16.15 receipt binds the corrected helper and all19 guards; its database/workflow
assertions pass. Dedicated final-head actual service/cluster and platform CI remain mandatory;
native checks are not Nginx/kind/Redis/MongoDB or multi-host/production execution evidence.
Repeated distinct asynchronous exceptions and every other wrapper are not certified by these
positioned first-signal checks. Future guard changes must exercise entry, normal/error exit,
partial-entry rollback where implemented, startup ownership and successful/timeout cleanup.

**Tests-first commits:**36309bb,db6a65e,7fe2d24.

**Resolving commits:**19c406231fff51732cc0272a2dbeb35c024312a7,
7d6a0f221f614dfad2dbd1e7198179d0ee21f89c,1bde055a743b6b173aeecfab54f31df2238331ba.
