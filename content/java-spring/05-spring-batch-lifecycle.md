# Spring Batch Architecture, Chunk Execution Lifecycle & Fault Tolerance

## 🟢 Beginner Level

### What is Spring Batch?
**Spring Batch** is a lightweight, comprehensive framework designed for processing large volumes of enterprise records (e.g. processing millions of nightly bank transactions, CSV ingestion, ETL data migration).

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           SPRING BATCH ARCHITECTURE                       │
│                                                                           │
│  ┌───────────────┐     ┌──────────────┐     ┌──────────────────────────┐  │
│  │  JobLauncher  │ ──► │     Job      │ ──► │ Step 1 ──► Step 2 (Task) │  │
│  └───────────────┘     └──────────────┘     └────────────┬─────────────┘  │
│                                                          │                │
│                                                          ▼                │
│                                          ┌──────────────────────────────┐ │
│                                          │  Chunk-Oriented Processing   │ │
│                                          │ ItemReader ➔ ItemProcessor   │ │
│                                          │           ➔ ItemWriter       │ │
│                                          └──────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 🟡 Intermediate Level

### Chunk-Oriented Processing Lifecycle & Transaction Boundaries

Spring Batch executes Steps using **Chunk-Oriented Processing** where items are read one-by-one from `ItemReader`, transformed by `ItemProcessor`, and accumulated until reaching **Chunk Size $N$**, at which point the list of $N$ items is written in a single database transaction via `ItemWriter`.

```
                  ┌─────────────────┐
                  │   ItemReader    │ ◄── Reads 1 item at a time
                  └────────┬────────┘
                           │ Repeat N times (Chunk Size N)
                           ▼
                  ┌─────────────────┐
                  │  ItemProcessor  │ ◄── Transforms & validates item
                  └────────┬────────┘
                           │ Accumulated List of N Items
                           ▼
             ============== TRANSACTION BOUNDARY (BEGIN) ==============
                  ┌─────────────────┐
                  │   ItemWriter    │ ◄── Bulk inserts N items to DB
                  └────────┬────────┘
             ============== TRANSACTION BOUNDARY (COMMIT) =============
```

#### JobRepository Database Schema
Spring Batch persists complete execution state inside relational database tables to support **Job Restartability**:
- `BATCH_JOB_INSTANCE`: Identifies logical job with unique `JobParameters`.
- `BATCH_JOB_EXECUTION`: Tracks execution status (`STARTED`, `COMPLETED`, `FAILED`).
- `BATCH_STEP_EXECUTION`: Tracks step-level metrics (`READ_COUNT`, `WRITE_COUNT`, `COMMIT_COUNT`, `ROLLBACK_COUNT`).

---

## 🔴 Expert Level

### Advanced Batch Patterns: Fault-Tolerance, Partitioning & Parallel Steps

1. **Skip & Retry Policies**:
   - `skip(FlatFileParseException.class).skipLimit(10)`: Skips corrupt input records without failing the entire batch job.
   - `retry(DeadlockLoserDataAccessException.class).retryLimit(3)`: Automatically retries database operations upon transient lock contention.
2. **Partitioned Steps (Distributed Parallel Batching)**:
   - A **Master Step** splits a 10-million record dataset into 10 partitions using a `Partitioner`.
   - **Worker Steps** execute partitions concurrently across multiple worker nodes via Kafka / RabbitMQ messages!

### Interview Questions

1. **How does Spring Batch guarantee idempotent job restarts after a crash mid-chunk?**
   - *Answer*: When a job fails, Spring Batch inspects `BATCH_JOB_EXECUTION` and `BATCH_STEP_EXECUTION` context tables. On restart, `ItemReader` resumes reading from the exact transactionally committed offset (`READ_COUNT`), avoiding duplicate processing of previously committed chunks.

2. **Why should you avoid modifying entity state in `ItemProcessor` when using JPA `ItemWriter`?**
   - *Answer*: JPA Hibernate manages entity states in the Persistence Context. If `ItemProcessor` modifies entities, Hibernate's dirty checking might trigger uncommitted SQL updates before `ItemWriter` executes its transaction commit.
