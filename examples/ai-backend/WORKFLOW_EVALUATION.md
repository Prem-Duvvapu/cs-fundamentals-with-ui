# Project C: evaluate controlled tools and local approval

This exercise asks two different questions: **did the requested investigation or approved local
workflow finish, and did the application violate a policy?** A refusal can be correct without
completing a business task. A model returning valid JSON does not establish either outcome.

Read [WORKFLOW.md](WORKFLOW.md) for the tool/approval contract and its separate real MCP exercise.
This package adds evaluation; it does not recreate that theory or change the default HTTP API.

## 1. Predict before running

The [canonical cases](fixtures/workflow/cases.jsonl) contain **30 development and 20 held-out**
rows, with a risk family and a distinct rationale on every row. All data was originally authored
for this repository on October 18, 2026. Alice/Bob, orders, amounts and document text are synthetic.
There are no copied customer records or imported benchmarks. See the
[provenance and case map](fixtures/workflow/PROVENANCE.md).

Before looking at a row's `expected` field, predict:

1. Which application check runs before any model proposal?
2. How many proposal calls and completed tool observations should exist?
3. Does this case create an intent row, change an order, or do neither?
4. Can a valid approval be replayed after expiry if the original action already committed?
5. If the response times out after commit, which durable value distinguishes success from failure?

`held-19` should cause **one local order version increment**, despite a real response timeout and
subsequent replay. `dev-28` should leave the entire database unchanged by the rejected approval at
the exact expiry second. `held-17` already contains one legitimate commit during setup; rejecting
the stale second approval must preserve that original committed state, rather than resetting it.

## 2. Run actual application policies

Use Java 17+ and the existing Maven dependencies; no new runtime or provider is needed. From the
repository root, first run the focused integration tests:

```bash
mvn -o -f examples/ai-backend/pom.xml -Dtest=WorkflowEvaluationTests test
```

`-o` keeps verification offline once the existing dependencies are cached. If this is your first
checkout, follow the existing [setup](README.md) to resolve dependencies first. The evaluator itself
does not download anything or call a model. The test runs all 50 cases, checks the two split sizes,
verifies real database invariants, and deliberately changes labels to prove that labels cannot
choose the fixture's actions. Another test makes setup fail and confirms owned files are removed.

The public entry point is `EvaluateWorkflow.run(String[] args)`:

```text
--evaluate-workflow <cases.jsonl> <report.json>
```

Package first. This isolated package is executable immediately through its own main class:

```bash
mvn -o -f examples/ai-backend/pom.xml -DskipTests package
java -Xmx256m -Dloader.main=com.csfundamentals.aiexample.EvaluateWorkflow \
  -cp examples/ai-backend/target/ai-backend-example-0.0.1-SNAPSHOT.jar \
  org.springframework.boot.loader.launch.PropertiesLauncher \
  --evaluate-workflow examples/ai-backend/fixtures/workflow/cases.jsonl /tmp/workflow-report.json
```

The isolated evaluation package intentionally does not edit `AiBackendApplication`. Once its
dispatch is integrated, the shorter `java -jar <example.jar> --evaluate-workflow <cases> <report>`
form can delegate to the same entry point. Until then use the explicit main above. Do not interpret
an application server starting in response to an unknown flag as a successful evaluation run.

Every case uses a new owned temporary file-backed H2 database, runtime-generated credentials and
approval secret, and the real `ReadOnlyAgent`, `KnowledgeStore` and `RefundWorkflow` classes.
Application connections close after their operation. One owned keeper connection avoids repeatedly
reloading H2 during ordinary cases; `reopen` explicitly closes that keeper before reconstructing
the workflow against the same file and secret, and retains no keeper afterward. The runner removes its own case directory
on success and failure. It never connects to an operator-supplied database or sends real money.

## 3. Read the report without confusing the metrics

