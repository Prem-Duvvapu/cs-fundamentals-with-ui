# Agent Hand-off Prompts

Copy-paste prompts for delegating work on this repository to any coding agent
(Claude, Cursor, Copilot, Codex, Gemini, a local model — the prompts assume no
prior knowledge of this codebase).

**Rules that apply to every prompt below:**

- Give the agent **one** prompt at a time. Do not batch phases.
- Every prompt names the exact files to read and the exact file(s) to write.
- Every prompt ends with a verification command. An agent that cannot show a
  passing verification has not finished.
- On WSL the frontend test suite takes ~9 minutes. Tell agents to expect this
  and not to kill the run.

---

## Prompt 1 — Content authoring (the bulk of the work, 56 of these)

> This is the highest-volume task. Run one agent per topic file. They are fully
> parallel and cannot conflict — each touches exactly one file.

**Before you run any of these**, one agent must produce the exemplar (Prompt 1a).

### Prompt 1a — Create the exemplar (run this FIRST, once)

```
You are writing curriculum content for cs-fundamentals-with-ui, an interview-preparation
platform for computer science fundamentals.

Read these files first:
1. content/CONTENT_SPEC.md   — the authoring contract you must satisfy exactly
2. content/dbms/06-transactions-acid.md — the file you are rewriting

Rewrite content/dbms/06-transactions-acid.md to fully satisfy CONTENT_SPEC.md. This file
will become the reference exemplar that ~55 other agents copy the style of, so it must be
exemplary: 400-600 lines, three tiers, at least 3 Mermaid diagrams (at least one per tier),
a fully worked example with real numbers, at least one comparison table, a Common
Misconceptions section, and 12-15 interview Q&A pairs with substantial answers.

Also read frontend/src/data/dbms-concepts-transactions-acid.json and fold its existing
interviewQA and quizData entries into your Interview Questions section, improving the
answers to meet the 3-sentence minimum. Do not edit that JSON file.

Write to exactly ONE file: content/dbms/06-transactions-acid.md
Do not modify any .java, .jsx, .js, or .json file. The topic is already registered
everywhere it needs to be; no registration work is required.

When done, report: final line count, number of Mermaid diagrams, number of Q&A pairs.
```

### Prompt 1b — Every other topic (repeat 55×, substituting the file path)

```
You are writing curriculum content for cs-fundamentals-with-ui, an interview-preparation
platform for computer science fundamentals.

Read these files first, and only these:
1. content/CONTENT_SPEC.md — the authoring contract you must satisfy exactly
2. content/dbms/06-transactions-acid.md — the reference exemplar; match its depth and voice
3. <TARGET_FILE> — the file you are rewriting
4. frontend/src/data/<TOPIC>-concepts-*.json — existing interview Q&A to migrate, IF one exists

Rewrite <TARGET_FILE> to fully satisfy CONTENT_SPEC.md:
- 400-600 lines
- The three tier headings exactly: "## 🟢 Beginner Level", "## 🟡 Intermediate Level",
  "## 🔴 Expert Level", in that order
- At least 3 Mermaid diagrams, at least one per tier, each one parsing correctly
- At least one fully worked example with concrete numbers
- At least one comparison table
- A "### Common Misconceptions" section with 3-5 items
- A "### Interview Questions" section with 12-15 Q&A pairs, each answer at least
  3 sentences, each tagged [easy] / [medium] / [hard], at least 2 being scenario questions

If a matching JSON file exists in frontend/src/data/, migrate its interviewQA and quizData
entries into your Interview Questions section first (improving the answers), then add more.
Do NOT edit or delete that JSON file — only read from it.

Write to exactly ONE file: <TARGET_FILE>
Do NOT modify any .java, .jsx, .js, or .json file. Do NOT rename the file. All 56 topics
are already registered in the backend and frontend; content work requires zero
registration changes.

When done, report: final line count, number of Mermaid diagrams, number of Q&A pairs.
```

### Wave order for Prompt 1b

Work thinnest-and-most-asked first. `<TARGET_FILE>` values, in order:

