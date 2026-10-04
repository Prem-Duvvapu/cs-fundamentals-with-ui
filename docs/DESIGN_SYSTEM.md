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
the app follows `prefers-color-scheme`. It dispatches `cs-fundamentals:theme-change`. Mermaid blocks select prebuilt theme assets without a reload; regenerate those assets after token changes.

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

The standard breakpoints are 480px, 768px, 1024px, and 1280px. At desktop widths the topic header
condenses to a one-line sticky toolbar after scrolling, and the TOC rail accounts for both navbar
and toolbar offsets. Below 1024px the TOC moves above the article and defaults collapsed. Below
768px the topic header remains in document flow, navigation uses a compact Menu control for category links,
topic actions become full-width touch targets, and panel grids reflow to one column. Intrinsically
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
