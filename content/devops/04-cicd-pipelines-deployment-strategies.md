# CI/CD Pipelines & Deployment Strategies

Every other topic in this category — containers, orchestration, load balancing — describes
how a running system behaves. CI/CD describes how code gets from a developer's commit into
that running system safely and repeatably. Interviewers ask about this because "we have a
pipeline" hides real engineering decisions: how much is automated versus gated by a human,
how a bad release is caught before it reaches every user, and how a rollback actually
happens when something does slip through.

**Before you start:** You only need to know what a code change, a test, and a server are.
Read the Docker lesson's Beginner tier if an image or container is unfamiliar.

**After this lesson, you should be able to:** explain a commit-to-production path,
name what CI checks before merge, distinguish build from deploy, and describe how
you would stop or reverse a release that harms users.

---

## 🟢 Beginner Level

### The Core Problem: Manual Deploys Don't Scale and Don't Repeat

A manual deploy — SSH to a server, pull the latest code, restart the process, repeat for
every server — has three problems that compound as a team and its traffic grow: it is
**slow** (a human doing the same steps by hand for every server and every release), it is
**inconsistent** (a step skipped under time pressure, a different order on server 3 than
server 1), and it is **risky** (nothing stops a broken build from reaching production except
the person doing the deploy noticing before they hit enter). CI/CD replaces this with an
automated, repeatable pipeline: the same sequence of steps, in the same order, with the
same validation, every single time — which is precisely what makes deploys boring instead
of an event people schedule around and dread.

### Continuous Integration, Delivery, and Deployment

These three terms describe increasing levels of automation, and are frequently used
interchangeably in casual conversation despite meaning genuinely different things:

| Term | What's automated | What still requires a human |
|---|---|---|
| **Continuous Integration (CI)** | Every commit is automatically built and tested | Deciding when/whether to deploy at all |
| **Continuous Delivery (CD)** | Every commit that passes CI produces a release candidate ready to deploy | Pressing the button to actually deploy to production |
| **Continuous Deployment (CD)** | Every commit that passes all checks deploys to production automatically | Nothing — a human never gates the deploy step |

**Continuous Integration** is the foundation: every commit triggers an automatic build and
test run, catching integration problems (two developers' changes conflicting in ways that
compile individually but break together) within minutes instead of being discovered days
later when someone finally tries to combine everyone's work. **Continuous Delivery** builds
on top of that: every commit that passes CI is automatically packaged into a
deployable artifact, verified as genuinely deployable, but a human still decides *when* to
actually release it. **Continuous Deployment** removes that last human gate entirely — a
passing commit ships to production with no manual approval step, which is a genuine
organizational trust decision, not merely a technical toggle.

### Anatomy of a Pipeline

```mermaid
flowchart LR
    A["Commit pushed"] --> B["Build: compile, install deps"]
    B --> C["Test: unit + integration tests"]
    C --> D["Package: build artifact (image, jar)"]
    D --> E["Publish: push to registry/artifact store"]
    E --> F["Deploy: staging"]
    F --> G["Deploy: production"]
```

Each stage exists to catch a specific class of problem before it reaches the next one, and
each stage is meant to fail fast and loud: a broken build fails at **Build**, a broken test
fails at **Test**, and neither should ever be discovered later in **Deploy**, where fixing
it is far more expensive and far more visible to users. A pipeline is only as trustworthy
as its earliest possible failure point — a team that lets the test stage pass with known
flaky failures has effectively moved that failure point all the way to production.

### A Basic Pipeline Definition

This excerpt assumes an npm project with a lockfile and test/build scripts. Registry
publication belongs in a separately authenticated, trusted-branch job. Untrusted PR code
must not receive production credentials. Major action tags below are readable teaching
references checked October 3, 2026; production workflows should pin reviewed action
commit SHAs and maintain them.

