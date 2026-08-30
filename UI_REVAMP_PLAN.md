# UI/UX Revamp — Implementation Hand-off

**Audience:** the coding agent (Codex) implementing this. **Author:** design lead.
**Status:** approved by the owner on 2026-08-30. Implementation may proceed through all phases.

This document is the single source of truth for the revamp. It supersedes any styling
guidance in `AGENTS.md`, `CONTEXT.md`, or `CLAUDE.md` where they disagree — and Phase 8
exists specifically to correct those files.

Every value here is literal. Where you see a hex code, use that hex code. Where you see a
file path, that is the real path in this repo. If something is genuinely ambiguous, stop
and ask the owner rather than inventing a value.

---

## 0. Audit — what is actually true today

Verified against the working tree on branch `feat/2026-08-30-java-sde2-coverage-release`.

### 0.1 Confirmations and corrections to the brief

| Brief claim | Verdict | Measured reality |
|---|---|---|
| Single global `src/App.css`, ~1578 lines | **Confirmed** | Exactly 1578 lines. It is the **only** `.css` file under `frontend/src`. |
| "287 class selectors" | **Corrected** | 293 rule blocks / 267 selector lines / **185 unique top-level class selectors** / 210 distinct class tokens anywhere in the file. Use **185** as the count of things you must account for. |
| `AGENTS.md` claims CSS Modules | **Confirmed** | `AGENTS.md:10` reads `**Styling**: Vanilla CSS, Glassmorphism, CSS Modules, Dark Theme Tokens`. There are zero `.module.css` files. This is false and Phase 8 fixes it. |
| ~1049 inline `style={{}}` blocks | **Confirmed exactly** | 1049 occurrences across **41 files**. |
| "~25 hardcoded hex values" | **Corrected — much worse** | **80 distinct hex values** in `.jsx`/`.js`, **38 distinct** in `App.css`, **90 distinct in the union**. This is the single biggest finding. |
| Dark theme only, no `data-theme`, no `prefers-color-scheme` | **Confirmed** | Zero occurrences of either. `App.css:318` has the only media-feature query of that family: `prefers-reduced-motion`. |
| `--font-mono` declares JetBrains Mono, never loaded | **Confirmed** | Zero `@font-face`, zero `fonts.googleapis.com`, zero font files. `App.css:17` is the only mention of the string "JetBrains". It silently falls back to Consolas. |
| `index.html` has no preconnect/favicon/description/theme-color | **Confirmed** | The file is 12 lines: charset, viewport, title, root div, module script. Nothing else. |
| MermaidBlock `theme:'base'` + custom themeVariables; MarkdownRenderer imports `github-dark.css` + `katex.min.css` | **Confirmed** | `MermaidBlock.jsx:14-46` sets 27 `themeVariables`, all hardcoded hex. `MarkdownRenderer.jsx:7-8` imports both stylesheets. |
| Vitest tests exist and class/markup changes risk breaking them | **Confirmed, but the risk is far lower than you think** | 38 test files. **Only one assertion in the entire suite depends on a CSS class name**: `pages/__tests__/TopicPage.test.jsx:27,41,45` assert `.className` contains `active-tab`. Everything else queries by role, label, or text. See §5.0. |

**Four corrections you should act on:**

1. **`framer-motion` is installed but has ZERO imports.** `package.json` lists
   `framer-motion@^12.43.0`; `grep -r "framer-motion" frontend/src` returns nothing. The
   brief assumed it was in use and that animations "feel ad hoc" because of it. They feel ad
   hoc because they are **14 hand-written CSS `transition:` declarations and exactly one
   `@keyframes` (`pulse-glow`, `App.css:688`)**. See §2.9 for the decision required.
2. **There are 47 visualizer `.jsx` files, not ~60.**
3. **36 CSS classes are defined in `App.css` but referenced nowhere in any `.jsx`.** They are
   dead rules. Full list in §0.4.
4. **`.topic-content` is defined twice, in two conflicting blocks**, and the second silently
   kills part of the first. See §0.5 — this is a live bug, not just untidiness.

### 0.2 Every distinct color in use

**Tokens that exist today** (`App.css:2-18`) — 14 colors, and they are the *only* structured
part of the system:

```
--bg-dark #0b0f19   --bg-card #151c2c   --bg-card-hover #1e293b   --border-color #2e3a52
--accent-purple #8b5cf6   --accent-blue #3b82f6   --accent-green #10b981
--accent-amber #f59e0b    --accent-red #ef4444    --accent-pink #ec4899
--text-primary #f8fafc    --text-secondary #94a3b8   --text-muted #64748b
```

**Hardcoded hex in JSX, by frequency** (top 40 of 80; these are what the migration table in
§3.4 must cover):

| Count | Hex | What it is being used as |
|---:|---|---|
| 85 | `#94a3b8` | secondary/label text — duplicates `--text-secondary` |
| 74 | `#020617` | deepest panel background — **not a token; darker than `--bg-dark`** |
| 48 | `#38bdf8` | "active/highlighted" cyan — **not a token at all** |
| 46 | `#f8fafc` | primary text — duplicates `--text-primary` |
| 46 | `#1e293b` | raised surface — duplicates `--bg-card-hover` |
| 45 | `#10b981` | success green — duplicates `--accent-green` |
| 45 | `#0f172a` | code/inset background — **not a token** |
| 42 | `#3b82f6` | interactive blue — duplicates `--accent-blue` |
| 30 | `#f59e0b` | warning — duplicates `--accent-amber` |
| 30 | `#a78bfa` | light violet — **not a token** (used as "purple text") |
| 28 | `#64748b` | muted text — duplicates `--text-muted` |
| 28 | `#60a5fa` | light blue text — **not a token** |
| 27 | `#fbbf24` | light amber text — **not a token** |
| 27 | `#34d399` | light green text — **not a token** |
| 26 | `#4ade80` | *another* light green — **near-duplicate of `#34d399`** |
| 21 | `#cbd5e1` | body text on dark — **not a token** |
| 21 | `#8b5cf6` | duplicates `--accent-purple` |
| 14 | `#0b1329` | *another* deep panel — near-duplicate of `#020617`/`#0f172a` |
| 13 | `#ef4444` | duplicates `--accent-red` |
| 11 | `#475569` | line-number / disabled grey |
| 11 | `#334155` | border grey — near-duplicate of `--border-color` |
| 9 | `#c084fc` | violet text |
| 9 | `#a7f3d0` | mint text |
| 8 | `#fff` / 2 `#ffffff` | pure white — two spellings of one color |
| 8 | `#f43f5e` | rose — near-duplicate of `#ef4444` |
| 8 | `#c7d2fe` | indigo-100 text |
| 8 | `#93c5fd` | blue-200 text |
| 8 | `#312e81` | indigo-900 fill |
| 7 | `#a855f7` | *another* purple |
| 7 | `#090d16` | *another* near-black |
| 6 | `#818cf8` | indigo-400 |
| 5 each | `#ec4899` `#e2e8f0` `#6366f1` `#151c2c` `#111827` `#065f46` `#059669` | mixed |
| 4 each | `#f87171` `#7f1d1d` `#7c3aed` `#4338ca` `#064e3b` | mixed |
| 2–3 each | 22 further values | long tail |
| 1 each | 20 further values | long tail |

**Three malformed hex literals exist and must be fixed, not mapped:** `#125`, `#123`,
`#501`, `#10492`, `#1042`. Grep each before touching it — several are almost certainly
substrings of a larger string (e.g. an ID or a numeric label), not colors. Verify in context.

**Hardcoded hex in `App.css`** (38 distinct). The worst offender is `#0f172a`, used **25
times** for panel/code backgrounds while never being a token.

**`rgba()` usage in `App.css`:** 30+ distinct `rgba()` values, all hand-mixed
(`rgba(139, 92, 246, 0.1)`, `rgba(139, 92, 246, 0.22)`, `rgba(139, 92, 246, 0.3)`,
`rgba(139, 92, 246, 0.4)` — four different alphas of the same purple). These become
`color-mix()` or explicit tint tokens in §2.

### 0.3 Top offending files by inline-style density

| Rank | File | `style={{` count |
|---:|---|---:|
| 1 | `components/visualizers/NetworkingVisualizer.jsx` | 90 |
| 2 | `components/visualizers/networking/NatTranslationVisualizer.jsx` | 55 |
| 3 | `components/visualizers/AiMlVisualizer.jsx` | 52 |
| 4 | `components/visualizers/networking/ArpResolutionVisualizer.jsx` | 49 |
| 5 | `components/visualizers/java/JavaGenericsVisualizer.jsx` | 49 |
| 6 | `components/visualizers/java/JavaExecutionPipelineVisualizer.jsx` | 45 |
| 7 | `components/visualizers/networking/TrafficShapingVisualizer.jsx` | 44 |
| 8 | `components/visualizers/networking/DhcpDoraVisualizer.jsx` | 43 |
| 9 | `components/visualizers/java/JavaStaticRecordsVisualizer.jsx` | 43 |
| 10 | `components/visualizers/java/JavaMemoryModelVisualizer.jsx` | 40 |
| 11 | `components/visualizers/java/JavaOopVisualizer.jsx` | 39 |
| 12 | `components/visualizers/java/JavaFunctionalLambdasVisualizer.jsx` | 38 |
| 13 | `components/visualizers/java/JavaCollectionsVisualizer.jsx` | 37 |
| 14 | `components/visualizers/java/JvmMemoryVisualizer.jsx` | 36 |
| 15 | `components/shared/ConceptModuleShell.jsx` | 31 |
| 16 | `components/visualizers/java/JavaStreamsOptionalVisualizer.jsx` | 29 |
| 17 | `components/visualizers/JavaSpringVisualizer.jsx` | 27 |
| 18 | `components/visualizers/dbms/TransactionsAcidVisualizer.jsx` | 26 |
| 19 | `components/visualizers/os/VirtualMemoryVisualizer.jsx` | 24 |
| 20 | `components/visualizers/networking/TcpSegmentVisualizer.jsx` | 23 |

**By directory:** `visualizers/java` 434 · `visualizers/networking` 272 · `visualizers/dbms`
60 · `visualizers/os` 28 · `visualizers/aiml` 0 · category hubs (files directly in
`visualizers/`) 182 · `components/shared` 72 · `components/markdown` 0 · `pages/` 0.

Two useful consequences: **`pages/` and `components/markdown/` are already clean** (they use
classes only), and **28 files carry >15 inline blocks each** — those 28 files are ~85% of the
total problem.

**23 files contain *computed* inline styles** (a ternary or template literal inside the style
object). Those are the ones that legitimately stay inline — see §3.3.

### 0.4 Where `App.css` has gone redundant, conflicting, or dead

**Dead rules — 36 classes defined but never referenced from any `.jsx`:**

```
btree-container  btree-level  btree-node  card-grid  category-cta  category-description
category-overview-header  category-page  category-selector  category-selectors
category-stat-list  handshake-diagram  home-header  host-column  key-badge  keys-row
leaf-key  leaf-node  leaf-pointer  level-section  node-title  ordered-topic-list
ordered-topic-row  packet-arrow  packets-channel  roadmap-index-selector
roadmap-index-selectors  root-node  topic-order  topic-row-summary  topic-row-title
topic-summary  topic-title  transaction-boxes  tx-box  tx-state
```

These are the residue of at least two prior redesigns (there are three parallel
naming generations: `.category-selector*`, `.roadmap-index-selector*`, and the live
`.roadmap-selector*`; and two generations of topic row: `.ordered-topic-row` dead,
`.topic-row` live). Phase 1 deletes all 36 — but see the caution in §5.1.

**Redundant/conflicting live rules:**

- **`.topic-content` is declared in two separate regions**: a "Reading refinements" block at
  `App.css:478-485` and the original "TopicViewer Content" block at `App.css:1247-1420`.
  Both have identical specificity, so **the later block wins**. Concretely:
  - `.topic-content code` at `:485` (slate background, `#e9d5ff` text) is **completely
    overridden** by `:1292` (pink background `rgba(236,72,153,0.1)`, `--accent-pink` text).
    The refinement is dead code.
  - `.topic-content a` / `a:hover` at `:483-484` (`#a5b4fc`) is **completely overridden** by
    `:1343`/`:1350`.
  - `.topic-content :is(p, li)` at `:482` sets `#cbd5e1`, but `.topic-content p` at `:1276`
    sets `--text-secondary` (`#94a3b8`). Equal specificity (0,1,1 vs 0,1,1) → later wins →
    **body prose renders at `#94a3b8`, not the intended `#cbd5e1`**. That is a real
    readability regression hiding in plain sight.
  - Only `max-width: 78ch`, the `color` on the container, and the `> :is(h1,h2,h3)` /
    `> h2` rules from the refinement block actually survive.
- `.viz-card, .viz-controls-card, .cpu-status-card` are grouped into one rule and then
  individually overridden later — three near-identical card treatments where one primitive
  would do.
- `.badge.beginner/.intermediate/.expert` (`:164-166`) and `.badge-danger/.badge-success`
  (`:1048-1049`) are two unrelated badge systems sharing a prefix.
- Only **5 media queries** in 1578 lines: `max-width: 780px` (×2), `520px`, `900px`, and
  `prefers-reduced-motion`. Breakpoints are inconsistent (780 vs 900) and there is **no
  responsive handling whatsoever for the visualizer/Gantt region**.

### 0.5 UX weaknesses, by surface

**Navbar** (`components/Navbar.jsx`, 13 lines) — the weakest surface in the app.
- Two links total: "Home" and "OS", where "OS" hardcodes `/topic/process-management`. There
  is no way to reach networking, dbms, java-spring, or aiml from the nav.
- No indication of the current location — no active state, no breadcrumb.
- No search, no theme control, no progress indicator.
- The logo is a gradient-clipped text (`App.css:63-70`) using `-webkit-background-clip` with
  no standard `background-clip` fallback.

**HomePage** (`pages/HomePage.jsx`, ~200 lines).
- The category filter is a flat row of 6 buttons (`Full roadmap` + 5 categories). It carries
  `aria-pressed` correctly, but the buttons show **no topic counts** until you have already
  filtered, and the counts that exist (`{category.topics.length} topics`) sit inside the
  section body, not on the control.
- Topic rows are a 3-column grid: number, `<div>` with badge + `h3` + summary, and a CTA
  link. The `<div>` is unclassed — every child is styled by descendant selector, which is
  why `.topic-row-title`/`.topic-row-summary` went dead.
- **Level badges carry meaning by color alone** (`.badge.beginner` green /
  `.intermediate` amber / `.expert` red). Under deuteranopia the green and red badges are
  near-identical. Text labels are present, which saves it from being a hard failure, but the
  treatment is a plain pill with no shape or weight differentiation.
