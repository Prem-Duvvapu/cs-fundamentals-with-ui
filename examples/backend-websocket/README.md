# Authenticated WebSockets with the existing Task Tracker

This BE-06 / BEC-12 / BEC-56 exercise makes a real HTTP session login, upgrades a
real connection, exchanges bounded JSON, and observes rejection and cleanup.
It imports the **unchanged** [Task Tracker](../java-spring/task-tracker/README.md)
Java/resources. It adds a small transport adapter, not another task service.

Start with the [application protocols lesson](https://cs-fundamentals-with-ui.vercel.app/topic/application-layer)
for WebSocket versus SSE/polling and the
[security lesson](https://cs-fundamentals-with-ui.vercel.app/topic/spring-security)
for authentication, authorization, sessions and CSRF.

## 1. Run the actual exercise

Requirements: native **Java 17**, Maven, Python 3.10+, loopback sockets and enough
temporary disk space for two tiny H2 databases. No Docker, Python packages,
external identity provider, model, cloud account or paid service is needed.

From the repository root:

```sh
cd examples/backend-websocket
python3 -m unittest -v test_verify.py
python3 verify.py --prepare
```

`--prepare` allows normal public Maven resolution of the declared dependencies.
The subsequent actual verification always uses Maven **offline**. Later runs:

```sh
python3 verify.py
```

The successful receipt is `target/evidence/verification.json`, containing 21
named transport cases, the six required policy tests, actual child JVM feature
and full runtime version, executed framework versions, source/JAR hashes and
cleanup outcomes. Compiler release 17 and emitted class major 61 are checked
separately; a newer JVM targeting 17 does not satisfy the actual Java 17 gate.
CI rejects skipped/missing/failed cases and publishes **only sanitized JSON**.

All users/passwords are generated per run; H2 paths are private temporary paths.
Both application instances use `127.0.0.1` and OS-assigned port 0. Clients use an
explicit direct proxy selector; the harness removes inherited proxy variables,
Spring configuration overrides and JVM/Maven option injections. It supplies its
own temporary Maven settings and does not read a personal Maven settings file.
It does not change global Java, platform routes, Task Tracker source or config.

## 2. Predict the identity boundary

1. An HTTP request obtains a CSRF token and a pre-login session cookie.
2. A real form POST sends that token plus the generated user/password.
3. Spring authenticates through Task Tracker's existing `UserDetailsService` and
   `PasswordEncoder`, rotates the session ID, replaces the CSRF token and saves
   the security context in the HTTP session.
4. The WebSocket client sends the authenticated cookie and allowed Origin in its
   HTTP upgrade. It sends **no Authorization header or credential query string**.
5. Spring's inherited authenticated `Principal` supplies the response identity.
   An echo request cannot select its identity or a recipient.

Task Tracker's original HTTP Basic requests and CSRF-token session should not be
mistaken for evidence of cookie-only form login. This module adds that explicit
session login in a chain matching only `/lab/session/**` and `/lab/ws/echo`.
The existing REST/JWT chain code stays unchanged. The real integration repeats
its Basic + mutation-CSRF + cross-owner denial checks.

The module's authenticated session is part of the same application; normal REST
authorization can also read that session. Existing roles and owner checks still
apply. A narrow chain does not create an independent identity store.

| Operation | Actual expected result |
|---|---|
| Anonymous upgrade | HTTP 401, no WebSocket |
| Wrong login password | HTTP 401 |
| Missing or another session's login CSRF | HTTP 403 |
| Correct form login | HTTP 204, actual session cookie rotation |
| Old cookie or pre-login CSRF token | Unauthorized / forbidden |
| Authenticated viewer upgrade | HTTP 403 |
| Alice or Bob, correct session and Origin | HTTP 101, own principal only |
| Missing/null/foreign/duplicate Origin or any query | HTTP 403 |

Cookies are HttpOnly with SameSite=Lax in the controlled launch. This is **local
HTTP/ws**, not TLS/wss certification. Remote deployment needs TLS, Secure cookies,
an operator-owned external Origin allowlist, proxy review and hardened identity.

## 3. Understand CSRF and Origin separately

Login and logout are ordinary unsafe HTTP POSTs, so normal Spring CSRF protection
remains enabled. The original REST mutations still require their same-session
CSRF token. The WebSocket GET upgrade does **not** automatically require that token,
and raw WebSocket frames do not pass through Spring's HTTP CSRF filter.

The separate handshake interceptor therefore requires exactly one Origin equal
to `http://127.0.0.1:<actual bound local port>`. It does not trust a supplied Host,
forwarded host, wildcard, URL parameter or absent Origin. Spring's default
same-origin protection remains enabled too. A nonbrowser can forge Origin;
cookie authentication and role authorization remain essential. This run uses
native clients, so it proves server policy, not a human browser session.

## 4. Exchange the strict echo/ACK protocol

One text **message**, possibly composed of several frames:

```json
{"type":"echo","id":"request-1","text":"Explain the upgrade"}
```

The server replies only on that same connection:

```json
{"type":"echo","id":"request-1","text":"Explain the upgrade","principal":"alice"}
```

After processing the reply, the client releases one application credit:

```json
{"type":"ack","id":"request-1"}
```

Echo has exactly `type/id/text`; ACK has exactly `type/id`. Unknown fields,
duplicate keys, nested values, trailing JSON, invalid IDs, control characters,
unpaired surrogates, duplicate echo IDs and unknown ACKs are rejected. Nothing is
evaluated as HTML, Java, a command or a routing instruction. The JSON identity is
server-supplied; there is **no chat, recipient routing, broadcast or project update**.
Two simultaneous Alice/Bob connections test same-connection isolation.

## 5. Measure finite capacity

| Resource | Controlled limit / observed behavior |
|---|---|
| WebSocket admission | 3 total, 2 per principal; excess HTTP 429 before upgrade |
| Pending successful upgrade | Reservation expires after 2 seconds if no endpoint opens |
| HTTP container | 8 request threads, 16 connections, accept queue 8 |
| HTTP sessions | Tomcat maximum 32, no session persistence file |
| HTTP header/form/parameters | 4 KiB / 2 KiB / 8; request/keep-alive connection timeout 2 s |
| Incoming text/binary buffer | 1024 bytes; actual whole and fragmented oversize rejection |
| Echo content and ID | 128 UTF-16 units, 32 restricted ID characters |
| Unacknowledged echoes | 4; fifth closes 1013, pending ACK deadline 2 seconds |
| Outbound pending queue | At most 4 messages / 4096 UTF-8 bytes, one native async send at a time |
| Commands | 32 total per socket, including ACKs |
| Application idle | Ordinary test 2.5 s; configurable bounded 1–30 s, default 10 s |
| Absolute WebSocket authentication lease | 30 s; reconnect requires another authenticated upgrade |
| Native Tomcat send/close | 500 ms blocking-send and close user properties, 500 ms async-send timeout |
| Client | Connect 2 s, HTTP/reply/close finite futures, 16 KiB HTTP body, 8-message reply queue |
| Harness | Whole execution 300 s; Maven verification 175 s; output 128 KiB; report 64 KiB |

The cap is reserved atomically **before** HTTP 101. Failed protocol upgrades,
transport close/error, logout/session-ID change, expiry and application shutdown
release it idempotently. Tomcat can call `onOpen` after the HTTP handler returns;
successful upgrades must not be released just because `onOpen` has not run yet.

The actual slow-application experiment receives four replies but deliberately
withholds ACKs. It proves application credit/queue/deadline behavior. It **does
not** prove that the peer's TCP receive window stopped or that kernel buffers
filled. JDK `request(n)` is not a portable way to stop TCP reading.

The implementation configures and reads back the native Tomcat properties on
the actual declared container, and reports its actual version. These settings
are not an observed kernel-stall timeout experiment or a hard OS scheduling
guarantee. A `ConcurrentWebSocketSessionDecorator` time limit alone would not
interrupt a lone blocked write. The owned process deadline is the outer bound.

## 6. Observe session lifetime and reconnect honestly

Logout without CSRF is forbidden. A valid logout invalidates the real session,
closes its sockets and denies reuse of the old cookie. Reauthentication rotates
the session ID; a session-ID listener closes sockets associated with the previous
identity before a new socket can claim the new principal.

The ordinary matrix uses 120-second HTTP session idle expiry. A **separate**
application instance uses a 2-second operator-configured interval and a 10-second
socket idle limit. After waiting, a real cookie HTTP request causes Tomcat to
recognize expiration: it returns 401, emits session destruction, and closes the
associated WebSocket. This expiry cannot accidentally explain ordinary ACK tests.

WebSocket frames do not refresh servlet HTTP session access time. Container
background expiry is not promised instantaneous; the measured case is expiration
recognized on the next HTTP request. The independent fixed WebSocket lease bounds
an otherwise active old connection. This is one-process in-memory session state,
not distributed revocation, shared progress or cross-instance session replication.

Disconnect loses this ephemeral echo state. Reconnect performs a new handshake;
there is no durable delivery, replay cursor or automatic retry guarantee. A real
notification product would need authorized routing, event durability, fan-out,
proxy Upgrade support and explicit reconnect/backoff semantics.

## 7. Debug, change, and explain

Use **symptom → hypothesis → evidence → cause → repair → regression → interview**:

- **401 before upgrade:** check that form login saved a context and the rotated
  cookie is used. An old ID or CSRF-only session is not authenticated identity.
- **403 before upgrade:** separate role denial from exact Origin/query policy.
  Do not disable CSRF or permit every Origin to make a test green.
- **429 despite disconnects:** inspect the named failed-upgrade/cleanup cases;
  reservation leakage and late `onOpen` are different lifecycle bugs.
- **1013 after replies:** inspect missing ACKs and finite credits. Do not diagnose
  TCP congestion from this application-level signal.
- **1008 near expiry/logout:** distinguish HTTP session invalidation, ID change,
  application idle and the absolute WebSocket lease.
- **1006 at shutdown:** the transport disappeared without a close frame. The
  tested fix closes sockets on `ContextClosedEvent` before container teardown.

Predict a result, change only an owned module limit, run the named regression,
and inspect the diff. Preserve the original business/REST tests. Do not remove
negative tests to “fix” authentication. Failed runs do not retain an old successful
receipt. Local Surefire files identify failing named assertions; they are not CI
uploads. No password, cookie, CSRF token or message body is deliberately logged
or included in published evidence.

**Interview:** “What authenticates a WebSocket?” The HTTP upgrade inherits a
verified principal; then authorization, browser Origin policy, message validation
and lifecycle/revocation rules still need enforcement. **“Why ACKs?”** They bound
application work independently of whether a network send returned. **“Can this
scale across nodes?”** Not as written: these sessions/admission counters are local;
shared session/routing state and failure semantics need a separate design.

## 8. Evidence boundaries and sources

The teaching fixtures are original synthetic automated cases. They do not prove
a real learner, human IDE/browser session, accessibility, production capacity,
network isolation/sandboxing, TLS, cross-node fan-out or account abuse controls.
The harness executes only checked-in Maven/JDK targets, not arbitrary generated
shell, URLs or code. It terminates its own process group on TERM/INT, deadlines or
output overflow, defers cancellation across child ownership, restores handlers
and closes pipes. SIGKILL, power loss and hostile executable binaries cannot be
given a cleanup guarantee.

Verified compatibility: Boot 4.1.1 starter → Boot WebSocket 4.1.1 → Framework
WebSocket/messaging 7.0.9, Security 7.1.1, Tomcat 11.0.24; Java release/runtime 17.
The isolated POM retains Task Tracker's parent, original dependencies and resource
imports; the verifier rejects drift and hashes imported files before/after.

- [Spring 7.0.9 WebSocket server API and origin behavior](https://docs.spring.io/spring-framework/reference/web/websocket/server.html)
- [Spring 7.0.9 container limits API](https://docs.spring.io/spring-framework/docs/7.0.9/javadoc-api/org/springframework/web/socket/server/standard/ServletServerContainerFactoryBean.html)
- [Spring Security session persistence and explicit saving](https://docs.spring.io/spring-security/reference/servlet/authentication/persistence.html)
- [Tomcat 11 WebSocket timeout controls](https://tomcat.apache.org/tomcat-11.0-doc/web-socket-howto.html)

Read the resolved POM and compile against the actual managed version; do not mix
cached Spring 6.2 or Boot 3.x WebSocket libraries into this Spring 7 application.
