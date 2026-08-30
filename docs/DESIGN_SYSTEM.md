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

Set `data-category` on the closest page or section that knows its category. Descendants then consume
the generic `--cat-*` tokens. A runtime success state must use `--state-success`, not a category token.
Raw colour literals belong only in the theme token blocks.

The `useTheme` hook stores an explicit choice under `cs-fundamentals-theme`. With no saved value,
the app follows `prefers-color-scheme`. It dispatches `cs-fundamentals:theme-change`, allowing mounted
Mermaid diagrams to re-read live CSS tokens and render without a reload.

## Typography and layout

- Headings: Inter Tight through `--font-heading`.
- Reading text: IBM Plex Sans through `--font-body`.
- Code: JetBrains Mono through `--font-mono`; ligatures stay disabled for teaching clarity.
- Prose is 17px with a 68ch measure. Code, Mermaid diagrams, and table wrappers may break out to 96ch.
- Static presentation belongs in a class. Inline styles are allowed only for values computed from
  runtime data, such as progress width, timeline position, or diagram geometry.

## Redundant communication

Colour is never the only signal. Category badges use a glyph and label: `◆ OS`, `⬡ NET`, `▤ DB`,
`◐ JAVA`, and `✳ AI/ML`. Learning tiers use `● Beginner`, `◐ Intermediate`, and `◆ Expert`.
Success, warning, danger, and informational feedback includes text or a glyph as well as colour.

## Responsive behavior

The standard breakpoints are 480px, 768px, 1024px, and 1280px. Below 1024px the reader TOC moves
above the article. Below 768px navigation becomes a horizontal category strip, topic actions become
full-width touch targets, and panel grids reflow to one column. Intrinsically wide teaching surfaces
scroll horizontally with an affordance; functionality is never hidden without an equivalent view.

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
