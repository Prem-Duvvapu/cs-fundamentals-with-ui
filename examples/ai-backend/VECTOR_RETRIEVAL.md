# Project B: real PostgreSQL vector retrieval, with a lexical default

An **embedding** is a list of numbers representing an input under one particular
model. A **vector index** helps find nearby lists. Neither proximity nor an index
hit proves that a passage answers your question. This package adds actual JDBC
pgvector retrieval to the existing Java RAG service; it does not add an AI feature
to the learning website.

The normal application still uses `lexical` retrieval, H2 and no embedding calls.
Nothing automatically downloads a model, enables pgvector or switches providers.
Read [KNOWLEDGE.md](KNOWLEDGE.md) first for authenticated document writes, CSRF,
source versions and the two synthetic principals. Their progress/data is not shared
with any learning app.

## 1. Understand what the modes mean

| Configured mode | Work performed | Scope and limitation |
|---|---|---|
| `lexical` (default) | Existing deterministic term overlap | No embeddings/vector engine; original document citation IDs |
| `pgvector-exact` | Cosine-distance ordering over current authorized chunks with index/bitmap scans disabled locally | Exact within this model's stored space, not perfect relevance |
| `pgvector-ann` | Same authorization/version predicate; HNSW permitted with bounded iterative scan settings | Approximate search can miss useful candidates; no automatic exact/lexical/provider fallback |

`Answer.retrieval` names the configured strategy. PostgreSQL can still choose a
sequential/exact plan for a tiny table in ANN mode. Inspect EXPLAIN before claiming
an index actually ran. The dedicated integration test discourages sequential scans
for its HNSW-plan diagnostic only, verifies the real partition HNSW index appears,
and does not claim that this forced plan is a production tuning recommendation.

Each namespace fixes **model name + installed model digest + dimension + chunk
policy**. A reused namespace with a different contract fails startup. Dimensions
are 1–2000 for this `vector`/HNSW example. Zero and nonfinite vectors are rejected.
A configured digest is checked through local Ollama `/api/tags` before and after
an `/api/embed` batch. That detects ordinary mutable-tag drift; it is not an atomic
cryptographic attestation of an externally administered runtime. Do not mutate a
model tag during an evaluation or index migration.

## 2. Set up dependencies explicitly

Prerequisites: Java 17+, Maven, an operator-prepared PostgreSQL 16 database with
**pgvector 0.8.7** installed/enabled, and an already-installed local Ollama embedding
model whose exact tag, digest and output dimension you have recorded. This package
never runs `CREATE EXTENSION`, starts a server, installs a global extension or pulls
a model from application code. The database role needs access to the example's
canonical document tables and permission to create its own index tables/partitions.
Use a disposable local database and runtime credentials.

For a separate explicitly owned container, the CI job uses
`pgvector/pgvector:0.8.7-pg16-bookworm`, binds its port to loopback, generates both
administrator and application credentials at runtime, enables the extension as the
container administrator, then runs tests as a role that can create a disposable
schema. That workflow is the real vector-integration environment when the local
machine lacks the extension. Do not interpret skipped local PG tests as execution.

Set your normal runtime authentication and approval-secret values as documented in
[README.md](README.md), and set the database connection through the existing
`AI_JDBC_URL`, `AI_JDBC_USER` and `AI_JDBC_PASSWORD` environment settings. Then:

```sh
mvn -f examples/ai-backend/pom.xml verify
java -jar examples/ai-backend/target/ai-backend-example-0.0.1-SNAPSHOT.jar \
  --ai.retrieval-mode=pgvector-exact \
  --ai.embedding.namespace=policy_v1 \
  --ai.embedding.origin=http://127.0.0.1:11434/ \
  --ai.embedding.model="$EMBEDDING_MODEL_TAG" \
  --ai.embedding.revision="$EMBEDDING_MODEL_DIGEST" \
  --ai.embedding.dimensions="$EMBEDDING_MODEL_DIMENSIONS"
```

The three `EMBEDDING_*` variables above are operator-supplied observed values, not
sample model recommendations or a request to download anything. The embedding
origin accepts only local HTTP origins; no learner request can select the endpoint,
model, namespace or dimensions. Chat-answer generation keeps its existing separate
chat-model endpoint/settings and budgets. An embedding model is not a chat model.