- A 56-item list with no search, no filter by level, and no "where did I leave off".
- The whole offline fallback topic list (~60 lines of literal data) lives inline in the
  component. That is a content concern, not a design one, but it makes the file hard to edit
  safely — **do not reformat it during this work.**

**TopicPage** (`pages/TopicPage.jsx`) / **TopicViewer** (`components/TopicViewer.jsx`).
- Two tabs, `📖 Study` and `⚡ Simulation`, rendered as `.main-tab-btn` — plain buttons, not
  a `role="tablist"`. Keyboard users get no arrow-key navigation and no
  `aria-selected`/`aria-controls` relationship.
- **The reading experience is the highest-value thing in the product and the least designed.**
  `.topic-content` is one 2.5rem-padded card holding 400–600 lines of Markdown. Its measure
  is `78ch` at `1rem` — roughly 95–100 characters of actual rendered text, well past the
  60–75 range where long-form reading comfort peaks.
- Heading hierarchy inverts: `h1` is `2.25rem` in `--text-primary`, `h2` is `1.5rem` in
  `--accent-purple` (contrast **4.02:1** on `--bg-card` — below AA for large text is fine,
  but it reads as a link, not a heading), `h3` is `1.2rem` in `#a78bfa`. Two different
  purples for two heading levels, and the tier headings (`## 🟢 Beginner Level`) rely on an
  emoji for their entire visual identity.
- Body prose resolves to `#94a3b8` (see §0.4) — **6.64:1**, passing AA but noticeably grey
  for a 500-line technical read.
- The TOC rail (`.study-navigation`) and the reading-progress bar exist and are correctly
  ARIA-labelled — this is the best-built part of the app — but there is no sticky behaviour
  defined and no responsive collapse for the rail.
- Inline `code` is pink-on-pink (`--accent-pink` on `rgba(236,72,153,0.1)`), which fights
  every other accent on the page and collides visually with KaTeX output.
- **Both the outer fetch state and the `Suspense` fallback render the identical string
  `"Loading..."`** (`TopicViewer.jsx:133` and `:214`). Distinguishing these is a small change
  with real diagnostic value.
- `.topic-content table` is set to `display: block; overflow-x: auto` — correct for scroll,
  but it drops the table's semantic box and kills column sizing. Needs a wrapper instead.
- Visualizer embeds do not sit inside prose flow at all: they are a separate tab. §4.4
  proposes changing that.

**Shared simulation shell** — all six primitives are styled almost entirely inline.
- `ConceptModuleShell.jsx` (31 inline blocks): header `h2` at hardcoded `#f8fafc`, subtitle
  `#94a3b8`, mental-model banner as a hardcoded blue→purple gradient with a `4px solid
  #3b82f6` left border. Three tabs, again as plain buttons, again no tablist semantics. Tab
  labels are long enough to wrap on mobile (`⚡ Interactive Visual Simulation`).
- `StepThroughController.jsx`: step chips built with an inline ternary across
  `borderColor`/`background`/`color`. The active chip is `#60a5fa` on
  `rgba(59,130,246,0.2)`; the inactive is `#94a3b8` on transparent. The chip strip is
  `overflow-x: auto` with no scroll affordance and no keyboard story.
- `StateInspector.jsx`: `#0f172a` panel, `#93c5fd` heading, auto-fill grid at
  `minmax(180px, 1fr)`. Highlighted cells shift to `#60a5fa` on `rgba(59,130,246,0.25)` —
  again color-only signalling of "this value just changed", with a `transition: all 0.2s`.
- `QuizCard.jsx`: `#0f172a` card, difficulty pill in blue regardless of actual difficulty
  (the `difficulty` prop defaults to the string `'Core Fundamental'` and is never mapped to
  a color).
- `CodePanel.jsx`: hardcodes its own font stack — `'Fira Code, Consolas, Monaco, monospace'`
  — **bypassing `--font-mono` entirely**. Active line is `#93c5fd` on
  `rgba(59,130,246,0.2)` with a `3px solid #3b82f6` left border; line numbers `#475569`
  (**4.24:1 on `#020617`** — fails AA for normal text). Also carries `select: 'none'`, which
  is not a valid CSS property (the real one is `user-select`) — dead declaration.
- `SimulationControlBar.jsx`: the only primitive that partly uses tokens
  (`var(--text-secondary)`). Layout is inline flex with hand-tuned gaps. Buttons are
  emoji-prefixed text with no `aria-label`, so a screen reader hears "⏸ Pause" as
  "Pause" — acceptable — but `Step ⏭` reads as "Step" with a stray glyph.

---

## 1. Design principles for this revamp

Five rules. When a decision in §2–§4 seems arbitrary, it follows from one of these.

1. **The reading experience is the product.** 56 topics × 400–600 lines of Markdown is the
   asset. Simulators support it. Every trade-off resolves in favour of long-form legibility.
2. **One token, one meaning, one place.** After Phase 6 there should be zero raw hex in
   `.jsx` and zero raw hex in `App.css` outside the `:root` blocks.
3. **Color is never load-bearing alone.** Every categorical or state distinction is carried
   by at least two of: hue, text label, glyph, position, weight.
4. **Motion explains, it does not decorate.** A transition is justified when it shows a state
   change the learner needs to follow. Everything else is instant.
5. **Ship in reviewable slices.** Each phase in §5 leaves `main` in a working, testable state.

---

## 2. The design system

### 2.1 Copy-pasteable token block

This replaces `App.css:1-18` entirely. Put it at the very top of `App.css`.

```css
/* ============================================================================
   DESIGN TOKENS
   Dark is the default (bare :root). [data-theme="light"] overrides.
   Rules:
     - Never write a raw hex outside this block.
     - Never write a raw rgba() outside this block; use the *-tint tokens
       or color-mix(in srgb, var(--token) N%, transparent).
     - Contrast ratios in comments are measured against the stated background.
   ========================================================================= */

:root {
  color-scheme: dark;

  /* ---- Background scale (dark) ---------------------------------------- */
  --bg-page:     #0b0f1a;  /* app canvas */
  --bg-surface:  #131a29;  /* cards, panels, the reading surface */
  --bg-raised:   #1c2438;  /* hover, nested panel, active row */
  --bg-code:     #070b13;  /* code fences, terminal-like panels */
  --bg-overlay:  #232c44;  /* popovers, tooltips, dropdowns */
  --bg-inset:    #080c15;  /* wells, scroll troughs, disabled fields */

  /* ---- Text scale (dark) ---------------------------------------------- */
  --text-primary:   #f2f5fa;  /* 15.92:1 on surface — AAA */
  --text-secondary: #b3c0d4;  /*  9.45:1 on surface — AAA */
  --text-muted:     #8593a8;  /*  5.58:1 on surface — AA  */
  --text-inverse:   #0b0f1a;  /* text on a filled accent */
  --text-prose:     #dce3ee;  /* long-form body copy, 12.9:1 on surface */

  /* ---- Borders (dark) -------------------------------------------------- */
  --border-subtle:  #1e2739;
  --border-default: #2a344b;
  --border-strong:  #3b4763;
  --border-focus:   #7dd3fc;

  /* ---- Category accents (dark) ----------------------------------------
     base / hover / tint (backgrounds) / border. See §2.4 for the CVD note:
     these are NEVER the sole carrier of meaning.                          */
  --cat-os-base:          #a78bfa;  /* 6.39:1 on surface */
  --cat-os-hover:         #c4b5fd;
  --cat-os-tint:          #1e1b36;
  --cat-os-border:        #6d4fd6;

  --cat-networking-base:  #38bdf8;  /* 8.12:1 on surface */
  --cat-networking-hover: #7dd3fc;
  --cat-networking-tint:  #0d2436;
  --cat-networking-border:#0e7fb8;

  --cat-dbms-base:        #34d399;  /* 9.05:1 on surface */
  --cat-dbms-hover:       #6ee7b7;
  --cat-dbms-tint:        #0d2b24;
  --cat-dbms-border:      #16906a;

  --cat-java-base:        #fb923c;  /* 7.68:1 on surface */
  --cat-java-hover:       #fdba74;
  --cat-java-tint:        #33200e;
  --cat-java-border:      #c2660f;

  --cat-aiml-base:        #f472b6;  /* 6.57:1 on surface */
  --cat-aiml-hover:       #f9a8d4;
  --cat-aiml-tint:        #331227;
  --cat-aiml-border:      #c1417f;

  /* The accent of the category currently in view. Set on a wrapper element
     via [data-category="os"] etc. Everything downstream reads these four. */
  --cat-base:   var(--cat-os-base);
  --cat-hover:  var(--cat-os-hover);
  --cat-tint:   var(--cat-os-tint);
  --cat-border: var(--cat-os-border);

  /* ---- Semantic state (dark) — deliberately NOT reusing category hues -- */
  --state-success:        #4ade80;  /*  9.98:1 on surface */
  --state-success-tint:   #0e2a1a;
  --state-success-border: #1f9d4f;
  --state-warning:        #fbbf24;  /* 10.42:1 on surface */
  --state-warning-tint:   #2e2109;
  --state-warning-border: #c08a08;
  --state-danger:         #f87171;  /*  6.29:1 on surface */
  --state-danger-tint:    #331416;
  --state-danger-border:  #c8383c;
  --state-info:           #7dd3fc;  /* 10.43:1 on surface */
  --state-info-tint:      #0c2534;
  --state-info-border:    #1f8bbd;
  --state-idle:           #8593a8;
  --state-idle-tint:      #171d2b;
  --state-idle-border:    #3b4763;

  /* ---- Learning tiers -------------------------------------------------- */
  --tier-beginner:        #4ade80;
  --tier-beginner-tint:   #0e2a1a;
  --tier-beginner-border: #1f9d4f;
  --tier-intermediate:    #38bdf8;
  --tier-intermediate-tint:   #0d2436;
  --tier-intermediate-border: #0e7fb8;
  --tier-expert:          #f472b6;
  --tier-expert-tint:     #331227;
  --tier-expert-border:   #c1417f;

  /* ---- Elevation (dark: borders do the work, shadows are subtle) ------- */
  --elev-0: none;
  --elev-1: 0 1px 2px rgba(0,0,0,.40);
  --elev-2: 0 4px 12px rgba(0,0,0,.45);
  --elev-3: 0 12px 32px rgba(0,0,0,.55);
  --elev-focus: 0 0 0 3px rgba(125,211,252,.35);

  /* ---- Syntax highlighting (drives the hljs override, §2.10) ----------- */
  --syn-keyword:  #c4b5fd;
  --syn-string:   #86efac;
  --syn-number:   #fdba74;
  --syn-comment:  #7183a1;
  --syn-function: #7dd3fc;
  --syn-type:     #f9a8d4;
  --syn-builtin:  #fbbf24;
  --syn-punct:    #b3c0d4;
  --syn-deleted:  #f87171;
  --syn-added:    #4ade80;
}

[data-theme="light"] {
  color-scheme: light;

  --bg-page:    #f6f7fb;
  --bg-surface: #ffffff;
  --bg-raised:  #eef1f7;
  --bg-code:    #f4f6fb;
  --bg-overlay: #ffffff;
  --bg-inset:   #e8ecf4;

  --text-primary:   #111827;  /* 17.74:1 on surface — AAA */
  --text-secondary: #4a5567;  /*  7.54:1 on surface — AAA */
  --text-muted:     #6b7688;  /*  4.59:1 on surface — AA  */
  --text-inverse:   #ffffff;
  --text-prose:     #1f2937;  /* 14.7:1 on surface */

  --border-subtle:  #e5e9f0;
  --border-default: #d4dae5;
  --border-strong:  #b3bccb;
  --border-focus:   #0369a1;

  --cat-os-base:          #6d28d9;  /* 7.10:1 on surface */
  --cat-os-hover:         #5b21b6;
  --cat-os-tint:          #f3efff;
  --cat-os-border:        #c4b5fd;

  --cat-networking-base:  #0369a1;  /* 5.93:1 */
  --cat-networking-hover: #075985;
  --cat-networking-tint:  #eaf5fc;
  --cat-networking-border:#7dd3fc;

  --cat-dbms-base:        #047857;  /* 5.48:1 */
  --cat-dbms-hover:       #065f46;
  --cat-dbms-tint:        #e8f7f1;
  --cat-dbms-border:      #6ee7b7;

  --cat-java-base:        #b45309;  /* 5.02:1 */
  --cat-java-hover:       #92400e;
  --cat-java-tint:        #fdf2e4;
  --cat-java-border:      #fdba74;

  --cat-aiml-base:        #be185d;  /* 6.04:1 */
  --cat-aiml-hover:       #9d174d;
  --cat-aiml-tint:        #fdeef5;
  --cat-aiml-border:      #f9a8d4;

  --state-success:        #15803d;  /* 5.02:1 */
  --state-success-tint:   #e9f7ee;
  --state-success-border: #86efac;
  --state-warning:        #a16207;  /* 4.92:1 */
  --state-warning-tint:   #fdf5e3;
  --state-warning-border: #fcd34d;
  --state-danger:         #b91c1c;  /* 6.47:1 */
  --state-danger-tint:    #fdecec;
  --state-danger-border:  #fca5a5;
  --state-info:           #0369a1;
  --state-info-tint:      #eaf5fc;
  --state-info-border:    #7dd3fc;
  --state-idle:           #6b7688;
  --state-idle-tint:      #f1f3f8;
  --state-idle-border:    #d4dae5;

  --tier-beginner:        #15803d;
  --tier-beginner-tint:   #e9f7ee;
  --tier-beginner-border: #86efac;
  --tier-intermediate:    #0369a1;
  --tier-intermediate-tint:   #eaf5fc;
  --tier-intermediate-border: #7dd3fc;
  --tier-expert:          #be185d;
  --tier-expert-tint:     #fdeef5;
  --tier-expert-border:   #f9a8d4;

  --elev-1: 0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.10);
  --elev-2: 0 4px 12px rgba(16,24,40,.08), 0 2px 4px rgba(16,24,40,.06);
  --elev-3: 0 12px 32px rgba(16,24,40,.12), 0 4px 8px rgba(16,24,40,.06);
  --elev-focus: 0 0 0 3px rgba(3,105,161,.28);

  --syn-keyword:  #7c3aed;
  --syn-string:   #047857;
  --syn-number:   #b45309;
  --syn-comment:  #6b7688;
  --syn-function: #0369a1;
  --syn-type:     #be185d;
  --syn-builtin:  #a16207;
  --syn-punct:    #4a5567;
  --syn-deleted:  #b91c1c;
  --syn-added:    #15803d;
}

/* ---- Theme-independent tokens ------------------------------------------ */
:root {
  /* Typography — see §2.5 for the loading strategy */
  --font-heading: 'Inter Tight', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-body:    'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono:    'JetBrains Mono', 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace;

  /* UI type scale (chrome, controls, visualizer labels) */
  --ui-2xs:  0.6875rem;  --ui-2xs-lh: 1.45;   /* 11px */
  --ui-xs:   0.75rem;    --ui-xs-lh:  1.5;    /* 12px */
  --ui-sm:   0.8125rem;  --ui-sm-lh:  1.5;    /* 13px */
  --ui-base: 0.875rem;   --ui-base-lh:1.55;   /* 14px */
  --ui-md:   0.9375rem;  --ui-md-lh:  1.55;   /* 15px */
  --ui-lg:   1.0625rem;  --ui-lg-lh:  1.45;   /* 17px */

  /* Prose type scale (topic content) */
  --prose-sm:   0.9375rem; --prose-sm-lh:   1.6;   /* 15px — captions, table cells */
  --prose-base: 1.0625rem; --prose-base-lh: 1.72;  /* 17px — body */
  --prose-lg:   1.1875rem; --prose-lg-lh:   1.65;  /* 19px — lede */
  --prose-h4:   1.0625rem; --prose-h4-lh:   1.4;
  --prose-h3:   1.3125rem; --prose-h3-lh:   1.35;  /* 21px */
  --prose-h2:   1.625rem;  --prose-h2-lh:   1.28;  /* 26px */
  --prose-h1:   2.125rem;  --prose-h1-lh:   1.15;  /* 34px */
  --prose-code: 0.9375rem;                          /* mono runs optically large */

  --tracking-tight:  -0.02em;   /* headings */
  --tracking-normal:  0;
  --tracking-wide:    0.04em;   /* all-caps eyebrows, badges */

  --measure-prose: 68ch;   /* ~640px at 17px — the reading column */
  --measure-wide:  96ch;   /* tables, diagrams, code may exceed the measure */

  /* Spacing — 4px base */
  --space-0:  0;
  --space-1:  0.25rem;   --space-2: 0.5rem;    --space-3: 0.75rem;
  --space-4:  1rem;      --space-5: 1.5rem;    --space-6: 2rem;
  --space-7:  2.5rem;    --space-8: 3rem;      --space-9: 4rem;
  --space-10: 6rem;

  /* Radii */
  --radius-xs:   4px;
  --radius-sm:   6px;
  --radius-md:  10px;
  --radius-lg:  14px;
  --radius-xl:  20px;
  --radius-full: 9999px;

  /* Border widths */
  --stroke-hair: 1px;
  --stroke-thick: 2px;
  --stroke-marker: 3px;   /* the left rule on callouts / active code lines */

  /* Layout */
  --nav-height: 3.5rem;
  --rail-width: 16rem;      /* the TOC rail on TopicPage */
  --shell-max:  80rem;      /* app content max width */

  /* Motion */
  --dur-instant: 80ms;
  --dur-fast:    140ms;
  --dur-base:    200ms;
  --dur-slow:    320ms;
  --dur-slower:  520ms;
  --dur-sim-step: 400ms;    /* one simulator state transition */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-out:      cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in:       cubic-bezier(0.7, 0, 0.84, 0);
  --ease-spring:   cubic-bezier(0.34, 1.4, 0.64, 1);

  /* Z-index */
  --z-base: 0; --z-raised: 10; --z-sticky: 100; --z-nav: 200;
  --z-overlay: 300; --z-toast: 400;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --dur-instant: 0ms; --dur-fast: 0ms; --dur-base: 0ms;
    --dur-slow: 0ms; --dur-slower: 0ms; --dur-sim-step: 0ms;
  }
}
```

