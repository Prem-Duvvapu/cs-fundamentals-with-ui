# Project Review — 2026-09-14

A full audit of curriculum content, interview questions, UI/UX, features, and supporting
infrastructure. Every number below was measured against the working tree at `df15ab9`, not
carried over from existing docs. Where a measurement proved unreliable, that is said plainly
rather than reported as a finding.

**Headline:** the platform is in good structural health — 68/68 content files pass the validation
gate, accessibility checks are clean across all five routes, corrupt and hostile `localStorage`
payloads are handled safely, and there are zero dependency vulnerabilities.

Two **user-facing bugs** were found and confirmed live in a real browser:

1. **A-13 (Critical)** — every first-time visitor is silently redirected off *any* deep link to
   the home page. Shared links to topics, searches, interview decks, and the progress dashboard
   all break for exactly the audience most likely to receive them.
2. **A-01/A-02 (High)** — the entire DevOps category is invisible in Search and Interview Mode.

Both are small, well-understood fixes. Neither is caught by any existing test.

---

## 1. Severity summary

> **Status update.** A-13, A-01, A-02, A-03, A-04 and A-14 were **fixed** in the follow-up PR that
> accompanied this review; each row below is marked accordingly. The remaining items are still
> open. Fix details are in §12.

| ID | Severity | Status | Area | Finding |
|---|---|---|---|---|
| A-13 | **Critical** | ✅ Fixed | UI/UX / routing | First-time visitors are redirected off **every** deep link to `/`; the back button does not recover the destination |
| A-01 | **High** | ✅ Fixed | Features / discovery | DevOps category missing from `/search` and `/interview` — 5 topics and 70 questions unreachable by UI |
| A-02 | **High** | ✅ Fixed | UI/UX | `/search?category=devops` silently drops the filter from the URL |
| A-03 | Medium | ✅ Fixed | Process | Topic-registration checklist has no *category*-level counterpart — root cause of A-01/A-02 |
| A-04 | Medium | ✅ Fixed | Tech debt | `CATEGORY_ORDER` defined in 3 places; 2 are stale |
| A-05 | Medium | Open | Testing | 7 simulation engines have zero tests, contradicting `CLAUDE.md`'s stated contract |
| A-14 | Medium | ✅ Fixed | Testing | No test covers first-load routing behaviour, which is why A-13 shipped unnoticed |
| A-06 | Low | Open | Docs | "299 Mermaid diagrams" counts 4 diagrams from the spec doc itself; the curriculum has 295 |
| A-07 | Low | Open | Build | 8 SVGs are generated, CI-validated, and shipped for diagrams no user ever sees |
| A-08 | Low | Open | Performance | 49 MB of diagram assets; 52 MB `dist/`; `MarkdownRenderer` chunk exceeds Vite's 500 KB warning |
| A-09 | Low | Open | Content | Diagram type mix is 68% `flowchart`; `erDiagram`/`gantt`/`classDiagram` barely used |
| A-10 | Low | Open | Maintenance | Six dependencies are a major version behind (React 18→19, jsdom 23→30, mermaid 11→12) |
| A-11 | Info | Open | Content | Q&A counts are near-perfectly uniform (67 files × 14), suggesting templated authoring |
| A-12 | Info | Open | Process | Two `CONTENT_SPEC.md` rules are not machine-checkable and are enforced only by author discipline |
| A-15 | Info | — | Robustness | Corrupt, malformed, and prototype-pollution `localStorage` payloads all degrade safely — no action needed |

---

## 1a. A-13 — First-time visitors lose every deep link (Critical)

The most serious finding in this review, and the one with the widest blast radius.

### What happens

On a visitor's **first** visit (before the `cs-fundamentals-tour-seen` flag exists), the guided
tour auto-starts. Its first step declares `path: '/'`, and the hook navigates to that path — so
the visitor is pulled off whatever URL they actually opened.

Measured in a real browser, cold context vs. returning context:

