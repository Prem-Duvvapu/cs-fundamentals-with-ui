# CS Fundamentals Design System

## Purpose

The reading experience is the product. The visual system therefore prioritizes comfortable
long-form typography, predictable navigation, accessible state communication, and responsive
simulators. `frontend/src/App.css` is the single styling source; components do not use CSS Modules,
CSS-in-JS, or a utility framework.

## Theme and token contract

Dark mode tokens live in `:root`; `[data-theme="light"]` overrides their values. Components use
semantic tokens rather than literal colours:

| Role | Tokens |
|---|---|
| Surfaces | `--bg-page`, `--bg-surface`, `--bg-raised`, `--bg-code`, `--bg-inset` |
| Text | `--text-primary`, `--text-prose`, `--text-secondary`, `--text-muted` |
| Borders | `--border-subtle`, `--border-default`, `--border-strong`, `--border-focus` |
| Category | `--cat-base`, `--cat-hover`, `--cat-tint`, `--cat-border` |
| State | `--state-success`, `--state-warning`, `--state-danger`, `--state-info`, `--state-idle` |
| Learning tiers | `--tier-beginner`, `--tier-intermediate`, `--tier-expert` and matching tint/border tokens |
| Syntax | `--syn-keyword`, `--syn-string`, `--syn-number`, `--syn-comment`, and related tokens |
| Product actions | `--action-bg`, `--action-bg-hover`, `--action-fg`, `--action-text`, `--action-tint`, `--action-border` |
| Controls | `--control-bg`, `--control-bg-hover`, `--control-border` |

Set `data-category` on the closest page or section that knows its category. Descendants then consume
the generic `--cat-*` tokens. A runtime success state must use `--state-success`, not a category token.
Primary product actions use the `--action-*` tokens in every context; category colour identifies a
category and never decides what a button means.
Raw colour literals belong only in the theme token blocks.

The `useTheme` hook stores an explicit choice under `cs-fundamentals-theme`. With no saved value,
the app follows `prefers-color-scheme`. It dispatches `cs-fundamentals:theme-change`. Mermaid blocks select prebuilt theme assets without a reload; regenerate those assets after token changes.

## Typography and layout

- Headings: Inter Tight through `--font-heading`.
- Reading text: IBM Plex Sans through `--font-body`.
- Code: JetBrains Mono through `--font-mono`; ligatures stay disabled for teaching clarity.
- Prose follows the reader preference (16/18/20px, standard 18px) with a 68ch measure computed at that
  size. Lesson headings scale with it. Code blocks keep the prose column; Mermaid diagrams and tables
  may use the rest of the article column and scroll locally.
- Static presentation belongs in a class. Inline styles are allowed only for values computed from
  runtime data, such as progress width, timeline position, or diagram geometry.

## Redundant communication

Colour is never the only signal. Category badges use a glyph and label: `◆ OS`, `⬡ NET`, `▤ DB`,
`◐ JAVA`, and `✳ AI/ML`. Learning tiers use `● Beginner`, `◐ Intermediate`, and `◆ Expert`.
Success, warning, danger, and informational feedback includes text or a glyph as well as colour.

## Responsive behavior

The standard breakpoints are 480px, 768px, 900px (global navigation only), 1024px, and 1280px. The
lesson header stays in document flow at every width; only the global navigation bar is sticky, and the
category rail scrolls independently beneath it. Below 1024px the rail becomes a closed-by-default
"Show topics" disclosure above the article. Below 900px the navigation collapses to brand, Search and
Menu. Below 768px bookmark/completion become 44px icon buttons beside the breadcrumb, view tabs share
the width, and panel grids reflow to one column. Intrinsically
wide teaching surfaces scroll horizontally with an affordance; functionality is never hidden
without an equivalent view.

`TopicPage` is the owner of the single visible and semantic H1. Curriculum Markdown H1 text is
metadata for standalone source readability and is not rendered a second time inside the page.

All interactive targets are at least 44px high on mobile. Pages must not introduce horizontal page
scroll at 320px, 375px, 768px, 1024px, or 1440px.

