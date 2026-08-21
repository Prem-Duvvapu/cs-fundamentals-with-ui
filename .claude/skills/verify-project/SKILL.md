---
name: verify-project
description: Run the full verification gate for cs-fundamentals-with-ui — backend JUnit suite, frontend Vitest suite, production build, and a live smoke check of the API and a topic page. Use before committing, when the user asks to run the tests / check nothing is broken / verify a change (e.g. "/verify-project").
user-invocable: true
---

# Verify project

The gate `AGENTS.md` requires before any task is considered done.

## 1. Test suites

```bash
mvn test -f backend/pom.xml
npm test --prefix frontend
npm run build --prefix frontend
```

Narrow while iterating, then run the full suites before reporting:

```bash
mvn test -f backend/pom.xml -Dtest=TopicServiceTest#getTopicsByCategory_dbms_shouldContainAll12Topics
npm test --prefix frontend -- erModelEngine
```

## 2. What the suites do and don't cover

`TopicServiceTest` asserts **exact per-category topic counts** — it fails on any added or removed
topic until updated. That's intentional and is the only automated guard on the 7-point
registration checklist; the other six points fail silently at runtime.

Component tests are mostly render smoke tests ("does the heading appear"). They will not catch a
wrong algorithm, a dead play button, an unstyled panel, or a mangled Theory tab. Engine tests in
`src/utils/__tests__/` are where real behaviour is asserted.

## 3. Live smoke check

For anything touching topics, content, or routing, tests alone are insufficient:

```bash
./start.sh --local     # backend :8080, Vite :5173
curl -s localhost:8080/api/v1/topics | head -c 400
curl -s localhost:8080/api/v1/content/<category>/<topic-id> | head -20
```

Then open `http://localhost:5173/topic/<topic-id>` and confirm both tabs: the **Simulation** tab
renders the visualizer (not "Visualizer coming soon") and its controls step, and the **Theory**
tab renders formatted content (not "Content not available yet.", and no literal `####` or `$…$`).

The backend must run from a directory where `content/` or `../content/` resolves — `ContentService`
locates the content root once at startup and returns "Content directory not found" otherwise.

## 4. Report honestly

State pass/fail with the actual output. If a suite fails for a reason unrelated to the change,
say so explicitly rather than glossing it. Never report "done" on an unrun suite.
