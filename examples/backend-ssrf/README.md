# Stop an outbound request becoming an internal-network proxy

A backend may fetch a partner's document for a user. **Server-side request forgery
(SSRF)** happens when an attacker influences that outbound request so the backend
reaches a destination the attacker should not access. Authentication to your app
does not automatically authorize every destination reachable from its network.

This **BE-06** exercise accepts URLs for **registered partner document operations**.
It demonstrates URL policy, address checks, pinned connections, redirect refusal,
TLS identity checks and bounded work using original owned fixtures. It is **not**
a validator for arbitrary Internet URLs or an open web crawler.

Reuse [Spring Security](../../content/java-spring/09-spring-security.md),
[REST API design](../../content/java-spring/08-spring-rest-api-design.md) and the
[bounded reliability lab](../backend-reliability/README.md) for authorization,
HTTP semantics and retry/deadline background. Existing fixed JWKS/model endpoints
prevent request data choosing their destinations; that useful construction pattern
alone is not evidence of general URL/DNS protection.

## 1. Run the real local exercise

Requirements: **Linux, Python 3.12+ and an already installed OpenSSL executable**.
No Python packages, image downloads, paid providers, cloud resources or Docker are
needed. The process creates ephemeral loopback listeners, temporary certificate
keys and short-lived resolver children. From the repository root:

```sh
python3 examples/backend-ssrf/verify.py
```

The executable accepts no URL or fetch destination. It runs **18 tests**, including
**26 actual HTTP requests**, real TLS handshakes, zero-follow redirect cases, an
actual SIGTERM cancellation regression, and first TERM/INT during resolver timeout
and successful-result finalization. Missing tools, skipped tests, failed assertions
or incomplete cleanup fail the command. The dedicated
[workflow](../../.github/workflows/backend-ssrf.yml) runs the same command and
checks its sanitized `build/evidence/result.json` before passing.

[The recorded local report](evidence/2026-10-23-local.json) includes actual runtime,
LF-normalized source hashes, counts, cases and cleanup observations. To intentionally
update a dated local report after changing this lab, use `--record-local`. Runtime
`build/` output is ignored by Git; certificate/private-key material never appears
in evidence or command output. Local evidence does not replace the release's CI.

## 2. Predict each boundary

| Input or upstream behavior | Predict before running | Evidence required |
|---|---|---|
| Registered HTTPS partner and document path | Fetch succeeds | Actual peer connection, correct Host and SNI, trusted matching certificate and expected fixture bytes |
| Userinfo, suffix lookalike, encoded authority, literal IP, forbidden scheme/path/query | Reject before DNS or HTTP | Resolver call count and HTTP request count both zero |
| One prohibited address among DNS replies | Reject the entire answer set | Zero HTTP requests, even if an earlier reply would be acceptable |
| Same-authority or decoy redirect | Refuse the response | One initial request; no redirect follow and zero decoy requests |
| Wrong certificate hostname or untrusted signer | Reject before HTTP | Actual TLS verification failures and zero HTTP request handlers reached |
| Long/stalled response or slowly delivered headers | Fail within bounds | Real transport rejection, bounded elapsed time and owned cleanup |
| Resolver does not return | Kill and reap the owned child | Actual child exit `-9`, no active resolver and zero HTTP requests |

The fixture permits are **operator-created objects** pairing an exact registered
origin/port with `127.0.0.1` (or the explicitly supported exact `::1` address).
They are created only after the verifier owns its listener. They never come from
the submitted URL. Tests exercise IPv4 loopback transport; IPv6 address policy is
covered with pure input cases, not claimed as actual IPv6 HTTP evidence.
Production policy has no loopback exception and requires HTTPS. A test guard fails
before any attempted connection outside the owned fixture listeners. No cloud
metadata endpoint or foreign private service is contacted; those IP strings appear
only as denied synthetic inputs.

## 3. Follow the request without a second DNS lookup

`PartnerFetcher` receives an operator-owned registry, limits, resolver and verified
TLS context. It deliberately supports a small operation:

1. Count the invocation and acquire a bounded slot; reject overload immediately.
2. Parse an ASCII URL of at most 2,048 characters and match its exact registered
   scheme/hostname/port. Reject control characters, userinfo, backslashes, fragment,
   encoded authority, IP literals, ambiguous ports and suffix lookalikes.
