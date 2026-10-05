# UI/UX refinement — results and evidence (October 5)

Record for [`UI_UX_REFINEMENT_PLAN_2026-10-05.md`](../UI_UX_REFINEMENT_PLAN_2026-10-05.md).
Evidence types: **fixture** = the built frontend in Chromium with the canonical catalog, real lesson
Markdown and API fixtures (`scripts/lib/ui-fixtures.mjs`); **backend** = the real Spring Boot API;
**unit** = Vitest/JUnit. No participant usability sessions were run, so nothing here is evidence of
learner preference or comprehension; real learner feedback remains pending.

## Step 1 — Baseline

- Branch `feat/2026-10-05-ui-ux-refinement` from `main` at `ec78646`, preserving the uncommitted
  handoff files (plan, prompt, `docs/previews/ui-ux-baseline-2026-10-05/`, README note).
- Environment: WSL2 Linux, Node 24.21.0, Java 17.0.20, Maven 3.8.7, Playwright Chromium 1243.
- Reproducible previews: `npm run build --prefix frontend && node scripts/capture-ui-previews.mjs <dir>`
  (11 routes × 1440×960 / 375×960 × both themes, plus `metrics.json`).

### Baseline findings (fixture, `ec78646`)

- Java Execution Pipeline article started at **426px** (desktop) and **570px** (375px wide).
- Prose rendered at **17px at every text-size setting**: `.topic-content p, li` used the fixed
  `--prose-base` token, so the 16/18/20px preference never reached paragraphs; the measured line was
  about 75ch instead of 68ch.
- The spacing scale was non-monotonic (a late `:root` block redefined `--space-6`/`--space-8`).
- Navigation emoji rendered as missing-glyph boxes; the logo collided with the first nav item.
- Two stacked control rows preceded the article; Practice buried Reveal below other actions and gave
  Previous/Next the same filled treatment (including a disabled filled button).
- Simulator views had never been swept: at 320px several overflowed the page (up to 1070px wide), and
  16 views had axe findings (unlabelled inputs/selects, low contrast, an unfocusable scroll region).

## Measurements — before and after (fixture)

| Route | Desktop article top | Mobile article top | First paragraph (desktop / mobile) |
|---|---|---|---|
| Java Execution Pipeline | 426 → **324px** (target ≤330) | 570 → **448px** (target ≤450) | 442 → 349 / 586 → 473 |
| Spring MVC (long title, prerequisites) | 490 → 332px | 659 → 484px | 506 → 357 / 675 → 509 |
| CPU Scheduling | 490 → 332px | 633 → 456px | 506 → 357 / 649 → 481 |

These final numbers include the site-wide "Learning network" bar that PR #49 added on `main` while this
work was in progress (about 33px on desktop and 45px on mobile). Before that merge the same lesson
started at 303px / 415px; three spacing steps were tightened after the merge to stay inside the targets.

Standard prose is now 18px with a 68ch measure (was 17px / ~75ch). No lesson paragraph or heading was
removed or hidden; the gains come from the compact navigation, a header in document flow, and one
toolbar row. The long Spring title exceeds the mobile target by 1px, which the plan allows for long titles.
Production bundle: main chunk 359.32 kB → 376.00 kB (110.10 → 115.15 kB gzip, +4.6%) for rail search,
disclosures, icons and the restructured pages; lazy Markdown, simulator and route chunks are unchanged
in structure, and no request fetches every lesson body.

Representative before/after images (fixture):
[before dark](previews/ui-ux-baseline-2026-10-05/dark-reader.png) /
[after dark](previews/ui-ux-after-2026-10-05/dark-desktop-reader.png),
[before light](previews/ui-ux-baseline-2026-10-05/light-reader.png) /
[after light](previews/ui-ux-after-2026-10-05/light-desktop-reader.png),
[before mobile](previews/ui-ux-baseline-2026-10-05/dark-mobile-reader.png) /
[after mobile](previews/ui-ux-after-2026-10-05/dark-mobile-reader.png), plus after-only
[home](previews/ui-ux-after-2026-10-05/light-desktop-home.png) and
[practice](previews/ui-ux-after-2026-10-05/light-desktop-practice.png). The full 44-image set is
reproducible with the preview script and is not committed.

