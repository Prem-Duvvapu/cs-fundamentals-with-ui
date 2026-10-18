# Manual access checks for the learning journey

Status: **protocol ready; no manual keyboard, screen-reader or zoom session recorded here**.
This is the practical plan's CLOSE-03 work sheet. The automated responsive/axe suite is useful
regression evidence but cannot substitute for these actual observations or certify accessibility.

## Prepare one reproducible session

1. Record the app commit/deployment, date, operating system, browser/version, assistive technology
   and version, input method, viewport and zoom. Use the participant's actual supported setup;
   do not fill in a screen reader that was not used. A facilitator can record access observations.
2. Use a fresh temporary browser profile or an exported backup of existing practice data. Do not
   reset a learner's real progress to prepare the session. Use only synthetic answers and notes.
3. Start in the participant's preferred theme. Repeat the important focus/readability checks in
   the other theme. Record tool settings, including high contrast or reduced motion when tested.
4. Keep two records: what happened unaided, and what happened after an explanation or workaround.
   Screenshots can help a visual defect; they cannot prove screen-reader announcements.

## Keyboard journey

| Action | Observe directly | Failure to record and repair |
|---|---|---|
| Enter the site, use its skip link and navigate the main links | Visible focus follows a useful order; the current location is understandable | Focus is hidden, trapped or jumps unexpectedly |
| Open a subject topic and expand/collapse its category tree | Main topics and subtopics can be reached; expanded state matches visible content; collapsed links leave the tab order | A collapsed item retains focus, or the current topic disappears without a recovery path |
| Open the lesson TOC and navigate to a subsection | The target heading is reached and visible below page chrome | A sticky toolbar obscures focus/heading or a control loses its accessible name |
| Follow a lesson link, use browser Back and change Study/Practice | Location and control state remain understandable | Navigation destroys an unfinished answer or leaves focus in removed content |
| Type a practice answer, reveal its answer, compare, then return | Every action can be operated and the draft is retained | A pointer-only control, inaccessible disclosure or lost draft |
| Search, change filters, clear the query and open a result | Search updates do not steal typing focus; status/result context can be discovered | Unannounced failure, unexpected focus movement or keyboard dead end |
| Open and close a menu/dialog and use recovery after an error | Focus enters a useful element and returns to the trigger on close | Background controls remain mistakenly active or focus vanishes |

Do not infer keyboard usability by clicking a control in DevTools. Record the keys actually used
and the first action that failed. If a path has no dialog/error, mark that row not tested rather
than inventing an observation.

## Screen-reader journey

Perform an actual screen-reader session, not a DOM-only accessibility-tree check. Record the
reader/browser combination and which commands were used; do not claim every combination works.

1. Inspect landmarks and headings from home into a topic. The page/subject/topic context and one
   meaningful H1 should be available without reading the entire navigation first.
2. Expand and collapse the subject tree. Confirm button names, expanded/collapsed announcements
   and current-topic indication; hidden items should not remain in the reading/control order.
3. Navigate a lesson containing a table, code block and diagram. Confirm headings/table context,
   code access, the diagram description and available text/source alternative. A link called
   “diagram” alone does not establish that its important concept is understandable.
4. Enter a practice response, reveal the reference answer, move between questions and return.
   Verify question position, action names, answer disclosure and retained response are discoverable.
5. Search/filter and recover from no results or an actual route error. Inspect announcements for
   usefulness and repetition. Note the words actually announced; markup intent is not proof.

Use short paraphrased announcement notes unless recording/transcription permission exists. Never
publish learner responses or AT recordings without the participant's consent.

## Actual browser zoom and reflow

Use the browser's zoom control at 100%, 200% and 400% on a desktop window; record the actual viewport
and effective layout. Resizing a viewport in an automated test does not prove browser zoom worked.
At 400%, check a normal reading width equivalent to roughly 320 CSS pixels on a 1280-pixel window.

- Read paragraphs and operate navigation, theme, search and practice controls. Text and controls
  must remain available, with no overlapping fixed chrome or clipped essential actions.
- Confirm the category tree/TOC can open and close, headings remain reachable and focus is visible.
- Check code, tables and diagrams locally: a complex two-dimensional item may need its own
  scrolling/full-size view, while surrounding reading controls should remain usable.
- Check a long heading, a validation/error message and a long practice answer. Record accidental
  page-level horizontal movement and any content hidden behind overlays.

If a check fails, capture the actual zoom/window/theme and minimal reproduction. Compare before
and after the fix with the same browser settings. Do not report automated axe color checks as a
visual reading-comfort preference or a guarantee for every visual impairment.

## Evidence record and closure

Copy a record per tested combination; leave untested entries explicitly untested.

- Date / app commit or exact deployment:
- OS / browser/version / screen reader/version and settings:
- Input method / theme / window / actual browser zoom:
- Task and commands used:
- Expected access outcome:
- Actual unaided observation and announcement (if relevant):
- Result: passed, blocked, assisted or not tested:
- Minimal reproduction / optional anonymized screenshot:
- Fix commit / exact retest and remaining limitations:

CLOSE-03 is complete only after actual keyboard, screen-reader and zoom journeys are recorded,
failures are repaired or explicitly resolved against the requirement, and changed paths are
retested. [Learner comprehension](../LEARNER_USABILITY_STUDY.md) is a separate real-person gate.
A clean automated run, this prepared sheet and an AI-generated participant cannot close either.

Primary guidance: [WAI preliminary checks](https://www.w3.org/WAI/test-evaluate/easy-checks/),
[WCAG reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) and
[focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).
