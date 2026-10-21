# Learning-network link maintenance

The cross-project references in [`BACKEND_ENGINEERING_COVERAGE_2026-10-17.md`](../BACKEND_ENGINEERING_COVERAGE_2026-10-17.md) remain the only maintained set of destination URLs. `scripts/audit-learning-links.mjs` reads them directly. Its small `identities` map records the expected owner, stable lesson/problem/module ID and displayed title, not another curriculum or progress registry.

## Run the checks

Use Node 24, the repository's locked frontend dependencies and its matching Chromium:

```sh
npm ci --prefix frontend
(cd frontend && npx playwright install chromium)
node scripts/audit-learning-links.mjs --inventory-only
node --test scripts/audit-learning-links.test.mjs
node scripts/audit-learning-links.mjs --report /tmp/learning-link-report.json
```

The offline inventory command needs no browser. The deterministic tests use an ephemeral loopback server and real Chromium; they never call a sibling deployment. The live audit uses public pages and catalogs. No credentials, paid service, saved answers, notes, simulation inputs or learner progress are required or sent.

Exit codes distinguish the outcome:

| Exit | Meaning | Response |
|---|---|---|
| `0` | All monitored references verified within their stated evidence scope | Retain the report with the release evidence. |
| `1` | Confirmed contract/policy failure | Inspect the reference and owning app before changing its destination. |
| `2` | Temporary outage or unavailable rendering prevented verification | Retry after recovery; do not label the concept removed. |

A confirmed failure takes precedence if a run also contains outages. Reports contain only reference IDs, stable public IDs, public final URLs, statuses, timestamps, report state and evidence categories. Reports checkpoint atomically after each reference, so an interrupted run remains explicitly incomplete. Response bodies and browser storage are not logged. A failed inventory or browser startup is a tooling failure and may occur before a report exists.

## What is actually checked

All 18 sibling references currently receive contracts: three catalog landing links and fifteen specific lessons. Adding another DSA/LLD/HLD reference without verification metadata fails the inventory gate. Removing or renaming an existing contracted reference also fails. The external OWASP references are outside this sibling-learning audit's scope.

For every destination, the HTTP client requires HTTPS and the exact expected host, prohibits credentials/query strings/fragments, rejects draft paths (including encoded `draft`), follows at most three redirects and rejects redirects to an unrelated host. A redirect is acceptable only when the subsequent lesson identity still matches. Changing a host requires an explicit reviewed policy change.

Lesson identity uses two kinds of evidence:

- **DSA:** the published `/api/problems` catalog must contain exactly one matching stable problem ID and expected title; the actual rendered page must show the expected visible H1.
- **HLD:** `/api/v1/topics` must contain exactly one matching stable topic ID/title, with a published status when supplied; the actual rendered page must show the expected visible H1. An explicitly draft/unpublished record fails.
- **LLD:** the destination has no public module catalog contract in this integration. Expected module IDs and titles were reviewed against its route table and page source; the deployed page must show the expected visible module H1. This is rendered identity evidence, not verification of every interactive example or backend operation.

A `200` HTML shell is never sufficient for a deep link. HTML returned from a catalog endpoint fails instead of passing as JSON; missing/duplicate IDs, mismatched titles, a redirect to the homepage, a hidden heading, or an unrelated rendered lesson fail. Landing links are labelled **availability only**, not proof that a particular lesson exists.

Titles are compared after case, punctuation, whitespace and decorative-emoji normalization. A meaningful title change intentionally asks for review. The checker cannot independently prove that all paragraphs or exercises under a correct heading retain their original teaching scope. Scope review remains necessary before replacing a lesson.

## Bounds and outage handling

Each HTTP attempt has a 12-second deadline across redirects and streamed response consumption, a 4 MiB response cap and at most one retry with a short delay. Only network failures, `408`/`425`/`429`, server failures and access-blocked responses are treated as temporary or inconclusive. `404`/`410` and identity/policy failures are confirmed. The retry does not multiply per-redirect deadlines.

Each browser visit uses a fresh, nonpersistent context, blocks service workers and downloads, permits only GET/HEAD requests to the expected host and caps intercepted requests at 100. Third-party analytics and writes are blocked. Navigation and expected-heading waits each have a 20-second limit; the context is closed in `finally`. No production browser profile is reused. Redirect policy is checked in both HTTP and browser navigation, including client-side navigation. Chromium Fetch interception pauses every redirect hop before allowing the request; ordinary route continuation alone does not provide that boundary.

A retry/loading error without a usable lesson heading, or a failed upstream response preventing rendering, is inconclusive. One bounded fresh-context retry after two seconds allows a sleeping backend to wake after the first client timeout. This follows HLD’s documented free-Render cold-start behavior; it is not a guarantee about unbounded provider recovery. An explicit frontend/backend contract incompatibility is a confirmed integration failure, distinct from removal or a temporary outage. A different successfully rendered lesson heading is an identity mismatch. The audit stops starting new checks after ten minutes and labels remaining references `audit-budget-exhausted`; a check already in progress may finish within its existing bounds. The checker does not rewrite a URL or invent a replacement after any outcome.

## CI and independent releases

[`.github/workflows/learning-links.yml`](../.github/workflows/learning-links.yml) runs deterministic tests for relevant pull requests. A separate live-monitor job runs on relevant pushes to `main`, manual dispatch and Monday/Thursday at 03:17 UTC; pull requests do not depend on independently deployed sibling availability. The deterministic job has an eight-minute ceiling and the live job a 15-minute ceiling, read-only repository permission, no deployment credentials and a 14-day JSON artifact retention period. Both confirmed and transient live outcomes make the live job visibly fail, with different exit codes and per-reference evidence; outages are not silently accepted.

