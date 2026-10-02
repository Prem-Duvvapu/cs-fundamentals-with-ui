# Distributed Databases, Atomic Commit, and CAP

A distributed database stores or replicates one logical data set across independent machines, so capacity and availability can grow beyond one server's limits. The difficult part is preserving useful guarantees when messages are delayed, nodes disagree, or a coordinator fails mid-transaction. Interviewers use this topic to test whether you can connect replication, sharding, quorum math, atomic commit, and failure handling to concrete product requirements.

**Before you start:** Read [transactions](06-transactions-acid.md) and [concurrency control](07-concurrency-control.md), starting with their Beginner tiers.
**After this lesson:** Trace an uncertain commit, calculate replica-set overlap, and distinguish replicated bytes from a correct wallet transaction.
**Practice boundary:** The [SQL lab](../../examples/labs/README.md) verifies local query/rollback behavior. It does not simulate replicas, failover or distributed atomic commit; the traces below are worked models.

---

## 🟢 Beginner Level

### Why a Database Becomes Distributed

A single database server keeps local transactions, joins, backups, and indexes straightforward,
but one machine has finite CPU, memory, storage, I/O bandwidth, and one failure domain.

A distributed design uses multiple machines for several goals:

- **Replication** copies the same data so reads can be spread out and another copy survives failure.
- **Partitioning**, also called **sharding**, divides rows or columns among machines so total
  storage and write capacity can grow.
- **Geographic placement** puts data nearer users or inside a required legal region.
- **Fault isolation** prevents one hardware failure from making the whole service unavailable.

Distribution also creates costs that a single node does not have:

- Networks delay, duplicate, reorder, and sometimes lose messages.
- Machines fail independently and can restart with older durable state.
- Clocks disagree, so wall-clock timestamps alone cannot safely order concurrent writes.
- Cross-node joins and transactions require extra round trips and coordination.

```mermaid
flowchart LR
    Client["Application requests"] --> Router["Database router"]
    Router --> SA["Shard A"]
    Router --> SB["Shard B"]
    SA --> RA["Replica A2"]
    SB --> RB["Replica B2"]
    SA -. "replication" .-> RA
    SB -. "replication" .-> RB
    SA -. "cross-shard coordination" .-> SB
```

The application sees one logical database while routing, replication, and transaction layers hide
several physical failure domains.

### Scaling Out: Vertical vs Horizontal

**Vertical scaling** replaces one server with a larger server: more CPU, RAM, disk, or network capacity. It preserves local semantics, but hardware has a ceiling and remains one failure domain.

**Horizontal scaling** adds servers, increasing aggregate storage, writes, and reads while requiring explicit placement, rebalancing, failure detection, and consistency rules.

| Dimension | Vertical scaling | Horizontal scaling |
|---|---|---|
| Capacity change | Upgrade one machine | Add or remove machines |
| Application complexity | Usually low | Higher: routing and coordination |
| Practical ceiling | Largest available machine | Many commodity nodes |
| Failure domain | One large server | Multiple independent nodes |
| Transaction cost | Local memory and disk | May include network consensus |
| Best first step | Most systems | When one node or one region is insufficient |

Scale up first when economical. Premature sharding creates complexity that a larger instance and read replicas may have avoided.

### Replication, Primaries, and Read Replicas

In **primary-replica replication**, writes go to one primary, which sends its ordered change log
to replicas for replay.

A **read replica** serves workloads that tolerate lag; it does not scale writes because write order still passes through the primary.

Replication may acknowledge at different durability points:

1. **Asynchronous replication** acknowledges after the primary commits locally.
   It is fast, but immediate failover can lose writes that had not reached a replica.
2. **Semi-synchronous replication** waits for at least one replica to receive or durably store the
   log record.
   The exact acknowledgement matters: MySQL 8.4 semi-sync waits for a flushed replica relay log, not query visibility, and can fall back to async after timeout. It reduces loss risk only while that policy is actually satisfied; monitor fallback and choose the failover replica accordingly.
