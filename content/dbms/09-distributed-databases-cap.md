# Distributed DBMS, 2-Phase Commit (2PC) & CAP Theorem

## 🟢 Beginner Level

### The Group Trip Analogy
Five friends plan a non-refundable group booking. The organizer texts everyone: "Reply YES only if you can pay your share today." Once all five say YES, the organizer announces BOOKED and everyone pays. Now the failure mode that defines this entire topic: the organizer's phone dies right after collecting the five YES votes but before announcing the decision. Nobody can safely pay (maybe others dropped out?) and nobody can safely cancel; everyone is stuck holding their money and their calendar block. That frozen limbo is exactly what 2PC participants experience when a coordinator crashes mid-decision. And if two friends become unreachable by phone (a network partition), the group must choose: proceed with whoever answers (available, possibly wrong totals) or halt until everyone is reachable again (consistent, unavailable). That choice is the CAP theorem.

### Scaling Out: Vertical vs Horizontal

```
   VERTICAL SCALING (Scale-Up)            HORIZONTAL SCALING (Scale-Out)
   +--------------------------+           +----------+   +----------+   +----------+
   │  Bigger box: more CPU,   │     vs    │  Node 1  │   │  Node 2  │   │  Node 3  │
   │  more RAM, faster disk   │           +----------+   +----------+   +----------+
   │  (hard ceiling, SPOF)    │           (partition data, replicate for HA)
   +--------------------------+
```

- **Replication**: copying the same dataset to multiple nodes so reads scale and failures are survivable. Leader-follower replication streams changes from one primary to replicas; synchronous replication waits for followers (safer, slower), asynchronous returns immediately (faster, risks losing recent writes on failover; typical lag is milliseconds locally, seconds cross-region).
- **Partitioning (Sharding)**: splitting a large table across nodes by key range or hash bucket. Queries touching one shard stay fast; queries without the shard key become scatter-gather fan-outs whose cost grows with shard count.

### Data Placement Vocabulary
1. **Replication factor (RF)**: how many copies of each piece of data exist.
2. **Shard key**: the column whose value routes a row to a node; choosing it well keeps related rows together.
3. **Rebalancing**: moving partitions when nodes join or leave; cheap schemes move little data, naive modulo hashing moves almost everything.
4. **Failover**: promoting a replica when a leader dies; its safety depends entirely on the replication mode below.

### Why Distributed Transactions Exist
A bank shards customers across three nodes. A transfer from customer A (node 1) to customer B (node 3) must debit and credit atomically, but the two rows live on different machines with independent disks that can crash independently. Local ACID cannot span machines; you need a distributed atomic-commit protocol.

## 🟡 Intermediate Level

### Two-Phase Commit: Complete Message Walkthrough
Coordinator C coordinates participants P1 and P2. Every participant owns local locks and its own durable log; "fsync" means the record reached stable storage.

```
   PHASE 1: PREPARE / VOTING
   COORDINATOR C                        PARTICIPANT P1            PARTICIPANT P2
   --------------                       --------------            --------------
   append START-2PC to log (fsync)
   send PREPARE ----------------------> received PREPARE
                                        acquire/verify needed locks,
                                        flush local redo+undo records
                                        append PREPARED to log (fsync)
                                        send VOTE-YES -----------\
                                        send VOTE-YES ------------------------> same steps at P2
   collect all votes
   PHASE 2: DECIDE / COMMIT   (only if every vote was YES)
   append GLOBAL-COMMIT decision to log (fsync)
   send GLOBAL-COMMIT ----------------> append COMMIT, apply changes,
                                        release locks, ACK
   send GLOBAL-COMMIT -------------------------------------------> same, then ACK
   receive all ACKs
   append DONE to log (protocol complete)
   ONE NO VOTE ANYWHERE => decision becomes GLOBAL-ABORT, sent identically.
```

