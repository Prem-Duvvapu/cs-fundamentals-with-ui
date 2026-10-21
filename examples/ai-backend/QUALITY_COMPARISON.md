# Check whether a prompt change actually helps

Start with [the beginner path](../../docs/BACKEND_AI_LEARNING_PATH.md) and
[Project A](README.md). A prompt is an instruction supplied at inference time; changing it is not
training. A longer prompt, more examples or valid JSON does not automatically mean better answers.

This exercise compares the existing ticket-v1 prompt and frozen ticket-examples-v2 on exactly
the same cases and installed model. A deterministic rule runs on those cases too. It supplies a
cheap task-fit reference, not an intelligent summary or a promise that rules handle every ticket.

## 1. Understand what is measured

A ticket might say “Please explain the invoice for ORD-9876.” We score three fields:

| Field | Question | What a passing check cannot establish |
|---|---|---|
| Category | Does the result match billing/delivery/other? | The real customer's intent was labelled correctly |
| Priority | Does explicit urgent/low/normal handling match the label? | A fluent answer understands every ambiguous urgency request |
| Order ID | Does it match the expected source-literal identifier or null? | That the customer owns the order or may receive a refund |

**Exact field match** requires all three to match on the same case. A JSON-schema acceptance rate
answers a different question. A perfectly valid object can contain the wrong category or null
instead of the source ID. The generated summary is structurally checked but its truth is not
scored; no model judge or human answer-support assessment is invented.

A rejected response, HTTP error or deadline remains in the all-case denominator. If eight of ten
attempts return valid JSON but only six match every field, schema acceptance is 80% and exact task
match is 60%, not 75%. The accepted-only 6/8 can be useful, but must not replace 6/10.

## 2. Freeze the decision before reading results

[The frozen protocol](COMPARISON_PROTOCOL.md) records candidate commit 2d1247d and a classroom
90% exact-field target, plus zero unsupported-order-ID rejections. Twenty synthetic examples
cannot establish a population guarantee or a production reliability target.

The candidate adds four examples and explicit definitions. The existing prompt and deterministic
validation remain unchanged; neither variant can bypass source-ID validation or execute actions.
The application still defaults to ticket-v1. A report cannot deploy a prompt or change that default.

The new [20-case set](fixtures/comparison/PROVENANCE.md) was authored in a separate worktree by an
agent that did not inspect the candidate or its output. Root froze the prompt before opening it.
Labels are **AI-authored synthetic labels**, not real customer data or human adjudication.
Once inspected, this set becomes public regression data. Do not tune on it and call another run
a fresh blind evaluation; use a new independent set for that purpose.

## 3. Start with the owned HTTP exercise

From repository root, build before running the verifier:

~~~sh
mvn verify -f examples/ai-backend/pom.xml
python3 -m unittest discover -s examples/ai-backend -p test_comparison.py -v
python3 examples/ai-backend/verify_comparison.py
~~~

The verifier starts an owned loopback fixture, copies the packaged teaching JAR and runs the
normal evaluator for both prompts and the no-model reference. It deliberately gives the candidate
a schema-valid wrong category and injects 429. The expected exact counts are 3/4, 2/4 and 4/4;
the paired regression and failed requests must remain visible. Those scores describe a fixture,
not a model. Exactly eight HTTP calls occur; the rule makes none. Owned children and the HTTP
fixture are stopped.

No expected label is passed to the model. The evaluator reads the expected labels to score a
returned Java value, while ExtractionService receives only the ticket text. Reports retain case
IDs/slices, boolean matches, fixed errors, timings and provenance, never raw tickets or answers.

## 4. Optional installed-model comparison

No download, paid API or browser credential is required. Inspect your existing trusted loopback
daemon, choose a locally stored GGUF model that fits your machine, and set its actual digest and
runtime version. The wrapper independently checks the inventory before inference; it cannot
attest the daemon's implementation or network isolation. Known cloud tags and redirects are rejected.
Inventory executes in an owned worker with a ten-second total execution budget and capped metadata;
process cleanup has a separate bounded allowance. A socket timeout alone is not a phase deadline.

~~~sh
# Export your inspected AI_MODEL, AI_MODEL_DIGEST and AI_RUNTIME_VERSION first.
export AI_ENDPOINT=http://127.0.0.1:11434/api/chat
python3 examples/ai-backend/compare_tickets.py --mode live-local \
  --dataset examples/ai-backend/fixtures/development.jsonl \
  --output /tmp/owned-ticket-development.json
python3 examples/ai-backend/compare_tickets.py --mode live-local \
  --dataset examples/ai-backend/fixtures/comparison/holdout-v2.jsonl \
  --output /tmp/owned-ticket-holdout.json
