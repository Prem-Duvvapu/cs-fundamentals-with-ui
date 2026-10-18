# Recover an actual Kubernetes deployment

This focused **BE-08** milestone takes the existing Java 17
[Task Tracker](../java-spring/task-tracker/README.md) into an owned, single-node
kind cluster. It observes actual cluster DNS, authenticated Service requests,
readiness withdrawal/recovery and a failed rollout followed by rollback.

Read [Docker fundamentals](../../content/devops/01-docker-fundamentals.md),
[Kubernetes fundamentals](../../content/devops/02-kubernetes-fundamentals.md) and
[delivery strategies](../../content/devops/04-cicd-pipelines-deployment-strategies.md)
for the underlying theory. This directory adds an executable investigation rather
than another CRUD app or another Kubernetes glossary.

**Evidence status:** native guard/manifest tests and compilation can run without
Docker. They do not demonstrate Kubernetes recovery. Actual cluster evidence must
come from the dedicated CI job, which creates a real cluster and refuses missing
namespace evidence, incomplete cases or skips. No actual cluster run was possible
on the initial machine because it had no usable local Docker daemon.

## 1. Predict before running

A **Pod** runs the application container. A **Deployment** owns its revision and
replicas. A **Service** provides a stable name/address and chooses eligible ready
backends. A **readiness probe** answers whether this Pod should receive Service
traffic; it is different from restarting a dead process.

| Deliberate change | Predict | Actual evidence required |
|---|---|---|
| Healthy application and client Pod | DNS resolves; authenticated GET succeeds | Client resolves Service FQDN and receives HTTP 200 |
| Create a readiness failure marker in the app Pod | Ready backends become zero; Service DNS can still resolve | Pod Ready false, EndpointSlice ready count zero, bounded client connection failure |
| Remove that marker | Same Pod becomes eligible again | Same Pod UID/restart count and authenticated HTTP 200 |
| Roll out an invalid JVM option | New container exits; old healthy replica still serves | Actual failed container exit/logs, available old replica and HTTP 200 |
| Undo the rollout | Desired template returns to previous good revision | Rollout status completes, invalid command absent, authenticated HTTP 200 |

The marker is an explicitly synthetic **readiness incident trigger**. It does not
claim to reproduce a database outage or change application business health. Startup
and liveness probes call real Actuator readiness/liveness HTTP endpoints; after
startup the readiness exec probe checks only this controlled marker. A real
application needs a carefully chosen readiness signal for its own dependencies.

## 2. Requirements and exact commands

Use an expendable Linux development machine with Python 3.10+, JDK 17+ (`javac`),
a **local Unix-socket Docker daemon**, kind **v0.33.0** and kubectl **v1.37.0**.
CI supplies these. The selected kind release explicitly supports the pinned
Kubernetes **v1.37.0** node image. This is a checked combination, not a claim that
these are the newest releases forever.

The workflow downloads kind/kubectl into a runner-owned directory and verifies
fixed primary-vendor checksums. [PROVENANCE.json](PROVENANCE.json) records exact
versions, checksums, node digest and Docker Official Image base-index digests.
No `latest` image is used. The app's existing Dockerfile and source are consumed
read-only: a private generated Dockerfile adds reviewed FROM digests and retains
all its other instructions. If its two stages change, the lab fails for review.
The derived lab image adds only the compiled diagnostic client class.

From the repository root, first run the native contracts:

```sh
python3 -m unittest discover -s examples/backend-operations -p test_contracts.py -v
```

These **nine** tests validate ownership, context selection, credential redaction,
resource/probe manifests, reviewed base pins, cleanup decisions and an actual
owned subprocess deadline. Mocked command results in guard tests are not API
responses or proof of cluster behavior.

Then explicitly authorize the actual local, throwaway cluster journey:

```sh
python3 examples/backend-operations/lab.py --run-cluster
```

This builds Task Tracker, creates a fresh random `ops-<16 hex characters>` cluster
and matching namespace, loads the local image, runs the five observations, and
cleans up. There is no option to attach to an existing cluster, supply a production
context, target a public endpoint or provide an arbitrary namespace. The cluster
API binds to `127.0.0.1`; the Service stays inside the cluster. No public host port
or cloud resource is requested.

A missing tool/daemon, bad version, failed observation or cleanup error exits
nonzero. The runner never silently skips a cluster case. The dedicated
[workflow](../../.github/workflows/backend-operations.yml) runs all actual cases
and requires their final evidence before passing.

## 3. Observe DNS and readiness independently

`Probe.java` is a small actual Java HTTP/DNS client in a separate Pod using the
same derived image. It accepts only this run's Service FQDN. It reads the generated
Alice password from a Kubernetes Secret, resolves the FQDN and calls the existing
owner-scoped `/api/projects` endpoint. It reports status, never passwords or task
response bodies.

For a successful CI run, inspect `build/evidence/result.json`:

```json
{
  "namespaceUid": "actual API-assigned UID",
  "dnsAndAuthenticatedService": {"dnsResolved": true, "authenticatedStatus": 200},
  "withdrawnReadyEndpointCount": 0,
  "readinessWithdrawal": {"dnsResolved": true, "connectionUnavailable": true},
  "readinessSamePodNoRestart": true,
  "actualCasesExecuted": 5,
  "skipped": 0,
  "cleanupVerified": true
}
```

This is an **expected shape**, not a recorded execution. Other result fields retain
recovery/rollback requests, exact actual server version and built image ID. The
workflow only accepts values obtained during its real cluster run.