3. **Synchronous replication** waits for every required replica or a quorum.
   Protection depends on durable acknowledgements, failover selection and supported failures; waiting for receipt is not waiting for replay. In PostgreSQL 16, `remote_apply` waits for replay on required standbys. Slow or partitioned required replicas can delay or stop writes.

Safe failover must establish an eligible durable history, fence the old primary and redirect clients. A replica that merely looks newest is not proof that it contains every acknowledged write; replication policy and promotion rules must agree.

### Sharding and Partitioning

**Horizontal partitioning** assigns rows by a rule such as `hash(customer_id)` or date range.
**Vertical partitioning** splits columns or table groups, keeping hot profile fields apart from large documents or audit details.

Common horizontal strategies are:

| Strategy | Placement rule | Strength | Failure mode |
|---|---|---|---|
| Range | Ordered key intervals | Efficient range scans | Sequential keys create a hot shard |
| Hash | Hash of shard key | Even distribution | Range scans become scatter-gather |
| Directory | Lookup service maps key to shard | Flexible movement | Extra hop and directory dependency |
| Geography | User or tenant region | Data locality | Cross-region operations are expensive |

A good shard key distributes traffic and co-locates rows that transact or join; a bad one causes
hot partitions and cross-shard work.

### Local and Distributed Transactions

A local transaction changes one node's data, so local ACID machinery and WAL are sufficient.

A distributed transaction spans participants. A transfer across shards requires debit and credit
to reach the same final decision despite shard or network failure.

Atomic commitment asks a binary question:

> Can every participant commit, or must every participant abort?

Two-phase commit answers that question through a coordinator. Consensus systems solve a related
but different problem: several replicas agree on one ordered decision even when a minority fails.

---

## 🟡 Intermediate Level

### Replication Flow, Lag, and Failover

The primary assigns every write an ordered log position. Depending on configuration, a replica
acknowledges receipt, durable storage, or application, and each point implies different guarantees.

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant P as Primary
    participant R1 as Replica 1
    participant R2 as Replica 2
    C->>P: Write order 842
    P->>P: Append and flush log
    par Replicate
        P->>R1: Log entry 842
        P->>R2: Log entry 842
    end
    R1-->>P: Durable acknowledgement
    P-->>C: Commit acknowledged
    R2-->>P: Delayed acknowledgement
```

If the client reads immediately from replica 2, it may not yet see order 842.
Mitigations include:

- route read-after-write traffic to the primary;
- carry a log-position token and wait until the chosen replica reaches it;
- use sticky sessions for a bounded workflow;
- request a quorum or linearizable read where the database supports it.

Measure replica lag in bytes and time: 5 MB may be minutes stale in quiet traffic, while 500 MB may
represent only seconds during a burst.

Failover has two distinct objectives:

- **RTO**, the recovery-time objective, measures how long service is unavailable.
- **RPO**, the recovery-point objective, measures how much acknowledged data can be lost.

Async replication permits nonzero RPO; it does not guarantee short RTO. Detection, fencing, promotion and routing determine recovery time. Durable synchronous quorums can preserve acknowledged writes under their failure assumptions but reject writes during a partition.

### Shard Routing and Consistent Hashing

Naive `hash(key) mod N` routing remaps most keys when the node count changes, causing migration
storms and cache misses.

Consistent hashing places nodes and keys on a ring. A key belongs to the next clockwise node, so a
new node takes neighboring ranges rather than remapping the entire keyspace.

```mermaid
flowchart LR
    K1["Key at token 12"] --> N1["Node A at 20"]
    K2["Key at token 31"] --> N2["Node B at 45"]
    K3["Key at token 66"] --> N3["Node C at 80"]
    K4["Key at token 91"] --> N1
    Join["New node at 60"] -. "takes part of B to C range" .-> N3
