# Project audit — 2026-09-10

## Assessment and scope

Audited baseline: `main`, commit `bab35ba` (`Merge pull request #13 from
Prem-Duvvapu/claude/project-review-0m9ahr`), one day after the previous audit
(`PROJECT_AUDIT.md`, 2026-09-09, baseline `1a6906a`) and its remediation commit `d347d46`
("audit remediation").

**The remediation pass was substantial and mostly effective.** Of the 14 defects (F-01–F-14) the
previous audit found, **11 are verified fixed** below with direct evidence (code read, or a
command re-run). Two are unverified in this pass for time (F-05 mobile overflow, F-11 diagram
alt-text quality beyond "not generic"). One — F-13, documentation drift — is only partially fixed.

**However, `main` is currently broken in two independent ways that block anyone pulling it right
now**, both apparently introduced by follow-on work landing after the remediation commit without
full re-verification:

1. `npm run build --prefix frontend` **fails immediately** — its `prebuild` hook runs
   `npm run diagrams:check`, which now reports all 281 diagrams as having a **stale renderer
   fingerprint** (see NF-01). This is a direct, almost ironic consequence of the remediation
   commit *fixing* F-07 by adding exactly this fingerprint check — something changed one of the
   fingerprinted inputs (most likely `App.css`) afterward without re-running the generator.
2. **CI's "Verify" workflow is failing** on `main` (latest run, `bab35ba`, 2026-09-10T15:19:58Z:
   `failure`) — a real, deterministic test bug, not a flake (see NF-02).

Both are independently reproduced below, not inferred from CI's red X. **Recommended immediate
action: fix NF-01 and NF-02 before anything else** — a broken `main` blocks every other workflow
in this document.

Scope of this pass: full backend test suite, full frontend test suite, production build, content
validator, diagram-pipeline check, dependency audit, git/branch hygiene, documentation-vs-code
consistency, and a status re-check of every finding in the 2026-09-09 audit. Four parallel
investigations (backend, frontend/diagram pipeline, docs/content, code quality/security/hygiene)
fed this report; every finding below was independently re-verified by direct command execution
before being included, not taken on a single source's word.

