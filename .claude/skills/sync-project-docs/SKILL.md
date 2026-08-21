---
name: sync-project-docs
description: Sync README.md, CONTEXT.md, and AGENTS.md (and CLAUDE.md when architecture shifts) with the current state of the codebase — topic counts, curriculum checklists, visualizer inventory, API surface. Required by AGENTS.md after any feature change. Use when the user asks to update/sync the docs, or as the closing step of add-topic / remove-topic (e.g. "/sync-project-docs").
user-invocable: true
---

# Sync project docs

`AGENTS.md` mandates this after **any** code, architecture, or feature change: update the docs
and the tests, and verify both suites pass, before the task is done.

## The four documents and what each owns

| File | Owns | Do not duplicate |
|---|---|---|
| `README.md` | User-facing pitch, quick start, visualizer highlights, curriculum table with per-category counts, tech stack | Internal file paths |
| `CONTEXT.md` | Deployment/container architecture, visualizer inventory **with component filenames**, REST endpoint list, test commands | Curriculum prose |
| `AGENTS.md` | Agent context: directory tree, per-category roadmap checklists (`- [x]`), conventions, command rules | Deep architecture |
| `CLAUDE.md` | How to build/test and the non-obvious architecture (topic registration, layering) | Curriculum inventories |

## Derive the numbers, never copy them

The counts in these files have drifted before — README, CONTEXT, and AGENTS have each claimed a
different total. Recompute from the code, then make all four agree:

```bash
ls content/os content/networking content/dbms content/java-spring content/aiml | wc -l   # per dir
grep -c "new Topic(" backend/src/main/java/com/csfundamentals/service/TopicService.java  # registered total
grep -n "assertEquals([0-9]*, .*Topics.size()" backend/src/test/java/com/csfundamentals/service/TopicServiceTest.java
ls frontend/src/components/visualizers/*/*.jsx frontend/src/components/visualizers/*.jsx | wc -l
ls frontend/src/utils/__tests__/*.test.js frontend/src/components/__tests__/* frontend/src/pages/__tests__/* | wc -l
```

The fastest way to get all of this at once:

```bash
python3 .claude/skills/list-topics/list_topics.py --audit
```

`TopicService.java` is the source of truth for what exists; the content directory is the source
of truth for what's written. If they disagree, that's a bug to report, not a doc to fudge.

## Checklist per sync

1. Per-category counts identical in README table, CONTEXT, AGENTS headings, and the JUnit assertions.
2. AGENTS roadmap has a `- [x]` line for every registered topic, in curriculum order.
3. CONTEXT visualizer inventory names the **actual** component files (`ls` them; stale names are common).
4. CONTEXT endpoint list matches the three controllers.
5. Test-count claims in README/CONTEXT match a real run — or drop the numbers rather than let them rot.
6. CLAUDE.md updated only if the architecture, commands, or registration points changed.

Report which numbers you corrected and which were already right.