```

Many **virtual nodes** per server reduce variance, allow weighted ownership, and make rebalancing
incremental.

Consistent hashing does not solve every placement problem:

- A popular key remains hot even if overall data is evenly distributed.
- Replicas must be placed across racks or zones, not merely on adjacent ring positions.
- Rebalancing consumes network and disk bandwidth and should be rate-limited.
- Membership needs epochs or consensus so partitioned sides do not calculate different owners.

### Connection Pooling and Caching in a Distributed Database

If 40 application instances each open 100 connections, the cluster has 4,000 sessions before any
request executes.

A pool limits concurrent sessions and reuses authenticated connections:

- size the pool from database concurrency capacity, not from HTTP request count;
- set acquisition and statement timeouts so overload fails quickly;
- maintain separate limits for transactions and long analytical queries;
- make the pool topology-aware so it does not keep sending traffic to a demoted primary.

Pooling reduces setup overhead but does not add database CPU or lock capacity; oversized pools
increase context switching, memory pressure, and tail latency.

Caches reduce repeated reads but introduce another copy of data:

- **Cache-aside** loads on a miss and invalidates after writes.
- **Read-through** delegates loading to the cache layer.
- **Write-through** routes writes through a cache/storage integration; atomicity depends on that implementation, not the name.
- **TTL-based caching** limits reuse under a defined expiration policy, but refresh races or resetting an old value
  can extend staleness. TTL alone is not an end-to-end freshness bound.

During failover, stale cache entries can outlive the old primary. Versioned values, short TTLs,
and commit-linked invalidations reduce risk; balances must not trust an unverified cache copy.

### Two-Phase Commit: Prepare and Decide

Two-phase commit, or **2PC**, has one coordinator and multiple participants, each with a local
transaction and durable log.

```mermaid
sequenceDiagram
    autonumber
    participant C as Coordinator
    participant A as Shard A
    participant B as Shard B
    C->>A: PREPARE transaction 71
    C->>B: PREPARE transaction 71
    A->>A: Validate, lock, flush PREPARED
    B->>B: Validate, lock, flush PREPARED
    A-->>C: VOTE YES
    B-->>C: VOTE YES
    C->>C: Flush GLOBAL COMMIT
    C->>A: COMMIT transaction 71
    C->>B: COMMIT transaction 71
    A-->>C: ACK
    B-->>C: ACK
