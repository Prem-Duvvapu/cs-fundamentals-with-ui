# Follow one real request through HTTP, an async worker and persistence

This optional milestone adds observable evidence to **Task Tracker**, not learner analytics to the educational site. Reuse the [production-readiness lesson](https://cs-fundamentals-with-ui.vercel.app/topic/spring-testing-production), [LLD logging design](https://lld-with-ui.vercel.app/logging-framework) and [HLD capacity reasoning](https://hld-with-ui.vercel.app/topics/capacity-estimation). This lab supplies the distinct executable request/trace exercise.

You need basic HTTP, threads and local transactions. A **trace** connects one operation's steps; a **span** measures one step; a **metric** aggregates many operations; a **log** records a particular event. One cannot replace all the others.

## What actually runs

The `observability` Spring profile enables a teaching probe and includes `persistence`. Default startup still uses the original in-memory repository and has no probe or teaching SDK. `production,observability` retains the production authentication, role and CSRF rules.

```text
POST /api/observability/probe
  REQUEST span on Tomcat's request thread
    ASYNC span on a bounded worker, with captured OpenTelemetry Context
      DEPENDENCY_CLIENT span around a real JDK HTTP client call
        DEPENDENCY_SERVER span on an owned loopback HTTP server
          DATABASE span around actual transactional JpaTaskRepository.add()
```

The loopback dependency is a synthetic fixture in the **same JVM**, with its own HTTP socket and threads. It writes the fixed title `Observability synthetic fixture`; it does not accept customer data. This proves a wire/async/persistence boundary with real SDK spans, not independently deployed microservices. The database span includes the repository call and Spring transaction completion; it is not automatic SQL/JDBC instrumentation or a breakdown of individual queries.

The local exporter writes a JSON **message payload** inside the normal Spring Boot log envelope. It includes fixed stage/status/error codes, duration and SDK trace/span IDs. No OTLP exporter, remote collector, Jaeger, Prometheus server or production alert service is deployed. The tests additionally use the **official OpenTelemetry InMemorySpanExporter**, an actual SDK test exporter—not evidence of a live collector.

## Run and verify

Java 17, Spring Boot **4.1.1**, and OpenTelemetry SDK/API/test exporter **1.67.0** are pinned through the OpenTelemetry BOM. The SDK is configured explicitly without an instrumentation starter or global SDK registration. Micrometer **1.17.1**, managed by the Boot parent, supplies the existing application's metric registry. Sources/version checks: 2026-10-18.

From the repository root, run these serially:

```bash
mvn -B -f examples/java-spring/task-tracker/pom.xml verify
python3 examples/java-spring/task-tracker/verify_http.py
python3 examples/java-spring/task-tracker/verify_http.py --observability
```

The first compiles/runs the existing tests and new observability tests, then packages the JAR. The dedicated `backend-observability.yml` workflow runs this same sequence, including both packaged smoke modes. The second preserves the original production HTTP smoke checks and verifies the probe is absent. The third starts the packaged application with `production,observability`, checks the real path and correlated local JSON records, verifies an attributed failure, then stops only its child JVM. Runtime credentials and temporary databases are generated for each smoke run. Both smoke modes retain the original health/ownership/CRUD/pagination/conflict/CSRF/metrics/graceful-shutdown checks.

Unit/integration evidence includes:

- One actual HTTP request preserves a supplied W3C trace ID and every expected parent/span link through async, HTTP and committed JPA work.
- Missing or malformed incoming context creates a valid fresh root; a raw executor loses the parent while `Context.wrap()` preserves it.
- A fixed 80 ms fixture delay is measured on the dependency-server span and timer.
- A dependency failure returns 503, marks upstream stages with the error code, and produces no invented database operation or write.
- Raw header/query values, token/baggage sentinels, task titles and IDs never become teaching log fields/span attributes/metric labels.
- Metrics permit only five stages, two outcomes and five fixed SLO boundaries; security tests preserve learner role plus CSRF requirements.
- A tested alert decision rule distinguishes insufficient volume, one bad window, sustained failures and sustained slow requests.

Reset: tests/smokes use owned temporary databases. For a manual run, choose a new local database path or remove only the database you created after stopping the process. Each successful probe adds one synthetic task row; keep this profile off for ordinary usage and never run it against a valuable/shared database.

## Try it manually

In a scratch directory, start the packaged JAR (replace the example absolute path):

```bash
java -jar /absolute/path/to/task-tracker/target/task-tracker-example-0.0.1-SNAPSHOT.jar \
  --spring.profiles.active=observability --server.port=8088
```

This explicitly selected teaching mode is loopback-only and does not enable the production login profile. The default relative database path is created under that scratch directory.

```bash
curl -X POST 'http://127.0.0.1:8088/api/observability/probe?scenario=ok' \
  -H 'traceparent: 00-1234567890abcdef1234567890abcdef-1234567890abcdef-01'
curl -X POST 'http://127.0.0.1:8088/api/observability/probe?scenario=slow'
curl -X POST 'http://127.0.0.1:8088/api/observability/probe?scenario=failure'
```

Successful responses include the trace ID and `success`. The failure response is a Problem Detail with HTTP 503 and the fixed `DEPENDENCY_FAILURE` code. The teaching mode does not expose the metrics endpoint by default; use `production,observability` and authorized access when inspecting Actuator metrics, as the packaged smoke does. Never open the teaching profile to a network.

Use the returned trace ID to find five `probe.span` JSON payloads. Follow their `parent_span_id` values from REQUEST to DATABASE. Successful span status may be `UNSET`—OpenTelemetry does not require setting `OK` on every success. Failure produces four error spans because the dependency fails before persistence.

## Why the metrics stay bounded

`tasktracker.probe.calls` is a cumulative counter. `tasktracker.probe.duration` is a timer with counts/total time/max and explicit 50/100/250/1000/2000 ms SLO buckets. `stage` and `outcome` are finite labels; Micrometer's Simple registry also represents the fixed buckets using `le` labels. At most ten stage/outcome pairs generate 20 primary meter identities and 50 fixed bucket gauges in this registry. Exporters can represent timer series differently; verify their actual exposition rather than copying this number into a Prometheus capacity estimate.

Trace IDs belong in logs/traces, **not metric labels**. Likewise do not label by user, task, project, request URL, query string, exception message or authorization token. Client-supplied trace context correlates work; it is not authorization. Baggage and tracestate are intentionally not accepted or forwarded.

Averages hide tails. For example, 80 requests taking 20 ms and 20 taking 500 ms average 116 ms, while the empirical p95 is 500 ms. This fixture's tiny run is not a capacity benchmark or meaningful production percentile estimate. Merge histogram bucket counts across equivalent instances/windows before estimating a service percentile; averaging instance p95s does not produce the service p95.

## An actionable alert and incident runbook

`ProbeAlert` implements a small decision rule, tested with authored **five-minute delta-count windows**. It is not a scheduled alert deployment. An external collector would need to supply two complete consecutive windows from the same stage, handle counter resets/restarts/missing samples, and use consistent histogram boundaries.

For dependency-client calls, sum success/error counters to get requests; failures are the error counter. Slow requests are total timer count minus the count at the 250 ms bucket, summed across outcomes. Do not compare a lifetime count with a five-minute bucket delta. Only evaluate when each window has at least 20 requests:

- Failure ratio **above 5% in both windows** → `DEPENDENCY_ERRORS`.
- Otherwise, duration above 250 ms **above 5% in both windows** → `DEPENDENCY_LATENCY`.
- One noisy window stays clear; low volume is `INSUFFICIENT_VOLUME`, which is not proof of health. A separate availability/missing-data policy is required.

The 80 ms fixture delay demonstrates measurement and is below the 250 ms alert boundary; the sustained-window tests use separately authored counts. These are teaching thresholds, not a universal SLO. Revisit them against expected traffic, user impact and response budget before deploying an alert. Choose an owner and route notifications deliberately; the repository sends none automatically.

1. **Symptom:** sustained errors or slow dependency requests. Confirm the window, volume, outcome labels and end-to-end user impact; compare readiness separately.
2. **Hypotheses:** queue waiting, dependency delay/failure, database blocking, context loss or telemetry gaps. Obtain a representative trace and its stage timings.
3. **Evidence:** a long dependency-server span with a short database span points away from SQL; no database span on a failed request means the failure happened earlier. Missing spans alone can also mean propagation/export failure—check SDK and process health.
4. **Mitigation:** reduce optional probe traffic or disable the teaching profile. For a real dependency, use its approved timeout/fallback policy; do not remove request bounds or multiply retries to hide a slow stage.
5. **Fix and verify:** repair the measured boundary, rerun the failing scenario and privacy tests, compare error/latency windows and check recovery at normal traffic. Record evidence, user impact and prevention in a short postmortem.

## Predict, change and debug

- **Predict:** remove `Context.current().wrap(work)` before submitting a worker. **Answer:** HTTP still succeeds, but the async operation starts a different root trace. `ObservabilityContextTest` demonstrates both behaviors. Thread-local state does not automatically follow a task to another thread.
- **Change:** try `scenario=slow`. **Answer:** the dependency-server span includes the fixed delay; the database span measures a distinct repository call. Parent durations include child time, so summing every nested span double-counts work.
- **Debug:** try `scenario=failure`. **Answer:** inspect the fixed error code on client/async/request spans; the database stage is absent and no row is inserted. A 503 alone cannot distinguish dependency failure from queue saturation in a real service.
- **Interview:** explain why logs, metrics and traces all matter. **Answer:** a metric reveals a sustained symptom, a trace locates a representative request's costly stage, and correlated logs explain its fixed diagnostic outcome; sampling, instrumentation gaps and missing data limit each inference.

The probe uses two async workers with four waiting slots, a one-second HTTP request deadline and a two-second worker deadline. The owned dependency also has two workers with four waiting slots. Rejected work returns an explicit fixed overload error; shutdown stops these owned workers and server. A timed-out caller does not prove a remote database operation was cancelled, which is why production writes still need their own durability/idempotency design.

## Primary sources

- [OpenTelemetry Java 1.67.0 release](https://github.com/open-telemetry/opentelemetry-java/releases/tag/v1.67.0) and [SDK configuration](https://opentelemetry.io/docs/languages/java/sdk/) describe the pinned implementation.
- [OpenTelemetry Java API](https://opentelemetry.io/docs/languages/java/api/) explains spans, scopes and propagation; [Java instrumentation choices](https://opentelemetry.io/docs/languages/java/instrumentation/) distinguishes manual code, agents and framework instrumentation.
- [Micrometer timers](https://docs.micrometer.io/micrometer/reference/concepts/timers.html) and [histograms/percentiles](https://docs.micrometer.io/micrometer/reference/concepts/histogram-quantiles.html) explain timer measurements and aggregation limits.
