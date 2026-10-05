# UI/UX refinement — implementation plan

Prepared: 2026-10-05. Status: **implemented** — see [the results record](docs/UI_UX_REFINEMENT_RESULTS_2026-10-05.md) for evidence, deviations and pending items. The plan text below is kept as written.

## 1. Objective and authority

Make this platform a comfortable, coherent place to learn CS fundamentals and prepare for interviews in both light and dark mode. Optimize the daily loop: find a lesson → understand it → practice explaining it → resume later.

The user prefers LeetCode's dark-mode feel. Keep this project's neutral charcoal direction and build a distinctive, restrained learning interface around it. Light mode requires equal design attention. “Best” is an aspiration; completion means the specific outcomes and checks below pass, with remaining subjective feedback stated honestly.

This document is the authoritative **October 5 presentation and interaction refinement** of `UI_UX_REVAMP_PLAN.md`. Its reader/sidebar decisions supersede conflicting older layout recommendations, especially the older instruction against a curriculum sidebar. Preserve the user's newer requirement: **every category shows all its main topics and expandable subtopics while reading or practicing a topic**. Previous curriculum, accuracy, course-alignment and learning-feature roadmaps retain their own scope; do not restart them as part of this redesign.

Read before implementation:

- `AGENTS.md` in full, including recent appendices and any applicable nested instructions.
- `docs/DESIGN_SYSTEM.md`, `README.md`, `CONTEXT.md`, and relevant `RCA.md` entries.
- This plan and the current implementations named below. Older documents describe historical states; inspect code before assuming a feature is missing.

## 2. Evidence and current shortcomings

Baseline inspected at main commit `ec78646236fe1412227efd51a45905908b7690cf`.

Fresh Chromium previews covered home, Java category, Java Study, Java Practice at 1440×960, and Java Study at 375×960, in both themes. These previews used current source, the canonical catalog and real Markdown with API fixtures. They establish presentation observations, not real-backend integration, new accessibility certification or learner-comprehension evidence. Other categories and failure states need the broader implementation checks below.

| Observation | Consequence | Required direction |
|---|---|---|
| Article container begins about 426px down on desktop and 570px on mobile | Orientation and controls occupy too much of the initial viewport | Reduce stacked chrome and place reading controls together |
| Current lesson's many subtopics fill most of the sidebar | Other main topics take effort to reach | Preserve the full curriculum tree; add useful hierarchy and finding/collapse controls |
| Large homepage hero, category cards and full roadmap repeat discovery choices | Long page with several competing entry points | Prioritize resume/start, search and six concise category entry points |
| Category pages have large header gaps and repeated row labels | Fewer useful lesson choices fit on screen | Compact, scannable ordered lesson rows |
| Light article and page share a cool tinted background; sidebar receives stronger surface emphasis | Navigation visually outweighs learning content | Establish a neutral reading surface and quieter surrounding chrome |
| Dark palette is already neutral, but surface, border and action hierarchy vary | Interface still feels assembled from several treatments | Use one deliberate component system across routes |
| Navigation mixes emoji/glyphs; some rendered as missing characters in the preview environment | Inconsistent appearance across systems | Use a small, consistent SVG icon set for application controls |
| Global primary action inherits a category accent even outside category context | Primary action meaning varies unnecessarily | Separate product action tokens from category identity |
| App.css contains overlapping generations of selectors and spacing definitions | Small changes can produce uneven spacing or regressions | Consolidate affected rules and define a coherent spacing scale |

Representative baseline images are preserved in `docs/previews/ui-ux-baseline-2026-10-05/`: [dark desktop](docs/previews/ui-ux-baseline-2026-10-05/dark-reader.png), [light desktop](docs/previews/ui-ux-baseline-2026-10-05/light-reader.png), [dark mobile](docs/previews/ui-ux-baseline-2026-10-05/dark-mobile-reader.png), and [light mobile](docs/previews/ui-ux-baseline-2026-10-05/light-mobile-reader.png). They show the pre-refinement state, not proposed designs. Recreate a reproducible baseline in the implementation branch; do not depend on temporary preview scripts.

## 3. Scope and non-negotiable preservation

### In scope

Global shell; both themes; Study reader; category navigation; homepage/category discovery; search; topic/category interview practice; Progress and the existing `/review` session; loading, empty, error and focus states; responsive layouts; visual consistency of retained simulators.

### Preserve