**Wave A — 22 files, currently ~69 lines each**
```
content/aiml/01-embeddings-vector-db.md
content/aiml/02-rag-architecture.md
content/aiml/03-model-serving-inference.md
content/aiml/04-llm-parameters-prompting.md
content/aiml/05-feature-stores-mlops.md
content/aiml/06-recommendation-systems.md
content/networking/02-data-link-layer.md
content/networking/03-ip-subnetting.md
content/networking/04-routing-algorithms.md
content/networking/06-tcp-congestion.md
content/networking/07-application-layer-dns-http.md
content/networking/08-network-security.md
content/java-spring/01c-java-memory-model.md
content/java-spring/01d-java-oop-pillars.md
content/java-spring/01f-java-functional-lambdas.md
content/java-spring/01h-java-collections-framework.md
content/java-spring/01j-java-hashmap-internals.md
content/java-spring/02-spring-bean-lifecycle.md
content/java-spring/03-spring-mvc-lifecycle.md
content/java-spring/04-jpa-hibernate-lifecycle.md
content/java-spring/05-spring-batch-lifecycle.md
content/java-spring/06-quartz-scheduler-lifecycle.md
```

**Wave B — 22 files** — the remaining `java-spring` and `networking` topics, plus all 8 `os` topics.

**Wave C — 12 files** — all of `content/dbms/` (already the deepest category; these need
diagrams and Q&A added rather than a full rewrite).

### Reviewing Wave A output

Spot-check **one file per category** against `content/CONTENT_SPEC.md` before accepting the
wave. Reject and re-run a weak file rather than patching it — patching one agent's thin
output costs more than re-running it.

---

## Prompt 2 — Build the content validator (do this early; it gates Prompt 1)

```
In the cs-fundamentals-with-ui repository, create a content validator.

Read content/CONTENT_SPEC.md first — it defines every rule the validator must enforce.

Create scripts/validate-content.mjs, a zero-dependency Node ESM script (Node 20). It must:

1. Accept either a single file path argument or, with no argument, validate every
   curriculum file in content/ (files matching the pattern <NN><optional letter>-<slug>.md
   inside a category directory — do NOT validate content/CONTENT_SPEC.md itself).

2. For each file, check and report:
   - The three tier headings present, exact, and in order:
     "## 🟢 Beginner Level", "## 🟡 Intermediate Level", "## 🔴 Expert Level"
   - Line count >= 400
   - At least 3 ```mermaid fenced blocks, at least one in each tier
   - A "### Common Misconceptions" section exists
   - A "### Interview Questions" section exists with 12-15 questions matching
     the pattern **Q<number>. ...**
   - Each question has a difficulty tag: `[easy]`, `[medium]`, or `[hard]`
   - No raw HTML tags outside fenced code blocks
   - Every ```mermaid block is non-empty and its first non-comment line names a
     valid diagram type (flowchart, sequenceDiagram, stateDiagram-v2, classDiagram,
     erDiagram, gantt, block-beta, journey, pie)

3. Cross-check registration: every content file's topic slug (filename with the
   numeric prefix stripped) must appear as a topic id in
   backend/src/main/java/com/csfundamentals/service/TopicService.java, and all 56
   registered topic ids must have a content file. Report mismatches in both directions.

4. Print a per-file report and exit 0 only if every check passes; exit 1 otherwise.

5. Support a --report flag that writes content-gap-report.md: a table of every topic
   with its current line count, diagram count, Q&A count, and what it is short of.

Also add to frontend/package.json scripts:
  "validate:content": "node ../scripts/validate-content.mjs"

IMPORTANT: On first run this will fail for nearly all 56 files. That is expected and
correct — the failures are the content backlog. Do not weaken the thresholds to make
it pass.

Verify with:
  node scripts/validate-content.mjs content/dbms/06-transactions-acid.md
  node scripts/validate-content.mjs --report
```

---

## Prompt 3 — Reading experience (Phase 2)

> Single owner. This agent exclusively owns `App.css` and `TopicPage.jsx` while it works.

