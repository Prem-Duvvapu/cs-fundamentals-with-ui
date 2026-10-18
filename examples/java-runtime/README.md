# Java runtime: waiting work, downstream capacity and an actual CPU profile

This optional standalone exercise adds a focused **BE-10 / BE-01** milestone.
The learning platform continues to build/run on **Java 17**. This directory alone
uses stable **Java 21** virtual threads; it does not change platform requirements.
Java 21 is a selected LTS, **not the latest LTS**: the current vendor roadmap lists
Java 25 as the newer LTS as of 2026-10-18. Support and patch policies depend on the
JDK distributor. CI selects Temurin 21 maintenance builds and records the actual
version; the separately verified native run used Temurin **21.0.12.1+1**.

Start with [Java concurrency](../../content/java-spring/01l-java-multithreading-concurrency.md)
and [JVM memory/threads](../../content/java-spring/01-jvm-gc.md).
Reuse the existing [deadlock/retained-memory diagnosis lab](../labs/backend/README.md);
those exercises are not copied here. The new work is a real loopback capacity
comparison and a real high-CPU thread/JFR observation.

A **thread** runs one path of work. A **virtual thread** can release its carrier
while waiting on supported blocking operations. A **semaphore** admits only a
chosen number of concurrent callers. It is a capacity decision, separate from how
cheaply a runtime represents waiting threads. A CPU-intensive loop is doing work,
not merely waiting for a dependency.

## 1. Select an owned JDK without replacing the platform runtime

Requirements: complete JDK 21+ (`java`, `javac`, `jcmd`, `jfr`), Python 3.10+, loopback
sockets and local attach support under the same user. No Maven libraries, database,
container, model or external service is needed. The code accepts no public endpoint.

```sh
# Point to your existing standalone JDK; this variable does not change system Java.
JAVA_RUNTIME_HOME=/path/to/your/jdk-21 python3 examples/java-runtime/run_tests.py
```

`JAVA_RUNTIME_HOME` wins over `JAVA_HOME`, then PATH. The runner fails clearly on a
missing/old JDK or missing diagnostics; it never turns those cases into skipped
success. The [dedicated workflow](../../.github/workflows/java-runtime.yml) supplies
JDK 21 and requires all five tests, actual four-workload output and actual JFR
samples without skips.

For a printable report using the same actual exercises:

```sh
JAVA_RUNTIME_HOME=/path/to/your/jdk-21 python3 examples/java-runtime/verify.py
```

[The recorded native observation](NATIVE_OBSERVATION_2026-10-18.json) preserves the
measured counts and recording digest from the completed five-test run. It is a
dated observation, not a replacement for current test execution.

Generated classes, recording, thread dump, samples and JSON reports live in ignored
`examples/java-runtime/build/`. The tools compile only this directory with
`--release 21`; no platform Maven setting or global Java installation is modified.
These two commands repeat the real observations, so normally run the test command
once and inspect its files rather than treating repetition as extra quality proof.

The initial machine had only Java 17. Native validation used an explicitly owned,
ignored build-directory download from the official Adoptium release. Its archive
and vendor checksum file independently matched SHA256
`ce79869e1307ed8ee1e2baa86a412b1eb5b75d10a01006d788a6f968bcfaee94`.
[JDK_PROVENANCE.json](JDK_PROVENANCE.json) records the release, exact archive URL,
207,473,347-byte size and primary checksum/metadata sources. The scripts themselves
do not download/install a JDK. CI independently selects and reports its JDK21 patch;
it does not claim to use this exact native artifact.

## 2. Predict what the capacity limit changes

`VirtualThreadsLab.java` starts an owned TCP dependency on `127.0.0.1` and an
OS-assigned port. Every healthy case performs **12 requests** with the same tiny
protocol/work and records how many dependency handlers are processing at once.

