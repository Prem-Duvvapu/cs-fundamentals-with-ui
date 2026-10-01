# CS Fundamentals UI/UX revamp — implementation plan

Prepared 2026-09-29. Status: **implementation in progress; first integration checkpoint implemented**.

This is the implementation handoff for Opus 5.5. Deliver a coherent learning experience
that exceeds the useful qualities of the sibling HLD application: clearer discovery,
more comfortable reading, reliable continuity, purposeful simulations, and effective recall.
The requested scope also includes making Java and Spring Boot lessons substantially easier
to understand. Section 11 defines that required content track and its integration with the UI.
“Best” is an aspiration; task completion, accessibility, reliability, and learner feedback
are the release criteria. Visual polish alone does not establish a better experience.

## 1. Evidence, boundaries, and existing commitments

### What was reviewed

- CS repository at `5609657`, with a clean working tree before this document was added.
- HLD repository at `../hld-with-ui`, HEAD `5511d71`, including its current working files.
  HLD has uncommitted changes. The comparison is with the files inspected, not exclusively
  that commit. Do not overwrite, commit, or otherwise change the sibling repository.
- CS routes, navigation, homepage, reader, topic shell, search, interview deck, progress
  utilities, API helpers, diagram/Markdown rendering, responsive test script, and CI.
- HLD homepage, module shell, study and practice components, and design tokens.
- `AGENTS.md`, `docs/DESIGN_SYSTEM.md`, `JAVA_LEARNING_PLAN.md`, and relevant RCA entries.

This was a **source-based planning audit**. No new browser screenshots, usability sessions,
performance measurements, or test runs establish the current visual quality in this report.
Step 1 explicitly captures that baseline. Historical test counts in repository documents
must not be presented as freshly verified results.

### Source-backed comparison

| Area | Current CS implementation | Useful HLD reference | Revamp decision |
|---|---|---|---|
| Product identity | Roadmap, category filters, dense topic rows | Distinctive editorial homepage, system illustration, clear learning promise | Give CS its own restrained editorial identity and one obvious next action |
| Category navigation | `Navbar.jsx` links each category to a hardcoded first topic | Small module catalog with clear capabilities | Provide real category landing pages with ordered lessons |
| Learning sequence | `HomePage.jsx` and `progressStats.js` sort by category, level, title | Module shell states observable outcomes | Author prerequisite-aware order; alphabetic order is not a learning path |
| Resume | `getNextTopic()` returns first incomplete topic; reader position is component state | Study/playground/practice share a module shell | Distinguish “Resume reading” from “Next recommended lesson” |
| Reader | GFM, math, code highlighting, H2/H3 TOC, tiers, pre-rendered diagrams | Simple study layout with contextual guidance | Preserve CS rendering strengths; reduce repeated orientation chrome |
| Practice | Shared reveal/previous/next interview deck | Written explanation and model-answer comparison | Add optional drafts and honest self-assessment; keep immediate answer access |
| Practice continuity | Current CS deck holds index/reveal state locally | HLD answer state also lives in component-local state | Persist drafts and selected question by stable identity |
| View navigation | CS already supports `?view=simulation`, refresh and browser history | URL-selected module views | Preserve CS behavior; add practice without copying HLD replace-history semantics |
| Error handling | Homepage silently substitutes a large hardcoded topic list on fetch failure | Homepage distinguishes loading/error/retry | Show truthful state and remove hand-maintained fallback duplication |
| Scale | Six categories, 68 documented lessons, study-only and interactive topics | Smaller catalog emphasizing interactive modules | Design compact browsing and accurate capabilities for a larger curriculum |
| Visual language | Semantic dual-theme tokens, three established font families | Warm light surfaces, green accents, numbered module treatments | Adopt consistency and hierarchy, not HLD's colors or component code wholesale |

Evidence locations: `frontend/src/pages/HomePage.jsx`, `TopicPage.jsx`,
`components/TopicViewer.jsx`, `components/shared/InterviewDeck.jsx`,
`utils/progressStats.js`, `utils/topicProgress.js`; HLD's `frontend/src/pages/HomePage.tsx`,
`components/ModuleShell.tsx`, `features/learning/{StudyView,PracticeView}.tsx`, and `styles.css`.

### Preserve these contracts

1. React/Vite, Spring Boot, existing APIs, and static Markdown remain the foundation.
2. All application styling stays in `frontend/src/App.css`, using semantic tokens.
   Do not introduce Tailwind, CSS Modules, a component framework, or a TypeScript migration.
3. Study stays the default. Never show a simulation for a topic without a registry entry.
4. Preserve topic IDs, current URLs, deep links, theme choices, bookmarks, completion,
   progress import/export, and opt-in tour behavior.
5. Preserve GFM, math, code, unique headings, one page H1, and build-time Mermaid assets.
6. Completion stays an explicit learner action. Scrolling and revealing an answer do not
   establish completion or mastery.
7. `JAVA_LEARNING_PLAN.md` remains the authority for Java curriculum expansion.
   This revamp implements the shared metadata and practice infrastructure it needs;
   it does not claim that missing Java foundation lessons already exist.
8. No accounts, mandatory onboarding, AI grading, streak pressure, social features,
   payments, or external analytics are required for this release.
9. Keep content authoring separate: read `content/CONTENT_SPEC.md` first and use one
   content file per content work unit. Do not combine lesson rewrites with UI packages.
10. Update `README.md`, `CONTEXT.md`, and `AGENTS.md` with implemented changes in each
    package, plus relevant tests. Never document planned behavior as delivered.

## 2. Product outcome and success criteria

The main loop is **choose a useful lesson → understand → experiment when available →
explain → continue**. A learner should always know where they are and what to do next.

| Learner task | Proposed acceptance target | How to verify |
|---|---|---|
| Start learning from home | Reach an appropriate lesson within two link activations after choosing a category | First-visit task test; record confusion and wrong turns |
| Resume a session | One home action returns to saved topic and section | Navigation, reload, and storage tests |
| Find a named concept | Search results identify lesson and matching section; valid result opens that section | Search fixtures plus real API browser test |
| Move through a category | Previous/next follow the same authored order everywhere | Metadata and route tests |
| Read on a phone | No page overflow; first substantive lesson content appears within the first 900px at 375px width, default settings | Browser measurements, long-title cases |
| Explain a concept | Draft survives view changes, route changes, and reload; reference answer is always available | Browser persistence journey |
| Explore a simulation | Controls, state, and explanation are understandable without relying on motion or color alone | Manual task and keyboard test |
| Recover from failure | Failed request shows contextual retry; retry preserves filters and drafts | Offline/500/slow-response fixtures |
| Use assistive technology | No known WCAG 2.2 A/AA failure in changed journeys | Automated scans plus manual keyboard/screen-reader checks |

These are design targets, not measurements already obtained. Run five directional usability
sessions if participants are available: two newer learners, two interview-focused learners,
and one experienced user. Seek at least four unassisted successes per core task; record
the actual sample and failures. This small study identifies friction, not statistical proof.
If no participants are available, report that limitation and use scripted task walkthroughs.

## 3. Information architecture and navigation contract

### Route map