```
In the cs-fundamentals-with-ui repository (React 18 + Vite, vanilla CSS, dark theme),
rebuild the topic reading experience so curriculum content is the primary surface
instead of the simulator.

Read first:
- CLAUDE.md — architecture overview, especially "Content pipeline"
- frontend/src/pages/TopicPage.jsx
- frontend/src/components/TopicViewer.jsx
- frontend/src/App.css (note the CSS custom properties in :root — use ONLY these tokens,
  do not introduce new color literals)

Tasks:
1. In TopicPage.jsx change the default tab from 'simulator' to 'theory', and relabel the
   two tabs to "Study" and "Simulate".
2. Create frontend/src/components/reading/TocRail.jsx — a table of contents generated from
   the rendered h2/h3 headings, with scroll-spy highlighting the active section.
3. Create frontend/src/components/reading/TierNav.jsx — quick jump between the three tiers
   (🟢 / 🟡 / 🔴) with per-tier read/unread state persisted in localStorage. Wrap every
   localStorage access in try/catch; the component must render correctly when storage throws.
4. Create frontend/src/components/reading/InterviewDeck.jsx — parses the topic's
   "### Interview Questions" section into reveal cards, plus a sequential "quiz me" mode.
5. Create frontend/src/components/reading/TopicReader.jsx composing the above with
   TopicViewer, and mount it from TopicPage in place of the bare TopicViewer.
6. Typography pass in App.css: reading measure around 68 characters, a consistent type
   scale, better table and code-block styling, visible keyboard focus states, and a
   prefers-reduced-motion block.

CRITICAL: App.css classes such as .main-tab-switcher and .main-tab-btn are shared with
every simulator component. Scope all new reading styles under a .topic-reader ancestor
so you do not restyle the visualizers by accident.

Add Vitest suites for all four new components in frontend/src/components/__tests__/.

Verify (the full suite takes ~9 minutes on WSL — let it finish):
  npm test --prefix frontend
  npm run build --prefix frontend
```

---

## Prompt 4 — Simulation triage (Phase 3)

> Single owner. This agent exclusively owns the four category hub components.

```
In the cs-fundamentals-with-ui repository, convert a set of step-through simulators into
static Mermaid diagrams embedded in curriculum content.

Read first:
- CLAUDE.md
- .claude/references/topic-registry.md — the 7 places a topic id is registered
- content/CONTENT_SPEC.md — Mermaid diagram conventions

The principle: an animation is only justified when the SEQUENCE of states teaches
something a single labelled diagram cannot. Structures, taxonomies, hierarchies and
one-pass pipelines should be Mermaid diagrams in the content file instead.

Convert these (delete engine + visualizer + test, add diagrams to the .md file):
  erModelEngine            -> content/dbms/02-er-model.md              (use erDiagram)
  designPatternsEngine     -> content/java-spring/01m-design-patterns-solid.md (classDiagram)
  javaOopEngine            -> content/java-spring/01d-java-oop-pillars.md (classDiagram)
  javaExecutionEngine      -> content/java-spring/01b-java-execution-pipeline.md (flowchart)
  javaGenericsEngine       -> content/java-spring/01g-java-generics.md
  javaMemoryModelEngine    -> content/java-spring/01c-java-memory-model.md
  javaStaticFinalRecordsEngine -> content/java-spring/01e-java-static-final-records.md
  javaFunctionalLambdasEngine  -> content/java-spring/01f-java-functional-lambdas.md
  javaCollectionsEngine    -> content/java-spring/01h-java-collections-framework.md (classDiagram)
  dbmsIntroEngine          -> content/dbms/00-dbms-introduction.md
  storageIndexingEngine    -> content/dbms/05c-storage-raid-indexing.md
  ioSystemsEngine          -> content/os/07-io-systems.md

Do NOT touch these — their time-evolution is the concept:
  tcpCongestionEngine, virtualMemoryEngine, diskSchedulingEngine, bplusTreeEngine,
  transactionAcidEngine, concurrencyControlEngine, distributedDbEngine, hashMapEngine,
  jvmEngine, relationalAlgebraEngine, functionalDependencyEngine, springBatchEngine,
  javaStreamsOptionalEngine, virtualThreadsEngine, and all OS visualizers driven by the
  backend simulation endpoints.

For EACH conversion, in this exact order:
1. FIRST write the replacement Mermaid diagram(s) into the topic's .md file.
2. Migrate any interviewQA / quizData from the topic's frontend/src/data/*.json into the
   .md file's Interview Questions section. THIS STEP IS MANDATORY — these are real
   interview questions and deleting the JSON without migrating them loses work permanently.
3. Only then delete frontend/src/utils/simulationEngines/<name>Engine.js and its test in
   frontend/src/utils/__tests__/.
4. Delete the visualizer component under frontend/src/components/visualizers/<category>/.
5. Remove the sub-tab button, the render branch, and the getInitialTab() case from the
   category hub component (registration point 7).
6. Remove the topic's case from renderVisualizer() in frontend/src/pages/TopicPage.jsx.
7. Run: grep -rn "<engineName>" frontend/src   — and fix any straggler references.

Verify:
  npm test --prefix frontend
  mvn test -f backend/pom.xml
  npm run build --prefix frontend
```

