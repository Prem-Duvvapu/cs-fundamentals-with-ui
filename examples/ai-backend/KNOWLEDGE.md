# Milestone B1: permission-aware lexical retrieval

Read [the RAG lesson](../../content/aiml/02-rag-architecture.md) and run the setup in [README](README.md).
The first runnable retrieval milestone uses JDBC and a lexical baseline, with the same two identities
as Project A. Dense embeddings, pgvector/ANN and hybrid/reranking comparisons remain later milestones.
A lexical baseline establishes whether retrieval and authorization work before introducing another model.

## Trace one question

1. Alice creates `policy` containing “Refund within 14 days” at expectedVersion 0.
2. Bob creates a document with the same ID but different content. The primary key is tenant + ID.
3. Alice asks “refund”. The database returns only enabled tenant-A documents. Token overlap selects
   at most three sources, breaking ties by document ID; each source contributes at most 1200 characters.
4. The configured model receives the question and those sources. The application does not send Bob's
   data and does not ask the model to choose its identity or tenant.
5. JSON output must have answer text and citations from the exact allowed source IDs/versions.
6. The service checks source authorization/version again after generation. Changed/revoked evidence
   causes rejection rather than returning a response based on a stale snapshot.

A valid citation proves that the referenced document was supplied and remains allowed at the final
check. It does not prove every claim in the answer follows from the document. Inspect cited spans
and evaluate answer support separately. Source contents and answers remain untrusted text.

## Endpoints and state

All writes require the Basic/session/CSRF flow in `verify_http.py`.

| Request | Body / parameter | Behavior |
|---|---|---|
| PUT `/api/documents/policy` | expectedVersion, title, text, enabled | Insert at 0 or optimistic update at the exact current version |
| POST `/api/ask` | question | Authorized lexical retrieval, then model generation; no match means insufficient evidence without a model call |
| DELETE `/api/documents/policy?expectedVersion=2` | Version parameter | Replace with a disabled tombstone at version 3 |

There is no model-controlled database command, caller-selected tenant, cache or permission bypass.
The default H2 database is in-memory and resets on restart. To inspect file persistence, use:

```bash
AI_JDBC_URL='jdbc:h2:file:/tmp/support-knowledge' \
java -jar examples/ai-backend/target/ai-backend-example-0.0.1-SNAPSHOT.jar
```

Stop the owned application before deleting `/tmp/support-knowledge.mv.db` after the exercise.
The database filename is operator configuration, never request data. JDBC tests also reconstruct a
store from a temporary file and verify Alice's data survives while remaining hidden from Bob.
Production tenant membership, migrations, retention and database connection pooling are not implemented
by this small baseline. The hardcoded identity-to-tenant map is a visible teaching policy.

## Predict, change, debug

- **Predict:** Alice and Bob use the same document ID. Alice's result must still use tenant-A text.
- **Change:** Alice updates version 1 to version 2. The next result must cite `policy:v2`.
- **Debug:** submitting the old version produces HTTP 409. Re-read/reconcile the state rather than
  overwriting an update blindly. Reusing version 0 cannot erase an existing document.
- **Failure during generation:** revoke or update the source while the model is answering. Its old
  snapshot is rejected. An application check cannot revoke information already sent to an external
  provider; account for that boundary in provider selection and retention policy.
- **Deletion:** the tombstone retains the version. Recreating with expected version 2 after a version-2
  tombstone creates version 3, so old citations are not silently reassigned to new contents.

`KnowledgeTests` covers real JDBC isolation/version/freshness/persistence and negative model-output
cases. `verify_http.py` additionally uses the packaged servlet app, two actual authenticated clients
and the HTTP model fixture for the create → query → update → revoke journey.
