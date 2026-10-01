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

## RCA-2026-10-01-03 — OOP rewrite left one migration-ledger quote stale

- Evidence: `node scripts/audit-simulation-questions.mjs --check` found that migrated quiz
  `5572a6d7bb74` referenced wording no longer present in `01d-java-oop-pillars.md`.
- Root cause: the prior agent-authored OOP lesson rewrite preserved the explanation that private
  methods cannot be overridden but changed its wording without updating the literal evidence
  quote in `SIMULATION_QUESTION_MIGRATION.json`.
- Resolution: point the ledger at the lesson's current, equivalent sentence. The source question
  and migrated explanation remain intact.
- Verification: the migration gate passes with 109/109 items resolved and zero pending.
- Prevention: run the migration gate after any rewrite of a lesson named as a ledger target.
- Resolving commit: `93d059d`.

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