---

## Prompt 5 — Search and Interview Mode (Phase 5)

```
In the cs-fundamentals-with-ui repository, add cross-topic search and an interview
drill mode.

Read first: CLAUDE.md, frontend/src/pages/HomePage.jsx, content/CONTENT_SPEC.md

1. Create scripts/build-search-index.mjs — walks content/, extracts per-heading records
   (topic id, category, tier, heading text, a text snippet) and writes
   frontend/public/search-index.json. Wire it as a "prebuild" npm script. Keep the
   index under 2 MB.

2. Create a command-palette style search UI in frontend/src/components/search/ —
   keyboard driven (Cmd/Ctrl+K to open, arrows to move, Enter to go), results grouped by
   category, each result deep-linking to the topic and heading.

3. Create frontend/src/pages/InterviewPage.jsx at route /interview/:category — pools every
   interview question across that category's content files into a shuffled, resumable deck.
   Persist progress in localStorage, wrapped in try/catch.

4. Rebuild HomePage.jsx as a curriculum map: per-topic tier badges and completion state,
   plus the search entry point. IMPORTANT: HomePage.jsx contains a hardcoded duplicate of
   the full topic list used as an offline fallback when /api/v1/topics fails — keep it in
   sync with backend/src/main/java/com/csfundamentals/service/TopicService.java.

Do not add a backend endpoint. The build-time JSON index works against the static build
and the Docker/nginx deploy without server changes.

Add Vitest suites for search ranking and deck assembly.

Verify:
  npm test --prefix frontend
  npm run build --prefix frontend
```

---

## Prompt 6 — Final verification and doc sync (Phase 6)

```
In the cs-fundamentals-with-ui repository, run the full verification gate and reconcile
the documentation with the current state of the code.

1. Run and make green:
   mvn test -f backend/pom.xml
   npm test --prefix frontend
   npm run build --prefix frontend
   node scripts/validate-content.mjs

2. Start the app (./start.sh --local) and manually check three topic pages from different
   categories: content renders, diagrams render, math renders, navigation works.

3. Reconcile these docs against the actual code — topic counts, test counts, the visualizer
   inventory, the API surface, and the content pipeline description:
   README.md, CONTEXT.md, AGENTS.md, CLAUDE.md

4. Update .claude/references/component-contracts.md for the markdown pipeline and the
   reading components, and .claude/references/topic-registry.md if registration changed.

5. Update the .claude/skills/ definitions so future topics are held to the current
   standard: add-topic and improve-topic-content must require content/CONTENT_SPEC.md
   compliance (Mermaid diagrams, 12-15 interview Q&A, 400-600 lines), and
   improve-topic-simulation must no longer assume every topic has a simulator.

Step 5 matters most: if the skills are not updated, the next topic added will reintroduce
the old shallow pattern.
```

---

## What is already done (do not re-do)

**Phase 0 — content pipeline — COMPLETE.** The Markdown renderer was replaced:

- `frontend/src/components/markdown/MarkdownRenderer.jsx` — react-markdown + remark-gfm +
  remark-math/rehype-katex + rehype-highlight
- `frontend/src/components/markdown/MermaidBlock.jsx` — lazy-loaded, centrally themed,
  falls back to raw source on a parse error
- `TopicViewer.jsx` delegates to it; the old 68-line regex renderer and its
  `dangerouslySetInnerHTML` are gone
- `TopicViewer.markdown.test.jsx` — renders all 56 content files, 146 assertions
- Vitest upgraded 1.x → 2.1.8; ESM deps inlined in `vite.config.js`
- Main JS bundle unchanged (191 kB → 191 kB) — the 638 kB renderer is a lazy chunk

`content/CONTENT_SPEC.md` (the authoring contract) is also written and is the input to
Prompts 1 and 2.