```yaml
name: ci
on: [push, pull_request]
permissions:
  contents: read
jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          package-manager-cache: false
      - run: npm ci
      - run: npm test
      - run: npm run build
      - name: Build local image for validation
        run: docker build -t app:${{ github.sha }} .
```

A commit-SHA label helps trace the source revision, but it is still a mutable registry
tag and rebuilding that source can produce different bytes. Record the resulting image
digest and provenance, then deploy that digest. The PR workflow above builds locally; it
does not publish an artifact or configure a real registry login. For PR events, record
whether the tested revision was a merge revision or the branch head.

### Your first safe release, from pull request to rollback

On a small team, a developer creates a branch, changes one API endpoint, and opens a
pull request (PR). A PR is a proposed change for teammates to review before it enters
the shared branch. CI checks that it compiles, tests pass, and the application still
builds. After review and merge, the pipeline produces a versioned artifact. Deployment
places that artifact in a test environment, verifies the endpoint, and then promotes
the **same artifact** to production.

If users see more errors after release, identify the deployed artifact's commit or digest,
check the new error rate, and restore the last known-good version. A database migration
can complicate rollback: old application code may not understand the new schema. Plan
compatible schema changes and a data recovery path *before* deploying.

**Try it:** the test environment passed, but 5% of production requests fail after
the release. Is "tests passed" a reason to keep rolling out? **Answer:** no. Pause
promotion, compare errors by version and request route, then roll back or disable
the feature if the new artifact caused the failure. Tests reduce risk but cannot
reproduce every real user and dependency state.

---

## 🟡 Intermediate Level

### Build Once, Promote the Same Artifact

A common mistake is rebuilding the application separately for staging and production — even
with identical source code, a separate build can pull a slightly different dependency
version (an unpinned transitive dependency resolved differently on a different day),
producing an artifact that is not actually bit-for-bit what was tested. The correct pattern
is **build once, promote everywhere**: one versioned artifact is built and validated, then
that exact same artifact — the same container image digest, the same jar file — is
promoted through staging, then production, unchanged. What passed testing is, by
construction, bit-for-bit identical to what runs in production; verify the deployed digest rather than trusting a mutable tag. Different configuration,
platform variants, external services and data can still produce different behavior.

### Deployment Strategies: Rolling, Blue-Green, and Canary

```mermaid
flowchart TB
    subgraph Rolling["Rolling update"]
        R1["v1, v1, v1, v1"] --> R2["v2, v1, v1, v1"] --> R3["v2, v2, v1, v1"] --> R4["v2, v2, v2, v2"]
    end
    subgraph BlueGreen["Blue-green"]
        BG1["Blue: v1 (live)  Green: v2 (idle)"] --> BG2["Traffic switched to Green"] --> BG3["Blue: v1 (idle)  Green: v2 (live)"]
    end
    subgraph Canary["Canary"]
        C1["v1: 95%, v2: 5%"] --> C2["v1: 50%, v2: 50%"] --> C3["v1: 0%, v2: 100%"]
    end
```

| Strategy | How it works | Rollback speed | Cost |
|---|---|---|---|
| Rolling update | Gradual instance replacement | Usually another rollout | Lower overlap; surge still needs capacity |
| Blue-green | Separate fleets; route new traffic to the other | Fast if old fleet and data remain compatible; routing/draining take time | Often substantial duplicate capacity |
| Canary | Explicit controlled exposure and measured promotion | Shift new traffic back; completed writes remain | Depends on minimum fleet size and routing design |

A **rolling update** (the Kubernetes Deployment default) replaces instances gradually with
no second full environment, but a rollback means running the same gradual process in
reverse, which takes real time either direction. A **blue-green** deploy keeps two complete,
independent environments — the currently-live one ("blue") and the new version fully
deployed but receiving no traffic ("green") — then switches all traffic at once (a load
balancer or DNS change), making routing rollback potentially fast; DNS caches and existing connections can delay it, at the cost of running
double infrastructure for the overlap period. A **canary** deploy sends a small, real
percentage of production traffic to the new version first — real users, real requests — and
only increases that percentage if the new version's error rate and latency stay healthy,
making exposure and metric-based promotion explicit. A rolling update also exposes early
new instances to real traffic and can pause; that alone is not a controlled canary, at the cost of running a real (if small)
production risk on that initial slice of traffic.

