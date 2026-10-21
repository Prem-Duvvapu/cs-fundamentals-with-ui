# Use an AI coding assistant without outsourcing correctness

This AI-14 exercise teaches a repeatable workflow: investigate a repository, state the
business rule, request a small patch, compile it, run independent tests, and review the
diff before accepting it. You need no previous experience with AI assistants. A coding
assistant proposes text; the compiler and tests supply different kinds of evidence.
Neither a confident explanation nor successful compilation proves correct behavior.

The three proposals here are **original AI-authored, checked-in teaching fixtures**.
No live coding provider, paid service, customer repository or real learner participated.
You can complete the exercise without an account, API key or network access.

## 1. Run and predict

Requirements: Linux/WSL, Python 3.10+, Git, JDK 17+ including `javac` and `jdeps`, and a
standard Maven 3.x installation. The existing offline Maven probe needs its installed
`lib/` JARs. No dependency or tool is downloaded and no global setting is changed.

Run from the repository root:

```sh
python3 examples/engineering-workflow/ai_review.py --report /tmp/ai-assisted-review.json
python3 -m unittest discover -s examples/engineering-workflow -p 'test_ai_review.py' -v
```

The summary should contain:

```json
{"selectedPatch":"locale-repair","modelCalls":0,"goldenCases":17,"localeCases":3,"protectedTestsUnchanged":true,"ownedWorkspaceRemoved":true}
```

Read the three small patches in [fixtures/ai-review](fixtures/ai-review/) before running.
Predict which patch cannot compile, which compiles but violates routing, and which
preserves the original 17 business cases while fixing the added regression.
The optional report is written atomically outside the source repository. Delete that
report to reset the saved evidence; each run automatically removes its own workspace.

This reuses the original [routing contract](fixtures/RouterContract.java),
[17 expected cases](fixtures/routing-golden.tsv) and [clear implementation](fixtures/TicketRouterAfter.java).
The existing [engineering workflow guide](README.md) owns the design/refactoring,
Git investigation and dependency-resolution explanations. This exercise adds how to
challenge an AI proposal rather than another design-pattern lesson.

## 2. Understand the actual change request

The checked-in canonical router is already correct. The exercise copies it into a new
temporary Git repository and **seeds a synthetic regression there only**: normalization
uses `Locale.getDefault()` instead of `Locale.ROOT`. It never patches the source router.

A locale is a set of language/region conventions. Uppercasing identifier-like input with
the machine's default language can change its meaning: Turkish uppercasing of the `i`
in `enterprise` does not produce the `I` in enum constant `ENTERPRISE`. The symptom is
an otherwise valid customer tier being rejected. That is different from a wrong queue
caused by decision order.

The existing contract still applies:

1. Validate the tier and priority before applying any override.
2. Security outranks urgency.
3. Urgency outranks enterprise tier.
4. Remaining valid inputs use their normal tier queue.

The requested repair is deliberately small: make normalization independent of the
host's default locale while preserving those rules and the public method signature.
The new three-case regression driver checks enterprise normal, urgent and security
requests in an isolated child JVM launched with Turkish language/region properties.
The existing 17-case suite runs in an explicitly English child JVM so that it remains
a separate check of the original behavior. No host locale is changed.

## 3. Investigate before asking for a patch

Useful local inspection commands are:

```sh
rg --files examples/engineering-workflow
rg -n 'route|normalize|Locale|ENTERPRISE|URGENT' examples/engineering-workflow/fixtures
```

An investigation prompt for an approved coding assistant:

```text
Investigate this public synthetic Java routing example. Do not edit files or run
commands yet. Find the route entry point, its callers/tests, input validation,
normalization, decision precedence and JDK/build requirements. Cite file names and
symbols for each statement. Separate observed facts from hypotheses. Identify the
smallest test that could distinguish a locale defect from a precedence defect.
Do not request credentials, production tickets, logs or private repository content.
```

For a real workplace, first follow company rules for the particular assistant and
repository. Give it only approved, necessary context. Never paste `.env` files, access
tokens, connection strings, customer tickets or sensitive logs. Redact or reproduce
with original synthetic inputs; moving a secret into a prompt does not make it public.
This lab does not contact an assistant or upload repository data.

An assistant may invent a file, dependency, method or behavior. Verify its cited
symbol with a focused search. “I could not find it” is a useful result; do not let a
plausible explanation substitute for a source reference.

## 4. Write the regression independently of the proposed repair

Use this test-generation prompt after stating the contract:

```text
Propose a Java 17 regression test for locale-independent routing. Keep the existing
17 golden cases and their expected results unchanged. Derive new expected queues
from the documented routing precedence, not from a proposed implementation. Isolate
the non-English locale in a child JVM so parallel tests cannot inherit changed global
state. Include a check that the intended locale is active. Explain which bug each
assertion could catch. Do not modify production code or weaken a failing assertion.
```

The checked-in [locale driver](fixtures/ai-review/LocaleRoutingRegression.java) is
independent of the candidate patches and identity-pinned by the runner. Existing
business tests and golden data are copied unchanged, hashed and protected against
patch edits. A test that merely repeats an implementation's answer would not supply
this independent contract.

The seeded implementation compiles and passes the 17 English business cases, yet
fails the Turkish regression. This is the useful failing test to establish **before**
accepting the one-line repair. Compilation success alone would have missed it.

## 5. Request a bounded proposal and challenge it

A change prompt:

