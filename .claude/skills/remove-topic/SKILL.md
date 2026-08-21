---
name: remove-topic
description: Remove a curriculum topic from cs-fundamentals-with-ui cleanly — content file, engine, visualizer, concept JSON, tests, and all 7 registration points, without orphaning references. Use when the user asks to remove, delete, drop, or retire a topic (e.g. "/remove-topic quartz-scheduler").
user-invocable: true
---

# Remove a topic

Removal is the registration checklist run in reverse. The risk is the opposite of adding:
leftover references produce a topic card that routes to "Visualizer coming soon", or a test
asserting a count that no longer matches.

## 1. Confirm scope before deleting

- Resolve the exact topic id and show the user **everything** that will be deleted:
  ```bash
  grep -rn "<topic-id>" --include=*.jsx --include=*.js --include=*.java --include=*.json --include=*.md . | grep -v node_modules
  ls content/*/*<topic-id>*.md
  ```
- Ask whether they want it **removed** or only **unlisted** (hidden from the home page but content
  kept). Unlisting = remove points 2, 4, 6, 7 and keep the content file and engine.
- Check whether the visualizer or engine is shared: a category hub sub-tab may be reachable from
  several topic ids, and some engines back more than one visualizer. Only delete files whose last
  reference is going away.

Deleting content is hard to reverse — get explicit confirmation before the first `rm`.

## 2. Deregister — all 7 points

Reverse `.claude/references/topic-registry.md`:

1. `content/<category>/NN-<topic-id>.md` — delete (or keep, if unlisting)
2. `TopicService.java` — remove the `new Topic(...)` line
3. `TopicServiceTest.java` — **decrement** the category count assertion and drop the `contains` line
4. `TopicPage.jsx` — remove the `titleMap` entry, the `case`, and the now-unused `lazy(...)` import
5. `TopicViewer.jsx` — remove the `CATEGORY_MAP` entry
6. `HomePage.jsx` — remove the object from the fallback array
7. Category hub — remove the `getInitialTab()` case, the sub-tab button, the render branch, and the import

If the removed topic was a hub's `default:` sub-tab, repoint the default at a surviving tab.

## 3. Delete the now-orphaned files

Only after confirming nothing else imports them:

- `frontend/src/components/visualizers/<category>/<Name>Visualizer.jsx`
- `frontend/src/utils/simulationEngines/<name>Engine.js`
- `frontend/src/utils/__tests__/<name>Engine.test.js`
- `frontend/src/data/<category>-concepts-<slug>.json`
- any `components/__tests__/` case referencing the visualizer or topic id

## 4. Verify no orphans remain

```bash
grep -rn "<topic-id>" --include=*.jsx --include=*.js --include=*.java --include=*.json . | grep -v node_modules   # expect no hits
grep -rn "<Name>Visualizer\|<name>Engine" frontend/src | grep -v node_modules                                     # expect no hits
```

Then run `verify-project` and `sync-project-docs` — the docs carry per-category topic counts and
a visualizer inventory that both shift on removal.