### Feature Flags: Decoupling Deploy from Release

A **feature flag** wraps new code in a runtime-toggleable condition, separating two
decisions that deploy strategies alone conflate: *is the code running in production* versus
*is the feature visible to users*. Code can be deployed dark (flag off, running but
invisible) well ahead of the actual release, tested against real production infrastructure
with reduced exposure, though startup changes, background jobs and shared resource use
can still affect users, then enabled for 1% of users, then 100% — entirely independent
of any deploy event. This can make **disabling** a problematic code path fast for a feature-level
problem: flipping a flag off is a config change, not a redeploy, so it can happen in
seconds instead of waiting for a new pipeline run. It does not reverse completed writes,
messages or schema changes; configuration propagation and both flag states must be tested.

### Pipeline Caching and Parallelization

Worked example with assumed durations: a pipeline with three independent test suites (unit: 4
minutes, integration: 6 minutes, end-to-end: 8 minutes) run **sequentially** takes 18
minutes total. Run in **parallel** across three runners, the pipeline's wall-clock time is
bounded by the slowest suite alone — 8 minutes — plus fixed overhead (checkout, dependency
install) each runner pays independently. **Dependency caching** keys downloaded packages
to a lockfile or dependency manifest; it may shorten network downloads, but commands such
as `npm ci` still install packages and cache restore itself costs time. Measure cache-hit
rates and total pipeline time before claiming a gain. Parallelization and caching help
only when their saved work exceeds runner startup, restore and coordination overhead.

### Secrets Management in Pipelines

A pipeline frequently needs real credentials — a registry push token, a cloud deploy
credential, a database migration password — and these must never be hard-coded in the
pipeline definition file itself, since that file is version-controlled and often
world-readable within an organization. The standard pattern is a **secrets store** built
into the CI platform (encrypted at rest, injected as environment variables only at run
time, never written to the pipeline definition or, ideally, ever printed to build logs) or
an external secrets manager the pipeline authenticates to at runtime. A secret that leaks
into build logs is effectively public within the organization the moment it's printed,
regardless of how carefully it was stored — this is why disabling shell command echoing
around any step handling a secret is a standard, non-optional precaution.

For cloud deployment, prefer a short-lived identity obtained through the CI provider's
OpenID Connect (OIDC) federation where supported, scoped to the repository, branch and
deployment environment. This avoids keeping a long-lived cloud key in CI secrets.
Restrict workflow permissions and protect production environments separately from tests.
Build provenance can link a published artifact back to the workflow and source revision;
[GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)
are one concrete implementation. Provenance helps verify *what was built and where*;
it does not prove the application is free of bugs or vulnerabilities.

---

## 🔴 Expert Level

### Progressive Delivery: Automated Canary Analysis and Rollback

A manually-watched canary still depends on a human noticing a problem and reacting in time.
**Progressive delivery** automates that judgment: a controller (Argo Rollouts, Flagger, or
similar) shifts traffic to a canary in small steps, but at each step it queries real metrics
— error rate, p99 latency, a business metric — against the canary's traffic specifically,
comparing it against the stable version's baseline, and only proceeds to the next traffic
step if the canary stays within an acceptable threshold.

```mermaid
sequenceDiagram
    participant Ctrl as Rollout controller
    participant Canary as Canary (v2)
    participant Metrics as Metrics backend
    Ctrl->>Canary: shift 5% traffic
    Ctrl->>Metrics: query error rate, p99 latency for canary
    Metrics-->>Ctrl: within threshold
    Ctrl->>Canary: shift 25% traffic
    Ctrl->>Metrics: query again
    Metrics-->>Ctrl: error rate exceeds threshold
    Ctrl->>Canary: automatic rollback to 0% traffic
```

