# Replication: stale reads, fenced failover and rebuilding a replica

A successful commit on one database does not automatically mean a different database process can serve that write. This exercise runs **two actual PostgreSQL 16 clusters**, observes the difference, promotes a deliberately stale replica only after stopping the old primary, and rebuilds the old node from the selected new history.

Start with the existing [distributed databases, replication and consistency lesson](../../content/dbms/09-distributed-databases-cap.md). For transaction isolation within one server, use the [PostgreSQL concurrency lab](../backend-persistence/README.md#6-read-committed-repeatable-read-and-serializable-observe-the-history). This exercise adds physical replication evidence; it does not introduce another curriculum registry or app.

## 1. Run the real exercise

Requirements: Linux, Python 3.12+, and an installed matching PostgreSQL **major 16** server/client tool directory containing `postgres`, `initdb`, `psql` and `pg_basebackup`. The [sanitized local receipt](evidence/2026-10-23-local.json) records an actual **16.15** run; the 19 guard tests passed under Python **3.13.3**. Run as a regular user who can create private temporary files and launch local processes; never run as root.

From the repository root:

```sh
python3 -m unittest discover -s examples/backend-replication -p 'test_verify.py' -v
python3 examples/backend-replication/verify.py
```

The default binary directory is `/usr/lib/postgresql/16/bin`. An alternative installed major-16 directory can be supplied with `--pg-bin /absolute/installed/bin`. Every executable's reported major is checked before any cluster is created. The guard tests exercise process ownership and input/report boundaries; **only the second command proves database replication behavior**.

The runner does not connect to `/var/run/postgresql`, install packages, alter authentication on an existing cluster, use an administrator's password, call `systemctl`/`pg_ctlcluster`, or stop a shared server. It creates two private clusters, generated credentials and ephemeral `127.0.0.1` ports. A port collision fails closed. Tiny data and one sequential run normally need a few hundred MiB of temporary disk space; PostgreSQL WAL settings are soft size targets, not filesystem quotas.

Success publishes `examples/backend-replication/target/evidence/verification.json` **after all owned servers and private files are removed**. Publication writes through an exclusively created unpredictable staging handle, closes it and atomically replaces the checked final destination. A preexisting sibling `.tmp` symlink is never opened. Error/cancellation removes only the owned staging file; cancellation deferred through rename also removes that newly installed receipt, identified by its device/inode. Publication retains normal last-writer replacement behavior; cleanup preserves a different file concurrently installed at the destination. This is not a hostile-filesystem isolation claim. A failed run removes any prior success receipt and exits nonzero. Raw server logs, generated passwords, connection configuration, private paths and runtime ports are not published. No cloud service, model, paid API or Docker daemon is used locally.

The [dedicated workflow](../../.github/workflows/backend-replication.yml) executes the same guard suite and complete actual-service runner on an ephemeral Linux CI host with PostgreSQL 16. It requires the full source-bound receipt and exact expected histories. Package installation belongs to that disposable CI host; there is no local installation command in this runner. CI observes the installed minor version rather than pretending a package name pins it. A native local success is separate from a successful CI run; no skipped fixture can satisfy the gate.

## 2. Predict the first history

The initial database has one original synthetic event, ID 1. `pg_basebackup` creates a physical copy and recovery configuration. The standby starts in recovery and a primary-side replication sender must actually report `streaming`.

Before running, answer:

1. If the primary acknowledges ID 2 while replay is paused, must the replica return it?
2. Does `synchronous_commit=on` alone mean a remote replica has applied the transaction?
3. Would raising a transaction's isolation level on the replica make unapplied WAL visible?
4. If one client reads the primary and then this replica, can its apparent state move backward?

| Actual step | Primary IDs | Standby IDs | Meaning |
| --- | --- | --- | --- |
| Base copy starts | `[1]` | `[1]` | Same starting history |
| Wait for replay to be paused | `[1]` | `[1]` | Deliberate application of WAL is stopped |
| Commit ID 2 on primary | `[1,2]` | `[1]` | Acknowledged write is stale on standby |
| Bounded same-timeline replay fence | `[1,2]` | `[1]` | Fence reports `reached=false` |
| Resume replay and await commit fence | `[1,2]` | `[1,2]` | Actual recovery is observed |

**Observe.** The runner reads the actual recovery role, pause state, rows and flushed commit LSN. It does not infer lag from a sleep or from a configured replication mode. The short paused fence must time out; the resumed fence must reach the target and a fresh query must return the write.

**Diagnose.** WAL generation/commit, transmission and replay are distinct steps. Here WAL replay is intentionally paused; this is **not a network partition**, packet loss or a bandwidth benchmark. The primary has `fsync`, full-page writes and synchronous commit enabled, but `synchronous_standby_names` is empty: the commit acknowledgement is local durability under the normal storage assumptions, not remote acknowledgement.

**Repair.** Resume replay, then either route a dependent read to the primary or wait within the caller's deadline for the expected physical standby to replay the write's LSN. This lab checks both recovery role and expected checkpoint timeline before comparing LSNs. It never treats a numeric position on an unexpected timeline as proof. Production routing also needs the server/system identity and leader epoch contract, authorization, failover policy and a fallback when the deadline expires.

**Consistency distinction.** Reading `[1,2]` on the primary and `[1]` on a stale replica demonstrates why arbitrary endpoint switching can break read-your-writes and monotonic reads. Transaction isolation controls a transaction's view on a server; it does not ship missing changes from another server. This bounded fence demonstrates one dependent-read mechanism, not full linearizability, a general session-consistency service or a proof of eventual delivery under every failure.

**Change.** In your private checkout, omit `pg_wal_replay_resume()`. Predict which assertion fails and why the runner still cleans up. Restore it. Then explain the trade-off between waiting for freshness, returning a stale result and refusing the request when the deadline expires.

**Interview answer.** “I distinguish local commit from remote replay. A lagging replica can return older state even after a client has an acknowledged write. I can route dependent reads to the current primary or use a bounded replay fence tied to the correct replication history; increasing isolation on the stale node cannot manufacture missing WAL.”

## 3. Fail over to a stale replica after fencing the old writer

The second history deliberately exposes asynchronous replication's recovery-point trade-off.

1. Stop the standby and require its listener to refuse connections.
2. Commit ID 3 on the old primary; query `[1,2,3]` and record its flushed WAL position.
3. Stop the **exact owned old-primary process group**, await terminal process state and verify its listener refuses connections.
4. Confirm the old data directory still exists. Only now restart the stale standby in recovery and call actual `pg_promote`.
5. Require a new checkpoint timeline and observe `[1,2]`: acknowledged ID 3 is absent on the selected new history.
6. Commit ID 4 on the promoted primary and observe `[1,2,4]`.

**Predict.** If the replica never received ID 3, where would its promotion obtain that transaction? Why is restarting the old primary as another independent writer unsafe?

**Observe.** Promotion is an actual PostgreSQL role transition on the previously copied cluster; a fixed Python list is not the data store. One acknowledged synthetic row is missing on the new history. The old disk exists at the decision point, so the result does **not** mean the old transaction was erased from its original storage. It means the selected stale failover history lacks it.

**Diagnose.** Failure detection, writer fencing, promotion, client routing and reconciliation are separate duties. A health-check failure does not prove the old writer cannot serve another client. This runner owns the old postmaster and demonstrates **local process fencing** with process termination plus listener refusal. It does not demonstrate multi-host STONITH, lease/quorum fencing, storage fencing or automatic split-brain prevention. Both clusters share one machine and its failure domains.

**Repair.** Establish one authoritative history, fence the previous writer, update routing, and decide how any acknowledged writes absent from the new history are reconciled. This exercise deliberately selects the replica's branch and later rebuilds the old node, discarding its divergent copy. It is an explicit teaching choice, **not a production reconciliation policy**. Do not erase the only copy of real acknowledged business data without a separate recovery decision.

**RPO/RTO.** The observed recovery-point loss is exactly ID 3 on the selected history. It is not a production RPO in seconds or a statement that every asynchronous failover loses data. The receipt measures elapsed milliseconds from starting the old-primary stop to a successful checked write on the new primary. That local number excludes incident detection, human approval, remote fencing, client DNS/connection changes, real data volume and load. It is not an RTO SLA or an HA claim. Hardware/storage durability, backups, replication policy and failure domains remain explicit design assumptions.

**Change.** Move the ID-3 write before stopping the standby, and first prove its replay fence succeeded. Predict why the current “missing ID 3” assertion should then fail. Restore the deliberate lag scenario. Do not remove fencing or start an unfenced second writer as an experiment.

**Interview answer.** “Asynchronous failover may promote a history missing acknowledged primary commits. I fence the old writer before promotion, inspect replay positions and available data, and state the recovery-point trade-off. A promoted server accepting writes is only one part of recovery; routing, reconciliation, recovery time and independent failure domains still matter.”

## 4. Rebuild the former primary from the selected new history

**Predict.** Is restarting the old data directory enough to turn it into a replica of the new timeline?

**Observe.** The former primary remains stopped. The runner removes **only its exact generated private data directory**, takes a fresh base backup from the promoted primary, writes recovery configuration, and starts it as a standby. Its actual recovery role must be true. A bounded new-timeline fence plus query must return `[1,2,4]`. A fresh ID-5 commit on the new primary then must replay as `[1,2,4,5]` on the rebuilt node.

**Diagnose.** A divergent old writer is not automatically reconciled by pointing clients elsewhere. The rebuild establishes a clean copy of the selected authoritative branch; it does not merge absent ID 3 back into the selected state. This lab uses a full copy because the fixture is small. It does not claim to exercise `pg_rewind`, logical conflict resolution or a production-size rebuild.

**Repair.** Keep the old node fenced, preserve/inspect divergent data according to recovery policy, re-seed or rewind under the tool's prerequisites, and verify role, lineage and a fresh replicated write before returning it to read traffic. A process merely starting is insufficient.

**Interview answer.** “After failover I prevent the former primary from accepting writes independently. I reconcile the business recovery decision, rebuild or rewind it from the chosen primary, then verify actual recovery role, replay progress and a new write before routing reads to it.”

## 5. Bounds, cleanup and evidence

| Boundary | Enforcement |
| --- | --- |
| Ownership | Generated mode-0700 root, fixed primary/standby child directories; foreground `Popen` handles; no external cluster attach |
| Network | IPv4 loopback only; ephemeral generated ports; Unix sockets disabled; generated SCRAM credentials |
| Work | 180-second command-work budget; 3-second client process bound, 2-second SQL and 1-second lock bounds; init/basebackup 20 seconds each |
| Observation | Readiness/freshness poll windows at most 8 seconds, with a separately bounded active client query; paused fence intentionally 0.2 seconds |
| PostgreSQL | Two clusters, 16 MiB shared buffers each, 8 max connections, 2 WAL senders, no parallel workers/slots/archive |
| Process cleanup | Each exact group gets TERM, up to 5 seconds, then KILL and 2-second wait; no shared service or untracked PID is targeted |
| Files and output | Private server logs capped at 512 KiB while observing; client output capped at 64 KiB; report capped at 32 KiB; generated data/config/passfiles removed |
| Cancellation | Opt-in TERM/INT handlers; defer through ownership assignment, normal teardown and private-root removal; restore caller handlers/masks; no SIGKILL/host-failure guarantee |
| Success | Four actual server launches; required histories; cleanup first; normalized source hashes unchanged before/after; atomic sanitized report publication |

The guard suite positions actual TERM/INT at subprocess assignment, scope entry and the first normal cleanup, including a child that ignores TERM and must be killed/reaped. An unrelated process group must survive. Binary stdin/stdout/stderr are nonblocking and bounded. These prove helper ownership behavior, not database lag; the actual runner proves the separate database history.

Scope-exit tests also interrupt actual handler restoration on normal/error exits in caller and
nested scopes. Nested finally blocks restore TERM, INT and outer state before the caller's exact
exception propagates; a body error remains its context. Signal masks and library policy stay
unchanged. The refreshed local actual receipt binds this corrected helper and all current guards.

Runtime artifacts stay under ignored `target/`. Source hashes cover the Python executable/guards. Publication guards verify an unrelated symlink victim stays unchanged, the final receipt is a regular file, and actual TERM/INT at staging creation, rename or final staging cleanup leaves no owned staging/success receipt. The receipt excludes generated usernames, passwords, temporary paths, ports, connection strings and raw logs. Rows are five fixed original synthetic IDs, not learner/customer data. If SIGKILL/host failure interrupts cleanup, only the owner should inspect this run's exact private directory/processes; never use a global PostgreSQL cleanup command.

Primary references checked 2026-10-23: [PostgreSQL 16 streaming/standby and synchronous replication](https://www.postgresql.org/docs/16/warm-standby.html), [recovery control functions and replay state](https://www.postgresql.org/docs/16/functions-admin.html#FUNCTIONS-RECOVERY-CONTROL), [pg_basebackup](https://www.postgresql.org/docs/16/app-pgbasebackup.html), and [WAL durability settings](https://www.postgresql.org/docs/16/runtime-config-wal.html).