Optional limits: `--ai.embedding.timeout-ms=3000` and
`--ai.embedding.max-calls=100`. The per-batch deadline covers the before/after digest
checks plus embedding request together, with 10 seconds as the maximum configurable
value. One process-wide logical call budget covers both queries and indexing; each
batch can perform up to three HTTP requests. A restart resets that teaching budget;
it is not durable billing enforcement. No HTTP redirects/retries are followed.

## 3. Create, index, ask, change and revoke

Use the same Basic authentication session and CSRF-header procedure from
[KNOWLEDGE.md](KNOWLEDGE.md). Alice's server-derived tenant is `tenant-a`; Bob's is
`tenant-b`. None of the endpoints accepts a tenant field.

1. Alice creates document `policy` using the existing `PUT /api/documents/policy`
   with expected version 0 and body `Refund within 14 days`. Bob creates his own
   document containing an obvious private marker. Predict which text may enter
   Alice's embedding requests and answer context.
2. `GET /api/index/status` initially returns `ready:false` for the authenticated
   tenant. `POST /api/index/rebuild` explicitly embeds only that tenant's enabled
   documents and atomically publishes its chunks and manifest. This POST needs
   CSRF protection. A source write alone never silently spends embedding calls.
3. `POST /api/ask` with `{"question":"What is the refund policy?"}` embeds the
   question, queries the tenant's vector partition, joins enabled canonical source
   IDs/versions and passes up to three authorized chunks to generation. Vector
   citations have the form **`policy:v1:c0`** (document/version/chunk ordinal).
4. Change Alice's source with expected version 1 to `Refund within 30 days`.
   Its old manifest is now stale. Asking fails explicitly with HTTP 409
   `vector_index_missing_or_stale` before another embedding request. Rebuild and
   ask again: a valid citation must refer to version 2. There is no stale-context
   fallback, and a failed reindex cannot activate half the new generation.
5. Revoke the source with the existing DELETE/expected-version API. Ask fails as
   stale until the tenant is rebuilt. After rebuilding an empty corpus there are
   no source passages; the chat model must not be called. A revocation/update
   detected immediately before or after answer generation rejects the response.

Authorization is checked before context assembly and again after generation.
These are snapshots of authorization, not a promise that an already-issued model
request can be retroactively recalled after an asynchronous revocation. The model
provider remains an explicitly trusted processing boundary. Citation membership
and freshness do not prove that every generated sentence is supported: the
existing insufficient-evidence prompt and schema checks still require separate
answer-quality evaluation.

## 4. What indexing stores and how it is bounded

- Canonical source text/version/enabled state remains in `knowledge_documents`.
  It is never replaced by model output. Revoke retains the existing tombstone.
- Character chunks are at most 1000 UTF-16 code units with approximately 100 units
  of overlap, without splitting a surrogate pair. This is an explicit teaching
  parser, not PDF/HTML parsing, token-aware segmentation or semantic chunking.
- One rebuild accepts at most **32 documents / 128 chunks**, in batches of at most
  **16 texts**. A process admits one rebuild at a time and rejects concurrent
  rebuilds; it does not create an unbounded queue. It checks a 30-second budget
  between batches, so an already-running bounded batch can extend past that check
  boundary. SQL publication has its own statement/lock limits. This is a scheduling
  budget, **not a hard 30-second end-to-end HTTP deadline**; publication and its
  connection/statement waits can add time after embeddings finish.
- Embedding HTTP responses are capped at **512 KiB**, numbers/types/dimensions
  checked, and input is never silently truncated (`truncate:false`). No source
  or embedding is printed in normal server logs by these classes.
- Each namespace gets its own dimensioned vector table with two list partitions,
  one for each fixed teaching tenant, and a separate cosine HNSW index per tenant.
  This avoids cross-tenant graph effects; it is not an arbitrary-tenant provisioning
  system or a substitute for database/service access controls.
- Rebuild computes all vectors before publication. A transaction checks the current
  canonical source fingerprint, locks publication for the namespace/tenant, then
  replaces its rows and manifest together. A failed provider/schema/source-version
  check leaves the previous generation intact. The fingerprint changes on source
  ID, version, title, body or tenant; raw source text is not a log key.
