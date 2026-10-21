# Local evaluation evidence

The first attempted 7B run (`qwen2.5-coder-16k:latest`, digest
`0533dd01f237c4ef66a5aedc0c7f191fef4bf4484e78e5ff2a984b5121f5441e`) was stopped:
its runner used about 4.9 GiB RSS in a 6.8 GiB WSL instance, leaving insufficient headroom
for concurrent browser verification. Ollama was 0.32.5; CPU was an Intel i5-1135G7 with four
logical CPUs visible to WSL. No complete quality report was produced and no passing score is claimed.
The pre-existing Ollama server was retained; only the experiment's evaluator/model load was stopped.

Future reports checkpoint each completed case atomically and retain `state: running` when interrupted.
Require a complete report and model/runtime provenance before drawing quality conclusions.

## October18 lexical RAG fixture baseline

`2026-10-18-rag-fixture-development.json` and `2026-10-18-rag-fixture-held-out.json` are actual completed runs of the teaching JAR, with corpus/query hashes and per-case diagnostics. Development:21/30 expected-fact matches,26/30 expected outcomes; held-out:13/20 fact matches,16/20 outcomes. Retrieval recall@3 is25/26 and15/17 respectively, averaged over answerable labelled cases. These are copy-fixture scores, not LLM accuracy. A relevant citation can accompany the injected wrong answer, and irrelevant allowed sources can defeat abstention. `held-wrong-answer` never reaches generation because lexical retrieval misses “shipping”; `modelCalls=0`/`not-called` preserves that upstream failure rather than pretending the fault executed. Timings include per-case setup and are not capacity measurements. See [metric definitions](../RAG_EVALUATION.md).

The October18 ticket-rule reports record29/30 development and17/20 public-held-out field matches, with1/3 review cases respectively. They are actual deterministic executions, not model outputs. Raw bytes differ from the historical local-model input only by LF/CRLF checkout endings; the new LF-normalized held-out hash equals the historical raw digest. Keep both hashes and treat this already-inspected split as regression evidence. [Decision notes](../ADAPTATION_DECISIONS.md) explain counterexamples, accepted-only bias and the limits of comparing methods across dates/hardware.

## October18 streaming observations

The `streaming-fixture-2026-10-18/` reports record four actual packaged-JAR HTTP cases with exact
one-call behavior and owned cleanup. `streaming-local-2026-10-18.json` records one completed
already-installed0.5B model call, with separately inspected GGUF/runtime provenance in the adjacent
file. No download or paid call was made. First content/total2,382/2,643ms and36/10 reported tokens
are one dated observation, not quality, throughput or pricing evidence. Missing cache counts
stay null. See [the learning guide](../STREAMING.md) for boundaries and cost arithmetic.


## October 21 frozen ticket comparison

The [comparison guide](../QUALITY_COMPARISON.md) explains the task and predeclared field gate.
Both actual local-model runs completed with the already-installed 397,821,319-byte qwen2.5:0.5b
GGUF, digest a8b0c51577010a279d933d14c2a8ab4b268079d44c5c8830c0a93900f1827c67, and inspected
Ollama 0.32.5. The environment exposes four CPUs and about 6.9 GiB RAM. There was no download,
paid execution or automatic default change. Cold starts/cache and sequential run order prevent
latency superiority or throughput claims; nonstreaming usage and cost remain unknown.

- [Development report](2026-10-21-comparison-development.json): original 3/30 exact, 28/30 schema
  accepted; candidate 5/30 exact, 14/30 accepted; rule 29/30 exact and accepted. The original has
  one deadline and one schema failure; the candidate has sixteen schema failures. Paired changes:
  five improved, three regressed, zero both correct, 22 both wrong. Only the rule meets the narrow
  field gate on this sample.
- [Separate development validation](2026-10-21-comparison-development-verification.json): the
  completed first report predates wrapper hardening. It remains unchanged. The new validator
  subsequently checked every child identity and exact frozen prompt hash and recomputed the
  decision, recording the original report and validator hashes. This is not a second inference
  run or retroactive measurement of cancellation behavior.
- [New holdout report](2026-10-21-comparison-holdout-v2.json): original 2/20 exact, 20/20 accepted;
  candidate 8/20 exact, 17/20 accepted; rule 6/20 exact, 16/20 accepted. Paired changes: seven
  improved, one regressed, one both correct, eleven both wrong. No approach reaches the frozen
  90% exact-field target. The hardened wrapper verifies the full frozen prompt hashes, records
  all three completed variants and owned-child cleanup. The candidate was not revised afterward.

The new dataset is AI-authored synthetic work, not human-labelled representative tickets. Its
[independent-author provenance](../fixtures/comparison/PROVENANCE.md) records the chronology and
LF-normalized hash. It is now public regression data. No summary-faithfulness, human learning,
real-world quality, trained semantic-retrieval or business-authorization claim follows. Prompt
hash attribution is not independent attestation of the JAR build or local daemon implementation.