The critical property is that rollback is triggered by the same automated analysis, with no
human in the loop required to catch it — a regression visible to the configured metrics can be detected during analysis, rather than waiting only for a dashboard review. Missing data is not success: define
minimum samples, error handling and an inconclusive/pause policy. A controller does not
guarantee detection of data corruption invisible to the metrics or undo completed writes.

### GitOps: Git as the Single Source of Deployment Truth

Traditional CD **pushes** changes to a target environment — the pipeline itself holds
credentials to the production cluster and directly applies changes. **GitOps** inverts
this: the desired state of the cluster (which image versions, which config) lives entirely
in a Git repository, and an in-cluster agent (Argo CD, Flux) **pulls** from that repository
and reconciles the live cluster to match it — the same reconciliation-loop model Kubernetes
itself uses internally, applied one level up to deployments themselves.

```mermaid
flowchart LR
    subgraph Push["Traditional push-based CD"]
        P1["Pipeline"] -->|"holds cluster credentials, applies directly"| P2["Cluster"]
    end
    subgraph Pull["GitOps pull-based CD"]
        G1["Pipeline"] -->|"commits new desired state"| G2["Git repo"]
        G3["In-cluster agent"] -->|"pulls, reconciles"| G2
        G3 --> G4["Cluster"]
    end
```

This has two concrete operational benefits beyond philosophy: **CI need not hold direct deployment credentials** when its job only updates desired state,
and **Git records reviewable desired-state changes** — every change to what's running in production is a
reviewable, revertable commit, so "what changed, when, and who approved it" is answered by
`git log` plus reconciliation status and deployment audit logs. A commit is an intended
state, not proof that it was successfully applied. Agents may expose APIs/webhooks, and
manual cluster writes or external secret/config changes still need separate auditing.

### Production Failure Modes

**Flaky tests eroding pipeline trust.** A test that intermittently fails for reasons
unrelated to real regressions (timing-dependent assertions, shared test state, network
flakiness in a CI runner) trains a team to reflexively re-run the pipeline on failure rather
than investigate — the failure mode is not the flaky test itself, it's the team's learned
behavior of ignoring red pipelines, which eventually lets a genuine regression through
because "it's probably just flaky" became a default assumption.

**Non-reproducible builds.** A pipeline that resolves dependency versions freshly on every
run (no lockfile, or a lockfile not actually respected) can produce a subtly different
artifact today than it did yesterday from the identical source commit — this breaks the
entire premise of "build once, promote everywhere" and makes a production incident
essentially impossible to reproduce locally, since rebuilding from the same commit does not
guarantee the same result.

**Deploying application code and database migrations out of order.** A rolling deploy where
new application code expects a schema column that the migration step hasn't run yet (or,
symmetrically, an old application instance still running against a schema that a migration
already changed underneath it mid-rollout) produces errors that only exist during the
transition window and can be maddening to reproduce after the fact — the standard fix is
designing migrations to be backward-compatible with the previous application version for at
least one full deploy cycle (add a column without dropping the old one yet; drop it only in
a later, separate deploy).

**Secrets leaking through build logs.** A debug flag left on, or a script that echoes every
command before running it, can print a secret's actual value into build logs that are far
more widely readable than the secrets store itself — once printed, the secret must be
treated as compromised and rotated, since a log line cannot be un-printed from every place
that log might have already been copied, cached, or forwarded to.

### Common Misconceptions

- **"CI/CD means fully automated deploys with no human involved."** Continuous Delivery
  deliberately keeps a human gate on the actual production release — only Continuous
  Deployment removes it entirely, and that is an organizational trust decision, not just a
  pipeline configuration flag.
- **"Blue-green and canary are the same idea with different names."** Blue-green switches
  all traffic at once between two complete environments; canary gradually shifts a
  *percentage* of traffic and validates it against real metrics before proceeding — a
  canary catches a bad release affecting only its small traffic slice, while blue-green's
  instant full-traffic switch means a bad release is instantly full-traffic too, just
  potentially fast to route back if the old fleet and shared data remain compatible.