```

**Phase 1: prepare or vote**

1. The coordinator records that the distributed transaction began.
2. It sends `PREPARE` to every participant.
3. Each participant validates constraints, retains required locks and durably records enough local
   transaction/recovery state to honor the eventual decision after restart; undo/redo details depend on the engine.
4. It records `PREPARED` before voting yes.
5. Any participant that cannot prepare votes no.

**Phase 2: decision**

1. Before a final decision, a no vote or prepare timeout allows global abort; a timeout cannot overturn an already durable commit.
2. Only unanimous yes votes allow it to durably record global commit.
3. The coordinator sends the recorded decision until every participant acknowledges it.
4. Participants commit or roll back locally, release locks, and remember the outcome for retries.

Log ordering provides correctness: participants vote yes only after durable prepare, and the
coordinator announces commit only after durably recording the global decision.

### Why 2PC Blocks

After voting yes, a participant without authoritative decision evidence cannot choose on its own:

- aborting could contradict a global commit already recorded elsewhere;
- committing could contradict a no vote that forced global abort.

If the coordinator is unreachable, the participant is **in doubt** and keeps locks. PostgreSQL
shows it in `pg_prepared_xacts`; resolve it only after establishing the global outcome.

For an illustrative path with two 1-ms round trips and three serial 0.5-ms flushes, the estimated latency is:

$$
2(1\text{ ms}) + 3(0.5\text{ ms}) = 3.5\text{ ms}
$$

At an 80 ms inter-region RTT, the network portion becomes 160 ms while locks remain held.
This is not a universal 2PC lower bound: parallel preparation, batching and acknowledgement policy change the path. Co-location can reduce network time; sagas/outboxes replace cross-boundary atomicity with coordinated local commits and different failure semantics.

### Three-Phase Commit and Consensus-Based Decisions

Three-phase commit, or **3PC**, adds `PRECOMMIT`; a participant there can infer more from a
timeout than a merely prepared 2PC participant.

| Property | 2PC | 3PC | Consensus-replicated decision |
|---|---|---|---|
| Main phases | Prepare, decide | CanCommit, precommit, doCommit | Propose and replicate log entry |
| Coordinator crash | Can block | Nonblocking under narrow assumptions | New leader recovers decision |
| Network partition | Blocks safely | Can split into conflicting decisions | Majority side progresses |
| Agreement requirement | All participants prepare | All participants across three phases | Decision-replica majority; commit still requires every participant to prepare |
| Typical use | XA and prepared transactions | Mostly academic | Raft/Paxos database control planes |

3PC assumes bounded delays and fail-stop failures. Async networks cannot distinguish a crash from
a partition, so independent timeout decisions can split history.

Consensus replicates the decision for leader recovery, but does not remove cross-shard atomic
commit; Spanner and CockroachDB still coordinate transactions spanning consensus ranges.

### Worked Quorum and Partition Example

Let a record have $N = 5$ fixed home replicas: A, B, C, D and E. Assume ordered versions,
no concurrent/partial newer write and no sloppy quorum. Version 42 is acknowledged after $W = 3$ stores; a read consults $R = 3$ replicas.

Two intersection rules matter:

$$
R + W > N
$$

ensures every read set intersects the most recent acknowledged write set, while

$$
W > \frac{N}{2}
$$

ensures two successful write sets cannot be disjoint.

Suppose version 42 reaches A, B, and C before the network partitions:

| Replica | A | B | C | D | E |
|---|---:|---:|---:|---:|---:|
| Stored version | 42 | 42 | 42 | 41 | 41 |

Now follow concrete reads:

1. A read from C, D, and E observes versions 42, 41, and 41.
   It returns version 42 because the read set intersects the write set at C.
2. A read with $R = 1$ that reaches D returns stale version 41.
   The configured quorum guarantee did not apply because the client requested only one replica.
3. A new write needs any three replicas.
   A partition containing only D and E has two nodes, so it cannot acknowledge a conflicting
   quorum write.
4. The A-B-C side has three nodes and can continue reading and writing.
   The D-E side must reject quorum operations or explicitly fall back to weaker consistency.

The minimum $R + W$ for $N = 5$ is 6, not 5. Common choices include:

| Configuration | Read behavior | Write behavior | One-node failure |
|---|---|---|---|
| $R=1, W=5$ | Lowest read latency | Waits for every replica | Writes unavailable |
| $R=3, W=3$ | Majority read | Majority write | Both remain available |
| $R=5, W=1$ | Waits for every replica | Lowest write latency | Reads unavailable |

Quorum intersection alone is not a complete consistency proof. The system also needs version
ordering, conflict resolution, stable membership, and rules preventing a stale leader from
accepting writes.

**Predict/change/debug:** Now let a new, unacknowledged version 43 reach only C. A read from C-D-E can return 43; a later read from A-B-D can return 42 if it merely chooses the highest returned version. Both reads contact three replicas. Why is this backward result possible? Read/write set overlap covers completed quorum writes, while the partial write never reached one. A protocol needs additional commit/read-repair rules to prevent this inversion; increasing R alone is not a full proof.

---

## 🔴 Expert Level

### CAP Under a Real Network Partition

The CAP theorem concerns an asynchronous distributed system during a network partition:

- **Consistency** means linearizability: each operation appears to take effect atomically in one
  real-time order.
- **Availability** means every request received by a nonfailed node eventually returns a
  valid operation response; returning only an error does not satisfy the guarantee. This is termination, not a bounded response-time SLA.
- **Partition tolerance** means the system continues operating despite lost or indefinitely
  delayed messages between groups of nodes. It is the failure model under which the other guarantees are requested, not a promise that every partition can keep both.

```mermaid
flowchart TD
    P["Network partition separates replicas"] --> Choice{"What does an isolated side do?"}
    Choice -->|"Reject or wait"| CP["Preserve one linearizable history"]
    Choice -->|"Accept independently"| AP["Remain available with possible divergence"]
    CP --> CostC["Unavailable operations on minority side"]
    AP --> CostA["Conflict detection and reconciliation after healing"]
