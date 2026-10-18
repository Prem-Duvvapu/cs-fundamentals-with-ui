# Bounded HTTP reliability: an executable integration lab

A slow dependency should consume a declared amount of caller time and local capacity. This Java 17 lab sends real HTTP requests to an owned loopback dependency and combines deadline, retry, jitter, bulkhead, cancellation and circuit-breaker policies. It adds the integration evidence missing from the existing lessons; it does not replace their explanations or simulators.

Start with the **LLD circuit-breaker** (`lldbreaker`) and **HLD request-flow/load-balancing** (`hldflow`) entries in the [maintained learning-network links](../../BACKEND_ENGINEERING_COVERAGE_2026-10-17.md#5-ownership-across-the-learning-network), then [CS safe methods and retries](../../content/networking/07-application-layer.md#safe-methods-idempotency-and-retries) and [CS REST failure taxonomy](../../content/java-spring/08-spring-rest-api-design.md#failure-taxonomy-observability-and-retry-safety). The linked apps keep independent progress. HLD's timeout/retry module is a draft in the reviewed catalog; it is not counted as a delivered prerequisite here.

## 1. Setup and first observation

Requirements: Java 17 JDK and Maven. No Docker, database, cloud account, application backend or paid service is needed. Maven downloads the pinned test/build dependencies on its first run; the running lab itself uses the JDK only.

```sh
mvn -f examples/backend-reliability/pom.xml verify
```

After that command **succeeds**, run the JAR it produced:

```sh
java -jar examples/backend-reliability/target/backend-reliability-lab-1.0.0.jar
```

The demo starts its own random-port `127.0.0.1` server, returns `503` twice and `200` once, and cleans up its own server/executors. Expect:

```text
Outcome: NONE; attempts=3; dependencyRequests=3
Counters: ... active=0, admitted=0 ... attempts=3, retries=2 ... breaker=CLOSED
```

The event sequence includes one accepted call, three actual send attempts, two scheduled delays and one final result. Random delay values vary; the number of calls does not. No request/response bodies are written into the event history. A successful demo is local functional evidence, not a latency or capacity benchmark.

## 2. Know the exact bounds before changing anything

| Boundary | Default demo / hard constraint |
|---|---|
| Allowed operation | Explicitly safe `GET` to a `http://127.0.0.1:<port>` dependency. Other methods and non-loopback targets are rejected before sending. |
| End-to-end budget | Demo 3 seconds; caller must choose a positive budget of at most 5 seconds. It starts before executor handoff and is never reset by a retry. |
| Per-attempt wait | Demo 1 second; effective attempt limit is the smaller of configured timeout and remaining caller budget. Configuration is positive and at most 5 seconds. |
| Response consumption | Future wait covers body completion as well as headers. Each response is capped at 64 KiB by a cancelling `BodySubscriber`. |
| Retries | At most 3 application send attempts total, including the first. Only `429`, `502`, `503`, `504`, attempt timeouts and selected I/O failures are candidates. |
| Backoff | Full jitter in `[0, min(maxBackoff, base × 2^(failedAttempt−1)))`; demo base 40 ms, cap 200 ms. Configured cap is at most 1 second. |
| Retry-After | Delta seconds or HTTP date; wall clock is injectable. A valid server minimum is never shortened to the jitter cap. If it does not fit the remaining deadline, return `DEADLINE` without another request. |
| Local admission | Demo 2 logical calls, configurable 1–8. Semaphore admission is immediate; excess calls receive `OVERLOADED` with zero attempts. |
| Executor handoff | A bounded buffer of at most the configured capacity bridges worker completion/handoff. Running plus admitted pending calls stay at the semaphore limit; callers do not wait for an admission slot. |
| HTTP executor | At most `4 × capacity` daemon workers, direct handoff, no task queue; its caller-runs policy avoids an unbounded internal scheduling backlog. |
| Circuit breaker | Demo opens after 2 consecutive failed **logical calls**, not after 2 attempts. Demo cooldown 1 second; threshold 1–10 and cooldown up to 30 seconds are configurable. |
| Recovery probe | At most 1 half-open logical call and exactly 1 send attempt. Other callers receive `CIRCUIT_OPEN`; failed/cancelled probes reopen with a fresh cooldown. |
| Observations | Fixed counters and a maximum of 256 recent metadata events; no unbounded per-call history. |

A `GET` method name alone cannot make an incorrectly designed endpoint safe. The dependency contract must actually be read-only. This laboratory does not accept arbitrary user URLs or forward authentication headers.

## 3. Predict, run, explain

Before each scenario, write down the expected logical calls, actual dependency requests, terminal reason and breaker state. Run one focused test, then compare its assertions and event sequence with your prediction:

```sh
mvn -f examples/backend-reliability/pom.xml '-Dtest=ReliabilityTest#safeReadRetriesExactlyThreeTimesAndEmitsBoundedAttemptEvidence' test
mvn -f examples/backend-reliability/pom.xml '-Dtest=ReliabilityTest#bulkheadRejectsExcessCallersWithoutAdmissionWaitAndRecoversAfterRelease' test
mvn -f examples/backend-reliability/pom.xml '-Dtest=ReliabilityTest#breakerCountsLogicalCallsAndAllowsOnlyOneNonRetriedHalfOpenProbe' test
```

| Scenario | What to predict | What the real socket assertions establish |
|---|---|---|
| Two `503`s, then success | 1 call, 3 requests, 2 retries | Exact counts; deterministic injected jitter gives 20 ms then 40 ms without waiting for those delays in the test. |
| `Retry-After: 1` | Retry no earlier than the declared minimum | Injected pause advances the monotonic test clock by 1 second; the client sends exactly twice. This verifies policy arithmetic, not a measured production delay. |
| `Retry-After: 60`, 3-second caller budget | No retry can fit | Exactly 1 dependency request; no minute-long wait or shortened server minimum. |
| `400`/`401`/`403`/`404`/`409`, redirect, or `500` | No configured retry | Exactly 1 request. Redirects are not followed. `500` is deliberately excluded from this lab's retry allowlist. |
| Headers arrive but body stalls | Header timeout alone is insufficient | A signalled handler writes an incomplete body; the caller deadline completes the result and releases local capacity. |
| Attempt stalls, then safe read succeeds | Original deadline survives the first timeout | Exactly 2 requests; an attempt-timeout event precedes the success. |
| 2 held calls plus 25 new callers | Protect finite capacity | Exactly 2 requests while held; all 25 excess calls are rejected, then a new call succeeds after release. |
| Cancel during HTTP or backoff | Do not start another attempt | Owned wait is interrupted; admission is released; cancellation during backoff sends no retry. |
| 2 failed logical calls at 3 attempts each | Breaker sees 2 failures, not 6 | 6 requests, then an open-circuit call sends 0. Advancing the test clock admits only 1 probe. |
| Oversize body | Do not retry a contract/resource failure | Subscriber cancels and returns `RESPONSE_LIMIT` after one request. |

The tests use latches, cancellation, bounded future waits and injectable clocks/random sources. They do not infer concurrency or completion from arbitrary sleeps. Real deadline tests intentionally wait for a timeout, but assert signals, outcomes and request counts rather than machine-speed benchmarks.

## 4. Change one policy at a time

1. Change `maxAttempts` from 3 to 1 in the demo and predict its new outcome. The dependency still needs three requests to recover; this logical call must stop after the first failure. Update your prediction before updating the assertion.
2. Change the injected jitter source from `0.5` to `0`. Explain why zero is a valid sample and why constant zero is a poor production random source. Leave the attempt cap and absolute deadline intact.
3. Set `Retry-After` beyond the caller deadline. Explain why capping it downward violates the chosen server-minimum policy. A caller can fail early and choose a separate later operation; this call must not silently extend its budget.
4. Change bulkhead capacity from 2 to 1. Hold the first dependency handler on its latch and predict which later calls receive overload feedback. Capacity covers retry waits too.
5. Change the breaker threshold from 2 to 1. Keep at most one half-open probe, and explain why a successful **older** in-flight call must not close a newer open circuit. `PolicyTest` covers that generation race.
6. Cancel the half-open permit in `PolicyTest`. Explain why unobserved health cannot justify closing the circuit and why another cooldown is required.

Do not add a retry around `execute()` while retaining its internal retry loop. A three-attempt client nested under three retries can amplify to nine application attempts; several service layers make it worse. Choose a retry owner, preserve one overall budget, and count dependency attempts explicitly.

## 5. Debug a failure using evidence

Inspect `Result.reason()`, `Result.attempts()`, `snapshot()` and `events()` in that order. `Result.status()` is the last fully received HTTP status, or zero if none completed. The body is returned only on success. Call IDs are local observation identifiers, not durable idempotency keys.

- **`OVERLOADED` with zero attempts:** local admission rejected the call. Increasing retries cannot create capacity. Check held calls/backoff, cancellation and the caller's overload response policy.
- **`CIRCUIT_OPEN` with zero attempts:** the dependency was not called. Check preceding logical failures, cooldown and whether a half-open probe is already active.
- **`DEADLINE` after one request:** inspect whether the total budget was consumed by body completion or whether the next server-directed delay could not fit. A scheduled retry is not proof that an actual retry occurred; counters increase only when a send starts.
- **`RETRY_EXHAUSTED`:** the allowed attempts failed. Compare `ATTEMPT_STARTED` count with server request count; check for another retry layer before raising the cap.
- **`RESPONSE_LIMIT`:** this is a bounded contract failure, not an invitation to retry the same large payload.
- **Caller cancellation:** `future.cancel(true)` cancels the worker and its pending HTTP wait, and prevents later loop attempts. The future throws `CancellationException`; the cancellation counter counts explicit caller cancellations. Shutdown instead completes an interrupted owned call with reason `CANCELLED`.

Local cancellation is best effort for the transport. It cannot undo accepted remote work or prove that a remote handler stopped. A blocked fixture handler remains blocked until its own release signal; tests always release it and stop only their own server.

## 6. The committed-but-timeout trap

`mutationMayCommitBeforeAClientTimeoutAndAutomaticMutationRetryIsRejected` sends one raw POST **outside** the safe-read wrapper to a synthetic fixture. The fixture increments an in-memory counter and signals that it committed, then withholds the response. The caller times out while the counter remains 1. The wrapper rejects a subsequent POST before any network call, so it cannot repeat the mutation.

This is not durable mutation handling: the fixture's counter disappears on process exit. It proves the ambiguity of a lost response. For a durable local mutation example, reuse [the existing approval/idempotency workflow](../ai-backend/WORKFLOW.md) and [REST idempotency/concurrency guidance](../../content/java-spring/08-spring-rest-api-design.md#put-patch-idempotency-keys-and-concurrency). The former binds an exact approved action to authenticated scope and preserves its committed outcome; this lab intentionally implements no second mutation or idempotency store.

## 7. Interview practice

Answer before reading these comparison points:

1. **Why have both an attempt timeout and an overall deadline?** An attempt can be abandoned while enough budget remains for one safe retry. The overall deadline bounds attempt, response-body consumption, handoff and retry delays together; resetting it per attempt expands caller latency.
2. **Why keep a slot during backoff?** The slot bounds outstanding logical work, including retries waiting to be sent. Releasing it during every pause can admit many retrying calls and create a later burst. The cost is that backoff consumes scarce local capacity; choose that trade-off explicitly.
3. **Why count breaker failures per logical call?** The configured threshold should describe caller-visible operations. Counting each retry as an independent logical failure can open the circuit much sooner than the intended policy. The half-open path uses one attempt so recovery probing cannot amplify.
4. **Does a timeout mean a payment failed?** No. It means the client did not receive a complete result within its budget. The server may have committed already; inspect an authenticated durable operation result and use a scoped idempotency protocol before replaying a mutation.
5. **Does a bulkhead guarantee only two remote jobs exist?** No. It bounds this client's admitted local operations. A cancelled remote handler may continue, and other client instances have their own capacity. Remote concurrency, distributed budgets and cancellation need their own contracts.
6. **Is this streaming backpressure?** Admission rejection is explicit overload feedback; `BodySubscriber` also requests bounded batches and enforces a byte cap. This is not an application-level reactive stream or an adaptive global rate limiter.

A strong answer states the bound, identifies who owns it, cites an observed failure and names one limit. It should not claim exactly-once delivery, distributed durability, global rate limiting or production availability from this local lab.

## 8. Implementation and evidence boundaries

`RetryPolicy` owns bounded retry arithmetic and HTTP-date parsing. `ReliableReads` owns operation admission, absolute deadlines, actual HTTP attempts, body cap, cancellation and metadata. `CircuitGate` is the small composition boundary needed to observe retry/bulkhead interactions; reuse the linked LLD lesson for a full state-machine explanation. The demo and tests own every loopback socket and daemon executor they create.

The initial direct-handoff-only call executor exposed an idle-slot/worker-return race: a sequential call could receive a spurious overload result while the previous worker was finishing. Immediate semaphore admission plus the capacity-bounded handoff buffer fixes that without introducing an unbounded queue. Completion releases admission before publishing the result, and tests cover rejection/recovery and circuit probing.

The application loop owns at most three `sendAsync` attempts. JDK HTTP internals may perform protocol/connection recovery; this is not a bound on TCP packets or proof of wire-level exactly-once behavior. These tests count actual requests received by the controlled dependency for the specified fault cases. Never enable automatic mutation retry on the strength of these read-only results.

Production adoption still needs workload measurements, remote cancellation/overload agreements, request-context propagation, persistent telemetry/export, service-wide retry budgets and authentication/TLS policy. The lab does not implement Redis, a gateway, WebSockets, service discovery, a distributed breaker or a production deployment. No global curriculum completion claim follows from this package.

Sources checked October 18, 2026: [JDK 17 HttpClient asynchronous send/cancellation](https://docs.oracle.com/en/java/javase/17/docs/api/java.net.http/java/net/http/HttpClient.html), [RFC 9110 safe/idempotent methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2), [RFC 9110 Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3), and [JDK ThreadPoolExecutor queue/rejection behavior](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html). This is a Java 17-only exercise; it does not depend on newer structured-concurrency or virtual-thread APIs.

## Local verification checkpoint — October 18, 2026

`mvn --batch-mode --no-transfer-progress -f examples/backend-reliability/pom.xml verify` passed **19 tests** (15 real-HTTP integration scenarios and four deterministic policy/race tests), with no failures, errors or skips. The successfully packaged JAR then ran separately and reported `NONE`, exactly three attempts/three dependency requests, two retries, zero active/admitted calls and a closed breaker. Random demo delay values are intentionally not fixed. This is local Java 17 evidence; the new CI workflow has not run until the package is pushed and integrated.
