# Follow one RAG request through actual stages

A slow or rejected answer needs a causal explanation: did retrieval return evidence, did the
model HTTP exchange fail, or did the application reject its answer? This opt-in exercise traces
those real boundaries in `KnowledgeService` and `OllamaHttpModel`; it does not estimate a stage
from an expected list of span names. It uses OpenTelemetry SDK **1.67.0** and the application's
Boot-managed Micrometer registry (resolved **1.17.1** in this verification environment).

## Run the original owned fixture

Use a complete JDK 17, Maven and Python 3. From the repository root:

```bash
mvn verify -f examples/ai-backend/pom.xml
python3 -m unittest discover -s examples/ai-backend -p 'test_observability.py'
python3 examples/ai-backend/verify_observability.py
```

The last command copies the packaged JAR into an owned temporary directory, then launches the
actual Java application with `--observe-fixture`. That mode creates original H2 documents,
executes the real lexical retrieval/context/model/answer-validation path, and sends actual HTTP
to its own ephemeral loopback provider. It accepts no endpoint, model, dataset or live-mode
arguments. It uses no fresh holdout, installed model, paid API, Docker or collector.

The fixture executes twelve scenarios: supported answer, no-evidence abstention, provider 429,
deadline, invalid answer schema, unsupported citation, source revocation during generation,
missing usage, malformed usage, rejected input, exhausted call budget and two concurrent calls.
Expect **14 service operations / 11 actual HTTP requests / 83 spans**. Assertions require the
observed requests, causal parents, outcomes and failure-inclusive measurements, not just those
totals. The concurrent HTTP handlers overlap; two independent request traces must remain distinct.

`build/evidence/observability.json` is an ignored, sanitized receipt. It records actual
`Runtime.version()` feature/full version, real trace IDs/parents, stage outcomes, bounded timings
and counters, source raw/LF hashes and the copied JAR digest. Files and JAR must have identical
hashes before and after execution. This binds the run to observed bytes; it is not independent
proof that the JAR was built from those sources. Rebuild after a source edit. A failed new run
removes the previous receipt and publishes no completed replacement.

The Java runtime feature must actually be 17; `--release 17` alone is not runtime evidence.
The Python executable installs a scoped TERM/INT cancellation policy using the existing
`compare_tickets` owned-child runner. Its spawn assignment is protected by deferred cancellation,
including when another live thread receives the signal. Cleanup terminates and waits only its
owned process group and removes its owned workspace. The runner caps total execution at 40s,
child output at 4 KiB, Java JSON at 64 KiB, final receipt at 128 KiB and JAR at 128 MiB. Successful
receipt flags require completed native fixture cleanup and child/workspace cleanup. Imported
library calls alone do not replace their host's signal handlers. The native fixture closes its
HTTP server, executors, JDBC database and SDK. This is finite local teaching evidence, not a
production process-supervisor guarantee or an operating-system sandbox.

## Understand the trace and debug a rejection

`REQUEST` measures `KnowledgeService.ask`, including unsuccessful work. Its real children are
`RETRIEVAL`, `CONTEXT`, `MODEL` and `VALIDATION` when those stages actually execute. `CONTEXT`
validates retrieved snippets, checks current source authorization and builds the original
prompt. `MODEL` includes the existing input/call-budget checks, native exchange and envelope
parsing; its `MODEL_HTTP` child is a CLIENT span around the actual send/body/deadline. The owned
fixture extracts that W3C `traceparent` into its actual SERVER span `FIXTURE_PROVIDER`. The test
requires its remote parent to equal the actual client span. Trace flags are parsed as flags;
new SDK random-ID flags must not be mistaken for broken sampling or propagation.

- **Success:** trace the retrieval/context/model/client/server/validation chain. The source's
  ID being permitted is not proof that an answer is factually supported.
- **No evidence:** retrieval and context succeed, the root is `ABSTAIN`, and no model/client/
  server/validation span or HTTP request exists. No token usage is invented for this path.
- **429:** the client, model and request fail with fixed `RATE_LIMITED`. Answer validation never
  runs. The server independently observes the actual rejection.
- **Deadline:** the adapter cancels its actual future. Either the timed future wait or the native
  HTTP timeout can finish first. Existing public failure codes remain unchanged; both observed
  timeout wrappers map to `DEADLINE` at client/model/request, while non-timeout network failures
  remain `TRANSPORT`.
  The fixture may finish after client cancellation and observe a closed response; that server
  failure is `INTERNAL`, not a claim about a real model provider's internal cancellation.
- **Invalid JSON/schema/citation:** HTTP can succeed while `VALIDATION` and the request fail.
  Distinguish transport delivery from an answer being acceptable to this application.