| Case | Application executor | Dependency admission | Prediction |
|---|---|---|---|
| `platform-limited` | Fixed four platform workers, bounded queue | Same semaphore with two permits | Healthy downstream maximum at most 2 |
| `virtual-limited` | One actual virtual thread per task | Same two permits | Healthy downstream maximum still at most 2 |
| `virtual-unlimited` | One actual virtual thread per task | Limiter intentionally removed | More callers can reach the dependency together |
| `virtual-timeout` | Virtual threads with two permits | Slow dependency outlives client deadline | Clients stop waiting; remote work need not stop immediately |

The dependency deliberately coordinates its first wave (two limited callers or
four unbounded callers) so the mechanism does not depend on winning a millisecond
race. It is a controlled experiment, not an unbiased latency/throughput benchmark.
`Thread.isVirtual()` counts verify that the virtual cases really execute on virtual
threads. Thread names or configuration labels alone would not establish that.

**Observe the native run:** all 12 healthy requests succeeded in each of the first
three cases. The observed downstream maxima were **2 / 2 / 12**. The same explicit
limit capped both executor styles; removing it increased admitted downstream work.
Elapsed milliseconds are recorded for diagnosis, but tests never require one
executor to be faster or derive a universal production throughput target.

**Change one thing:** sketch changing the semaphore from two to one while keeping
12 requests. Predict that healthy maximum concurrency should become one in both
limited cases. Simply adding virtual threads cannot increase database connection
capacity, a service's rate quota or available CPU.

**Debug interview answer:** “I choose the concurrency budget from downstream
capacity, then pick how waiting work is represented. Virtual threads can make
blocking-style code practical at larger concurrency; they do not make each CPU
instruction faster or remove the need for admission control.”

This lab does not pool virtual threads. It also does not use preview structured
concurrency APIs or imply those APIs were stable in Java 21. Pinning behavior is
version-specific: do not copy a Java-21 `synchronized` pinning statement as a rule
for every later JDK. The newer Java25 guide has different monitor-pinning guidance;
this exercise does not measure pinning or certify a Java25 migration.

## 3. A client timeout is not remote cancellation

The fourth dependency case deliberately continues its bounded work after a client
has stopped waiting. Client reads time out; permits are released so later callers
can start. Existing remote handlers can still be processing the earlier requests.

**Predict:** can the downstream maximum exceed two even though the client retains
a two-permit limiter? Yes: the permit now covers the lifetime of the client's wait,
not the complete lifetime of work at the server after that wait ends.

The actual native run observed **12 failed client requests**, a downstream maximum
of **10**, and **zero active dependency handlers after cleanup**. The exact maximum
under failure varies with scheduling; the tests require bounded client failure and
cleanup, not a particular failed-run maximum. The healthy-limit assertions apply
to completed responses, where processing finishes before the client releases its
permit.

**Debug:** distinguish a long queue, exhausted permits, connect timeout, read timeout
and a server still doing abandoned work. A real service might need propagated
deadlines, server-side admission/cancellation, bounded retries and idempotency;
a local socket timeout alone does not implement them. Increasing retries here
could create more downstream work rather than fix the original saturation.

## 4. Identify an actual CPU hot loop with correlated evidence

`BusyWorker.java` starts one named **platform** thread, `lab-hotloop`. It performs a
small arithmetic loop and publishes its result so the work is not simply an unused
calculation. It records the worker's actual thread CPU time and creates an actual
JDK Flight Recording with 10 ms execution sampling.

1. **Predict:** a busy worker should accumulate CPU time and appear RUNNABLE; a
   thread waiting for a monitor would suggest a different investigation. RUNNABLE
   alone is insufficient evidence of CPU usage—it can also describe some native
   waits. Correlate the dump with CPU time and stack samples.
2. The runner starts the child, checks its ready PID equals the exact child it owns,
   signals it to begin, then invokes **`jcmd <owned-pid> Thread.print -l`**. It
   requires the named worker's actual section to contain RUNNABLE.