| Opened URL | First-time visitor | Returning visitor |
|---|---|---|
| `/topic/kubernetes-fundamentals` | **redirected → `/`** | kept |
| `/topic/cpu-scheduling` | **redirected → `/`** | kept |
| `/search?q=tcp` | **redirected → `/`** | kept |
| `/interview/dbms` | **redirected → `/`** | kept |
| `/progress` | **redirected → `/`** | kept |

Two aggravating factors:

- **The back button does not recover the destination.** After the redirect, pressing back leaves
  the visitor on `/`. The intended page is unreachable without re-opening the original link.
- **It hits precisely the wrong audience.** Returning visitors — who already know the site — keep
  their deep links. First-time visitors, the ones arriving from a shared link, a bookmark someone
  sent them, or a search engine, are the only ones who lose their destination.

### Root cause

`frontend/src/hooks/useProductTour.js`:

```js
// Auto-show once, for a first-time visitor only.
useEffect(() => {
  if (!readSeen()) setActive(true)      // ← fires on ANY route
}, [])

useEffect(() => {
  if (active && step?.path && step.path !== location.pathname) {
    navigate(step.path)                  // ← step 1 path is '/', so it yanks the user home
  }
}, [active, stepIndex, navigate])
```

The auto-show effect has no route guard, so activating the tour on `/topic/foo` immediately
triggers a navigation to `/`.

### Honest note on how this shipped

This mechanism was actually observed during the tour's own development — an unrelated routing
test (`AppRouting.test.jsx`) started failing because the tour navigated it away from a deliberately
invalid route, and the fix applied at the time was to set the tour-seen flag **in the test**. The
mechanism was correctly diagnosed but filed as a test-harness nuisance rather than recognised as
the production UX bug it also was. The note added to `CLAUDE.md` even documents the behaviour
("the tour's auto-navigate-to-`/` will hijack the test's route") without drawing the conclusion
that real users hit the same path. Worth recording, because the signal was there and was misread.

### Suggested fix

Guard the auto-show on the home route — the tour is written to start there anyway:

```js
useEffect(() => {
  if (!readSeen() && location.pathname === '/') setActive(true)
}, [])
```

A first-time visitor landing deep then keeps their page, and still gets the tour whenever they
reach the home page (or via "Take a tour"). Pair it with the regression test in A-14.

---

## 2. A-01 / A-02 — DevOps is invisible in Search and Interview Mode (High)

The single most impactful finding. **Confirmed live against running servers, not inferred from
code.**

### What's wrong

`SearchPage.jsx:6` and `InterviewPage.jsx:9` each declare their own local category list that was
never updated when the DevOps category shipped:

```js
const CATEGORY_ORDER = ['java-spring', 'os', 'networking', 'dbms', 'aiml']   // devops missing
```

### Confirmed behaviour

Backend is fully healthy — it serves DevOps correctly:

```
GET /api/v1/interview/questions?category=devops   → "total": 70
GET /api/v1/search?q=kubernetes&category=devops   → "total": 5
```

The frontend is where it breaks:

| Route | Observed |
|---|---|
| `/search` | Filter chips render `All categories, JAVA, OS, NET, DB, AI/ML` — **no DevOps chip** |
| `/search?q=kubernetes&category=devops` | URL is rewritten to `?q=kubernetes` — **the filter is silently discarded** and the active chip falls back to "All categories" |
| `/interview/all` | Category tabs render the same five — **no DevOps tab** |
| `/interview/devops` | Renders correctly ("DevOps & Infrastructure practice") but **zero tabs are marked active** — an orphaned page reachable only by typing the URL |

### Impact

All 5 DevOps topics and their 70 interview questions are effectively undiscoverable through the
two surfaces built for discovery. A user who bookmarks or shares a DevOps-filtered search link
gets a silently different result set — the worst kind of failure, because nothing errors.

### Fix

Both files should import the shared `CATEGORY_ORDER` from `utils/topicCategories.js`, which
already contains all six categories:

