# Explain an evaluation failure before changing the model

Prerequisite: [Project A](README.md). The evaluator is a task-quality measurement, not a model judge.
It uses the existing 30 development and 20 held-out original synthetic cases. It never sends them
outside the configured loopback model/fixture endpoint. Do not add real customer data.

## Run and read the evidence

Package first with `mvn verify -f examples/ai-backend/pom.xml`, then follow the fixture/evaluator
commands in the Project A README. `verify_http.py` runs both sets through actual fixture HTTP.
Dataset IDs, slice labels, input size and expected field types are validated before model calls;
invalid data is an evaluation setup error rather than a model-quality failure.

Each report keeps the existing top-level `accepted`, `fieldsCorrect`, `totalMs`, provenance and
atomic checkpoints. New `summary` data records:

- Acceptance and complete-field match rates over **all attempted cases**, including rejected calls.
- Category, priority and order-ID matches separately. Correctness is exact task-field comparison;
  summary factuality is not measured.
- Accepted-only field rates alongside all-case rates. They answer different questions: a provider
  failing half the requests must not receive a perfect overall success rate from its remaining half.
- Separate counts/rates for each authored slice and classified provider/validation errors.
- Observed p50/p95 milliseconds using nearest rank, including failures. With only 20 cases the p95
  is the 19th sorted observation, not a reliable population tail estimate. Do not add stage p95s.

No raw prompt or generated answer is written into the report. Usage, provider cost, human factuality
and confidence intervals are not invented. Null means a rate or quantile is undefined, not zero.
Earlier saved reports without per-field data cannot be backfilled from an all-fields-match boolean.

## Predict, change, debug

**Predict:** one schema-valid result has the correct category but the wrong priority and ID. A
second request times out. Acceptance is 1/2; complete-field success is 0/2; category correctness is
1/2 over all cases and 1/1 over accepted cases. The other field rates are zero over either denominator.
A failure-only slice has undefined accepted-only field rates.

**Change:** replace the timeout with a correct response in a controlled fixture. All-case success
rises to 1/2; schema acceptance rises to 2/2. Keep the same dataset, prompt/model versions and scope
when comparing reports. A passing fixture confirms the evaluator plumbing, not a capable language model.

**Debug:** if IDs match but priorities fail, inspect the task's priority definition and the affected
slice. If all fields disappear, inspect truncation/schema/provider errors first. If one slice is
small, do not hide its count behind an overall average. Make a hypothesis and test a single change
on development cases; preserve a genuinely untouched evaluation set for later claims.

The recorded October 16 local model accepted 20 schemas but had zero complete-field matches. That
is a failed task-quality result. It does not prove that every individual field was wrong; the old
report did not retain that breakdown. Do not silently relabel it or tune repeatedly on held-out data.

## Interview explanation

“I measure transport/schema availability separately from task correctness, include failed requests
in end-to-end success, and break errors down by field and case type. I record versions and observed
latencies, compare on controlled data, and retain the limits of a small synthetic sample. A valid
JSON object or a plausible citation does not establish a correct answer.”

The eight evaluator tests cover valid data, malformed expectations/duplicate identities, undefined
rates, failure denominators, semantic-versus-schema success and observed quantiles. They complement
the actual HTTP smoke and the separately recorded live-model experiment.