| Route | Responsibility | State in URL |
|---|---|---|
| `/` | Start or resume; six category summaries; searchable/filterable curriculum below | `category`, `level`, `bookmarked` when filtering |
| `/category/:categoryId` — new | Category outcomes, prerequisites, ordered lessons, category progress | Optional `level` and `bookmarked` filters |
| `/topic/:topicId` | Lesson shell and Study | Hash selects a stable heading |
| `/topic/:topicId?view=simulation` | Existing supported simulation | Preserve existing query contract |
| `/topic/:topicId?view=practice` — new | Topic recall from existing interview questions | Optional stable `question` ID |
| `/search` | Cross-curriculum search | Existing `q`, `category`; extend only for implemented filters |
| `/interview/:category` | Cross-topic recall session | `difficulty`; optional stable `question` ID |
| `/progress` | Resume, completed lessons, saved topics, practice review, backups | No new required parameter |

Keep the existing routes functional. Do not rename `/topic` to HLD's `/topics`.
Unknown categories/topics show a real not-found view. Unsupported views fall back to Study
without rendering another topic's simulator. Preserve unrelated query parameters.
User-initiated view changes create usable history entries; typing/debounced filter updates
may replace the current entry. Make hash/history behavior explicit in tests.

### Global shell

- Desktop: compact brand, Learn, Search, Interview, Progress, theme control; tour under
  a quiet Help entry. Learn exposes home and category destinations through normal links.
- Mobile: compact brand, visible Search action, menu button. Menu contains labelled
  Learn/Interview/Progress/theme/help destinations. Do not stack a second permanent
  category rail and a bottom navigation bar on top of reader controls.
- Category choice leads to a category overview. Lesson breadcrumbs return to that overview.
- Add a skip-to-content link and route-level title/focus management. Focus the page heading
  after a new route, but do not steal focus during typing, tab selection, or hash navigation.
- Menu, diagram viewer, and tour cannot compete for modal focus. Opening one closes the
  previous overlay through a documented owner, rather than leaving two active focus traps.

### Reader layout

- At ≥1280px: centered content shell, 220–256px left TOC, flexible article near 68ch.
  No second permanent curriculum sidebar; use breadcrumb/category navigation.
- At 1024–1279px: narrower TOC rail and flexible article; wide teaching surfaces may use
  the available article column without forcing prose wider.
- Below 1024px: collapsed inline “Contents” disclosure; it remains keyboard usable.
- Below 768px: lesson title/actions scroll in normal flow. Global sticky chrome, if used,
  stays compact; do not recreate the tall-header RCA.
- Header: breadcrumb, one title, short outcome/prerequisite summary, secondary bookmark
  and completion controls, then Study / Simulation when supported / Practice when available.
- Article: compact tier jump links, content, then completion/next-lesson actions.
  Remove the repeated large “Read in three passes” card; retain that help behind a disclosure.
- An optional Focus reading control hides secondary navigation and exposes an obvious exit.
  It never hides the content, escape action, or accessibility controls.

## 4. Visual direction and component specification

Choose a **calm technical learning workspace**: editorial typography, precise diagrams,
generous reading space, and category color used sparingly. Avoid a dashboard full of
equally prominent tiles. The article and the next useful action dominate.

### Token and layout targets

| Area | Initial design target | Constraint |
|---|---|---|
| Light theme | Warm neutral page, white/soft raised surfaces, dark ink | Check prose, muted text, code, charts, and controls separately |
| Dark theme | Neutral charcoal page, slightly raised surfaces, bright readable prose | Avoid large saturated backgrounds and low-contrast gray labels |
| Accent | One application action accent, existing category accents for orientation | State, tier, category, and action meanings remain distinct |
| Fonts | Keep Inter Tight, IBM Plex Sans, JetBrains Mono initially | No new font download unless a measured readability need justifies it |
| Prose | 17–18px default, approximately 1.65–1.75 line height, 64–72ch | Reader size choices 16/18/20px; do not shrink mobile prose |
| Interface text | Usually 14–16px; small metadata at least 12px | Critical instructions never reduced to tiny uppercase labels |
| Spacing | 4/8/12/16/24/32/48/64px scale | Use named tokens; avoid unexplained one-off spacing |
| Corners | Small controls, medium panels, larger dialogs | Use a small documented scale consistently |
| Elevation | Borders for ordinary separation, shadow for overlays | No decorative shadow on every paragraph/card |
| Touch targets | At least 44×44px where interactive | This is the project target, not a claim about WCAG's minimum |
| Motion | Brief state transitions, around 120–200ms | Reduced motion disables movement; no automatic hero animation |
| Page shell | Around 1200–1280px maximum | Reader prose width independent of overall shell |

Resolve actual color values during Step 3 with measured contrast. Keep all literals in
theme blocks. If diagram theme/font inputs change, regenerate through the existing pipeline.
Token changes must not leave images visually mismatched with surrounding surfaces.

### Reusable pieces to build only when consumed

- `PageHeader`, `Breadcrumbs`, `TopicRow`, `CategoryCard`, `EmptyState`, `ErrorState`,
  `LoadingState`, and `Icon` for consistent hierarchy and feedback.
- `TopicTabs`, `ReaderToolbar`, `TableOfContents`, `LessonNavigation`, and `CodeBlock`.
- `PracticeSession` shared by topic Practice and Interview Mode.
- `Dialog` or a carefully wrapped native dialog for the mobile menu and diagram viewer.
  Confirm browser behavior before reusing it for the existing tour.
- `SimulationShell` and common controls based on existing shared simulator primitives.

Keep normal links as links and actions as buttons. Do not nest bookmark buttons inside
whole-card links. Use a small consistent inline SVG icon set with accessible naming;
replace mixed decorative emoji in interface controls without changing authored lesson text.

### Interaction states required for every relevant component

Specify default, hover, focus-visible, active/selected, disabled, loading, empty, error,
and successful feedback. A disabled control has an understandable reason. Errors appear
next to the failed task. Loading reserves appropriate space without hiding an existing draft.
Toast-style feedback supplements persistent state; it never carries the only error message.

## 5. Data and state decisions before implementation

### One curriculum source

Extend the existing backend topic catalog with validated learning metadata instead of adding
another independent frontend registry. Proposed fields: `order`, `prerequisiteIds`, and
`outcomes`; retain `id`, `title`, `category`, `level`, and `summary` unchanged.
Use `TopicService` as the initial canonical source to minimize infrastructure changes.
If metadata is later externalized, move the authority in one migration rather than maintaining both.

- Author a unique order within each category; validate prerequisite IDs and detect cycles.
- Validate all registered topics have content and a usable category/order.
- Outcomes describe what the current lesson actually teaches; missing prerequisites are
  documented gaps, not invented links or fabricated lesson coverage.
- The visualizer registry remains the authority for simulation availability. Add consistency
  checks; do not duplicate 68 hand-maintained capability flags in page components.
- Fetch catalog data through one shared provider/hook with loading/error/retry and cancellation.
  Avoid introducing a query library for this scale unless the implementation proves a need.
- Replace the homepage fallback list and topic title map with this catalog. A content request
  failure must remain a failure even if catalog metadata is available.
- Distinguish topic `level` metadata from Beginner/Intermediate/Expert sections inside every
  lesson and from Easy/Medium/Hard interview difficulty in UI labels and filters.

### State ownership and persistence

