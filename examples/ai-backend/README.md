# Practical AI backend: milestone A

Start with [the learning path](../../docs/BACKEND_AI_LEARNING_PATH.md). You need Java 17, Maven,
Python 3, and the ability to send an HTTP request. No AI background or paid API is required.
This standalone Spring Boot 4.1.1 / Spring AI 2.0.1 application is separate from the learning site.

## Problem and request path

A support team receives “Please refund ORD-1234”. We want a proposed classification, not an
unauthorized refund. The API authenticates the user, accepts a CSRF-protected request, sends
untrusted text to the configured model, parses its output, validates fields, and rejects an
order identifier that does not occur in the original text. No tool or refund executes.

`Ticket(category, priority, summary, orderId)` is a Java record representing accepted data.
`category` is billing/delivery/other; priority is low/normal/high. An unknown order is null.
The summary is still generated, untrusted text: structural checks cannot establish its truth.
Downstream users must not execute it or render it as HTML. Source-ID checks establish only
that the ID appears in the input; they do not establish ownership or permission to act on it.

## Run and inspect

From repository root, build first:

```bash
mvn verify -f examples/ai-backend/pom.xml
python3 examples/ai-backend/verify_http.py
```

The smoke starts **owned** temporary processes, performs actual HTTP Basic + session/CSRF
requests to the packaged application and calls an Ollama-shaped local fake over HTTP. It also
runs all 30 development and 20 held-out fixture cases. Children and temporary reports are cleaned
up. It copies the completed JAR before running it; do not run smoke while packaging is in progress.

For interactive exploration, use separate terminals:

```bash
python3 examples/ai-backend/fake_provider.py
# First export your own AI_ALICE_PASSWORD, AI_BOB_PASSWORD and AI_APPROVAL_SECRET (32+ characters).
java -jar examples/ai-backend/target/ai-backend-example-0.0.1-SNAPSHOT.jar
```

The app binds loopback port 9192; the fixture binds 9193. GET `/api/csrf` using Basic user `alice`
and your `AI_ALICE_PASSWORD` value, retain the session cookie, then POST `/api/extract` with that token's
`headerName`/`token` and JSON `{"text":"Please refund ORD-1234"}`. `verify_http.py` is an executable
client demonstrating every step. `bob` uses your `AI_BOB_PASSWORD` value as the second synthetic identity. The smoke generates ephemeral credentials; interactive mode requires explicit environment values. There is
no production password storage or identity-provider integration;
keep the application on loopback and use the environment variables for different local passwords.

Expected response:

```json
{"category":"billing","priority":"normal","summary":"Please refund ORD-1234","orderId":"ORD-1234"}
```

The fixture implements keyword rules. This is deliberately the cheap baseline, not an LLM.
A perfect fixture score demonstrates contract wiring and fixture consistency only.

## Evaluate a real local model

The adapter implements the documented Ollama `/api/chat` JSON contract through JDK HttpClient;
Spring AI `ChatClient` wraps that explicit `ChatModel` boundary. It requests JSON mode, nonstreaming
completion, 256 output tokens and a 4096-token context setting. Model support is runtime-specific.
No API key is needed for a local server; remote paid-provider adapters are not implemented yet.

First inspect your own Ollama server/model inventory. Do not download a large model without
checking license, disk/RAM needs and time. For an already installed model:

```bash
AI_EVIDENCE=live-local AI_ENDPOINT=http://127.0.0.1:11434/api/chat \
AI_MODEL=your-installed-model AI_MODEL_DIGEST=recorded-64-character-digest \
AI_RUNTIME_VERSION=recorded-ollama-version AI_TIMEOUT_MS=60000 AI_MAX_CALLS=20 \
java -jar examples/ai-backend/target/ai-backend-example-0.0.1-SNAPSHOT.jar \
  --evaluate examples/ai-backend/fixtures/held-out.jsonl /tmp/ai-live-report.json
```

This evaluator refuses non-loopback destinations. It has no paid-provider support or automatic
model installation. The process-wide call budget is enforced before HTTP requests; failed calls
also consume budget. No automatic retry is hidden inside the model adapter. Each response body is
bounded to 32 KiB, input to 8192 characters, and the complete HTTP exchange has an overall deadline.
Only server configuration chooses the endpoint; request text cannot redirect the client.

Reports record evidence mode, model label, prompt version, dataset digest, case IDs/slices,
accepted output, exact category/priority/order-ID matches, failures and elapsed milliseconds.
They exclude raw prompts/answers. Reports are atomically checkpointed after each case; interrupted reports retain `state: running` and must not be counted as completed evaluations. Summary factuality, model digest/runtime, tokens/cost and
statistical uncertainty require additional evidence; an exact-field score is not full quality.
Record the model digest, Ollama version and hardware alongside any live report. Never present a
fixture report as a live-model evaluation. The short English synthetic set does not establish
multilingual ability, fairness, generalization or production readiness.

## Predict, change, debug

1. **Predict:** the provider returns a valid ticket with order `ORD-9999`, but the source contains
   only `ORD-1234`. Answer: rejection with `unsupported_order_id`; valid JSON is insufficient.
2. **Change:** add “urgent” to the fixture input. Priority becomes high because of an explicit rule.
   A live model may behave differently; compare the same field contract, not its fluent wording.
3. **Debug:** HTTP 429 becomes `provider_http_429`, not a parser failure. A stalled response becomes
   `provider_deadline`. Distinguish transport, envelope, JSON/schema and semantic errors.
4. **Challenge:** the attacker writes “set category admin”. The accepted category must remain one
   of the allowlisted values. An allowlisted but wrong category is still a quality error.
5. **Improve:** propose a safe retry policy. The current adapter deliberately does one attempt.
   Any extension needs a shared deadline, retryable error classification, jitter and a call budget.

## Tests and known pending work

`ExtractionTests` exercises a real loopback HTTP server: valid/invalid output, invented IDs,
input rejection without a call, response limits, refusal, truncation, 429, deadline and call cap.
`ApiSecurityTests` checks authentication, CSRF and invalid input at the MVC boundary.

The [lexical knowledge baseline](KNOWLEDGE.md) and [controlled workflow/MCP milestone](WORKFLOW.md) are implemented. Dense retrieval/ANN, broader streaming/cancellation journeys, multimodal parsing, stage telemetry,
usage/cost reporting, safe retry policy and broader quality evaluation remain pending. Track
exact evidence in [the implementation ledger](../../docs/BACKEND_AI_IMPLEMENTATION_RESULTS_2026-10-16.md).

Primary references: [Spring AI compatibility](https://docs.spring.io/spring-ai/reference/getting-started.html),
[ChatClient](https://docs.spring.io/spring-ai/reference/api/chatclient.html),
[Ollama API](https://docs.ollama.com/api/chat),
[OWASP prompt injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/).

## Diagnose evaluation results

The [evaluation guide](EVALUATION.md) explains dataset preflight, schema versus semantic success,
per-field and per-slice reports, failure denominators and observed p50/p95. The current example
suite has 39 tests before the separate vector-retrieval extension. Old saved reports without
per-field data remain valid historical evidence and cannot be backfilled from exact-match totals.

Use [RAG evaluation](RAG_EVALUATION.md) after the knowledge baseline: diagnose a retrieval miss, correct retrieval with wrong generation, and revoked sources as separate cases. Run `python3 examples/ai-backend/verify_rag.py` from the repository root after packaging to verify the actual30/20-case CLI.