### 2.2 Background scale — rationale

Five layers, each one step lighter than the last except `--bg-code`, which goes *darker*
than the page. That inversion is deliberate: on a dark theme, a code block that is lighter
than its surroundings reads as a raised UI panel; one that is darker reads as an inset well,
which is what a code fence is. Light mode reverses that instinct — `--bg-code` there is
*slightly* off-white against a pure-white surface, plus a `--border-default` hairline.

`--bg-inset` exists for scroll troughs and disabled fields and should be used sparingly.

Today's `#020617` (74 uses) is darker than `--bg-page` and was being used as "the deepest
thing on screen" — that role is now `--bg-code`. Today's `#0f172a` (45 uses in JSX, 25 in
CSS) served both "code panel" and "nested card"; those split into `--bg-code` and
`--bg-surface` respectively, and §3.4 tells you how to decide per site.

### 2.3 Text scale — measured contrast

All ratios computed with the WCAG 2.x relative-luminance formula.

**Dark theme**

| Token | Hex | on `--bg-page` | on `--bg-surface` | on `--bg-raised` | on `--bg-code` | Verdict |
|---|---|---:|---:|---:|---:|---|
| `--text-primary` | `#f2f5fa` | 17.51 | 15.92 | 14.14 | 18.02 | AAA everywhere |
| `--text-prose` | `#dce3ee` | 14.2 | 12.9 | 11.5 | 14.6 | **AAA — this is the body-copy token** |
| `--text-secondary` | `#b3c0d4` | 10.39 | 9.45 | 8.39 | 10.70 | AAA everywhere |
| `--text-muted` | `#8593a8` | 6.14 | 5.58 | 4.96 | 6.32 | AA everywhere; **AA-large only on `--bg-raised`** |

**Light theme**

| Token | Hex | on `--bg-page` | on `--bg-surface` | on `--bg-raised` | on `--bg-code` | Verdict |
|---|---|---:|---:|---:|---:|---|
| `--text-primary` | `#111827` | 16.57 | 17.74 | 15.68 | 16.41 | AAA everywhere |
| `--text-prose` | `#1f2937` | 13.7 | 14.7 | 13.0 | 13.6 | AAA everywhere |
| `--text-secondary` | `#4a5567` | 7.04 | 7.54 | 6.66 | 6.97 | AAA everywhere |
| `--text-muted` | `#6b7688` | 4.29 | 4.59 | 4.06 | 4.25 | **AA on surface/page/code; fails on `--bg-raised` (4.06)** |

**Two hard rules that follow from those numbers:**

- `--text-muted` is for **non-essential** text at ≥16px or ≥14px bold only, and **must not**
  be used on `--bg-raised` in light mode. If you need muted text on a raised surface, use
  `--text-secondary`.
- Long-form prose uses `--text-prose`, never `--text-secondary`. This directly fixes the
  §0.4 bug where body copy silently resolved to `#94a3b8`.

**What the current build gets wrong, measured:** `--text-muted #64748b` on `--bg-card
#151c2c` is **3.58:1 — fails AA**. `#475569` line numbers on `#020617` in `CodePanel.jsx`
is **4.24:1 — fails AA for normal text**. `--accent-purple #8b5cf6` as the `h2` color on
`--bg-card` is **4.02:1** — passes AA-large at 1.5rem/24px only because it is bold; it is
below the 4.5 threshold for anything smaller.

### 2.4 Category accents and color-vision deficiency

| Category | Dark base | Dark ratio (surface) | Light base | Light ratio (surface) | Relative luminance (dark) |
|---|---|---:|---|---:|---:|
| `os` | `#a78bfa` | 6.39 | `#6d28d9` | 7.10 | 0.336 |
| `networking` | `#38bdf8` | 8.12 | `#0369a1` | 5.93 | 0.440 |
| `dbms` | `#34d399` | 9.05 | `#047857` | 5.48 | 0.496 |
| `java-spring` | `#fb923c` | 7.68 | `#b45309` | 5.02 | 0.414 |
| `aiml` | `#f472b6` | 6.57 | `#be185d` | 6.04 | 0.347 |

All ten values clear AA (4.5:1) for normal text against their theme's `--bg-surface`.

**Be honest about the CVD limit.** Five hues cannot be made mutually distinguishable under
deuteranopia and protanopia. Specifically, `dbms` (emerald) and `java-spring` (orange)
converge toward similar yellow-browns, and their relative luminances differ by only ~17%, so
grayscale does not fully rescue them either. That is why principle 3 exists. Therefore:

**Every category-coded element MUST carry a redundant, non-color signal.** Use this mapping —
it is fixed, and Codex must not substitute alternatives:

| Category | Glyph | Short label | Border style on the accent edge |
|---|---|---|---|
| `os` | `◆` | `OS` | solid |
| `networking` | `⬡` | `NET` | solid |
| `dbms` | `▤` | `DB` | double |
| `java-spring` | `◐` | `JAVA` | solid |
| `aiml` | `✳` | `AI/ML` | dashed |

Glyph + label go together in the badge; the border style differentiates the accent rail on
cards. A learner who cannot separate emerald from orange still reads `▤ DB` versus
`◐ JAVA`.

**How the accent propagates.** Set `data-category` on the outermost element that knows the
category (`TopicPage`'s root, `HomePage`'s per-category `<section>`), and add these five
rules once in `App.css`:

```css
[data-category="os"]          { --cat-base: var(--cat-os-base);          --cat-hover: var(--cat-os-hover);          --cat-tint: var(--cat-os-tint);          --cat-border: var(--cat-os-border); }
[data-category="networking"]  { --cat-base: var(--cat-networking-base);  --cat-hover: var(--cat-networking-hover);  --cat-tint: var(--cat-networking-tint);  --cat-border: var(--cat-networking-border); }
[data-category="dbms"]        { --cat-base: var(--cat-dbms-base);        --cat-hover: var(--cat-dbms-hover);        --cat-tint: var(--cat-dbms-tint);        --cat-border: var(--cat-dbms-border); }
[data-category="java-spring"] { --cat-base: var(--cat-java-base);        --cat-hover: var(--cat-java-hover);        --cat-tint: var(--cat-java-tint);        --cat-border: var(--cat-java-border); }
[data-category="aiml"]        { --cat-base: var(--cat-aiml-base);        --cat-hover: var(--cat-aiml-hover);        --cat-tint: var(--cat-aiml-tint);        --cat-border: var(--cat-aiml-border); }
```

Everything downstream — the topic card rail, the active TOC item, the tab underline, the
`h2` rule — reads `var(--cat-base)` and needs no knowledge of which category it is in.

**Semantic states are a separate namespace on purpose.** `--state-success` is `#4ade80`,
which is *not* `--cat-dbms-base` `#34d399`; `--state-warning` `#fbbf24` is not
`--cat-java-base` `#fb923c`. They are close enough to feel like one family and far enough
apart that a "running" pill inside the DBMS section does not read as chrome. Never substitute
one namespace for the other.

### 2.5 Typography

**The three faces**

| Role | Family | Weights | Why |
|---|---|---|---|
| Heading | **Inter Tight** | 600, 700 | Tight default tracking and a large x-height give headings presence at 21–34px without needing extra size. Variable font, one file. |
| Body | **IBM Plex Sans** | 400, 500, 600 | Purpose-built for long technical documentation: open apertures, a taller x-height than Inter at the same size, and disambiguated `I`/`l`/`1` — which matters when prose is full of identifiers. Metric sibling of Plex Mono. |
| Mono | **JetBrains Mono** | 400, 500, 700 | Already declared in `--font-mono` and never delivered. Tall x-height, 1.2 line-height ratio, ligatures **off** (do not enable `calt` — ligatured `!=` confuses learners reading Java). |

*Budget fallback, if the owner wants two families instead of three:* drop Inter Tight and set
`--font-heading: var(--font-body)` with `font-weight: 600; letter-spacing: -0.02em`. Plex
Sans holds up as a heading face. Saves ~32 KB. Ask before doing this.

**Loading strategy — self-hosted, no FOUT.** Google Fonts CDN is not acceptable here: it
adds two extra connections before first paint and this app renders code and math on every
topic page. Do this instead:

1. `npm i -D subfont` is *not* needed. Download the latin-subset `woff2` files manually into
   `frontend/public/fonts/`:
   - `inter-tight-var-latin.woff2` (variable, wght 400–700) — ~32 KB
   - `ibm-plex-sans-var-latin.woff2` (variable, wght 400–600) — ~40 KB
   - `jetbrains-mono-var-latin.woff2` (variable, wght 400–700) — ~45 KB
   Total ≈ 117 KB, cached indefinitely, zero third-party requests.
2. In `frontend/index.html` `<head>`, preload the two faces needed for first paint:
   ```html
   <link rel="preload" href="/fonts/ibm-plex-sans-var-latin.woff2" as="font" type="font/woff2" crossorigin>
   <link rel="preload" href="/fonts/inter-tight-var-latin.woff2"  as="font" type="font/woff2" crossorigin>
   ```
   Do **not** preload the mono face — it is only needed once `MarkdownRenderer` (itself
   `React.lazy`) has mounted, and preloading it competes with the critical two.
3. Declare the faces in `App.css` with `font-display: swap` **plus metric overrides**, so the
   swap is imperceptible rather than a visible reflow. This is the part that actually solves
   FOUT; `font-display: optional` would avoid the swap but risks never applying the font on a
   slow connection, which is worse for a reading product.
   ```css
   @font-face {
     font-family: 'IBM Plex Sans';
     src: url('/fonts/ibm-plex-sans-var-latin.woff2') format('woff2-variations');
     font-weight: 400 600; font-style: normal; font-display: swap;
     unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215;
   }
   /* Metric-matched fallback: the swap from this to Plex Sans shifts nothing. */
   @font-face {
     font-family: 'Plex Fallback';
     src: local('Segoe UI'), local('Helvetica Neue'), local('Arial');
     size-adjust: 103%; ascent-override: 92%; descent-override: 24%; line-gap-override: 0%;
   }
   ```
   Repeat the pattern for Inter Tight (`--font-heading`) and JetBrains Mono. For the mono
   fallback, match against `local('Consolas')` with `size-adjust: 96%`.
   **Verify** the override numbers with the Chrome DevTools "Layout Shift Regions" overlay on
   a topic page and tune until CLS from font swap is 0. Do not ship guessed numbers.
4. Remove `'Fira Code, Consolas, Monaco, monospace'` from `CodePanel.jsx:12` — it must read
   `var(--font-mono)`.

**Type scale.** See `--ui-*` and `--prose-*` in §2.1. Two scales, deliberately:

- **UI scale (11–17px)** for chrome, controls, badges, and the dense labels inside
  visualizers. The existing inline styles already cluster at 0.7/0.72/0.75/0.78/0.8/0.82/
  0.85/0.88/0.9/0.92rem — **ten sizes within a 4px range**, which is noise, not hierarchy.
  Those collapse to six tokens. §3.4 gives the exact mapping.