1. React, Vite, React Router, Spring Boot, static content and existing API contracts. Keep styling in `frontend/src/App.css`; no UI framework, Tailwind, CSS Modules or CSS-in-JS migration.
2. All 68 canonical topics, their category/order metadata, URLs, heading IDs, deep links and question identities. No second curriculum registry.
3. Study default; Simulation only for registered visualizers; topic Practice and category Interview Mode.
4. Bookmarks, manual completion, resume position, font preference, theme persistence, saved drafts, alternative drafts, attempt history, review queue and import/export compatibility.
5. GFM, KaTeX, code highlighting/copy behavior, build-time Mermaid, diagram text alternatives and full-size access. One semantic page H1.
6. Category outline API/cache, cancellation and retry. Do not download all lesson bodies to build a sidebar.
7. `TopicExpansionProvider` outside the pathname-keyed error boundary. Expand/collapse state must survive route remounts.
8. Section links return to Study, discard stale `view`/`question`/`section` selectors and preserve unrelated query context. Preserve browser Back/Forward and hash restoration.
9. The opt-in product tour, explicit completion and honest self-assessment. Scrolling does not mark a lesson mastered.
10. Existing storage keys and migration/import behavior. Follow the existing storage/event pattern if an essential new persistent preference is introduced.

No lesson rewrites, external Java-course imports, new backend learning features, accounts, grading, gamification, analytics or dependency upgrades are needed. Do not edit the sibling `../hld-with-ui` repository. It may be inspected read-only for useful interaction comparisons if necessary.

## 4. Design decisions

### 4.1 Theme and component foundation

- Preserve dark base colors: page `#1a1a1a`, surface `#262626`, raised `#333333`, code `#202020`. Refine borders, spacing and emphasis around them; keep existing readable prose/syntax contrast.
- Light starting palette: neutral page around `#f7f7f8`, white reading/card surface, soft neutral raised controls around `#f0f1f3`, near-black primary text. These are starting candidates, not unverified approved contrast pairs. Choose final values after rendered review and contrast checks.
- Give the article a clear reading surface without surrounding every paragraph or section with a card. Let the sidebar recede through quieter background, borders and text hierarchy.
- Introduce semantic product action tokens. Use a restrained warm amber treatment in dark mode and an accessible darker amber treatment in light mode, adjusting foreground/fill combinations to pass contrast. Category colors remain category identifiers; statuses keep their own meaning.
- Define primary, secondary, quiet and destructive button variants, plus active/hover/focus/disabled states. Each local task area should have one visually primary next action.
- Normalize spacing to a monotonic scale, for example 4/8/12/16/24/32/40/48px. Audit existing variable use before changing values globally; avoid unrelated visualizer drift.
- Retain current fonts initially: Inter Tight headings, IBM Plex Sans body, JetBrains Mono code. Standard reading size stays 18px with comfortable line height near 1.65–1.75 and 64–72ch measure. Preserve 16/18/20px reader preferences.
- Desktop lesson title target: approximately 28–32px; mobile 22–26px. Use actual long titles in layout checks rather than forcing fixed height or truncation.
- Use consistent inline SVG application icons with accessible labels on icon-only controls. Decorative SVGs are hidden from assistive technology. Do not replace emoji inside curriculum Markdown as a cosmetic sweep.
- Avoid decorative gradients, glowing borders, oversized marketing blocks and animation without a learning purpose. Preserve reduced-motion support.

### 4.2 Global navigation

- Desktop: brand, Learn/category disclosure, Search, Interview, Progress, theme switch; put the opt-in tour under Help. Keep category destinations available through normal links.
- Mobile: one compact row with brand, Search and labelled Menu; the menu contains the remaining destinations and theme/help controls. Remove the permanent second row of global actions.
- Prefer an accessible nonmodal disclosure for navigation. Support Escape, clear expanded state and predictable focus return. Do not add a focus trap unless an actual modal is used.
- Preserve skip navigation and route focus behavior. Route changes may focus the page title; hash navigation, typing and view selection must not lose their intended focus.
- Sticky chrome must not cover headings, controls or focused elements. Avoid competing sticky bars.

### 4.3 Reader layout and controls

Desktop conceptual structure:

```text
Compact global navigation
Breadcrumb / lesson title / bookmark and completion actions
Study | Practice | Simulation when supported
Category rail              Reading column
Search + Collapse all      Beginner / Intermediate / Expert    Reading options
Topics and subtopics       Lesson content
                           Previous / Next and completion action
```

This is an implementation layout sketch, not curriculum ASCII diagram content.

