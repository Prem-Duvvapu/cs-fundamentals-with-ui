# Stream one answer without losing control of the request

Start with [Project A](README.md) and [the beginner path](../../docs/BACKEND_AI_LEARNING_PATH.md).
You need Java 17, Maven and Python 3. The first exercise uses an owned HTTP fixture; it does not
need a model, an account, a download or a paid service. Streaming is optional and does not change
the authenticated ticket-extraction API or replace its field validation.

## 1. Understand the difference

A nonstreaming request returns one complete response. A streaming response sends pieces while
work is still running. Imagine a colleague writing an answer on a shared document: you can read
the beginning sooner, but the first sentence does not prove the answer will finish or be correct.

The native Ollama endpoint sends **NDJSON**, one JSON object per newline. It is not SSE. An HTTP
read is not a frame: one read may contain half a character, half an object, or several objects.
The client accumulates bounded bytes to the newline, decodes strict UTF-8, parses one object, then
appends only `message.content`. It never executes tools or exposes `message.thinking` as content.

The final object has `done: true`. That is where the documented usage fields may appear. A closed
connection without this marker is incomplete, even if the partial answer sounds convincing.

| Observation | Meaning | What it does not prove |
|---|---|---|
| HTTP headers received | A server started responding | An answer token arrived |
| Nonempty content frame parsed | Some visible answer text arrived | It is one tokenizer token |
| `done: true`, normal stop, nonblank answer | Transport completed | The answer is useful, safe or true |
| `done_reason: length` | Generation reached a boundary | The partial answer is ready for use |
| Connection closes without `done` | Final status/usage may be missing | Usage was zero |
| Explicit cancel returns | This client stopped consuming | The server/GPU stopped immediately |

## 2. Run the actual HTTP contract exercise

From repository root:

```bash
mvn verify -f examples/ai-backend/pom.xml
python3 examples/ai-backend/verify_streaming.py
```

The verifier copies the finished teaching JAR, starts an owned loopback HTTP fixture and invokes
its normal `java -jar ... --stream-check` dispatch four times. Do not package while it runs.
It checks complete/known-usage, complete/unknown-usage, missing-final-frame and HTTP-429 cases.
There is exactly one HTTP call per case, with no retries. Reports contain counters/status/timings,
never prompts, answer text or raw provider errors. Owned children, sockets and temporary files
are cleaned up. `--artifacts <directory>` retains the sanitized reports for inspection.

The Java tests add actual partial writes split inside UTF-8 characters, delayed headers, body
stalls, explicit cancellation, call/concurrency limits, oversized frames/bodies/content, excess
frames, malformed JSON, invalid usage, redirects and provider errors. Latches control partial
writes; timing guesses do not determine when a test cancels.

Read [the dated fixture evidence](evidence/streaming-fixture-2026-10-18/streaming-summary.json)
for the packaged execution; a fixture proves transport behavior, not model quality.

## 3. Read a partial result, then cancel deliberately

`StreamingOllamaClient` owns a bounded lifetime call budget and a semaphore. Rejected capacity
has no unbounded waiting queue. Use try-with-resources to cancel active handles and stop the
owned deadline scheduler. A Java 17 `HttpClient` has no `close()` API; its shared transport is
retained for the lifetime of this client. Do not construct a new client per output fragment.

```java
try (var client = new StreamingOllamaClient(
        URI.create("http://127.0.0.1:11434/api/chat"),
        "your-installed-local-model", StreamingOllamaClient.Limits.defaults())) {
    var handle = client.start("Explain a database index in two sentences.");
    var partial = handle.snapshot(); // A polling snapshot may still contain no content.
    // A UI's Stop action calls handle.cancel(), rather than retrying the request.
    var result = handle.await(Duration.ofSeconds(8));
    if (!result.transportComplete()) {
        // Preserve the typed failure/incomplete/cancelled state; do not accept partial output.
    }
}
```