- **Prose scale (15–34px)** for topic content only. Body at **17px / 1.72** is the single
  highest-leverage change in this document: the current 16px/1.6 at a 78ch measure is the
  main reason the reading experience feels like documentation rather than a book.

**Measure.** `--measure-prose: 68ch` (≈640px at 17px). Tables, code fences, and Mermaid
diagrams break out to `--measure-wide: 96ch`. §4.5 gives the break-out mechanism.

### 2.6 Spacing, radii, borders, elevation

- **Spacing**: 4px base, ten steps (`--space-1` 4px → `--space-10` 96px). The existing inline
  values (`0.15rem`, `0.3rem`, `0.35rem`, `0.4rem`, `0.6rem`, `0.65rem`, `0.85rem`,
  `1.1rem`, `1.25rem` …) round to the nearest token. Never split a step.
- **Radii**: six steps. Today's inline values are `4px`(30×), `6px`(65×), `8px`(49×),
  `10px`(46×), `50%`(15×) — a near-perfect match to `--radius-xs/sm/*/md/full`. `8px` has no
  token; map it to `--radius-sm` (6px) for controls and `--radius-md` (10px) for panels —
  decide by what the element is, not by the old number.
- **Borders**: three colors (`subtle`/`default`/`strong`) × three widths (`hair`/`thick`/
  `marker`). The 19 occurrences of `border: '1px solid rgba(255,255,255,0.08)'` all become
  `1px solid var(--border-subtle)`.
- **Elevation**: four levels. In dark mode, borders carry hierarchy and shadows are subtle; in
  light mode, shadows carry it. That is why `--elev-*` is redefined per theme. A card is
  `--elev-1`; a popover `--elev-2`; a modal `--elev-3`.

### 2.7 Motion vocabulary

| Token | Value | Use for |
|---|---|---|
| `--dur-instant` | 80ms | color-only change on an already-visible element |
| `--dur-fast` | 140ms | hover, focus ring, button press |
| `--dur-base` | 200ms | tab switch, accordion, tooltip |
| `--dur-slow` | 320ms | panel/rail expand-collapse, route-level fade |
| `--dur-slower` | 520ms | first-paint reveal only; never on interaction |
| `--dur-sim-step` | 400ms | **one simulator state transition** — the single knob for step pacing |

| Easing | Value | Use for |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | default for everything |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | entering / expanding |
| `--ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | leaving / collapsing |
| `--ease-spring` | `cubic-bezier(0.34, 1.4, 0.64, 1)` | **simulator token/packet movement only** |

The existing `transition: all 0.3s ease` (5 occurrences) and `transition: all 0.2s ease` (3)
must be replaced with explicit property lists — `transition: background-color var(--dur-fast)
var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)`. `all` forces the
browser to watch every animatable property and is a real cost inside 47 visualizers.

The `@media (prefers-reduced-motion: reduce)` block in §2.1 zeroes every duration token, so
respecting the preference is automatic for anything built on the tokens. **Keep** the
existing `App.css:318` block as well if it disables `animation-name` — verify and merge.

### 2.8 Learning-tier badges

Replace the emoji-only treatment. The tier is currently signalled by `🟢`/`🟡`/`🔴` in the
Markdown heading and by `.badge.beginner/.intermediate/.expert` on HomePage.

Spec for `.tier-badge`:

```
┌──────────────────────┐
│ ●  BEGINNER          │   ← dot glyph + all-caps label
└──────────────────────┘
```

- Shape: pill, `--radius-full`, `padding: var(--space-1) var(--space-3)`.
- Type: `--ui-2xs` (11px), weight 600, `letter-spacing: var(--tracking-wide)`, uppercase.
- Fill `--tier-*-tint`, text `--tier-*`, `1px solid --tier-*-border`.
- **Glyph is the redundant channel** and differs per tier — not just color:
  `beginner: ●` (filled circle) · `intermediate: ◐` (half) · `expert: ◆` (diamond).
- The Markdown headings keep their emoji (they are content, and `content/CONTENT_SPEC.md`
  mandates them). But `MarkdownRenderer` strips the emoji from the *rendered* `h2` and emits
  a `.tier-badge` before the heading text — see §4.5.

Contrast: `--tier-beginner #4ade80` on `--tier-beginner-tint #0e2a1a` = **11.9:1**;
intermediate **12.4:1**; expert **7.1:1**. All AAA.

### 2.9 Decision required: `framer-motion`

It is a declared dependency with **zero imports**. Two options — **the owner must pick before
Phase 1**:

- **(A) Remove it.** `npm uninstall framer-motion`. Everything in §2.7 is CSS transitions and
  a handful of `@keyframes`, which is sufficient for step-through simulators and costs
  nothing at runtime. **This is the recommendation.**
- **(B) Adopt it deliberately** for simulator step transitions only, wrapping the ~12 highest-
  value visualizers with `<AnimatePresence>` and driving durations from the motion tokens via
  `transition={{ duration: 0.4, ease: [0.34, 1.4, 0.64, 1] }}`. Adds ~34 KB gzipped to the
  simulator chunk. Only worth it if the owner wants enter/exit animation for list items, which
  CSS cannot do well.

Do not leave it installed-and-unused.

### 2.10 Mermaid, highlight.js, and KaTeX

These three render inside the reading surface and must move with the palette.

**Mermaid** (`components/markdown/MermaidBlock.jsx`). Keep `theme: 'base'`. Replace the
hardcoded `themeVariables` object with values read from the live CSS custom properties, so
one initialization serves both themes:

```js
// Read once, after the theme attribute is set on <html>.
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
```

Then map:

| Mermaid variable | Token | Notes |
|---|---|---|
| `background` | `transparent` | unchanged |
| `primaryColor` | `--bg-raised` | node fill |
| `primaryTextColor` | `--text-primary` | |
| `primaryBorderColor` | `--cat-base` | **now follows the category** |
| `secondaryColor` | `--bg-surface` | |
| `secondaryBorderColor` | `--border-strong` | |
| `tertiaryColor` | `--bg-page` | |
| `tertiaryBorderColor` | `--border-default` | |
| `lineColor` | `--text-muted` | |
| `textColor` | `--text-prose` | |
| `mainBkg` | `--bg-surface` | |
| `nodeBorder` | `--cat-base` | |
| `clusterBkg` | `--bg-inset` | |
| `clusterBorder` | `--border-default` | |
| `edgeLabelBackground` | `--bg-surface` | |
| `actorBkg` | `--bg-surface` | |
| `actorBorder` | `--cat-base` | |
| `actorTextColor` | `--text-primary` | |
| `actorLineColor` | `--border-strong` | |
| `signalColor` | `--text-secondary` | |
| `signalTextColor` | `--text-prose` | |
| `labelBoxBkgColor` | `--bg-raised` | |
| `labelBoxBorderColor` | `--cat-base` | |
| `labelTextColor` | `--text-primary` | |
| `noteBkgColor` | `--state-warning-tint` | |
| `noteBorderColor` | `--state-warning` | |
| `noteTextColor` | `--text-prose` | |
| `fontFamily` | `var(--font-body)` | **currently `var(--font-main)`, a token that no longer exists after this revamp — must be updated or diagrams lose their font** |
| `fontSize` | `14px` | keep |

**Critical implementation note:** `mermaidPromise` in `MermaidBlock.jsx:5` caches the module
*and* its one-time `initialize()` call. A theme toggle must therefore re-initialize and
re-render every mounted diagram. Refactor so the promise caches only the module, and
`initialize()` is called with fresh values whenever the theme changes; then bump a
`themeVersion` value into the `useEffect` dependency array at `MermaidBlock.jsx:86` so all
diagrams re-render. **Without this, diagrams keep dark colors after switching to light.**

**highlight.js — decision: stop importing a prebuilt theme.** Today
`MarkdownRenderer.jsx:8` imports `highlight.js/styles/github-dark.css`, which hardcodes
GitHub's palette and cannot follow a theme toggle. Delete that import and write ~14 rules in
`App.css` driven by the `--syn-*` tokens:

```css
.hljs-keyword, .hljs-selector-tag, .hljs-literal   { color: var(--syn-keyword); }
.hljs-string, .hljs-attr, .hljs-regexp             { color: var(--syn-string); }
.hljs-number                                        { color: var(--syn-number); }
.hljs-comment, .hljs-quote                          { color: var(--syn-comment); font-style: italic; }
.hljs-title, .hljs-title.function_, .hljs-section   { color: var(--syn-function); }
.hljs-type, .hljs-class .hljs-title, .hljs-title.class_ { color: var(--syn-type); }
.hljs-built_in, .hljs-symbol                        { color: var(--syn-builtin); }
.hljs-punctuation, .hljs-operator                   { color: var(--syn-punct); }
.hljs-deletion                                      { color: var(--syn-deleted); }
.hljs-addition                                      { color: var(--syn-added); }
.hljs-meta, .hljs-doctag                            { color: var(--text-muted); }
.hljs-emphasis { font-style: italic; } .hljs-strong { font-weight: 600; }
```
This removes a stylesheet import (a small bundle win) and makes code follow the theme. The
eight registered languages at `MarkdownRenderer.jsx:10-24` stay exactly as they are — do not
touch the language list; it is a deliberate bundle-size decision documented in that file.

**KaTeX.** Keep the `katex.min.css` import — it carries the font metrics and layout, not just
color. Override color only:

```css
.topic-content .katex { color: var(--text-prose); font-size: 1.06em; }
.topic-content .katex .mord, .topic-content .katex .mbin,
.topic-content .katex .mrel, .topic-content .katex .mopen,
.topic-content .katex .mclose                       { color: inherit; }
.topic-content .katex .mop                          { color: var(--cat-base); }
.topic-content .katex-display                       { overflow-x: auto; overflow-y: hidden; padding: var(--space-3) 0; }
.topic-content .katex-display > .katex              { text-align: initial; }
```
KaTeX ships its own woff2 fonts via the CSS import; they load lazily with the renderer chunk
and need no preload.

---

## 3. Token migration strategy — the 1049 inline blocks

This is the bulk of the work. Do not attempt it as one commit and do not attempt it with a
blind global find-and-replace.

### 3.1 The three-bucket triage

Every inline `style={{}}` falls into exactly one bucket. Classify before you touch it.

| Bucket | Test | Destination | Approx. share |
|---|---|---|---|
| **A — Static presentation** | Object is a literal; no ternary, no template literal, no variable reference. | A CSS class in `App.css`. | ~62% (≈650) |
| **B — Shared pattern** | The same or near-same literal object appears in ≥3 files. | A shared primitive component or a utility class. | ~25% (≈260) |
| **C — Genuinely computed** | Contains a ternary, template literal, or bound variable that changes at runtime. | **Stays inline**, but every color/size literal inside it becomes `var(--token)`. | ~13% (≈140, concentrated in 23 files) |

Find bucket C mechanically:
```bash
grep -rn "style={{[^}]*[?\`]" frontend/src --include='*.jsx'
```
That returns the 23 files where a mechanical replacement is unsafe.

### 3.2 What becomes a utility class

Add these to `App.css` under a `/* Utilities */` section. They cover the highest-frequency
static patterns from §0.2.

```css
/* Surfaces */
.u-panel      { background: var(--bg-surface); border: var(--stroke-hair) solid var(--border-subtle); border-radius: var(--radius-md); }
.u-panel-deep { background: var(--bg-code);    border: var(--stroke-hair) solid var(--border-subtle); border-radius: var(--radius-md); }
.u-panel-raised { background: var(--bg-raised); border: var(--stroke-hair) solid var(--border-default); border-radius: var(--radius-md); }
.u-inset      { background: var(--bg-inset); border-radius: var(--radius-sm); }

/* Padding */
.u-pad-sm { padding: var(--space-2) var(--space-3); }
.u-pad    { padding: var(--space-4); }
.u-pad-lg { padding: var(--space-5); }

/* Text roles */
.u-label     { font-size: var(--ui-xs);  line-height: var(--ui-xs-lh);  color: var(--text-muted); text-transform: uppercase; letter-spacing: var(--tracking-wide); font-weight: 600; }
.u-caption   { font-size: var(--ui-sm);  line-height: var(--ui-sm-lh);  color: var(--text-secondary); }
.u-body-sm   { font-size: var(--ui-base);line-height: var(--ui-base-lh);color: var(--text-secondary); }
.u-value     { font-size: var(--ui-md);  line-height: var(--ui-md-lh);  color: var(--text-primary); font-weight: 600; }
.u-mono      { font-family: var(--font-mono); font-variant-ligatures: none; }

/* Layout */
.u-row      { display: flex; align-items: center; gap: var(--space-2); }
.u-row-between { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; }
.u-col      { display: flex; flex-direction: column; gap: var(--space-2); }
.u-grid-auto { display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: var(--space-3); }
.u-scroll-x { overflow-x: auto; overscroll-behavior-x: contain; }

/* State pills — the redundant-glyph rule from §2.4 applies to their content */
.u-pill { display: inline-flex; align-items: center; gap: var(--space-1); padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-full); font-size: var(--ui-2xs); font-weight: 600;
          letter-spacing: var(--tracking-wide); text-transform: uppercase; border: var(--stroke-hair) solid transparent; }
.u-pill-success { background: var(--state-success-tint); color: var(--state-success); border-color: var(--state-success-border); }
.u-pill-warning { background: var(--state-warning-tint); color: var(--state-warning); border-color: var(--state-warning-border); }
.u-pill-danger  { background: var(--state-danger-tint);  color: var(--state-danger);  border-color: var(--state-danger-border); }
.u-pill-info    { background: var(--state-info-tint);    color: var(--state-info);    border-color: var(--state-info-border); }
.u-pill-idle    { background: var(--state-idle-tint);    color: var(--state-idle);    border-color: var(--state-idle-border); }
```

Roughly 320 of the 650 bucket-A blocks collapse into combinations of these ten-odd classes.

### 3.3 What becomes a shared primitive, and what stays inline

**New shared primitives** (`frontend/src/components/shared/`). Each replaces a pattern
currently re-implemented per file:

| New component | Replaces | Found in |
|---|---|---|
| `Panel.jsx` | the `viz-card` + inline `background`/`border`/`borderRadius` trio | ~40 sites |
| `StatePill.jsx` | inline colored pills with a hand-picked hue per state | ~55 sites |
| `MetricTile.jsx` | the label-over-value box (`fontSize:'0.75rem'` label + `fontSize:'0.9rem'` bold value) | ~35 sites, incl. `StateInspector` |
| `LegendRow.jsx` | the swatch + label rows under diagrams | ~25 sites |
| `FieldGrid.jsx` | `display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))'` | ~18 sites |

