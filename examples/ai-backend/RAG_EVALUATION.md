# Diagnose retrieval and answer failures separately

A knowledge assistant has two opportunities to fail: it may retrieve the wrong material, or it may
use correct material to produce a wrong answer. One overall “accuracy” number hides that difference.
This exercise runs the actual tenant-filtered lexical retrieval and `KnowledgeService` validation
against **30 development cases and 20 held-out query cases**. It does not download or call a model
in the default fixture mode.

## Run and inspect

From the repository root, build first:

```sh
mvn -f examples/ai-backend/pom.xml verify
java -jar examples/ai-backend/target/ai-backend-example-0.0.1-SNAPSHOT.jar --evaluate-rag examples/ai-backend/fixtures/rag/corpus-v1.json examples/ai-backend/fixtures/rag/development-v1.jsonl /tmp/rag-development.json
java -jar examples/ai-backend/target/ai-backend-example-0.0.1-SNAPSHOT.jar --evaluate-rag examples/ai-backend/fixtures/rag/corpus-v1.json examples/ai-backend/fixtures/rag/held-out-v1.jsonl /tmp/rag-held-out.json
```

The copy fixture blindly joins the retrieved source text and cites those retrieved IDs. It never
receives expected labels and does not select a source using the answer key. Fault cases deliberately
inject a provider failure, a wrong answer, an unsupported citation or a document revocation. Each
case records `copy-fixture`, `live-local`, `injected-fault` or `not-called` as generation evidence.
An empty retrieval prevents generation, so a downstream fault scenario may never activate; inspect
`modelCalls` and the actual outcome instead of assuming the scenario name proves execution. The real database,
retrieval and validation run in every mode; copied text is not live generative-model quality.

Reports are checkpointed atomically after every case. They contain source IDs, outcomes, scores and
stage timings, without raw prompts/answers. `state=running` means the process did not finish; partial
reports cannot count as a full evaluation. Dataset hashes, prompt/retrieval versions and explicit
model/evidence metadata keep different runs identifiable. Keep the same dataset hashes when making
a controlled comparison. Do not compare two different query sets as if they were a paired test.

## Predict before reading the report

1. Ask **“What is the reimbursement cutoff?”** The refund source says “14 days”, but the lexical
   baseline has no matching word. Expect a retrieval miss even though a person sees the meaning.
2. Inspect `dev-wrong-answer`. The refund source is retrieved correctly; the injected generator
   says “900 days”. Expect good retrieval and relevant citations alongside failed answer facts.
3. Inspect `dev-no-evidence`. No evidence means an application abstention without a model call.
4. Inspect an indirect-instruction or broad “private account” query. Shared words may retrieve an
   irrelevant allowed article. Authorization can be correct while relevance/abstention is poor.
5. Inspect `dev-revoke`. The source changes during generation. The application must reject the
   answer, even if its original wording and citation looked correct.

The tests intentionally preserve these differences. They do not require a perfect baseline or
silently relabel a retrieval miss as success. Other-tenant data remains outside retrieval; rejection
of a stale source is a useful policy outcome, not a correct user-facing answer.

## Read the metrics

| Field | Meaning and denominator | What it does not establish |
|---|---|---|
| `recallAt3` | Relevant labelled source IDs retrieved / relevant IDs; macro mean over answerable cases | Vector recall, relevance beyond these labels or answer truth |
| `reciprocalRankAt3` | 1/rank of first relevant result, zero on a miss; undefined when no source should answer | Complete coverage for a multi-source question |
| `citationPrecision` | Relevant cited IDs / cited IDs; undefined when nothing is cited | That the answer follows from those IDs |
| `citationRecall` | Relevant cited IDs / relevant IDs; missing citations count as zero for answerable cases | That all relevant facts were used correctly |
| `expectedFactsMatch` | Required case-insensitive substrings present and prohibited substrings absent; expected abstentions require the exact application abstention | Entailment, contradiction detection, fairness or fluent answer quality |
| `outcomeMatches` | Actual answer/abstention/provider/rejection outcome equals the authored label | Correct answer content; a schema-valid wrong answer is still an `answer` |
| `abstentionCorrect` | Answer exists and its abstention status matches the label, over all cases | That every non-abstaining answer is correct |
| stage `P50`/`P95` | Nearest-rank observed retrieval/model/total milliseconds, including failures | A production latency SLO or load-test capacity |

Each undefined rate is JSON `null`, with the actual denominator shown. Failed/rejected generations
remain in all-case fact/outcome rates. Provider failures with successful retrieval still contribute
their retrieval evidence. The `modelMs` phase includes the injected behavior in fault cases; it is
not first-token latency. `totalMs` includes isolated database setup. No queue, tokens, provider bill,
production throughput or learned embedding quality is inferred from these timings.

A substring can occur in “not 14 days” or beside an unrelated contradiction. Read a sample of actual
answers in a controlled local review when evaluating a real model; this report deliberately does
not store them. Add explicit human support labels/rubrics before claiming grounded-answer quality.
A model judge is optional additional evidence and cannot replace that review.

## Data provenance and limits

`fixtures/rag/` is an original, fictional support-policy corpus: two tenants, enabled/disabled
articles and deliberately untrusted instructions. No customer/company/private-source data is used.
The public case files were authored before measuring this baseline; no external participant or
independent annotator has validated the labels. Held-out IDs/questions differ from development,
but use the same corpus and include close paraphrases. They are a small teaching hold-out, not
statistical independence, production representativeness or a secret benchmark. After inspecting a
held-out result to tune a design, treat that split as regression data and author a new hold-out.

At most32 corpus documents,100 cases,three retrieved sources and1MiB per input file are accepted.
Document/question/label lengths and per-model-call deadlines are bounded; malformed UTF-8 and
unauthorized expected-source labels fail before generation. The run has a finite case/call budget,
not one hard wall-clock deadline across the whole dataset. Every case owns and shuts down its H2
instance; revocation cannot affect a later case.

The [committed evidence](evidence/README.md) records actual fixture runs and known failure slices.
There is no live model evaluation for Project B yet. For an opt-in local experiment, set
`AI_EVIDENCE=live-local`, an explicit installed `AI_MODEL`, `AI_ENDPOINT` on loopback,
`AI_TIMEOUT_MS` (1–30000), `AI_MODEL_DIGEST` and `AI_RUNTIME_VERSION` before the same command.
Digest/runtime values in this evaluator are **operator declarations**, not inventory verification;
record them from the actual local runtime and do not change the model while a run is in progress.
Only approved synthetic data may be sent. No paid/hosted endpoint is supported by this CLI.

## Change, debug, explain

- **Change:** create a new query file, leaving version1 unchanged. Compare a lexical token change
  on development queries, then freeze it before evaluating a new held-out set. Report regressions
  in direct/tenant/adversarial/operational slices, not only the mean.
- **Debug:** if retrieval recall is good but expected facts fail, inspect generation/validation.
  If recall is poor, inspect ingestion, the query, permitted corpus and retrieval before prompting.
- **Interview:** “I measure retrieval coverage/rank separately from answer facts and citations.
  An allowed source can be irrelevant, and a relevant citation can accompany a wrong answer.
  I preserve failure denominators, inspect slices, and state the limits of my labels.”

Continue with [dense-vector evidence](VECTOR_RETRIEVAL.md), [document preprocessing](DOCUMENTS.md)
and [controlled tools](WORKFLOW.md). This evaluator measures the lexical baseline; the real
pgvector exercise separately proves vector/index geometry and freshness, not semantic quality.