| State | Owner | Persistence / precedence |
|---|---|---|
| Category, filters, view, explicit section/question | Router | URL is the shareable source of truth |
| Theme | Existing theme hook | Preserve saved choice and system fallback |
| Bookmark/completed | Existing progress utility/hook | Keep existing storage key and v1 backup compatibility |
| Reading position | New reading-progress utility/hook | Versioned `cs-fundamentals-*` key; topic ID + heading ID + timestamp |
| Reader size/focus preference | New reader-preferences utility/hook | Versioned local preference, reset available |
| Draft/self-assessment | New practice-progress utility/hook | Stable question identity + question fingerprint + timestamp |
| Simulation inputs | Topic-specific session state above the view switch | Retain through view changes; durable snapshots only if explicitly supported |
| Tour | Existing app-level owner | Opt-in; no new auto-open or persisted onboarding flag |

For new stores, follow the existing CustomEvent pattern and add browser `storage` event
handling for cross-tab synchronization. Validate parsed types and versions, tolerate malformed
JSON, reject unsafe object keys, bound text/import sizes, and handle storage denial/quota errors.
Keep a real in-memory fallback so successive edits do not disappear when storage is unavailable.
Tell the learner when work is available only for this session; do not claim it is saved.

Reading precedence: explicit URL hash → browser Back/Forward restoration → explicit Resume
action's saved heading → normal top-of-lesson entry. Do not automatically yank every lesson
visit to a saved location. Restore after headings and layout are ready, once per navigation.
If the heading was removed, fall back to lesson start with a quiet explanation. Save on meaningful
section changes, throttle writes, and flush on route exit/pagehide where possible.

Current question IDs may include ordinal positions. Audit both Java and JavaScript parsers
before attaching durable data. Introduce a shared identity contract using explicit IDs when
available or a deterministic normalized-question fingerprint with collision handling. Keep
legacy IDs for compatible links. Content updates must not attach an old draft to a new prompt.
Retain unmatched drafts in backup data; never silently transfer them by array index.

Preserve v1 progress import semantics. Add a documented v2 learning-data export/import for new
stores, accepting v1 files. Preview counts, merge bookmark/completion positively, and preserve
conflicting draft versions instead of silently discarding text. Preferences should not overwrite
the current device's settings unless selected. New exports must include drafts and reading state.

## 6. Ordered implementation packages

Execute in this order. Each step ends with a reviewable change, appropriate automated tests,
browser checks for affected interactions, documentation sync, and a verification record.
Do not bundle the entire revamp into one patch. “Done” requires the exit criteria, not just code.

### Step 1 — Record the actual baseline

**Purpose:** establish what works, what looks weak, and which checks are real.

1. Read current instructions, `RCA.md`, this plan, design system, Java plan, and CI workflow.
2. Record branch, commit, dirty files, Node/Java versions, and available browser tooling.
3. Run existing frontend/backend suites, content/diagram checks, build, and responsive checks.
   Record existing failures separately; do not weaken assertions to make the baseline green.
4. Run both apps locally using their documented launch procedures. Do not reuse an unverified
   stale build, conflict with existing ports, or alter HLD source to make the comparison easier.
5. Capture CS home, OOP reader, CPU simulation, long networking lesson, study-only DevOps,
   search, interview, progress, and error routes. Capture HLD home and Study/Practice/playground.
6. Capture desktop and mobile in both themes; include scrolled reader states and open controls.
7. Measure initial transfer size, route chunks, layout shifts, and basic interaction latency.
8. Record a prioritized issue table: observed behavior, impact, evidence, and proposed package.

**Deliverables:** `docs/ui-ux/BASELINE.md`, reproducible screenshot procedure, baseline artifacts,
and a verification table. Large artifacts may be CI attachments rather than committed images.

**Exit:** every observation is labelled source-derived, browser-observed, or learner-reported.
No claimed visual or performance improvement is based only on source inspection.

### Step 2 — Implement curriculum order and metadata

**Depends on:** Step 1. **Risk:** medium; this changes shared navigation data.

1. Inspect `model/Topic.java`, `service/TopicService.java`, relevant controllers/tests, and
   frontend category maps/title duplication before selecting the smallest additive contract.
2. Add authored order, prerequisites, and concise outcomes to the canonical catalog.
3. Validate completeness, unknown references, duplicate order values, and dependency cycles.
4. Build the shared frontend catalog hook/provider; handle aborts, retries, empty catalogs,
   and concurrent consumers without duplicate fetching or stale writes.
5. Update `progressStats.js` and homepage ordering to use the canonical sequence.
6. Remove duplicated title/fallback registries once all consumers use the catalog.
7. Document the overlap with Java learning package 5 and its remaining curriculum gaps.

**Tests:** API serialization compatibility, order/prerequisite validation, cancelled requests,
homepage/progress consistency, catalog failure recovery, all known topic URLs.

**Exit:** homepage, progress, category lists, and future previous/next agree on order.
Backend outage never silently displays a supposedly live hand-maintained catalog.

### Step 3 — Establish the visual system with a representative slice

**Depends on:** Step 1; integrate Step 2 data when ready.

1. Capture a visual specification for home, category, reader, and practice at desktop/mobile.
2. Update token groups in `App.css`; document spacing, type, borders, motion, and overlay layers.
3. Implement common buttons, fields, focus treatment, icons, feedback, topic row, and card styles.
4. Apply the direction to one real home section and the OOP reader, including code, a diagram,
   a table/math fixture, long headings, and a practice question.
5. Compare before/after browser captures in both themes. Measure contrast and article placement.
6. Refine density and hierarchy before applying the design to all routes.

**Files:** `App.css`, `docs/DESIGN_SYSTEM.md`, shared components and focused tests.

**Exit:** both themes and mobile receive equal review; token changes do not break retained
simulators. Record any required diagram regeneration. This is the visual checkpoint;
do not expand across the app while the representative slice has unresolved layout issues.

### Step 4 — Build the global shell and category destinations

**Depends on:** Steps 2–3.

1. Refactor `Navbar.jsx`, `App.jsx`, and `Footer.jsx` to the compact shell specification.
2. Add `CategoryPage.jsx` and `/category/:categoryId` using the shared catalog.
3. Show category promise, optional prerequisites, completion count, and ordered topic rows.
4. Replace category-to-first-topic navigation with category overview links.
5. Implement accessible mobile menu, skip link, route titles, and focus behavior.
6. Preserve the app-level tour lifecycle; update tour target selectors after shell changes.

**Tests:** every destination, active navigation, invalid category, menu keyboard/escape/focus
return, direct URL load, browser history, tour cross-route continuity.

**Exit:** a learner can identify location and reach any category on phone or desktop without
horizontal navigation hunting. No duplicate main landmark or page H1.

### Step 5 — Revamp home as a useful starting point

**Depends on:** Steps 2–4. Resume integrates after Step 7.

1. Replace the large undifferentiated roadmap opening with a compact product promise:
   “Understand the systems behind your code” plus a concrete learning explanation.
2. First visit: show a clear browse/start action and six concise category cards.
   Explain basic-programming assumptions without forcing onboarding.
3. Returning visit: lead with Resume when real saved position exists; otherwise show
   “Next recommended lesson.” Never label the first incomplete item as a saved session.
4. Keep a full curriculum section below category cards, using compact rows, URL-backed
   category/level/bookmark filters, visible result count, and a clear reset action.
5. Rows show title, useful summary, category/level when needed, saved/completed state,
   and accurate Simulation availability. Avoid repetitive metadata in category-grouped lists.
6. Add explicit loading, empty catalog, filtered empty, and failure/retry states.

**Tests:** new/returning/all-complete states, bookmark toggles without navigation, filter
history/reload, no-results recovery, API failure, long titles and empty saved list.

