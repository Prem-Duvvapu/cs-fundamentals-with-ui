# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Full-stack interactive CS-fundamentals learning platform: a Spring Boot 3.5 / Java 17 REST backend that serves 3-tier Markdown curriculum content from `content/`, and a React 19 / Vite 8 SPA built reading-first, with per-topic **interactive simulators** where they materially teach a mechanism (all simulation logic except four legacy endpoints runs client-side), plus cross-topic search and per-category Interview Mode over the same validated lesson content.

`AGENTS.md` (agent context + curriculum roadmap) and `CONTEXT.md` (architecture + visualizer inventory) are the project's own docs — they overlap with this file and are kept in sync by the rule below.

## Commands

```bash
./start.sh                 # local Spring Boot :9190 + Vite :3000; no Docker
docker compose up --build  # optional containerized Nginx :3000 + API :9190

npm test --prefix frontend                  # vitest run (all suites)
npm test --prefix frontend -- erModelEngine # single suite by path/name substring
npm run dev --prefix frontend               # Vite :3000, proxies /api -> localhost:9190
npm run build --prefix frontend

mvn test -f backend/pom.xml
mvn test -f backend/pom.xml -Dtest=TopicServiceTest
mvn test -f backend/pom.xml -Dtest=TopicServiceTest#getTopicsByCategory_dbms_shouldContainAll12Topics
mvn spring-boot:run -f backend/pom.xml      # must run so that ./content or ../content resolves
```

`AGENTS.md` requires prefixing commands with `wsl` — that applies when driving this repo from a Windows shell. This session's shell is already Linux, so run them directly.

**On WSL, the frontend suite is slow** (~9 min full run) because `node_modules` sits on `/mnt/c`. Run a single suite while iterating, and prefer backgrounding the full run:
`npx vitest run src/components/__tests__/TopicViewer.markdown.test.jsx`

## Architecture

### Content pipeline
`content/<category>/NN[a-z]-<slug>.md` → `ContentService` (resolves `content/` or `../content/` at startup, strips the `01b-` style numeric prefix to match a topic id) → `GET /api/v1/content/{category}/{topicId}` → `TopicViewer.jsx` → `components/markdown/MarkdownRenderer.jsx`.

The renderer is **react-markdown + remark-gfm + remark-math/rehype-katex + rehype-highlight**, so content may use the full GFM set (nested lists, blockquotes, links, emphasis, task lists, footnotes, aligned tables), `$…$` / `$$…$$` math, and fenced code with syntax highlighting. A ` ```mermaid ` fence is routed to `components/markdown/MermaidBlock.jsx`, which no longer renders Mermaid at runtime: it hashes the diagram source (`utils/diagramHash.js`), looks up the pre-rendered dark/light SVG pair in `frontend/src/generated/diagramManifest.json`, and displays the theme-matched asset as an `<img>`, switching on theme change. `scripts/render-diagrams.mjs` is the build-time generator — it renders every unique fence in both themes via Playwright, corrects Mermaid's under-sized label boxes, and writes to `frontend/public/diagrams/<hash>-{dark,light}.svg`; `npm run diagrams:check --prefix frontend` (wired into `prebuild`) fails the build if any asset is missing or stale. `MermaidBlock.jsx` falls back to the raw source if the manifest has no entry or the image fails to load.

`TopicViewer.markdown.test.jsx` is the guard: it renders **every** file in `content/` and asserts no unparsed markdown leaks into prose, that every math file produces real KaTeX output, and that every blockquote file produces a real `<blockquote>`.

Every content file follows the strict 3-tier pattern: `## 🟢 Beginner Level`, `## 🟡 Intermediate Level`, `## 🔴 Expert Level` (expert tier ends with Common Misconceptions and interview Q&As).

**`content/CONTENT_SPEC.md` is the authoring contract** — depth targets, required Mermaid diagrams, interview-Q&A format and voice. Read it before writing or editing any curriculum content.

### Topic registration — the critical cross-cutting concern
A topic id is a string duplicated across many files. Adding or renaming one means touching **all** of these, or the topic silently 404s / falls back to "Visualizer coming soon":

1. `content/<category>/NN-<slug>.md` — the Markdown itself
2. `backend/src/main/java/com/csfundamentals/service/TopicService.java` — hardcoded `List.of(new Topic(...))`, the source of `/api/v1/topics`
3. `backend/src/test/.../TopicServiceTest.java` — asserts **exact per-category topic counts** (e.g. 12 for dbms), so it fails until updated
4. `frontend/src/pages/TopicPage.jsx` — a `titleMap` entry; **and**, only if the topic has an
   exact-match visualizer, an entry in `frontend/src/components/visualizers/topicVisualizerRegistry.jsx`
   (a topic with no registry entry correctly has no Simulation tab at all — Study only — rather
   than falling back to the wrong hub sub-tab)