- At ≥1280px, start with a 272–288px rail and an article whose prose remains near 68ch; adapt within the existing centered shell. At 1024–1279px, use a narrower rail around 248–256px. Avoid a second permanent TOC.
- Wide code, diagrams and tables can use the article column width and scroll locally when necessary. They must not widen the page.
- Keep the title and short outcome. Show long prerequisite detail through a clearly labelled disclosure rather than making every route header tall. Do not remove prerequisite guidance from lesson content.
- Consolidate text-size settings, focus reading and study help under one “Reading options” disclosure. Keep a clear exit control while focus reading is active.
- Keep level jump controls alongside that disclosure where space permits; wrap naturally on narrow screens. They remain jumps into the lesson, not filters that discard content.
- Minimize introductory whitespace; preserve authored lesson paragraphs. Do not meet layout targets by hiding the introduction or shrinking text.
- Below 1024px, show a compact “Topics” disclosure above the article, closed by default. The opened panel is bounded and scrollable without creating page overflow.
- Keep headers in document flow on small screens. Default mobile layout should reach substantive reading quickly.

### 4.4 Full-category sidebar

- Show all main topics for the current category in canonical order, for every category. Each topic has a normal navigation link plus a separate chevron button with `aria-expanded`/`aria-controls`.
- Show current lesson and current section differently with `aria-current="page"` and `aria-current="location"`. Do not use color as the only indicator.
- Preserve independent expansion choices across lesson navigation. Do not silently collapse other topics whenever a new lesson opens.
- Add **Collapse all** as a recoverable action. It may collapse the active lesson's children while keeping its main row visible; its chevron must reopen them. Do not immediately undo explicit collapse through an auto-expand effect.
- Add sidebar search over loaded topic titles and heading labels. Matching headings retain their parent topic and enough tier context to understand the match. A title match should allow its normal outline to be explored. Display a clear empty state and clear-search control.
- Search expansion is temporary: clearing a query restores the user's prior expansion state. Category changes clear the query. Filtering never navigates by itself or changes the article.
- Treat existing level headings as visual groups and indent children consistently. Keep all current heading links and exact anchors. Do not invent a new heading parser or hide deeper sections to make the rail shorter.
- Keep the current row visible within the rail when navigating, without scrolling the article or stealing focus.
- Sidebar search is category navigation, not a replacement for cross-curriculum Search. While outlines load/fail, title search still works; explain unavailable subtopic search and expose retry.
- Use list/link/button semantics. Do not apply ARIA tree roles without implementing the complete tree keyboard interaction model.
- Defer drag-to-resize and extra persisted layout preferences; a good responsive default is sufficient for this release.

### 4.5 Home, category and search

- Home should answer “What should I study next?” immediately. For returning learners, prioritize the existing resume action with honest saved context. For first visits, show a short introduction, search access and six compact category entries.
- Reduce hero height and remove competing category-card/full-roadmap presentations. Keep the existing full curriculum and its filters accessible under a labelled “Browse all lessons” disclosure or secondary section.
- Preserve existing homepage filter URLs. A URL containing a roadmap filter must open the curriculum section and show its selected state automatically; do not leave a bookmarked URL apparently empty.
- Category pages show a concise outcome/progress summary, start/resume and quieter practice action, followed promptly by ordered lessons. Each row needs title, useful outcome, completion/bookmark state and accurate study/simulation capability; reduce repeated generic labels.
- Use canonical metadata for labels/order. Avoid new invented learning-stage groupings unless existing metadata supports them.
- Search keeps debouncing, URL state, category filters, cancellation and retry. Improve result spacing and context so the destination topic and matching section are obvious.
- Keep empty, loading and error treatments visually consistent. Never substitute a fake catalog on request failure.

### 4.6 Practice, Progress and simulations

- Practice presents question/context first, optional draft next, Reveal answer as the initial primary action, then model answer/rubric and self-assessment/recording. Keep the reference answer available without requiring a draft.
- Preserve drafts, history, exact-question links, stable IDs, queue behavior and previous/next navigation. Do not couple recording an attempt to navigation or silently grade an answer.
- Distinguish secondary Previous/Next actions from the current task's primary action. Disabled controls must remain identifiable and readable.
- Progress prioritizes resume and due review, followed by completion/bookmarks and saved-answer management. Keep import/export findable. Preserve destructive-action confirmations and alternative-draft handling.
- Keep the existing `/review` route and its frozen session queue, explicit rebuild, selected-topic retry and exact-question links. Apply the practice design without resetting an active session.
- Apply shared surface, text, input and button rules to retained simulations. Inspect representative Java, OS, networking and DBMS engines. No simulator-engine rewrites or deletions are part of this task.

