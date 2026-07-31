# 2-Stage Recommendation Systems Architecture

## 🟢 Beginner Level

### What is a Recommendation Engine?
A **Recommendation System** predicts user preferences and surfaces relevant items (products, videos, articles) from a catalog of millions of items in real-time ($< 100\text{ms}$).

```
MILLIONS OF ITEMS (e.g. 10,000,000 Products)
                   │
                   ▼
┌───────────────────────────────────────────────────┐
│ STAGE 1: CANDIDATE GENERATION (RETRIEVAL / FILTER)│  ──► Filters 10M ➔ 500 Candidates (<20ms)
└──────────────────┬────────────────────────────────┘
                   ▼
┌───────────────────────────────────────────────────┐
│ STAGE 2: RANKING & SCORING MODEL                  │  ──► Scores 500 ➔ Top 10 Ranked Items (<50ms)
└──────────────────┬────────────────────────────────┘
                   ▼
TOP 10 USER RECOMMENDATIONS
```

---

## 🟡 Intermediate Level

### Stage 1: Candidate Generation (Retrieval)

The goal of Candidate Generation is to reduce the search space from millions of items down to hundreds of candidate items with ultra-low latency.

1. **Collaborative Filtering**:
   - *User-based*: Finds users with similar item interaction history.
   - *Item-based*: Finds items frequently co-purchased or co-viewed together.
2. **Matrix Factorization (ALS)**: Decomposes sparse User-Item interaction matrix $R$ into dense low-rank latent matrices $U$ and $V^T$ ($R \approx U \cdot V^T$).
3. **Two-Tower Neural Networks**:
   - *User Tower*: Encodes user features (age, location, history) into a dense embedding vector $e_u$.
   - *Item Tower*: Encodes item features (category, brand, text) into a dense embedding vector $e_i$.
   - Retrieval executes as an Approximate Nearest Neighbors (ANN) vector search ($\text{Score} = e_u \cdot e_i$).

---

## 🔴 Expert Level

### Stage 2: Ranking, Scoring & Cold-Start Infrastructure

The Ranking stage takes the ~500 retrieved candidates and passes them through a complex, high-capacity deep learning model (e.g., Deep & Cross Network / DCN-v2, XGBoost) to compute exact predicted Click-Through-Rates ($\text{pCTR}$) and Conversion Rates ($\text{pCVR}$).

$$\text{Final Rank Score} = \text{pCTR} \times \text{pCVR} \times \text{Item Margin}$$

```
TWO-TOWER NEURAL NETWORK RETRIEVAL PIPELINE:
User Features ──► [ User Tower Deep NN ]  ──► User Vector (e_u) ──┐
                                                                 ├──► Cosine ANN Search ──► Top 500
Item Features ──► [ Item Tower Deep NN ]  ──► Item Vector (e_i) ──┘
```

### Cold-Start Problem & Exploration Strategies

- **Cold-Start Problem**: New users or new items have zero historical interaction logs.
- **Exploration vs Exploitation**:
  - *Exploitation*: Recommending items the system knows the user already likes.
  - *Exploration*: Showing new or unrated items to gather interaction feedback.
  - *Multi-Armed Bandits (Thompson Sampling / Upper Confidence Bound - UCB)*: Dynamically balances exploration and exploitation in real-time.

### Interview Questions

1. **Why split recommendation systems into a 2-Stage pipeline instead of running a deep ranking model on all 10M catalog items?**
   - *Answer*: Computing a complex 50-layer Deep & Cross Network inference pass on 10 million items takes several seconds per request. Two-Tower ANN vector retrieval filters candidate size to 500 items in 5ms, allowing heavy ranking models to execute within SLA (<50ms).

2. **How do you handle real-time item deduplication and negative filtering in production recsys backends?**
   - *Answer*: Maintain a sliding-window Redis Bloom Filter per user containing recently viewed/purchased item IDs. Filter candidate items using Bloom Filter lookups prior to ranking scoring.