Rules that make it correct:
1. A participant may unilaterally abort any time BEFORE voting YES; after voting YES it has surrendered the decision.
2. The coordinator's decision-log write (fsync) happens BEFORE broadcasting GLOBAL-COMMIT, so once decided, the decision survives coordinator crashes.
3. A voted-YES participant must remain blocked (locks held) until it learns the decision; it may ask nobody else, because no other process knows it either.

### Failure Case 1: Someone Votes No
P2 hits a constraint violation during PREPARE, appends ABORTED, replies VOTE-NO. The coordinator broadcasts GLOBAL-ABORT; P1 releases locks and rolls back. Fast, clean, nobody blocks beyond message latency.

### Failure Case 2: Coordinator Crashes in the Decision Window (the in-doubt state)
Timeline of the dangerous window:

| Step | Event | State Afterwards |
| --- | --- | --- |
| 1 | P1, P2 both vote YES, holding prepared locks | Both locked, waiting |
| 2 | Coordinator receives both YES votes | Nothing decided yet |
| 3 | Coordinator machine loses power BEFORE appending its decision | Decision exists nowhere on disk |
| 4 | Participants time out, query coordinator, get no answer | Indefinitely blocked |

Participants cannot commit (another participant might have voted NO) and cannot abort (the decision might have been COMMIT). This **in-doubt** state holds all row locks, blocking unrelated transactions behind them, until the coordinator recovers or an operator applies a heuristic resolution.

Blocking-window math worth quoting: suppose the decision window averages 10 ms and traffic is 10,000 commits per second through this coordinator. The fraction of time the system sits inside the dangerous window is 10 ms times 10,000 per second, about 10 percent of wall-clock time. With a coordinator failing once every 30 days, roughly one crash in ten lands mid-decision, so expect a blocking incident a few times per year; each incident freezes about window-times-rate, around 100 in-flight prepared transactions' locks, until manual intervention. Rare per transaction, operationally expensive per incident.