## 5. Implementation sequence and checkpoints

Complete phases in this order; each checkpoint must leave a working application. Do not mark a phase finished based only on changed files.

### Step 1 — Establish the baseline

1. Inspect working-tree status, branch, current instructions, package scripts and relevant RCA entries. Preserve unrelated work; use a dedicated branch/worktree if useful.
2. Inspect the named components and their tests. Record existing functionality so it is not accidentally reimplemented or lost.
3. Extend or reuse `scripts/test-responsive-layout.mjs` and its canonical fixtures for reproducible screenshots. Capture baseline home, category, reader and practice in both themes at desktop and mobile widths.
4. Record article-start positions, horizontal overflow and representative task journeys. Distinguish fixtures from real API execution.
5. Create `docs/UI_UX_REFINEMENT_RESULTS_2026-10-05.md` as a living checklist/evidence record. Planned work remains unchecked until verified.

**Exit:** reproducible baseline, preserved contracts and exact verification commands recorded.

### Step 2 — Implement the foundation and reader pilot

1. Normalize affected tokens/component rules in `App.css`, consolidate duplicate selectors and add reusable SVG controls where useful.
2. Implement the compact navigation and reader hierarchy on the real shared components.
3. Use Java Execution Pipeline as the initial route, then check a long-title Spring lesson and a diagram/code-heavy OS lesson immediately because the components are shared.
4. Capture light/dark desktop/mobile previews and inspect them visually. Compare against baseline: article prominence, typography, surface hierarchy, selected states and control density.
5. Correct issues before spreading the design across other pages. Report the preview checkpoint to the user; continue through the plan unless they steer otherwise. No extra approval gate is required.

**Exit:** coherent reader pilot in both themes, preserved reading preferences, focus mode, view switching and heading navigation.

### Step 3 — Finish the full-category rail

1. Improve width, row hierarchy, indentation and selected/hover/focus states.
2. Add Collapse all and category-local title/heading search with the behavior specified above.
3. Verify all six categories, same-topic section navigation, cross-topic links, route remounts, browser history and mobile open/close behavior.
4. Exercise delayed/failed outline requests, retry, rapid category switching and active-lesson fallback.

**Exit:** another lesson is easy to find without losing current context; no expansion-state or anchor regressions.

### Step 4 — Apply the system to browsing

1. Refine homepage first-visit and returning-user layouts.
2. Compact category pages and preserve roadmap filters/bookmarked URLs.
3. Unify Search results, filtering, states and responsive spacing.
4. Verify category/order metadata comes from existing canonical sources.

**Exit:** clear start/resume paths and consistent browsing in both themes without removing existing discovery tools.

### Step 5 — Apply the system to practice and progress

1. Refine the InterviewDeck sequence and action hierarchy without changing grading semantics.
2. Apply consistent layout to topic Practice, category Interview and Progress.
3. Verify saved-answer, queue, attempt-history, import/export and deletion-confirmation flows.
4. Inspect retained simulators and repair style regressions introduced by shared CSS changes.

**Exit:** study → practice → progress → resume feels like one product and all stored learning state survives.

### Step 6 — Accessibility, responsiveness and visual refinement

1. Run the full route/width/theme matrix below and inspect representative screenshots yourself.
2. Check keyboard-only use, focus return, skip links, heading visibility, reduced motion and zoom. Use real screen-reader checks if available; explicitly report if unavailable.
3. Review contrast for text, syntax, states and controls on every actual background; inspect diagrams and math in both themes.
4. Test loading, no results, missing topic, content failure, outline failure and retry without lost context.
5. Fix discovered failures and rerun affected checks; do not repeatedly run unrelated suites without a reason.

**Exit:** acceptance table satisfied with evidence and any external feedback limitations documented.

### Step 7 — Document and ship

1. Update `docs/DESIGN_SYSTEM.md`, `README.md`, `CONTEXT.md` and `AGENTS.md` to describe delivered behavior. Keep historical dated records intact; clearly supersede obsolete active guidance.
2. Finalize the results document with before/after images, measurements, tests, commit IDs and remaining limitations. Avoid checking large redundant screenshot matrices into Git; retain representative pairs and report the rest as artifacts.
3. Regenerate diagrams after final CSS changes, run required gates and inspect the final diff for accidental content/storage/API changes.
4. Commit coherent changes, push and open/update a PR. Prior user authorization permits pushing and merging this work. Merge only after required checks pass for the final head; report blockers rather than bypassing checks or protections.
5. Sync the original workspace safely after merge; do not discard unrelated changes or stop processes you do not own.