3. Require `/documents/<lowercase-token>` and, optionally, one `revision=1..99`
   query. This prevents turning an approved host into an arbitrary `/admin` or
   nested-URL proxy operation. It is an explicit business contract, not a universal
   URL canonicalization rule.
4. Resolve in a dedicated `python -I` child with finite input/output/address counts,
   128Mi address-space/two-second CPU/32-descriptor process caps and a caller
   deadline. The parent kills the child's exact owned session if needed and reaps
   it. A socket timeout alone would not bound a blocking `getaddrinfo` call.
5. Validate **all** returned IPv4/IPv6 addresses. The dated conservative policy
   rejects special-use ranges, mapped/transition forms, scoped IPv6 and addresses
   outside its supported public subset. These ranges and Python classifications
   need maintenance; `is_global` alone is insufficient.
6. Choose one validated numeric address and connect directly with the matching
   socket family. The HTTP hostname is not resolved again, and there is no
   automatic fallback or pooled connection across later DNS changes.
7. For HTTPS, wrap that already connected socket using the original registered
   hostname for SNI and certificate hostname verification. Certificate-chain
   verification remains required. A numeric peer is not a replacement for TLS
   service identity. The context does not enable key logging from `SSLKEYLOGFILE`.
8. Send one GET with original Host, JSON Accept, identity encoding and connection
   close. No caller headers, Authorization, cookies, forwarded headers, environment
   proxy or cookie jar is used. Reject redirects rather than fetching their targets.

The rebinding test uses **controlled resolver replies in actual child processes**:
the first request reaches the approved numeric fixture, and a later changed answer
is rejected. The parent `getaddrinfo` guard ensures no second lookup occurred in
that controlled test. This is not an actual public-DNS rebinding experiment,
DNSSEC evidence, a resolver compromise test or proof about every routing/NAT setup.
The normal worker implements real `getaddrinfo`, but no public DNS lookup is needed
or claimed by the recorded fixture execution.

## 4. Bound the response and cancellation

Default limits are two concurrent calls, 64 total invocations, a three-second
end-to-end budget, 750ms per blocking operation, 4KiB response body and 16KiB total
application-visible HTTP wire reads. Configured maxima are two calls concurrently,
128 invocations, five seconds, 16KiB body and 32KiB wire reads. Underlying TLS/kernel
buffers can contain additional bounded transport data; this is not a literal
network-byte billing cap. Resolver startup/OS scheduling can introduce observation
lag, so this is not a hard real-time guarantee.

A socket-closing owned watchdog enforces the total budget even when a peer drips
headers often enough to avoid a per-read timeout. The HTTP parser's reader is
additionally capped, including status/header/body reads. The client rejects:

- Every `Transfer-Encoding`, including chunked and conflicting TE/Content-Length.
- Duplicate, comma-separated, malformed or over-limit Content-Length values.
  Canonical decimal text is bounded against the body cap **before** application
  integer conversion; a real 5,000-digit header regression returns `body_limit` and
  a subsequent request succeeds, proving malformed framing did not escape the
  typed result or retain the only admission slot.
- Nonidentity or multiple Content-Encoding values; no decompression is attempted.
- Non-200 responses, redirects, wrong content type, oversized or incomplete bodies.

The `application/json` header is **not JSON validation or business validation**.
The result is bounded bytes; a caller must still parse its schema, validate its
meaning and authorize any resulting action. Returned documents/links remain
untrusted input. The exercise does not forward credentials on a redirect or process
a remote document as an instruction.