**What legitimately stays inline** — do not try to remove these:

1. **Geometry driven by data.** Gantt bar `width`/`left`, progress-bar `width`, waveform
   point coordinates, B+ tree node `left` offsets, packet `transform: translateX(...)`.
   Example, already correct: `TopicViewer.jsx:154` — `style={{ width: `${readingProgress}%` }}`.
2. **Per-item computed color where the *value* is data.** A heat-map cell, a per-process
   Gantt color keyed off a process index.
3. **Anything inside a `.map()` where the style depends on the item's index or state** — the
   active-step chip in `StepThroughController.jsx:48-58`, the active line in
   `CodePanel.jsx:22-28`, the highlighted cell in `StateInspector.jsx:19-25`.

For all three, **the literals inside still become tokens.** `StepThroughController.jsx:52-55`
becomes:
```jsx
borderColor: idx === currentStep ? 'var(--cat-base)' : 'var(--border-subtle)',
background:  idx === currentStep ? 'var(--cat-tint)'  : 'transparent',
color:       idx === currentStep ? 'var(--cat-base)'  : 'var(--text-muted)',
```
Better still where the branch is binary: move it to a class and toggle the class
(`className={idx === currentStep ? 'step-chip is-active' : 'step-chip'}`), leaving zero
inline style. Prefer that when the branch has only two outcomes.

### 3.4 The hex → token mapping table

**Read §3.5 before applying any of this.** Several rows are context-dependent and marked.

| Hex | Uses | → Token | Note |
|---|---:|---|---|
| `#94a3b8` | 85 | `var(--text-secondary)` | ⚠ **context** — if it is a small uppercase label, use `--text-muted` |
| `#020617` | 74 | `var(--bg-code)` | ⚠ **context** — if it is a card, not a code/terminal panel, use `--bg-surface` |
| `#38bdf8` | 48 | `var(--state-info)` | ⚠ **context** — if it means "this is the networking section", use `--cat-networking-base`; if it means "active/highlighted", `--state-info` |
| `#f8fafc` | 46 | `var(--text-primary)` | direct |
| `#1e293b` | 46 | `var(--bg-raised)` | direct |
| `#10b981` | 45 | `var(--state-success)` | ⚠ if it means DBMS, `--cat-dbms-base` |
| `#0f172a` | 45 | `var(--bg-surface)` | ⚠ **context** — if it is a code/terminal panel, `--bg-code` |
| `#3b82f6` | 42 | `var(--state-info)` | ⚠ if it is the interactive/primary-button blue, `--cat-base` |
| `#f59e0b` | 30 | `var(--state-warning)` | direct |
| `#a78bfa` | 30 | `var(--cat-os-base)` | ⚠ if generic "purple text", `--cat-base` |
| `#64748b` | 28 | `var(--text-muted)` | direct |
| `#60a5fa` | 28 | `var(--state-info)` | direct |
| `#fbbf24` | 27 | `var(--state-warning)` | direct |
| `#34d399` | 27 | `var(--state-success)` | ⚠ if DBMS, `--cat-dbms-base` |
| `#4ade80` | 26 | `var(--state-success)` | merges with `#34d399` — intentional |
| `#cbd5e1` | 21 | `var(--text-secondary)` | direct |
| `#8b5cf6` | 21 | `var(--cat-os-base)` | ⚠ if generic accent, `--cat-base` |
| `#0b1329` | 14 | `var(--bg-inset)` | direct |
| `#ef4444` | 13 | `var(--state-danger)` | direct |
| `#475569` | 11 | `var(--text-muted)` | ⚠ **fails AA today** — must become `--text-muted`, never darker |
| `#334155` | 11 | `var(--border-default)` | direct |
| `#c084fc` | 9 | `var(--cat-os-hover)` | direct |
| `#a7f3d0` | 9 | `var(--state-success)` | direct |
| `#fff` / `#ffffff` | 10 | `var(--text-primary)` | ⚠ if a *fill* not text, `var(--bg-surface)` |
| `#f43f5e` | 8 | `var(--state-danger)` | direct |
| `#c7d2fe` | 8 | `var(--text-secondary)` | direct |
| `#93c5fd` | 8 | `var(--state-info)` | direct |
| `#312e81` | 8 | `var(--cat-os-tint)` | direct |
| `#a855f7` | 7 | `var(--cat-os-base)` | direct |
| `#090d16` | 7 | `var(--bg-code)` | direct |
| `#818cf8` | 6 | `var(--cat-os-base)` | direct |
| `#ec4899` | 5 | `var(--cat-aiml-base)` | direct |
| `#e2e8f0` | 5 | `var(--text-secondary)` | direct |
| `#6366f1` | 5 | `var(--cat-os-base)` | direct |
| `#151c2c` | 5 | `var(--bg-surface)` | direct |
| `#111827` | 5 | `var(--bg-code)` | ⚠ in light mode this is `--text-primary` — check it is a background |
| `#065f46` `#059669` `#047857` | 12 | `var(--state-success-border)` | direct |
| `#f87171` | 4 | `var(--state-danger)` | direct |
| `#7f1d1d` `#3f1212` `#7c2d12` | 10 | `var(--state-danger-tint)` | direct |
| `#7c3aed` `#4338ca` `#4f46e5` `#9333ea` | 11 | `var(--cat-os-border)` | direct |
| `#064e3b` `#022c22` | 6 | `var(--state-success-tint)` | direct |
| `#fecaca` `#fecdd3` | 4 | `var(--state-danger)` | direct |
| `#d97706` `#b45309` | 4 | `var(--state-warning-border)` | direct |
| `#2563eb` `#1d4ed8` | 4 | `var(--state-info-border)` | direct |
| `#78350f` `#451a03` | 3 | `var(--state-warning-tint)` | direct |
| `#6ee7b7` | 2 | `var(--state-success)` | direct |
| `#2e3a52` | 2 | `var(--border-default)` | direct |
| `#0ea5e9` `#06b6d4` `#0369a1` | 5 | `var(--state-info)` | direct |
| `#e11d48` `#dc2626` | 4 | `var(--state-danger)` | direct |
| `#a0a0b0` | 2 | `var(--text-muted)` | direct |
| `#fde68a` `#f97316` | 2 | `var(--state-warning)` | direct |
| `#f1f5f9` | 1 | `var(--text-primary)` | direct |
| `#e9d5ff` `#e0e7ff` `#ddd6fe` `#c4b5fd` | 7 | `var(--cat-os-hover)` | direct |
| `#bfdbfe` | 1 | `var(--state-info)` | direct |
| `#84cc16` | 1 | `var(--state-success)` | direct |
| `#3e4c68` `#1b2436` `#0b0f19` | 3 | `--border-strong` / `--bg-raised` / `--bg-page` | direct |
| `#125` `#123` `#501` `#10492` `#1042` | 8 | **DO NOT MAP** | ⚠ almost certainly not colors — inspect each in context first |

**rgba → token:**

| Pattern | → |
|---|---|
| `rgba(255,255,255,0.03)` | `var(--bg-raised)` |
| `rgba(255,255,255,0.06 / 0.08 / 0.1)` | `var(--border-subtle)` |
| `rgba(59,130,246,0.1 … 0.35)` | `var(--state-info-tint)` (bg) or `var(--state-info-border)` (border) |
| `rgba(139,92,246,0.1 … 0.4)` | `var(--cat-os-tint)` / `var(--cat-os-border)` |
| `rgba(16,185,129,0.15 … 0.3)` | `var(--state-success-tint)` / `var(--state-success-border)` |
| `rgba(245,158,11,0.15 … 0.3)` | `var(--state-warning-tint)` / `var(--state-warning-border)` |
| `rgba(239,68,68,0.05 … 0.3)` | `var(--state-danger-tint)` / `var(--state-danger-border)` |
| `rgba(21,28,44,0.74 … 0.92)` | `color-mix(in srgb, var(--bg-surface) 88%, transparent)` |
| `rgba(15,23,42,0.58 … 0.8)` | `color-mix(in srgb, var(--bg-page) 80%, transparent)` |
| `rgba(0,0,0,0.2)` | `var(--elev-1)` (it is always a shadow) |

**Font-size → token** (the ten-sizes-in-a-4px-range problem):

| Old | → | | Old | → |
|---|---|---|---|---|
| `0.7rem`, `0.72rem` | `var(--ui-2xs)` | | `0.85rem`, `0.88rem` | `var(--ui-base)` |
| `0.75rem`, `0.78rem` | `var(--ui-xs)` | | `0.9rem`, `0.92rem` | `var(--ui-md)` |
| `0.8rem`, `0.82rem` | `var(--ui-sm)` | | `0.95rem`, `1rem` | `var(--ui-lg)` |

**Radius → token:** `4px`→`--radius-xs` · `6px`→`--radius-sm` · `8px`→`--radius-sm` (controls)
or `--radius-md` (panels) · `10px`→`--radius-md` · `14px`→`--radius-lg` · `50%`→`--radius-full`.

**Spacing → token:** `0.15rem`→`--space-1` · `0.3/0.35/0.4rem`→`--space-2` ·
`0.5rem`→`--space-2` · `0.6/0.65/0.75rem`→`--space-3` · `0.85rem`→`--space-3` ·
`1rem`→`--space-4` · `1.1/1.25rem`→`--space-5` · `1.5rem`→`--space-5` · `2rem`→`--space-6`.

### 3.5 Where a mechanical replacement would be WRONG

Read this section before running any script. Each item has burned someone.

1. **`#38bdf8` is overloaded.** 48 uses split between "the networking category" and "this
   element is active/selected". Only the second becomes `--state-info`. Grep each occurrence
   and read the surrounding JSX. In `NetworkingVisualizer.jsx` it is almost always the
   category; in `java/` visualizers it is almost always "active".
2. **`#0f172a` and `#020617` are both "dark panel" but land on different tokens.** The rule:
   if the element contains monospaced/code/log/terminal content → `--bg-code`. Otherwise →
   `--bg-surface` (for `#0f172a`) or `--bg-inset` (for `#020617` used as a well).
3. **`#111827` is a background in dark mode and `--text-primary` in light mode.** Never map
   it by string match alone.
4. **The five malformed literals (`#125`, `#123`, `#501`, `#10492`, `#1042`).** These matched a
   `#[0-9a-f]{3,8}` grep but are near-certainly ID fragments, port numbers, or anchor hrefs.
   Inspect each; if it is not a color, leave it and note it in the phase PR.
5. **`App.css:63-70` `.navbar .logo`** uses `-webkit-background-clip: text` with
   `-webkit-text-fill-color: transparent`. If you swap the gradient stops to tokens, you must
   also add the standard `background-clip: text` — otherwise the logo becomes invisible in
   Firefox once the `-webkit-` prefix is dropped by a future autoprefixer pass.
6. **`.topic-content` overrides.** Do **not** simply retint the block at `App.css:1247-1420`.
   Delete the dead refinement block at `:478-485` and rebuild `.topic-content` once, from
   scratch, per §4.5. Editing both in place will re-create the conflict in new colors.
7. **`CodePanel.jsx:29` has `select: 'none'`** — not a real CSS property. Replace with
   `userSelect: 'none'` while you are in the file; do not "map" it.
8. **`ConceptModuleShell.jsx:36` mental-model gradient** is
   `linear-gradient(135deg, rgba(59,130,246,.12), rgba(147,51,234,.12))`. `#9333ea` (147,51,234)
   appears nowhere else at that alpha. Replace the whole gradient with a flat
   `var(--state-info-tint)` plus a `--stroke-marker` left border in `var(--state-info)` — a
   gradient behind body text hurts legibility and is the only one of its kind in the app.
9. **`HomePage.jsx`'s inline fallback topic array** (~60 lines of literal data). It contains
   no styles. Do not reformat, re-sort, or "clean up" this array — it is duplicated content
   that must stay byte-identical to the backend's list.
10. **Mermaid `fontFamily: 'var(--font-main)'`** (`MermaidBlock.jsx:18`). `--font-main` is
    deleted by this revamp. If you replace the token block without updating this line, every
    diagram silently loses its font. Change it to `var(--font-body)`.

### 3.6 File order for the migration

Highest impact first. Each row is one commit.

| # | File(s) | Inline blocks | Why this order |
|---:|---|---:|---|
| 1 | `components/shared/*` (6 files) | 72 | Everything else consumes these. Doing them first means later files delete code rather than rewrite it. |
| 2 | `components/visualizers/NetworkingVisualizer.jsx` | 90 | Largest single file; establishes the hub pattern. |
| 3 | `components/visualizers/JavaSpringVisualizer.jsx`, `AiMlVisualizer.jsx`, `DbmsVisualizer.jsx` | 79+ | The other three hubs, same pattern. |
| 4 | `visualizers/java/*` (14 files) | 434 | Biggest directory. Highly repetitive — after 2–3 files the rest are mechanical. |
| 5 | `visualizers/networking/*` (remaining) | 272 | Second biggest. |
| 6 | `visualizers/dbms/*` | 60 | |
| 7 | `visualizers/os/*` | 28 | |
| 8 | Long tail (any file with <10 blocks) | remainder | |

`components/markdown/*`, `pages/*`, and `visualizers/aiml/*` have zero inline blocks and need
no migration pass.

**Per-file definition of done:** `grep -c "#[0-9a-fA-F]\{3,8\}" <file>` returns 0 (excluding
verified non-color literals), the file's Vitest suite passes if it has one, and a visual diff
of that visualizer in both themes shows no unintended change.

---

## 4. Screen and component specification

### 4.1 Navbar (`components/Navbar.jsx`)

**Today:** 13 lines, two links, one of which hardcodes a topic id.

