# Retrieval-Augmented Generation (RAG) Systems Architecture

## 🟢 Beginner Level

### What is RAG (Retrieval-Augmented Generation)?
**Retrieval-Augmented Generation (RAG)** is an enterprise architecture pattern that connects Large Language Models (LLMs) to external domain-specific knowledge bases (databases, documentation, APIs) to ground responses in factual data and eliminate hallucinations.

```
USER QUERY: "What is our company's refund policy for tier-2 subscriptions?"
                               │
                               ▼
            ┌──────────────────────────────────────┐
            │        Vector Search Engine          │ ──► Retrieves Top-K Relevant Document Chunks
            └──────────────────┬───────────────────┘
                               ▼
            ┌──────────────────────────────────────┐
            │       Context Prompt Assembly        │
            │ "Answer user using ONLY context:..." │
            └──────────────────┬───────────────────┘
                               ▼
            ┌──────────────────────────────────────┐
            │              LLM Engine              │ ──► Accurate, Grounded Response
            └──────────────────────────────────────┘
```

---

## 🟡 Intermediate Level

### The 5-Step RAG Pipeline

1. **Document Ingestion & Chunking**: Splits large documents into smaller chunks (e.g. 512 tokens with 50-token overlap).
   - *Fixed-size Chunking*: Fast, but breaks sentences in half.
   - *Semantic Chunking*: Splits at natural paragraph/heading boundaries using NLP models.
2. **Embedding Generation**: Converts chunks into dense vectors using embedding models (e.g., `text-embedding-3-small`).
3. **Vector Storage**: Stores embeddings alongside text metadata in a vector database (`Qdrant`, `Pinecone`, `pgvector`).
4. **Hybrid Retrieval**: Combines **Dense Vector Search** (HNSW semantic search) with **Sparse Keyword Search** (BM25 / TF-IDF) using Reciprocal Rank Fusion (RRF).
5. **Re-Ranking & Generation**: Re-ranks top 50 retrieved chunks down to top 5 using a Cross-Encoder model (`cohere-rerank`), passes them into LLM context window.

---

## 🔴 Expert Level

### Advanced RAG Optimization & Hallucination Guardrails

- **Parent-Child Chunk Retrieval**: Embeds small child chunks (128 tokens) for precise vector matching, but passes the parent document context (1024 tokens) to the LLM.
- **RAG Triad Metrics (Ragas Framework)**:
  1. **Faithfulness**: Is the LLM answer strictly derived from the retrieved context? (Prevents hallucination).
  2. **Answer Relevance**: Does the LLM answer address the user query?
  3. **Context Precision**: Are the top retrieved chunks actually relevant to the prompt?

```
RECIRCULATING RE-RANKER PIPELINE:
Raw Query ──► Dense HNSW (Top 50) ──┐
          ──► Sparse BM25 (Top 50)  ──┴─► Reciprocal Rank Fusion ──► Cross-Encoder Re-ranker ──► Top 5 ──► LLM
```

### Interview Questions

1. **How does Reciprocal Rank Fusion (RRF) combine dense and sparse search scores?**
   - *Answer*: RRF calculates a combined rank score without normalizing raw distance floats: $\text{RRF Score}(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$ where $k = 60$ and $r_m(d)$ is the document rank in search system $m$.

2. **How do you handle stale document embeddings when a database row updates?**
   - *Answer*: Implement CDC (Change Data Capture) via Debezium / Kafka listeners. When a document row updates, emit a CDC event to an asynchronous background worker that deletes old vector IDs and re-chunks/re-embeds the updated document.
