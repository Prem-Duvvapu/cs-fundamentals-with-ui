# A gateway does not replace service security

This exercise puts **actual Nginx in front of the unchanged Task Tracker**. It teaches one
boundary: a public-facing gateway may normalize forwarding metadata, reject work, and check
authentication, while the service still owns authentication, CSRF protection, roles and data
ownership. The small Java `/headers` fixture observes metadata and one fixed unauthenticated service read; it is not a new identity
endpoint or business service.

The native tests compile the Java 17 fixture and test command/cleanup contracts. They do **not**
execute Nginx. Actual execution requires Docker and the dedicated
[workflow](../../.github/workflows/backend-gateway.yml); its source-bound `result.json`, gateway
access log and successful cleanup are the evidence. No actual Docker run is claimed by this
source directory or the native test result.

## 1. Predict the path before running

Read the existing [Nginx lesson](../../content/devops/03-nginx-reverse-proxy.md),
[Spring Security lesson](../../content/java-spring/09-spring-security.md) and
[Task Tracker security journey](../java-spring/task-tracker/README.md) for the underlying concepts.
This lab adds integration evidence rather than another copy of those lessons.

```mermaid
sequenceDiagram
    participant C as Owned loopback client
    participant N as Nginx gateway
    participant T as Unchanged Task Tracker
    participant D as Metadata fixture
    C->>N: Host, Basic credentials, possibly forged forwarding headers
    Note over N: Fixed Host, 1 KiB body cap, optional per-peer rate limit
    N->>T: GET /api/projects?page=0&size=1 (auth subrequest, no original body)
    T-->>N: 2xx or 401/403
    alt authenticated API request
        N->>T: Original request, credentials, normalized forwarding headers
        Note over T: Reauthenticate; check CSRF, role and owner
        T-->>C: Business response via Nginx
    else authenticated metadata observation
        N->>D: GET /headers with normalized metadata
        D->>T: Fixed GET /api/projects, forged identity headers, no credentials
        T-->>D: 401 from service authentication
        D-->>C: Metadata and observed401, via Nginx
    end
```

Make these predictions:

1. Can `X-User: alice` authenticate a request without credentials? Can Bob read Alice's project?
2. Does a successful gateway authentication check permit a write with no CSRF token?
3. Does changing `X-Forwarded-For` create another rate-limit bucket?
4. Which layer emits 429, 503, 504, 413 and 408? What evidence distinguishes them?
5. Does a gateway timeout prove the service stopped doing work?

## 2. Run the bounded journey

Use Linux, Python 3.12, Java 17 (`java` and `javac`), and a local Unix-socket Docker daemon.
The runner refuses `DOCKER_HOST` and `DOCKER_CONTEXT` overrides and non-Unix contexts. A Docker
socket is powerful; run this on a disposable developer/CI runner, not a shared production host.
The commands pull reviewed image digests and build the existing Maven project. There are no
cloud credentials, external test targets or paid API calls.

From the repository root:

```sh
python3 -m unittest discover -s examples/backend-gateway -p test_contracts.py -v
python3 examples/backend-gateway/lab.py --run-docker
```

The executable creates three randomly named, labelled containers on one private internal Docker
backend network. Nginx alone also joins a second owned publishing bridge and publishes a random **127.0.0.1** port. Task Tracker and the fixture have no
published ports. The test client uses that exact loopback port and the fixed operator-controlled
`Host: gateway.example.test`. Unknown Host values return 400. No arbitrary target URL is accepted.
The service and fixture remain attached only to the internal backend network. The gateway's
publishing bridge can provide ordinary outbound routing; it is not production egress enforcement.
Docker may accept a publish request on an internal-only network but report a null actual mapping.
The runner inspects actual network membership/internal flags and the exact127.0.0.1 binding after
the gateway joins its publishing bridge; requested HostConfig alone is insufficient.
Containers have memory/CPU/PID limits, dropped capabilities, read-only root filesystems and bounded
temporary filesystems. Credentials are generated for this run and never printed into evidence.

The command budget is 600 seconds, with individual command/output caps and 90 seconds for
readiness. Cleanup has a separate 120-second budget. The client has at most 128 calls, eight
concurrent burst workers, five-second per-request socket timeouts and a 64 KiB response cap.
These are bounds for this controlled exercise, not a hardened arbitrary-response HTTP client.

Inspect only the sanitized output:

```sh
cat examples/backend-gateway/build/evidence/result.json
cat examples/backend-gateway/build/evidence/gateway.log
```

`result.json` schema 1 requires all **20 assertions**, no skips, the actual Nginx version, source
hashes and verified owned cleanup. Its case names are assertions over real HTTP observations,
not a simulation. A partial failure report does not count as a completed run. CI independently
requires the complete case set and the 429/503 upstream evidence.

## 3. Explain the observations