```js
import { CATEGORY_ORDER } from '../utils/topicCategories'
```

Low risk, ~2 lines each, and it removes the duplication in A-04 at the same time. Worth adding a
test asserting every category in `CATEGORY_METADATA` renders a filter chip, so the next category
addition can't silently regress.

---

## 3. A-03 — The registration checklist covers topics but not categories (Medium)

`CLAUDE.md` documents a rigorous 7-point checklist for adding a **topic**, and it works: the
`/list-topics --audit` script confirms all 68 topics are wired at every required point, and
`TopicServiceTest`'s exact per-category counts fail loudly when a topic is missed.

There is no equivalent checklist for adding a **category**. When DevOps was introduced, the
topic-level points were all satisfied — which is exactly why A-01 went unnoticed: every automated
guardrail passed while two UI surfaces silently excluded the new category.

**Recommendation:** add a short "adding a category" section to `CLAUDE.md` /
`.claude/references/topic-registry.md` listing the category-level touch points:
`CATEGORY_METADATA`, `CATEGORY_ORDER`, `HomePage.jsx`'s `CATEGORY_DETAILS`, the navbar's
`CATEGORY_LINKS`, and `SearchPage`/`InterviewPage` filters — plus the content directory and
backend `TopicService` entries.

---

## 4. A-04 — Duplicated `CATEGORY_ORDER` (Medium)

```
frontend/src/utils/topicCategories.js:42   6 categories  ← canonical
frontend/src/pages/InterviewPage.jsx:9     5 categories  ← stale
frontend/src/pages/SearchPage.jsx:6        5 categories  ← stale
```

Two of three copies are wrong. Related but intentional: `HomePage.jsx` keeps its own
`CATEGORY_DETAILS` because its user-facing labels differ from the shared module's ("AI/ML Systems"
vs. "AI & Machine Learning"). That divergence is documented in-code, but it is worth deciding
deliberately whether the two label sets should be reconciled — right now the same category is
named differently depending on which page you are on.

---

## 5. A-05 — Seven simulation engines have no tests (Medium)

`CLAUDE.md` states each engine "has a matching Vitest suite in `utils/__tests__/`". That is not
currently true. These seven are referenced by **zero** test files:

```
hashMapEngine.js          connectionPoolEngine.js   consistentHashingEngine.js
tcpCongestionEngine.js    virtualMemoryEngine.js    jvmEngine.js
virtualThreadsEngine.js
```

This matters more than typical coverage gaps because `CLAUDE.md` is explicit that engines are
"where algorithm logic belongs" — these are precisely the files where a silent correctness
regression would teach a learner something false, and component tests are described in
`/verify-project` as render smoke tests that "will not catch a wrong algorithm."

**Recommendation:** either write the suites or correct the claim in `CLAUDE.md`. The former is
preferable; these are pure, framework-free modules, which is the easiest possible test target.

---

## 6. Content audit

### Scale and gate compliance

| Metric | Value |
|---|---|
| Topic files | 68 |
| Total curriculum lines | 31,074 |
| Average per file | ~457 |
| Range | 400–599 lines |
| Validator result | **68/68 pass**, 83/83 coverage-manifest entries |
| Files with Common Misconceptions | 68/68 |
| Files with ≥1 comparison table | 68/68 |

All files sit inside the spec's 400–600 line band.

> **Measurement note.** `wc -l` reports 399 lines for three files where the validator reports 400.
> This is a trailing-newline counting difference (`wc -l` counts newline bytes;
> `split('\n').length` counts the empty final element), not a spec violation. The validator's
> count is the one the CI gate enforces, so these files are compliant. Flagged here only so the
> discrepancy isn't rediscovered and misreported later.

### Diagrams

295 diagrams across the curriculum. The type distribution is heavily skewed (A-09):