**Exit:** browsing is useful without prior progress, and the primary action accurately reflects
the learner's state. Counts are derived from the catalog, not hardcoded marketing numbers.

### Step 6 — Rebuild the lesson shell and reading hierarchy

**Depends on:** Steps 2–4.

1. Split responsibilities in `TopicPage.jsx` and `TopicViewer.jsx`: shell/metadata/view state,
   content loading, TOC, toolbar, and article rendering. Reuse the Markdown renderer.
2. Add concise outcomes and prerequisite links from metadata; collapse supplementary detail
   when it would push content down excessively. Avoid repeating Markdown prerequisites verbatim.
3. Implement the responsive reader layout, quiet tier links, and compact help disclosure.
4. Make TOC entries real hash links with stable rendered IDs. Respect reduced motion and
   sticky offsets; active section tracking should not flood history or overwrite explicit links.
5. Add heading permalink actions discoverable by keyboard, plus previous/next lesson links.
6. Keep completion visible but secondary near the title; repeat the meaningful action at lesson end.
   “Mark complete and continue” must say that it performs both operations.
7. Add reader size controls and Focus reading with an accessible exit; retain ordinary browser zoom.
8. Move the interactive interview deck into the new Practice view in Step 10; until then,
   keep existing practice available. Do not delete authored interview Q&A from Markdown.

**Tests:** all content renders, one H1, H2/H3 IDs including duplicates/inline code, deep links,
collapsed TOC visibility/focusability, view/history behavior, previous/next boundaries,
keyboard navigation, text resizing, and long-title mobile placement.

**Exit:** substantive reading starts promptly, topic links are shareable, and navigation never
confuses a lesson's overall difficulty with the selected reading tier.

### Step 7 — Add genuine reading continuity

**Depends on:** Step 6.

1. Implement the reading store and preferences store defined in Section 5.
2. Save last meaningful heading and last-visited time without writing on every pixel scroll.
3. Implement restoration precedence and stable layout timing; prevent late restores after the
   learner has manually scrolled or followed another link.
4. Wire real Resume cards into home, category where relevant, and progress.
5. Make returning from Simulation/Practice preserve the current Study position.
6. Preserve legacy completion/bookmarks and add new store exports in Step 12.

**Tests:** reload, Back/Forward, explicit hash overriding resume, deleted heading, delayed
renderer/diagram/font loading, cross-tab changes, storage failure, content revision, and
user interaction cancelling a pending restore.

**Exit:** resume returns to the intended section reliably and never marks the lesson complete.

### Step 8 — Polish code, diagrams, tables, and math

**Depends on:** Steps 3 and 6.

1. Add code-block language labels and Copy with success/failure feedback; copy source text
   without line numbers or presentation labels. Preserve whitespace and clipboard failure fallback.
2. Offer Wrap code where useful; keep horizontal scrolling as default for indentation-sensitive code.
3. Add an accessible diagram viewer with fit, zoom in/out, reset, and full-size image access.
   Pan may supplement controls, but no task may require dragging or pinch gestures.
4. Preserve diagram text/source alternatives, intrinsic sizing, themed assets, and error fallback.
5. Keep wide tables and equations inside labelled local scroll areas; ordinary prose never scrolls sideways.
6. Recheck print output: hide controls, retain content, allow useful page breaks, and include diagrams.

**Tests:** clipboard denied, viewer escape/focus return, keyboard zoom, theme switch while open,
broken SVG request, wide SQL/code/table/math, browser image decode, and reduced motion.

**Exit:** every teaching surface is usable at 320px without shrinking it into illegibility.
Do not introduce runtime Mermaid rendering to support zoom.

### Step 9 — Improve search from matching titles to finding answers

**Depends on:** Steps 2, 4, and 6.

1. Preserve the 300ms debounce, cancellation, URL state, and server-side index.
2. Design result rows around title, category, matched heading, and meaningful excerpt.
3. Extend the search result contract with an exact heading ID when a section match exists.
   Align Java index generation with renderer heading rules through shared golden fixtures;
   duplicate headings, inline code, punctuation, and Unicode must resolve correctly.
4. Link to the validated section hash, falling back to the topic when no exact heading exists.
5. Render matches as safe text nodes/marks, never injected HTML.
6. Provide clear loading, no query, no results, limited results, error, and retry states.
   Do not imply exhaustive results if the endpoint only returns a capped list.
7. Add Cmd/Ctrl+K to focus/open search only after normal search works; use the existing search
   route first rather than adding a second full search product in a command palette.
   Do not intercept shortcuts inside editable controls or composition input.

**Tests:** stale response races, rapid filters, encoded query, empty input, result cap,
exact hash navigation, server/renderer parity, keyboard shortcut behavior, Back restoring query.

**Exit:** learners can find a subsection and arrive there after lazy content mounts.

### Step 10 — Build persistent topic recall practice

**Depends on:** Steps 5–7 and the stable question identity audit.

1. Extract a shared `PracticeSession` from `InterviewDeck` without changing the source of truth
   for Q&A. Topic questions still come from validated Markdown; category questions from the API.
2. Add optional “Your explanation” text area, Save status, Reveal reference answer, and
   self-assessment actions: Needs review / Partly recalled / Recalled confidently.
3. Reference answers remain accessible with an empty draft. Self-assessment is optional and
   labelled as the learner's assessment; do not present correctness scores or AI evaluation.
4. Persist draft changes promptly with debounced storage and exit flushing. Preserve text on
   navigation/reload; never retain only the last debounced write in an unmounting component.
5. Track current question by identity, not array index. Shuffle and pagination cannot make a
   draft or revealed answer appear under a different question.
6. Add `?view=practice` to topic tabs when questions exist; display loading/error/empty accurately.
7. Provide a “Review the lesson” link and clear previous/next controls; preserve existing
   per-topic interview access during migration and avoid duplicate DOM IDs.

**Tests:** draft/reveal/navigation lifecycle, refresh before debounce fires, shuffle, question
reorder/change/removal, no-question topics, malformed store, storage quota, and multiple decks.

**Exit:** a learner can explain, compare, leave, and return without losing work or being forced
to submit an answer. Existing Q&A content and Markdown rendering remain intact.

### Step 11 — Upgrade cross-topic Interview Mode

**Depends on:** Steps 9–10.

1. Keep `/interview/:category`, add URL-backed difficulty, and use the shared practice session.
2. Show selected scope, current question, loaded count, available total, and source lesson.
3. Keep explicit Load more with recoverable append failure. Preserve the current question
   and draft when appending results; deduplicate by stable identity.
4. Label shuffle as applying to loaded questions. Do not call it a random sample of the
   entire question bank unless a corresponding server sampling contract is implemented.
5. Offer a review queue based on explicit self-assessment, and a simple session summary
   counting reviewed questions. Completion of a recall session does not complete lessons.
6. A question deep link must either resolve that exact question through a supported lookup
   or show an honest unavailable state. Do not fetch unbounded pages looking for an ID.

**Tests:** filter cancellation, pagination deduplication, append failure, question deep links,
scope change, loaded-only shuffle, persisted drafts, and invalid category recovery.

**Exit:** session scope and progress are truthful, and moving between topic and category
practice uses the same draft for the same question.

### Step 12 — Make Progress actionable and data portable

**Depends on:** Steps 7, 10, and 11.

1. Prioritize Resume, Next recommended, Needs review, and Saved lessons before aggregate charts.
2. Show category completion with counts and text labels; separate lesson completion, reading
   position, and practice self-assessment. Do not combine them into an invented mastery percentage.
