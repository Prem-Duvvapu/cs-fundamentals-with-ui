# Everyday engineering: investigate, repair and explain

This BE-09 lab turns Git, Linux, Maven and Clean Code advice into observable work. It seeds an **owned temporary repository**, reproduces a Java routing regression, identifies its commit with actual `git bisect`, appends a safe revert, and checks a small refactor against an independent business contract. It also inspects one owned Linux process/socket/file and resolves an actual competing Maven dependency entirely offline.

Use the **LLD logging framework/workflow** and **DSA** entries in the [maintained learning-network links](../../BACKEND_ENGINEERING_COVERAGE_2026-10-17.md#5-ownership-across-the-learning-network) for their existing design/algorithm lessons. This exercise adds debugging and verification practice; it does not duplicate those lessons or share their progress.

## 1. Run the owned experiment

Requirements: Linux with accessible `/proc` (WSL works), Python 3.10+, Git, JDK 17 or later, and a standard Maven **3.x** installation containing its `lib/` JARs. Java sources are compiled with `--release 17`. No third-party Python package, Docker, internet, remote Git repository or downloaded Maven plugin is needed by these commands:

```sh
python3 examples/engineering-workflow/runner.py --report /tmp/engineering-workflow-report.json
python3 -m unittest discover -s examples/engineering-workflow -p 'test_*.py' -v
```

The report is published only after all stages succeed. Expect a summary like:

```json
{"culprit_identified":true,"revert_appended":true,"golden_cases":17,"refactor_behavior_preserved":true,"maven_loaded_versions":["1.0","2.0"],"owned_child_exited":true,"owned_workspace_removed":true}
```

Commit IDs, PIDs and ports vary. They belong to the temporary experiment, not the project you launched it from. The repository and artifacts are removed at the end; the optional JSON report is the only requested persistent output. Do not try to look up those temporary commit IDs in this project's history afterward.

## 2. Predict the ticket-routing regression

The original synthetic contract is:

1. Reject missing/unknown tier or priority.
2. Security incidents route to `SECURITY_ONCALL`.
3. Otherwise urgent tickets route to `INCIDENT_QUEUE`, including enterprise customers.
4. Otherwise enterprise tickets route to `ENTERPRISE_QUEUE`; standard tickets use `STANDARD_QUEUE`.

Predict the result for enterprise + urgent + not-security before opening the report. The seeded regression moves enterprise handling above urgency, so it compiles but returns the wrong queue. Independent documentation commits occur before and after that change.

The oracle compiles the checked-out `TicketRouter.java` and executes `RouterContract.java` against [17 explicit golden cases](fixtures/routing-golden.tsv). It checks business behavior, normalization, override precedence and invalid inputs. A successful `javac` alone is insufficient. Unbuildable revisions return Git's skip code `125`; an ordinary behavioral failure returns `1`; a passing contract returns `0`. A skipped revision does not prove a business regression.

Observe `git.bisect_checks`, `git.failing_behavior` and the identified commit. The diagnostic must include:

```text
enterprise-urgent: expected INCIDENT_QUEUE, got ENTERPRISE_QUEUE
```

The search uses actual Git, not a Python simulation of binary search. It reads Git's final bad reference (`refs/bisect/bad`), because the last checked-out `HEAD` can be a tested good revision. Knowing the seed is a verification assertion after the search, not the oracle's decision rule.

## 3. Repair without discarding later work

The runner restores the original branch with `git bisect reset`, then executes `git revert --no-edit <identified-commit>` **inside the owned repository**. The repair is a new commit whose parent is the previous bad tip. All three later independent release notes remain present.

Explain the distinction: reverting appends an inverse change; resetting/force-pushing a shared branch rewrites which history other people see. This lab rewrites no user branch, runs no remote commands and gives no reason to force-push a colleague's work. A real revert can conflict or require domain adaptation; this controlled history has one isolated change so that the mechanism is visible.

Change one routing rule in the fixture, add the corresponding business case first, and rerun the experiment. If the first-bad assumption is no longer monotonic or the test cannot execute a revision, record that uncertainty rather than treating a guessed commit as proven.

## 4. Refactor against a stated contract

[Before](fixtures/TicketRouterBefore.java) uses short variable names and nested decisions; [after](fixtures/TicketRouterAfter.java) names inputs, normalizes once through a helper, uses enums for the internal finite choices and expresses precedence with guard clauses. These are templates that the runner copies as `TicketRouter.java`; their source filenames are not intended for direct wildcard compilation.

Before changing the implementation, predict which behavior must stay identical. The complete 17-case trace before and after the refactor must match byte-for-byte, and its SHA-256 is recorded. Invalid inputs still produce `IllegalArgumentException` and the contract's `INVALID` outcome. Exception-message wording and stack shape are not declared public contracts in this fixture; a real API with promised error payloads would need those covered too.

Try moving the enterprise guard above urgency in the refactored version. The regression case must fail. Then change only a local variable/helper name and predict why all cases should remain unchanged. Do not replace the original requirement with an expected value copied from the new implementation.

This proves the exercised routing contract, not universal equivalence, throughput improvement or a broad Clean Code certification. Interfaces, factories or additional services are unnecessary merely to make a seventeen-case function look more architectural.

## 5. Observe one Linux process, socket and held file

The runner launches its own `owned_probe.py`, waits on an explicit readiness signal and verifies its PID. It reads only that PID's status and known file/socket descriptors. `/proc/<pid>/net/tcp` is filtered by the **owned socket inode**, not dumped as a list of unrelated connections.

Predict these observations:

| Observation | Actual evidence / explanation |
|---|---|
| Process | Recorded PID/parent/name/state come from the owned `/proc/<pid>/status`. State is an observation, not a fixed expected scheduling state. |
| Listening socket | The descriptor points to a socket inode whose TCP entry is `127.0.0.1:<owned port>` in state `0A` (LISTEN). A real TCP request returns `pending=3`. |
| Permissions | The owned file begins at mode `0600`; the runner changes its mode to `0000`. These are actual mode bits, not a complete ACL/capability/SELinux analysis. |
| Existing descriptor | The already-open descriptor can still read after chmod. Changing mode does not revoke that descriptor. The lab does not assert that a privileged process would be denied a new open. |
| Deleted file | The path is unlinked while still held; `/proc/<pid>/fd/<fd>` shows `(deleted)`, and the descriptor can still read the contents. Disk/storage lifetime follows references, not just directory entries. |
| Cleanup | The helper receives its quit signal, closes resources and exits. On an injected failure the parent terminates only its own process group. |

For optional manual inspection, start `owned_probe.py` with a file path in a directory you created for the experiment. Use the **live PID and descriptor numbers it prints**, and inspect only those with `ps -p`, `stat` and `/proc/<pid>/fd/<fd>`. Enter `QUIT` on its stdin when finished. The automatic runner exits too quickly for its old report PID to be a useful manual target; never reuse a stale PID as a kill target.

TCP is a byte stream: both sides use bounded newline framing rather than assuming one `recv()` equals one complete message. There is no global process kill, privileged operation, external socket or modification to an existing application.

## 6. Resolve a real Maven conflict without a network

Predict the selected codec in the synthetic graph:

- `routing-app → adapter:1.0 → codec:1.0`
- `routing-app → audit:1.0 → codec:2.0`

Both codec paths have equal depth and adapter is declared first. The first run asks actual Maven to resolve the graph and loads the selected codec JAR in a class loader; it must report `SELECTED_CODEC=1.0` and `LOADED_CODEC=1.0`. Adding `dependencyManagement` for `codec:2.0` must change **both** to `2.0`.

The runner compiles a tiny inspection Mojo against the installed Maven APIs, seeds only an owned local repository, and invokes its fully qualified goal with `-o`, owned user/global settings and an owned `maven.repo.local`. Maven's plugin compatibility support needs Plexus Utils: the installed Maven support JAR is copied unchanged, and its actual version/SHA-256 are recorded. A minimal local descriptor supplies the known support dependency; this is not publication or a reconstructed third-party distribution. No global Maven cache/configuration is changed.

This is actual mediation and actual class loading, not a handwritten dependency-tree calculation. The codec versions are original teaching fixtures; `2.0` is not a claim about a real security advisory. Change dependency order to predict a tie-break change, then explain why centrally managing a version differs from adding a new dependency that was never used.

## 7. Distinguish build properties from application configuration

The same Maven fixture observes the supported `${revision}` project-version placeholder:

| Source | Observed model version |
|---|---|
| POM default | `1.0` |
| `.mvn/maven.config` with `-Drevision=2.0` | `2.0` |
| Explicit command-line `-Drevision=3.0` | `3.0` |

That is **Maven model/property precedence**, not a simulated Spring property resolver. Maven `-D` arguments and application `--server.port` arguments belong to different launches; a Maven plugin must forward application arguments when it forks the application.

The report supplies read-only file/hash pointers to the existing [Task Tracker](../java-spring/task-tracker/README.md) POM and `application*.properties`. Perform this separate manual application investigation:

1. Identify the Boot parent/BOM and which dependency versions are managed versus explicitly overridden. Trace why a runtime driver and a test library have different scopes.
2. Read the default, persistence, secure, cached, production and observability profile contracts actually present in that checkout. Do not infer the active bean from a filename alone.
3. Pick the nonsecret `server.port` setting. Predict the value/source when application defaults, a profile, OS environment and explicit application command-line arguments disagree. Confirm in a separately started disposable Task Tracker instance following its existing guide.
4. Explain that normal runtime configuration and test-specific property sources differ; test annotations/dynamic properties can override values that would otherwise win at application startup.

These application/IDE steps are intentionally not reported as automatically completed by the offline Maven fixture. For an application dependency investigation, `dependency:tree`/`help:effective-pom` may need already-cached plugins or an explicit permitted download; the automated lab does neither.

## 8. Read an unfamiliar repository and explain a change

Use a real repository for this manual practice; the runner's synthetic repository is not proof that a learner completed it:

1. Record its revision and dirty state. Read `AGENTS.md`, its README, build files and CI entrypoints. Start with `rg --files` and a focused symbol search.
2. Map one HTTP request through security, controller, validation, service, transaction boundary and repository. Name its owner/authorization rule, error path and relevant tests.
3. Run the smallest relevant test. In an IDE, place a breakpoint on the chosen boundary, step once through it, inspect the actual bean/profile and explain any async-thread/context transition. Record your observations; reading a prepared diagram is not the same activity.
4. Inspect one resolved dependency change using its exact artifact/version, maintained upstream advisory/release notes and compatibility contract. Check source/target runtime, BOM effects, license and relevant regression tests. This lab provides no current vulnerability scan or security sign-off.
5. Write a reviewable PR note: concrete trigger/problem, resulting behavior, focused validation and one material limit. Include actual commands/results rather than an invented performance claim.
6. Write a short incident note: symptom, affected scope, evidence, cause, repair/rollback, verification and prevention. Keep customer inputs and credentials out of the note.

For this fixture, a concrete note is: enterprise urgent tickets were sent to the enterprise queue; the golden business test identified the priority-order regression; a new revert restored incident routing while preserving later documentation changes; the explicit refactor retained all seventeen exercised outcomes. That is synthetic local evidence, not a production incident.

## 9. Bounds, isolation and verification

The runner has a 180-second command budget. Individual commands default to 15 seconds; offline Maven checks allow 30 seconds and the bounded bisect command allows 90 seconds within the remaining overall budget. Captured combined output is capped at 128 KiB per command; owned process cleanup waits at most one additional second. These are execution guards, not a production latency SLO or a kernel-enforced storage-I/O deadline.

Inherited Git location/config variables are removed; author/signing/hooks configuration is set only in the new owned repository. Maven/Java option injection and user Maven startup scripts are excluded from the owned experiment. `HOME` and other user directories are not reassigned. Known repository/config source files outside the temporary workspace are read only. Reports contain synthetic behavior, public source paths/hashes and owned process metadata; they contain no learner answers, tokens or real service payloads.

Four focused tests exercise the real workflow, a separately created guard repository under hostile inherited Git location variables, failure while the owned Linux child is live, command output/deadline cleanup, and unbuildable Java skip behavior. The successful workflow itself compares the culprit with the seeded commit, appends a revert, preserves later work, runs all golden cases, verifies actual Maven/JAR outcomes and observes Linux descriptors. Nothing relies on arbitrary sleeps or a mocked bisect/resolver.

Initial local execution and all four tests passed with Git 2.43.0, javac 17.0.20.1, Maven 3.8.7 and installed Plexus Utils 3.4.2. Actual runtime versions and the support-JAR digest are recorded per run. Maven 4 API/layout, real IDE participation, unfamiliar-repository comprehension and current dependency/security review remain separate gates. No website/API/content changes are made by this package.

Primary sources reviewed October 18, 2026: [Git bisect and exit codes](https://git-scm.com/docs/git-bisect), [Git revert](https://git-scm.com/docs/git-revert), [Maven dependency mediation/management](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html), [Maven CI-friendly version properties](https://maven.apache.org/guides/mini/guide-maven-ci-friendly.html), [Spring Boot external configuration](https://docs.spring.io/spring-boot/reference/features/external-config.html), and [Linux process file descriptors](https://man7.org/linux/man-pages/man5/proc_pid_fd.5.html).