| Type | Count | Share |
|---|---|---|
| `flowchart` | 202 | 68.5% |
| `sequenceDiagram` | 62 | 21.0% |
| `stateDiagram-v2` | 23 | 7.8% |
| `classDiagram` | 5 | 1.7% |
| `erDiagram` | 2 | 0.7% |
| `gantt` | 1 | 0.3% |

Flowcharts are a reasonable default, but two `erDiagram`s across a 13-topic DBMS track is
notably low for a subject where entity-relationship modelling is core, and `classDiagram` is
barely used across 23 Java/Spring topics where class hierarchies are the subject matter. Worth a
targeted pass asking "would a different diagram type teach this better?" rather than a blanket
rewrite.

---

## 7. Interview questions audit

| Metric | Value |
|---|---|
| Total questions | 953 |
| Distribution | 67 files × 14, 1 file × 15 |
| Easy | 272 (28.5%) |
| Medium | 418 (43.9%) |
| Hard | 263 (27.6%) |
| Parsed by production regex | 953/953 |

The difficulty mix tracks the spec's ~4/6/4-per-file target almost exactly. Critically, **all 953
parse cleanly with `DiscoveryService`'s strict single-line regex** — the line-wrapping defect
that previously hid 44 questions from the API is fully resolved.

### A-11 — Uniformity signal (Info)

Every file but one has *exactly* 14 questions. Hitting the identical count 67 times in a 12–15
band is not what organic authoring looks like; it indicates a template was applied per file.
That is not a defect, and quality spot-checks read well — but it's worth knowing that question
count was likely driven by a target rather than by how much each topic actually warranted.

### A-12 — Two spec rules aren't machine-checkable (Info)

`CONTENT_SPEC.md` requires "at least 2 scenario questions" per file and answers of "≥3 sentences"
in direct-answer → mechanism → trade-off order. Neither is checked by
`scripts/validate-content.mjs`, and **neither can be reliably measured automatically** — I tried:

- **Scenario detection is unreliable.** The curriculum uses at least two valid styles: an explicit
  `Scenario: A payments microservice reports…` prefix (common in DBMS), and narrative framing
  without the keyword (`A browser can resolve a hostname but cannot connect to port 443. How do
  you locate the failing layer?` in Networking). A keyword-based detector flagged 57 files as
  violating; a prefix-aware one flagged 17; a broad one flagged 2 — and manual inspection of the
  supposedly-failing files showed they *do* contain strong scenario questions. **Conclusion: the
  requirement appears broadly met (~3.3 scenario questions per file on the broadest measure) and
  the earlier "violations" were artifacts of my own detectors, not real defects.**
- **Sentence counting is a weak quality proxy.** A literal count flags ~50 answers as under three
  sentences, but inspection shows those answers are substantive. For example,
  `kubernetes-fundamentals` Q2 is two long sentences that nonetheless deliver the direct answer,
  the reconciliation mechanism, and the practical implication — exactly what the spec wants.
  Counting sentences would penalise it.

**Recommendation:** don't chase these two rules with automation. Either encode a machine-checkable
convention (e.g. require the literal `Scenario:` prefix so the validator can enforce it) or
explicitly mark both rules as review-time judgement calls in the spec. The current middle ground —
a written rule nothing enforces — invites exactly the false-positive rabbit hole documented above.

---

## 8. UI/UX audit

### Accessibility — clean

Structural checks were run against five routes in a real browser (heading hierarchy, single `h1`,
missing `alt`, unnamed interactive elements, duplicate `id`s, `main` landmark, `aria-valuenow` on
progress bars):

| Route | Headings | Progress bars | Issues |
|---|---|---|---|
| `/` | 76 | 0 | none |
| `/progress` | 5 | 10 | none |
| `/search` | 1 | 0 | none |
| `/interview/all` | 2 | 0 | none |
| `/topic/cpu-scheduling` | 20 | 1 | none |

Notably the newly added `/progress` page — which postdates the project's last formal axe pass —
is clean, including correct `aria-valuenow` on all ten progress bars. The accessibility
discipline in this codebase is holding up as features are added.

