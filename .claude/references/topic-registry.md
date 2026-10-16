# Canonical topic integration contract

`backend/src/main/java/com/csfundamentals/service/TopicService.java` owns topic metadata:
`Topic(id, title, category, level, summary, order, prerequisiteIds, outcomes)`.
The API supplies it to HomePage and TopicPage. Neither page has a fallback catalog or titleMap.

## Required integration points

1. Exact `content/<category>/<prefix>-<topic-id>.md` stem. ContentService deliberately has no
   startsWith fallback. Duplicate/missing registered content must fail validation/startup.
2. Canonical TopicService metadata with a unique ID, category-local order, real prerequisite IDs
   and observable outcomes. Categories: os, networking, dbms, java-spring, aiml, devops.
3. TopicServiceTest category/count/order checks and content/coverage assertions. Keep
   `content/COVERAGE_MANIFEST.json` synchronized when an actual mapping changes.
4. `frontend/src/utils/topicCategories.js` topic-to-category mapping and any canonical ordering
   checks. Do not add a second metadata catalog to a page.
5. `frontend/src/test/catalog.json` canonical browser fixture: all metadata must match TopicService.
6. **Optional:** `topicVisualizerRegistry.jsx` exact mapping when the topic has a real simulator.
   Study-only is valid. Shared hub tabs/engines must not be deleted while another topic uses them.

The inventory command checks exact content, fixture metadata, category-map presence and test IDs:

```bash
python3 .claude/skills/list-topics/list_topics.py --audit
python3 -m unittest discover -s scripts -p test_topic_inventory.py -v
```

It exits nonzero on audit defects or an unrecognized Topic constructor. It does not replace Maven,
content/coverage validation, browser journeys or a manual review of prerequisite semantics.

## Adding or removing

Content-edit units operate on already registered files and may not change registrations. A genuinely
new topic needs an explicitly scoped integration change under the current AGENTS/content contract.
For removal, inspect prerequisites, coverage mappings, saved IDs, source migration evidence and all
shared simulator references. Preserve existing user data or document the compatibility behavior.
Keeping a Markdown file while deregistering it is not a supported hidden-lesson feature: exact
registered content is the serving contract. Do not promise unlisting by editing UI fallback data.

Before deleting any simulator, run the existing simulation-question migration gate and preserve
all interview/quiz content. Keep documentation and tests aligned with the resulting curriculum.