- **"A feature flag is the same thing as a deployment strategy."** A flag controls whether
  code that is already running is *visible*; a deployment strategy controls how new code
  actually *gets deployed and receives traffic* in the first place — they solve different
  problems and are commonly combined, not substitutes for each other.
- **"GitOps just means using Git for CI/CD."** Nearly every modern pipeline already uses Git
  for source control; GitOps specifically means the cluster's desired state lives in Git and
  an in-cluster agent pulls and reconciles toward it, rather than a pipeline pushing changes
  with direct cluster credentials.
- **"Passing CI means the code is production-ready."** CI validates what the test suite
  actually covers — a passing pipeline says nothing about untested edge cases, real
  production load patterns, or a canary/progressive-delivery stage that hasn't run yet;
  "tests pass" and "safe to deploy to 100% of users immediately" are different claims.

### Interview Questions

**Q1. What's the actual difference between Continuous Delivery and Continuous Deployment?** `[easy]`

Continuous Delivery means every commit that passes the pipeline produces a genuinely
deployable release artifact, but a human still decides when to actually deploy it to
production. Continuous Deployment removes that human gate entirely — any commit that passes
all automated checks deploys to production automatically, with no manual approval step at
all. The two terms are often used interchangeably in casual speech, but the presence or
absence of a human gate is a real, meaningful difference in practice.

**Q2. Why should a build artifact be tagged with a commit SHA instead of a mutable name like `latest`?** `[easy]`

A commit SHA identifies a source revision and is a useful traceability label. By itself,
that label does not prove the build inputs or bytes, because tags and rebuilds can differ. A
mutable tag like `latest` can be reassigned to a completely different build at any time,
which means the same tag string can refer to different actual content depending on when it
was pulled, making rollback and incident investigation far harder — you can't be certain
what code is actually running. The source label is only part of the evidence, though — an
image digest pins the bytes, while a SHA tag can still be force-pushed over in most
registries, so environments that need a hard guarantee deploy by digest and keep the SHA tag
as the human-readable label.

**Q3. Why is "build once, promote the same artifact" considered better practice than rebuilding separately for each environment?** `[easy]`

Rebuilding separately for staging and production, even from identical source code, risks
pulling a slightly different dependency version if anything is unpinned, meaning what was
actually tested in staging is not guaranteed to be bit-for-bit identical to what runs in
production. Building exactly once and promoting that same artifact through every
environment guarantees there is no gap between "what was tested" and "what is deployed" —
they are, by construction, the same bytes. The constraint it imposes is that nothing
environment-specific can be baked into the artifact: every endpoint, credential and feature
toggle has to arrive at runtime as configuration, which is more setup work than a per-
environment build but is what makes the promotion meaningful.

**Q4. What problem does a canary deployment solve that a rolling update does not?** `[easy]`

A plain rolling update gradually replaces capacity and also exposes new replicas to real
traffic. A canary adds an explicit exposure policy, version-separated measurement and
promotion decisions; a Pod percentage is not necessarily a request percentage when load
is uneven or connections are long-lived. It costs routing machinery and enough observations
to detect meaningful harm. At low traffic, one healthy request is not evidence that a
1% canary is safe; pause on insufficient data rather than promoting by absence of errors.

**Q5. Why does a feature flag make rollback of a bad feature faster than redeploying?** `[medium]`

A feature flag is a runtime configuration toggle, so disabling a problematic feature means
flipping that flag off — a config change whose speed depends on propagation and application behavior. Redeploying
a previous version instead requires running an entire pipeline (or at minimum a deploy
stage) again, which takes meaningfully longer and depends on the previous artifact still
being readily available to redeploy at all. The price is carried in the code: every flag is
a live branch that must keep working in both states, and flags that are never removed
accumulate into combinations nobody has tested together.