`future()` is a read-only `Future`; use `handle.cancel()` for a typed `CANCELLED` result. Caller
callbacks never run on the deadline/I/O threads because this API exposes snapshots and a terminal
result rather than arbitrary callback registration. `await` has a caller wait bound; reaching
that bound is not itself a cancel operation. The separate request deadline still terminates the
handle. A displayed answer should retain an “in progress” state until terminal acceptance checks.

The deadline starts before the HTTP call, including connection, headers and body consumption.
Cancellation/deadline freezes partial content and releases local admission. A remote inference
may continue; these limits are **local client limits**, not a global provider capacity guarantee.
Use the [runtime cancellation exercise](../java-runtime/README.md) to observe that distinction.

## 4. Diagnose termination before changing the prompt

| Result | First investigation | Action |
|---|---|---|
| `FAILED / RATE_LIMITED` | HTTP 429 and reserved-call count | Respect capacity; this command never retries |
| `INCOMPLETE / DEADLINE` | Header versus first-content observation | Inspect queue/loading/generation; don't increase all budgets blindly |
| `INCOMPLETE / NONE` | Final marker and finish reason | Treat EOF/truncation as unfinished |
| `CANCELLED / CANCELLED` | Caller stop action | Keep partial output labelled incomplete |
| `FAILED / USAGE_METADATA` | Final numeric metadata types/ranges | Repair the provider contract; don't invent counts |
| `FAILED / PROTOCOL` | Message role/tools/done type | Reject unexpected schema or tool proposals |
| `FAILED / CAPACITY` | Current admitted requests | Shed local load rather than queue forever |
| `FAILED / CALL_BUDGET` | Client lifetime reserved calls | End the bounded exercise |

Ollama does not document a standardized refusal field for this native endpoint. The strings
`refusal` and `content_filter` are explicitly labelled **extension finish reasons** in the tests;
they are not a claim that native Ollama always emits them. “I cannot help” with a normal stop is
transport-complete text; a separate application policy/reviewer can still reject it. Unknown
finish reasons remain incomplete. No text classifier claims to identify all refusals.

Content/body/frame/request/count/time caps are in `StreamingOllamaClient.Limits`. Invalid inputs
fail before HTTP. Redirects are disabled; remote URLs, endpoint queries and known `:cloud` and
`-cloud` tags are rejected. A loopback address or model name alone cannot prove local execution:
a custom daemon/alias can proxy elsewhere. Use a trusted local daemon with cloud features disabled
for private data; the optional command below uses synthetic text. There are no credentials,
model downloads, tools, paid-provider adapters or implicit model choices in this exercise.

## 5. Keep measurements in the right units

- `firstNonemptyContentMs`: client time until the first parsed nonempty `message.content`.
  Headers and empty/thinking-only frames do not count. This is a content-frame measurement,
  not an exact tokenizer first-token timestamp and not a queue-only measurement.
- `totalMs`: client time until the terminal result, including failures and cancellation.
- `providerTimingNanoseconds`: optional total/load/prompt-evaluation/generation durations copied
  from a valid final frame. Nanoseconds are not milliseconds; divide by 1,000,000 for display.
  Provider timings and client timings have different scopes and must not be subtracted to invent
  a precise network/queue breakdown. Missing values remain null; reported zero stays zero.
- `inputTokens`, `cachedInputTokens`, `outputTokens`: optional provider-reported integers from the
  final frame. Cached input is part of input, not extra tokens to add again. This exercise doesn't
  infer token counts from character counts or discover a hosted provider's billing rules.

Usage metadata is validated together before publication. Malformed numeric values cannot leave
half-published counters. A cancelled or broken stream usually has unknown usage; the provider may
still have performed work. No usage record is not evidence of a free request.

## 6. Calculate cost per accepted result

`StreamingOllamaCosts` uses caller-supplied **dated scenario assumptions**, not current prices.
The tests use invented USD2/input-million and USD8/output-million uniform rates, no cached-token
discount and no hosting costs. These numbers are classroom arithmetic and are not Ollama prices.
Local inference also consumes hardware, electricity and operations time; a hosted-token scenario
does not measure those costs. No automatic acceptance or quality score is implied.

For known usage:

`scenario cost = input tokens × input rate / 1,000,000 + output tokens × output rate / 1,000,000`