**Exit:** implemented, verified, documented and shipped; the user receives a concise completed/pending summary.

## 6. Acceptance criteria

These are targets to measure during implementation, not results already achieved.

| Area | Acceptance |
|---|---|
| Desktop reader density | At 1440×960, standard 18px font, Java baseline article container begins at or above 330px, versus about 426px previously |
| Mobile reader density | At 375×960, topics/options closed and standard font, same article begins at or above 450px, versus about 570px previously |
| Content integrity | No paragraph/heading removed or hidden to meet density targets; long titles and large font settings may naturally exceed those geometry targets |
| Reading comfort | Prose stays near 64–72ch on desktop; font preference works; article and controls have consistent alignment |
| Category navigation | All topics remain reachable in every category; expand/collapse, Collapse all, search and exact subtopic navigation work with keyboard and pointer |
| Sidebar continuity | User expansion survives pathname-keyed route remounts; search does not overwrite expansion choices; article does not jump when rail scrolls |
| Mobile | No page horizontal overflow at 320/375/768/1024/1440px; wide teaching surfaces scroll locally; no clipped or inaccessible controls |
| Input and focus | Mobile controls meet the project's 44px target; visible focus and labels; opened disclosures and menus work with keyboard and close predictably |
| Contrast | Normal text and code comments ≥4.5:1; large text ≥3:1; required control/state boundaries and focus indicators ≥3:1 against adjacent colors |
| Zoom/motion | Inspect 200% and 400% browser zoom or clearly document equivalent reflow checks; test text enlargement and reduced motion; content/actions remain accessible |
| Theme behavior | Both themes visually reviewed; system default, explicit switch, reload persistence and diagram theme selection work |
| Deep links | Existing topic, section, Practice question and filtered browse URLs work after refresh and Back/Forward |
| Learning state | Bookmarks, completion, resume, drafts, alternatives, history and progress import/export survive the redesign |
| Reliability | Loading/error/retry/empty states are usable; canceled requests cannot overwrite newer routes; no unexpected console errors |
| Performance | Preserve lazy route/Markdown/visualizer behavior and build-time Mermaid; report production bundle delta and explain material increases; no new all-curriculum body fetch |
| Visual completion | Before/after review covers home, category, Study and Practice in both themes and desktop/mobile; search/progress/simulators checked too |
| Evidence honesty | Automated and scripted checks are not described as participant usability or proof of comprehension; list real learner feedback as pending if unavailable |

## 7. Test and verification plan

### Tests to update

- `frontend/src/components/__tests__/Navbar.test.jsx`: menu/disclosure, accessible labels, theme and keyboard behavior.
- `frontend/src/components/__tests__/AppRouting.test.jsx`: page/view/heading behavior and route remount preservation.
- `frontend/src/pages/__tests__/CategoryTopicNavigation.test.jsx`: all-category rail, exact anchors, expansion, filtering, clearing search, Collapse all, keyboard interaction, retry and remounts.
- Existing `TopicViewer` and Markdown suites: controls, font preferences, focus reading, headings, rendering and level jumps.
- Existing Home/Category/Search/Progress page suites: changed interactions and retained URL/storage behavior.
- `InterviewDeck.test.jsx` and existing review/persistence tests: answer visibility, draft preservation, recording and navigation.
- `AppThemeStyles.test.js`: actual theme contrast pairs and semantic tokens. Update legitimate design expectations; do not simply delete failing assertions.
- `scripts/test-responsive-layout.mjs`: existing 14-route × five-width × two-theme coverage, axe scans, all-category navigation and review journeys, plus new navigation/search/collapse and reader-density checks.
- Backend JUnit remains a regression gate. Add backend tests only if backend behavior actually changes; no backend changes are expected.

Test outcomes and regressions, not snapshots of arbitrary implementation details. Baseline counts are historical, not fixed quotas; report actual final counts.

### Concrete regression journeys

