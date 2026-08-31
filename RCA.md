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
| [RCA-2026-08-31-02](#rca-2026-08-31-02--final-interview-answer-absorbs-further-reading) | Final answer includes Further Reading | Interview deck | Open | Planned for P5 parser work |
| [RCA-2026-08-31-03](#rca-2026-08-31-03--unsupported-topics-show-an-unrelated-simulation) | Topic opens the wrong simulator | Simulation routing | Open | Planned for P3 registry work |

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

**Status:** Open; fix before category Interview Mode
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

### Planned resolution and verification

- Replace the loose regex with a fence-aware, section-aware parser over the validated authoring
  format; stop at the next H3 and preserve answer Markdown.
- Extract a reusable deck and render answers through the safe shared Markdown renderer.
- Add tests for CRLF, Q-like text in code fences, final-answer boundaries, Markdown answers, stable
  IDs, dataset changes and the real 63-file corpus.

### Prevention

- Parsers must use the curriculum's explicit section boundaries rather than EOF as structure.
- Test the final element in every repeated Markdown construct; middle-item tests miss EOF bugs.

---

## RCA-2026-08-31-03 — Unsupported topics show an unrelated simulation

**Status:** Open; address during P3 simulator triage
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

### Planned resolution and verification

- Replace broad category switches with a topic-ID-to-lazy-visualizer registry.
- Move reusable simulations such as consistent hashing to their correct curriculum owner.
- Hide the Simulation tab when no exact entry exists instead of choosing a fallback.
- Add a parameterised route test covering all 63 topic IDs and asserting the exact visualizer or
  an intentionally absent Simulation tab.

### Prevention

- Every optional feature route must model unsupported state explicitly.
- Do not use a category default to satisfy a topic-specific contract.
