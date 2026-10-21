# Diagnose actual Spring configuration and Java execution

This BE-01/BE-09 lab answers two concrete questions: “Which configuration value did
Spring actually bind, and why?” and “Where did this execution stop, step and throw?”
It imports the existing Task Tracker sources/resources unchanged. It adds observation
launchers and original synthetic requests, rather than another business service.

A **property source** supplies settings. A **profile** selects configuration and beans.
A **breakpoint** pauses execution at a location. A conditional breakpoint pauses for
matching state; an exception breakpoint observes a throw even if a caller catches it.
A stack frame shows one method invocation. These terms describe different evidence.

## Run it

Use Linux/WSL, Python 3.10+, Maven 3.x, and a complete JDK 17 (`java`, `javac`, JDI/JDWP).
No Docker, cloud service, paid provider, administrator access or private configuration
is required. The POM imports Task Tracker's Java/resources directly and preserves its
Boot 4.1.1 parent, dependencies and Java 17 setting. The verifier checks that those
contracts have not drifted. It compiles debugger sources with `-g --release 17`.

The usual declared Maven dependencies must already be cached. Runtime verification
uses Maven offline with newly created user/global settings and does not download
anything. CI prepares the same declared dependency set before running offline checks.
Do not download a different JDK or change the platform Java baseline for this lab.

```sh
python3 examples/backend-debugging/verify.py
python3 -m unittest discover -s examples/backend-debugging -p 'test_*.py' -v
```

For focused investigation, the verifier also accepts `--part configuration` or
`--part debugger`. The default must complete both. It writes only sanitized JSON under
`examples/backend-debugging/target/evidence/verification.json` and prints counts plus
cleanup/source-integrity flags. The tests save separate `configuration.json` and
`debugger.json` evidence. No actual integration case silently skips.

Expected default summary:

```json
{"configurationCases":6,"actualJdi":true,"importedSourcesUnchanged":true,"ownedWorkspaceRemoved":true}
```

Temporary application contexts, H2 files, debugger listeners and JVMs are removed.
Delete this module's ignored `target/` to remove its build/evidence files. Nothing is
written to Task Tracker source, platform configuration or a global Java setting.

## Predict which Spring value wins

The nonsecret property is `management.endpoints.web.exposure.include`. All successful
launches use `server.port=0` independently, so no fixed port collides and no port
setting accidentally replaces the precedence experiment itself.

| Case | Actual inputs | Expected winner / effective exposure |
|---|---|---|
| memory-default | Original main config; default memory profile | application.properties / health |
| production-profile | Original production profile/group | application-production.properties / health,metrics |
| production-environment | Production plus a controlled environment value health | environment-variable / health |
| production-cli | Same environment plus CLI health,metrics | command-line / health,metrics |
| bad-port | Default memory startup with CLI server.port=invalid-port | Actual binding/startup failure |
| memory-repaired | Fresh default memory startup with CLI server.port=0 | Actual listening server and successful health request |

The first row is the application's ordinary resource-file default, not the separate
`SpringApplication.setDefaultProperties` fallback mechanism. The profile row uses the
existing real production configuration, not invented properties or a Python resolver.

For each successful case, [ConfigurationProbe](src/test/java/com/csfundamentals/debugging/ConfigurationProbe.java)
launches `SpringApplication(TaskTrackerApplication.class)` normally. It does not use
`@SpringBootTest` overrides, `@TestPropertySource` or synthetic property-source order.
The actual environment reports the winning value and ordered competing sources;
`OriginLookup`/`TextResourceOrigin` supplies an allowlisted resource basename and line.
The actual `WebEndpointProperties` bean supplies the bound exposure set. These are
checked against real health/metrics HTTP statuses while the server is running.

Default memory must select `MemoryTaskRepository` without a cache manager. Production
must activate its actual persistence/secure/cached group, select `JpaTaskRepository`
and create the existing cache manager. The probe inspects actual bean target classes;
a profile filename alone would not establish that a bean was selected.

Each production launch gets a new owned H2 file path and generated passwords. The
metrics request authenticates with one generated learner credential. No credential,
Authorization header, JDBC path, arbitrary environment value or full configuration
listing enters the report. There is **no `/actuator/env` exposure** and no new HTTP
endpoint; the existing production security/health behavior remains in force.

The bad-port case requires a nonzero startup, an actual binding/conversion cause, and
the observed failed `server.port` property with command-line origin. Simply seeing an
error log, guessing the cause from an argument, or manually parsing an integer would
not prove this application failure. A fresh repaired process must actually listen and
answer health requests. Failed startup does not count as a ready server.

## Explain the configuration incident

Use the runbook order: symptom → hypotheses → evidence → cause → repair → regression.