**Target markup:**

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ◆ CS Fundamentals   OS  NET  DB  JAVA  AI/ML        [ ⌘K Search ]  [ ☾ ]  │
└────────────────────────────────────────────────────────────────────────────┘
```

| Change | To |
|---|---|
| Replace the two links with five category links | `/category/os` etc. **If no category route exists yet, link to that category's first topic and mark it `aria-current` when any topic in that category is active.** Confirm with the owner which. |
| Each link gets its glyph + short label from §2.4 | `◆ OS`, `⬡ NET`, `▤ DB`, `◐ JAVA`, `✳ AI/ML` |
| Active state | 2px bottom border in `var(--cat-*-base)` for that link's own category + `aria-current="page"` |
| Height | `var(--nav-height)` (3.5rem), `position: sticky; top: 0; z-index: var(--z-nav)` |
| Background | `color-mix(in srgb, var(--bg-surface) 88%, transparent)` + `backdrop-filter: blur(12px)`, `border-bottom: var(--stroke-hair) solid var(--border-subtle)` |
| Logo | Keep the gradient, but from `var(--cat-os-base)` → `var(--cat-networking-base)`, and **add the standard `background-clip: text`** (see §3.5 #5). Prefix with the `◆` glyph as a non-gradient element so it survives if the clip fails. |
| **New: theme toggle** | Right-aligned icon button, `aria-label="Switch to light theme"` / `"…dark theme"`, 2.25rem square, `--radius-sm`. See §4.1.1. |
| **New: search entry** | A button (not an input) reading `Search  ⌘K`, opening the Phase 7 command palette. **If search is out of scope for this revamp, omit the button entirely rather than shipping a dead control.** |
| Below 768px | Category links collapse into a horizontally scrollable strip (`.u-scroll-x`) below the logo row; nav height becomes `auto`. Theme toggle stays in the top row. |

**4.1.1 Theme toggle implementation contract**

- State lives in `localStorage` under the key `cs-fundamentals-theme`, values `"light"` |
  `"dark"` | absent (= follow system).
- Applied by setting `document.documentElement.dataset.theme`.
- **An inline script in `index.html` `<head>`, before the module script**, reads the key and
  sets the attribute synchronously. Without this, every load flashes dark before switching —
  a FOUC that is worse than the FOUT we are fixing.
  ```html
  <script>
    try {
      var t = localStorage.getItem('cs-fundamentals-theme');
      if (!t) t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      document.documentElement.dataset.theme = t;
    } catch (e) { document.documentElement.dataset.theme = 'dark'; }
  </script>
  ```
- A `useTheme()` hook in `frontend/src/hooks/useTheme.js` owns reads/writes and must
  **notify `MermaidBlock`** (see §2.10) so mounted diagrams re-render.
- `<meta name="theme-color">` needs two entries so the mobile browser chrome follows:
  ```html
  <meta name="theme-color" content="#0b0f1a" media="(prefers-color-scheme: dark)">
  <meta name="theme-color" content="#f6f7fb" media="(prefers-color-scheme: light)">
  ```

**4.1.2 `index.html` — the full target head**

```html
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>CS Fundamentals — Interactive CS Interview Prep</title>
<meta name="description" content="Interactive Computer Science fundamentals: 56 topics across operating systems, networking, databases, Java & Spring, and AI/ML systems — with diagrams, simulators, and interview questions." />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta name="theme-color" content="#0b0f1a" media="(prefers-color-scheme: dark)" />
<meta name="theme-color" content="#f6f7fb" media="(prefers-color-scheme: light)" />
<link rel="preload" href="/fonts/ibm-plex-sans-var-latin.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/fonts/inter-tight-var-latin.woff2" as="font" type="font/woff2" crossorigin />
<!-- theme bootstrap script from §4.1.1 goes here, last -->
```
The favicon should be an SVG of the `◆` glyph in `--cat-os-base` on a transparent ground, so
it works in both browser themes.

### 4.2 HomePage (`pages/HomePage.jsx`)

Keep the structure — a category-first roadmap is the right model. Fix the density,
the affordances, and the badges.

| Element | Change | Tokens |
|---|---|---|
| `.roadmap-header h1` | `--prose-h1`, `--font-heading` 700, `--tracking-tight`, `--text-primary` | |
| `.eyebrow` | `.u-label` treatment | `--ui-xs`, `--text-muted`, `--tracking-wide` |
| `.roadmap-selectors` | Add the **topic count to each button** as a superscript-style number: `◆ OS · 8`. Counts are already computed. | |
| `.roadmap-selector` | Rest: `--bg-surface` / `--text-secondary` / `--border-subtle`. Hover: `--bg-raised`. **Active: `--cat-*-tint` background, `--cat-*-base` text, `--cat-*-border` border** — so the filter row itself teaches the category color mapping. | |
| `.category-overview` | Gets `data-category={category.id}` so its whole subtree inherits the accent | |
| `.category-overview h2` | `--prose-h2`, `--font-heading` 600, prefixed with the category glyph in `--cat-base` | |
| `.topic-row` | Give the unclassed inner `<div>` a class (`.topic-row-body`) and revive `.topic-row-title` / `.topic-row-summary` | |
| `.topic-row` layout | `grid-template-columns: 2.5rem minmax(0,1fr) auto`; `gap: var(--space-4)`; `padding: var(--space-4)`; `border-radius: var(--radius-md)` | |
| `.topic-row` left rail | `border-left: var(--stroke-marker) solid var(--cat-border)`, using the **border style** from §2.4 (`double` for dbms, `dashed` for aiml) | |
| `.topic-row:hover` | `background: var(--bg-raised)`; `transition: background-color var(--dur-fast) var(--ease-standard)` — **not `all`** | |
| `.topic-number` | `.u-mono`, `--ui-sm`, `--text-muted` | |
| `.topic-row h3` | `--ui-lg`, `--font-heading` 600, `--text-primary` | |
| `.topic-row p` | `--ui-base`, `--text-secondary`, `-webkit-line-clamp: 2` | |
| Level badge | Replace `.badge.*` with `.tier-badge` per §2.8 — glyph + uppercase label | |
| `.roadmap-cta` | `--cat-base` text, `--cat-tint` background on hover, `--radius-sm` | |
| **New** | A level filter (`All · Beginner · Intermediate · Expert`) beside the category filter. 56 rows is too many to scan. | |
| **New** | Empty state when a filter combination yields zero topics | |

**Responsive:** at `≤768px` the topic row becomes two rows — number + badge + title on line
one, summary on line two, CTA becomes a full-width tap target at `min-height: 44px`. The
existing `@media (max-width: 780px)` block at `App.css:487` already does something close to
this; rebuild it at the standard breakpoint (see §4.7).

### 4.3 TopicPage (`pages/TopicPage.jsx`)

| Change | Detail |
|---|---|
| Add `data-category` to the page root | Derive from the same map `TopicViewer.jsx:67-73` (`CATEGORY_MAP`) already holds. **Extract that map to `frontend/src/utils/topicCategories.js` and import it in both places** — it is currently duplicated knowledge. |
| `.topic-page-header` | Becomes sticky below the navbar (`top: var(--nav-height)`), collapsing to a compact bar (title only, `--ui-lg`) after 120px of scroll |
| `.back-link` | `--text-secondary` → `--cat-base` on hover; `←` glyph kept |
| `.topic-page-title` | `--prose-h1`, `--font-heading` 700, `--tracking-tight` |
| **New** breadcrumb | `Home / ◆ OS / Process Management` above the title, `--ui-sm`, `--text-muted` |
| `.main-tab-switcher` | **Convert to real tabs**: `role="tablist"`, each button `role="tab"` + `aria-selected` + `aria-controls`, panel `role="tabpanel"` + `aria-labelledby`. Arrow-key navigation between tabs. |
| `.main-tab-btn.active-tab` | Underline in `var(--cat-base)` (2px), text `--text-primary`. **Keep the class name `active-tab`** — `TopicPage.test.jsx` asserts on it (§5.0). |
| Tab labels | Drop the emoji from the accessible name; keep them as `aria-hidden` spans: `<span aria-hidden="true">📖</span> Study` |

### 4.4 The reading experience — TopicViewer + `.topic-content`

This is the centerpiece. Rebuild `.topic-content` from scratch; do not patch the two existing
blocks (§3.5 #6).

**Layout**

```
┌─ nav ───────────────────────────────────────────────────────────────────┐
├─ sticky topic header ───────────────────────────────────────────────────┤
│ ┌── rail 16rem ──┐  ┌──────── prose column, max 68ch ────────┐          │
│ │ 34% read       │  │ Study guide / Read in three passes      │          │
│ │ ▓▓▓░░░░░░      │  │ [ ● BEGINNER ] [ ◐ INTERMEDIATE ] …     │          │
│ │ Hide contents  │  │                                         │          │
│ │ ─────────────  │  │ ## Beginner Level                       │          │
│ │ ▸ Beginner     │  │ Prose at 17px / 1.72 …                  │          │
│ │ ▪ Intermediate │  │                                         │          │
│ │ ▸ Expert       │  │ ┌─ breaks out to 96ch ───────────────┐  │          │
│ │                │  │ │  mermaid diagram / wide table      │  │          │
│ │                │  │ └────────────────────────────────────┘  │          │
│ └────────────────┘  └─────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────────────┘
```

- `.study-layout`: `display: grid; grid-template-columns: var(--rail-width) minmax(0, 1fr);
  gap: var(--space-7); align-items: start`.
- `.study-navigation`: `position: sticky; top: calc(var(--nav-height) + var(--space-5));
  max-height: calc(100vh - var(--nav-height) - var(--space-8)); overflow-y: auto`.
- `.study-main`: `min-width: 0` (**required** — without it the grid child refuses to shrink
  and wide code blocks blow out the page).
- **Remove the card chrome from `.topic-content`.** Today it is a `--bg-card` box with a
  2.5rem pad, a border, and a shadow. A 500-line article inside a card reads as a widget.
  Target: transparent background, no border, no shadow, `max-width: var(--measure-prose)`,
  `padding: 0`. The page ground (`--bg-page`) becomes the reading ground.

**Typography inside `.topic-content`**

| Element | Size / line-height | Color | Other |
|---|---|---|---|
| `p`, `li` | `--prose-base` / `--prose-base-lh` | **`--text-prose`** | `margin-block: var(--space-4)` |
| First `p` after an `h2` | `--prose-lg` / `--prose-lg-lh` | `--text-prose` | acts as a lede |
| `h1` | `--prose-h1` / `--prose-h1-lh` | `--text-primary` | `--font-heading` 700, `--tracking-tight` |
| `h2` | `--prose-h2` / `--prose-h2-lh` | `--text-primary` | `--font-heading` 600; `border-top: var(--stroke-hair) solid var(--border-subtle)`; `padding-top: var(--space-6)`; `margin-top: var(--space-8)`; `scroll-margin-top: calc(var(--nav-height) + var(--space-6))` |
| `h3` | `--prose-h3` / `--prose-h3-lh` | `--text-primary` | `--font-heading` 600; **`::before` marker: a 3px × 1em bar in `var(--cat-base)`**, absolutely positioned at `-var(--space-4)` — this is what replaces the second purple |
| `h4` | `--prose-h4` | `--text-secondary` | 600, `--tracking-wide`, uppercase |
| `strong` | inherit | `--text-primary` | 600 |
| `a` | inherit | `--cat-base` | `text-decoration-thickness: 1px; text-underline-offset: 0.16em`; hover `--cat-hover` |

**Two purples become one accent plus a marker.** Today `h2` is `--accent-purple` and `h3` is
`#a78bfa`; both read as links. In the target, headings are `--text-primary` and *hierarchy is
carried by size, weight, and the `h3` bar marker* — with `--cat-base` reserved for links and
the category rail. That is the single change that most improves scannability.

**Inline `code`** — stop the pink-on-pink:
```css
.topic-content :not(pre) > code {
  font-family: var(--font-mono); font-size: 0.9em; font-variant-ligatures: none;
  background: var(--bg-raised); color: var(--text-primary);
  border: var(--stroke-hair) solid var(--border-subtle);
  border-radius: var(--radius-xs); padding: 0.12em 0.36em;
}
```
Neutral inline code lets KaTeX, links, and the category accent each keep their own meaning.

**Code fences**
```css
.topic-content pre {
  background: var(--bg-code); border: var(--stroke-hair) solid var(--border-subtle);
  border-radius: var(--radius-md); padding: var(--space-4) var(--space-5);
  margin-block: var(--space-5); overflow-x: auto; overscroll-behavior-x: contain;
  font-size: var(--prose-code); line-height: 1.6; tab-size: 2;
}
.topic-content pre code { background: none; border: 0; padding: 0; color: var(--text-prose); font-size: inherit; }
```
Plus the `--syn-*` rules from §2.10. Add a language label as a `::before` on `pre:has(> code[class*="language-"])`
in `--ui-2xs` / `--text-muted`, top-right — cheap, and it orients the reader.

**Tables** — the current `display: block; overflow-x: auto` is a real bug (it drops table
layout). Replace with a wrapper. In `MarkdownRenderer.jsx`, add a `table` component override
that wraps the table in `<div className="table-scroll">`:
```css
.topic-content .table-scroll { overflow-x: auto; overscroll-behavior-x: contain;
  border: var(--stroke-hair) solid var(--border-subtle); border-radius: var(--radius-md);
  margin-block: var(--space-5); max-width: var(--measure-wide); }
.topic-content table { border-collapse: collapse; width: 100%; font-size: var(--prose-sm); }
.topic-content th { background: var(--bg-raised); color: var(--text-primary); font-weight: 600;
  text-align: left; padding: var(--space-3) var(--space-4); position: sticky; top: 0; }
.topic-content td { padding: var(--space-3) var(--space-4); color: var(--text-prose);
  border-top: var(--stroke-hair) solid var(--border-subtle); }
.topic-content tbody tr:hover { background: var(--bg-raised); }
```

**Blockquotes / callouts** — keep the existing left-rule pattern, retokenized:
```css
.topic-content blockquote {
  background: var(--state-info-tint); border-left: var(--stroke-marker) solid var(--state-info);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  padding: var(--space-4) var(--space-5); margin-block: var(--space-5); color: var(--text-prose);
}
.topic-content blockquote > :first-child { margin-top: 0; }
.topic-content blockquote > :last-child  { margin-bottom: 0; }
```

**Math** — per §2.10. The one addition: `.katex-display` must be `overflow-x: auto` or long
derivations force a horizontal page scroll on mobile.

**Tier headings.** In `MarkdownRenderer.jsx`, the `h2` override already computes an id
(`headingId`). Extend it: if the heading text starts with `🟢`/`🟡`/`🔴`, strip the emoji,
emit `<span className="tier-badge tier-badge--beginner">● Beginner</span>` before the text,
and keep the id derived from the **stripped** text. ⚠ **The id must stay stable** —
`TopicViewer.jsx:15` (`slugify`) and `getSections` compute `beginner-level` from
`🟢 Beginner Level` today via the same emoji-stripping regex. **Verify both produce the same
id after the change or the TOC links break.** `TopicViewer.test.jsx:117` and `:120` assert on
this behaviour and will catch it.

**Loading states.** Give the two `"Loading..."` strings distinct text:
`TopicViewer.jsx:133` → `"Loading topic…"`; `:214` → `"Preparing reader…"`. Both get a skeleton
treatment rather than bare text: three shimmer bars at `--bg-raised`, respecting reduced
motion. ⚠ `TopicViewer.test.jsx:21` asserts `getByText('Loading...')` — see §5.0.

