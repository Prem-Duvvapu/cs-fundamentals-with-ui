# Choose the smallest approach that meets the requirement

A model is one possible implementation, not the starting requirement. First write the decision,
what a wrong answer would cost, what evidence is available and who can correct a mistake. Then
compare a simple baseline before adding model calls or training.

This exercise assumes no AI background. **Prompting** changes instructions/data for one request.
**Retrieval** supplies current permitted documents. **Fine-tuning** changes model parameters using
training examples. A **classical model** learns a narrow prediction from labelled features.
A deterministic rule runs explicit code without learning. These approaches can be combined.

## 1. Measure a no-model ticket baseline

The task here is narrow: classify known billing/delivery words, detect explicit urgency, and extract
one literal order ID. `TicketRuleBaseline.java` uses those documented words, not the expected labels.
It requests review for mixed categories/priorities, multiple distinct order IDs and selected
negation/instruction words. Its summary is a clipped source excerpt, not an intelligent summary.
It makes no provider request and performs no business mutation.

After packaging, from the repository root:

```sh
mvn -f examples/ai-backend/pom.xml verify
java -jar examples/ai-backend/target/ai-backend-example-0.0.1-SNAPSHOT.jar --evaluate-rules examples/ai-backend/fixtures/development.jsonl /tmp/rule-development.json
java -jar examples/ai-backend/target/ai-backend-example-0.0.1-SNAPSHOT.jar --evaluate-rules examples/ai-backend/fixtures/held-out.jsonl /tmp/rule-held-out.json
python3 examples/ai-backend/verify_rules.py
```

Actual [development](evidence/2026-10-18-rule-development.json) and
[held-out](evidence/2026-10-18-rule-held-out.json) reports record:

| Run | Cases | Accepted | All required fields match | Review/rejected cases |
|---|---:|---:|---:|---:|
| Rule development | 30 | 29 | 29/30 | 1 |
| Rule public held-out | 20 | 17 | 17/20 | 3 |
| Historical local model held-out | 20 | 20 | 0/20 | 0 |

The historical model/prompt accepted valid schemas but failed complete field matches. These are
original synthetic public cases, not a representative customer population. The rule's accepted-only
field rate is 100% on this sample, but its all-case rate is 85% on the20-case split. Never silently
discard review cases to make a solution look perfect. Review routing adds human cost and delay;
rejecting an ambiguous input is not automatic task completion.

The historical report's raw dataset hash is for LF bytes; this checkout's report uses CRLF bytes.
The new `datasetLfSha256` equals the historical raw hash
`b313c6f19846ec733d917b6da90ec5a85968f211d832f2bc605bae8f04cb2084`, and the original merged
JSONL has the same LF hash. Only line endings differ. Both raw and LF-normalized hashes are kept;
normalizing line endings is not permission to compare different questions or labels. The historical
report lacks per-field diagnostics, so do not reconstruct its missing individual scores.

This public held-out set has already been inspected. The comparison is regression/task-fit evidence,
not a fresh blind experiment. Freeze a candidate on development data, then author and label a new
hold-out before making a stronger quality claim. Hardware, dates and methods also differ, so these
latencies are not a controlled performance comparison. Zero provider requests does not mean zero
maintenance, infrastructure or human-review cost.

**Counterexample:** “My parcel is late” becomes `other` because these rules do not recognise those
words. That answer can be accepted and wrong. More synonyms may help this one case, but rules grow
harder to maintain as ambiguity/languages change. A better model is only a candidate improvement;
measure it on relevant data instead of assuming that fluent text solves the task.

## 2. Record a decision for a changing policy

**Requirement:** answer refund questions using the current tenant-specific policy. Policies change
weekly, and another tenant's documents must never be supplied to the model.

**Decision:** begin with an authorised document lookup or lexical RAG, then measure whether denser
retrieval improves the miss cases. Keep document versions and permissions in application code.
Do not fine-tune a model every week merely to remember the current policy. Training cannot enforce
live revocation or replace an authorised source lookup.

**Evidence to demand:** allowed-source recall, answer support, version/deletion/ACL tests, abstention
on missing evidence and a comparison on the same queries. [RAG evaluation](RAG_EVALUATION.md)
separates those questions. A vector nearest neighbour or a valid citation alone is insufficient.

**Change the requirement:** if the authorised database can return a precise structured policy
without generating text, a template may be simpler. If questions involve long ambiguous passages,
retrieval plus a model may earn its extra complexity after evaluation.

## 3. Record a decision for a repeatable prediction

**Requirement:** predict whether a support ticket is likely to need escalation using information
available at arrival, such as days late and previous contacts.

**Decision:** compare a constant/rule baseline with a small classifier before considering an LLM.
The [training lab](../labs/aiml/train.py) actually fits preprocessing and a logistic model on training
rows, selects a threshold on validation and reports held-out results. Do not include the later
refund outcome as an input feature; it leaks the future answer.

**Evidence to demand:** label provenance, entity/time leakage review, precision/recall at the chosen
threshold, error costs and calibration checks. A probability is a score that may need calibration;
it never authorises a refund. Drift in inputs is a warning, not proof that prediction quality fell.

**Change the requirement:** without enough reliable labels, a model may not be warranted. If the
important signal exists only in free-form text, compare a text representation or reviewed model
candidate with the existing narrow baseline; keep the same evaluation and permission boundary.

## 4. When fine-tuning could earn its cost

Consider repeated, stable domain-specific output behaviour that a suitable base model can almost
perform, but prompting/examples do not meet a measured requirement. Before training, establish:

1. Rights and permission to use the data; remove secrets/private records and define retention.
2. A frozen prompt/retrieval baseline, task labels, failure slices and a separate evaluation set.
3. Enough representative examples and a clear target; inconsistent labels teach inconsistency.
4. Versioned data/model artifacts, a rollback path, regression/privacy checks and serving capacity.
5. A measured gain that justifies data preparation, training, serving and maintenance costs.

Parameter-efficient approaches such as adapters/LoRA update a smaller set of trainable parameters;
they still require data quality, rights and evaluation. They do not make memorised private data
safe, supply current facts automatically, eliminate hallucinations or grant business permissions.
No fine-tuning run or model-quality improvement is claimed in this exercise.

**Counterexample:** a deterministic response template already meets the format requirement. Training
a model to reproduce it adds a failure surface without a demonstrated benefit. Similarly, increasing
context or changing sampling is not a substitute for fixing a forbidden-source filter.

## 5. Explain your choice in an interview

Use **requirement → baseline → measured error → chosen change → remaining limit**:

> “For literal ticket fields I tested a rule before a model. It completed17/20 public cases and
> sent three for review; I also found a valid but wrong synonym example. For changing private
> policies I would use an authorised source lookup/RAG and measure retrieval separately. I would
> consider fine-tuning for stable behavioural errors only after a suitable baseline, rights review
> and a fresh evaluation. None of these methods is the business authorisation boundary.”

Now choose an approach for multilingual tickets, weekly policy updates and exact invoice arithmetic.
State what evidence would change each choice. Keep calculations and permissions deterministic where
possible. The exercise's written decisions and actual baseline runs are complete; independent
annotator/learner review, a new blind hold-out and a successful live-model comparison remain open.