3. Retain old bookmark/completion actions and v1 import compatibility.
4. Implement v2 learning-data backups, preview/validation, conflict preservation, and clear
   explanations that this data lives in the current browser.
5. Add per-draft deletion/reset where useful; any bulk clear has an explicit scoped confirmation.
6. Handle new, partially complete, all-complete, corrupt-import, and storage-unavailable states.

**Tests:** v1/v2 import/export round trips, future version rejection, malformed/oversized files,
conflicting drafts, unknown topics, merge without completion loss, cancellation, file input reset.

**Exit:** existing users lose no saved state, new learning data can be backed up, and the page
offers useful next actions even when there is no progress yet.

### Step 13 — Standardize retained simulation experiences

**Depends on:** Steps 3, 6, and 7. This is a series of small migrations.

1. Inventory the actual `topicVisualizerRegistry.jsx`, hubs, shared controls, and supported
   engines. Do not rely on historical counts as the current inventory.
2. Define a shared layout: concise scenario → inputs/preset → playback controls → visualization
   → current-step explanation → results/trade-offs → return to lesson.
3. Pilot on CPU scheduling. Preserve its algorithms and expected outputs while improving controls.
4. Apply to one structurally different simulator, such as B+ tree or TCP congestion, to prove
   the shell supports both event-driven and incremental interaction before broad rollout.
5. Retain inputs and stopped simulation state across Study/Simulation/Practice changes;
   pause timers when hidden. Never run every simulator invisibly to preserve its state.
6. Standardize labelled inputs, validation, presets, play/pause/step/reset where supported,
   step count, speed, text explanations, and reduced-motion behavior.
7. Reflow controls and metrics on mobile; preserve local scrolling for intrinsically wide
   visualizations and a textual explanation for the current state.
8. Roll out in category-sized packages, with real interaction checks for every registered
   topic/hub mapping and existing engine tests unchanged unless a separate bug is confirmed.

**Tests:** presets, input bounds, repeated play/pause/reset, stale timers, view switching,
keyboard controls, reduced motion, error recovery, and all registry mappings.

**Exit:** each supported simulator has an understandable experiment and explanation.
No engine deletion, replacement, or question loss is part of a cosmetic standardization.

### Step 14 — Perform accessibility, responsive, and performance hardening

**Depends on:** all user-facing packages; run focused checks throughout, not only here.

1. Extend `scripts/test-responsive-layout.mjs` with realistic catalog data. It currently stubs
   `/api/v1/topics` with `[]`, so the home route check does not exercise populated catalog layout.
2. Cover category/progress/practice routes and populated, empty, loading, error, long-title,
   and partially completed states. Include all supported simulator routes for smoke coverage.
3. Add automated accessibility scans using a dev-only axe integration; verify its availability
   instead of assuming the historical audit is installed or already in CI.
4. Manually test keyboard order, visible focus, overlay behavior, 200% zoom, 400% reflow,
   increased text spacing, reduced motion, and a screen reader on core journeys.
5. Exercise widths 320/375/768/1024/1440 in both themes; add a short 375×667 viewport and
   mobile virtual-keyboard checks for search and draft entry. Check safe-area insets.
6. Keep Markdown/simulators lazy, avoid fetching the whole curriculum for search, load diagrams
   near use, and avoid scroll handlers that rerender the whole application.
7. Compare production bundle output and browser traces with Step 1 under the same conditions.
   Require justification for >10% growth in initial compressed JS; this is a review threshold,
   not a reason to hide payload in an immediately loaded second chunk.
8. Target LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at the 75th percentile when real-user data exists.
   Lab runs diagnose loading, shifts, and interactions; they do not establish field INP or a
   population percentile. Document device/network profile and actual results.
9. Run at least one real frontend/backend journey without API mocks. Add Firefox/WebKit smoke
   coverage where tooling is available; report untested browser coverage honestly.

**Exit:** no known blocking accessibility issue, no page-level horizontal overflow, no lost
work, no new console errors, and no unexplained performance regression.

### Step 15 — Review with learners, refine, and prepare release

**Depends on:** Step 14.

1. Repeat the baseline tasks against CS and the relevant HLD journeys. Compare clarity,
   task success, unnecessary actions, and recovery rather than awarding subjective scores.
2. Conduct the small learner study from Section 2 if available. Fix repeated confusion before
   adding features. Keep a record of what remains unvalidated.
3. Audit every route's loading/empty/error/success states and every retained capability.
4. Remove only proven-dead CSS/components after checking dynamic classes and Markdown/runtime
   classes; do not repeat earlier cleanup mistakes.
5. Update README screenshots/instructions, architecture/state/API documentation, design system,
   AGENTS, Java-plan cross-references, and this plan's status table.
6. Run the complete verification suite and deployment/container checks applicable to the changes.
7. Record rollout/rollback notes: feature packages are revertible; legacy data remains readable;
   additive backup formats and metadata contracts have compatibility coverage.
8. Prepare a release summary with evidence, known limitations, and remaining optional work.
   Push, merge, and deploy only within the implementation session's authorization.

**Exit:** documented behavior matches shipped behavior and every required package has evidence.

## 7. Verification matrix and commands

### Minimum browser journeys

| Journey | Required assertions |
|---|---|
| Fresh learner → category → first lesson | Correct sequence, useful outcomes, no unsupported prerequisite link |
| Scroll lesson → leave → Resume | Same heading, no late jump, completion unchanged |
| Search → section → Back | Correct heading, restored query/filter state |
| Study → Simulation → Study | Inputs preserved, timer paused, reading position restored |
| Topic Practice → Interview → reload | Same draft identity, answer access, no accidental completion |
| Bookmark → Progress → export → import | Saved data preserved and conflicts explained |
| Open overlay → Escape | Background is inactive while open; focus returns to trigger |
| Backend failure → retry | Correct error, recovered data, preserved user input |
| Old bookmark/deep link after upgrade | Topic/view/hash works; existing saved progress survives |
| Tour through redesigned routes | Opt-in only, valid targets, no competing overlays |

### Existing commands to retain

Run from the repository root, using the required Node version from CI and Java 17.
Use existing dependencies where installed; `npm ci --prefix frontend` is for a clean setup.

```sh
npm test --prefix frontend
mvn test -f backend/pom.xml
npm run build --prefix frontend
npm run test:responsive --prefix frontend
npm run diagrams:check --prefix frontend
npm run diagrams:decode --prefix frontend
node scripts/validate-content.mjs
node scripts/audit-simulation-questions.mjs --check
node --test scripts/validate-content.test.mjs scripts/audit-simulation-questions.test.mjs scripts/diagram-charset.test.mjs
node scripts/verify-java-examples.mjs
node --test scripts/verify-java-examples.test.mjs
bash scripts/test-start.sh
```

Build runs diagram checking as a prebuild hook. Regenerate with
`npm run diagrams:render --prefix frontend` when rendering inputs change, then check/decode.
Use `docker compose build` and the existing CI container smoke procedure for final integration.
New accessibility/journey commands must be added to `package.json` and CI before claiming
they are release gates. Do not invent commands in a handoff without implementing them.

For each package, record the exact commands, date, exit status, meaningful coverage,
browser screenshots, and known failures. Unit tests verify logic; real browser tests verify
layout/focus/scroll; a real backend verifies contracts; learner sessions verify comprehension.
All four kinds of evidence serve different purposes.

