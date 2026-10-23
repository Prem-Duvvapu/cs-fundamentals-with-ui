# Teaching-process lifecycle review — October 23

This review starts from main `22fab5ab6754fa1726155aa2ad776e96e6a4c416`. It distinguishes
violations of an existing opt-in cancellation contract from entry points that never promised
that contract. The [sanitized observations](evidence/PROCESS_LIFECYCLE_AUDIT_2026-10-23.json)
retain source/probe hashes, actual signal results and resolving commits. Original probes ran
against a private `git archive` copy; they did not modify tracked sources or use shared services.

## Confirmed failures and corrections

| Existing guarded boundary | Actual pre-fix observation | Correction and local verification |
| --- | --- | --- |
| Debugging scope entry and normal process close | Six TERM/INT subcases leave inner state installed or a READY-confirmed child running during close | `ad3281e` puts assignment inside restoration and defers complete close; all nine Spring/JDI/ownership tests pass. [Detailed receipt](evidence/BACKEND_DEBUGGING_CLEANUP_2026-10-23.json). |
| Engineering command scope entry and timeout/success cleanup | Eight subcases leave scope state, a live child or an open stdout pipe | `d9bc81a` restores state and finishes stop/wait/close before cancellation. Three positioned tests plus original workflow/review tests pass: 18 total; root repeat passes in 41.834 seconds. |
| SSRF resolver timeout/success finalization | Four subcases leave a worker, open pipe or active registry/event unfinished | `a3679dd` defers the whole stop/communicate/registry/event boundary. All 18 tests and 26 actual owned HTTP requests pass, including TLS, framing and recovery; root repeat passes in 7.312 seconds. |
| Gateway command timeout/success cleanup | Four subcases leave a child or pipe unfinished; four scope-entry controls already pass | `ff1f31a` defers complete teardown without changing already-correct entry. All 19 native guards pass; root repeat takes 4.857 seconds. All 20 actual Nginx assertions remain mandatory in CI. |

Each positioned regression delivers real TERM and INT, checks exact child wait/pipe/state cleanup,
restores caller handlers/masks and keeps an unrelated process group alive. Test fallbacks remove
only exact disposable children. They do not demonstrate service semantics by themselves.
Engineering's `ai_review.py` enters the command guard; `runner.py`/`linux_probe.py` do not.
No process-wide policy is installed merely by importing these libraries.

## Advisory startup windows

Discovery covered 67 Python files: 25 non-test process-owning files, 39 subprocess calls and 22
files with direct `Popen` use. A discovery inventory is not an all-wrapper certification.

Twenty-six startup probes across 13 entry points used a **caller-installed raising handler** and
a substituted fixed disposable Python child at the actual Popen-return boundary. Each observed
a child still running until audit fallback. These are concrete unsupported windows under that
probe policy; they are **not 13 additional demonstrated contract regressions**. No Java service,
database client, cluster or domain experiment was executed by those substituted children.

The entry points are engineering `linux_probe.exercise`, testing `bounded_build`, identity
`build`/`server`, webhook `Server.__enter__`, legacy AI `bounded_java`/HTTP `verify`, Java runtime
`busy_worker`, backend/OS observation helpers, database `start_session`, Task Tracker HTTP
`verify` and baseline operations `execute`. Their executable interrupt policy, intended public
ownership contract and actual CLI behavior need individual assessment before any change.
In particular, operations already has a CLI TERM handler; these advisory probes did not invoke
that actual CLI or kind and do not close or invalidate its cluster cases.

Previously corrected AI comparison, cache, WebSocket and persistence helpers retain their
distinct recorded scope. This review does not duplicate those releases or infer new execution.

## Separate report-publication finding

Independent actual PostgreSQL review of new replication source `96b6a51` found a fixed sibling
`.tmp` write could follow a preexisting controlled symlink, alter its target, then publish a
symlink while the database experiment otherwise passed. [The retained review](evidence/REPLICATION_PUBLICATION_REVIEW_2026-10-23.json)
binds the old actual observation and corrected source receipt. Fix `9794e2` uses exclusive
unpredictable staging, handle-based writes, atomic replacement and device/inode-bound cancellation
rollback. All 18 guards pass; root repeat takes 12.587 seconds. An independent reviewer repeats
the four publisher/path tests successfully. This is not hostile-filesystem isolation or fsync
durability; actual database and final CI evidence remain separate.

## Final review continuation

Review of combined source `a5886ef` subsequently reproduces a distinct first-signal window during
normal scope-handler restoration in debugging, engineering, gateway and SSRF. A caller handler
raising immediately after its restoration skips remaining handler/state cleanup. The eight actual
signal observations are separate from the earlier process-cleanup failures above. Equivalent
scoped helper copies are being checked and corrected before release; no existing local success
count closes this newly observed window. RCA-2026-10-23-16 records the follow-up evidence.

## Remaining evidence boundaries

SSRF certificate/supervisor cleanup tails, reader/selector construction and multiple new distinct
signals interrupting restoration have not received a complete independent audit. Finite
`subprocess.run` wrappers have not received a repository-wide process-tree cancellation audit.
Do not turn an untested window into a confirmed failure or a passing focused test into a global
guarantee. No SIGKILL/host-failure cleanup, paid/cloud execution, live AI quality, human learning,
manual screen-reader or zoom evidence is claimed.

The combined release still requires all final-head platform checks and dedicated affected actual
service/cluster workflows before merge.