~~~

The wrapper checks dataset and exact frozen system-prompt hashes, copies the finished JAR and isolates
inherited model/JVM/Spring settings. Input is capped at 50 cases/512 KiB; each model gets exactly
the case-count call budget, with no automatic retry. The two prompt runs use the same model,
JSON mode, temperature 0 and context/output caps. A bounded overall run may finish incomplete;
an incomplete report cannot recommend a candidate. SIGTERM records interruption and stops only the
owned child group. Reported prompt hashes are checked against frozen source, while a JAR hash
records the copied artifact; neither is independent attestation of how that JAR was built.

Sequential full-dataset order is recorded. The first run may include model loading and later
runs may benefit from caches. This is a controlled task-field comparison, not a throughput or
latency superiority benchmark. Temperature 0 does not guarantee identical output on every runtime.

## 5. Read the report before deciding

- Compare each field, exact matches and slices; then inspect paired improved/regressed/both-wrong
  counts. A net improvement can hide a regression on a previously correct case.
- A candidate must meet the predeclared narrow gate and improve over ticket-v1. A tie retains
  the original. The no-model reference is preferred for this sample if it meets the gate and
  performs at least as well as the model variants.
- No acceptable prompt is an allowed result. Do not lower a frozen threshold after seeing poor
  results merely to report success. Investigate model/task fit, schema failures, label ambiguity
  and missing context before paying for a larger system.
- Interrupted runs retain available checkpoint results but cannot pass the decision gate.
- Tokens and cost per accepted result remain null because this nonstreaming adapter does not
  expose metering. This is not evidence of zero cost. [The streaming exercise](STREAMING.md)
  separately teaches provider usage and declared scenario arithmetic.

## 6. Inspect the actual October 21 result

Both runs completed on the already-installed qwen2.5:0.5b model, Ollama 0.32.5, on a four-CPU
WSL instance with about 6.9 GiB RAM. No model was downloaded and no paid provider was called.
The reports record the inspected model digest, frozen prompt hashes and exact dataset hashes.
Each prompt received one attempt per case; the rule made no model call.

| Split | Original exact / schema accepted | Candidate exact / schema accepted | Rule exact / accepted |
|---|---|---|---|
| Public development, 30 cases | 3/30 / 28/30 | 5/30 / 14/30 | 29/30 / 29/30 |
| Independently authored holdout, 20 cases | 2/20 / 20/20 | 8/20 / 17/20 | 6/20 / 16/20 |

Read each cell as two separate counts: for example, 20 schema-accepted answers produced only two
exact field matches. The candidate had sixteen schema failures in development and three in the
holdout. The original had one schema failure and one deadline in development. Rule review cases
remain unfinished tasks, not discarded rows. See the [dated reports and verification notes](evidence/README.md).

On development the candidate improved five cases and regressed three; none stayed correct and
22 stayed wrong. On the holdout it improved seven, regressed one, stayed correct on one and stayed
wrong on eleven. These paired counts preserve the regression hidden by the higher total.

The development decision prefers the rule for that sample. **No approach meets the frozen 90%
target on the new holdout.** The rule's development score did not generalize to these different
synthetic phrasings. The candidate is better on some scored fields but still unsuitable under the
predeclared gate. Neither result changes the application default. Do not infer that rules or
example prompts are generally superior from fifty synthetic tickets and one small model.

**Next investigation:** separate schema failures from accepted-but-wrong fields, inspect the task's
wording and ambiguous labels, then predeclare a new comparison if changing the prompt, model or
rule. Do not tune against this now-public holdout and claim another blind evaluation. Summary
faithfulness still requires a different assessment; successful fields do not establish it.

## 7. Predict, change, debug and explain

**Predict:** candidate exact matches improve but it introduces unsupported source IDs.
Answer: the gate still rejects it. A higher aggregate score does not waive an explicit constraint.

**Change:** replace the prompt while retaining its version string. Answer: the frozen hash check
must reject the run's attribution. Version names alone do not prove which instruction was executed.

**Debug:** every answer is JSON, but the exact score is poor. Inspect per-field results, rejected
cases and source-ID handling before treating parsing success as task success. A wrong accepted
summary remains a separate unmeasured failure even when every scored field matches.

**Interview:** “I froze the task labels and decision rule, compared prompt versions on identical
cases, and retained failures and paired regressions. I kept a no-model reference. A narrow field
gate did not change production automatically or establish summary faithfulness. After inspection,
the test set became regression data, so another selection needed a fresh evaluation.”

The dated evidence files record actual runs and limitations. Human calibration, representative
labels, learned-embedding relevance, full AI stage tracing and broader production acceptance remain
separate requirements. No source or field score is a business authorization boundary.
