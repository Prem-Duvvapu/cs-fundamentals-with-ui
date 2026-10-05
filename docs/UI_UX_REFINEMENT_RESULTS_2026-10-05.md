# UI/UX refinement — results and evidence (October 5)

Living record for [`UI_UX_REFINEMENT_PLAN_2026-10-05.md`](../UI_UX_REFINEMENT_PLAN_2026-10-05.md).
Items stay unchecked until verified. Evidence types are labelled:
**fixture** = built frontend in Chromium with the canonical catalog, real lesson Markdown and API
fixtures (`scripts/lib/ui-fixtures.mjs`); **backend** = real Spring Boot API; **unit** = Vitest/JUnit.
No participant usability sessions were run; nothing here is learner-comprehension evidence.

## Step 1 — Baseline

- Branch `feat/2026-10-05-ui-ux-refinement` from `main` at `ec78646`. Preserved uncommitted handoff
  files: this plan, the Opus prompt, `docs/previews/ui-ux-baseline-2026-10-05/` and the README note.
- Environment: WSL2 Linux, Node 24.21.0, Java 17.0.20, Maven 3.8.7, Playwright Chromium 1243.
- Reproducible previews: `npm run build --prefix frontend && node scripts/capture-ui-previews.mjs <dir>`
  captures 11 routes × desktop 1440×960 / mobile 375×960 × both themes (44 images) and writes
  `metrics.json` (article start, first paragraph, prose measure, overflow, page errors). The script
  shares its fixture server with `scripts/test-responsive-layout.mjs`.

### Baseline measurements (fixture, `ec78646` + harness refactor only)

| Route | Desktop article top | Mobile article top | Notes |
|---|---|---|---|
| Java Execution Pipeline | 426px | 570px | Matches the plan's baseline |
| Spring MVC (long title) | 490px | 659px | Prerequisite disclosure adds height |
| CPU Scheduling (OS) | 490px | 633px | |

Other baseline findings:

- Prose paragraphs render at **17px at every reader-size setting**: `.topic-content p, li` used the fixed
  `--prose-base` token, so the 16/18/20px preference did not reach paragraphs. The measured prose line was
  about 75ch rather than the intended 68ch, because the measure was computed at the article's 18px.
- `light mobile simulation` (CPU scheduling, 375px) produced horizontal page overflow; dark did not.
- Navigation icons are emoji and render as missing-glyph boxes in the headless Chromium preview; the
  logo text collides with the first navigation item at 1440px.
- Two stacked control rows (reading settings/focus/help, then level jumps) precede the article.
- The spacing scale was non-monotonic: a late `:root` block redefined `--space-6` as 24px and
  `--space-8` as 32px while `--space-7` remained 40px.
- Practice shows self-assessment and "Record this attempt" before the primary Reveal action, and
  Previous/Next share the filled primary treatment (including a disabled filled Previous).

## Checklist

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Reproducible baseline and measurements | Done | Above; fixture |
| 2 | Foundation tokens, buttons, SVG icons, monotonic spacing | Pending | |
| 3 | Compact navigation (desktop Learn/Help disclosures, single-row mobile menu) | Pending | |
| 4 | Reader pilot: header, Reading options, level jumps, article surface | Pending | |
| 5 | Reader density: desktop ≤330px, mobile ≤450px article start | Pending | |
| 6 | Full-category rail: hierarchy, Collapse all, category search | Pending | |
| 7 | Home, category and search refinement; roadmap filter URLs | Pending | |
| 8 | Practice, Interview, Review and Progress refinement | Pending | |
| 9 | Retained simulators checked under shared CSS | Pending | |
| 10 | Accessibility, contrast, zoom/reflow, reduced motion, keyboard | Pending | |
| 11 | Diagrams regenerated, checked and decoded | Pending | |
| 12 | Docs updated; CI green; PR merged | Pending | |