- **Revocation:** even a permitted citation and successful HTTP cannot bypass the existing
  post-generation authorization check; validation/request fail with `AUTHORIZATION`.
- **Budget:** the second attempted call still counts as a failed model operation and unknown
  usage, but cannot create a second HTTP span/request. Budget exhaustion is not queue overload.

Native `AiTelemetryTests` inspect actual SDK `SpanData`, parent/context restoration, HTTP header
absence with the old constructor, original exceptions, no raw exception export, token edge
cases and privacy. Python tests mutate real report copies to ensure broken parentage, fabricated
stages/usage, cardinality leaks and extra fields fail verification. They also position TERM/INT
inside a real Popen boundary and require that the actual owned child is reaped and caller signal
state restored. They do not replace the normal authentication, tenant, citation or prompt tests.

## Enable it deliberately in the teaching Spring application

Telemetry is **off by default**. Existing constructors remain no-op-compatible. To opt in, add
`--ai.observability.enabled=true` when starting the already configured teaching application;
keep its normal explicit credentials/loopback deployment. No new business route, collector URL,
global SDK registration, automatic retry, changed prompt, source policy or model default is added.
The enabled configuration uses a local bounded `RecordingExporter` (256 sanitized spans, then
counts drops) and the existing registry. There is no trace-reader HTTP endpoint or persistent
trace storage. The fixture constructs and reads its own explicit recorder. For embedded code,
retain your `RecordingExporter` reference, pass it and a registry to `AiTelemetry`, and close the
helper after owned work. An operator would need a separately reviewed exporter/retention plan
before expecting a collector integration. Existing `/actuator/health` exposure stays unchanged;
AI metrics are registry instruments, not a newly exposed metrics API.

New span attributes are only fixed `ai.stage`, `ai.outcome` and `error.type` enums. They have no
exception messages, stack traces, span events/links, prompts, source content/IDs, answers,
tickets, principal/tenant, endpoint URLs or approval data. Fixed stage/kind/outcome/error,
trace/span/parent IDs and elapsed time form the sanitized trace record. Metric dimensions are
only fixed enums: stage/outcome/error, usage state and token direction. Trace IDs appear only
in trace records, never as metric labels. Existing framework logs/metrics are outside this
helper's export contract; do not enable payload/debug logging to diagnose an answer.

`ai.stage.calls` and `ai.stage.duration` include both success and failure at each executed stage.
The duration instruments record counts and total elapsed nanoseconds here, not an asserted
production p95. `ai.model.usage.calls{state=known|unknown}` includes **all attempted model calls**,
including rejected input/budget, HTTP failure, deadline and malformed/missing usage. The fixture
has **7 known / 5 unknown = 12 attempts**. `ai.model.known.tokens` totals **84 input / 28 output**
for the known subset, including calls whose answer is later rejected. The optional native
`prompt_eval_cached_count` contributes **21 cached input tokens**, a subset of input, never extra
input. Missing cached counts remain unknown, not zero. Only actual integral nonnegative counts
at most 1,000,000,000 are accepted; input/output must both be present, and any present cached
count must be valid and no greater than input. Malformed usage never rejects a business answer.
These provider-reported counts do not prove independent tokenizer counts, billing or cost.

Stage durations overlap: the model contains HTTP and the request contains the pipeline. Do not
sum them, subtract them to invent provider queue time, or interpret the fixture's HTTP/lexical
latency as model speed, semantic quality, production capacity or cost per accepted answer.
This unit does not instrument streaming cancellation/first token, agent tools/MCP, embeddings,
vector index internals, queue admission or collector export. Those remain distinct AI11/D05
closure work; the nonstreaming path has no queue/admission mechanism to measure.

Primary sources checked 2026-10-21: [OpenTelemetry Java manual instrumentation](https://opentelemetry.io/docs/languages/java/instrumentation/),
[W3C Trace Context](https://www.w3.org/TR/trace-context/),
[Micrometer timers](https://docs.micrometer.io/micrometer/reference/concepts/timers.html),
[Ollama native chat response/usage](https://docs.ollama.com/api/chat).

Cancellation ownership also covers the first TERM/INT during a deadline cleanup, before any
previous cancellation flag exists. An actual READY-confirmed TERM-ignoring child must be killed,
waited and have its pipe closed before cancellation escapes; an unrelated test group stays alive.
Scope-entry and ordinary nested restoration remain separate regressions. No live model is called
by these process tests.

Timeout primary contracts: [JDK17 HttpTimeoutException](https://docs.oracle.com/en/java/javase/17/docs/api/java.net.http/java/net/http/HttpTimeoutException.html)
and [timed Future.get](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/Future.html#get(long,java.util.concurrent.TimeUnit)).