GitHub schedules run the workflow on the default branch and may be delayed. A live scheduled success is evidence only for its recorded check time. This repository cannot guarantee that a sibling owner will preserve an old route or publish redirects. No messages or issues are automatically sent to other people.

## Repair a changed destination

1. Find the failed reference ID and classify the report as a confirmed failure or temporary verification outage.
2. Locate the stable problem/topic/module in the owner's published catalog or route/page source. Confirm that the replacement covers the same concept and is published.
3. Prefer the owner retaining the original route or a redirect to the same concept. Preserve supported query/hash navigation in the owning app when meaningful; this checker uses the canonical query-free lesson URL.
4. Update the one Markdown reference definition if a deliberate route move requires it. Update the identity title/owner policy only after reviewing the replacement; do not substitute a homepage, draft or similarly named unrelated lesson.
5. Run inventory, deterministic tests and the live audit; include the report and source/release evidence in the review. Native same-tab links and independent learner state remain unchanged.

The deterministic tests cover a valid lesson, same-concept redirect, off-host redirect, redirect loop, removed target, draft target, catalog identity mismatch, duplicate ID, HTML/SPA fallback returning `200`, hidden heading, wrong rendered lesson, body/deadline bounds, retried outage, and repair of a central reference followed by successful identity verification.

## October 18 implementation evidence

Local source inspection matched DSA `frontend/src/AppRouter.jsx` and the `GraphBfsDfsService` problem ID/title; LLD `frontend/src/App.jsx` and the nine selected modules' actual `LldPage` titles; and HLD `content/catalog.json` plus `CatalogController`'s published-topic endpoint. Sibling files were read only. These source checks supplement the rendered assertions; they do not certify all sibling functionality.

Initial live runs verified **17 of 18 references**: the three landings, both DSA problems, all nine LLD modules and three of the four HLD lessons. HLD `cache-aside` showed a retry state without a lesson heading. Initial classification was inconclusive. A focused follow-up established a **confirmed frontend/backend contract incompatibility**, not removal, a heading mismatch or a cold start:

- Page: `https://hld-with-ui.vercel.app/topics/cache-aside`.
- Both `/api/v1/topics/cache-aside` and `/api/v1/simulations/cache-aside` returned HTTP `200` in approximately 1.85 seconds on a fresh visit.
- The visible message was “This cache-aside response is incompatible with this app.” It persisted through a bounded 45-second observation and a separate fresh visit.
- The deployed descriptor and its four preset inputs reported `modelVersion: 1.0.0`; the frontend's `assertCacheCompatibility` requires `1.0.1`.
- Read-only sibling checkout: `main` and `origin/main` both identify `bdf18dc617675ff768c7d2d2ae29aba73a2aa9a9`; the only working-tree entry is untracked `output/`. Backend `1.0.1` entered merged commit [`6df9ffae` (#20)](https://github.com/Prem-Duvvapu/hld-with-ui/commit/6df9ffaeaead4f281cef552f275092cabcc7039c); the frontend compatibility gate entered [`add46a4c` (#30)](https://github.com/Prem-Duvvapu/hld-with-ui/commit/add46a4c8c6712ec55c9b57f008fc3f37fe8bba6). Both are ancestors of that current main. The proposed owning-app repair is redeploying the Java backend from an identified current-main revision containing `1.0.1`, followed by descriptor/preset/run compatibility and rendered-lesson verification. This source is already merged; the observed remote descriptor is stale relative to it. Weakening its compatibility check would hide the mismatch.

The audit now reports that explicit error as **confirmed `render-contract-incompatible`**. No sibling file, deployment or central reference was changed. Successful catalog identity and HTTP availability do not override a broken learner-facing page. The complete live audit started at `2026-10-18T11:42:17.120Z` and finished with **17 verified / 1 confirmed / 0 transient**, exiting `1`. Retain the final JSON report with the integration release; the remote defect remains open until the owning deployment is repaired.

The deterministic test suite passes all eleven tests with actual loopback HTTP and Chromium. Passing fixtures prove the detection behavior, not deployed availability. Activation of PR/scheduled monitoring still requires merging this workflow; its first scheduled execution is separate release evidence.

Primary behavior references: [Playwright page navigation and waits](https://playwright.dev/docs/api/class-page), [Playwright browser contexts](https://playwright.dev/docs/api/class-browsercontext), [GitHub scheduled workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), and [Node.js built-in fetch and AbortSignal](https://nodejs.org/api/globals.html), and [Chromium Fetch request interception](https://chromedevtools.github.io/devtools-protocol/tot/Fetch/). The workflow uses the Playwright version in `frontend/package-lock.json`; it does not install a second moving browser-tool version.


## October 21 bounded follow-up

A read-only follow-up attempted the public cache-aside topic and simulation descriptor endpoints
with separate five-second connection/fifteen-second total curl budgets and a 4 MiB body cap.
Both requests reached the total deadline (curl 28, about 15 seconds each); no JSON descriptor,
model version or rendered lesson was verified. This is current unavailability evidence, not
proof of removal or proof that the October 18 compatibility defect persists unchanged. The
original finding remains unresolved until a successful descriptor/preset/run and learner-page
check establishes the repaired state. No sibling source, deployment or destination was changed.
The monitoring workflow is now merged; actual future schedule execution still needs its own receipt.