### 4.5 Visualizer embeds in prose flow, and the break-out mechanism

**The break-out.** Prose is capped at `--measure-prose`; diagrams, wide tables, and code need
more. Use a grid-based break-out on `.topic-content` so children opt in by class rather than
by negative margins:

```css
.topic-content {
  display: grid;
  grid-template-columns:
    [full-start] minmax(0, 1fr)
    [wide-start] minmax(0, calc((var(--measure-wide) - var(--measure-prose)) / 2))
    [prose-start] min(100%, var(--measure-prose)) [prose-end]
    minmax(0, calc((var(--measure-wide) - var(--measure-prose)) / 2)) [wide-end]
    minmax(0, 1fr) [full-end];
}
.topic-content > *            { grid-column: prose; }
.topic-content > .mermaid-block,
.topic-content > .table-scroll,
.topic-content > pre,
.topic-content > .topic-embed { grid-column: wide; }
```
This is why `.study-main` needs `min-width: 0`.

**Mermaid blocks:**
```css
.topic-content .mermaid-block {
  background: var(--bg-surface); border: var(--stroke-hair) solid var(--border-subtle);
  border-radius: var(--radius-md); padding: var(--space-5);
  margin-block: var(--space-6); overflow-x: auto; text-align: center;
}
.topic-content .mermaid-block svg { max-width: 100%; height: auto; }
.mermaid-block-loading { color: var(--text-muted); font-size: var(--ui-sm); min-height: 8rem;
  display: grid; place-items: center; }
.mermaid-block-error   { background: var(--state-danger-tint); border-color: var(--state-danger-border); }
.mermaid-error-message { color: var(--state-danger); font-size: var(--ui-sm); margin-bottom: var(--space-3); }
```

**Should visualizers move into the prose?** The audit finding is that Study and Simulation are
separate tabs, so a learner reading about the TCP handshake cannot see the handshake
simulator without losing their scroll position. **Recommendation for a later phase, not this
one:** allow content to place a `<!-- embed:visualizer -->` marker that `MarkdownRenderer`
resolves to a `.topic-embed` block rendering that topic's visualizer inline at `wide` width,
lazily, below the fold. That is a content-pipeline change and belongs in its own plan. For
this revamp, define `.topic-embed` in the grid (above) so the hook exists, and keep the tabs.
**Raise this with the owner; do not build it unprompted.**

### 4.6 Shared simulation primitives