1. **First visit:** clear only the test browser's storage, open home, select each category, start a lesson and identify its current topic/level. Record the number of navigation actions and unexpected scrolling.
2. **Find another concept:** open two lesson outlines, search for a heading in another lesson, activate it and check its exact heading/Study view. Clear search; the pre-search expansion choices return. Use Back/Forward and reload.
3. **Explicit collapse:** open several outlines, Collapse all, change a view or other unrelated state and confirm they stay collapsed. Reopen the current topic and activate a section with the keyboard.
4. **Resume:** read into a lesson, visit another route and return through Resume. Confirm the expected saved heading and readable focus position. A newly selected deep link must take precedence over an older resume position.
5. **Practice continuity:** enter a draft, navigate away/back, reveal the answer, record one self-assessment, reload and inspect history. No duplicate attempt is recorded merely by rerendering or navigating.
6. **Review continuity:** launch from Progress, visit the exact saved question, exercise retry and explicit queue rebuild; verify existing session semantics and stored alternatives are preserved.
7. **Recovery:** simulate a failed outline request while active lesson content succeeds; title search and current sections remain useful. Retry and switch categories rapidly; late responses cannot replace the selected category.
8. **Theme/size:** choose light or dark with keyboard, reload, increase reader size, open/close navigation and inspect a table, code block and Mermaid diagram. Repeat in mobile layout and at zoom/reflow settings.
9. **Tour and overlays:** explicitly launch the existing tour through Help, follow its cross-route steps, dismiss it and verify focus. Update tour anchors/copy if controls moved; avoid simultaneously active modal overlays.
10. **Data recovery:** export existing learning data, import through the existing merge flow in an isolated test profile, compare an alternate draft and confirm a deletion. Do not use a real user's browser data for destructive tests.

### Commands

Use the active Linux shell here. Select a Node version satisfying repository dependencies; installed Node 24 is available in this environment. Inspect current package scripts and CI before running, since they can evolve.

```bash
npm test --prefix frontend
npm run diagrams:render --prefix frontend
npm run diagrams:check --prefix frontend
npm run diagrams:decode --prefix frontend
npm run build --prefix frontend
npm run test:responsive --prefix frontend
node scripts/validate-content.mjs
node scripts/audit-simulation-questions.mjs --check
mvn test -f backend/pom.xml
```

Run focused tests while iterating, then the full relevant suite at the final checkpoint. `App.css` participates in diagram rendering fingerprints: even a layout-only CSS edit requires regeneration/checks. Keep generated assets and manifest consistent; never bypass fingerprint validation. The responsive harness consumes built output, so build before running it. Install/use the project's Playwright Chromium as needed.

Required CI also covers script tests, runnable Java examples, labs and containers; let `.github/workflows/verify.yml` enforce those gates and inspect final-head results before merge. Validate an actual backend navigation/outline journey as well as fixture-based browser presentation; label each kind of evidence correctly. Preserve the existing all-68-heading comparison contract.

## 8. Likely implementation files

| Area | Files |
|---|---|
| Shared visual system | `frontend/src/App.css`, `docs/DESIGN_SYSTEM.md`, relevant shared controls/icons |
| App/navigation | `frontend/src/App.jsx`, `frontend/src/components/Navbar.jsx` |
| Reader | `frontend/src/pages/TopicPage.jsx`, `frontend/src/components/TopicViewer.jsx` |
| Category rail | `frontend/src/components/shared/CategoryTopicNavigation.jsx`, `frontend/src/hooks/useTopicExpansion.jsx`, existing `useCategoryOutline` hook and `markdownOutline` utility as needed |
| Discovery | `frontend/src/pages/HomePage.jsx`, `CategoryPage.jsx`, `SearchPage.jsx`, shared resume/topic-row components |
| Practice/progress | `frontend/src/components/shared/InterviewDeck.jsx`, `frontend/src/pages/InterviewPage.jsx`, `ProgressPage.jsx`, `ReviewPage.jsx` |
| Verification | Existing suites listed above, `scripts/test-responsive-layout.mjs` |
| Delivery | README/CONTEXT/AGENTS, results document, diagram assets/manifest as required |

This is a navigation map, not a requirement to change every file. Prefer the smallest coherent changes that satisfy the behavior and design goals.

## 9. Implementation handoff

Use the companion `OPUS_UI_UX_IMPLEMENTATION_PROMPT_2026-10-05.md` as the initial model prompt. Keep this document and the results checklist available across context resets. Implement through all checkpoints unless user steering changes scope or a genuine external blocker prevents progress.

Relevant accessibility references: [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/), [contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). Accessibility checks constrain the design; preference and ease of learning also require visual judgment and, when available, real learner feedback.
