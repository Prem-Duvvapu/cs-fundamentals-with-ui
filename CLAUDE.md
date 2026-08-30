# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Full-stack interactive CS-fundamentals learning platform: a Spring Boot 3.2 / Java 17 REST backend that serves 3-tier Markdown curriculum content from `content/`, and a React 18 / Vite SPA that renders per-topic **interactive simulators** (all simulation logic except four legacy endpoints runs client-side).

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

The renderer is **react-markdown + remark-gfm + remark-math/rehype-katex + rehype-highlight**, so content may use the full GFM set (nested lists, blockquotes, links, emphasis, task lists, footnotes, aligned tables), `$…$` / `$$…$$` math, and fenced code with syntax highlighting. A ` ```mermaid ` fence is routed to `components/markdown/MermaidBlock.jsx`, which lazy-`import()`s Mermaid (keeping ~500KB out of the main chunk), themes it centrally from the App.css tokens, and falls back to showing the raw source if a diagram fails to parse.

`TopicViewer.markdown.test.jsx` is the guard: it renders **every** file in `content/` and asserts no unparsed markdown leaks into prose, that every math file produces real KaTeX output, and that every blockquote file produces a real `<blockquote>`.

Every content file follows the strict 3-tier pattern: `## 🟢 Beginner Level`, `## 🟡 Intermediate Level`, `## 🔴 Expert Level` (expert tier ends with Common Misconceptions and interview Q&As).

**`content/CONTENT_SPEC.md` is the authoring contract** — depth targets, required Mermaid diagrams, interview-Q&A format and voice. Read it before writing or editing any curriculum content.

### Topic registration — the critical cross-cutting concern
A topic id is a string duplicated across many files. Adding or renaming one means touching **all** of these, or the topic silently 404s / falls back to "Visualizer coming soon":

1. `content/<category>/NN-<slug>.md` — the Markdown itself
2. `backend/src/main/java/com/csfundamentals/service/TopicService.java` — hardcoded `List.of(new Topic(...))`, the source of `/api/v1/topics`
3. `backend/src/test/.../TopicServiceTest.java` — asserts **exact per-category topic counts** (e.g. 12 for dbms), so it fails until updated
4. `frontend/src/pages/TopicPage.jsx` — `titleMap` entry **and** a `case` in the `renderVisualizer()` switch
5. `frontend/src/components/TopicViewer.jsx` — `CATEGORY_MAP`, which maps topicId → category for the content fetch
6. `frontend/src/pages/HomePage.jsx` — a hardcoded duplicate of the whole topic list used as the offline fallback when `/api/v1/topics` fails
7. the category hub's `getInitialTab()` switch (see below)

### Frontend visualizer layering
- `TopicPage.jsx` — single route `/topic/:topicId`; two tabs (Simulation / Theory); every visualizer is `React.lazy` + `Suspense`.
- **Category hubs** (`visualizers/DbmsVisualizer.jsx`, `NetworkingVisualizer.jsx`, `JavaSpringVisualizer.jsx`, `AiMlVisualizer.jsx`) take `defaultTopicId`, map it to a sub-tab in `getInitialTab()`, and render the per-topic visualizer from `visualizers/<category>/`. OS topics bypass the hub and mount their visualizer directly.
- `components/shared/ConceptModuleShell.jsx` — standard wrapper giving a module its header, mental-model banner, and Simulation / Deep-Dive Theory / Quiz tabs. Its `theoryData` + `quizData` come from a JSON file in `src/data/` (`dbms-concepts-*.json`, `java-fundamentals-*.json`, …), keeping prose out of JSX.
- `utils/simulationEngines/*.js` — framework-free step-generating engines (usually a class with `generateSteps()` / `stepIndex`, or exported pure functions plus a `*_SCENARIOS` map). **This is where algorithm logic belongs**; components stay presentational, and each engine has a matching Vitest suite in `utils/__tests__/`. Prefer adding an engine here over computing in a component or calling the backend.
- `hooks/useStepThrough.js`, `hooks/useSimulationTimer.js` — shared play/pause/step machinery.

### Backend surface
Deliberately thin: `TopicController` (`/api/v1/topics`, `/topics/category/{category}`), `ContentController` (`/api/v1/content/{category}/{topicId}`), and `SimulationController` (`/api/v1/simulation/{cpu-scheduling,page-replacement,subnet-calculator,bankers-algorithm}` — the only server-side simulations; everything newer is client-side). No database, no persistence; `CorsConfig` opens CORS for the Vite dev server.

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
