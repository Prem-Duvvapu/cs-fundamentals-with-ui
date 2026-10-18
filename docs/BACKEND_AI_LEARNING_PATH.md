# From backend fundamentals to practical AI

This path assumes variables, functions and basic programming, with **no AI/ML knowledge**.
Start with the small examples before advanced internals. The seven existing AI topics remain the
concept owners; the practical projects are linked milestones, not a second curriculum registry.
The [roadmap](../BACKEND_AI_PRACTICAL_LEARNING_PLAN_2026-10-16.md) and
[delivery ledger](BACKEND_AI_IMPLEMENTATION_RESULTS_2026-10-16.md) distinguish delivered work from planned work.

## 1. Learn the vocabulary through a support ticket

A ticket says “My parcel is late”. A **rule** checks known words. A **classifier** learns patterns
from labelled examples. A **generative model** produces new text, such as a draft explanation.
Choose the rule when it meets the requirement; adding a model adds uncertainty and operations.

| Term | Concrete meaning | Common confusion |
|---|---|---|
| Feature | Input available at decision time, e.g. days late | A future refund outcome is not available now |
| Label | Outcome used to learn, e.g. whether escalation was needed | A label can contain human error |
| Training | Adjust parameters using examples | Sending a prompt is not training |
| Inference | Apply fixed parameters to a new input | A prediction is not a business authorization |
| Validation set | Choose settings and thresholds | Repeatedly inspecting the test set leaks information |
| Held-out test | Estimate performance after choosing the design | A small test does not certify production quality |
| Probability | A model score that may need calibration | A confident-looking answer is not a calibrated score |
| Token | A unit the model reads/generates | Tokens are not always words |
| Embedding | A numeric representation of an input | Similar vectors do not establish factual truth |
| Context | Instructions and data supplied for one request | More context is not always better evidence |
| Tool | An application function the model may propose calling | Proposal is not permission to execute |

Read [ML fundamentals](../content/aiml/07-ml-fundamentals.md) before the math-heavy Expert tier.
Calculate precision with a small example: 8 correct escalations out of 10 proposed gives 8/10=80%.
Recall asks a different question: of all tickets that needed escalation, how many did we find?

## 2. Actually train a small model

Run from repository root:

```bash
python3 examples/labs/aiml/train.py
python3 -m unittest discover -s examples/labs -p test_training.py -v
```

The lab creates 160 independent synthetic records with days late, previous contacts and an
escalation label. Missing input values are imputed with means fitted **only on 100 training rows**.
Standardization expresses how far a value is from that training mean. It is useful because the
optimizer otherwise sees inputs on different scales. A weight combines each standardized feature
into a score; the logistic function maps it to 0–1.

Training repeatedly computes prediction errors and adjusts three weights (including an intercept).
The output reports loss before/after optimization, not invented predictions. Thirty validation
records select one of three thresholds once; thirty held-out records are scored afterward.
The dataset digest and seed make the run reproducible. The Brier score measures squared probability
error; a single score on thirty synthetic cases does not prove real-world calibration.

**Predict:** decrease the threshold from 0.8 to 0.2. More records become positive, increasing both
true positives and false positives. **Change:** insert a huge value only in held-out data.
Training means must stay the same. **Debug:** fitting means/scales before splitting lets future
information influence training; fit on training rows and reuse the saved transform at inference.

**Interview explanation:** “I split first, fit preprocessing and weights on training data, select
settings on validation, then evaluate once on held-out data. I compare with a simple baseline and
report what the dataset does not represent.”

## 3. Understand what an LLM changes

Continue with [tokens and generation](../content/aiml/04-llm-parameters.md). A model converts text to
IDs, combines contextual representations and estimates the next-token distribution. Attention
lets positions exchange information; it does not make retrieved instructions trustworthy.
Pretraining learns broad statistical patterns; instruction/preference tuning changes behavior.
Neither supplies the current private order status or grants permission to issue a refund.

Prompts and examples steer the current request; retrieval adds current evidence; fine-tuning changes
parameters. Choose between them using measured errors. Never train a model merely to look up today's
status when an authorized database query already answers the question.

## 4. Build the first Java AI boundary

Use [Project A](../examples/ai-backend/README.md) to trace authentication → input → model HTTP call →
output parsing → field validation. Start with its deterministic fixture, then an opt-in real local
model. Read [model serving](../content/aiml/03-model-serving.md) for deadline and performance context.

Observe that valid JSON containing an invented order ID fails semantic validation. An accepted
summary can still be wrong. Record field quality separately from availability and latency.
Never execute generated text or grant access based on a model's suggested identity.

## 5. Retrieve knowledge and control actions