## 8. Delivery strategy, risks, and scope controls

### Suggested release cuts

| Cut | Packages | User-visible result |
|---|---|---|
| Foundation | 1–4 | Measured baseline, catalog consistency, coherent theme and navigation |
| Reading | 5–9 | Better home, category journeys, reader, resume, teaching surfaces, search |
| Practice | 10–12 | Durable recall sessions and useful portable progress |
| Completion | 13–15 | Consistent simulations, broad verification, learner-informed refinement |

Each cut must pass applicable Step 14 checks. The cuts are integration milestones, not
permission to call a partial delivery the completed revamp. Steps 2, 7, 10, and 13 carry
more engineering risk than color/layout changes; split their substeps into PRs as needed.
Estimate calendar time after the baseline and pilot, not from a model-name assumption.

### Known risks and prevention

| Risk | Prevention |
|---|---|
| Global CSS changes damage distant simulators | Representative slice, semantic tokens, per-category browser smoke |
| Header again dominates mobile | Explicit article placement check and scrolled short-viewport captures |
| New ordering conflicts with Java expansion | Coordinate metadata with Java package 5; never manufacture missing lessons |
| Resume competes with deep links/history | Explicit restoration precedence and cancellation tests |
| Drafts attach to the wrong question | Stable identity/fingerprint contract before persistence |
| Local storage loss or incompatible import | In-memory fallback, bounds, v1 compatibility, conflict-preserving v2 backups |
| New colors leave old diagram artwork mismatched | Rendering fingerprint review, regeneration, XML/decode checks |
| HLD work is accidentally incorporated | Reference read-only; no cross-repository edits or mass copying |
| Automated checks claim more than they cover | Realistic fixtures, real API journey, explicit manual review record |
| Scope grows into a new platform | Keep auth, AI tutor, cloud sync, spaced-repetition scheduler, and full PWA offline support out of this release |

Optional follow-up after measured success: a dedicated command palette, multiple curated
cross-category learning paths, richer notes, configurable spaced repetition, or offline study.
Each needs a separate product/data design. None should delay the core reading/practice loop.

## 9. Instructions for the implementing model

Copy this prompt into the implementation session:

> Implement `UI_UX_REVAMP_PLAN.md` in ordered, independently verified packages. Read the
> current `AGENTS.md`, `RCA.md`, `docs/DESIGN_SYSTEM.md`, and `JAVA_LEARNING_PLAN.md` first.
> Begin with Step 1 and inspect the live repository; the plan's source snapshot may have
> changed. Treat `../hld-with-ui` as a read-only product reference with possible local work.
> Preserve existing routes, content, simulation behavior, progress data, and the single-CSS
> token architecture. Create the evidence-backed baseline, then implement the representative
> visual slice before a broad rollout. Follow each package's dependencies and exit criteria.
> Update tests and README/CONTEXT/AGENTS with implemented changes, and record exact verification
> results. Do not mark work complete from screenshots alone, passing unit tests alone, or
> code existing without browser checks. Do not add AI grading, accounts, or a framework rewrite.
> Make routine implementation decisions autonomously; record significant deviations and their
> evidence. Do not push, merge, or deploy beyond the session's authorization. Keep this plan's
> execution ledger current so another session can resume without rediscovering completed work.
> Also implement the required Java/Spring clarity track in Section 11, coordinated with
> `JAVA_LEARNING_PLAN.md`. Preserve advanced depth while teaching prerequisites, tracing
> small examples, and verifying runnable code. UI completion alone does not complete this task.

### Execution ledger

| Step | Status | Commit / PR | Tests and browser evidence | Remaining issues |
|---|---|---|---|---|
| 1. Baseline | Partial | — | — | — |
| 2. Catalog | Implemented | — | — | — |
| 3. Visual system | Partial | — | — | — |
| 4. Shell/category | Implemented | — | — | — |
| 5. Home | Implemented | — | — | — |
| 6. Reader | Partial | — | — | — |
| 7. Continuity | Partial | — | — | — |
| 8. Teaching surfaces | Implemented | — | — | — |
| 9. Search | Partial | — | — | — |
| 10. Topic practice | Partial | — | — | — |
| 11. Interview | Partial | — | — | — |
| 12. Progress/backups | Partial | — | — | — |
| 13. Simulators | Partial | — | — | — |
| 14. Hardening | In progress | — | — | — |
| 15. Release review | Pending | — | — | — |

## 10. Standards and supporting references

- Accessibility requirements: [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/).
  Use the applicable A/AA criteria; passing axe alone does not establish conformance.
