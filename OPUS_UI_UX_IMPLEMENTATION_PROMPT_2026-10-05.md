Implement `UI_UX_REFINEMENT_PLAN_2026-10-05.md` in this repository, end to end.

I want a polished, coherent learning experience in both light and dark mode. I especially like LeetCode's neutral charcoal dark mode. Start with the reader and sidebar, then carry the same design through home, categories, search, practice, Progress and retained simulations. Use the plan's concrete design decisions, phases, acceptance criteria and verification requirements.

Before editing, read AGENTS.md fully, docs/DESIGN_SYSTEM.md, relevant RCA.md entries and the current code/tests. The October 5 refinement plan supersedes conflicting older presentation guidance. Inspect the working tree and preserve unrelated changes. Do not recreate features that already exist.

Critical requirements:
- Every category must keep all its main topics and expandable subtopics in the reader sidebar. Keep separate lesson links and chevron buttons, exact section anchors, canonical order and expansion state across route remounts. Implement the plan's search and Collapse all behavior without losing user expansion choices.
- Improve both themes deliberately. Keep the charcoal foundation, establish a calmer neutral light theme, simplify stacked controls, improve typography/spacing, use consistent SVG application icons and make primary actions clear.
- Preserve all URLs, heading/question IDs, view/history behavior, Markdown/math/code/diagrams, bookmarks, completion, resume, drafts, answer alternatives, attempt history, review queues and import/export.
- Use the existing React stack and semantic tokens in App.css. Avoid a UI framework, dependency migration, new curriculum registry, unnecessary backend changes or curriculum rewrites.
- Keep TopicExpansionProvider outside the pathname-keyed error boundary. Reuse the category outline API/cache and heading-ID pipeline; do not fetch every lesson body for navigation.

Work through the plan in order. Create the results checklist, capture a reproducible baseline, implement and visually inspect the reader pilot in both themes, then finish the remaining screens. Give concise progress updates and continue without asking for routine design approval. Use your judgment within the plan; document any material deviation and its reason.

Verify real rendered behavior with Playwright at the required widths in both themes. Inspect screenshots yourself; passing tests alone is not visual approval. Test keyboard navigation, focus, contrast, mobile controls, zoom/reflow, reduced motion, error/retry states and storage continuity. Add meaningful regression coverage for changed interactions. Record actual reader-position improvements and distinguish fixture-based previews from real-backend checks.

After CSS changes, regenerate and validate/decode Mermaid assets because CSS is part of the rendering fingerprint. Run the applicable frontend/backend/content/browser gates and required final-head CI. Fix failures rather than weakening tests. Update README.md, CONTEXT.md, AGENTS.md and docs/DESIGN_SYSTEM.md with delivered behavior, and record results in docs/UI_UX_REFINEMENT_RESULTS_2026-10-05.md. Add RCA evidence for any confirmed regression you introduce.

I authorize coherent commits, pushing the implementation branch, opening/updating the PR and merging after required checks pass. Do not bypass protections or discard unrelated changes. Finish with the implemented changes, verification results, representative before/after screenshots, PR/commit details and anything genuinely pending. Do not claim real learner validation unless it actually occurred.