1. Predict whether the profile file, environment or CLI controls metrics exposure.
2. Compare `effective`, `orderedCandidates`, resource line numbers and `boundExposure`.
3. Compare those with the actual `healthStatus` and authenticated `metricsStatus`.
4. For the bad startup, locate `server.port` and its observed command-line source in
   the binding failure; distinguish that from a database or authorization failure.
5. Remove the invalid override, launch with an ephemeral port, and verify recovery.
6. Explain why opening all configuration endpoints is unnecessary for diagnosis.

A nonweb Spring context could prove property resolution and selected nonweb beans, but
would not establish actual Tomcat port binding or HTTP endpoint exposure. This lab
uses real servlet launches for precisely those checks. It does not generalize this
four-layer example to every Spring test-source/config-import precedence combination.

On the pinned Boot 4.1.1 runtime, the invalid port is read while evaluating configuration
conditions: the observed chain includes `InvalidConfigurationPropertyValueException`
and `NumberFormatException`. This happens before the later `ServerProperties` binding
stage. The probe takes the failed property name from that actual typed exception and
its winning origin from the prepared Spring environment; it does not infer the failure
solely from its launch arguments or require an exception type that never occurred.

## Observe actual JDK debugger events

The debugger uses unchanged `Task`, `TaskRepository`, `MemoryTaskRepository` and
`TaskService` sources plus a small checked-in synthetic caller. It does not substitute
a simulated call stack or attach to a user-selected PID. The JDI listener binds only
`127.0.0.1` with port 0; its one new debuggee connects to that owned listener.

The target makes two valid calls and one invalid blank-title call. Predict:

- The breakpoint's client-side condition is checked three times but matches only the
  fixed synthetic `conditional-fixture` input. Nonmatching events resume immediately.
- The matching call produces an actual line step in `TaskService.create`, followed by
  an actual step into `MemoryTaskRepository.add` with JDK-library code excluded.
- An actual caught `IllegalArgumentException` event points to `TaskService.create`,
  with a catch location in the fixture caller and the relevant stack frames present.
- Only the two valid calls mutate the repository; the invalid request is caught.

JDI's event queue, breakpoint requests, local-variable reads, step requests and exception
requests produce these observations. The fixed predicate is evaluated by the debugger
client against a suspended frame; the lab does not invent unsupported `jdb stop ... if`
syntax or evaluate arbitrary expressions/methods supplied by a user.

The source/event/target/cleanup bounds are fixed. No external attach address, PID, class
path, executable Java source or breakpoint expression is accepted by the Python CLI.
A stripped build without the required local-variable/line metadata must fail rather
than fabricate a successful inspection.

This is **headless JDK debugger evidence**, not a GUI IDE demonstration or a real
learner session. A person should still reproduce an exception breakpoint, conditional
breakpoint, stepping and active Spring bean inspection in their IDE, then explain what
they observed. That manual evidence remains separate from automated completion.

## Bounds and ownership

The whole verification has a 300-second execution budget. Maven preparation gets at
most 90 seconds; each Spring child gets 45 seconds plus finite cleanup; each ready
probe accepts its private quit command or expires after 25 seconds. HTTP requests
have two-second timeouts and 64 KiB body limits. The JDI experiment has a five-second
accept bound, 30-second event budget, 128-event cap and 16 KiB debuggee log/report cap.
Captured tool output is capped at 128 KiB and final reports at 64 KiB. These guards
are not kernel deadlines for a blocked filesystem operation.

The subprocess helper installs scoped TERM/INT handling only for executable work,
defers cancellation until `Popen` ownership is assigned, and preserves caller handlers
and signal masks. Cleanup addresses only each new session's group, reaps the owned
launcher/debuggee, closes pipes and removes the temporary workspace. A changed/default
PID or arbitrary attach target is never used for cleanup.

Inherited Spring/server/management/Task Tracker/telemetry settings and Java option
injection are excluded before creating children. Configuration inspection is limited
to the one allowlisted nonsecret key; profile names and known bean classes are public
teaching metadata. Reports contain source/artifact hashes, fixed causes and outcomes,
not raw logs, private configuration, payloads or secrets. Existing source bytes are
checked before/after the experiment.

The owned workspace does not sandbox arbitrary Java. Only the reviewed checked-in
fixtures and unchanged teaching sources are executed. The lab certifies neither
production safety, an external deployment, arbitrary diagnostic-tool binaries nor
human comprehension. Reuse [the existing engineering workflow](../engineering-workflow/README.md)
for Git/Maven/incident writing and [AI-assisted patch review](../engineering-workflow/AI_ASSISTED_REVIEW.md)
for verifying generated proposals rather than duplicating their lessons.