### Failure Case 3: Participant Crashes After Voting Yes
On restart the participant finds PREPARED in its log with no decision. It enters recovery: repeatedly contact the coordinator (or a human consulting the coordinator's log), and never guess. If the coordinator's log shows GLOBAL-COMMIT, commit locally; if unreachable, keep locks and retry. Databases expose this machinery operationally: PostgreSQL `pg_prepared_xacts` with `COMMIT PREPARED` / `ROLLBACK PREPARED`, MySQL `XA RECOVER` followed by `XA COMMIT` / `XA ROLLBACK`.

### Cost Accounting: Why Teams Avoid Cross-Shard Transactions
One distributed commit costs 4 messages plus forced fsyncs: the coordinator's decision log plus each participant's prepare and commit logs, so latency approximates 2 RTT + 3 fsyncs. Intra-region (RTT 0.5 ms, fsync 0.5 ms): roughly 3 ms, tolerable. Cross-region (RTT 40 ms): well over 100 ms while holding locks throughout, which is why architects prefer designing shard keys so related rows share a node, or use sagas instead.

### Three-Phase Commit (3PC)
3PC inserts a PreCommit stage: CanCommit, PreCommit, DoCommit. Timeouts now carry meaning: a participant already in PreCommit that hears nothing concludes the coordinator died after a unanimous YES and may safely commit; a participant still in CanCommit times out toward abort. This removes blocking under single-crash failures, but only under fail-stop assumptions: if a network partitions and an old coordinator keeps operating, a healed partition can produce two coordinators issuing opposite decisions (split brain). Because real networks partition, almost no production system ships textbook 3PC; they ship consensus-based commit instead.

### Quorum Consensus: R + W > N
For N replicas where a write acknowledges from W replicas and a read consults R:

```
   TWO CONSTRAINTS
   1)  R + W > N      every read set intersects every write set
                      => reads always see the latest acknowledged value
   2)  W > N / 2      every pair of concurrent write sets intersects
                      => conflicting writes are detected and ordered,
                         never silently applied on disjoint replicas
```

Consistency check with versions, worked concretely: replicas A, B, C hold balance values tagged with version numbers. A write of balance = 90 (version 8) was acknowledged by A and B; replica C missed it and still holds version 7 (value 70).
1. Read with R = 2 landing on {A, B}: both report v8; return 90, trivially consistent.
2. Read landing on {B, C}: versions {8, 7}; newest version wins, return 90, and a background **read repair** copies v8 to C.
3. Read with R = 1 hitting C alone: returns stale 70. Quorum guarantees bind only when R and W actually form quorums, which is precisely why R = 1 trades consistency for latency.
Dynamo-style systems tag values with vector clocks so concurrent writers create detectable siblings rather than silent overwrites; application logic or last-write-wins reconciles them. Background anti-entropy (Merkle-tree comparisons between replicas) plus hinted handoff converge missed writes after failures heal.

Configuration trade-offs:

| Configuration | Read Latency | Write Latency | Availability Under Failures |
| --- | --- | --- | --- |
| N=3, R=1, W=3 | Fastest: one replica answers | Slowest-of-3; stalls if any node down | Writes die with one node loss |
| N=3, R=2, W=2 | Moderate: max of 2 parallel RPCs | Moderate | Tolerates 1 node down fully |
| N=5, R=2, W=3 | Fast-ish reads (6 > 5 holds) | Moderate; tolerates 2 down for reads, 1 for writes | Balanced for read-heavy loads |

Latency reality check: reading from R replicas issues R parallel RPCs and waits for the slowest of them (tail amplification: per-replica p99 of 10 ms yields worse than 10 ms p99 for R = 2), and cross-region quorums pull inter-region RTT (70 to 100 ms) into the tail. This is the everyday shape of the consistency tax even with zero partitions.

### CAP Theorem, Stated Precisely
Gilbert and Lynch formalized Brewer's conjecture: in an asynchronous network where messages can be lost or delayed, no system can simultaneously provide linearizable consistency and total availability while tolerating partitions. During a partition a system must reject operations somewhere (choosing C) or accept them everywhere (choosing A).

```
                    Consistency (C)
                    linearizability
                   /               \
                  /                 \
                 /                   \
                /                     \
     Availability (A) ---------- Partition tolerance (P)
     always respond             survive message loss
```

CAP misconceptions worth correcting on sight:
1. "CP systems are always consistent." False. CAP says nothing about normal operation; outside partitions every system faces a latency-versus-consistency choice (that is PACELC). A CP label does not buy strong reads at low latency on an ordinary Tuesday.
2. "My architecture is CA." Impossible among replicated nodes connected by fallible networks; CA effectively means one node. P is not optional because partitions, GC pauses, and dead switches happen regardless of your diagram.
3. CAP-C equals linearizability, not ACID consistency, and not read-your-writes.
4. AP does not mean permanently divergent garbage; it means available-but-stale responses during the partition, converging afterwards via anti-entropy, with staleness bounds usually undocumented until you measure them.
5. Real deployments choose per operation: payment authorization versus telemetry need different answers from the same cluster.

### PACELC
Abadi's extension: IF there is a Partition, choose Available or Consistent; ELSE (normal operation), choose Latency or Consistency. Concrete deltas:
1. Cassandra at consistency level ONE acknowledges a local write in about 1 ms; QUORUM adds a second replica round trip, roughly doubling write latency, and cross-datacenter EACH_QUORUM pushes toward 100 ms.
2. DynamoDB eventually-consistent reads hit one replica; strongly-consistent reads hit a quorum, costing roughly double read latency plus tail amplification.
3. Spanner always pays consensus: every write is a Paxos round (one RTT within a region, tens of ms across regions) plus TrueTime commit-wait, buying external consistency unconditionally.
Classification shorthand: Spanner is PC/EC; MongoDB defaults PC/EC (majority write concern); Cassandra and vintage Dynamo are PA/EL tunable per request.

### Replication Modes and What Failover Costs
1. **Fully synchronous**: leader waits for all followers; zero data loss but any laggard stalls writes. Rare outside small quorum clusters.
2. **Semi-sync**: wait for exactly one follower's receipt acknowledgment; bounds loss to zero under single-failure scenarios, degrades gracefully to async if the follower stalls (MySQL semi-sync does exactly this).
3. **Asynchronous**: acknowledge immediately; failover after a leader crash can lose the last few hundred milliseconds of acknowledged writes (RPO measured in seconds worst-case), which auditors treat very differently from mode 2.

### Sharding Strategies and Their Failure Modes
1. **Range partitioning**: rows ordered by key across shards; efficient range scans, but monotonically increasing keys (timestamps, ids) hammer the last shard as a permanent hotspot.
2. **Hash partitioning**: hash(key) spreads load evenly; kills hotspots but destroys range-scan locality.
3. **Directory lookup**: a service maps keys to nodes; maximally flexible, adds a lookup hop and a new failure point.
4. **Consistent hashing** fixes rebalancing pain: nodes sit on a ring, each key belongs to the next node clockwise, so adding a node steals only one neighbor arc instead of rehashing the world. Virtual nodes (hundreds of ring positions per physical node) smooth load variance.

```
            CONSISTENT HASHING RING
                  0 degrees
                     .
               .           .
            nA               nB
            .       .       .
               .         .
            nD               nC
                     .
                 180 degrees
   a key hashes onto a circle position;
   the next node clockwise owns it;
   adding node C moves only the arc between its neighbors.
```

### Gossip and Cluster Membership
Quorums presuppose agreement about WHO is in the cluster, which itself must survive partitions. Decentralized systems (Cassandra, Dynamo) gossip membership state: each node periodically exchanges small state vectors with random peers, so full knowledge spreads in roughly log(N) rounds; nodes mark peers dead after a timeout of a few seconds, then rejoin them when gossip proves otherwise. The subtle failure: two sides of a partition can each evict the other and keep operating on shrunken membership, silently converting strict quorums into sloppy ones unless token-aware placement resists it.

### Consistency Spectrum
Linearizable (strongest: real-time ordering) gives way to sequential (per-process order preserved, no global clock), causal (cause precedes effect), read-your-writes and monotonic-reads (session guarantees), and eventual (convergence given no new writes). Most "eventual consistency outages" reported in practice are really missing session guarantees: a user writes through replica X then reads from replica Y. Sticky sessions, monotonic-read tokens, or leader-pinned reads fix it cheaply.

## 🔴 Expert Level

### Production 2PC: Logs, Recovery, Heuristics
The protocol's correctness lives entirely in logging discipline: participants fsync PREPARED before voting YES, the coordinator fsyncs its decision before sending it, and recovery replays those logs after crashes. Operations teams meet the theory as orphaned prepared transactions: PostgreSQL's `max_prepared_transactions` defaults to 0 partly because forgotten `PREPARE TRANSACTION` calls have caused multi-day lock pile-ups invisible to most dashboards until something times out en masse. Heuristic completion (commit because "most transactions commit", abort because "someone must act now") trades availability for possible inconsistency; document which heuristic your runbook chose, because auditors will ask.

### A Raft Primer for Commit Discussions
1. Raft elects one leader per term using randomized timeouts (typically 150 to 300 ms election timeout, heartbeats far shorter); a candidate needs votes from a majority of N.
2. All writes flow through the leader, which appends them to its log and replicates entries; an entry is committed once a majority stores it, and majorities guarantee any committed entry survives later elections (Leader Completeness).
3. Term numbers act as logical clocks: any node seeing a higher term immediately adopts it, fencing stale leaders with zero clock hardware required.
4. Consensus replicates ONE decision log safely; it does not by itself give multi-key distributed atomicity, which is why Spanner and CockroachDB still layer a commit protocol above per-shard consensus groups.

### Percolator and Spanner: Google's Two Answers
Percolator (2010) built incremental indexing over Bigtable using client-driven snapshot-isolation transactions: one designated primary row's lock serves as the commit point; secondary rows carry pointer-locks resolved lazily against the primary during cleanup. It proved 2PC-shaped coordination could run at petabyte scale over weak infrastructure, directly inspiring TiDB. Spanner went further: each shard is a Paxos group replicating synchronously; 2PC appears only when a transaction spans shards, layered above per-shard Paxos so neither phase can lose the decision. TrueTime provides bounded clock-uncertainty intervals from GPS plus atomic clocks; a leader cannot apply a commit until TT.after(timestamp) holds, the famous commit-wait, converting bounded skew into externally consistent (strictly serializable) ordering. Historically uncertainty averaged about 4 ms with worst cases under 10 ms; newer hardware reports sub-millisecond typical skew, directly lowering Spanner's write-latency floor of roughly two Paxos RTTs plus epsilon.

### 2PC vs 3PC vs Raft/Paxos for Atomic Commit

| Property | 2PC | 3PC | Raft/Paxos-based commit |
| --- | --- | --- | --- |
| Blocks on coordinator crash | Yes, in-doubt window | No, crash-only assumptions | No: the decision itself is replicated |
| Survives network partitions | No (blocking) | No: can split-brain | Yes: majority side proceeds |
| Failures tolerated in window | Zero | One, crash-only | Minority of N (floor((N-1)/2)) |
| Messages per commit | 4 messages + forced logs | 6+ messages | Majority quorum round(s) |
| Used by | XA, PostgreSQL PREPARE, MQ coordinators | Textbooks | Spanner, CockroachDB, etcd |

Key insight: 2PC's flaw is the single unilateral decision point sitting on one volatile machine; consensus protocols fix it by replicating the decision itself through majorities. But consensus solves replicating ONE log, not multi-key atomicity: Spanner and CockroachDB therefore combine Raft-per-shard with cross-shard 2PC glue, optimized by CockroachDB's parallel commit toward roughly one RTT. Kafka's transactional coordinator is 2PC-shaped over replicated logs; the pattern recurs everywhere.

### Split-Brain and Stale Reads: Quorum Failure Modes
With W > N/2, two acknowledging write-quorums cannot coexist (pigeonhole: floor(N/2)+1 sized sets must overlap), so genuine quorum systems cannot double-commit. The dangers live at the edges:
1. **Stale quorum reads**: N = 3, R = 1, a partition isolates one replica; clients routed there silently read old data. Mitigations: R = 2, monotonic-read session guarantees, or pinning reads to the current leader via epoch checks.
2. **Leader without fencing**: a paused old leader wakes believing it still leads (a GC pause outran its lease) and writes anyway; storage nodes must reject writes carrying stale fencing tokens (monotonically increasing epochs), otherwise history forks.
3. **Clock-bounded leases**: leader leases expire using conservative clock-skew budgets; a leader must stop serving before any replica could plausibly consider the lease live elsewhere.
4. **Sloppy quorums** (Dynamo-style hinted handoff) deliberately accept writes on non-home nodes during failures, boosting availability while quietly voiding the strict R+W>N intersection guarantee until handoff completes.

Split-brain arithmetic: any two majorities of N share at least one node, so at most one side can ever acknowledge a quorum write; everything else is configuration drift away from this invariant (for example a cluster whose membership view differs between sides).

### Consistency-Level Cheat Sheet

| Guarantee | What It Actually Promises | Typical Implementation Cost |
| --- | --- | --- |
| Linearizable reads/writes | Real-time ordering across all clients | Quorum R+W>N plus coordination; highest latency |
| Sequential consistency | Per-client order preserved, no global clock | Leader-based replication without commit-wait |
| Bounded staleness | Reads at most T seconds or K versions old | Version tracking plus anti-entropy cadence |
| Read-your-writes (session) | A client never misses its own writes | Sticky sessions or monotonic tokens; near-free |
| Eventual convergence | Replicas agree once updates stop | Async replication; cheapest, weakest |

### Cross-Region Topologies
1. **Single-region writer + async DR**: simplest and fastest for local users; disaster-recovery failover loses seconds of writes (RPO equals replication lag).
2. **Witness/quorum across regions**: keep the leader region plus two voting witnesses elsewhere; elections stay safe but writes still pay one regional round trip.
3. **Multi-active regional leaders** (Spanner model): each shard has home-region leaders near its users via Paxos; cross-region transactions pay 2PC-over-Paxos cost, typically 100+ ms, so schema design tries to keep transactions inside one region.
4. Follow-the-sun workloads simply migrate leadership; the hard part is not mechanics but untangling sessions pinned to the old leader.

### Exactly-Once Myths and the Transactional Outbox
Exactly-once delivery across arbitrary system boundaries does not exist; networks duplicate and delay, and receivers crash mid-side-effect. Engineering substitutes:
1. **Idempotency keys**: clients attach unique request ids; the server records processed ids and replays stored responses for duplicates, making retries harmless.
2. **Transactional outbox**: write business data AND the outbound event in one local transaction, then let a relay publish events afterward; consumers dedupe by event id. Atomicity comes free from the local transaction, no distributed commit involved.

```
   SAME LOCAL TRANSACTION (no distributed commit needed)
   BEGIN
     INSERT INTO orders (...) VALUES (...);
     INSERT INTO outbox (topic, payload) VALUES ('order.created', ...);
   COMMIT
   separate relay process polls outbox, publishes to Kafka,
   marks rows sent; consumers dedupe by event id.
```

3. **Effectively-once = at-least-once delivery + deduplication**, everywhere, forever; interviewers reward candidates who say this plainly.

### Distributed Query Planning Costs
Sharding breaks the single-node query optimizer's assumptions:
1. **Scatter-gather**: without a shard-key predicate, every node runs the fragment and a coordinator merges; latency equals slowest shard plus merge, and LIMIT/ORDER BY must ship top-K partials, not raw rows.
2. **Secondary indexes become local**: an index on a non-shard column only finds rows on its own node, forcing fan-out index probes or global secondary indexes (extra distributed writes to keep them fresh).
3. **Joins across shards** degrade into nested distributed lookups unless tables are co-partitioned on join keys; this is why schema design (co-locating customer with orders) dominates distributed query performance.
4. Distributed transactions multiply all of the above by 2PC cost, which is why analytical engines prefer shipping queries to data rather than data to queries.

### Jepsen Lessons: Marketing Labels vs Reality
Kyle Kingsbury's Jepsen analyses repeatedly found documented behavior diverging from partition tests:
1. Older Elasticsearch lost acknowledged indexing operations during primary/replica flips; later versions tightened replication, but the safe-by-default story took years.
2. MongoDB historically returned stale or lost acknowledged documents at w=1 concerns; majority write/read concerns became the sane default posture afterward.
3. Redis lost acknowledged writes under asymmetric partitions when a demoted master kept accepting them; WAIT helps but durability-by-default remains conditional.
4. Aerospike resolved partitions by discarding minority-side data ("lose-C") in configurations marketed as strong.
5. Kafka's historical `unclean.leader.election=true` promoted out-of-sync replicas, silently dropping acknowledged messages; today acks=all plus min.insync.replicas plus clean elections is the durable configuration.
Lesson: treat every vendor CP/AP claim as a hypothesis requiring adversarial testing; demand documented staleness bounds and acknowledged-write guarantees in writing.

### CAP for Financial Systems: Design Discussion
Authorization paths (card approvals, wallet debits, ledger postings) choose consistency: a double-spend costs real money, so briefly refusing service beats accepting twice; the canonical architecture is CP quorum (for example W = 3 of N = 5) for balances. Non-authoritative paths (analytics, notifications, fraud scoring) ride async replicas and tolerate seconds of lag. Rather than long cross-institution 2PC, which blocks on partner outages, modern designs use sagas: local transactions plus compensating actions, idempotency keys on every request so retries never double-charge, reconciliation jobs as the final safety net. Exactly-once does not exist across boundaries; effectively-once comes from consumer-side deduplication.

### Interview Questions

### Q1: Why is 2PC considered a "blocking" protocol?
**Answer**: If the coordinator crashes after participants voted VOTE_COMMIT but before they learn the decision, participants sit in PREPARED holding locks, unable to commit (another participant might have voted no) and unable to abort (the decision might have been commit). No third party knows the outcome, so they block indefinitely until the coordinator recovers or an operator applies a heuristic resolution.

### Q2: Compare 2PC, 3PC, and Raft-based commit for atomic commit. Which would you pick for payment settlement?
**Answer**: 2PC blocks in the in-doubt window but is simple, widely supported (XA, PostgreSQL prepared transactions), acceptable intra-region. 3PC removes blocking only under crash-only assumptions and breaks under partitions, hence near-zero production adoption. Consensus-based commit replicates the decision via majorities, tolerating minority failures and partitions, at higher constant cost. For payments I would pick consensus-replicated state (Spanner/CockroachDB-style) for balances, or avoid cross-system atomicity entirely with sagas plus idempotency keys, reserving plain 2PC for short intra-datacenter transactions.

### Q3: How do you reason about CAP for a financial system?
**Answer**: Classify flows by error cost. Authorization and ledger writes choose C: during partitions refuse or queue rather than risk double-spends; deploy CP quorums (W exceeding half of N). Telemetry, analytics, and notifications choose A with eventual consistency and measured staleness bounds. Replace fragile cross-organization 2PC with sagas and compensations, enforce idempotency everywhere, and remember CAP constrains only partition moments: normal-operation latency-versus-consistency choices come from PACELC.

### Q4: Design a quorum for (a) a read-heavy social feed and (b) a wallet balance. Use N=5.
**Answer**: Feed: N = 5, W = 3, R = 1 with read repair; R+W = 6 > 5, reads cost one replica RPC, writes tolerate two node failures, and eventual convergence suffices since seconds of feed lag harm nobody. Wallet: N = 5, W = 3, R = 3; both constraints hold strictly, reads self-heal through version comparison, and paying extra RPCs buys certainty against acting on a stale balance. Same cluster, different consistency classes per endpoint, with tail-latency math (slowest-of-R) priced in.

### Q5: What is PACELC? Give concrete numbers for the EL/EC choice.
**Answer**: If Partition: trade Availability against Consistency; Else: trade Latency against Consistency. Numbers: a single-replica (ONE/eventual) write in-region completes in about 1 ms; adding a second replica round trip for quorum roughly doubles it to 2 ms plus tail effects; involving a remote region injects 70 to 100 ms into p99. Strongly consistent reads similarly cost about twice eventual reads in DynamoDB-class systems. Teams tune per endpoint: checkout stays EC, view counters stay EL.

### Q6: You just found 400 orphaned prepared transactions in PostgreSQL holding thousands of row locks. What happened and what do you do?
**Answer**: Some client called PREPARE TRANSACTION (two-phase commit stage one) and never resolved stage two, likely after an application crash or misconfigured transaction manager. Each appears in pg_prepared_xacts with its GID. Inspect each, decide commit versus rollback from application-side evidence (did the counterpart branch commit?), then resolve with COMMIT PREPARED or ROLLBACK PREPARED. Prevention: alert on pg_prepared_xacts age, and unless true 2PC is required leave max_prepared_transactions = 0.

### Q7: Your "CP" database served stale data after a partition healed. How is that possible?
**Answer**: Several honest mechanisms produce this: R = 1 reads hitting a minority-side replica (no quorum check occurs), sloppy quorums serving hinted-handoff data written off its home nodes, absent session guarantees bouncing a user between replicas, or caches pinned to the old leader's epoch. CAP labels describe worst-case partition behavior, not per-request guarantees; achieving read-your-writes needs explicit session tokens, R large enough to intersect recent writes, or leader-pinned reads verified by fencing tokens. Jepsen's history shows many marketed CP systems exhibiting exactly these gaps.
