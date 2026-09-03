---
name: list-topics
description: List the curriculum topics in cs-fundamentals-with-ui grouped by category (os, networking/cn, dbms, java-spring, aiml) with level, title, and one-line summary — optionally auditing that every topic is wired at all 7 registration points. Use when the user asks what topics exist, what's covered under a section, for a curriculum inventory, or whether a topic is fully registered (e.g. "/list-topics", "/list-topics cn", "what DBMS topics do we have").
user-invocable: true
---

# List topics

Runs a deterministic inventory instead of hand-reading `TopicService.java` — 56 topics is too
many to enumerate reliably by eye, and the docs disagree with each other on the counts.

## Run it

```bash
python3 .claude/skills/list-topics/list_topics.py                    # all categories, grouped
python3 .claude/skills/list-topics/list_topics.py --summaries        # + the one-line summary per topic
python3 .claude/skills/list-topics/list_topics.py cn --summaries     # one category (aliases below)
python3 .claude/skills/list-topics/list_topics.py --audit            # + 7-point registration audit
```

Category names are `os`, `networking`, `dbms`, `java-spring`, `aiml`; the script accepts the
aliases `cn`/`net`/`networks`, `db`/`database(s)`, `java`/`spring`, and `ai`/`ml`.

Level shows as `[B]` beginner, `[I]` intermediate, `[E]` expert. A `[no content file]` flag means
the topic is registered but no Markdown resolves for it.

## What it reads

`backend/.../TopicService.java` is the source of truth for what exists — the script parses the
`new Topic(id, title, category, level, summary)` list. Content files are matched the same way
`ContentService` does it (strip a leading `\d+[a-z]?-`, then exact stem, then `startsWith`
prefix), so `05-feature-stores-mlops.md` correctly resolves for topic id `feature-stores`.

`--audit` cross-references the other five hard-required registration points from
`.claude/references/topic-registry.md` (TopicPage `titleMap`, `topicCategories.js`
`TOPIC_CATEGORY_MAP`, HomePage fallback array, TopicServiceTest assertions, content file) and
reports any topic missing one, any content file no topic resolves to, and any per-category count
assertion that no longer matches `TopicService`. It also lists, separately and non-fatally, any
topic with no `topicVisualizerRegistry.jsx` entry — that's the optional 7th point (no Simulation
tab, Study only), not a defect.

## Presenting the result

Answer at the altitude asked. "What's under DBMS?" wants the titles, not the audit — run the
category form and reformat as a short list, keeping the level markers. Only show the audit when
the user asks about wiring, or when it found something, and paste the script's own lines rather
than paraphrasing.

If the script parses zero topics, `TopicService.java`'s format changed — read the file directly
and fix the regex rather than reporting an empty curriculum.