- Search requires a manifest matching current enabled sources and separately joins
  every retrieved row to its enabled canonical source and matching version. The
  generated answer uses only those chunks; stale-version rows cannot independently
  authorize a source. ANN filters can still reduce returned results. This example
  uses `ef_search=40`, strict iterative order and a 1000-tuple scan cap, not an
  unbounded “keep searching until something appears” loop.

## 5. Migrate safely, compare before cutover

Never change a model/dimension under `policy_v1`. Start a separate example instance
against the same document database with namespace `policy_v2` and the new observed
model contract. Rebuild each tenant explicitly; inspect its `ready` status and
compare retrieval/answer quality on development cases before changing traffic.
The original namespace/table/manifest is retained. Requests against an unbuilt or
stale namespace fail; no partial namespace is silently substituted.

A rollback is an explicit switch back to the old configured namespace, after
verifying that its manifests still match current source versions. If documents
changed during migration, rebuild the old namespace as needed. This package has
no automatic traffic switch, namespace garbage collector or online dual-write
migration. Do not delete an old namespace while an instance still uses it.

## 6. Evidence and interview exercise

The normal Maven suite uses in-process HTTP fixtures for the embedding API. Their
vectors are hand-authored geometry, **not measured embedding-model semantics**.
The real database tests run only when an explicit environment is supplied:

```sh
export AI_VECTOR_TEST_JDBC_URL='jdbc:postgresql://127.0.0.1:5433/postgres?connectTimeout=3&socketTimeout=8'
export AI_VECTOR_TEST_DB_USER=vector_lab
# Supply AI_VECTOR_TEST_DB_PASSWORD privately from your owned local test setup.
mvn -B --no-transfer-progress -f examples/ai-backend/pom.xml verify
```

The dedicated [Vector retrieval workflow](../../.github/workflows/vector-retrieval.yml)
executes PostgreSQL/HNSW tests, requires all eight integration cases to execute
without skips, and publishes Surefire XML/text containing real EXPLAIN plans. It checks tenant exclusion, exact/ANN retrieval, stale/revoked
sources, interrupted rebuild, namespace mismatch/migration, source-version join
protection and the real Java answer service. Local environments without pgvector
must report those cases as skipped until that CI run passes.

Before reading results, predict these independent measures:

1. **ANN overlap@k:** how many approximate IDs also appear in exact top-k for the
   same vectors? This is a graph-search approximation measure.
2. **Passage recall@k:** how many labelled relevant passages were retrieved? Even
   perfect ANN/exact overlap can retrieve the wrong passage for a user's question.
3. **Answer support:** does the generated claim follow from the retrieved source?
   A good retrieval result, accepted JSON or allowed citation does not settle it.

The geometric CI fixture deliberately assigns a relevant label independently of
its nearest vector, so exact/ANN top-1 overlap can be 1 while labelled top-1 recall
is 0. It demonstrates engine behavior and metric separation; it is not a semantic-quality gate, latency benchmark or live-model success
claim. Run real model/relevance/answer evaluations separately before accepting a
model or retrieval migration. The recorded extraction model's earlier failed
quality gate is not repaired by installing a vector index.

Interview explanation: “I version the embedding space and source chunks, enforce
tenant scope before model context, and publish complete generations atomically.
I compare approximate results with exact neighbors separately from human relevance
and answer support. Reindex failure leaves the previous generation intact; stale
source versions fail closed. HNSW trades build/memory/search cost against recall,
so I inspect actual plans and measured quality rather than calling an index hit a
correct answer.”

## Primary references and version scope

- [pgvector 0.8.7 reference](https://github.com/pgvector/pgvector/blob/v0.8.7/README.md): cosine operators, HNSW, partitioning and bounded iterative scans.
- [Ollama embed API](https://docs.ollama.com/api/embed): batch inputs, embeddings, model and explicit truncation behavior.
- [Ollama local model inventory](https://docs.ollama.com/api/tags): installed model names and digests.

The SQL implementation explicitly supports pgvector 0.8.x. Changing that contract
requires retesting the extension, driver and query settings rather than treating
all future extension versions as already verified.