> This was a targeted structural check, **not** a full axe run (no axe package is installed).
> Colour contrast and ARIA-semantics rules were not evaluated. Reinstating a real axe pass in CI
> would close that gap.

### Other observations

- Dark/light theming and responsive behaviour continue to be handled consistently through the
  design-token system; the recent progress/tour/dashboard work was verified in both themes and at
  390 px.
- The orphaned `/interview/devops` page (A-01) is the one place where the UI is internally
  inconsistent — a valid page with no navigation representation.
- Deep-link handling is broken for first-time visitors (A-13).

### A-15 — Robustness probes all passed (Info)

Hostile and malformed inputs were pushed through the client-side persistence layer and the
router. Everything degraded gracefully, with zero console or page errors:

| Probe | Result |
|---|---|
| `localStorage` progress = `not-json` | Safe — renders `0 of 68 (0%)` |
| `localStorage` progress = `[]` | Safe |
| `localStorage` progress = `{"x":null}` | Safe |
| `localStorage` progress = `{"cpu-scheduling":"bogus"}` | Safe |
| `localStorage` progress = `{"__proto__":{"completed":true}}` | Safe — **no prototype pollution** |
| `/interview/not-a-category` | Clean "Unknown category" page |
| `/interview/DEVOPS` (wrong case) | Clean "Unknown category" page |
| `/topic/not-a-topic` | Clean "Topic not found" page |
| "Bookmarked" filter with zero bookmarks | Correct empty state, 0 rows |
| Completion made on a topic page, then back-nav to `/progress` | Stat updated correctly (0% → 1%) |

The `try/catch` + type-guard discipline in `topicProgress.js` is doing real work here — the
prototype-pollution probe in particular is a meaningful pass, not a formality. No action needed.

### A-14 — No test covers first-load routing (Medium)

A-13 is a single-line bug in a hook that has **nine** dedicated unit tests, none of which
exercises the case that matters: mounting the app at a non-`/` route as a first-time visitor.
`useProductTour.test.jsx` always mounts its harness at `/`, so the redirect can't surface.

**Recommendation:** add a test that renders `<App />` at `/topic/<id>` with no tour-seen flag and
asserts the route is preserved. That single assertion would have caught A-13, and it guards the
fix from regressing.

---

## 9. Feature inventory

| Feature | State |
|---|---|
| 3-tier reading experience, TOC, tier nav | Shipped |
| Per-topic interactive simulators | Shipped (subset of topics; Study-only is intentional elsewhere) |
| Cross-topic search | Shipped — **but missing DevOps (A-01)** |
| Interview Mode | Shipped — **but missing DevOps (A-01)** |
| Bookmarks + completion tracking | Shipped |
| Progress export/import (versioned JSON, merge-only) | Shipped |
| Guided product tour (cross-route, replayable) | Shipped |
| Progress dashboard (`/progress`) | Shipped |

### Gaps worth considering next

1. **Fix A-01 first** — it undoes part of the value of the DevOps category that was just completed.
2. **Search has no empty-category affordance** — with the filter fixed, consider showing result
   counts per category.
3. **No deep link for the bookmarked filter** — `HomePage`'s "Bookmarked" toggle is component
   state only, so it can't be shared or bookmarked, unlike `/search`'s URL-synced filters.
4. **Interview Mode has no progress memory** — the platform now tracks topic completion but not
   which questions have been practised, which is the natural next use of the progress module.

---

## 10. Infrastructure, build, and dependencies

### Assets and bundle (A-07, A-08)

| Metric | Value |
|---|---|
| `frontend/public/diagrams` | 49 MB across 598 files |
| `frontend/dist` | 52 MB |
| Largest JS chunk | `MarkdownRenderer` 652 KB (198 KB gzip) |

Vite emits its >500 KB chunk warning on every build. The diagram SVGs are lazily fetched per
topic, so end users don't download 49 MB — but the deploy artifact and repo carry it, and CI
browser-decodes all 598 assets on each validation run.