3. The worker stops after approximately **two seconds of its own CPU time**, with
   an eight-second wall fallback and a separate 15-second process watchdog. JVM
   startup/JIT/recording overhead is outside the worker's CPU counter. The runner
   also has subprocess deadlines and kills only the child it created on failure.
4. The real recording is decoded using **`jfr print --json --stack-depth 16 --events
   jdk.ExecutionSample`**. The test requires at least one actual sample associated
   with `lab-hotloop` and `BusyWorker.hotLoop`, not an unrelated runtime thread.
5. The native run observed about **2.000 seconds of worker CPU**, **2.709 seconds
   of wall time**, **196 matching execution samples**, and a **122,200-byte** JFR
   file. These are one run's observations; sample count/timings/file size vary.

Inspect `build/evidence/owned-thread-dump.txt`, `owned-cpu.jfr`,
`execution-samples.json` and `cpu-summary.json`. A JFR sample is statistical evidence
of where execution was observed, not an exact count of method calls or proof that
a proposed optimization improves production performance.

**Change one thing:** sketch replacing the busy arithmetic with a bounded wait.
Predict lower CPU accumulation and a different thread/stack profile. Do not weaken
the hot-loop test to accept those results: that test deliberately verifies the
original CPU symptom. A distinct repaired-workload experiment needs its own claim.

**Interview:** “I correlate a process/thread CPU observation with a thread dump and
JFR execution samples. Here all three identify the owned hot loop. I then inspect
that code path and compare a justified fix under representative work. A thread
state, one stack snapshot or a smaller elapsed value alone is not a performance
conclusion.”

## 5. Bounds, cleanup and evidence scope

- Work is fixed at 12 requests per case. The platform queue is bounded; the virtual
  case has only those 12 admitted tasks. Semaphores, connect/read/future waits and
  dependency shutdown have explicit limits. No background retry loop is started.
- Dependency handlers/listeners/client sockets belong to the experiment. Shutdown
  closes owned sockets, interrupts owned handlers and waits for termination;
  final active count must be zero. No external endpoint or PID can be supplied.
- Child Java heaps are capped at 96 MiB. JVM native memory, stacks and JFR buffers
  are additional; this is not an RSS quota. `ActiveProcessorCount` configures JVM
  scheduling assumptions, not an OS CPU quota. There is one intentionally busy
  worker with the explicit CPU/wall guards above.
- JFR captures only this original synthetic program. No customer requests, heap
  dump, global Java attach scan, production PID or real credentials are involved.
- Five tests include two real observation journeys and three evidence/guard checks.
  A missing selected JDK, absent tooling or absent real JFR samples makes the gate
  fail. Native tests passed all five with **zero skips**. CI must still execute its
  separate actual-JDK21 job before being counted as CI evidence.
- This does not complete every BE-01/BE-10 task: IDE exception/conditional
  breakpoints, bad Spring configuration, production workload profiling, resource
  tuning and upgrade compatibility remain separate work. No server load benchmark,
  virtual-thread pinning study or claim about every JDK/vendor is made.

## Primary references and version context

- [Java21 virtual threads](https://docs.oracle.com/en/java/javase/21/core/virtual-threads.html): stable API, blocking-I/O and executor adoption guidance.
- [Java25 virtual threads](https://docs.oracle.com/en/java/javase/25/core/virtual-threads.html): later version context; do not generalize Java21 pinning behavior.
- [Current LTS/release roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html): Java21 versus the newer Java25 LTS designation.
- [JDK21 jcmd](https://docs.oracle.com/en/java/javase/21/docs/specs/man/jcmd.html) and [jfr tools](https://docs.oracle.com/en/java/javase/21/docs/specs/man/jfr.html): diagnostic commands and event printing.
- [Official Temurin21 release](https://github.com/adoptium/temurin21-binaries/releases/tag/jdk-21.0.12.1%2B1): native archive/checksum provenance.
