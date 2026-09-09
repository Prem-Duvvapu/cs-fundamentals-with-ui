# Project audit — 2026-09-09

## Assessment and scope

Audited baseline: `main`, commit `1a6906a` (`merge: complete release readiness follow-ups`).

The project has a substantial, useful curriculum and a working local production build. It is
not ready to declare every release criterion complete: the audit found a broken Docker build
path, 16 malformed SVG assets, incorrect simulation edge cases, request races, and mobile layout defects that the current
tests do not cover. Passing curriculum and unit tests should be retained as evidence of their
specific contracts, not treated as proof of complete runtime correctness.

This document records strengths, confirmed defects, recommended improvements, verification,
and proposed cleanup. Fixes and deletions below are **pending**, unless explicitly marked
otherwise. It is an audit report, not an implementation record.

Scope: frontend routes and rendering, shared components and simulation engines, backend
controllers/services/tests, all curriculum files through structural validation, dependency
inventory, launcher, Docker/Nginx configuration, CI, documentation, and generated diagrams.
Educational accuracy was spot-reviewed; every statement in all 63 lessons was not independently
fact-checked. External lesson links were not exhaustively checked for availability.

Navigation: [strengths](#what-is-good), [verification](#verification-performed),
[fixes](#fixes-to-do), [improvements](#improvements-to-plan-after-the-fixes),
[cleanup candidates](#proposed-removal-of-unused-files), [execution order](#recommended-execution-order).

## What is good

| Area | Evidence and value |
|---|---|
| Curriculum completeness | All 63 registered lessons and 83 coverage-manifest entries pass the existing authoring gate. The curriculum contains 28,683 lines under the validator's counting convention, 277 Mermaid fences, and 883 interview Q&As. |
| Consistent learning structure | Beginner, intermediate, and expert tiers, worked examples, diagrams, misconceptions, and interview sections make the lessons usable for progressive preparation. |
| Content rendering | GFM, KaTeX, and syntax highlighting replace the old custom Markdown parser. The real-renderer corpus suite covers the lesson collection. Raw HTML is not enabled as a curriculum rendering feature. |
| Shared question extraction | Frontend and backend use section-aware question parsing. The 883-question corpus check protects against the previously reported Further Reading leakage. |
| Simulator retirement discipline | The migration ledger resolves all 109 historical questions. The current scanner finds 44 remaining legacy questions and validates their ownership. |
| Optional simulations | The explicit topic-to-visualizer registry avoids showing unrelated simulations for unsupported topics. Pure simulation engines are separated from many React views. |
| Discovery architecture | Search and Interview Mode use backend APIs over an immutable index, instead of downloading every lesson to search in the browser. Result limits and pagination limits are bounded. |
| Theme foundations | Dark/light tokens, saved preferences, category/tier labels, reduced-motion CSS, and visible keyboard focus provide a useful design foundation. The corrected search-input colors were observed in both themes. |
| Compact reader shell | Sampled topic pages have one H1. The mobile Java, OS, and DBMS sample pages fit the viewport, and the desktop sample pages fit at 1440px. Other mobile routes still need fixes below. |
| Static diagram direction | Moving Mermaid out of the reader's JavaScript bundle reduces runtime work. Both theme asset variants exist; missing images have a source fallback. The generator and asset checks still need stronger guarantees. |
| Verification foundations | Backend tests, curriculum validation, question migration checks, frontend tests, and production build commands exist. CI invokes the main gates, including diagram checks through `prebuild`. |
| Local launcher | `start.sh` runs Maven and Vite without Docker, locates the repository, searches for free ports, and sets the proxy target. It is executable in Git and the shell EOL rule is present. |
| Incident history | `RCA.md` preserves five earlier incidents with symptoms and prevention guidance. This is useful, but the new deployment regression needs its own entry during remediation. |

## Verification performed

Results are specific to this audit date and working environment (WSL with the repository on
the Windows/OneDrive filesystem). Slow filesystem access significantly affects test duration.

| Check | Result |
|---|---|
| `npm run build --prefix frontend` | Passed. 608 modules transformed. Main JS: 219.98 kB, 69.87 kB gzip. Markdown chunk: 666.17 kB, 200.96 kB gzip; Vite still reports a large-chunk warning. |
| `mvn -q test -f backend/pom.xml` | Passed: 47 tests, zero failures/errors/skips. |
| `node scripts/validate-content.mjs` | Passed: 63/63 lessons and 83 manifest entries. |
| `node scripts/audit-simulation-questions.mjs --check` | Passed: 109 resolved ledger items, zero pending. |
| `node --test scripts/validate-content.test.mjs scripts/audit-simulation-questions.test.mjs` | Passed: 10/10 tests. These script test suites are not currently invoked by CI. |
| Diagram inventory / `prebuild` | Passed: 281 unique diagram entries, 562 theme assets. The extra four diagrams are in the authoring specification, not the 63 lessons. |
| Markdown parser versus diagram manifest | Every Mermaid code node found by the Markdown parser matched a manifest hash. |
| Browser XML parsing of all generated SVGs | **Failed: 16 of 562 assets are malformed XML**, affecting 8 diagrams in both themes. The structural prebuild gate still passes. See F-14. |
| Actual SVG image decoding | Both `69189595` theme variants fail `Image.decode()` in Chromium; a valid control asset decodes successfully. This confirms the XML issue affects the reader's image-loading mechanism. |
| Relative curriculum file links | No missing file targets found by a basic Markdown-link scan; fragment targets and external links were not comprehensively validated. |
| `npm audit --prefix frontend --json` | Reports 8 affected packages: 1 critical, 2 high, 5 moderate. See F-10 for exposure qualifications. |
| `npm audit --prefix frontend --omit=dev --json` | Reports 2 moderate affected packages: `react-router` and `react-router-dom`. |
| `bash -n start.sh` and Git file mode | Passed syntax check; executable mode `100755`; `.gitattributes` forces shell files to LF. |
| Docker execution | Unavailable: Docker Desktop's WSL integration is not active for this distribution. The Docker defect below is established from build paths, not a successful container smoke run. |
| Browser layout smoke | Chromium loaded the production bundle across 9 routes × 2 widths × 2 themes. No uncaught page errors; confirmed mobile overflow and missing unknown-route content. See F-05. |
| Browser request-order test | Reproduced stale search results: input changed to `new`, but the eventual result title was `RESULT old`. |
| Backend edge-case probes | Direct calls to compiled Java services reproduced invalid topic-prefix resolution, inverted `/31` host bounds, out-of-subnet `/32` host bounds, and an exception for malformed Banker matrices. |

The browser smoke used a temporary loopback server serving the actual production bundle and
actual lesson files, with controlled API fixtures derived from the topic registry. This validates
frontend layout and request sequencing; it is not an end-to-end test of deployed Spring/Nginx.
It included `/`, five topic pages (one per category), `/search`, `/interview/all`, and an unknown
route, at 320px and 1440px in both themes. A fresh axe/Lighthouse audit, all-simulator interaction
pass, real-phone check, and backend dependency vulnerability scan remain outstanding.

## Fixes to do

Priority definitions: **P1** blocks dependable deployment or core use; **P2** affects correctness,
accessibility, or robustness; **P3** is lower-impact maintenance. No fix is marked complete merely
because the existing tests pass.

### F-01 — P1: frontend Docker build cannot run its new prebuild check

**Evidence:** [docker-compose.yml](docker-compose.yml) uses `./frontend` as the frontend build
context. [frontend/Dockerfile](frontend/Dockerfile) copies that context to `/app` and runs
`npm run build`. The new `prebuild` in [frontend/package.json](frontend/package.json) executes
`node ../scripts/render-diagrams.mjs --check`, resolving to `/scripts/render-diagrams.mjs`.
Neither that script nor the sibling `content/` directory is in the build context.

**Impact:** the documented `docker compose up --build` workflow fails even though the normal
workspace build passes. The prebuild hook was introduced in `462048f`, merged by `1a6906a`.

**Required work:** use a repository-root build context and explicit copies of the required
frontend, script, and content inputs, or redesign the check so all inputs are available during
the image build. Add appropriate `.dockerignore` files; currently neither root nor frontend has
one, so `COPY . .` can also include host dependencies/build outputs. Align Node versions between
the Docker builder (`18`) and CI (`20`) after choosing a supported toolchain.

**Acceptance:** a clean container build passes without host `node_modules`, serves a deep topic
link and its SVG assets, proxies the API, and passes a container smoke test in CI. Record the
confirmed agent-created regression in `RCA.md` with the resolving commit.

### F-02 — P1: simulation requests lack validation and bounded work

**Evidence:** [SimulationController.java](backend/src/main/java/com/csfundamentals/controller/SimulationController.java)
accepts unchecked request bodies. In [SimulationService.java](backend/src/main/java/com/csfundamentals/service/SimulationService.java),
SRTF only completes processes with `remainingTime > 0`; a zero/negative burst leaves `completed < n`
forever while idle Gantt blocks accumulate. Very large arrivals/bursts also generate one block
per time unit. Banker matrix dimensions are assumed rather than checked.

A direct Banker call with allocation `{{1,2}}`, max `{{3}}`, and available `{2,2}` throws
`ArrayIndexOutOfBoundsException`. The unbounded SRTF input was established by control-flow review;
it was deliberately not executed against a running service.

**Required work:** reject invalid algorithms, missing/null process entries, duplicate IDs,
nonpositive bursts, negative arrivals/resources, malformed matrices, and allocation exceeding
maximum. Set explicit limits for process counts, simulated time, page streams, and frames.
Return consistent 400 responses instead of silently clamping or throwing server errors.

**Acceptance:** controller/service tests cover all invalid cases, including zero-burst SRTF;
every accepted computation terminates within an explicit workload bound. Check corresponding
frontend validation, but retain server-side enforcement.

### F-03 — P1: old search responses overwrite newer queries

**Evidence:** [SearchPage.jsx](frontend/src/pages/SearchPage.jsx) cancels only the debounce timer.
Once `fetchSearch()` starts, its callbacks always update results. The browser reproduction delayed
the `old` query, issued `new`, then observed `RESULT old` under the newer search state.

**Required work:** abort superseded fetches or associate each request with a generation token.
Guard success, failure, and loading-state updates. Extend [api.js](frontend/src/utils/api.js)
to accept an abort signal if that approach is used.

**Acceptance:** delayed-response tests prove old successes and failures cannot overwrite new
results, a changed category, a cleared search box, or an unmounted page.

### F-04 — P1: topic loading and interview pagination have the same stale-request risk

**Evidence:** [TopicViewer.jsx](frontend/src/components/TopicViewer.jsx) does not cancel or ignore
content requests after `topicId` changes. [InterviewPage.jsx](frontend/src/pages/InterviewPage.jsx)
guards the initial fetch with a cancellation flag, but its `loadMore()` callbacks append results
without checking whether category/difficulty changed. Pagination failures are silently ignored.
These are confirmed missing guards from code inspection; the search equivalent was reproduced
in the browser, but these two flows were not separately exercised with delayed responses.

**Required work:** protect all content/pagination callbacks with request identity; reset pagination
loading state on filter changes; provide a retryable load-more error. Distinguish a missing lesson
from a network/server failure instead of displaying “Content not available yet” for every error.

**Acceptance:** rapid navigation never shows lesson A under lesson B's title, and a delayed page
from a previous filter never enters the current interview deck.

### F-05 — P1: mobile page overflow remains on important routes

**Measured document widths at a 320px viewport**, reproduced in both themes:

| Route | Document scroll width | Result |
|---|---:|---|
| `/` | 320px | Fits |
| `/topic/java-execution-pipeline` | 320px | Fits |
| `/topic/process-management` | 320px | Fits |
| `/topic/dbms-indexing` | 320px | Fits |
| `/topic/application-layer` | 322px | Small overflow |
| `/topic/embeddings-vector-db` | 396px | Overflow |
| `/search` | 595px | Substantial overflow |
| `/interview/all` | 595px | Substantial overflow |

All these samples fit at 1440px. The browser smoke did not establish the complete cause for every
overflow, so a single CSS change should not be assumed to fix all cases.

**Required work:** inspect flex/grid minimum widths, the category filter strips, long prose/math,
and scroll containers in [App.css](frontend/src/App.css). Make intended overflow local to tables,
code, diagrams, or a labeled filter strip. Preserve a readable page width and keyboard access to
horizontal scrolling.

**Acceptance:** browser assertions at 320, 375, 768, 1024, and 1440px pass for every route family,
long lessons, both themes, empty/error states, and retained simulators.

### F-06 — P2: reader section tracking initializes before lazy Markdown headings exist

**Evidence:** [TopicViewer.jsx](frontend/src/components/TopicViewer.jsx) creates its
`IntersectionObserver` in an effect depending only on `content`. The Markdown renderer is lazy
and may still be showing Suspense fallback at that point. Browser instrumentation recorded zero
`observe()` calls for every sampled lesson even after the headings appeared.

**Required work:** initialize observation after rendered headings mount, using an explicit ready
callback, a scoped ref lifecycle, or another reliable DOM-ready mechanism. Scope progress to the
article rather than the entire document, whose height also includes navigation and the recall deck.

**Acceptance:** on a cold load with a delayed Markdown chunk, scrolling through all three tiers
updates the active TOC item and Continue control. Navigation cleans up the old observer.

### F-07 — P2: generated-diagram checks do not establish freshness or visual correctness

**Evidence:** [render-diagrams.mjs](scripts/render-diagrams.mjs) checks hashes of Mermaid source,
manifest metadata, asset existence, and an SVG header/viewBox. It does not fingerprint theme
tokens, fonts, Mermaid version, renderer configuration, or renderer source. Those inputs can
change while `--check` still passes. There are no generator-specific tests.

The renderer's `pageHtml()` names IBM Plex Sans but defines/loads no `@font-face` and never waits
for an explicitly loaded font. A reproduction of that page had `document.fonts.size === 0`.
Merely assigning a font-family name does not load the repository font; a permissive
`document.fonts.check()` result alone is not evidence it loaded. The current documentation's
claim that the generator waits for the real font is inaccurate.

The generator also writes assets and the manifest, then removes orphan files, before returning
failure for any render errors. A failed generation can therefore leave a partial publication.

**Required work:** explicitly load/embed the intended font; consider the restrictions on external
resources in SVG images. Record a deterministic fingerprint of all rendering inputs and verify
asset integrity. Validate actual SVG XML and browser decoding, not only the header. Generate to
a staging location, validate the complete result, then publish; clean up browser resources on
failure and bound render duration. Preserve the deterministic check rather than comparing
nondeterministic edge-routing bytes from two separate renders.

**Acceptance:** changing theme/font/renderer inputs invalidates assets; malformed/truncated SVGs
fail checks; long labels remain visible as the actual `<img>` embeds; a failed run preserves the
previous complete asset set. See [MDN SVG image restrictions](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image).

### F-08 — P2: unregistered topic prefixes resolve to existing lessons

**Evidence:** [ContentService.java](backend/src/main/java/com/csfundamentals/service/ContentService.java)
falls back from exact filenames to `startsWith(topicId)`. A direct service probe showed
`exists("os", "process") == true` and returned the Process Management lesson, although the
registered ID is `process-management`. The controller relies on this method for its 404 behavior.

**Required work:** validate category/topic against the registry and resolve an exact file mapping.
Normalize and constrain filesystem paths to the configured root. Use typed failures for missing
content and I/O errors; directory-listing errors currently become “not found,” while other errors
are detected by matching a response string.

**Acceptance:** unknown prefixes and wrong category combinations return 404; directory/read
failures return controlled 500 errors without leaking internal paths; all 63 valid IDs still work.

### F-09 — P2: subnet host ranges are wrong for `/31` and `/32`

**Evidence:** direct probes of `SimulationService.computeSubnet()` returned:

| Input | Actual first host | Actual last host | Problem |
|---|---|---|---|
| `192.168.1.10/31` | `192.168.1.11` | `192.168.1.10` | Inverted range |
| `192.168.1.10/32` | `192.168.1.11` | `192.168.1.9` | Both bounds are outside the single-address subnet |

**Required work:** explicitly handle point-to-point `/31` and host-route `/32` semantics,
including the meaning of broadcast and usable hosts. Reject CIDR values outside 0–32 instead of
silently clamping them. Use the same conventions in the UI and lesson examples.

**Acceptance:** test network, mask, broadcast semantics, first/last host, and counts for `/0`,
`/24`, `/30`, `/31`, and `/32`, plus malformed IP and CIDR inputs. The existing `/32` test only
checks validity and mask, so it misses this error.

### F-10 — P1: dependency findings need remediation and exposure review

**Evidence:** the audit command reports 8 affected packages in the installed frontend dependency
tree: Vitest critical; Vite and nanoid high; five moderate findings including the Router packages.
Production-only auditing reports two moderate affected packages. Counts refer to packages,
including transitive effects, not eight independently exploitable application flaws.

**Exposure:** the critical Vitest advisory concerns its UI/API/browser-server exposure; the project
currently runs `vitest run`. This does not establish critical remote execution in the deployed
static frontend. Likewise, an SSR hydration advisory does not demonstrate an SSR vulnerability in
this client-rendered app. Review each advisory against actual usage while still updating affected
dependencies. The [Vitest maintainer advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp)
describes its exposure conditions.

**Required work:** plan compatible Vite/Vitest/React Router upgrades, refresh transitive packages,
align runtime versions, rerun tests/build/browser checks, and rerun the audit. Add automated
dependency alerts and a Java dependency scan for the Spring Boot 3.2.0 dependency tree; this audit
did not establish a backend CVE inventory. Avoid an unreviewed forced-major dependency update.

**Acceptance:** every remaining advisory has a documented applicability decision or verified fix;
runtime and development tooling are covered by recurring scans.

### F-11 — P2: diagram alternative text does not explain the diagram

**Evidence:** [MermaidBlock.jsx](frontend/src/components/markdown/MermaidBlock.jsx) emits generic
alt text such as “Flowchart for the surrounding lesson.” Readers cannot access node/edge labels
as page text when the diagram is an `<img>`. The source is only exposed on failure, and the
figure does not provide a descriptive long-text alternative or an explicit keyboard scroll target.

**Required work:** add authored diagram titles/summaries and meaningful long descriptions or
equivalent adjacent text. Provide a keyboard-operable enlarged/open view and local scrolling for
large diagrams, preserving native dimensions when necessary for legibility.

**Acceptance:** users can understand the illustrated relationship using a screen reader and
inspect a wide diagram using only a keyboard. Follow [W3C complex-image guidance](https://www.w3.org/WAI/tutorials/images/complex/).

### F-12 — P2: unknown routes have no recovery page

**Evidence:** [App.jsx](frontend/src/App.jsx) has no wildcard route. The browser loaded
`/not-a-real-route` with navigation but no H1 or page content. Unknown topic IDs also become a
generic content-unavailable message rather than a useful navigation outcome.

**Required work:** add a not-found route with a clear heading, Home/Search recovery actions, and
consistent missing-topic handling. Add an error boundary for lazy-import/render failures.

**Acceptance:** invalid routes and failed lazy chunks show an actionable page instead of an empty
main area; normal deep links still load through Nginx.

### F-13 — P2: documentation overstates completion and contains obsolete instructions

**Evidence:** [README.md](README.md) still advertises removed DBMS, core-Java, and Spring
simulators as interactive features. It includes “Metaspace static allocation,” while the actual
lesson correctly rejects that simplification. Its fresh-clone quickstart omits `npm ci --prefix
frontend`, and `start.sh` does not install dependencies.

[CLAUDE.md](CLAUDE.md) still describes live Mermaid imports, unused hooks as active machinery,
and a test example for a deleted engine. Its manual Maven startup uses the configured backend
port 8080 while the separately launched Vite proxy defaults to 9190. The main launcher does set
the matching port correctly. [UI_REVAMP_PLAN.md](UI_REVAMP_PLAN.md) declares phases closed while
its definition of done retains unverified criteria and stale test totals. The recent all-pass
claims predate the mobile and diagram findings in this report.

**Required work:** generate or verify the feature inventory against the actual visualizer
registry; label historical sections; fix fresh-clone and manual startup commands; reconcile
completion claims with dated verification evidence. Update `RCA.md` when remediating confirmed
agent-created regressions. Preserve the authoritative coverage plan and authoring contract.

**Acceptance:** a fresh clone can follow the documented instructions, listed simulations exist,
and every completed release criterion has current evidence or an explicitly accepted exception.

### F-14 — P1: 16 generated diagram assets cannot be parsed as SVG XML

**Evidence:** Chromium's `DOMParser` parsed all 562 generated files as `image/svg+xml`.
Sixteen files failed with `Unexpected closing tag: ...p != ...br`: both theme variants for
hashes `127d88db`, `420cfd27`, `69189595`, `8df19fd5`, `9947b1d6`, `c79483f7`, `c9d6e318`,
and `f8f4df99`. The embeddings lesson showed only five image elements for its six authored
diagrams during the browser smoke. All source hashes match the manifest, so source lookup
is not the explanation for these failures.

Affected lessons: `content/aiml/01-embeddings-vector-db.md` (3 diagrams),
`content/dbms/06-transactions-acid.md` (2), `content/dbms/07-concurrency-control.md` (2),
and `content/java-spring/01c-java-memory-model.md` (1).

**Root cause:** [render-diagrams.mjs](scripts/render-diagrams.mjs) stores `host.innerHTML` after
inserting SVG into an HTML document. HTML serialization leaves XHTML `<br>` elements unclosed;
those bytes are invalid when loaded as an XML SVG image. Inline HTML rendering can conceal this
defect. `checkGeneratedAssets()` checks only the opening SVG header/viewBox and therefore accepts
the broken files. The static-image reader integration exposes this previously untested boundary.

**Required work:** serialize the SVG through an XML-safe serializer, preserve the required
namespaces, regenerate the affected assets, and validate both XML parsing and actual browser
image decoding. Add this incident to RCA when implementing the fix; do not mark the static
diagram pipeline fully verified on the basis of the inventory check alone.

**Acceptance:** all 562 files parse as SVG XML and decode through the same `<img>` mechanism used
by readers; every authored diagram displays in both themes without a source-error fallback.

## Improvements to plan after the fixes

| ID | Priority | What needs to be done | Completion evidence |
|---|---|---|---|
| I-01 | P2 | Make Search URL state bidirectional. It seeds React state from `useSearchParams()` only once, so later Back/Forward/query-only navigation may disagree with the visible search. Add pagination or explicitly disclose the 20-result display cap; the API reports a total but the UI cannot access matches beyond its requested limit. | Browser history, invalid category, shareable URL, and more-than-20-results tests. |
| I-02 | P2 | Establish one catalog source for IDs, titles, categories, prerequisites, and study order. Backend `TopicService`, `TopicPage.titleMap`, `topicCategories`, and the full Home fallback duplicate metadata. Home currently sorts by difficulty then alphabetically, which does not guarantee Java fundamentals → advanced Java → Spring. | Generated/shared metadata and explicit prerequisite order; catalog parity checks. |
| I-03 | P2 | Make backend-unavailable behavior honest and recoverable. Home substitutes a full local catalog when the API fails, but the lessons still require that API. Add loading/offline/error distinctions and Retry rather than implying offline study is ready. | Disable the API and verify clear messaging, retry, and no misleading success state. |
| I-04 | P2 | Expand CI to include the 10 script tests, browser layout/accessibility checks, request-race cases, actual SVG image decoding, and Docker smoke tests. Add engine/controller edge tests rather than relying mainly on array lengths and happy paths. | The defects in F-01–F-12 fail automated tests before their fixes and pass afterward. |
| I-05 | P2 | Reduce static inline presentation in visualizers and resolve the revamp acceptance criteria. There are 408 `style={{` occurrences against the original ≤160 goal; some are legitimate computed geometry and must be classified before changing them. | Measured before/after inventory; semantic tokens for presentation; approved exceptions for computed values. |
| I-06 | P2 | Review the 666.17 kB Markdown chunk and static-asset delivery. Scope syntax languages/plugins based on actual content; evaluate lazy math/highlighting only if justified. Add cache policies/compression for versioned JS/fonts/SVGs and ensure missing static assets return 404 rather than the SPA HTML fallback. | Bundle and cold-load budgets, cache/header checks, missing-image behavior, and no loss of math/code rendering. |
| I-07 | P2 | Add semantic curriculum review in the requested order: core Java/OOP, advanced Java, Spring, OS, networks, DBMS, AI/ML last. Check interview answers for correctness, duplicate templates, runnable code, trade-offs, and source/version context. Structural counts are already complete and should not trigger padding or indiscriminate expansion. | Per-topic review ledger; compiled/runnable examples where practical; reviewed corrections and stable coverage gates. |
| I-08 | P2 | Improve operational configuration: explicit content-root setting, fail-fast startup if curriculum is unavailable, readiness that checks content/index availability, coherent CORS policy, and documented restart/reindex behavior when mounted content changes. CORS currently allows localhost:5173; normal proxied requests avoid that mismatch, but direct cross-origin use does not. | Missing-content startup test, valid deployment configuration, and explicit content-update behavior. |
| I-09 | P3 | Add learner progress/bookmarks, a resume position, and known/needs-review question marking if these are desired product goals. Keep them local initially unless cross-device accounts are explicitly needed. | Usability review and persistence tests; distinguish new scope from completion defects. |
| I-10 | P3 | Harden the launcher with automated collision/exit/cleanup tests, validated numeric port overrides, and verified termination of Maven/npm descendant processes. Check the case where both requested starting ports are equal. | Two successful launches without collisions, clean Ctrl+C/child-failure shutdown, and no orphan listeners. |

## Proposed removal of unused files

These four files have no source import consumers in a relative-import inventory, and a whole-repo
reference search found only their definitions or documentation mentions. They are cleanup
candidates; they do not contain curriculum or interview questions.

| File | Why removal is reasonable | Follow-up needed |
|---|---|---|
| `frontend/src/hooks/useSimulationTimer.js` | Unused duplicate timer hook. | Remove the stale active-use claim in `CLAUDE.md`; annotate the historical UI plan note. |
| `frontend/src/hooks/useStepThrough.js` | Unused step-navigation hook. | Remove its stale active-use claim in `CLAUDE.md`. |
| `frontend/src/components/shared/LegendRow.jsx` | No component imports or runtime references. | Remove only proven-unused associated CSS; preserve shared swatch styles used elsewhere. |
| `frontend/src/components/shared/StepThroughController.jsx` | No component imports or runtime references. | Update `.claude/references/component-contracts.md`; prune only its unused selectors and preserve `.simulation-control-bar`/`.buttons-group` shared rules. |

No simulator, JSON question source, lesson, test fixture, font, or generated SVG should be deleted
on the basis of a filename-only scan. The generated diagrams are now runtime assets. Historical
plans, `RCA.md`, agent instructions, and `CONTENT_SPEC.md` still have distinct uses; reconcile or
archive them deliberately rather than deleting them as apparent duplicates. Installed dependencies
and ignored build output are not included in the proposed tracked-file cleanup.

## Recommended execution order

1. Restore deployability, repair invalid diagram assets, and bound backend simulation inputs:
   F-01, F-14, F-02, F-09. Add regressions
   to container/controller/algorithm tests and record the deployment incident in RCA.
2. Correct core study interactions and mobile layout: F-03–F-06, F-08, F-12, then I-01.
3. Finish diagram reliability and accessible alternatives: F-07, F-11, including a browser
   decoding/geometry check of every generated asset.
4. Remediate dependencies and improve CI coverage: F-10, I-04, with current support/advisory review.
5. Reconcile documentation and remove approved dead files: F-13 and the cleanup inventory.
6. Improve metadata consistency, payload/performance, operations, and curriculum accuracy:
   I-02, I-03, I-05–I-08, I-10. Treat I-09 as optional new product work.

Use focused commits for independent fixes. A final release decision should require a clean local
and container startup, full test/build/content gates, bounded invalid-input behavior, browser
tests at the specified widths/themes, and an accurate completion record. The earlier phase
checkboxes alone are insufficient evidence.
