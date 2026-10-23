# Learned retrieval protocol v1 — frozen before a new holdout

Protocol/model/development freeze: October 23, 2026. This is an implementation and evaluation contract, not measured success. The normal application remains lexical. No production, multilingual or human-answer-support claim follows.

## Fixed candidate and boundary

Use `SEMANTIC_MODEL_LOCK.json`: `all-minilm:22m`, full official manifest and all blob SHA-256 identities, Ollama0.32.5, F16 BERT,384 dimensions, mean pooling and L2 normalization. Its tokenizer vocabulary/token IDs are embedded in the hashed GGUF; bind tokenizer implementation to the observed runtime version and executable hash. The GGUF structural context is512 but installed params use256. Preserve `truncate=false`; a1000-character chunk is not a256-token guarantee. Oversized input must fail without activating a partial generation. Artifact download is explicit, fixed-origin and bounded to64MiB total. No application startup downloads a model.

Run an owned daemon on an ephemeral loopback port with a generated private model cache; never modify the shared service/store. One CPU inference request at a time. Use only the original synthetic corpus. Observe actual runtime/API metadata and artifact hashes before/after. Configured/deployed version is not independent binary attestation.

## Query/label contract for an independent author

Corpus: `fixtures/semantic/corpus-v1.json`,16 original synthetic documents. Query JSONL fields are exactly `id`, `principal`, `question`, `slice`, `relevantSources`, `expectAbstain`. IDs match `[a-z0-9-]{1,80}`; principal is alice/bob; nonblank question<=1000characters; slice is direct/paraphrase/multi/tenant/unanswerable/adversarial. Relevant sources are unique authorized enabled document citations retaining `:v1`; empty labels require `expectAbstain=true`. Labels mean the article supports the requested fact, not merely similar words. Disabled/other-tenant content is never relevant. Label provenance remains AI-authored, not independent human annotation.

Thirty development cases are supplied. A separate author supplies20 held-out queries after this protocol/model freeze, using the fixed corpus and contract without changing existing files. Use different intent/template formulations and include multi-source, tenant, missing-evidence and adversarial cases. Shared corpus knowledge is intended; labels and held-out queries must not influence model selection, parameters or thresholds. Existing public RAG holdout is regression data and is not this holdout. The implementer must not inspect the new holdout until the frozen implementation is evaluated once; any subsequent tuning needs a new holdout/version.

## Paired execution and reporting

Compare lexical, learned dense exact and configured ANN against the same canonical snapshot and same queries. Use existing `KnowledgeStore`, `OllamaEmbeddingProvider`, `VectorKnowledgeRetrieval`, `PgVectorKnowledgeIndex` and `KnowledgeService`; no authored-vector or TF-IDF substitution for learned evidence. Evaluation labels never enter embedding requests or generation context. Preserve all tenant/freshness/version/revocation and namespace checks. Never silently fall back to lexical or another model.

Report document-level recall@3 and reciprocal rank@3 by removing only a chunk `:cN` suffix; retain version and tenant identity. Report actual chunk results separately. Compare ANN/exact overlap separately from labelled relevance. Tiny tables may execute a sequential scan: record actual EXPLAIN evidence and do not claim HNSW execution from the configured mode. Retain all failures in attempted-case counts, failure-inclusive latency distributions, fixed error categories, per-slice regressions and actual embedding calls. Partial/incomplete runs do not satisfy gates.

Generation, when used to exercise the answer service, is an explicitly labelled copy-of-retrieved-context fixture. It receives no answer key and does not establish answer truth. Dense top-k has no automatic relevance threshold; report inappropriate retrieval/answering for unanswerable queries without assuming semantic abstention. Human answer-support review remains `not-assessed`.

Predeclared candidate comparison: no observed unauthorized source/side effect in the authored safety cases; complete provenance and every attempted case accounted for; dense exact development/holdout document recall@3 and MRR@3 must not be below lexical, and paraphrase recall@3 must improve by at least0.20. These are small synthetic-suite decisions, not production guarantees. A failure stays a failure; no threshold relabelling or automatic default switch. ANN overlap is diagnostic, not a substitute quality gate. The absence of a human-supported answer metric prevents claiming AI-07/09 complete even if these retrieval criteria pass.

## Required actual-service evidence

Exercise updates, revocation/deletion, changed-source rebuild rejection, failed/oversized rebuild, namespace mismatch and post-generation authorization with the learned provider. Zero skips are required in dedicated actual pgvector CI. Native contract tests or a local embedding-only run are separate evidence and cannot close the end-to-end gate. Keep the8 existing pgvector integration cases.

Runtime reports are bounded, atomic and source/JAR/dataset/artifact bound, containing fixed synthetic IDs, scores, call/timing counts and outcome categories. No raw prompts, source text, answers, credentials, temporary paths or vectors are exported. Cleanup removes only owned daemon/process groups, private cache/runtime files and generated database schema. Retain an explicit failure state and no success receipt on failed/cancelled execution.

Primary references: [official Ollama artifact](https://ollama.com/library/all-minilm:22m), [GGUF metadata](https://ollama.com/library/all-minilm:22m/blobs/797b70c4edf8), [params](https://ollama.com/library/all-minilm:22m/blobs/85011998c600), [embedding API](https://docs.ollama.com/api/embed). These describe model/runtime contracts; this frozen protocol supplies no measured neural quality yet.