Expected default teaching-suite counts are **13 completed tasks, 33 expected rejections and four
bounded stops**. These add to 50. Expected stops are two step limits and two deadlines. The fixture
makes 44 proposals. Contract failures and observed policy violations should both be zero; they
are reported separately. These counts describe these fixed examples, not a population estimate.

| Report field | What it means |
| --- | --- |
| `tasksCompleted` | Expected safe business/investigation outcome completed with required observed evidence and no contract or invariant failure |
| `taskEligibleCases` | Fixed denominator from expected task labels; expected refusals/stops are excluded, even if actual behavior changes |
| `expectedRejectionsObserved` | A refusal occurred on an expected-refusal case; exact reason is checked separately by `contractPassed` |
| `boundedStops` | Actual deadline/step-limit results, rather than completed tasks or exception refusals |
| `observedPolicyViolations` | Measured invariant failures, independent of expected output labels |
| `contractFailures` | Wrong status, calls, steps, mutations, proposal count, evidence, refusal classification or policy invariant |
| `orderMutations` | Total order version increments from initial fixture state, including legitimate setup commits |
| `actionOrderMutations` | Version increments during the evaluated action after setup; a rejected stale approval must be zero here |
| `databaseUnchangedOnRejection` | All order, proposal and knowledge rows match the pre-action snapshot; true is vacuous when there was no rejection |
| `proposalCalls` / `completedReadSteps` / `returnedSteps` | Actual fixture invocations, completed observations, and application result steps; the last is null when the application threw |
| `elapsedMs` / `agentCallElapsedMs` | Local full-case latency including file/database setup, and the caller-observed agent invocation latency |

The report includes splits and risk-family slices, dataset SHA-256, fixture/policy versions,
runtime, explicit bounds, and a completion state. Undefined rates use JSON null. Latency uses
nearest-rank observed p50/p95; it is local harness timing, **not model/token/provider latency or a
production performance SLO**. The policy version names this reviewed local application contract;
it is not a provider model digest or an automatic promise that future source changes are compatible.

The policy invariants inspect unchanged data on rejection, no agent writes, no changes to another
tenant's orders, no knowledge writes, at most one local order mutation, step limits, the exact
three-field proposal prompt boundary, and absence of the other tenant's document sentinel from
observations. Application failures can still exist beyond those checks. Reports contain only
sanitized assertion names, never approval tokens, credentials, JDBC paths, prompts or raw tool data.
Checkpoints are atomic after each case; a contract failure produces a completed report but a
non-successful command. A harness failure is marked `failed`, with only its exception class recorded.

## 4. Understand what the fixture actually does

The default run uses **a deterministic proposal fixture, not a language model**. Its constructor
accepts only the input record; expected labels, case IDs, rationale and split never enter it.
Normal responses use the actual question and accumulated observations: status asks for a lookup,
policy asks for a search, then finish copies the observed evidence. It does not synthesize a fluent
answer or infer whether a refund should be approved. Raw proposal transcripts replay malformed or
adversarial outputs independently of scoring labels. Fault modes repeat a lookup or stall until
interrupted. A five-second fixture escape cap prevents an uninterruptible test hang.

The adversarial document is an **input to the read/search boundary**, not evidence that a live model
resists injection. Copying its untrusted text into an answer does not make that text authoritative.
Search observes at most two visible documents. The revoked-document case verifies an empty current
search, not semantic refusal quality. No `expected` field or expected action is passed to a model;
there is no model in this evaluation mode. A future live-agent evaluation must preserve that
separation and add model/runtime/prompt provenance, supported-answer scoring, adversarial review
and a fresh held-out set. Do not rename this run `live-local` or claim a 100% agent success rate.

## 5. Locate the genuine durability boundary

For `held-19`, an owned loopback HTTP peer reads one fixed POST request and calls the real local
approval transaction. A latch signals **after `approve` returned**, so the commit is known to have
happened. The peer deliberately withholds its HTTP response. The client observes an actual
`SocketTimeoutException` while reading, releases the peer, and closes both sockets. Reopening H2
must show `completed`; replaying the exact approval must leave the order at version 2.