```text
Propose only a unified diff for TicketRouter.java. Repair locale-dependent input
normalization with an API available in Java 17. Preserve the public signature,
validation order, security/urgency/tier precedence and all existing tests. Do not add
dependencies, change build files, reformat unrelated code or modify expected results.
Explain why the diff is sufficient and name the tests you would run. Do not execute
shell commands, access the network or apply the diff automatically.
```

The runner reviews exactly three previously inspected fixture identities:

| Proposal | Independent observation | Review decision |
|---|---|---|
| [Invented API](fixtures/ai-review/invented-api.patch) | Actual `javac --release 17` rejects `String.toUpperCaseInvariant()`. That method is not a Java 17 String API. | Reject; verify the language/API instead of adding an imagined dependency. |
| [Wrong precedence](fixtures/ai-review/wrong-precedence.patch) | Java compiles; the original `enterprise-urgent` business case fails because enterprise handling outranks urgency. | Reject; compiling code is insufficient. Do not change the test to make it pass. |
| [Locale repair](fixtures/ai-review/locale-repair.patch) | The one-line `Locale.ROOT` repair passes all 17 original and three locale cases. Its resulting source equals the unchanged canonical router. | Accept only for this exercised contract after reviewing the diff. |

An API-verification prompt:

```text
Your proposal uses this API: [symbol]. Show where it is defined for our actual Java
baseline and dependency versions. If you cannot establish that, say so. Propose a
minimal compilation check using the installed toolchain. Do not install packages or
invent a library to justify the API. Report the actual compiler result separately
from whether the business tests pass.
```

The example compiles against release 17 and uses actual `jdeps` to confirm the accepted
classes depend only on `java.base`. It also reuses the existing offline Maven probe:
actual dependency mediation/class loading changes the fixture codec from 1.0 to 2.0
under dependency management. The report records that evidence and the installed
support-JAR hash. This does not prove that an unrelated Spring dependency or current
security advisory has been checked. For those, inspect the actual POM/BOM/resolved
graph and upstream contract following the existing guide; no such claim is added here.

## 6. Debug with competing hypotheses

```text
Given a valid enterprise ticket rejected only under Turkish locale, propose at most
three hypotheses. For each, name an observation that would support it and one that
would disprove it. Prefer a minimal deterministic reproduction. Do not edit code,
change expected results, or claim a hypothesis is the cause until a test distinguishes
it. Keep secret values and customer payloads out of your explanation.
```

Useful distinctions in this exercise:

- The locale hypothesis predicts English success and Turkish rejection before queue
  selection; the seeded implementation actually shows those outcomes.
- The precedence hypothesis predicts a valid enterprise urgent ticket reaching the
  wrong queue; the compiling wrong patch actually fails that existing golden case.
- The API hypothesis predicts compilation failure before either business test runs;
  the invented-method patch actually produces that outcome.

A cause needs a distinguishing observation. A list of plausible fixes is not that
observation. Keep build failures, behavioral failures and successful but narrowly
covered execution as separate report fields.

## 7. Review the correct diff and explain it in an interview

```text
Review only the proposed TicketRouter.java diff against the stated contract. Identify
any changed signature, input validation, priority order, test expectation or dependency.
Explain why Locale.ROOT addresses the reproduced symptom. Check the before/after
business and regression results. State the remaining limits and give a concise PR
note: trigger, resulting behavior, actual validation and one material limitation.
Do not approve based only on the assistant's explanation or a green compiler.
```

The accepted diff must add one line and remove one line in `TicketRouter.java`, leave
the protected test hashes unchanged, pass `git diff --check`, and preserve the seeded
repository's history. The report supplies diff/source/patch/test hashes and actual
outcomes. Open the linked repair patch to review the code itself; a hash binds an
artifact but does not explain or approve it.

A concise interview explanation is: “I reproduced locale-sensitive normalization with
an isolated Turkish JVM before changing the code. An invented method failed Java 17
compilation, and another compiling patch failed the existing routing-priority test.
I accepted a one-line Locale.ROOT repair only after both independent test suites and
the diff review passed. These finite tests demonstrate the stated cases; they are
not proof of every input or a production incident.” Explain the evidence in your own
words rather than memorizing that paragraph.

## 8. Execution boundaries and evidence limits

The runner accepts **no external patch or source argument**. It checks the reviewed
fixture hashes before creating an executable workspace. A strict one-file text-diff
parser rejects other paths, traversal, test changes, binary patches, Git mode/rename
metadata and invalid hunk counts before `git apply` runs. Symlink targets are refused.
Only the new owned repository is modified; inherited Git/Java/Maven option injection
is excluded through the existing command helper. The default run has a 180-second
execution budget, per-command output limits up to 128 KiB and bounded owned-child
cleanup. Sources/patches are capped at 16 KiB and published reports at 64 KiB. These
are application execution guards, not hard kernel deadlines for filesystem I/O.

**A temporary directory and file allowlist do not sandbox Java.** Arbitrary Java can
read files, start processes or contact services. Do not change the pins to run an
unreviewed model response. The fixture identity check is a review boundary for this
small known experiment, not a security scanner. A new proposal needs source review
and an appropriately isolated development environment before execution; this script
is not an external model-code runner.

The report omits raw code, ticket payloads, command output, credentials and temporary
absolute paths. It records known fixture call intent, not OS-level network monitoring
or independent attestation of installed binaries. No real learner comprehension,
manual IDE session, arbitrary unfamiliar-repository review, live coding-service
quality, current vulnerability assessment or production deployment is certified.