```

Partition tolerance is not a feature switch in a multi-node system; partitions happen.
The choice during the partition is whether an isolated side rejects operations to preserve one
history or accepts operations that may require later reconciliation.

CAP does not say a database chooses exactly two letters forever. Real systems choose guarantees
per operation: a ledger debit may require a majority, while a product-view counter accepts local
writes and converges later.

**PACELC** adds normal operation: if there is a Partition, trade Availability against Consistency;
Else, trade Latency against Consistency. Even without failures, a cross-region linearizable write
waits for communication that an eventually consistent local write avoids.

### Consistency Spectrum

Consistency is not only “strong” or “eventual”:

| Guarantee | Observable promise | Typical mechanism |
|---|---|---|
| Linearizable | Operations respect real-time order globally | Leader or quorum plus fencing |
| Sequential | One global order preserves each client's order | Ordered replicated log |
| Causal | Causes are visible before their effects | Causal metadata or dependency tracking |
| Read-your-writes | A session sees its own committed changes | Session token or leader pinning |
| Monotonic reads | A session never moves backward in versions | Minimum-version token |
| Bounded staleness | Reads lag by at most time or versions | Lag-aware routing |
| Eventual | Replicas converge after writes stop | Anti-entropy and conflict resolution |

**Strong consistency** usually refers to linearizable reads and writes, but product documentation
must name the exact guarantee. **Eventual consistency** promises convergence when communication/repair resumes and updates stop, not a maximum delay or preservation of a business invariant.

**BASE** contrasts a common availability-oriented model with strict transactional expectations:

- **Basically Available** means the service aims to respond despite partial failures.
- **Soft state** means replicas and caches may change as background propagation continues.
- **Eventual consistency** means copies converge when no new updates arrive.

BASE does not remove business invariants. It moves reconciliation, idempotency, and conflict rules
into the data model and application workflow.

### Quorum Consensus and Failure Trade-offs

A quorum protocol typically routes writes through a leader or coordinates replica responses using
versions. Majority intersection prevents disjoint majorities within fixed membership, but nodes can accept multiple values over time. A consensus voting/ordering protocol is what prevents incompatible decisions, not counting responses alone.

Production failure cases include:

1. **Stale leader**: an old leader resumes after a long pause and sends writes.
   Storage nodes must reject its lower fencing epoch.
2. **Sloppy quorum**: temporary non-home replicas accept hinted writes for availability.
   The usual $R + W > N$ home-set intersection may not hold until hinted handoff completes.
3. **Divergent membership**: each partition calculates quorum from a different cluster size.
   Joint-consensus membership changes prevent both views from claiming a majority.
4. **Clock-based last-write-wins**: a fast clock can overwrite a causally newer value.
   Logical/hybrid clocks can encode ordering metadata, but do not by themselves preserve balances or resolve conflicting intent. Choose an application merge or conditional transaction that preserves the invariant.
5. **Tail amplification**: a request that waits for three replicas inherits the slowest required
   response, increasing p99 latency even when the median is low.

Anti-entropy compares replica state in the background, often using Merkle trees to locate differing
ranges. Read repair updates stale copies discovered during a read. Neither mechanism makes a weak
read linearizable at the moment it returns.

### Distributed Transactions Without Long-Lived 2PC

Cross-service 2PC is often unavailable because message brokers, payment providers, and external
APIs do not share one transaction manager. Two common alternatives are:

- A **saga** commits a sequence of local transactions and invokes compensating actions when a later
  step fails. Compensation restores a business outcome but may not recreate the exact previous
  state.
- A **transactional outbox** writes domain state and an outbound event in one local transaction.
  A relay publishes the event at least once, and consumers deduplicate by event ID.

```mermaid
sequenceDiagram
    autonumber
    participant API as Order API
    participant DB as Local database
    participant Relay as Outbox relay
    participant Bus as Event broker
    participant Consumer as Consumer
    API->>DB: Commit order and outbox row atomically
    DB-->>API: Local commit succeeds
    Relay->>DB: Read unpublished rows
    Relay->>Bus: Publish event with idempotency key
    Bus->>Consumer: Deliver at least once
    Consumer->>Consumer: Deduplicate and apply