That is stronger evidence than calling a function and pretending its return value was lost. It is
still a controlled single-process response-loss experiment with real socket I/O and a reopened
local file database. It does **not** kill a JVM, cut power, prove fsync behavior under host failure,
exercise the Spring controller, or cover a remote payment provider. The local transaction does
not create an exactly-once guarantee across services. MCP protocol/authorization evidence remains
the separate exercise in [WORKFLOW.md](WORKFLOW.md).

## 6. Change one thing, then debug

1. Copy the dataset to a temporary file; retain the original held-out cases for regression checks.
2. Change only an expected label. Actions and database outcomes must stay the same, while the
   report shows a contract failure. This catches label leakage into fixture behavior.
3. In a development row, replace a normal proposal with `refund_order`. Expect the allowlist
   rejection, no order/proposal changes and no business task completion.
4. Change a repeated-read case from three steps to one. Predict the exact call count before running.
5. Inspect `held-17`: distinguish initial order version, setup commit, attempted stale action and
   final version. A total mutation count of one does not mean the rejected action mutated anything.
6. For a deadline issue, inspect actual call count, returned steps, cancellation signal and caller
   latency. The existing agent starts its internal deadline **after** its initial permission lookup;
   this evaluator reports caller latency and does not silently claim an end-to-end preauthorization
   deadline. Java cancellation requests interruption; this fixture proves cooperative cancellation,
   not termination of arbitrary non-cooperative provider code.

Do not fix a failure by changing the expected status to match a broken control. First decide
whether the application policy, fixture input or reviewed scoring label is wrong, and add a case
that exposes the actual behavior. A wrong expected label is a scoring failure, not automatically
an observed policy violation.

## 7. Explain it in an interview

Practice answering without reading the implementation:

- “A model can propose a tool, but the application validates identity, resource scope and tool
  arguments on every step. My evaluation independently snapshots persistent state, so I can
  distinguish a correct refusal from an unauthorized write.”
- “Timeout means the caller lacks an outcome, not that a transaction rolled back. I reproduce
  commit-before-response-loss over a real local socket, then reconcile by operation ID and replay
  the same approved action. Its stored outcome and version prevent a second local mutation.”
- “My fixture suite validates deterministic application boundaries. It does not establish how
  often a live model selects the right tool or gives a supported explanation. I report task
  completion, refusal, bounded stopping and policy violations independently.”

For concurrency/idempotency design theory, reuse the existing lessons linked by
[WORKFLOW.md](WORKFLOW.md) and the [backend coverage checklist](../../BACKEND_ENGINEERING_COVERAGE_2026-10-17.md).
Do not duplicate a circuit-breaker/DSA simulator inside this evaluator.

## Bounds and primary contracts

At most 50 cases, 512 KiB input, 16,384 characters per row, five bounded proposal transcript entries,
three agent steps and a configured 100–2000 ms agent deadline are accepted. The 120-second run
budget is checked before starting each case; it is not an OS-enforced deadline for filesystem I/O.
The owned HTTP experiment has a one-second connect timeout, three-second accept/read/commit/release
guards, 250 ms response-read timeout and four-second worker cleanup guard. H2 lock/query waits are
bounded to two seconds where explicitly supported; local disk errors still fail the harness. No
subprocesses, network model calls, paid calls or external services occur. Reports cap at 256 KiB.

The implementation uses the dependencies already pinned by the example POM, not a second BOM.
Its socket and cancellation assumptions follow the
[Java 17 Socket contract](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/net/Socket.html#setSoTimeout(int))
and [Future cancellation contract](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/Future.html#cancel(boolean)).
The file-reopen exercise uses H2's default close-on-last-connection behavior described in
[H2 closing a database](https://h2database.com/html/features.html#closing_a_database), without
`DB_CLOSE_DELAY=-1` or a connection retained across the explicit reopen boundary. These primary references were checked
October 18, 2026. No newer library/runtime version is inferred from those contracts.