**A-07 specifically:** `render-diagrams.mjs` scans every `.md` under `content/`, which includes
`CONTENT_SPEC.md` — the authoring contract itself. Its 4 example diagrams are hashed, rendered in
both themes, fingerprint-validated, and shipped as 8 SVG files that no user-facing page ever
renders. Scoping the scan to topic files (`NN[a-z]-slug.md`) would drop them.

### A-06 — Documented diagram count is slightly off

README, CONTEXT, and AGENTS all cite "299 Mermaid diagrams" as a curriculum statistic. Measured:

```
curriculum topic-file fences : 295
CONTENT_SPEC.md example fences:   4
manifest entries              : 299   (295 + 4)
```

299 is the correct *manifest* size; 295 is the correct *curriculum* count. The AGENTS line about
`diagrams:check` validating 299 manifest entries is accurate as written; the README/CONTEXT lines
describing curriculum content should say 295. Minor, but these are the numbers people quote.

### Dependencies (A-10)

`npm audit`: **0 vulnerabilities.** Dependabot is active. However, several majors are behind:

| Package | Current | Latest |
|---|---|---|
| react / react-dom | 18.3.1 | 19.3.0 |
| jsdom | 23.2.0 | 30.0.1 |
| mermaid | 11.17.2 | 12.0.0 |
| react-markdown | 9.1.0 | 10.1.0 |
| katex | 0.16.47 | 0.18.7 |
| @testing-library/react | 14.3.1 | 16.3.3 |
| vite | 8.2.2 | 8.3.0 (patch) |

None are urgent given zero vulnerabilities, but jsdom (7 majors) and React 19 will only get harder
to adopt. The mermaid 12 upgrade is lower-risk than it looks, since mermaid is now a build-time
dev dependency only — a bad render would be caught by the diagram gate rather than shipping.

### Test suite

| Suite | Files | Tests |
|---|---|---|
| Frontend (Vitest) | 39 | 523 |
| Backend (JUnit) | 9 | 53 |

Strong guardrails exist where they matter most: `TopicServiceTest` asserts exact per-category
counts, `TopicViewer.markdown.test.jsx` renders every content file, and `validate-content.mjs`
parses every diagram with the real mermaid package. The gaps are A-05 (untested engines) and the
absence of any test that would have caught A-01.

---

## 11. Recommended order of work

1. **A-13 + A-14** — add the `location.pathname === '/'` guard to the tour's auto-show, plus a
   test that mounts `<App />` at a deep link with no tour-seen flag. *One line of product code;
   fixes every broken shared link.* Highest value in this list.
2. **A-01 / A-02** — import the shared `CATEGORY_ORDER` in `SearchPage` and `InterviewPage`; add a
   test asserting every `CATEGORY_METADATA` entry renders a filter chip. *Small fix, high value.*
3. **A-03** — document the category-level registration checklist so this class of bug can't recur.
4. **A-05** — write suites for the seven untested engines, or correct `CLAUDE.md`'s claim.
5. **A-06 / A-07** — scope the diagram scan to topic files; correct 299 → 295 where it describes
   curriculum content.
6. **A-12** — decide whether the scenario/answer-depth rules become machine-checkable or are
   explicitly marked as human review criteria.
7. **A-09, A-10, A-08** — diagram-type variety pass, dependency upgrades, bundle splitting, as
   capacity allows.

Items 1 and 2 together are a small, self-contained PR and would resolve both user-facing bugs.

### A pattern worth naming