Library code does not replace a caller's signal handlers. The verifier explicitly
installs a restoring main-thread TERM/INT scope so cancellation raises through its
owned-operation `finally` blocks, closes fixtures and removes temporary TLS files.
The scope defers its own cancellation handler briefly across process creation,
assignment and registration, inside an already-active cleanup `try/finally`. It
also defers the first TERM/INT through the complete resolver finalizer: exact owned
group termination when needed, bounded communication/wait and pipe closure, active
registry removal and the bounded cleanup event. Cancellation escapes only afterward,
including when the resolver had already returned a successful result. Positioned
regressions require timeout children already killed/reaped and successful children
already exited, closed pipes, completed registry/events, a healthy next library call,
preserved caller handlers/masks and an unrelated process group left running. These
exercise the existing executable scope; library calls install no signal policy. It
preserves caller signal masks and restores both previous handlers. Entry is
exception-safe: actual TERM/INT injection immediately after handler installation
but before context entry completes rolls back both handlers and the outer scoped
state. The same regression also checks normal restoration. No `preexec_fn`
is used. Masking only the main thread would be insufficient when another unmasked
thread receives the signal. A real-Popen startup regression delivers both TERM and
INT before the caller receives its return value, including delivery through a
live unmasked thread while the main thread blocks that signal. It requires exact
child reaping and restored handlers/masks. These are executable-scoped semantics;
callers using the library alone must explicitly own their cancellation policy.
A separate short-lived Linux test supervisor TERM-cancels a wrapper while its
resolver is active. It requires actual child reaping, closed fixture socket/thread,
removed keys and no remaining resolver `/proc` entry. Only this test supervisor
uses subreaping for orphan cleanup if a regression occurs. Cancellation of its own
nested subprocesses is unwound explicitly. SIGKILL/host loss cannot run Python
cleanup; this lab does not promise recovery after an uncatchable termination.

## 5. Debug, change and explain

**Symptom → hypothesis → evidence:** when a fetch fails, distinguish URL policy,
DNS/address policy, TLS identity, redirect, framing/body limit and deadline reasons.
Inspect sanitized case IDs/counts, resolver exit status and operation time. Do not
log raw URLs/query values, credentials, response bodies or private keys by default.
A high HTTP failure count is different from a policy rejection before any network
request; the fixture counters make that difference visible.

**Change one thing:** add a second allowed partner document path and its tests,
or lower a byte/time budget and predict which actual response fails. Keep the
registered origin, all-address validation and numeric connection coupled. Replacing
the numeric connection with a hostname connection recreates the validation/use
DNS gap; a controlled regression should fail before any foreign request is sent.
Removing a redirect guard is testable even for a same-authority redirect, so the
result cannot be explained only by rejecting an unrelated destination.

**Spring/backend integration:** in the evolving Task Tracker, a controller would
first authenticate the caller and authorize tenant/object access, then select an
operator-managed partner registration for that tenant. A request must not create
registrations, fixture permits, trust stores, headers or arbitrary paths. Place
fetch admission/deadlines at the service boundary and return a typed safe failure.
This Python lab demonstrates the transport controls independently; it does not
claim that a Spring controller or Java transport adapter has been added. Production
Java integration needs a maintained client with validated-address connection
control plus original-host TLS verification; checking DNS and then calling a
hostname URL with a normal client is insufficient.

**Interview answer:** “I start with the business destination and operation
allowlist. I parse input, validate every resolved address and connect to the same
approved numeric peer while keeping the original hostname for TLS and Host. I
reject redirects and bound resolution, connections, response bytes and total work.
I verify rejection before requests with counters, including a same-origin redirect
and controlled DNS change. These application controls complement egress policy;
they do not certify arbitrary URL fetching or the whole network.”

## Limits and primary references

This is a registered-partner laboratory with owned HTTP/TLS fixtures. It does not
implement unrestricted Internet fetching, egress firewall/proxy enforcement,
production DNS/PKI/CA rotation/revocation, protection against a compromised approved
partner, browser parsing behavior, arbitrary signed URLs, HTTP/2 or HTTP/3, user
credentials, document rendering or business-content safety. Explicitly add those
contracts and real evidence before making broader claims.

Primary sources checked **2026-10-21**:

- [OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html): distinguish known destinations from unrestricted fetching; combine application/network defenses.
- [Python 3.12 URL parsing security](https://docs.python.org/3.12/library/urllib.parse.html#url-parsing-security): parsing alone does not validate input.
- [Python 3.12 HTTP client](https://docs.python.org/3.12/library/http.client.html): HTTP parser and connection behavior.
- [Python 3.12 TLS](https://docs.python.org/3.12/library/ssl.html): verified chain/hostname and explicit `server_hostname`.
- [Python IP address classification](https://docs.python.org/3/library/ipaddress.html): address categories and version-dependent corrections.
