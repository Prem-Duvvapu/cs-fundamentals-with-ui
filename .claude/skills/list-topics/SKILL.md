---
name: list-topics
description: List the curriculum topics in cs-fundamentals-with-ui grouped by category (os, networking/cn, dbms, java-spring, aiml, devops) with level, title, and one-line summary — optionally auditing that every topic is consistent with the current canonical integration contract. Use when the user asks what topics exist, what's covered under a section, for a curriculum inventory, or whether a topic is fully registered (e.g. "/list-topics", "/list-topics cn", "what DBMS topics do we have").
user-invocable: true
---

# List topics

Runs a deterministic inventory of `TopicService.java` so status reports use the canonical metadata and current counts.

## Run it

```bash
python3 .claude/skills/list-topics/list_topics.py                    # all categories, grouped
python3 .claude/skills/list-topics/list_topics.py --summaries        # + the one-line summary per topic
python3 .claude/skills/list-topics/list_topics.py cn --summaries     # one category (aliases below)
python3 .claude/skills/list-topics/list_topics.py --audit            # + canonical registration audit
```

Category names are `os`, `networking`, `dbms`, `java-spring`, `aiml`, `devops`; the script accepts
the aliases `cn`/`net`/`networks`, `db`/`database(s)`, `java`/`spring`, `ai`/`ml`, and
`infra`/`infrastructure`/`ops`.

Level shows as `[B]` beginner, `[I]` intermediate, `[E]` expert. A `[no content file]` flag means
the topic is registered but no Markdown resolves for it.

## What it reads

`TopicService.java` is canonical. The parser reads all eight fields, including order,
prerequisites and outcomes, and fails if any constructor is not understood. Content resolution
uses an exact stripped filename stem; there is no prefix fallback.

`--audit` checks actual content, category mapping, per-topic test assertions and all fields of
`frontend/src/test/catalog.json`. It rejects mismatched fixtures, orphan content and duplicate IDs.
Missing simulator entries are reported separately because Study-only topics are intentional.
HomePage and TopicPage derive metadata from the API; they have no fallback array or titleMap.
See `.claude/references/topic-registry.md`. A failing audit exits nonzero.

## Presenting the result

Answer at the altitude asked. "What's under DBMS?" wants the titles, not the audit — run the
category form and reformat as a short list, keeping the level markers. Only show the audit when
the user asks about wiring, or when it found something, and paste the script's own lines rather
than paraphrasing.

If the script parses zero topics, `TopicService.java`'s format changed — read the file directly
and fix the regex rather than reporting an empty curriculum.