A-13 and A-01 share a shape: **a feature was added, every automated gate passed, and a whole class
of user-facing behaviour silently broke.** In both cases the guardrails were real but
mis-targeted — `TopicServiceTest` pins topic counts, `useProductTour.test.jsx` covers nine
state-machine transitions, and neither asks the question a user would ask ("can I still get to
the page I clicked?", "can I find DevOps?"). The gap isn't test *quantity* — 523 frontend tests
pass — it's that the tests assert internal behaviour and none assert the externally-visible
contract of a route. A handful of coarse "does this URL still show this thing" tests would cover
more real risk than the next fifty unit tests.

---

## 12. What was fixed in the follow-up

The two user-facing bugs and the process gap behind them were fixed immediately after this review.

| Item | Change |
|---|---|
| **A-13** | `useProductTour.js` — auto-show is now guarded to `location.pathname === '/'`. A first-time visitor landing deep keeps their page and can still start the tour from the navbar. One line of product code. |
| **A-01 / A-02 / A-04** | `SearchPage.jsx` and `InterviewPage.jsx` now import the shared `CATEGORY_ORDER` from `utils/topicCategories.js` instead of each declaring a stale local copy. The three-way duplication is gone; one canonical source remains. |
| **A-14** | `AppRouting.test.jsx` rewritten around a live router-location probe: every test in it now runs as a genuine first-time visitor (`localStorage` cleared), and deep links to `/topic/:id`, `/search?q=`, `/interview/:cat`, `/progress` and an unknown route must all survive. Two further tests assert the tour *does* still auto-open on `/` and does *not* for a returning visitor. |
| **A-01 regression guard** | `SearchPage.test.jsx` and `InterviewPage.test.jsx` gained suites that iterate `CATEGORY_METADATA` and assert every registered category renders a filter chip / tab, plus explicit DevOps cases (`?category=devops` survives the URL; the DevOps tab is marked active). Because they iterate the shared source, a future category cannot silently go missing. |
| **A-03** | `CLAUDE.md` gained an "Adding a *category*" checklist next to the existing 7-point topic checklist, naming all five touch points and stating the rule that caused this: never re-declare a local category list in a page. |

### The fix was verified to actually fix something

The regression tests were confirmed to fail without the product change, not just pass with it.
Reverting the one-line guard and re-running `AppRouting.test.jsx` produced **7 failures** —
every deep-link case plus the unknown-route test:

```
× renders actionable recovery links for an unknown route
× keeps /topic/cpu-scheduling instead of redirecting to the home page
× keeps /search?q=tcp instead of redirecting to the home page
× keeps /interview/dbms instead of redirecting to the home page
× keeps /progress instead of redirecting to the home page
× keeps /not-a-real-route instead of redirecting to the home page
× does not open the tour overlay on a deep link
   Tests  7 failed | 3 passed (10)
```

Restoring the guard returned all 10 to green. A regression test that passes with and without the
fix is worthless; these do not.

One incidental confirmation: the unknown-route test previously needed a `tour-seen` workaround to
pass at all. That workaround is now deleted and the test passes as a true first-time visitor —
which is the clearest evidence the underlying behaviour, not just the symptom, changed.

---

## Appendix — how these numbers were produced

- Content metrics: direct file parsing, cross-checked against `node scripts/validate-content.mjs`.
- Q&A metrics: the exact `QUESTION_LINE` regex from `DiscoveryService.java`, so counts match what
  the API actually serves.
- A-01/A-02: live Playwright session against `localhost:3000` with the backend on `:9190`,
  inspecting rendered filter chips, the post-load URL, and active-tab state; backend behaviour
  confirmed independently with `curl`.
- A-13: each route opened in a **fresh browser context** (no prior `localStorage`) and compared
  against the same route in a context with the tour-seen flag pre-set, so the first-visit
  condition is isolated; back-button recovery tested separately.
- A-15: hostile payloads injected via `addInitScript` before first paint, with page and console
  error listeners attached throughout.
- Accessibility: in-browser DOM evaluation across five routes.
- Bundle/asset sizes: `du` against a completed production build.
- Dependencies: `npm outdated` and `npm audit`.

Findings that could not be measured reliably are labelled as such rather than reported as defects.
No product code was changed by this review — every bug above is reported, not fixed.
