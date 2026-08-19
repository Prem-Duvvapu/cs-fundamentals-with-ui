# Vector Embeddings, Similarity Search & Vector Databases

## 🟢 Beginner Level

### What is a Vector Embedding?
A **Vector Embedding** is a dense, high-dimensional numerical vector representation of unstructured data (text, images, audio) where semantically similar items map to nearby coordinates in vector space.

```
"King"   ──► [ 0.25, -0.81,  0.42, ...,  0.19 ] (1536 Dimensions)
"Queen"  ──► [ 0.23, -0.79,  0.45, ...,  0.21 ] (High Cosine Similarity)
"Apple"  ──► [-0.91,  0.12, -0.65, ..., -0.88 ] (Low Cosine Similarity)
```

### Vector Similarity Metrics

1. **Cosine Similarity**: Measures the cosine of the angle between two vectors, ignoring magnitude.
   $$\text{Cosine Similarity}(A, B) = \frac{A \cdot B}{\|A\| \|B\|} = \frac{\sum_{i=1}^d A_i B_i}{\sqrt{\sum A_i^2} \sqrt{\sum B_i^2}}$$
   - Range: $[-1, 1]$ (or $[0, 1]$ for non-negative embeddings). $1.0$ means identical orientation.
2. **Dot Product (Inner Product)**: Measures both angle and magnitude ($A \cdot B = \sum A_i B_i$). Fast for normalized vectors ($\|A\| = 1$).
3. **Euclidean Distance ($L_2$ Distance)**: Measures straight-line distance between two points ($d(A, B) = \sqrt{\sum (A_i - B_i)^2}$). Lower distance means higher similarity.

---

## 🟡 Intermediate Level

### Vector Indexing Algorithms: Exact vs. Approximate Nearest Neighbors (ANN)

Performing brute-force $O(N \cdot d)$ K-Nearest Neighbors (KNN) scan across millions of 1536-dimensional vectors causes high search latency ($> 500\text{ms}$). Vector databases use **ANN Indexing** for sub-10ms queries.

```
1. HNSW (Hierarchical Navigable Small World):
   Layer 2 (Express Links):   Node 1 ─────────────────────────► Node 50
   Layer 1 (Medium Links):    Node 1 ──────────► Node 20 ──────► Node 50
   Layer 0 (Dense Links):     Node 1 ──► Node 5 ──► Node 20 ──► Node 50

2. IVF-PQ (Inverted File + Product Quantization):
   Clusters space into Voronoi cells (Centroids). Quantizes 1536-dim floats into 8-bit byte codes.
```

#### Indexing Algorithm Comparison

| Algorithm | Query Speed | Recall Accuracy | Memory Usage | Indexing Time |
| :--- | :--- | :--- | :--- | :--- |
| **Flat / Exact KNN** | Slow ($O(N \cdot d)$) | 100% | Low | 0 (No build step) |
| **HNSW** | **Ultra-Fast ($O(\log N)$)** | High (95-99%) | **High** (RAM heavy) | Fast |
| **IVF-PQ** | Fast ($O(\sqrt{N})$) | Moderate (85-95%) | **Low** (Compressed) | Slow |

---

## 🔴 Expert Level

### Vector Database Architecture (Pinecone, Qdrant, Milvus, pgvector)

Traditional relational databases index scalar data using B+ Trees. Vector databases index vector spaces using HNSW graphs combined with scalar metadata filtering.

> **Filtered Search Trade-off**:
> - **Pre-filtering**: Filters scalar metadata FIRST (`WHERE tenant_id = 'org_123'`), then runs vector search on the reduced candidate set (may reduce graph connectivity).
> - **Post-filtering**: Runs vector HNSW search FIRST, then discards non-matching metadata rows (may return fewer than $K$ results if filter is strict).
> - **Single-Stage Single-Pass Filtering (Qdrant / Milvus)**: Traverses HNSW graph while dynamically evaluating payload boolean constraints during graph traversal steps.

### Interview Questions

1. **Why is `pgvector` HNSW index created using `vector_cosine_ops` faster for normalized embeddings?**
   - *Answer*: When vectors are normalized ($\|A\| = 1$), Cosine Similarity equals the Dot Product. Dot Product eliminates vector norm square-root calculations in distance evaluation loops, speeding up CPU instructions.

2. **How does Product Quantization (PQ) compress 1536-dimensional float32 vectors by 95%?**
   - *Answer*: PQ splits a 1536-dimensional vector into 64 sub-vectors of dimension 24. It clusters sub-vectors into 256 centroids (represented by a 1-byte 8-bit index). Compressed size $= 64 \times 1\text{ byte} = 64\text{ bytes}$ (vs $1536 \times 4\text{ bytes} = 6144\text{ bytes}$).