**Q6. A pipeline's total run time drops from 18 minutes to under 10 after two changes: running test suites in parallel and adding dependency caching. Explain what each change actually did.** `[medium]`

Running previously-sequential test suites in parallel across multiple runners means the
pipeline's wall-clock time is bounded by the single slowest suite rather than the sum of all
of them — three suites taking 4, 6, and 8 minutes sequentially total 18 minutes, but in
parallel the pipeline only waits on the 8-minute suite plus per-runner overhead. Dependency
caching can avoid repeated package downloads, but `npm ci` still installs the tree and
restoring a cache has overhead. Neither optimization inherently trades determinism for
speed: isolated test suites and validated lockfile/platform cache keys can preserve it —
parallel suites surface order-dependence between tests that sequential runs hid, and a cache
keyed on anything looser than the lockfile can serve a stale dependency tree that makes a
build pass for reasons unrelated to the commit.

**Q7. Why is a rolling deployment's rollback not necessarily fast, even though it sounds like "reverse the process"?** `[medium]`

A rollback of a rolling deployment is itself a rolling process in the opposite direction —
old instances (the version being rolled back to) must be brought back up and new instances
drained, gradually, the same way the original rollout proceeded gradually. This takes real
time proportional to the same batching and readiness-checking the forward rollout used,
unlike a blue-green deploy's rollback, which is just switching traffic back to an
environment that was never actually torn down and may be available quickly, subject to routing propagation, connection draining and
compatibility with data written by the new version. That speed is
bought with capacity: blue-green holds two full production environments at once, which is
why teams accept the slower rolling rollback for services where doubling the footprint is
not worth the faster undo.

**Q8. Why can deploying new application code and a database migration slightly out of order during a rolling update cause errors that are hard to reproduce afterward?** `[medium]`

During a rolling update there is a window where old and new application instances run
simultaneously against the same database — if the migration and the code expecting its
result don't land in a strictly compatible order, some requests hit an instance whose
expectations don't match the schema's actual current state at that exact moment. Once the
rollout completes, every instance and the schema are consistent again, so the error is
specific to that transition window and disappears on its own, making it look like it "just
happened once" rather than a systemic ordering problem waiting to recur on the next deploy.
The way out is expand-and-contract: ship a migration that is compatible with both the old
and new code, deploy the code, then remove the old column or constraint in a later release —
three deploys instead of one, in exchange for never having an incompatible window.

**Q9. Your team's pipeline has a test that fails intermittently about 1 in 20 runs for reasons unrelated to real code changes. What's the actual risk of leaving it as-is?** `[medium]`

The immediate symptom is wasted time re-running the pipeline, but the real risk is
behavioral: engineers learn to treat a red pipeline as "probably just the flaky test" and
re-run without investigating, which means a genuine regression that happens to fail
alongside — or instead of — the flaky test can get the same reflexive "just re-run it"
treatment and slip through. The fix is treating any flaky test as a priority bug to
quarantine or fix immediately, not something to tolerate, specifically because its cost
compounds through eroded trust in the whole pipeline's signal. Quarantining is the
stopgap, not the cure — a quarantined test stops blocking merges but also stops protecting
the code path it covered, so it needs an owner and a deadline or it quietly becomes
permanent.

**Q10. Explain how a progressive-delivery controller automatically decides to roll back a canary, without a human watching a dashboard.** `[hard]`

The controller shifts a small percentage of real traffic to the canary version and, at each
traffic-increase step, queries a metrics backend for the canary's specific error rate and
latency, comparing them against the stable version's baseline over the same window. If the
canary's metrics breach a configured threshold at any step, the controller automatically
shifts traffic back to the stable version — the rollback decision and its execution are both
automated, so a regression that only manifests under real traffic is caught and reverted
within the analysis window rather than depending on a human noticing a dashboard in time.
The analysis is only as good as the metric it watches: a regression that corrupts data while
returning HTTP 200 sails past error-rate and latency checks, which is why teams add
business-level metrics to the analysis rather than relying on the default signals.

