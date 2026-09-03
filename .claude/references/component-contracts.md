# Component & Data Contracts

Exact prop/data shapes for the shared frontend building blocks. **Verify against the source
before relying on this file** — parts of the codebase already violate these contracts (see
"Known drift"), so copying a neighbouring visualizer is an unreliable way to learn them.

## Simulation engine contract (`src/utils/simulationEngines/*.js`)

Framework-free. No React, no imports from `components/`. A class exposing:

```js
export const XXX_SCENARIOS = { 'scenario-id': { id, name, description }, ... }

export class XxxEngine {
  constructor()                       // sets activeScenario, stepIndex = 0, steps = this.generateSteps()
  generateSteps()                     // -> array of step objects; the whole simulation, precomputed
  setScenario(scenarioId)             // resets stepIndex, regenerates steps -> getCurrentState()
  nextStep() / prevStep() / reset()   // mutate stepIndex, clamp at bounds -> getCurrentState()
  getCurrentState()                   // -> { activeScenario, scenarioMeta, stepIndex, totalSteps,
                                      //      stepData, isFirst, isLast }
}
```

Steps are **precomputed up front**, not generated lazily — that makes stepping backwards free
and keeps components pure renderers of `stepData`. Every engine gets a Vitest suite in
`src/utils/__tests__/<engineName>.test.js` asserting step counts, terminal state, and the
algorithm's numeric results.

Components hold the engine in `useMemo(() => new XxxEngine(), [])` and mirror its returned
state into `useState`, since the engine mutates internally and won't trigger re-renders.

## Shared components (`src/components/shared/`)

| Component | Props |
|---|---|
| `ConceptModuleShell` | `title`, `subtitle`, `mentalModel`, `simulationComponent` **or** `children`, `theoryData`, `quizData`, `defaultTab` (`'simulation'`) |
| `SimulationControlBar` | `isPlaying`, **`onTogglePlay`**, `onStepForward`, `onStepBackward`, `onReset`, `currentTime`, `maxTime`, `speed`, `onSpeedChange`, `onSeek` |
| `StateInspector` | **`data`** (object; renders `null` when empty), `title`, `highlightKey` |
| `StepThroughController` | `currentStep`, `totalSteps`, `onNext`, `onPrev`, `onReset`, `onSelectStep`, `stepTitles` |
| `CodePanel` | `code`, `activeLine`, `title` |
| `QuizCard` | `question`, **`answer`**, `codeSnippet`, `difficulty` |

`ConceptModuleShell` ignores any prop not in its destructure list (e.g. `conceptId`) — passing
extras is silently a no-op.

## Concept JSON (`src/data/*.json`)

The shape `ConceptModuleShell` + `QuizCard` actually render:

```jsonc
{
  "id": "topic-id",
  "title": "...", "subtitle": "...", "mentalModel": "...",
  "theoryData": {
    "failureModes": ["..."],                                  // red card, bullet list
    "tradeOffs": [{ "aspect": "...", "optionA": "...", "optionB": "..." }],
    "productionScenario": "...",                              // single string
    "codeSnippet": "...",                                     // \n-escaped, rendered in <pre>
    "interviewQA": [{ "question": "...", "answer": "..." }]
  },
  "quizData": [{ "question": "...", "answer": "...", "difficulty": "Core Fundamental", "codeSnippet": "..." }]
}
```

Any other key renders nothing. Notably `theoryData.keyTakeaways` and MCQ-style
`quizData: [{options, correct|correctAnswer, explanation}]` are **not** rendered by the shell —
they produce an empty Theory tab and answerless quiz cards.

## Styling

There is **no Tailwind** in this project (no dependency, no plugin, no CDN). Style with:

- App.css classes: `.visualizer-container`, `.viz-header`, `.viz-title-group`, `.viz-card`,
  `.viz-controls-card`, `.cpu-status-card`, `.main-tab-switcher`, `.main-tab-btn`, `.active-tab`,
  `.topic-content`, plus the `:root` dark tokens at the top of `src/App.css`.
- Inline `style={{ ... }}` for one-off layout — the established pattern inside shared shells.

Tailwind-looking class names (`bg-slate-900/90`, `grid-cols-4`, `space-y-6`) resolve to nothing.

## Known drift (do not copy; fix when touching these files)

6 files share two defects from one authoring era — the DBMS suite (`ConcurrencyControl`,
`Normalization`, `FunctionalDependency`, `RelationalAlgebra`) plus two OS visualizers
(`DiskScheduling`, `FileSystem`):

1. `onPlayPause={...}` passed to `SimulationControlBar` (expects `onTogglePlay`) — dead play button.
2. `state={{...}}` passed to `StateInspector` (expects `data`) — inspector renders nothing.

The Tailwind-with-no-Tailwind defect that used to also affect these 6 (plus several other,
since-removed modules) was fixed by the Phase 6 UI-revamp rewrite — see `UI_REVAMP_PLAN.md` —
and no longer applies anywhere in the codebase.

Check with:

```bash
grep -rln "onPlayPause" frontend/src/components/visualizers
grep -rn -A2 "<StateInspector" frontend/src/components/visualizers | grep "state={{"
```
