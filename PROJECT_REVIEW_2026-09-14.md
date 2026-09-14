# Project Review — 2026-09-14

A full audit of curriculum content, interview questions, UI/UX, features, and supporting
infrastructure. Every number below was measured against the working tree at `df15ab9`, not
carried over from existing docs. Where a measurement proved unreliable, that is said plainly
rather than reported as a finding.

**Headline:** the platform is in good structural health — 68/68 content files pass the validation
gate, accessibility checks are clean across all five routes, and there are zero dependency
vulnerabilities. One **high-severity user-facing bug** was found and confirmed live: the entire
DevOps category is invisible in both Search and Interview Mode.

---

## 1. Severity summary

| ID | Severity | Area | Finding |
|---|---|---|---|
| A-01 | **High** | Features / discovery | DevOps category missing from `/search` and `/interview` — 5 topics and 70 questions unreachable by UI |
| A-02 | **High** | UI/UX | `/search?category=devops` silently drops the filter from the URL |
| A-03 | Medium | Process | Topic-registration checklist has no *category*-level counterpart — root cause of A-01/A-02 |
| A-04 | Medium | Tech debt | `CATEGORY_ORDER` defined in 3 places; 2 are stale |
| A-05 | Medium | Testing | 7 simulation engines have zero tests, contradicting `CLAUDE.md`'s stated contract |
| A-06 | Low | Docs | "299 Mermaid diagrams" counts 4 diagrams from the spec doc itself; the curriculum has 295 |
| A-07 | Low | Build | 8 SVGs are generated, CI-validated, and shipped for diagrams no user ever sees |
| A-08 | Low | Performance | 49 MB of diagram assets; 52 MB `dist/`; `MarkdownRenderer` chunk exceeds Vite's 500 KB warning |
| A-09 | Low | Content | Diagram type mix is 68% `flowchart`; `erDiagram`/`gantt`/`classDiagram` barely used |
| A-10 | Low | Maintenance | Six dependencies are a major version behind (React 18→19, jsdom 23→30, mermaid 11→12) |
| A-11 | Info | Content | Q&A counts are near-perfectly uniform (67 files × 14), suggesting templated authoring |
| A-12 | Info | Process | Two `CONTENT_SPEC.md` rules are not machine-checkable and are enforced only by author discipline |

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

1. **A-01 / A-02** — import the shared `CATEGORY_ORDER` in `SearchPage` and `InterviewPage`; add a
   test asserting every `CATEGORY_METADATA` entry renders a filter chip. *Small fix, high value.*
2. **A-03** — document the category-level registration checklist so this class of bug can't recur.
3. **A-05** — write suites for the seven untested engines, or correct `CLAUDE.md`'s claim.
4. **A-06 / A-07** — scope the diagram scan to topic files; correct 299 → 295 where it describes
   curriculum content.
5. **A-12** — decide whether the scenario/answer-depth rules become machine-checkable or are
   explicitly marked as human review criteria.
6. **A-09, A-10, A-08** — diagram-type variety pass, dependency upgrades, bundle splitting, as
   capacity allows.

---

## Appendix — how these numbers were produced

- Content metrics: direct file parsing, cross-checked against `node scripts/validate-content.mjs`.
- Q&A metrics: the exact `QUESTION_LINE` regex from `DiscoveryService.java`, so counts match what
  the API actually serves.
- A-01/A-02: live Playwright session against `localhost:3000` with the backend on `:9190`,
  inspecting rendered filter chips, the post-load URL, and active-tab state; backend behaviour
  confirmed independently with `curl`.
- Accessibility: in-browser DOM evaluation across five routes.
- Bundle/asset sizes: `du` against a completed production build.
- Dependencies: `npm outdated` and `npm audit`.

Findings that could not be measured reliably are labelled as such rather than reported as defects.