The [lexical RAG baseline](../examples/ai-backend/KNOWLEDGE.md) and [controlled-action/MCP baseline](../examples/ai-backend/WORKFLOW.md) are runnable. The [optional real-pgvector milestone](../examples/ai-backend/VECTOR_RETRIEVAL.md) is available too; further semantic-quality and operations work remains in the roadmap:

1. [Embeddings](../content/aiml/01-embeddings-vector-db.md): exact similarity first, then approximation
   and relevance. A nearest neighbor need not answer the user's question.
2. [RAG](../content/aiml/02-rag-architecture.md): retrieve permitted sources, assemble a bounded context,
   generate an answer, verify source references and abstain when evidence is absent. Include document
   deletion, permissions changing and embedding-model migration in the design.
3. [Tools/agents](../content/aiml/04-llm-parameters.md): deterministic workflow before an agent; schemas,
   principal/tenant checks, exact-action approval, idempotency and a stop condition. MCP defines an
   integration protocol, while business permissions belong to the application.
4. [Feature lifecycle](../content/aiml/05-feature-stores.md) and
   [recommendations](../content/aiml/06-recommendation-systems.md): learn freshness, leakage and ranking
   after the first AI application is understandable.

## 6. Practice a useful debugging explanation

Start each investigation with the symptom, one observation and competing hypotheses. “The model is
bad” is too broad. An empty result could come from missing ingestion, a wrong tenant filter, a stale
index or a query that does not match the data. Inspect each stage before changing prompts.

| Observation | Next evidence | Avoid |
|---|---|---|
| HTTP 429 | Attempt count, provider limit and remaining deadline | Unbounded immediate retries |
| Valid JSON, wrong order | Source IDs and semantic validation | Trusting a schema as proof of truth |
| Slow response | Queue, retrieval, model and tool timings | Blaming the model from total latency alone |
| Duplicate mutation | Idempotency record and committed outcome | Blind retry after a timeout |
| Wrong citation | Retrieved allowed IDs and cited spans | Treating a plausible link as evidence |

Keep answers in the form **direct answer → mechanism → example → limit → follow-up**. Compare against
an authored rubric, then explain the scenario again without reading it. Self-rating is practice
feedback; it is not automatic interview certification.

## 7. Learning checks

Before moving on, be able to explain training versus inference, calculate a confusion-matrix metric,
run the small model, run Project A, trigger its validation failures and distinguish fixture results
from a real-model report. Later milestones add RAG, tools, multimodal inputs and incident diagnosis.
No participant comprehension sessions have been performed for this path yet.

## 8. Trace recommendation choices and backend failures

Run the [recommendation exercise](../examples/labs/aiml/RECOMMENDATIONS.md): predict which
candidate never reaches the ranker, change the retrieval cutoff, then diagnose stale eligibility.
The vectors/scores are authored fixtures, so the measured ranking arithmetic is not trained-model
or user-outcome evidence. Explain candidate recall before discussing ranking improvements.

Use the [JVM/PostgreSQL incident guide](../examples/labs/backend/README.md) to collect actual
thread/histogram/query-plan/blocker evidence. Start with one symptom and two hypotheses; observe,
change one thing and rerun. Read [evaluation diagnostics](../examples/ai-backend/EVALUATION.md)
before attributing every schema-valid wrong answer to a provider. These exercises extend the
learning path; real learner sessions and remaining production/AI milestones are still open.

Run the [30/20-case RAG evaluation](../examples/ai-backend/RAG_EVALUATION.md) after building ProjectB. Predict a retrieval miss, then compare it with correct retrieval plus a wrong answer. A relevant citation is not proof of answer support. The copy fixture has known failing slices; use the report to choose the next investigation instead of treating valid JSON as correctness.

For backend incident practice, run [N+1/pool/migration/restore](../examples/backend-persistence/README.md) after the JDBC/SQL baseline, then [saga recovery](../examples/backend-messaging/README.md#8-persisted-saga-reconcile-separate-local-commits). Use the [engineering workflow](../examples/engineering-workflow/README.md) to practice finding and explaining a regression before applying an AI-suggested patch. Verify the business contract and final diff; a generated explanation is not execution evidence.

Before adapting a model, use the [measured rule baseline and decision records](../examples/ai-backend/ADAPTATION_DECISIONS.md). Predict the limits of a keyword rule and distinguish current private facts from stable output behaviour. Use the explicit review count rather than accepted-only accuracy when explaining the choice.

Use the [50-case controlled-workflow evaluator](../examples/ai-backend/WORKFLOW_EVALUATION.md) to distinguish successful work from an expected refusal and a policy violation. Trace [real OAuth/PKCE](../examples/backend-identity/README.md) before trusting a token, then diagnose [actual Kubernetes readiness and rollback](../examples/backend-operations/README.md) using the declared owned-cluster prerequisites.