The failure does not delete the Service or its DNS record. The EndpointSlice entry
may remain with `ready: false`; “withdrawal” means **zero eligible ready backends**,
not necessarily deletion of the EndpointSlice object. With one replica, that means
a deliberate brief outage. Removing the marker must restore the same Pod without
a restart, proving that readiness recovery is separate from process replacement.

**Debug:** compare `unready-pod.json` with `unready-endpoint-slices.json`. If DNS
resolves but the ready endpoint count is zero, changing DNS TTL or increasing client
retries is not the first repair. Inspect probe state and why the backend is unready.
A real incident can also involve CNI, kube-proxy or NetworkPolicy; this exercise does
not manufacture one of those failures or certify their behavior.

## 4. Diagnose the bad revision before undoing it

The lab patches the Deployment's app command to Java with a deliberately invalid
JVM option. The new process exits before starting Spring. It observes a nonzero
container termination and the actual `Unrecognized VM option` log, and retains:

- `failed-rollout-pod.json`: current/previous termination and restart information.
- `failed-rollout.log`: the real failed process diagnostic.
- `failed-deployment.json`: strategy, revision progress and available replicas.
- `events.json`: namespaced controller/probe events for this original fixture.

With `maxUnavailable: 0` and `maxSurge: 1`, the previous healthy replica must still
be available and serve an authenticated HTTP 200 while the new Pod fails. The lab
diagnoses the startup failure promptly; it does not pretend it waited for a
`ProgressDeadlineExceeded` condition if that condition has not occurred.

It then uses an actual `kubectl rollout undo deployment/task`, waits for rollout
status, verifies the invalid command is absent and calls the Service again.
`recovered-deployment.json` retains the final template/status.

**Change one thing:** predict what `maxUnavailable: 1` could permit for a one-replica
Deployment. The existing test deliberately requires the safer old-replica behavior;
changing that strategy changes the availability claim and needs different evidence.

**Interview answer:** “I inspect Deployment/ReplicaSet/Pod state, readiness and
container termination/logs before changing configuration. Here the new JVM exits
because of a bad option while the old ready replica still serves. Undo restores a
known working template; I verify rollout completion and an authenticated request.
Rollback is a recovery action, not a fix for incompatible database migrations.”

## 5. Ownership, secrets, resources and cleanup

The runner generates four independent runtime passwords, places them in an owned
Kubernetes Secret over stdin and injects them into the app/client environment. No
tracked password default, credential command-line argument, Secret dump or
kubeconfig artifact is published. Credentials are not committed, but a Kubernetes
Secret is not a full secrets-management system: cluster administrators can access
it, and this disposable lab does not configure etcd encryption or rotation.

Every kubectl call passes the private kubeconfig, exact context, namespace and API
request deadline. The lab never changes the user's context. Docker host/context
overrides and non-Unix endpoints are refused before daemon operations. Names are
random, existing cluster/image collisions are refused, namespace ownership is
checked from the actual API, and only exact owned cluster/image names are removed.
There is no `docker prune`, wildcard resource deletion or foreign PID kill.

The app requests 100m CPU/192Mi memory and limits 1 CPU/512Mi; its Java heap is capped
at 128Mi. The client requests 25m/32Mi and limits 500m/128Mi; client Java heaps are
32Mi. Heap is only part of container memory. During a bad rollout, up to two app
Pods can exist. Requests guide scheduling; limits do not demonstrate that these
are correct production capacities. Host kind/control-plane/build processes consume
additional resources outside those app limits.

Image build, cluster creation, image load, startup, rollout, polling, API requests
and client requests all have finite deadlines. The client Pod also has a 900-second
active lifetime. The app uses an owned 64Mi `emptyDir`; it is disposable data, **not
persistent-volume, backup or cross-Pod database recovery evidence**.

`finally` handles normal failures and interruption and deletes only the owned
cluster. The workflow has a separate always-run cleanup step as a second attempt.
If a host or job is forcibly killed before cleanup completes, rerun:

```sh
python3 examples/backend-operations/lab.py --cleanup
```

The cleanup reads private `build/owner.json`, validates the owned-name format,
uses the private kubeconfig, deletes that exact kind cluster, checks it is absent,
and removes only that run's two local image tags. A failed cleanup retains state
for retry. Do not remove the private state first and assume cleanup happened.
The script refuses to start a new run while prior owner/config state remains.

Only sanitized `build/evidence/` is uploaded. `build/kubeconfig`, `owner.json` and
runtime Secrets are excluded. Cached upstream Docker layers/node images are left
alone; reclaiming shared Docker storage is outside the lab's scope.

## Limits and next work

This single-node local cluster does not prove multi-node/zone availability, cloud
IAM, NetworkPolicy enforcement, persistent volume durability, autoscaling, TLS,
image-signing, node pressure or a managed control plane's behavior. It does not
produce latency/throughput or cost claims. Controlled cgroup OOMKilled versus Java
OutOfMemoryError, application shutdown with in-flight requests and external
secret-store integration remain separate exercises.

## Primary references

- [kind v0.33.0 release](https://github.com/kubernetes-sigs/kind/releases/tag/v0.33.0): compatible node images/digests and binary assets.
- [kind quick start](https://kind.sigs.k8s.io/docs/user/quick-start/): explicit kubeconfig/name and local image loading.
- [Kubernetes probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/): startup/readiness/liveness roles.
- [EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/) and [Service DNS](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/): ready endpoint conditions and Service resolution.
- [Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/): rolling update strategy, status and undo.
- [Install kubectl on Linux](https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/): primary binary/checksum distribution.