| Observation | Expected result and reason |
|---|---|
| Unknown Host | Gateway 400, before the application route |
| Missing credentials plus forged identity headers | 401 with a Basic challenge; fixture has not handled the request |
| Invalid credentials | 401 from the authentication check |
| Authenticated forged forwarding headers | Fixture sees fixed Host, actual gateway peer, `http`; untrusted identity/alternate forwarding headers are absent |
| Direct private-network service request with forged identity but no credentials | Task Tracker itself returns 401 |
| Authenticated write without CSRF | Service 403 despite successful gateway authentication |
| Alice creates then reads a project | Actual 201 then 200 |
| Bob presents forged Alice metadata | Service 404 for Alice's project; identity comes from authenticated principal |
| Viewer reads; viewer writes with valid CSRF | 200 then role-based 403 |
| Known-length or chunked body exceeding 1 KiB | Gateway 413; chunked framing does not bypass the body cap |
| Body sends one byte then becomes idle | Gateway 408 from the one-second body inactivity timeout |
| Existing dependency `failure` scenario | Genuine Task Tracker 503 with `DEPENDENCY_FAILURE`; main upstream status is `503` |
| Existing dependency `slow` scenario through `/timeout` | Gateway 504 before response headers, with a deliberately short 20 ms upstream read inactivity timeout |
| Eight requests vary forged X-Forwarded-For | Some admitted 200 and some gateway 429 share the actual peer bucket |
| Gateway 429 | `Retry-After: 1`; access log says `REJECTED` with no main upstream status |
| Valid configuration check and reload | Old worker leaves, a distinct worker appears, and a fresh authenticated request succeeds |

The table groups related checks; the receipt records 20 separately required assertions.

The service's existing `slow` fixture sleeps **80 ms**. The `/timeout` location intentionally
uses 20 ms rather than changing the service. The ordinary proxy read timeout is three seconds.
`proxy_read_timeout` measures inactivity between reads, not an overall request deadline; slow
streaming responses need a different policy. Likewise, `client_body_timeout` limits inactivity
between body reads. The harness records measured durations but does not promise exact timing
under CI scheduling. A 504 does not roll back a transaction or prove cancellation of upstream
work. This is a controlled before-response-headers timeout, not a partially streamed response.

The limiter keys `$binary_remote_addr`, with one request/second and `burst=2 nodelay` in a shared
zone. It is a per-peer, per-Nginx-instance teaching policy. NAT can group different users into
one bucket. Scaling to multiple independent gateways does not create a global limit. The
one-second Retry-After value is advisory guidance, not an exact queue/token reservation.

An authentication subrequest is still service work. For the rate-rejected requests here, the
pre-access limiter rejects before authentication/access and before the main proxy request.
The receipt's empty main-upstream field is not a general proof that every Nginx subrequest or
all infrastructure work is absent in every configuration.

## 4. Connect it to a Spring backend

`auth_request` forwards a **GET**, drops the original body and clears Content-Length. It asks
unchanged `GET /api/projects?page=0&size=1` to validate Basic credentials and its existing read
permission; both LEARNER and VIEWER can read. Nginx interprets its 2xx/401/403 result. The
authentication check does not call `/api/csrf`, whose token materialization can create an unused
session when an authentication subrequest discards Set-Cookie. Actual business writes still
obtain and send their own CSRF token and session cookie.

This fixed one-row read still consumes service/cache/database work. It is not a dedicated
stateless authentication service; such a service would need its own contract, failure policy and
operational evidence. The representative authenticated `/headers` GET sends no cookie and
asserts that its main response has no Set-Cookie. Because `auth_request` discards subrequest
Set-Cookie, that main-response assertion alone does not observe every authentication subrequest
or establish general session statelessness.

The business request still forwards credentials to Task Tracker. The service independently
checks the principal, role, CSRF token and resource owner. Merely trusting `X-User` because a
proxy supplied it would create a different, incomplete authentication design.

Task Tracker runs with `server.forward-headers-strategy=none`. This exercise therefore proves
that the **diagnostic fixture** receives normalized metadata, and that the service's security
is independent of forged metadata. It does not claim Task Tracker derives scheme/client IP from
these headers. For a deployment that does, first define the exact trusted proxy chain, prevent
direct untrusted access, strip incoming headers at the boundary, configure the chosen
container/framework mechanism, and test actual redirects, absolute links, cookie attributes,
client-IP decisions and multiple proxy hops. Do not enable generic forwarded-header processing
without that trust model.

## 5. Change one thing, then debug

Keep experiments in a disposable local copy and restore the configuration before accepting the
mandatory verifier. Do not weaken the expected observations to make an unsafe change pass.

1. Change `limit_req_status` to the default 503. Predict why client status alone would now confuse
   gateway overload with service dependency failure. Restore explicit 429 and compare logs.
