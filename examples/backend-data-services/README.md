# Backend data services: a real document store and a real remote cache

This focused Java 17 lab adds practical evidence for **BEC-20 NoSQL, BEC-21 caching
and BEC-22 Redis**. It uses original synthetic support tickets. It does not add a
second CRUD application or copy the existing lessons. Reuse these foundations:

- [Data models and SQL/NoSQL](../../content/dbms/00-dbms-introduction.md),
  [distributed data](../../content/dbms/09-distributed-databases-cap.md) and
  [Spring caching](../../content/java-spring/10-spring-caching-async.md).
- [HLD cache-aside](https://hld-with-ui.vercel.app/topics/cache-aside),
  [LLD LRU cache](https://lld-with-ui.vercel.app/lru-cache) and
  [LLD cache library](https://lld-with-ui.vercel.app/cachelibrary). These are
  independent learning apps; following a link does not transfer progress.

A **document** groups related fields, such as a ticket and its small list of
labels. An **index** is an additional lookup structure. A **cache** keeps a
replaceable copy of a result. A **TTL** tells Redis when a key expires. The database
is the original ledger; the cache is a photocopy with a revision stamp. Making the
photocopy fast does not make it the authority for the ledger's latest revision.

## 1. Run the part your environment actually supports

Prerequisites: JDK 17+, Maven, Python 3.10+ for the optional native-Redis runner.
Maven resolves pinned **Jedis 8.0.2**, **MongoDB Java Sync Driver 5.13.0** and the test
libraries. No Spring server or paid provider is started.

```sh
mvn -B --no-transfer-progress -f examples/backend-data-services/pom.xml verify
```

Without explicit integration flags, this runs **nine contract tests**, then reports
**eleven skipped service tests**. The contract fakes are labelled `FakeSource` and
`FakeCache`. They establish application logic and BSON codec behavior, not Redis
or MongoDB behavior. Read the skip counts; a green default build alone is not
actual service evidence.

If a native `redis-server` is already installed, this command starts an owned
throwaway process, authenticates it and executes exactly four real Redis cases:

```sh
python3 examples/backend-data-services/verify_redis.py
```

The runner uses a temporary private config, random password, loopback free port,
readiness/process deadlines and finally cleanup of only that child and directory.
It never reuses or reconfigures a global Redis service. It fails when the binary is
missing; it does not install software. A local run on **Redis 8.6.2** passed all four
cases with zero skips. That local version is separate from CI's pinned Redis 8.4.7.
MongoDB was not available locally, so the seven MongoDB/combined cases remain
unexecuted there.

The dedicated [Backend data services workflow](../../.github/workflows/data-services.yml)
starts authenticated Redis and MongoDB containers, binds their ports to loopback,
runs all **20 tests with zero skips**, publishes Surefire/query-plan reports, and
removes only its containers and anonymous volumes. It explicitly rejects missing,
skipped or failing integration reports. A successful actual workflow run is still
required before claiming MongoDB execution evidence for this release.

To use your own **throwaway local** services, supply runtime secrets privately and
opt into the exact test scope:

```sh
export DATA_REDIS_INTEGRATION=1 DATA_MONGO_INTEGRATION=1 DATA_SERVICES_INTEGRATION=1
export DATA_REDIS_PORT=6381
# Supply DATA_REDIS_PASSWORD and DATA_MONGO_URI privately, not committed defaults.
# DATA_MONGO_URI uses mongodb:// with one loopback host and runtime credentials.
mvn -B --no-transfer-progress -f examples/backend-data-services/pom.xml verify
```

The MongoDB credential needs permission to create/drop a newly generated owned lab
database and its collection/indexes. CI's administrator exists only in its isolated
throwaway container; this is not a suggested production application role.
Application code refuses remote/SRV/multiple-host MongoDB URIs, unauthenticated
connections, remote Redis hosts and foreign cache key namespaces. These are local
lab clients, not a production networking or authentication framework.

## 2. Observe a document aggregate, schema and query plan

Read `MongoTickets.java` and `MongoIntegrationTests.java` together.

1. **Predict:** Alice and Bob both create ticket ID `same`. Does a unique index on
   the ID alone model tenancy correctly? The real collection uses a unique
   **`(tenant,ticketId)`** index, so each tenant can have its own ticket. A duplicate
   within the same tenant fails with MongoDB code **11000**.
2. The document contains scalar fields, a version, and embedded
   `details: {department, labels}`. The bounded labels belong to the ticket's
   aggregate and are read together. They are not separate join tables here.
3. **Change one thing:** the schema test inserts a string version rather than an
   integer/long. The actual collection validator rejects it with code **121**.
   “Document database” does not mean every application should accept arbitrary
   shapes or that validation is unnecessary.
4. Query Alice's open/high-priority tickets in ticket-ID order, with a limit of 20.
   The compound index is **`(tenant,status,priority,ticketId)`**: equality filters
   first, then the requested order. Bob's private fixture must never appear.
5. Inspect `MONGODB_INDEX_PLAN` in the real test report. The diagnostic explicitly
   hints this index and requires an actual `IXSCAN`. It proves the engine can use
   that access path for this fixture, not that every optimizer would select it or
   that a tiny collection became faster. Do not call a printed query an EXPLAIN.

**Debug:** distinguish a bad filter, schema rejection, duplicate key and collection
scan. More indexes consume space and add work to writes. A filter lacking the
leading tenant field may not fit this access pattern or the authorization contract.

**Interview:** “I embed a small bounded aggregate that is normally read together,
validate its shape, and index the actual equality/sort path. I retain a tenant-scoped
unique key. I would model independently changing or unbounded relationships
separately; embedding is a trade-off, not a rule that replaces database design.”

| Access model | Useful question | What this lab actually exercises |
|---|---|---|
| Key-value | Can I fetch/expire a value by a known key? | Real Redis strings and counters |
| Document | Can this bounded aggregate be stored/read together? | Real MongoDB documents, schema and indexes |
| Wide-column | Are queries organized around a chosen partition/clustering key? | Concept prerequisite only; no Cassandra execution |
| Graph | Is multi-hop relationship traversal the dominant query? | Concept prerequisite only; no graph-engine execution |

Compared with a relational design, embedding avoids a join for this bounded read
but can duplicate related data and makes cross-document invariants a separate
problem. The conditional document update below is not a foreign key, cross-record
transaction or proof that MongoDB cannot support transactions. Choose the data
model around access patterns and invariants rather than “SQL slow / NoSQL fast.”

## 3. Prevent a lost update with one atomic conditional operation

Two writers read ticket version 1. Both propose different titles.

**Predict:** a blind “read then replace” can let the second writer erase the first.
The real test starts two concurrent writers with expected version 1. Each issues
one `findOneAndUpdate` filtered by **tenant + ID + expected version**, sets its title
and increments the version together. Exactly one wins; the other reports a version
conflict. The observed stored version is **2**, not 3, and Bob cannot rename
Alice's ticket.

**Change one thing:** explain why removing the version condition destroys the
optimistic-concurrency contract even if each individual database operation is
atomic. Retrying the same stale version repeatedly is not a conflict resolution
strategy; reread and decide whether the new state permits the intended change.

**Interview:** “Single-document atomicity lets the version predicate and update
form one compare-and-change operation. A null result means the expected scoped
state was not matched. This prevents a lost update on this aggregate; a business
invariant spanning multiple documents needs a separate design.”

## 4. Cache-aside, with an explicit freshness cost

Read `CacheAsideTickets.java`, `CacheContractTests.java` and
`CacheMongoIntegrationTests.java`.

The key is **`<owned-run>:ticket:<tenant>:<id>:v<version>`**. Every read first asks
MongoDB for the canonical version using a small projection. It then tries that
exact Redis key. On a miss it reads the full document, validates scope and fills
its actual version key with TTL. On a hit it verifies the envelope's tenant, ID,
version and positive observed TTL. Wrong-scope/malformed entries are discarded;
there is no fallback to another tenant's key.

This still reads the source metadata on a hit. It saves the full aggregate read,
not every database round trip. That cost deliberately buys a stronger freshness
contract than ordinary cache-aside. The version check observes state at a point
during the read; an update racing after that observation can validly complete
before the response returns. This is not a global “latest value at delivery time”
promise or a cross-system transaction.

1. Predict `miss-filled`, then `hit-verified-version` for two reads of Alice's
   unchanged ticket. Compare Bob's same-ID fixture and cache key.
2. Rename the source. The database update completes **before** the old-version key
   is invalidated. A failed conditional source update performs no invalidation.
3. The real outage case deliberately makes invalidation fail. Old bytes are still
   present in healthy Redis, but the next source version is 2: the old version-1
   key cannot be selected. A healthy subsequent read returns the new title.
4. A contract test forces a delayed read to populate version 1 after version 2
   committed. The next read still selects version 2. This explicitly addresses the
   stale-population race; “we delete on update” alone would not explain it.
5. Redis unavailable/bad authentication produces `bypass-redis-unavailable` and an
   authoritative MongoDB read. If the authoritative source is also unavailable,
   the service fails instead of representing unverifiable cached content as current.
   A deleted source is not resurrected from Redis.

Redis is trusted for the content of an otherwise matching same-version envelope.
The scope/version checks are not cryptographic protection against an administrator
who can rewrite both cache contents and authority. This lab adds no public API;
its synthetic principal mapping represents the trusted identity passed by a real
backend after authentication, whose implementation belongs to the Spring lesson.

## 5. Expiry metadata and atomic counters on the real server

`RedisCache.read` executes a short Lua script that reads the value and its `PTTL`
together. The returned TTL is a server-side observation, not a guarantee that the
key still exists when the caller receives it. The actual expiry case observes a
string key, positive TTL, then a missing key/type `none` after expiration. It polls
with a deadline rather than asserting an exact wall-clock scheduling instant.

The counter uses a second script: **INCR; if this is the first count, PEXPIRE; return
count and PTTL**. This avoids a process crash between a separate increment and
expiry command leaving a new key without expiry. Four concurrent workers produce
40 distinct consecutive counts and positive expiry metadata; Bob's first counter
is independent. A second increment does not intentionally restart the window.

A script is atomic on this Redis node, not an exactly-once end-to-end protocol.
After a lost response the operation may have committed, and retrying can increment
again. There is no automatic retry in this client. CI configures **32 MiB** and
`allkeys-lru`, with no RDB/AOF persistence for the throwaway cache. Eviction can
remove a counter before its TTL; this configuration is not a strong security quota
or a durable balance ledger. Actual memory-pressure/eviction, persistence recovery,
replica/failover and cluster behavior remain separate exercises.

**Debug interview:** “I distinguish missing/expired/evicted data from an unavailable
cache. I preserve tenant scope on every key and validate the revision against the
source. I combine the new counter and expiry on the server, but still account for
unknown outcomes, eviction and failures rather than claiming exactly once.”

## Bounds, cleanup and remaining scope

- Redis commands use 500 ms connect / 800 ms socket timeouts, at most eight active
  short-lived clients per object, no retries and no background queue. The example
  explicitly uses RESP2; it does not claim RESP3/pipelining or connection-pool
  throughput evidence. Its owned-key tracking is capped at 128 keys.
- MongoDB uses a two-second driver operation timeout, bounded connection/selection/
  socket/pool waits, four connections and no read/write retry. These are individual
  operation bounds, not a hard end-to-end timeout across a sequence of operations.
- Namespace/database names are internally generated UUIDs. Cleanup deletes only
  tracked Redis keys and the exact newly created MongoDB database, closes clients
  and joins owned executor workers. There is no `FLUSHDB`, broad prefix deletion,
  global service shutdown or shared production table.
- Contract/race tests are deterministic fakes. Actual Redis evidence is a separate
  authenticated native/server run. MongoDB behavior requires the actual CI profile;
  BSON round-tripping is not a MongoDB server test.
- Still pending: a measured cache stampede/coalescing exercise, actual eviction
  pressure, replicas/failover/partitions, persistence recovery and production
  sessions/rate-limit integration. A single-node result does not prove distributed
  consistency, high availability or a production performance target.

## Verified versions and primary references

On 2026-10-18 the Docker official registry's image index/config metadata resolved:

| Component | Pinned artifact | Observed version / immutable image index |
|---|---|---|
| Redis CI | `redis:8.4-alpine` | 8.4.7; `sha256:0514fa59e3d84e2f3be66731c5401fc2a85b8ea71b49c0116c850f6a558076f4` |
| MongoDB CI | `mongo:8.0` | 8.0.34; `sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907` |
| Java clients | Maven Central release metadata | Jedis 8.0.2; MongoDB Sync Driver 5.13.0 |

The workflow uses **tag@digest**, so a later moving tag does not change the tested
image. It prints the actual service versions and memory-policy configuration.
These are selected verified versions, not a claim that these minor lines are the
only valid choices. Recheck compatibility and rerun actual tests before upgrading.

- [Redis SET expiry options](https://redis.io/docs/latest/commands/set/), [PTTL](https://redis.io/docs/latest/commands/pttl/), and [Lua atomicity](https://redis.io/docs/latest/develop/programmability/eval-intro/).
- [Jedis Java client guide](https://redis.io/docs/latest/develop/clients/jedis/) and [Jedis release metadata](https://repo.maven.apache.org/maven2/redis/clients/jedis/maven-metadata.xml).
- [MongoDB single-document atomicity](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/), [schema validation](https://www.mongodb.com/docs/manual/core/schema-validation/), and [compound indexes](https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/).
- [MongoDB Java driver](https://www.mongodb.com/docs/drivers/java/sync/current/) and [driver release metadata](https://repo.maven.apache.org/maven2/org/mongodb/mongodb-driver-sync/maven-metadata.xml).
- [Docker Official Redis image definition](https://github.com/docker-library/redis) and [MongoDB image definition](https://github.com/docker-library/mongo).