| Component | Changes |
|---|---|
| `ConceptModuleShell.jsx` | Header `h2` → `--prose-h2` / `--font-heading` / `--text-primary`. Subtitle → `--ui-md` / `--text-secondary`. **Mental-model banner: drop the gradient** (§3.5 #8) → `--state-info-tint` + `--stroke-marker` left border in `--state-info` + `--text-prose`. Tabs → real `role="tablist"`. Shorten labels to `Simulation` · `Theory` · `Self-check (n)` with emoji as `aria-hidden`. Remove the inline `maxWidth: '1200px'` in favour of `max-width: var(--shell-max)`. |
| `StepThroughController.jsx` | Chips → `.step-chip` / `.step-chip.is-active` classes (zero inline style; the branch is binary). Active: `--cat-tint` bg, `--cat-base` text and border. Add `role="tablist"` semantics or, better, `<ol>` + `aria-current="step"`. Add left/right scroll shadows on the chip strip so overflow is discoverable. Buttons get `aria-label`s (`"Previous step"`, not `"← Previous Step"`). |
| `StateInspector.jsx` | → `.u-panel-deep` + `MetricTile` primitive. Heading `--ui-md` / `--text-primary`. **Highlight must not be color-only**: add `--stroke-thick` border in `--state-info` *and* an `aria-live="polite"` announcement of the changed value. `transition: all 0.2s` → explicit properties at `--dur-fast`. |
| `QuizCard.jsx` | → `.u-panel` + `--space-5` pad. **Map `difficulty` to a real state color**: `easy`→`--state-success`, `medium`→`--state-warning`, `hard`→`--state-danger`, anything else → `--state-idle`; use `.u-pill-*`. Reveal button → the standard secondary button. Correct/incorrect feedback needs a glyph (`✓` / `✗`), not just color. |
| `CodePanel.jsx` | → `.u-panel-deep`, `--bg-code`. **`fontFamily` → `var(--font-mono)`** (§2.5 step 4). Line numbers `#475569` → `--text-muted` (fixes the 4.24:1 AA failure). Active line: `--state-info-tint` bg + `--stroke-marker` left border in `--state-info` + `--text-primary` text. Fix `select: 'none'` → `userSelect: 'none'`. Add `aria-label` naming the language. |
| `SimulationControlBar.jsx` | Layout → `.u-row-between`. Buttons get `aria-label`s; emoji become `aria-hidden` spans. Speed `<select>` gets a visible `<label>` association (`htmlFor`/`id`), not a bare `<label>`. Play/pause is the only `--cat-base`-filled button on screen; everything else is secondary. |

**Button system** (replaces the eight `.btn-*` variants in `App.css:586-620`):

| Class | Fill | Text | Border | Use |
|---|---|---|---|---|
| `.btn-primary` | `--cat-base` | `--text-inverse` | none | one per view |
| `.btn-secondary` | `--bg-raised` | `--text-primary` | `--border-default` | default |
| `.btn-ghost` | transparent | `--text-secondary` | none | tertiary |
| `.btn-danger` | `--state-danger-tint` | `--state-danger` | `--state-danger-border` | destructive |

All: `min-height: 2.25rem`, `padding: var(--space-2) var(--space-4)`, `--radius-sm`,
`--ui-base`, weight 600, `transition: background-color var(--dur-fast) var(--ease-standard),
border-color var(--dur-fast) var(--ease-standard)`. `:disabled` → `opacity: .5; cursor: not-allowed`.
`:focus-visible` → `box-shadow: var(--elev-focus)`. Touch targets on mobile: `min-height: 44px`.

### 4.7 Responsive behaviour

**Standardize on four breakpoints.** Today there are three inconsistent ones (520 / 780 / 900).

```css
/* --bp-sm: 480px  --bp-md: 768px  --bp-lg: 1024px  --bp-xl: 1280px */
```
(CSS custom properties do not work in media queries; write the pixel values literally and keep
this comment as the reference.)

| Range | Behaviour |
|---|---|
| `≥1280px` | Full layout: rail + prose + break-out to `--measure-wide`. |
| `1024–1279px` | Rail narrows to `13rem`; break-out capped at the available width. |
| `768–1023px` | **Rail moves above the content** as a collapsed `<details>`-style disclosure, defaulting closed. `.study-layout` → single column. Reading progress moves into the sticky topic header as a 2px bar across the full width. |
| `480–767px` | Prose padding `var(--space-4)`. Topic rows become two-line. Nav categories become a scroll strip. All touch targets ≥44px. Tab labels drop to glyph + one word. |
| `<480px` | `--prose-base` stays 17px (do **not** shrink body text); `--prose-h1` drops to `1.75rem`. Tables and code get `-webkit-overflow-scrolling: touch`. |

**The visualizers and Gantt charts below 768px — the hard case.** Three tiers of treatment,
assigned per visualizer:

1. **Reflow (preferred).** Multi-column grids → single column; `FieldGrid` `minmax(11rem,1fr)`
   → `minmax(0,1fr)`. Applies to `StateInspector`, `QuizCard`, the ~20 visualizers that are
   really labelled panels.
2. **Horizontal scroll with an affordance.** For anything with an intrinsically wide timeline
   — the Gantt chart (`.gantt-wrapper`/`.gantt-chart`), the TCP segment bitfield grid, the
   encoding waveforms, the B+ tree. Wrap in `.u-scroll-x`, set a `min-width` on the inner
   element so it does not compress into illegibility, and add a **persistent scroll hint**:
   an edge gradient plus a `--ui-2xs` `--text-muted` caption reading `Scroll to see the full
   timeline →`. Do **not** rely on the scrollbar; it is invisible on mobile.
   ```css
   @media (max-width: 767px) {
     .gantt-wrapper { overflow-x: auto; overscroll-behavior-x: contain; }
     .gantt-chart   { min-width: 34rem; }
     .gantt-wrapper::after { /* right-edge fade */
       content: ''; position: sticky; right: 0; top: 0; height: 100%; width: 2rem;
       background: linear-gradient(to right, transparent, var(--bg-surface)); pointer-events: none; }
   }
   ```
3. **Substitute (last resort).** Where a diagram is genuinely unusable under ~360px — the
   network topology graph, the wait-for/deadlock graph, the multi-router distance-vector
   matrix — render a **tabular equivalent** below 768px and hide the SVG, with a note:
   `Diagram view available on a larger screen.` This is a real, honest fallback; a
   pinch-to-zoom SVG at 360px is not a learning experience. **Codex must list which
   visualizers get tier 3 and get the owner's sign-off before implementing it** — it is the
   only part of this plan that removes functionality on a viewport.

**Never** hide a visualizer on mobile without a substitute. Never set `overflow: hidden` on a
container holding a wide diagram.

### 4.8 Accessibility acceptance bar

Applies to every phase; verified in Phase 7.

- All body text ≥4.5:1; all large text (≥18.66px, or ≥14px bold) ≥3:1. `--text-muted` is
  never used on `--bg-raised` in light mode.
- Every interactive element has a visible `:focus-visible` ring (`var(--elev-focus)`), never
  removed. `App.css` already has a `button:focus-visible, a:focus-visible, [tabindex]:focus-visible`
  rule — keep it and retokenize.
- Tabs, step chips, and the TOC are keyboard-navigable with arrow keys where they are
  `tablist`s; `Tab`/`Shift+Tab` order follows visual order everywhere.
- No information conveyed by color alone — every instance of a colored state also has a glyph
  or a text label (§2.4, §2.8, §4.6).
- Simulator state changes announce via `aria-live="polite"` on a single status region per
  visualizer. Do **not** put `aria-live` on every cell.
- All decorative emoji are `aria-hidden="true"` and paired with real text.
- Touch targets ≥44×44px below 768px.
- `prefers-reduced-motion` zeroes every duration token (already handled in §2.1) **and**
  pauses auto-playing simulations by default.

---

## 5. Phased rollout

Nine phases. **Each is one PR. Each ends at a stop-and-review checkpoint — do not start the
next phase until the owner approves the previous one.**

### 5.0 Test-breakage reality check — read before Phase 1

The audit found the risk is much lower than the brief assumed. **Exactly three assertions in
the whole suite depend on presentation:**

| Test | Line | Assertion | Risk |
|---|---|---|---|
| `pages/__tests__/TopicPage.test.jsx` | 27, 41, 45 | `studyBtn.className` contains `active-tab` | **Keep the class name `active-tab`.** Changing it means updating three lines; keeping it costs nothing. Keep it. |
| `components/__tests__/TopicViewer.test.jsx` | 21 | `getByText('Loading...')` | Breaks when §4.4 renames the loading strings. **Update the test to the new string; do not delete it.** |
| `components/__tests__/TopicViewer.markdown.test.jsx` | 41, 99, 116 | `querySelectorAll('pre, code, .mermaid-block')`, `.katex`, `blockquote` | Only breaks if you rename `.mermaid-block` or stop emitting `<blockquote>`. **Do neither.** |

Everything else — `Navbar.test.jsx`, `HomePage.test.jsx`, `ConceptModuleShell.test.jsx`, the
four visualizer suites, all 26 engine suites — queries by role, accessible name, or text
content. Those tests will **survive a full restyle** and will **correctly fail** if you break
semantics, which is exactly what you want.

**Two rules for the whole rollout:**
1. **Never delete a test to make a phase green.** If a test fails, either the change is wrong
   or the assertion needs updating to the new correct behaviour. Update the assertion, in the
   same commit, with a comment saying why.
2. **Adding ARIA roles will break nothing and may fix things** — `getByRole('tab')` queries do
   not exist yet, so converting `.main-tab-switcher` to a real tablist is safe. Add new tests
   for the new semantics.

Baseline before starting: `npm test --prefix frontend` and `mvn test -f backend/pom.xml` must
both be green, and `npm run build --prefix frontend` must succeed. **Record the main-chunk
size from that build** — it is the regression baseline for §5.10.

⚠ **The frontend suite takes ~9 minutes on WSL** because `node_modules` is on `/mnt/c`. While
iterating, run one suite: `npx vitest run src/components/__tests__/TopicViewer.test.jsx`. Run
the full suite once per phase, before the checkpoint.

---

### Phase 1 — Tokens and theming foundation

**Goal:** the token system exists and the app renders identically to today. No visual change
is the success criterion.

**Files:**
- `frontend/src/App.css` — replace lines 1–18 with the §2.1 block; add the `[data-category]`
  rules from §2.4; add the `@font-face` declarations from §2.5; add the `/* Utilities */`
  section from §3.2. **Do not yet change any existing rule below the token block** except to
  redirect the deleted legacy tokens (see below).
- `frontend/index.html` — full head per §4.1.2 including the theme bootstrap script.
- `frontend/public/fonts/*.woff2` — three new files.
- `frontend/public/favicon.svg`, `frontend/public/apple-touch-icon.png` — new.
- `frontend/src/hooks/useTheme.js` — new.

**Legacy token bridge.** 185 existing rules reference `--bg-dark`, `--bg-card`, etc. Do not
rewrite them in this phase. Add a compatibility shim immediately after the token block:
```css
:root {
  --bg-dark: var(--bg-page);   --bg-card: var(--bg-surface);
  --bg-card-hover: var(--bg-raised); --border-color: var(--border-default);
  --accent-purple: var(--cat-os-base); --accent-blue: var(--state-info);
  --accent-green: var(--state-success); --accent-amber: var(--state-warning);
  --accent-red: var(--state-danger);    --accent-pink: var(--cat-aiml-base);
  --font-main: var(--font-body);
}
```
This shim is **deleted in Phase 8**, and each phase removes the legacy names from the files it
touches. It is what makes the phases independently shippable.

**Acceptance criteria:**
- `npm run build` succeeds; main-chunk size within +2 KB of baseline (fonts are in `public/`,
  not the bundle).
- Toggling `document.documentElement.dataset.theme` in devtools visibly switches the palette,
  even though the toggle UI does not exist yet.
- No FOUC on reload in either theme (verify with devtools throttled to Slow 3G).
- Font swap produces zero layout shift (DevTools → Rendering → Layout Shift Regions).
- Zero visual diff in dark mode against the pre-phase screenshots.

**Tests likely to break:** none. **Run the full suite anyway** — this phase touches the file
every component depends on.

**🛑 Checkpoint 1:** Owner reviews the palette in devtools (both themes) and approves the font
choice before ~117 KB of font files are committed. Also resolves §2.9 (framer-motion).

---

### Phase 2 — Global shell: Navbar, layout, theme toggle

**Files:** `frontend/src/components/Navbar.jsx` · `frontend/src/hooks/useTheme.js` ·
`frontend/src/App.jsx` (if the theme provider mounts there) · `frontend/src/App.css`
(navbar + `.app` + `.main-content` sections, `App.css:34-90`) ·
`frontend/src/components/__tests__/Navbar.test.jsx`.

**Work:** §4.1 in full — five category links, active state, sticky, theme toggle, logo fix.

**Acceptance criteria:**
- All five categories reachable from the navbar.
- Theme toggle persists across reloads and respects the system preference on first visit.
- Navbar is keyboard-navigable; the active link has `aria-current="page"`.
- Below 768px, category links scroll horizontally without the page scrolling horizontally.
- Logo renders in Firefox (the `background-clip` fix).

**Tests likely to break:** `Navbar.test.jsx:12-25` asserts `getByText('OS')` and its href
`/topic/process-management`. The label becomes `◆ OS` and the href may change.
**How to update:** change the query to `getByRole('link', { name: /OS/ })` and assert the new
href. **Add** tests for the theme toggle (`getByRole('button', { name: /switch to light/i })`)
and for `aria-current`. Do not delete the existing assertions — retarget them.

**🛑 Checkpoint 2:** Owner reviews the shell in both themes on desktop and a 375px viewport.

---

### Phase 3 — HomePage

**Files:** `frontend/src/pages/HomePage.jsx` · `frontend/src/App.css` (`:91-179` HomePage
section, `:322-477` roadmap section) · `frontend/src/pages/__tests__/HomePage.test.jsx`.

**Work:** §4.2 in full, plus the `.tier-badge` component from §2.8.

**Acceptance criteria:**
- Category filter buttons show topic counts and adopt the category accent when active.
- Every topic row has a category-colored left rail whose *border style* also encodes the
  category (§2.4).
- Level badges use glyph + label, not color alone.
- The level filter works and combines with the category filter; a zero-result combination
  shows an empty state.
- No raw hex remains in `HomePage.jsx`.
- The inline fallback topic array is byte-identical to before (§3.5 #9) — verify with
  `git diff`.

**Tests likely to break:** `HomePage.test.jsx:71` asserts `getByText('Beginner')`. The badge
becomes `● Beginner`; `getByText` with an exact string will fail.
**How to update:** `getByText(/Beginner/)` or query the badge by its `aria-label`. Lines
38-40, 56-64, 72 (role- and href-based) should all survive unchanged — if they break, the
markup change went too far. **Add** a test for the new level filter.

**🛑 Checkpoint 3:** Owner reviews HomePage in both themes, at 1440px and 375px, and confirms
the five category accents are distinguishable to them.

---

### Phase 4 — TopicPage reading experience

The highest-value phase. Do not compress it.

**Files:** `frontend/src/pages/TopicPage.jsx` · `frontend/src/components/TopicViewer.jsx` ·
`frontend/src/components/markdown/MarkdownRenderer.jsx` ·
`frontend/src/components/markdown/MermaidBlock.jsx` · `frontend/src/utils/topicCategories.js`
(new — extracted `CATEGORY_MAP`) · `frontend/src/App.css` (`:180-321` topic header,
`:478-500` refinements — **delete**, `:1247-1420` topic content — **rebuild**) ·
`frontend/src/components/__tests__/TopicViewer.test.jsx` ·
`frontend/src/components/__tests__/TopicViewer.markdown.test.jsx` ·
`frontend/src/pages/__tests__/TopicPage.test.jsx`.

**Work:** §4.3, §4.4, §4.5, plus the Mermaid/hljs/KaTeX retheming in §2.10.

**Order within the phase:** (a) delete the dead `.topic-content` block and rebuild the live
one; (b) typography and measure; (c) code/table/callout/math treatments; (d) the grid
break-out; (e) tier badges in `MarkdownRenderer`; (f) Mermaid theme-reactivity; (g) hljs
token rules; (h) sticky header and real tabs.

**Acceptance criteria:**
- `.topic-content` is declared exactly once in `App.css`.
- Body prose renders at `--text-prose` (verify in devtools — this is the §0.4 bug fix).
- Measure is 68ch; diagrams, tables, and code break out to 96ch.
- Mermaid diagrams re-render correctly on theme toggle **without a page reload** (§2.10).
- Code fences follow the theme (no `github-dark.css` import remains).
- Tier headings show a `.tier-badge` and their **anchor ids are unchanged** — click every TOC
  entry on three topics from different categories.
- Tabs are a real `tablist` with arrow-key navigation.
- On a 375px viewport, no horizontal page scroll on any of: `content/dbms/06-transactions-acid.md`,
  a topic with a wide table, a topic with block math.

**Tests likely to break:**
- `TopicViewer.test.jsx:21` — `getByText('Loading...')`. **Update** to the new string
  (`/Loading topic/i`).
- `TopicViewer.test.jsx:117, 120` — assert the heading name `/beginner level/i` and the
  button name `/continue reading at beginner level/i`. If tier-badge insertion changes the
  heading's accessible name, these fail. **That is a real signal** — the accessible name
  should stay `Beginner Level`; put the badge glyph in an `aria-hidden` span.
- `TopicViewer.markdown.test.jsx` — the 56-file golden suite. It should pass untouched. If it
  fails, you have changed what renders, not just how it looks. **Investigate; do not relax
  the assertions.**
- `TopicPage.test.jsx:27,41,45` — survive as long as `active-tab` is kept.

**🛑 Checkpoint 4:** Owner reads a full topic end-to-end in both themes and signs off on
legibility. This is the checkpoint that matters most.

---

### Phase 5 — Visualizer shell and simulator primitives

**Files:** all six of `frontend/src/components/shared/*.jsx` · five new primitives from §3.3 ·
`frontend/src/App.css` (`:501-620` visualizer container/cards/controls/buttons) ·
`frontend/src/components/__tests__/ConceptModuleShell.test.jsx`.

**Work:** §4.6 in full, plus the button system.

**Acceptance criteria:**
- Zero raw hex in `components/shared/`.
- `CodePanel` uses `var(--font-mono)` and JetBrains Mono actually renders.
- Line numbers pass AA.
- `QuizCard` difficulty maps to a real state color plus a glyph.
- `StateInspector` highlight is not color-only and announces via `aria-live`.
- The four button variants replace the eight `.btn-*` classes; every existing usage still
  resolves (grep for `btn-` across all 47 visualizers and map each).

**Tests likely to break:** `ConceptModuleShell.test.jsx:39` clicks
`getByText(/Deep Dive & Interview Theory/i)` — the label becomes `Theory`.
**How to update:** `getByRole('tab', { name: /theory/i })`. The other assertions
(:40-45, :52-81) are content-based and survive. **Add** a test asserting the tablist
semantics.

**🛑 Checkpoint 5:** Owner reviews three visualizers (one OS, one networking, one Java) in
both themes.

---

### Phase 6 — Bulk inline-style migration

The long one. **Split into the eight sub-commits from §3.6**, each independently reviewable.
Do not open one PR with 41 changed files.

**Files:** the 41 files listed in §0.3 and §3.6, plus `App.css` (growing the utilities and
component classes as patterns emerge).

**Method, per file:**
1. Run the bucket-C grep from §3.1 on the file; note which blocks must stay inline.
2. Replace bucket-A blocks with classes; add the class to `App.css` if it does not exist.
3. Replace bucket-B blocks with the shared primitive from §3.3.
4. In whatever remains inline, replace every literal with `var(--token)` per §3.4.
5. Check §3.5 for any caveat that applies to this file.
6. `grep -c "#[0-9a-fA-F]\{3,8\}"` → 0 (or only verified non-colors).
7. Run that visualizer's test suite if it has one; screenshot both themes.

**Acceptance criteria (end of phase):**
- `grep -r "#[0-9a-fA-F]\{3,6\}" frontend/src --include='*.jsx'` returns only the verified
  non-color literals from §3.5 #4.
- `grep -rc "style={{" frontend/src --include='*.jsx'` totals **≤160** (the bucket-C floor).
- Bundle size within +5 KB of the Phase 1 baseline. (It should *shrink* — 1049 inline objects
  are allocated on every render.)
- All 38 test files pass.

**Tests likely to break:** the four visualizer suites
(`DbmsVisualizer`, `DbmsIndividualVisualizers`, `JavaSpringVisualizer`,
`NetworkingVisualizer`, `SchedulingVisualizer`). All query by text/role, so they break only if
you change markup structure. **If one breaks, check whether you restructured JSX rather than
restyling it** — restructuring is out of scope for this phase.

**🛑 Checkpoint 6:** Owner spot-reviews four files across four categories. Given the size,
propose a mid-phase checkpoint after sub-commit 4 (`visualizers/java/*`).

---

### Phase 7 — Responsive and accessibility pass

**Files:** `frontend/src/App.css` (all five existing media queries — **rewrite at the
standard breakpoints from §4.7**) · every visualizer needing a tier-2 or tier-3 treatment ·
`frontend/src/components/TopicViewer.jsx` (rail disclosure below 1024px).

**Work:** §4.7 and §4.8 in full.

**Acceptance criteria:**
- Zero horizontal page scroll at 320px, 375px, 768px, 1024px, 1440px on: HomePage, a topic
  page from each of the five categories, and each of the five category hubs.
- Every Gantt/timeline/bitfield/waveform visualizer has a visible scroll affordance below
  768px.
- The tier-3 substitution list is approved by the owner and each substituted visualizer has a
  tabular equivalent.
- Lighthouse accessibility ≥95 on HomePage and a topic page, in both themes.
- Full keyboard traversal of a topic page — nav → breadcrumb → tabs → TOC → prose links →
  interview deck — with a visible focus ring at every stop.
- `prefers-reduced-motion: reduce` stops all transitions and auto-play.
- axe DevTools: zero critical or serious violations.

**Tests likely to break:** none expected. **Add** tests: reduced-motion behaviour, and
`getByRole` coverage for the newly-semantic controls.

**🛑 Checkpoint 7:** Owner tests on a real phone.

---

### Phase 8 — Documentation and cleanup

**Files:** `AGENTS.md` · `CONTEXT.md` · `CLAUDE.md` · `README.md` · `frontend/src/App.css` ·
`frontend/package.json` · a new `docs/DESIGN_SYSTEM.md`.

**Work:**
1. **`AGENTS.md:10` — delete the false "CSS Modules" claim.** Replace that line with:
   ```
   - **Styling**: Vanilla CSS in a single global `src/App.css`, driven by design tokens in `:root` / `[data-theme]`. No CSS Modules, no CSS-in-JS, no utility framework. See `docs/DESIGN_SYSTEM.md`.
   ```
2. `AGENTS.md:171` — update the `App.css` description to reflect the token block and utilities.
3. `CLAUDE.md` "Conventions" — the styling bullet says "vanilla CSS (dark glassmorphism tokens
   in `src/App.css`) plus inline styles inside shared shells". Update: tokens are the contract,
   inline styles are for computed values only, and both themes must be checked.
4. `CONTEXT.md` — the "shared dark palette" paragraph in the Reading Experience Roadmap
   assumes dark-only. Rewrite for two themes and point at the design system doc.
5. `README.md:99` — `CSS Modules & Modern Animations` is also false. Fix.
6. **Delete the legacy token shim** from Phase 1 and the 36 dead classes from §0.4.
7. Resolve §2.9 — `npm uninstall framer-motion` if the owner chose (A).
8. **New `docs/DESIGN_SYSTEM.md`** — the token reference, the hex→token table (§3.4), the
   CVD/redundant-encoding rule (§2.4), the responsive tiers (§4.7), and the a11y bar (§4.8).
   This is what future contributors and agents read instead of this plan.

**Acceptance criteria:**
- No document in the repo claims CSS Modules.
- Deleting the shim breaks nothing (`grep -r "\-\-bg-card\|--accent-purple\|--font-main"
  frontend/src` returns zero).
- Deleting the 36 dead classes breaks nothing. ⚠ **Verify each against the visualizers before
  deleting** — the §0.4 list was derived by grepping `.jsx` for the bare class name; a class
  built dynamically (`` className={`btree-${level}`} ``) would not be found. Grep for the
  stem, not the full name, before removing.
- Full suite green; production build succeeds; bundle ≤ Phase 1 baseline.

**🛑 Checkpoint 8 (final):** Owner reviews the design-system doc and the full app.

---

## 6. Owner decisions

The owner approved implementation on 2026-08-30. Where the approval did not select an
option explicitly, the plan's recommendation is authoritative:

1. **framer-motion:** remove the installed-but-unused dependency.
2. **Fonts:** use all three recommended self-hosted families.
3. **Category routes:** link each navbar category to its first registered topic; no category
   route exists today.
4. **Search:** omit the control until functional cross-topic search is implemented.
5. **Inline visualizer embeds:** add the layout hook only; defer the content marker pipeline.
6. **Tier-3 mobile substitutions:** none are approved yet. Preserve functionality and use
   reflow or labelled horizontal scrolling until a separate substitution list is approved.
7. **Initial theme:** follow the system preference and fall back to dark.

---

## 7. Definition of done for the whole revamp

- [ ] Zero raw hex outside the `:root` / `[data-theme]` blocks in `App.css`.
- [ ] Zero raw hex in any `.jsx` (excluding the verified non-color literals).
- [ ] `style={{` count ≤160, all computed.
- [ ] Both themes ship, persist, and follow the system preference on first visit.
- [ ] Mermaid, highlight.js, and KaTeX all follow the active theme.
- [ ] JetBrains Mono actually loads; zero layout shift from font swap.
- [ ] Every category-, state-, and tier-coded element carries a non-color signal.
- [ ] All body text ≥4.5:1 in both themes; long-form prose ≥7:1.
- [ ] Zero horizontal page scroll at 320px on every route.
- [ ] All 38 test files pass; none were deleted; new tests cover the new semantics.
- [ ] Backend suite untouched and green (this revamp touches no Java).
- [ ] Bundle main chunk ≤ the Phase 1 baseline.
- [ ] `AGENTS.md`, `CONTEXT.md`, `CLAUDE.md`, and `README.md` all describe the real styling
      architecture.
- [ ] `docs/DESIGN_SYSTEM.md` exists and is the reference future agents read.

---

**Approval recorded. Implement the phases in order and keep every phase independently testable.**