**Q11. What does GitOps change about where production deployment credentials live, and why does that matter for security?** `[hard]`

In a traditional push-based pipeline, the CI system itself must hold direct credentials to
the production cluster in order to apply changes to it, meaning a compromised CI pipeline is
a direct path to production access. In a GitOps model, the deployment agent holds target credentials and retrieves from a Git repository and reconciling toward
it — the CI pipeline only needs permission to commit to that Git repository, never direct
cluster access, which removes one direct access path. CI that can change the desired-state repository
can still influence production indirectly, so the protection is not complete isolation. The Git repository becomes the new high-value target in exchange — anyone who
can merge to it can change production — so the protection moves to branch rules, required
reviews and commit signing rather than disappearing.

**Q12. Why does GitOps's pull-based reconciliation model make Git history function as a complete deployment audit log, in a way push-based CD typically doesn't?** `[hard]`

Git records the proposed desired state and its review history, but it is not a complete
record of observed deployments. A reconciliation may fail, a manual change may temporarily
affect users, or an external secret may change without a Git commit. Correlate commit,
artifact digest, controller status and target audit events to establish what actually ran.
Restrict direct writes, record emergency access and reconcile the final desired state
after an incident rather than claiming every production effect appears in `git log`.

**Q13. A canary deployment at 25% traffic shows a slightly elevated error rate, but it's within the automated rollback threshold, so the rollout proceeds to 50%. At 50% traffic the error rate spikes sharply and triggers automatic rollback. What does this progression suggest about the actual bug, and why didn't 25% catch it?** `[hard]`

A sharp jump in error rate specifically between 25% and 50% traffic, rather than a steady
error rate at any traffic level, suggests a load- or concurrency-dependent bug — something
that only manifests once a certain absolute request volume or concurrent connection count
is reached, such as a connection pool being sized for the smaller traffic slice, a resource
contention issue, or a cache that only starts thrashing past a certain hit rate. At 25%
traffic the absolute load on the canary simply hadn't crossed whatever threshold triggers
the underlying problem yet, which is exactly the class of bug a canary strategy is
specifically designed to surface progressively rather than all at once. This is a hypothesis, not proof: compare request volume, composition, capacity and the
concurrent stable baseline. A trend check may help but cannot guarantee earlier detection;
the prior step may have had too few samples or never reached the failing load. Add suitable
load tests, minimum sample criteria and business-effect checks before rerunning promotion.

**Q14. Why is "our test suite passed" not the same claim as "this is safe to release to 100% of production traffic," even in a mature CI/CD setup?** `[hard]`

A test suite validates exactly what it was written to check — known edge cases, known
integration points, known load patterns as of when the tests were written — and says
nothing about production traffic patterns, data shapes, or scale the test suite never
modeled. A mature pipeline treats a passing test suite as necessary but not sufficient,
adding further real-traffic validation stages like canary analysis or progressive delivery
specifically because production is the only environment that reliably exercises the actual
distribution of real usage, which no test suite fully replicates no matter how
comprehensive it is.

### Further Reading

 [Google's SRE book chapter on release engineering](https://sre.google/sre-book/release-engineering/)
covers the build-once/promote-everywhere principle in depth; the
[Argo Rollouts documentation on canary analysis](https://argo-rollouts.readthedocs.io/en/stable/features/canary/)
describes automated progressive-delivery mechanics referenced above; the
[GitOps principles from the OpenGitOps project](https://opengitops.dev/) define the
pull-based reconciliation model as a formal specification.

The [GitHub secure-use reference](https://docs.github.com/en/actions/reference/security/secure-use) explains action pinning and untrusted workflow inputs. Current [checkout](https://github.com/actions/checkout) and [Node setup](https://github.com/actions/setup-node) documentation defines runner prerequisites. [Argo analysis](https://argo-rollouts.readthedocs.io/en/stable/features/analysis/) distinguishes successful, failed and inconclusive measurements.