## Accessibility and motion

- Preserve visible `:focus-visible` rings and logical keyboard order.
- Tabs use `tablist`, `tab`, and `tabpanel` relationships plus arrow/Home/End navigation.
- Essential text meets WCAG AA; long-form prose uses the higher-contrast `--text-prose` token.
- A single `aria-live="polite"` region announces simulator changes where needed.
- Motion uses the `--dur-*` and `--ease-*` tokens. Reduced-motion preference zeroes durations and
  disables decorative animation.

Primary references: [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/),
[MDN media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using), and
[Mermaid theming](https://mermaid.js.org/config/theming.html).

Simulator action buttons use a high-contrast light-theme fill, warning text uses a darker light-theme token on inset surfaces, and the active OS state badge uses the theme-aware inverse text color. The browser axe harness waits for the applied theme and lazy simulation to prevent a false pass.

## Saved-answer manager

The Progress page's `.saved-answers` section uses the existing surface, border, focus and
spacing tokens. Keep review/all filters, each question's exact Practice link, alternate-draft
comparison, and two-step destructive-action confirmation visible and keyboard operable. The
current and alternative drafts stay separate in storage and remain exportable after adoption.

## Charcoal dark mode — October 3

The dark theme follows the requested LeetCode-inspired neutral direction: page `#1a1a1a`,
article/cards `#262626`, raised controls `#333333`, and code `#202020`. Prose uses `#d6d6d6`
and secondary/muted text stays readable on every neutral surface. Category colors are restrained
accents; Java and the brand glyph use warm amber, while dark logo text stays neutral.
These are this project's palette choices, not an exact reproduction of LeetCode's CSS.

Selection and scrollbar colors are theme tokens with explicit light overrides. Native scrollbars
keep their normal width and behavior. Editable controls, summaries and interactive links/buttons
receive a visible keyboard focus outline. Code-toolbar hover exposes click targets. Syntax
comments meet the same 4.5:1 contrast bar as code rather than becoming nearly invisible.

`AppThemeStyles.test.js` checks text/syntax/action contrast mathematically in both themes;
`scripts/test-responsive-layout.mjs` verifies the rendered dark surface, keyboard theme switching,
choice persistence across reload, responsive pages and axe findings. Generated diagrams must be
rendered and browser-decoded after CSS changes, including changes affecting their fingerprints.
Automated checks support this design; they do not establish universal preference or replace
manual reader feedback.

Desktop previews: [home](previews/charcoal-dark-home.png) and
[reader](previews/charcoal-dark-reader.png). Screenshots use the canonical catalog/content
with API fixtures; they demonstrate presentation rather than real-backend integration.

Release verification: 711/711 frontend tests, 59/59 platform backend tests, production build,
590/590 diagram browser decodes, thirteen route families at five widths in both themes and
sixteen axe scans pass with no violations. Keyboard theme switching and reload persistence
are included. The checks run against API fixtures for browser presentation; real learner
preference, zoom/reduced-motion coverage and comprehension remain separate evidence.

## Category reader rail — October 4

The rail groups section links beneath each lesson in canonical category order. A lesson's
text link navigates; its separate labelled chevron button expands/collapses the nested list.
Current lesson and current section use distinct `aria-current` values and theme-token accents.
Use normal list/link/button semantics rather than declaring a keyboard tree widget. Preserve
independent vertical scrolling on desktop, the closed-by-default mobile panel, a bounded
mobile outline area and 44px mobile targets. Focus reading remains an explicit escape from
the rail. The same curriculum navigation is available alongside topic Practice.

Opening a lesson also reveals its row within the scrollable rail without scrolling the article.

## October 5 refinement — current component system

This section describes delivered behaviour and supersedes conflicting older guidance above
(see `UI_UX_REFINEMENT_PLAN_2026-10-05.md` and `docs/UI_UX_REFINEMENT_RESULTS_2026-10-05.md`).

**Themes.** Dark keeps the charcoal hierarchy (`#1a1a1a` page, `#262626` surface, `#333333` raised,
`#202020` code). Light is now neutral rather than cool blue-grey: `#f7f7f8` page, white reading and
card surfaces, `#f0f1f3` raised controls, near-black `#18181b` text and `#5c5c66` muted text (at least
5.76:1 on every neutral surface). Primary actions are warm amber: `#f0a34a` with charcoal text in dark
(8.3:1), `#b45309` with white text in light (5.0:1). `AppThemeStyles.test.js` checks these pairs.

**Spacing.** One monotonic scale: `--space-1`…`--space-10` = 4, 8, 12, 16, 24, 32, 40, 48, 64, 96px,
each defined once (a test enforces this). Raw colour literals live only in the theme blocks; even the
white Gantt label text is a token (`--text-on-chart`).

**Buttons.** `.ui-button` with `--primary` (one per task area), `--secondary`, `--quiet` and
`--danger`; `--compact` for dense rows. Disabled buttons keep readable muted text on an inset fill.
Labels that name a lesson may wrap. Simulators keep their existing `.btn-*` classes.

**Icons.** `components/shared/Icon.jsx` is the only icon source for application controls: inline
24px stroke SVGs, `aria-hidden`, with the accessible name on the control. Emoji inside curriculum
Markdown and simulator copy are content and were not swept.

**Navigation.** Brand, Search (Ctrl/⌘ K), a Learn disclosure listing all learning paths and the six
categories in canonical order, Interview Mode, Progress, a Help disclosure (Take a tour of the app,
shortcut note) and an icon theme switch. Disclosures are nonmodal (`hooks/useDisclosure.js`): Escape
closes the innermost one and returns focus to its trigger; a pointer press or focus outside closes it.
The current page shows a background plus an amber underline, never colour alone.

**Lesson header and reader.** Breadcrumb, title (24–32px), bookmark/completion, outcome with an optional
"Before you start (n)" disclosure, then Study / Simulation / Practice. One toolbar row holds the
level jumps and a Reading options disclosure (text size as a three-option radio group, Focus reading
with a visible Exit control, study help). The article is a single reading surface; the rail recedes
onto the page background. The lesson end offers Practise this lesson, previous/next links and an
explicit "Mark lesson complete" that stays in sync with the header control.

**Category rail.** Every lesson in the category in canonical order, each with a separate link and
chevron. Level headings are uppercase group labels; subsections indent beneath them. The current
lesson has bold text, a background and an amber edge (`aria-current="page"`); the current section has
an amber edge and tint (`aria-current="location"`). Pinned tools: a category-local search over lesson
titles and loaded section headings (matches show their level and keep a "Show all sections" escape)
and Collapse all. Search expansion is a temporary overlay: clearing restores the learner's own
expansion; the query survives lesson remounts and resets on category change. Expansion choices live in
`TopicExpansionProvider` outside the pathname-keyed boundary, and an explicit collapse is never undone.

**Browsing.** Home leads with Resume (with honest saved time) or Start here, then six learning-path
cards and a "Browse all lessons" disclosure holding the filtered roadmap, which opens automatically for
filter URLs. Category pages and bookmarks share `LessonRow`: a single title link, outcome, level /
Simulation / Completed tags, and a separate bookmark button. Search results put the lesson title link,
category, matched section and excerpt together.

**Practice and Progress.** Practice reads question → optional draft → Reveal answer (primary) → model
answer and checklist → self-assessment → Record this attempt (primary once rated and revealed) → quiet
Previous / secondary Next. Progress leads with Continue (resume, next lesson, reviews due), then
bookmarks, completion by category and level, saved answers, and backups (full learning backup plus
the older lesson-progress format).

**Simulators.** Shared containment: `.viz-card` scrolls locally, controls and selects may shrink, and
fixed `minmax(320px, 1fr)` grids became `minmax(min(100%, 320px), 1fr)`. All 36 registered simulator
views are swept at 320px and scanned with axe in both themes by `scripts/test-responsive-layout.mjs`.