5. `frontend/src/utils/topicCategories.js` — `TOPIC_CATEGORY_MAP` entry (`'<id>': '<category>'`), consumed via `getTopicCategory()` by `TopicViewer.jsx` (content-fetch category), `TopicPage.jsx`, `SearchPage.jsx`, and `InterviewPage.jsx`
6. `frontend/src/pages/HomePage.jsx` — a hardcoded duplicate of the whole topic list used as the offline fallback when `/api/v1/topics` fails
7. the category hub's `getInitialTab()` switch (see below) — only if the topic's registry entry is `hub(SomeCategoryVisualizer, topicId)`; not needed for a `direct(...)` entry or a topic with no registry entry at all

### Adding a *category* — a separate, easily-missed checklist
The 7 points above cover adding a **topic**. Adding a whole **category** has its own touch points, and missing them fails *silently* — every topic-level guardrail (including `TopicServiceTest`'s exact counts) still passes while the category is invisible in parts of the UI. This is exactly how DevOps shipped with no Search filter and no Interview Mode tab:

1. `frontend/src/utils/topicCategories.js` — `CATEGORY_METADATA` (glyph, labels, summary) **and** `CATEGORY_ORDER`. These two are the canonical source; **never re-declare a local category list in a page** — import from here, or it will go stale exactly like `SearchPage`/`InterviewPage` did.
2. `frontend/src/pages/HomePage.jsx` — `CATEGORY_DETAILS` (this page intentionally keeps its own labels; see the comment there) and the offline-fallback topic list.
3. `frontend/src/components/Navbar.jsx` — `CATEGORY_LINKS` and `TOPIC_CATEGORIES`.
4. `frontend/src/App.css` — a `--cat-*` accent token set for the new category.
5. `content/CONTENT_SPEC.md` — the category list in the authoring contract.

`SearchPage.jsx`, `InterviewPage.jsx` and `ProgressPage.jsx` need **no** edit provided they keep importing `CATEGORY_ORDER`/`CATEGORY_METADATA`; their tests iterate `CATEGORY_METADATA`, so a category missing from the shared source fails those suites loudly.

### Frontend visualizer layering
- `TopicPage.jsx` — single route `/topic/:topicId`; two tabs (Simulation / Theory), the Simulation tab hidden entirely when `topicVisualizerRegistry.jsx` has no entry for the topic; every visualizer is `React.lazy` + `Suspense`.
- `topicVisualizerRegistry.jsx` is the single source of truth for topic → visualizer routing: `direct(Component)` mounts a standalone visualizer directly (all OS topics, plus a few kept engines that used to sit inside a hub — `java-hashmap-internals`, `java-multithreading-concurrency`, `spring-testing-production`); `hub(CategoryVisualizer, topicId)` mounts a category hub with that topic id as `defaultTopicId`.
- **Category hubs** (`visualizers/DbmsVisualizer.jsx`, `NetworkingVisualizer.jsx`, `JavaSpringVisualizer.jsx`, `AiMlVisualizer.jsx`) take `defaultTopicId`, map it to a sub-tab in `getInitialTab()`, and render the per-topic visualizer from `visualizers/<category>/`. Not every topic in a hub's category is necessarily routed through it — only the ones the registry maps there.
- `/search` (`SearchPage.jsx`) and `/interview/:category` (`InterviewPage.jsx`, `:category` may be `all`) — read-only views over `GET /api/v1/search` and `GET /api/v1/interview/questions`; no topic-registration entries needed since they're not per-topic routes. Both share `components/shared/InterviewDeck.jsx` with the per-topic interview deck in `TopicViewer.jsx`.
- `/progress` (`ProgressPage.jsx`) — same non-registration exemption; a read-only dashboard over the existing `GET /api/v1/topics` fetch plus `useTopicProgress()`'s bookmark/completed state, no new endpoint or persistence. `utils/progressStats.js` holds the actual math (overall/per-category/per-level completion, the "continue where you left off" pick, the bookmarked list) as pure `(topics, progress) → result` functions, kept out of the component so it's unit-testable without rendering.
- `components/shared/ConceptModuleShell.jsx` — standard wrapper giving a module its header, mental-model banner, and Simulation / Deep-Dive Theory / Quiz tabs. Its `theoryData` + `quizData` come from a JSON file in `src/data/` (`dbms-concepts-*.json`, `java-fundamentals-*.json`, …), keeping prose out of JSX.
- `utils/simulationEngines/*.js` — framework-free step-generating engines (usually a class with `generateSteps()` / `stepIndex`, or exported pure functions plus a `*_SCENARIOS` map). **This is where algorithm logic belongs**; components stay presentational, and each engine has a matching Vitest suite in `utils/__tests__/`. Prefer adding an engine here over computing in a component or calling the backend. Test the *algorithm*, not just that steps come back — seven engines once had no suite, and writing those suites turned up four engines teaching outright wrong mechanics (a page-fault handler that assigned frame 15 instead of frame 0 because `shift() || 15` treats 0 as falsy; a Minor GC that wiped the survivor space it had just evacuated into, which in turn made tenuring promotion unreachable). A step list that renders is not evidence the mechanism is right.
- `utils/topicProgress.js` + `hooks/useTopicProgress.js` — per-topic bookmark/completed state, persisted to `localStorage` and broadcast via a `window` `CustomEvent`, same pattern as `hooks/useTheme.js`. Purely client-side; not part of topic registration and has no backend counterpart. `HomePage.jsx` and `TopicPage.jsx` both render bookmark/complete toggles through this hook. `topicProgress.js` also exports `exportProgress()`/`importProgress()` — a versioned `{ app, version, exportedAt, progress }` JSON envelope, downloaded/restored via buttons on `HomePage.jsx`; import always **merges** (a field only ever flips `false`→`true`, never the reverse) and rejects malformed JSON, a non-object payload, or a `version` newer than this build supports.
- `components/shared/ProductTour.jsx` + `hooks/useProductTour.js` — a guided, spotlight-and-tooltip overlay walking through `utils/tourSteps.js`'s ordered steps (home page, then one topic page). Both are mounted once in `App.jsx`, **a sibling of `<Routes>`, not inside a page** — that's what lets the tour's own step-driven `navigate()` calls survive the route change instead of unmounting mid-tour. `utils/tourPosition.js` is the pure placement function (viewport-clamped, flips above/below); a step's target is looked up with a bounded `requestAnimationFrame` retry that degrades to a centered tooltip rather than hanging if the element never mounts. The tour is **opt-in: it never opens on its own**, only from the navbar's "Take a tour" button, so it carries no `localStorage` flag. It used to auto-show on a first visit, which made a stranger's first impression a 9-step modal over a dimmed page before they had seen any curriculum — and was also what made the deep-link regression possible at all (step 1's `path: '/'` yanking a visitor off a shared `/topic/...` link, with the back button unable to recover it). With no auto-open that whole class of bug is structurally impossible; `AppRouting.test.jsx` keeps it that way, asserting deep links survive, that no tour opens unprompted on any route including `/`, and that the navbar button still opens it.

### Backend surface
Deliberately thin: `TopicController` (`/api/v1/topics`, `/topics/category/{category}`), `ContentController` (`/api/v1/content/{category}/{topicId}` — a real 404 for an unregistered topic id, 500 on an I/O error reading its file, 200 with the Markdown otherwise), `DiscoveryController` (`/api/v1/search`, `/api/v1/interview/questions` — both stateless reads over one immutable index `DiscoveryService` builds from `TopicService` + `ContentService` at startup, no second topic registry), and `SimulationController` (`/api/v1/simulation/{cpu-scheduling,page-replacement,subnet-calculator,bankers-algorithm}` — the only server-side simulations; everything newer is client-side). No database, no persistence; `CorsConfig` opens CORS for the Vite dev server.

## Skills

Project skills in `.claude/skills/` cover the recurring workflows — invoke by name:

| Skill | Use for |
|---|---|
| `/list-topics` | Inventory of topics per category with summaries, plus a 7-point registration audit |
| `/add-topic` | New curriculum topic, end to end (content, engine, visualizer, all 7 registration points, tests, docs) |
| `/remove-topic` | Retire a topic without orphaning references |
| `/improve-topic-content` | The 3-tier Markdown in `content/` |
| `/improve-topic-simulation` | Engine + visualizer behaviour and accuracy |
| `/improve-topic-ui` | Visual design and layout of a visualizer, hub, or the theme |
| `/sync-project-docs` | Reconcile README / CONTEXT / AGENTS with the code |
| `/verify-project` | Full test + build + live smoke gate before committing |

They share two references, worth reading directly when working outside a skill:
`.claude/references/topic-registry.md` (the 7 registration points, verbatim file paths) and
`.claude/references/component-contracts.md` (engine contract, shared-component props, concept
JSON schema, and the known prop/styling drift).

## Conventions

- **Doc & test sync rule** (from `AGENTS.md`): after any code, architecture, or feature change, update `README.md`, `CONTEXT.md`, and `AGENTS.md`, add/update the Vitest and JUnit suites, and verify both suites pass before calling the task done.
- Branches/commits: `feat/<YYYY-MM-DD>-<topic>` or `fix/<description>`.
- Styling is vanilla CSS in `src/App.css`, with dark/light design tokens as the contract. Static
  presentation belongs in classes; inline styles are reserved for computed geometry or state.
  Check both themes and the standard responsive breakpoints. See `docs/DESIGN_SYSTEM.md`.
- Comments are minimal — prefer self-documenting code.
