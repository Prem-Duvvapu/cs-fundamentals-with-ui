---
name: add-topic
description: Add a new curriculum topic end-to-end to cs-fundamentals-with-ui — 3-tier Markdown content, simulation engine, visualizer, concept JSON, all 7 topic-registration points, tests, and doc sync. Use when the user asks to add/create a new topic, chapter, or subject to the platform (e.g. "/add-topic graph algorithms", "add a Kafka topic under java-spring").
user-invocable: true
---

# Add a topic

Adding a topic touches ~10 files. The registration points are listed in
`.claude/references/topic-registry.md` — **read it first**; the shapes you must match are in
`.claude/references/component-contracts.md`.

## 1. Settle the inputs

Confirm with the user (ask only what you can't infer from their request):

- **category** — `os` | `networking` | `dbms` | `java-spring` | `aiml`
- **topic id** — kebab-case, unique across all categories (`grep -rn "<id>" --include=*.java --include=*.jsx . | grep -v node_modules`)
- **title**, one-line **summary**, **level** (`beginner`/`intermediate`/`expert`)
- **curriculum position** — which existing topic it should sit after
- **what the simulator should show** — the single mechanism a learner should walk away with

If the user just names a subject ("add Kafka"), propose id/title/level/position and the
simulator concept in one short block, then proceed unless they object.

## 2. Content file

Create `content/<category>/NN[a-z]-<topic-id>.md`, numbered to land at the curriculum position
(use a letter suffix like `04b-` to slot between existing files rather than renumbering).

Structure is fixed — see the `improve-topic-content` skill for the tier rules and the
Markdown-subset constraint. Do not skip a tier.

## 3. Simulation engine

`frontend/src/utils/simulationEngines/<camelCase>Engine.js`, following the engine contract.
Model the topic as 2-5 named scenarios, each precomputing an array of step objects with the
narrative and the state the UI renders.

Write `frontend/src/utils/__tests__/<camelCase>Engine.test.js` alongside it: assert step counts,
scenario switching, boundary clamping, and the algorithm's actual numbers (a wrong Gantt chart
or wrong closure set is the failure that matters here).

## 4. Concept JSON

`frontend/src/data/<category>-concepts-<slug>.json` with `id`, `title`, `subtitle`,
`mentalModel`, `theoryData`, `quizData` — exactly the render-supported shape in
`component-contracts.md`. `mentalModel` should be a concrete physical analogy; `failureModes`
and `productionScenario` should carry real numbers.

## 5. Visualizer component

`frontend/src/components/visualizers/<category>/<Name>Visualizer.jsx`:

```jsx
const engine = useMemo(() => new XxxEngine(), [])
const [engineState, setEngineState] = useState(() => engine.getCurrentState())
// handlers call engine.nextStep() / prevStep() / reset() / setScenario() and setEngineState(...)
```

Wrap in `ConceptModuleShell`, render `stepData`, and finish with `SimulationControlBar`
(`onTogglePlay`) and `StateInspector` (`data`). App.css classes + inline styles — no Tailwind.

Add a render smoke test to `frontend/src/components/__tests__/` matching the existing style
(render with `defaultTopicId`, assert the heading appears).

## 6. Register it — all 7 points

Work `.claude/references/topic-registry.md` top to bottom. For `dbms`/`networking`/`java-spring`/`aiml`
that includes the category hub (`getInitialTab()` case + sub-tab button + render branch); for `os`,
lazy-import the visualizer directly in `TopicPage.jsx`.

Bump the category count assertion in `TopicServiceTest.java` — it will fail otherwise.

## 7. Verify and sync

Run the `verify-project` skill (both suites + frontend build), then `sync-project-docs` to update
`README.md`, `CONTEXT.md`, and `AGENTS.md`. `AGENTS.md` requires both before the task is done.

Report to the user: the topic id, the files added, the scenarios the simulator covers, and the
test results.