`cost per accepted result = cost of ALL attempted results / count accepted after separate review`

Example: an accepted call uses 1,000 input/500 output tokens, and an incomplete rejected call uses
2,000 input/250 output tokens. Total scenario cost is USD0.012. There is one accepted result, so
cost per accepted result is USD0.012, **not USD0.006**. Failed work remains in the numerator.
If any attempted call has unknown usage, the report retains the known subtotal but leaves total
and cost per accepted result null. Zero accepted results also makes cost per accepted result
undefined. This conservative arithmetic does not turn missing failure usage into zero.

Run the four arithmetic tests alone:

```bash
mvn test -f examples/ai-backend/pom.xml -Dtest=StreamingOllamaCostsTests
```

The API requires `Prices(inputPerMillion, outputPerMillion, currency, asOf, assumption)` and
`Reviewed(result, accepted)` for each attempt. An incomplete/refused/failed transport cannot be
accepted. A complete transport can be rejected. Cached tokens are not separately discounted;
choose and document a richer billing model before comparing vendors with different cache rates.
Small fixture arithmetic is not a cost/quality benchmark or evidence of production savings.

## 7. Optional one-call local observation

Inspect your installed model inventory and runtime first (`/api/tags`, `/api/version`), verify the
chosen model is locally stored, and do not download a model just to complete this exercise.
`AI_MODEL_DIGEST` and `AI_RUNTIME_VERSION` record what **you** verified; the command itself does not
independently query/discover them. Set them to the actual digest/version, not a guessed example.
No command should print private prompts to logs; CLI arguments can be visible in process listings
and shell history, so use only the synthetic exercise text here.

```bash
# Export AI_MODEL_DIGEST and AI_RUNTIME_VERSION from your inspected local inventory.
java -jar examples/ai-backend/target/ai-backend-example-0.0.1-SNAPSHOT.jar \
  --stream-check http://127.0.0.1:11434/api/chat your-installed-local-model \
  'Explain an index in one short sentence.' /tmp/owned-stream-observation.json live-local
```

This reserves one call, allows at most 30 seconds, limits requested generation/context, and
atomically writes a bounded sanitized report. `AI_STREAM_DEADLINE_MS` can choose 100–30,000ms.
Timeout/failure writes a typed report and exits nonzero. It does not report answer quality,
price or acceptance. Never compare one warm/cold observation as if it were a throughput benchmark.

A [dated actual observation](evidence/streaming-local-2026-10-18.json) completed one call on
already-installed `qwen2.5:0.5b` with Ollama0.32.5: first nonempty content2,382ms, total2,643ms,
36 reported input tokens and10 output tokens. [Independent inventory notes](evidence/streaming-local-provenance-2026-10-18.json)
record the GGUF artifact/digest and zero downloads. Cached input was absent and remains null.
This is one synthetic-text transport observation, with acceptance explicitly not evaluated;
it is not an answer-quality, throughput, cache or hosted-price benchmark.

## 8. Predict, change, debug and explain

**Predict:** a server emits “Index…” and then closes without `done`. Answer: preserve the text
for inspection but mark it incomplete; usage is unknown, and automatic downstream action is forbidden.

**Change:** decrease `contentChars` below the emitted response. Answer: the client stops with
`CONTENT_LIMIT`; it does not silently truncate and label the answer complete.

**Debug:** the stream is fast but cost per accepted answer is unknown. Answer: inspect missing
final usage on failed attempts and the acceptance denominator before changing model settings.
Reporting only successful metered calls understates cost.

**Interview:** “I parse bounded NDJSON independently of network chunk boundaries, measure the
first parsed visible content separately from completion, and preserve cancellation, truncation
and provider failures. Completion still needs semantic review. Usage may be absent on failure,
so I never turn missing counters into zero or report success-only cost per accepted result.”

Primary references, checked October18,2026: [native chat fields](https://docs.ollama.com/api/chat),
[stream framing](https://docs.ollama.com/api/streaming), [usage and timing units](https://docs.ollama.com/api/usage),
[cloud execution and disabling cloud features](https://docs.ollama.com/cloud).