2. Replace the X-Forwarded-For overwrite with `$proxy_add_x_forwarded_for`. Predict what the
   fixture would expose. Explain why the app must not blindly trust the first supplied address.
3. Raise `/timeout` above 80 ms. The controlled request may succeed; that changes the exercise,
   not the service's work. Compare the ordinary route and the configured timeout, not just status.
4. Remove CSRF headers only from the business POST. A successful authentication subrequest must
   still be followed by service 403. Do not disable CSRF to hide that failure.

When a case fails, begin with the receipt's last completed case and the case-labelled gateway
log. A gateway 502 suggests upstream availability/name resolution, not rate limiting. For 401,
check credentials and the auth subrequest; for 403, distinguish CSRF from role authorization.
For 404, check ownership as well as routing. For 429 versus 503, inspect `limit` and `upstream`.
Check `nginx -t` before reload; a successful signal alone is not a proof that a changed
configuration was accepted. The verifier observes the owned worker PID change, then verifies fresh traffic after this valid reload;
this lab does not claim long-lived-connection or failed-reload coverage.

## 6. Answer it in an interview

- **Why normalize forwarding headers?** They are client-controlled input until a defined trusted
  boundary replaces or validates them. Here the gateway overwrites the single-hop values and
  clears identity/alternate forwarding fields; the service ignores them for identity.
- **Why authenticate twice?** Gateway access checks can reject early, while the unchanged
  service retains its own principal and authorization checks. Network isolation alone is not
  user authentication, and authentication does not establish resource ownership.
- **How do you distinguish overload from a dependency failure?** Correlate the case/request with
  gateway rejection state and main-upstream status. This lab observes 429/REJECTED/no main
  upstream and separately an application-generated 503 with an upstream 503.
- **Does a timeout make retries safe?** No. Work may finish after the client sees 504. Writes
  need explicit idempotency/reconciliation policies; a timeout is not evidence of non-execution.
- **What is still missing for production?** TLS and certificate management, trusted multi-hop
  proxy deployment, distributed/user-aware fairness, real upstream health/load balancing,
  capacity tests, cloud firewall/IAM policy and operational credential management.

## 7. Verify cleanup and limits honestly

The executable restores its prior TERM/INT handlers, defers cancellation until child ownership
is assigned, and reaps the directly owned command child. Cleanup signals its owned new-session
process group even when the launcher has already exited: a descendant can still hold stdout
open. Positioned regressions exercise both deadline and TERM/INT after actual leader exit,
verify the descendant is absent or no longer running, close the captured pipe, and keep an
independent process group alive. An orphaned grandchild is reaped by its OS parent, not by this
runner. Non-group commands retain individual-child termination. Native regressions deliver actual TERM/INT at
startup, including delivery via another live thread, and during handler installation. It never
changes caller signal masks. Library helpers do not install handlers on their own.

Cleanup inspects only exact generated names/tags, requires their exact owner label, removes
matched container/network IDs, and verifies absence. It removes only its two image tags; shared
base images/caches are retained. On failure, retry while the daemon is reachable:

```sh
python3 examples/backend-gateway/lab.py --cleanup
```

A changed ownership label stops cleanup and preserves the private retry state. SIGKILL, host
loss, Docker daemon failure, or a daemon-side build outliving a disconnected CLI cannot be made
into guaranteed cleanup by a Python handler. CI retries the owned cleanup and retains only
`build/evidence/`, never the private environment/state or build context. Do not upload those
private files or use broad `docker prune`/shared-daemon cleanup.

The gateway intentionally uses **plain HTTP on loopback** for this owned teaching journey.
Basic credentials are not protected by TLS here. There is no claim of TLS termination,
production readiness, global rate limiting, cloud network isolation, protection from a Docker
administrator, or compatibility beyond the actually executed dedicated workflow.

Sources: [Nginx auth_request](https://nginx.org/en/docs/http/ngx_http_auth_request_module.html),
[Nginx request limiting](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html),
[Nginx proxy behavior and timeout semantics](https://nginx.org/en/docs/http/ngx_http_proxy_module.html).
Pinned-image verification is recorded in [PROVENANCE.json](PROVENANCE.json).

Docker network references: [port publication](https://docs.docker.com/engine/network/port-publishing/) and the [upstream internal-only publication report](https://github.com/moby/moby/discussions/53256). The report supports diagnosis, not runtime verification of this lab.

The diagnostic server reuses one bounded Java HTTP client for its fixed unauthenticated service
read. It does not launch another JVM inside the same32-PID/96MiB container. The journey observes
one Java process and the configured PID cap after the direct401 check. A prior two-JVM attempt
failed native thread creation before HttpClient's selector could start; that error is distinct from
Java heap exhaustion. The failed run did not retain cgroup counter history, so it does not prove
which OS resource was exhausted. Inspect actual process/thread, PID and memory evidence before
changing heap settings; reuse the existing diagnostic process for this exercise.
