---
name: improve-topic-simulation
description: Improve a topic's interactive simulation — the step-generating engine in src/utils/simulationEngines/ and its visualizer — by adding scenarios, fixing algorithm accuracy, or making the animation teach the mechanism better. Use when the user asks to improve/fix/extend a simulator, visualizer, animation, or simulation engine (e.g. "/improve-topic-simulation cpu-scheduling", "the B+ tree split animation is wrong").
user-invocable: true
---

# Improve a topic simulation

Two files: the **engine** (`frontend/src/utils/simulationEngines/<name>Engine.js`) and the
**visualizer** (`frontend/src/components/visualizers/<category>/<Name>Visualizer.jsx`).
Contracts: `.claude/references/component-contracts.md`.

## Where logic belongs

All algorithm and step logic goes in the engine — framework-free, no React imports, steps
precomputed by `generateSteps()` so backwards stepping is free. The visualizer renders
`stepData` and owns no simulation state of its own. If you find yourself computing a result
inside a component, move it to the engine and test it there.

Four legacy simulations still round-trip to the backend
(`/api/v1/simulation/{cpu-scheduling,page-replacement,subnet-calculator,bankers-algorithm}` in
`SimulationService.java`). Don't add new server-side simulations; if you change one of those
algorithms, update the Java **and** its JUnit test in `SimulationServiceTest.java`.

## Diagnose first

Reproduce before editing. Run the engine's suite, and hand-check its numbers against the theory:

```bash
npm test --prefix frontend -- <name>Engine
```

Common defect classes in this repo, in rough order of frequency:

1. **Wrong algorithm output** — off-by-one in waiting/turnaround time, a page-fault miscount, a
   node split at the wrong fill factor. Verify against a worked example from the content file.
2. **Steps that skip the interesting moment** — the state changes but no step captures the
   transition, so the learner sees a jump. Add intermediate steps.
3. **Narrative that doesn't match state** — `stepData` text describing something the rendered
   panel doesn't show.
4. **Dead controls** — `onPlayPause` instead of `onTogglePlay`, `state=` instead of `data=`
   (see "Known drift"). If the play button or state inspector "doesn't work", check this first.

## Making it teach better

- **Scenarios over knobs.** Named scenarios in `XXX_SCENARIOS` that each demonstrate one distinct
  behaviour beat a pile of free inputs. 2-5 per engine.
- **Show the mechanism, not the result.** A Gantt chart that fills in as the scheduler decides
  teaches; a finished chart doesn't.
- **Surface the invariant.** Each step should make visible the thing that must stay true — the
  safe sequence, the balanced tree height, the token count.
- **Make failure a scenario.** Deadlock, thrashing, a rebuild-during-failure — the failure case is
  usually the memorable one.

## Test what you change

Every engine change needs its Vitest suite updated: step counts, scenario switching, boundary
clamping (`isFirst`/`isLast` at both ends), and **the algorithm's actual numbers**. A test that
only asserts "renders without crashing" doesn't protect a simulation.

Then run `verify-project`, and check the animation in the browser (`./start.sh --local`) — step
pacing and visual clarity aren't testable. If the content file now understates what the simulator
shows, update it via `improve-topic-content`.
