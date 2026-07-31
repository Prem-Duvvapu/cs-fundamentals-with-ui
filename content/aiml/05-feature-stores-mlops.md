# Feature Stores, Data Drift & MLOps System Architecture

## 🟢 Beginner Level

### What is a Feature Store?
A **Feature Store** is a central data management layer in machine learning architecture that allows data engineers to define, compute, store, and serve features for both offline model training and real-time online inference without data leakage.

```
                    ┌────────────────────────┐
                    │ Raw Batch & Stream Data│
                    └───────────┬────────────┘
                                │ Feature Pipeline
                                ▼
                    ┌────────────────────────┐
                    │     FEATURE STORE      │
                    └────┬────────────────┬──┘
                         │                │
     Low Latency (<10ms) │                │ High Throughput Batch
                         ▼                ▼
             ┌────────────────┐      ┌────────────────┐
             │  Online Store  │      │ Offline Store  │
             │ (Redis / Dynamo│      │ (S3 / Snowflake│
             │ for Inference) │      │ for Training)  │
             └────────────────┘      └────────────────┘
```

---

## 🟡 Intermediate Level

### Online Store vs. Offline Store

- **Online Feature Store**: Key-value cache (Redis, Cassandra, DynamoDB) configured for low-latency ($< 5-10\text{ms}$) point lookups by entity ID during real-time inference (e.g. `user_101:avg_purchase_30d = 84.50`).
- **Offline Feature Store**: Columnar data lake (Apache Parquet, Snowflake, S3, BigQuery) optimized for high-throughput batch historical queries to generate point-in-time training datasets.
- **Point-in-Time Correctness (Time-Travel Joins)**: Prevents **Data Leakage** during model training by joining features as they existed at the exact timestamp of each historical event.

---

## 🔴 Expert Level

### Data Drift vs. Concept Drift Detection

Once a model is deployed to production, real-world data patterns change over time, degrading model accuracy.

```
1. DATA DRIFT (Covariate Shift):
   Input Feature Distribution P(X) changes over time!
   (e.g., Average user age shifts from 25 to 45 after marketing campaign).

2. CONCEPT DRIFT:
   Relationship between Input X and Target Y P(Y|X) changes over time!
   (e.g., Inflation causes $100 purchasing behavior to mean something different).
```

#### Monitoring Metrics: Population Stability Index (PSI)
$$\text{PSI} = \sum \left( (\text{Actual}\% - \text{Expected}\%) \times \ln\left(\frac{\text{Actual}\%}{\text{Expected}\%}\right) \right)$$
- $\text{PSI} < 0.1$: No significant drift.
- $0.1 \le \text{PSI} < 0.25$: Moderate drift (Trigger alert).
- $\text{PSI} \ge 0.25$: Action required (**Trigger automated model retraining pipeline!**).

### Interview Questions

1. **How do you prevent train-test skew when deploying online real-time feature pipelines?**
   - *Answer*: Compute feature transformations once in a shared Feature Store pipeline (Feast / Tecton) so the exact same feature transformation code generates historical training datasets in S3 and live inference key-value lookups in Redis.

2. **How does Shadow Deployment differ from Canary Release in MLOps model monitoring?**
   - *Answer*: **Shadow Deployment** sends 100% of production traffic to both old and new model versions asynchronously, but discards new model predictions without serving them to users. **Canary Release** routes a small percentage (e.g., 5%) of live user requests to the new model for evaluation.
