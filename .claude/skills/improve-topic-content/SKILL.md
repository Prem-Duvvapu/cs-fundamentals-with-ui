---
name: improve-topic-content
description: Improve or extend the 3-tier Markdown educational content for a cs-fundamentals topic (content/<category>/*.md) — depth, accuracy, interview Q&As — while staying inside the hand-rolled Markdown renderer's supported subset. Use when the user asks to improve, expand, rewrite, deepen, or fix the theory/content/notes/docs for a topic (e.g. "/improve-topic-content tcp-congestion").
user-invocable: true
---

# Improve topic content

Target: `content/<category>/NN[a-z]-<topic-id>.md`, rendered by the Theory tab.

## The renderer constrains what you can write

`TopicViewer.renderMarkdown()` is a ~20-line regex chain, **not** a Markdown library. Read it at
`frontend/src/components/TopicViewer.jsx` before writing. Supported and nothing else:

| Works | Does **not** work |
|---|---|
| `#`, `##`, `###` headings | `####` and deeper — renders as literal `#### Text` |
| `- item` bullets | `* item`, nested/indented bullets |
| `1. item` ordered lists | lettered or nested lists |
| `\| a \| b \|` tables (dashes-only separator row) | alignment beyond the separator row |
| ` ```lang ` fenced code | fenced content with lines starting `-` or containing `\|` (mangled into `<li>`/`<td>` — fences are processed *after* lists and tables) |
| `` `inline code` ``, `**bold**` | `*italic*`, `_italic_`, links, images, `>` quotes, `---` rules, strikethrough |
| plain text, blank-line paragraphs | `$LaTeX$` — renders literally as `$\sigma$` |

Two pre-existing violations are widespread: **44 content files use `####`** and **36 use `$…$`
math**. When you touch a file, demote its `####` headings to `###` and replace `$…$` with plain
Unicode (σ, π, ⋈, ≥, ×, ⁺) — but don't do a repo-wide sweep unless asked.

## Structure (strict)

Every file has exactly three tiers, in order, and each must earn its label:

- `## 🟢 Beginner Level` — analogy first, then the mental model. No jargon before it's defined.
- `## 🟡 Intermediate Level` — the mechanism: formulas, algorithms, worked numeric examples, code.
- `## 🔴 Expert Level` — implementation reality (Linux kernel, JVM, storage engine internals),
  trade-offs with numbers, failure modes, and a closing set of interview Q&As.

## What "improved" means here

The platform's value is depth an ordinary tutorial doesn't have. Prefer, in order:

1. **Correctness** — verify claims about kernel/JVM/protocol behaviour; version-qualify anything
   that changed across releases (e.g. "since JDK 21", "Linux 5.10+").
2. **Concrete numbers** — real latencies, sizes, thresholds, complexity. "Slow" is worthless;
   "38 s → 18 ms" is the whole point.
3. **Worked examples** — step through one instance by hand rather than describing the algorithm.
4. **Failure modes** — what breaks in production and the symptom an engineer would actually see.
5. **Interview Q&As** — the follow-up question after the obvious one.

Match the topic's existing voice; read a strong sibling file (e.g.
`content/dbms/05c-storage-raid-indexing.md`) before writing.

## Keep the simulator honest

If the content now teaches a mechanism or scenario the simulator doesn't show, say so explicitly
in your report and offer `improve-topic-simulation` — content and visualizer drifting apart is
this repo's main quality risk. Content and its concept JSON (`src/data/*-concepts-*.json`) should
also agree; update `theoryData`/`quizData` when the content's claims change.

## Verify

```bash
npm test --prefix frontend -- TopicViewer      # renderer guard
```

Then read the rendered Theory tab in the running app (`./start.sh --local`) — regex renderers fail
in ways tests don't catch. Finish with `sync-project-docs` if the topic's scope changed.
