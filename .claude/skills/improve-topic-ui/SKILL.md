---
name: improve-topic-ui
description: Improve the visual design, layout, or interaction of a topic's visualizer, a category hub, or the shared shells — within this project's vanilla-CSS dark theme (no Tailwind). Use when the user asks to improve the UI/UX/look/styling/layout/responsiveness of a page, visualizer, or the platform overall (e.g. "/improve-topic-ui er-model", "make the DBMS hub tabs less cramped").
user-invocable: true
---

# Improve topic UI

Scope is one of: a single visualizer, a category hub, a shared shell in
`src/components/shared/`, or the global theme in `src/App.css`. Confirm which before editing —
a change to `ConceptModuleShell` or `App.css` hits every topic on the platform.

## The styling system

Vanilla CSS only. **No Tailwind, no CSS-in-JS, no utility framework.** Style with:

- **App.css classes** — `.visualizer-container`, `.viz-header`, `.viz-title-group`, `.viz-card`,
  `.viz-controls-card`, `.cpu-status-card`, `.main-tab-switcher`, `.main-tab-btn`, `.active-tab`,
  `.topic-content`, and the `:root` tokens at the top of `frontend/src/App.css` (~1200 lines).
- **Inline `style={{}}`** for one-off layout — the established pattern inside the shared shells.

13 visualizers contain Tailwind-looking class names (`bg-slate-900/90`, `grid-cols-4`,
`space-y-6`) that resolve to **nothing** — those panels are literally unstyled. When you touch
such a file, translate them to `.viz-card` + inline styles rather than leaving them:

```bash
grep -rlE 'className="[^"]*(bg-slate-|grid-cols-|space-y-)' frontend/src/components
```

Adding Tailwind to fix this is a real option, but it's a platform-wide decision — propose it,
don't do it unprompted.

## Visual direction

The established look is a dark glassmorphism theme: near-black slate surfaces (`#0f172a`,
`#020617`), hairline white borders at ~8-10% opacity, blue/purple accents (`#3b82f6`, `#60a5fa`,
`#93c5fd`), semantic colors for state (red `#ef4444` failure, amber warning, green success),
emoji as section markers. Pull colors from existing tokens rather than inventing new ones —
palette sprawl is the main way this UI degrades.

For a substantive redesign (not a spacing fix), load the `frontend-design` skill first.

## What actually improves these screens

1. **Legibility of the simulation state** — the learner should see what changed between steps
   without hunting. Contrast and a clear active-element highlight beat decoration.
2. **Density** — these panels carry a lot of state. Fix cramped tab rows, tables that overflow,
   and 12px text before adding anything new.
3. **Overflow discipline** — wide tables, Gantt charts, and code blocks need their own
   `overflow-x: auto` container so the page body never scrolls sideways.
4. **Step affordance** — play/step/reset controls in a consistent place, disabled states visible
   at both ends of the timeline.
5. **Responsiveness** — panels reflow below ~900px instead of clipping.

## Don't break the contracts

Prop names are load-bearing and already drift (`onTogglePlay` not `onPlayPause`, `data` not
`state`) — see `.claude/references/component-contracts.md`. A "UI fix" that renames a prop
silently kills a control.

## Verify

```bash
npm test --prefix frontend      # component render tests
npm run build --prefix frontend
```

Tests won't catch visual regressions: run `./start.sh --local` and look at the page at both
desktop and ~800px widths. Report what you changed and what it looks like now.