- Modal keyboard/focus interaction: [WAI-ARIA dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
  Test focus containment, escape, naming, and return to the invoking control.
- Performance thresholds and field interpretation: [Web Vitals](https://web.dev/articles/vitals).
  Keep lab diagnostics distinct from field percentile claims.
- Local contracts: [Design system](docs/DESIGN_SYSTEM.md), [Java learning plan](JAVA_LEARNING_PLAN.md),
  [RCA register](RCA.md), [authoring contract](content/CONTENT_SPEC.md),
  [verification workflow](.github/workflows/verify.yml).

The numerical UX targets, proposed layouts, release cuts, and state designs in this document
are project decisions to validate. They are not claims that a standard mandates this exact UI.

## 11. Required Java and Spring Boot clarity track

Added to incorporate the user's follow-up: make complex Java and Spring Boot topics much
simpler to understand. This is substantive teaching work, not a vocabulary replacement pass.
Retain technical precision and interview depth; make the route to that depth more gradual.

### 11.1 Evidence and intended audience

The existing OOP reference lesson already demonstrates a useful pattern: a complete account
program, concrete output, object/reference state trace, explained syntax, and exercises.
Preserve that work and use it as a teaching benchmark instead of rewriting it for consistency alone.

By comparison, the current bean-lifecycle opening moves quickly from IoC/DI to a partial
`InvoiceService` example, bean definitions, scanning, and `ApplicationContext`/`BeanFactory`.
That sequence is a source-observed explanation gap for a learner who knows basic programming
but has not yet built Java objects or a web application. It is not evidence that the whole
lesson is inaccurate. Audit each remaining lesson before assigning specific defects.

Assume variables, conditions, loops, and simple functions. Teach or explicitly link Java
syntax, classes, interfaces, HTTP, SQL, and framework prerequisites. A student should be able
to finish the Beginner tier without first understanding the Expert tier of another lesson.

### 11.2 Teaching pattern for every rebuilt lesson

1. **Before you start:** name the exact concepts needed and link the relevant lesson/section.
2. **After this lesson:** two to four observable outcomes, such as predicting output,
   choosing a collection, or finding a transaction boundary.
3. **A concrete problem:** start with something observable, such as a service needing a clock,
   a list containing duplicates, or two requests updating the same task.
4. **Smallest useful example:** introduce one new idea; provide complete runnable context
   or clearly label the snippet as an excerpt.
5. **Trace:** show inputs, operations, state transitions, and output. Explain why each change occurs.
6. **Name the concept:** connect the technical term to the behavior the learner just saw.
7. **Mechanism:** expand the model using a focused diagram, not an unexplained wall of internals.
8. **Variation and failure:** change one assumption and show what breaks or behaves differently.
9. **Predict / change / debug:** short exercises with explained answers and common wrong reasoning.
10. **Expert extension:** implementation details, limits, version differences, and production trade-offs.
11. **Interview bridge:** direct answer → mechanism → trade-off, including real troubleshooting scenarios.

Use analogies briefly and state where they stop matching the actual mechanism. Define terms
such as proxy, bean, transaction, heap, generic type, and thread before relying on them.
Keep conceptual diagrams small, name arrow meanings, and reuse identifiers from the code.
Prefer a few fully explained examples over many disconnected snippets.

### 11.3 Preserve the content contract

- Keep exact three-tier headings, 400–600-line target without padding, at least three Mermaid
  diagrams with one per tier, comparison table, misconceptions, and 12–15 interview pairs.
- Add predict/change/debug exercises inside the relevant tiers; avoid adding an incompatible
  second Q&A format to the parsed Interview Questions section.
- Use supported Markdown only. Do not add raw HTML accordions or application-specific tags
  to hide answers. Interactive interview recall belongs in the new Practice UI.
- Java 17 is the default runnable baseline. Clearly label newer Java features and verify
  them with their declared toolchain; do not make the Java 17 gate run Java 21/25 code.
- Verify framework-version claims using official versioned documentation while authoring.
  Choose and pin a supported Spring Boot/JDK combination for the teaching project, informed
  by the repository's current version; do not silently mix Boot 3 and Boot 4 dependencies/imports.
- Separate language/API guarantees from HotSpot, collector, and framework implementation details.
- One content unit changes one lesson file. Registration, example-project code, validation,
  documentation sync, and diagram assets are separate integration units after the lesson edit.
  Do not leave a changed diagram source published with stale assets at the integration checkpoint.

### 11.4 Concrete coverage map for all existing Java/Spring lessons

This table is the authoring brief, not a claim that every listed improvement is currently missing.
Inspect each file and retain already-good sections. File prefixes are identifiers here;
the authored metadata order, not filename sorting, drives the redesigned learning path.

| Existing file in `content/java-spring/` | Beginner entry/example | Mechanism and advanced bridge |
|---|---|---|
| `01b-java-execution-pipeline.md` | Save, compile, and run one program; explain JDK, JVM, classpath, and a compile error | Trace source → bytecode → execution before class loading and JIT |
| `01c-java-memory-model.md` | Two variables referring to one object; draw state after assignments and method calls | Explain pass-by-value; distinguish this object model from concurrency memory-ordering rules |
| `01d-java-oop-pillars.md` | Preserve the verified account example and explain reference/interface calls | Strengthen only demonstrated gaps; keep overload vs override and dispatch clearly separated |
| `01e-java-static-final-records.md` | Instance field versus shared class field; final reference versus mutable object | Defensive copying, shallow record immutability, version-labelled language behavior |
| `01h-java-collections-framework.md` | Choose List/Set/Map/Queue for tasks, unique tags, ID lookup, and work order | Equality, ordering, costs, resizing, and implementation choices after concrete operations |
| `01g-java-generics.md` | A typed container prevents retrieving the wrong kind of object | Invariance before wildcard examples; trace PECS calls before erasure and bridge methods |
| `01f-java-functional-lambdas.md` | Replace a named task-filter implementation with a lambda | Explain functional-interface target, captured values, method references, then runtime mechanism |
| `01i-java-streams-optional.md` | Loop and stream versions of the same task filter with identical output | Trace lazy operations; terminal operations, side effects, and absence handling |
| `01j-java-hashmap-internals.md` | Store/retrieve tasks by ID; demonstrate equality and a mutable-key failure | Follow one collision before buckets/treeification and concurrent-map distinctions |
| `01k-java-reflection-exceptions.md` | Separate exception handling from inspecting a class; teach resource cleanup first | Explain annotations/proxy prerequisites before reflection costs and exception internals |
| `01l-java-multithreading-concurrency.md` | Lost update with a trace of two threads, followed by a safe version | Visibility, atomicity, ordering, locks, executors, and bounded work in that order |
| `01-jvm-gc.md` | Follow reachable/unreachable objects; distinguish memory from thread execution | Collectors, measurement, and version-labelled virtual-thread behavior as separate later sections |
| `01m-design-patterns-solid.md` | Evolve a small notification or storage dependency when requirements change | Explain the problem each principle solves; show when extra abstraction is unnecessary |
| `02-spring-bean-lifecycle.md` | Construct a service/repository manually, then let Spring supply the same objects | DI before scanning/definitions/callbacks; explain proxy boundaries after ordinary method calls |
| `07-spring-boot-internals.md` | Run the first app and change one property; separate Spring from Spring Boot | Trace startup, auto-configuration conditions, profiles, and operational configuration |
| `03-spring-mvc-lifecycle.md` | Send one HTTP request and inspect response status/body | Trace controller → service and back before DispatcherServlet, filters, and interceptors |
| `08-spring-rest-api-design.md` | Build task CRUD with explicit request/response examples and validation failures | DTOs, status semantics, error representation, pagination, and idempotency |
| `04-jpa-hibernate-lifecycle.md` | Persist/load/update one task and show SQL alongside Java | Entity states, dirty checking, transaction boundaries, lazy loading, and N+1 |
| `09-spring-security.md` | Explain identity versus permission; trace one allowed and one denied request | Sessions before token trade-offs; filters, CSRF, OAuth2, and method rules with explicit assumptions |
| `10-spring-caching-async.md` | Cache one lookup, then demonstrate stale data; queue one slow operation | Invalidation, proxy/self-invocation limits, executor capacity, context, and scheduling |
| `11-spring-testing-production.md` | Test one plain service, then one endpoint and persistence behavior | Explain what each test proves before slices, containers, observability, and shutdown |
| `05-spring-batch-lifecycle.md` | Import a small task CSV; show a failed row and restart | Reader/processor/writer, chunk transaction, checkpoints, retry, and idempotency |
| `06-quartz-scheduler.md` | Schedule a reminder and explain job versus trigger with a timeline | Misfires, persistence, clustering, and duplicate-execution protection |

The first beginner sequence should not start with garbage collectors merely because the
current JVM file has prefix `01`. Keep advanced material accessible without making it mandatory
between introductory Java and the first useful Spring application.

### 11.5 The evolving application: Task Tracker

Use one reproducible application across Spring lessons, building on small Java exercises.
Preserve the existing account example as the OOP primer; bridge to Task Tracker explicitly
instead of changing every topic's domain unnecessarily.

| Milestone | New concept | Observable proof |
|---|---|---|
| A. Plain Java tasks | Objects, collections, service/repository interfaces | Add/list/complete task in a deterministic Java program |
| B. Manual wiring → container | Constructor injection and object ownership | Same service test works with a fake; Spring creates the application graph |
| C. First endpoint | Boot entry point, HTTP, JSON, controller/service boundary | Documented request produces a documented status and body |
| D. Useful CRUD | Validation, errors, DTOs, IDs | Valid task succeeds; invalid request receives an explained error |
| E. Durable storage | SQL, JPA, transactions | Restart retains tasks; failed operation demonstrates rollback |
| F. Security | Authentication and ownership/authorization | Owner can read a task; another caller cannot |
| G. Production behavior | Tests, metrics, caching/async only where justified | A meaningful automated test and an observable failure/recovery scenario |

Keep beginner milestones small and reproducible. Do not require Docker, Redis, Kafka,
OAuth infrastructure, and an external database merely to run the first endpoint.
Advanced labs may introduce services with explicit setup/cleanup and version requirements.
Explain that an embedded teaching database does not prove production-database behavior.

In a separate integration unit, add an isolated teaching project under a documented path
such as `examples/java-spring/task-tracker/`; never turn the platform's own backend into
the tutorial application. Provide independently runnable milestone snapshots or another
equally explicit stage-selection scheme. Prefer a small set of milestones over 23 projects.
Each milestone specifies files, prerequisites, exact commands, expected output/HTTP results,
and tests. Cross-link lesson snippets to their milestone and detect drift where practical.

### 11.6 Ordered content packages

Coordinate these with the UI steps; they are required scope, not optional polish.

| Package | Action and deliverable | Dependencies / completion evidence |
|---|---|---|
| C1. Clarity audit | Review all 23 lessons against the teaching pattern; record undefined terms, missing prerequisites, incomplete examples, and already-good sections in `docs/ui-ux/JAVA_SPRING_CLARITY_AUDIT.md` | Read contract/exemplars; evidence by file and heading, not generic judgments |
| C2. Path design | Map actual prerequisites and learning outcomes, classify beginner/intermediate/advanced routes, identify missing foundation coverage | C1 + UI Step 2; synchronize Java learning package 5 |
| C3. Plain Java foundation | Improve execution/object/reference explanations; preserve OOP exemplar; cover types, control flow, methods, arrays, strings, wrappers, build/test/debug basics | C2; use existing lessons where coherent; missing standalone topics follow registration process below |
| C4. Everyday Java | Rebuild exceptions/resources, collections, equality, generics, lambdas, streams/Optional, files/date-time/JDBC prerequisites | C3; executable examples, output traces, explained exercises |
| C5. First Spring application | Create verified Task Tracker milestones A–D; simplify bean, Boot, MVC, and REST progression | C3–C4 + isolated project integration; real HTTP checks and service/controller tests |
| C6. Data and production Spring | Add milestone E–G; simplify JPA/transactions, security, caching/async, testing/operations | C5; rollback, access-control, and failure/recovery evidence |
| C7. Specialist and advanced topics | Concurrency/JVM, HashMap internals, reflection/proxies, patterns, Batch, Quartz | Required prerequisites from earlier packages; scenario traces and version review |
| C8. Learning verification | Browser-read every rebuilt lesson, validate exercises/examples, check prerequisite links, test novice tasks, record remaining limitations | C1–C7 + UI reader/practice; full content/rendering/integration gates |

The current contract says registered content work needs no registration changes; the Java
plan also anticipates genuinely new foundations. Resolve this by separating scopes:
first record a proposed new lesson in the path plan; then run a dedicated curriculum-integration
package to update registration, metadata, coverage manifest, tests, and docs; only then execute
its one-file authoring unit. Do not invent a fixed count of new topics or expand every topic
into multiple files to meet a numerical target. Do not claim the original 68 count afterward
if additional lessons are actually registered.

UI Steps 1–4 and C1–C2 can progress independently within the same implementation effort.
Use C3 and C5 representative lessons to validate UI Step 6. C4–C7 do not have to block
shell styling, but final release Step 15 requires C8 or an explicitly documented user-approved
scope change. Keep both ledgers synchronized across model sessions.

### 11.7 Verification and acceptance for simpler explanations

For each lesson, require all of the following:

- A reader can describe the problem before seeing internal class names or JVM details.
- Every new language/framework construct in the first example is explained or linked to a
  specific prerequisite; links to another lesson's entire Expert tier do not satisfy this.
- At least one concrete trace connects the example's input, state transitions, and output.
- Predict, change, and debug exercises have explained answers. A wrong answer leads to a
  useful correction rather than only “incorrect.”
- Runnable programs compile/run on the declared baseline; excerpts and intentional failures
  are not labelled runnable. Java markers pass `verify-java-examples.mjs`.
- Spring milestones build and pass meaningful tests on their pinned toolchain; HTTP samples
  match actual responses. Do not claim the Java snippet gate verifies a Spring application.
- Diagrams parse, match the code, render legibly in both themes, and have regenerated assets.
- The structural content gate passes without padding, removed expert material, or shallow Q&A.
- Primary-source review checks version-sensitive behavior; log source/version/date in the
  audit and link appropriate official references from the lesson's Further Reading section.
- A novice walkthrough asks the learner to predict one result, explain one mechanism, and
  fix one small error. Record actual outcomes; model self-review is not a substitute for
  a real beginner's comprehension evidence when participants are available.

Examples of desired learning outcomes: explain why assigning a second reference does not copy
an object; construct a service manually before explaining dependency injection; trace an HTTP
request into a controller; identify which changes roll back together; distinguish authentication
from permission; explain why a plain increment is not a safe concurrent counter.

### Content execution ledger

| Package | Status | Lessons / project milestones changed | Verification / remaining issues |
|---|---|---|---|
| C1. Audit | Completed, dated snapshot | `PROJECT_LEARNING_UX_AUDIT_2026-10-01.md` | Representative source/browser audit; not a full factual review |
| C2. Path | Partially implemented | Authored order, prerequisites, outcomes and category pages | More learner-goal guidance remains |
| C3. Foundations | Partially implemented | Java lesson introductions and runnable examples | Focused prerequisite coverage remains |
| C4. Everyday Java | Partially implemented | Collections/generics/lambda/stream examples | End-to-end beginner verification remains |
| C5. First Spring app | Partially implemented | Runnable in-memory Task Tracker | Persistent data and security milestones remain |
| C6. Data/production | Partially implemented | Introductory explanations | Runnable/lab verification remains |
| C7. Advanced/specialist | Partially implemented | Introductory explanations | Specialist labs and version review remain |
| C8. Verification | In progress | Structural validator and current focused checks | Learner study and complete content accuracy audit remain |

## Integration checkpoint — September 29

Implemented: shared canonical catalog and validated curriculum order/prerequisites/outcomes;
category landing pages; revised home and mobile navigation; explicit Study/Simulation/Practice
views; heading resume and reading controls; copy/wrap code and diagram zoom; saved practice
drafts, self-assessment, review and backup previews; hidden simulation pause with retained
in-topic state; introductory improvements to 22 Java/Spring lessons; runnable Task Tracker.

Verified before integration: 642 frontend tests in 50 suites (Node 24, identical source copied
to `/tmp` to avoid mounted-filesystem overhead); 56 backend tests; five Task Tracker tests;
11 marked Java programs; all 68 content lessons and 83 coverage entries; production build and
295 diagram entries / 590 generated assets. These checks do not establish user-study results
or comprehensive accessibility conformance.

Remaining: additional browser journeys and accessibility audit; practice pagination recovery
polish; consistent simulator presentation and scenario guidance; documentation consolidation;
new foundational lessons and later Task Tracker persistence/security milestones. Content
packages C3–C7 are partially implemented, not complete. Preserve the detailed acceptance
criteria above when continuing.

## October 1 remediation wave

The dated `PROJECT_LEARNING_UX_AUDIT_2026-10-01.md` is the active findings ledger. The first implementation wave addresses reader control remounts, heading resume, route titles, saved interview question recovery, exact review links, misleading Spring Security 403 wording and unsupported simulator incident figures. It also starts prerequisite-aware next-lesson selection and adds browser accessibility checks. Treat these as implementation work subject to verification, not as completion of all 18 audit findings.

## October 1 saved-answer follow-up

The Progress saved-answer manager completes the audit's A05 recovery actions: review/all
filters, all-page access, exact question links, side-by-side conflict inspection, draft-preserving
adoption and inline confirmed deletion.
