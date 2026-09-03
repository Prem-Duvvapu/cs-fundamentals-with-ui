# Topic Registry — every place a topic id lives

A topic id (e.g. `er-model`) is a bare string duplicated across the codebase. There is no
single registry. Miss one entry and the topic silently 404s, shows "Visualizer coming soon",
or renders under the wrong category — no build error, no test failure except (3).

Category is always one of: `os`, `networking`, `dbms`, `java-spring`, `aiml`.

## The 7 registration points

| # | File | What to add | Failure if missed |
|---|------|-------------|-------------------|
| 1 | `content/<category>/NN[a-z]-<topic-id>.md` | The 3-tier Markdown file | Theory tab shows "Content not available yet." |
| 2 | `backend/src/main/java/com/csfundamentals/service/TopicService.java` | `new Topic(id, title, category, level, summary)` in the `List.of(...)`, inside the right category comment block | Topic never appears on the home page |
| 3 | `backend/src/test/java/com/csfundamentals/service/TopicServiceTest.java` | Bump the category's exact count assertion + add `assertTrue(topicIds.contains("<id>"))` | **`mvn test` fails** — this is the only guardrail |
| 4 | `frontend/src/pages/TopicPage.jsx` — `titleMap` entry; **and** `frontend/src/components/visualizers/topicVisualizerRegistry.jsx` — an entry, **only if the topic has an exact-match visualizer** | `titleMap['<id>'] = '<Title>'`; registry entry is `direct(SomeVisualizer)` or `hub(SomeCategoryVisualizer, '<id>')` | Raw slug as page title; no registry entry means no Simulation tab at all (Study only) — that's *correct* for a topic with no dedicated visualizer, don't add one just to avoid the blank tab |
| 5 | `frontend/src/utils/topicCategories.js` | `TOPIC_CATEGORY_MAP` entry `'<id>': '<category>'` — read via `getTopicCategory()` by `TopicViewer.jsx`, `TopicPage.jsx`, `SearchPage.jsx`, `InterviewPage.jsx` | Content fetch hits the wrong category → 404 (falls back to `'os'`) |
| 6 | `frontend/src/pages/HomePage.jsx` | Same `{ id, category, title, level, summary }` object in the hardcoded fallback array | Topic vanishes whenever the backend is down |
| 7 | Category hub `getInitialTab()` — `frontend/src/components/visualizers/{Dbms,Networking,JavaSpring,AiMl}Visualizer.jsx` | `case '<id>': return '<sub-tab>'` + the sub-tab button + the render branch | Hub opens on the wrong sub-tab |

Point 7 applies only when point 4's registry entry is `hub(...)`. `direct(...)` topics (all OS
topics, plus a few retained engines that were pulled out of a hub — `java-hashmap-internals`,
`java-multithreading-concurrency`, `spring-testing-production`) mount their visualizer directly
and skip point 7 entirely, as does any topic with no registry entry at all (points 1-6 only).

## Ordering rules

- `level` is one of `beginner` / `intermediate` / `expert`; `HomePage` groups by it via `LEVEL_ORDER`.
- Home-page and hub ordering follow array/JSX order, so **insert at the curriculum position**, not at the end.
- The `NN[a-z]-` filename prefix is *only* for on-disk ordering. `ContentService.stripPrefix()`
  strips a leading `\d+[a-z]?-`, so `04b-database-normalization.md` resolves for topic id
  `database-normalization`. Use a letter suffix (`04b`, `05c`) to insert between existing numbers
  rather than renumbering the whole directory.
- The topic id must be unique across **all** categories — `CATEGORY_MAP` and `titleMap` are flat.

## Renaming a topic id

Update all 7 points plus the content filename in one commit, and grep for stragglers:

```bash
grep -rn "old-topic-id" --include=*.jsx --include=*.js --include=*.java --include=*.json --include=*.md . | grep -v node_modules
```

## Verify a topic is fully wired

```bash
mvn test -f backend/pom.xml -Dtest=TopicServiceTest
npm test --prefix frontend
# then with the app running:
curl -s localhost:8080/api/v1/topics | grep '<topic-id>'
curl -s localhost:8080/api/v1/content/<category>/<topic-id> | head -5
```