```

“Exactly once” across arbitrary side effects is not a network guarantee.
Effectively-once behavior combines durable state, at-least-once retries, idempotency keys, and
consumer-side deduplication. Commit a processed-event marker and its local effect together; marking before the effect can lose it after a crash, while marking separately afterwards allows duplication. External effects require their own coordination.

### Production Design and Operational Signals

Distributed-database incidents usually reveal missing operational guarantees rather than missing
definitions. Track:

- replication lag by bytes, seconds, and log position;
- current leader term and rejected stale-epoch writes;
- prepared-transaction count and oldest prepared age;
- quorum success, timeout, and fallback rates;
- per-shard size, request rate, and hot-key concentration;
- connection-pool utilization and acquisition wait;
- cache hit rate, invalidation lag, and stale-read reports;
- rebalance traffic and remaining token ranges.

For a financial ledger, keep authoritative balance writes on a CP path with quorum durability and
fencing. Use asynchronous replicas and caches for statements or analytics only when their
staleness is visible and acceptable.

For globally distributed collaboration or feeds, availability may be more valuable. Use
operation-specific conflict semantics such as commutative counters, sets, or CRDTs instead of
blind last-write-wins.

### Common Misconceptions

1. **“A read replica always returns the latest committed write.”**
   An asynchronous replica can lag even when it is healthy.
   Read-after-write requires leader routing, a version token, or a consistency level that waits for
   the required log position.

2. **“CAP means every database permanently chooses two of three features.”**
   CAP constrains behavior during a partition, and partition tolerance is unavoidable once nodes
   communicate over a fallible network.
   Systems make different consistency and availability choices per operation.

3. **“If $R + W > N$, reads are automatically linearizable.”**
   Intersection finds at least one overlapping copy only when replica sets, membership, version
   order, and failure handling satisfy the model.
   Sloppy quorums, stale leaders, or last-write-wins clock errors can still violate expectations.

4. **“Three-phase commit solves 2PC blocking in production networks.”**
   3PC avoids blocking only with bounded-delay and fail-stop assumptions.
   Under a network partition, timeout-driven participants can make conflicting decisions.

5. **“Connection pooling and caching make an overloaded database horizontally scalable.”**
   A pool reduces connection setup and caps concurrency, while a cache avoids selected reads.
   Neither adds write capacity or removes hot shards, locks, and replication bottlenecks.

### Interview Questions

**Q1. What is the difference between replication and sharding?** `[easy]`

Replication copies the same data for availability and read scaling. Sharding divides data to scale storage and writes. Production systems often replicate every shard.

**Q2. Why is two-phase commit considered a blocking protocol?** `[easy]`

After durably voting yes, a participant needs authoritative evidence of the global decision. If neither the coordinator nor another reliable decision source is reachable, it must remain in doubt and retain resources. Blocking preserves atomicity but can turn one failure into lock pile-ups; unilateral timeout rollback is unsafe.

**Q3. What happens when one participant votes abort during 2PC prepare?** `[easy]`

The coordinator chooses global abort because commit requires unanimous yes votes. It durably records and broadcasts abort, including to prepared participants. They roll back and release locks; dropping the failed node and committing would violate atomicity.

**Q4. What is the minimum value of $R + W$ for $N = 5$ replicas?** `[easy]`

The minimum sum is 6 because $R + W > N$, not greater than or equal to $N$. Examples are $R=3, W=3$ and $R=2, W=4$. Correct versioning, membership, and conflict handling are still required.

**Q5. Compare vertical scaling with horizontal scaling for a database.** `[medium]`

Vertical scaling grows one machine and preserves simple local behavior. Horizontal scaling exceeds one server's capacity but adds routing, replication, rebalancing, and failure modes. Scale up until capacity or availability justifies scale-out complexity.

**Q6. Why can an acknowledged asynchronous write disappear after failover?** `[medium]`

The primary may acknowledge locally before any replica receives the change. If it fails permanently, the promoted replica's log can end before that entry. Durable replica acknowledgements plus compatible promotion rules lower loss risk. Semi-sync timeout fallback or promoting an unacknowledged replica can still lose data.

**Q7. What is PACELC, and how does it extend CAP?** `[medium]`

PACELC says Partition means Availability versus Consistency; Else means Latency versus Consistency. CAP covers only the partition case, while PACELC exposes healthy-day coordination cost. Cross-region quorum writes therefore pay network RTT without any failure.

**Q8. Why does consistent hashing use virtual nodes?** `[medium]`

Few ring positions create uneven ranges and traffic. Virtual nodes smooth distribution, support capacity weighting, and make rebalancing incremental. They do not solve a hot individual key.

**Q9. Compare 2PC, 3PC, and a consensus-replicated commit decision.** `[medium]`

2PC is common but can block after prepare. 3PC avoids blocking only under assumptions that real partitions violate. Raft or Paxos lets a majority recover a replicated decision, though cross-shard atomicity still needs coordination.

**Q10. How do connection pooling and caching affect distributed-database performance?** `[medium]`

A pool amortizes setup and bounds sessions. A cache removes selected reads but creates staleness and invalidation duties. Oversized pools or authoritative mutable cache entries can worsen latency and correctness.

**Q11. Why is quorum intersection insufficient by itself to prove linearizability?** `[hard]`

$R + W > N$ proves set overlap under stable membership. It does not order concurrent values, fence stale leaders, or constrain sloppy quorums. Linearizability also needs a protocol respecting real-time completion through failures.

**Q12. Scenario: a user updates a profile and immediately reads the old value from another region. What do you investigate?** `[hard]`

Compare the write's log position with the remote replay position and confirm the requested consistency. Inspect cache invalidation, pool routing, and the session's read-your-writes token. Leader-pinned reads, minimum-version tokens, or replica waiting fix it with latency or availability costs.

**Q13. Scenario: 400 PostgreSQL prepared transactions hold locks after a deployment. How do you recover safely?** `[hard]`

Inspect prepared IDs/age, coordinator availability and its durable decision log; the decision may already exist even if delivery failed. Apply `COMMIT PREPARED` or `ROLLBACK PREPARED` only after establishing the matching global outcome, not from age alone. Monitor locks and vacuum impact, repair coordinator recovery, and keep prepare disabled where no real coordinator exists.

**Answer rubric**
- **Say it:** A prepared participant must resolve from the global outcome, not guess from a timeout.
- **Mechanism:** Match the transaction ID to durable coordinator evidence, then deliver that decision idempotently.
- **Example:** Commit recorded before a lost reply still means commit; timing out cannot change it to abort.
- **Limit:** Missing authoritative evidence leaves the participant blocked and requires recovery/escalation.
- **Watch for:** Killing the original session or blindly rolling back every old prepare does not establish the outcome.
- **Follow-up:** What if one shard applied commit but another remains prepared?

**Q14. Scenario: both sides of a network partition accepted conflicting wallet debits. Which invariants failed?** `[hard]`

Check split-brain membership, quorum policy and stale-primary fencing, but also the debit transaction itself. Two callers can each read balance 100, approve a debit of 80 and overwrite with 20 even when individual reads/writes use proper quorums; the combined check-and-update was not atomic. Preserve the invariant with a supported conditional update or serializable transaction and retry/deduplication policy; membership repair alone cannot undo an uncoordinated external payment.

### Further Reading

- [Formal proof of Brewer's CAP conjecture](https://groups.csail.mit.edu/tds/papers/Gilbert/Brewer6.pdf)
- [Amazon Dynamo design paper](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)
- [Google Spanner design paper](https://research.google/pubs/spanner-googles-globally-distributed-database-2/)
- [PostgreSQL two-phase transaction documentation](https://www.postgresql.org/docs/16/two-phase.html)