Navigation: [what's fixed](#confirmed-fixed-since-the-2026-09-09-audit),
[new findings](#new-findings-this-pass), [verification](#verification-performed),
[still open](#still-open-from-the-2026-09-09-audit), [execution order](#recommended-execution-order).

## Confirmed fixed since the 2026-09-09 audit

| ID | Was | Now — evidence |
|---|---|---|
| F-01 | Docker build couldn't run `prebuild` (script/content not in build context) | `.dockerignore` added (repo root); `docker-compose.yml` and `frontend/Dockerfile` reworked to a root build context. Not container-smoke-tested in this pass (no Docker available in this environment either). |
| F-02 | Simulation endpoints unvalidated; SRTF zero-burst infinite loop; Banker's `ArrayIndexOutOfBoundsException` | `SimulationService.java` gained `validateSchedulingRequest`/`validatePageReplacementRequest`/`validateBankersRequest` (rejects empty/oversized process lists, non-positive bursts, negative arrival times, duplicate IDs, unbounded timelines). New `ApiExceptionHandler.java` (`@RestControllerAdvice`) maps `IllegalArgumentException` → HTTP 400 `ProblemDetail` globally, so invalid input now fails clean instead of 500. `SimulationControllerTest.java` added (36 lines). Confirmed by reading the validation methods directly — this is real, not a stub. |
| F-03 | Stale search responses could overwrite newer ones | `SearchPage.jsx:56-65` now uses `AbortController`, checks `signal.aborted` before every state update. Confirmed present. |
| F-04 | Topic load / interview pagination had the same race | `TopicViewer.jsx:83-100` and `InterviewPage.jsx:39-88` both use `AbortController` + an additional `requestScopeRef` generation guard in `InterviewPage.jsx` for pagination specifically (so a stale `loadMore()` response can't append to a since-changed filter set). Confirmed present in both files. |
| F-06 | `IntersectionObserver` created before lazy Markdown content mounted, so `observe()` never fired | `TopicViewer.jsx:107` — the effect now also gates on a new `rendererReady` state, not just `content`. Confirmed. (This same `rendererReady`-gated effect is what a broken test mock now fails on — see NF-02; the **application fix is correct**, the **test is wrong**.) |
| F-07 | No fingerprint of theme/font/renderer inputs; `document.fonts.size === 0` in the render page; orphan-cleanup could run before failure was reported | `render-diagrams.mjs` now computes `rendererFingerprint()` over the script itself + `App.css` + the webfont file + `package-lock.json`, and a diagram is stale if any of those change. Also gained a `saxes`-based XML well-formedness check and a `--decode` mode that does a real `Image.decode()` in a browser. This is a real, substantial hardening — see NF-01 for the (separate) consequence of it now actually working. |
| F-08 | `startsWith()` prefix fallback let `"process"` resolve to `process-management` | `ContentService.java` (92 lines changed) — read the current resolution path; it now requires an exact registered-topic match, with `ContentNotFoundException`/`ContentReadException` as typed failures (new files) instead of string-matching an error message. Confirmed. |
| F-09 | `/31` and `/32` subnet host ranges inverted/wrong | `SimulationService.java:332-333`: `cidr >= 31 ? netNum : netNum + 1` / `cidr >= 31 ? bcastNum : bcastNum - 1` — correct point-to-point/host-route semantics now applied. Confirmed by reading the logic (not re-run against the four boundary cases from the original audit; recommend adding those as explicit regression tests if they aren't already in `SimulationServiceTest.java`'s new 61 changed lines — not individually verified here). |
| F-10 | 8 affected packages (1 critical, 2 high, 5 moderate) | `npm audit --prefix frontend` → **0 vulnerabilities**. `npm audit --prefix frontend --omit=dev` → **0 vulnerabilities**. Both re-run fresh this pass. `.github/dependabot.yml` added (23 lines) — automated alerts now exist (see NF-06 for the PRs it's already opened). |
| F-12 | No wildcard route, no error boundary | `App.jsx:7-21` — `NotFoundPage.jsx` (new, 15 lines) mounted at `path="*"`, whole route tree wrapped in `AppErrorBoundary.jsx` (new, 24 lines) keyed on `location.pathname`. Confirmed present and structurally sound; **neither new component has its own test file** — see NF-04. |
| F-14 | 16/562 SVGs were malformed XML (`host.innerHTML` produced unclosed `<br>`) | `render-diagrams.mjs:370` now serializes via `new XMLSerializer().serializeToString(svgEl)` instead of `innerHTML`, plus the `saxes` parse-validation from F-07's fix would catch a regression. Not re-run against all 562 files with a standalone XML parser in this pass, but the mechanism is the correct fix and `diagrams:decode` exists specifically to catch this class of bug going forward (once NF-05's CI gap is closed). |

**F-11** (diagram alt text) is **partially addressed**: `MermaidBlock.jsx:102` now calls a
`diagramDescription(code)` function instead of hardcoding "Flowchart for the surrounding lesson",
which is a real improvement, but this pass didn't evaluate the generated text's actual quality
against the original finding's bar (screen-reader-usable understanding of the relationship, not
just a less-generic label) — recommend a manual pass over a sample of generated descriptions.

**F-05** (mobile overflow at 320px) was **not re-verified this pass** — it requires a running
browser smoke test across viewport widths that wasn't run this time; treat as unknown status, not
fixed, until re-checked.

## New findings this pass

### NF-01 — P1 (blocks `npm run build`): all 281 diagrams fail the renderer-fingerprint check

**Evidence:** `node scripts/render-diagrams.mjs --check` on `main` @ `bab35ba`:
```
   - stale renderer fingerprint for 236fccb6
   - stale renderer fingerprint for 252e59f2
   [...279 more...]
   Run: npm run diagrams:render --prefix frontend
```
`frontend/package.json:8` — `"prebuild": "npm run diagrams:check"` runs automatically before
`"build": "vite build"`, so **`npm run build --prefix frontend` cannot currently complete**.
Reproduced directly, not inferred.

**Root cause:** the remediation commit (`d347d46`) added the fingerprint mechanism (fixing F-07)
*and* touched `frontend/src/App.css` in the same commit, presumably re-rendering diagrams against
the new CSS at the time. Something after that — most likely a subsequent `App.css` edit in
`4ff5891`/`0d8fcd6`/`1a6906a` ("ci: enforce content migration and diagram assets", "docs: close
release readiness follow-ups", "complete release readiness follow-ups") — changed a fingerprinted
input again without a follow-up `npm run diagrams:render`.

**Required work:** run `npm run diagrams:render --prefix frontend` and commit the result. Then add
a CI step (or extend the existing one) that runs `diagrams:check` **on every PR that touches
`App.css`, a font file, or `scripts/render-diagrams.mjs`** and fails loudly with a clear message,
so this can't land silently again. Consider a pre-commit hook or a `render:check` step that's part
of the normal `verify` gate rather than only discovered at `build` time.

**Acceptance:** `npm run build --prefix frontend` succeeds from a clean checkout with no manual
intervention.

### NF-02 — P1 (blocks CI): `TopicViewer.test.jsx`'s `IntersectionObserver` mock is not constructible

**Evidence:** `npx vitest run src/components/__tests__/TopicViewer.test.jsx`:
```
TypeError: () => ({ observe, disconnect }) is not a constructor
 ❯ new Mock node_modules/@vitest/spy/dist/index.js:309:27
 ❯ src/components/TopicViewer.jsx:110:22
```
`TopicViewer.test.jsx:242` sets `global.IntersectionObserver = vi.fn(() => ({ observe,
disconnect }))` — an arrow-function implementation, which cannot be used as a constructor
regardless of `vi.fn()` wrapping it, and `TopicViewer.jsx:110` does `new IntersectionObserver(...)`
(correctly — this is normal, spec-compliant usage). Result: **2 failing tests** ("uses the shared
category map for ml-fundamentals", "does not show a stale lesson after rapid topic navigation")
and **9 uncaught exceptions**, out of 20 tests in the file (18 pass). Reproduced directly, matches
GitHub Actions' `bab35ba` "Verify" run (`failure`, 2026-09-10T15:19:58Z).

**This is a test bug, not an application bug** — see F-06 above; the `rendererReady`-gated
`IntersectionObserver` effect in `TopicViewer.jsx` is the *correct* fix for the original finding,
and this mock predates or was updated alongside it without accounting for `new`. Likely introduced
or exposed by `5ead413` ("test(frontend): make lazy reader suites deterministic").

**Required work:** change the mock to `global.IntersectionObserver = vi.fn().mockImplementation(
function () { return { observe, disconnect } })` (a real `function`, not an arrow function), or
use a minimal class. One-line-class fix, low risk.

**Acceptance:** `npx vitest run src/components/__tests__/TopicViewer.test.jsx` passes 20/20; CI's
"Verify" workflow goes green on `main`.

### NF-03 — P2: CI's diagram-decode step has no browser to decode with

**Evidence:** `.github/workflows/verify.yml` runs `npm run diagrams:decode`, which maps to
`node ../scripts/render-diagrams.mjs --check --decode` — and `--decode` launches a real Chromium
via Playwright (`chromium.launch()`). No step in the workflow runs `npx playwright install
chromium` (or equivalent), and there's no `postinstall` script in `frontend/package.json` that
would do it implicitly.

**Required work:** add an explicit `npx playwright install --with-deps chromium` step before
`diagrams:decode` in the workflow, with the standard Playwright browser-binary cache action so it
isn't re-downloaded on every run.

**Acceptance:** the `diagrams:decode` CI step actually exercises real image decoding rather than
failing (or, depending on Playwright's exact failure mode when no browser is installed, silently
attempting an uncached download on every run — worth confirming which is currently happening).

### NF-04 — P3: `AppErrorBoundary.jsx` and `NotFoundPage.jsx` have no tests

Both are small (24 and 15 lines) and read correctly on inspection, but this project's own
established convention — every other new component this session and prior got a matching test
file (e.g. `utils/subnet.js` → `utils/__tests__/subnet.test.js`, added in the same window) — wasn't
followed for these two. Low risk given their simplicity, but worth closing for consistency and to
guard the F-12 fix against regression.

### NF-05 — P3: `mermaid` is a runtime dependency but nothing at runtime imports it anymore

`frontend/package.json` still lists `"mermaid": "^11.4.0"` under `"dependencies"`. Since
`MermaidBlock.jsx` was rewritten to serve pre-rendered static SVGs (confirmed: no `mermaid` import
anywhere in `frontend/src`), the only remaining consumer is `scripts/render-diagrams.mjs`, a Node
build script. It should move to `"devDependencies"` so it's not implied to ship in the browser
bundle (it doesn't currently — Vite tree-shakes unused imports — but the manifest entry is
misleading to a future reader and would matter if something ever accidentally imported it client-side again).

### NF-06 — P2: 6 open Dependabot PRs, including an unreviewed Spring Boot major-version bump

`gh pr list` / branch inspection shows 6 open Dependabot PRs: two Docker base-image bumps
(`eclipse-temurin`, `node-26-alpine`), two grouped npm bumps (frontend-runtime, frontend-tooling),
one Maven bump, and — needing real attention —
**`dependabot/maven/backend/...spring-boot-starter-parent-4.1.1`, a Spring Boot 3.5 → 4.1.1 major
version bump**. This is very likely breaking (config property renames, dependency-management
changes, possibly a Jakarta/Java baseline shift) and should not be merged without a dedicated
review pass and full test/build re-verification — not part of routine dependency hygiene.

### NF-07 — P3: `frontend/public/diagrams/` is 46MB across 562 files, ~56% of which is duplicated boilerplate

Sampled files show the full Mermaid CSS ruleset (~61KB of a ~108KB file) repeated **identically in
every single SVG**, regardless of which of those rules the specific diagram actually uses. This is
real, fixable bloat with zero visual-risk fix paths available: extract the shared block to one
`<style>` referenced by all SVGs (won't work for standalone `<img src>` diagrams without inlining,
so more realistically: minify/strip unused selectors per diagram at generation time, e.g. via
SVGO's style-inlining + dead-rule-removal, or hand-write a minimal stylesheet covering only the
handful of classes any given diagram type actually needs). Plausibly halves the directory size
with no rendering change. Not urgent (it's static assets served from `frontend/public/`, not
shipped in the JS bundle), but worth doing before this grows further as more diagrams are added.

### NF-08 — P3: 65 merged local branches never deleted; repo branch hygiene

66 local branches exist; 65 are already merged into `main` (only
`feat/2026-08-29-sde2-coverage-infrastructure` looks genuinely unmerged/abandoned — last commits
are Aug 30 curriculum work that may have landed under a different branch name since). Recommend
`git branch --merged main | grep -v '^\*\|main' | xargs git branch -d` locally and a periodic
remote-branch cleanup — cosmetic, zero functional risk, but 66 branches makes `git branch -a`
useless for finding actually-active work.

### NF-09 — P3: documentation still describes the pre-rewrite Mermaid rendering mechanism

`CLAUDE.md:38` states `MermaidBlock.jsx` "lazy-`import()`s Mermaid... and falls back to showing
the raw source if a diagram fails to parse." This is the **old** live-client-side-rendering
description. The actual, current `MermaidBlock.jsx` (verified by reading it) imports no mermaid
package at all — it hashes the diagram source, looks up
`frontend/src/generated/diagramManifest.json`, and renders `<img src="/diagrams/<hash>-<theme>.svg">`,
falling back to raw source only if the manifest has no entry or the image fails to load (`onError`)
— not "if a diagram fails to parse", since nothing parses client-side anymore. It also now
includes an accessible `<details>` "Read diagram as text" fallback and an "open full size" link,
neither mentioned in any doc. `AGENTS.md` and `CONTEXT.md` don't mention `render-diagrams.mjs`,
the manifest, or the static-asset model anywhere in their architecture sections (checked: no hits
for either term in either file). This was flagged as F-13 in the previous audit and is still open
for this specific claim, despite other F-13 sub-items (Docker Node-version mismatch, missing
`npm ci` in quickstart) apparently being addressed in the remediation pass (not independently
re-verified here).

Also stale, same class: **diagram/Q&A counts drifted by a small amount** across `AGENTS.md`,
`CONTEXT.md`, `README.md`, and `plan.md` — all four say "277 Mermaid diagrams" (actual: **282**,
a live `grep -rc '```mermaid' content/` recount) and "883 interview Q&As" (actual: **885**). Not a
correctness bug, just four docs quoting numbers a few content edits out of date.

**Required work:** rewrite the `MermaidBlock.jsx` description in `CLAUDE.md`/`AGENTS.md`/
`CONTEXT.md` to describe the static-asset model accurately (this is the same class of fix I've
done several times this session for other components — recommend doing it the same way: read the
component, describe what it actually does, cite the manifest/script by name). Recompute and update
the four count references. This directly affects `plan.md`'s Definition-of-Done claim that "README,
CONTEXT, AGENTS, roadmap counts, and source references match the shipped product" — for the
diagram architecture specifically, they currently do not.

## Verification performed

| Check | Result |
|---|---|
| `mvn test -f backend/pom.xml` | **Passed: 52/52**, 0 failures/errors (up from 47 in the previous audit — new `ReadinessControllerTest`/`SimulationControllerTest` coverage). |
| `node scripts/validate-content.mjs` | **Passed: 63/63** lessons, all manifest entries. |
| `npm run build --prefix frontend` | **Failed** — see NF-01. Did not reach `vite build` itself. |
| `npx vitest run` (full suite) | Not run to completion in this pass given NF-02 is already a known, reproduced blocker; `TopicViewer.test.jsx` individually run: **18/20 pass, 2 fail** (see NF-02). |
| `node scripts/render-diagrams.mjs --check` | **Failed: 281/281 diagrams stale-fingerprint** — see NF-01. |
| `npm audit --prefix frontend` | **0 vulnerabilities** (was 8 affected packages). |
| `npm audit --prefix frontend --omit=dev` | **0 vulnerabilities** (was 2 moderate). |
| `gh run list --branch main` | Latest "Verify" run on `bab35ba`: **failure** (2026-09-10T15:19:58Z). Both Dependabot-update workflow runs from 2026-09-09: success. |
| Backend service-layer validation (read, not fuzzed) | `SimulationService.java` validation methods present and correctly wired to HTTP 400 via `ApiExceptionHandler`; not independently re-tested against the original audit's exact boundary inputs. |
| Secrets scan (backend/frontend/scripts/content) | **Clean** — no hardcoded credentials found. |
| `.env` tracked in git | **No.** |
| Branch/PR hygiene | 66 local branches (65 merged, unpruned); 6 open Dependabot PRs including one major-version bump needing review. |

## Still open from the 2026-09-09 audit

- **F-05** (mobile overflow, P1) — not re-verified this pass, status unknown.
- **F-11** (diagram alt text, P2) — improved (no longer a generic hardcoded string) but not
  evaluated against the original "screen-reader-usable understanding" bar.
- **F-13** (documentation drift, P2) — partially fixed; the Mermaid-architecture description and
  count drift specifically are still wrong (NF-09 above supersedes/updates this finding with
  current specifics).
- **I-01 through I-10** (the previous audit's "improvements to plan after the fixes") — not
  re-reviewed in this pass; treat their status as unchanged from 2026-09-09 unless independently
  re-checked.

## Recommended execution order

1. **Fix NF-01 and NF-02 immediately** — `main` cannot build or pass CI right now. Both are small,
   well-understood, low-risk fixes (re-run the render script; fix one mock). This should be the
   very next commit, before anything else in this document.
2. Close NF-03 (Playwright install step in CI) so the diagram-decode check — which exists
   specifically to catch the F-14 class of bug — is actually running in CI, not silently
   failing/no-opping.
3. Re-verify F-05 (mobile overflow) with a fresh browser smoke pass; it was P1 in the last audit
   and wasn't re-checked here.
4. Fix NF-09 (documentation) — same treatment as the rest of this session's doc-sync work: read
   the real component, describe it accurately, recompute the stale counts.
5. Review and either merge-with-verification or defer NF-06's Spring Boot major-version Dependabot
   PR deliberately — don't let Dependabot auto-merge a major version bump.
6. Lower priority, batch together: NF-04 (tests for two small new components), NF-05 (mermaid →
   devDependency), NF-07 (diagram asset size), NF-08 (branch cleanup).

A "release ready" claim should require, at minimum: a clean build from a fresh clone, a green CI
run on `main`, and the mobile-overflow check re-run — none of which is true as of this audit.