## Checklist

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Reproducible baseline and measurements | Done | Above; fixture |
| 2 | Foundation: action/control tokens, neutral light palette, `.ui-button` variants, SVG `Icon`, monotonic spacing, no raw colour literals outside theme blocks | Done | `AppThemeStyles.test.js` (contrast pairs for both themes, spacing scale, literal check); unit |
| 3 | Compact navigation: Learn and Help disclosures, single-row Menu below 900px, Escape/outside close, focus return | Done | `Navbar.test.jsx`; screenshots both themes; 768/900/1024px overflow check; fixture |
| 4 | Reader pilot: header in flow, Reading options disclosure, level jumps, reading surface, prose at reader size, lesson-end actions | Done | `TopicViewer`/`TopicPage` tests; Java, long-title Spring and OS lessons inspected in both themes, desktop/mobile, Large text and focus reading |
| 5 | Reader density targets | Done | Table above; asserted in `test-responsive-layout.mjs` |
| 6 | Full-category rail: hierarchy, Collapse all, category search with temporary expansion, remount persistence, outline failure | Done | 15 tests in `CategoryTopicNavigation.test.jsx` (six categories, search/clear/restore, Escape, remount, category scoping, failed outlines); browser journey (search → Study section → clear → Collapse all → view change → Back) |
| 7 | Home, category, search; filter URLs; canonical labels | Done | `HomePage.test.jsx` (returning resume, filter URL opens Browse, path cards), Search/AppRouting tests; screenshots both themes |
| 8 | Practice, Interview, Review, Progress | Done | InterviewDeck, InterviewPage, ReviewPage, ProgressPage, PracticeReview tests; review/attempt browser journey |
| 9 | Retained simulators under shared CSS | Done | All 36 registered simulator views: no overflow at 320px and no axe findings in either theme (harness); engines unchanged |
| 10 | Accessibility, contrast, reflow, reduced motion, keyboard | Done with limits | See below |
| 11 | Diagrams regenerated, checked and decoded | Done | 295 entries / 590 assets current; all 590 browser-decoded; 295 light assets changed with the palette |
| 12 | Docs, CI, PR | Done | README, CONTEXT, AGENTS, CLAUDE, DESIGN_SYSTEM updated; new `real-backend-journey` CI job |

## Verification run for the final head

- Frontend unit/integration: **816/816 tests in 61 files** (Vitest, Node 24), after merging `main` (PR #49).
- Backend: **63/63 JUnit tests**. No backend code changed.
- Production build with prebuild diagram check; `validate-content.mjs` 68/68 lessons;
  simulation-question migration gate; 17/17 script tests.
- Diagrams: 295 entries and 590 assets current; 590/590 browser-decoded.
- Browser harness (fixture): 14 routes × 320/375/768/1024/1440 × both themes, theme toggle and reload
  persistence, 20 page axe scans, reader density, the rail journey, six-category navigation,
  Study/Practice focus, focus reading with Escape focus return, practice rubric and review journeys,
  and 36 simulators × both themes (320px containment + axe).
- Real backend: `scripts/test-real-backend-journey.mjs` against the packaged API — real catalog
  (68 lessons), category page, real outlines with a working cross-lesson anchor, search to a lesson,
  interview questions, the server-side CPU scheduling simulation (HTTP 200) and the 404 lesson path.

## Accessibility and responsive checks — what was and was not done

- **Automated:** axe (WCAG 2.0/2.1/2.2 A and AA tags) on 10 page routes per theme and every simulator
  per theme, with zero findings. Contrast pairs are also asserted mathematically for both palettes.
- **Keyboard (scripted):** disclosure Escape/focus return, nested Escape order, outside close, tab
  arrow keys, rail chevrons with Enter/Space, Study/Practice focus stability, skip link and main-landmark
  focus on route change. A complete manual keyboard pass by a person was not performed.
- **Reflow:** 320px (equivalent to 1280px at 400% zoom) for all page routes and every simulator, plus
  640/720px spot checks (about 200% zoom). Browser zoom itself was not driven.
- **Reduced motion:** previews and checks run with `reducedMotion: 'reduce'`; new transitions use the
  zeroed duration tokens.
- **Screen readers:** not available in this environment; not tested.

## Defects found and fixed during this work

Pre-existing (present in the baseline build; not regressions introduced by this work):

- Reader text-size preference did not apply to paragraphs (fixed: prose sizes are em-based).
- Simulators overflowed narrow screens (fixed: containment rules and shrinkable 320px grid tracks).
- Unlabelled controls in eleven simulators, low-contrast colours, literal `#1e293b` surfaces and
  dark-only badge colours (fixed with associated labels, tokens and readable process identifiers).
- The TCP variant and virtual-node selects had sibling, unassociated labels (fixed).

Introduced and fixed before commit (caught by tests/visual review, never shipped):

- A grid-area on the shared breadcrumb split the category header into two columns and caused overflow.
- The mobile menu's full-width item rule caught the top-bar Search link.
- An older `.saved-answer-actions button` rule out-specified the new buttons.
- The simulator card containment rule made cards scroll regions without keyboard access; fixed with
  `useScrollRegionAccess`, which names and focuses a card only while it actually scrolls.

No regression reached `main`, so no RCA entry was required.

## Deviations from the plan

- Integrated PR #49's Learning network bar (sibling apps and the learning hub) into the component
  system: native same-tab links and the current-subject marker are kept; it is a compact strip on
  desktop, keeps 44px targets below 900px and stays on one scrollable row below 480px.

- The desktop rail no longer has a Hide/Show topics toggle; Focus reading is the explicit way to hide
  it (the plan does not require a desktop toggle, and it duplicated focus mode).
- Navigation collapses to the Menu below 900px rather than 768px, because the full bar needs about 810px.
- The opt-in tour gained a rail step and lost the roadmap-filter steps, which now sit inside Browse.

## Pending or out of scope

- Real learner feedback and a manual screen-reader pass.
- Emoji inside simulator headings render as missing glyphs in this headless Chromium (no emoji font);
  they are simulator copy and were not replaced.
- Pre-existing tooling issues outside this plan: `.claude/skills/list-topics/list_topics.py` can no
  longer parse `TopicService.java`, and the `remove-topic` skill still mentions the removed HomePage
  fallback list.
