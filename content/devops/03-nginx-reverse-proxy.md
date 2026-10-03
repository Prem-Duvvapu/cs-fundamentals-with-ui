# Nginx as Reverse Proxy & Load Balancer

Almost no production service takes traffic directly on its application port. Something
sits in front of it: terminating TLS, spreading requests across many backend instances,
serving cached static assets without ever waking the application, and absorbing the kind of
abusive or misbehaving traffic that would otherwise reach application code directly. Nginx
is the most common answer to "what is that something," and interviewers probe it because
its architecture — a small number of event-driven worker processes instead of one
thread/process per connection — is a genuinely different concurrency model from most
application servers, with its own failure modes.

### Start here: what you should be able to do

**Before:** Know that a browser calls an HTTP endpoint. No Nginx configuration experience is needed.
**After:** Trace browser → reverse proxy → backend → response, explain why the backend sees proxy headers, and locate a 502 error.

For a small Spring Boot service, send one request directly to `localhost:8080`, then through Nginx on another port. If the direct call works but the proxied call returns 502, inspect the upstream address, whether the backend is listening, and Nginx's error log. A reverse proxy is another network hop with its own configuration and failure modes.

---

## 🟢 Beginner Level

### The Core Problem: One Application Server Is Not Enough

A single application server process has a ceiling: it can only accept as many concurrent
connections as its own concurrency model allows, it exposes exactly one port on exactly one
host, and if it crashes, every client talking to it is disconnected with nothing to fail
over to. Running many copies of the application solves the *capacity* problem but creates a
new one — clients need one stable address to connect to, not a list of five backend IPs
they manage themselves and re-check on every failure. A **reverse proxy** is the component
that owns that stable address, decides which backend actually serves each request, and
hides the backend topology (how many instances, which are healthy, which are being
restarted) from every client entirely.

### Reverse Proxy vs. Forward Proxy

The two are easy to confuse because they are structurally similar — a proxy sits between a
client and a server — but they exist to protect opposite sides of that connection:

| | Forward proxy | Reverse proxy |
|---|---|---|
| Acts on behalf of | The client | The server |
| Client is aware it's using a proxy | Usually yes (configured explicitly) | No — looks like talking to the server directly |
| Typical purpose | Anonymize/filter outbound traffic, corporate content control | Load balance, terminate TLS, cache, hide backend topology |
| Example | A corporate proxy filtering employee web access | Nginx in front of an application's backend fleet |

A **forward proxy** sits in front of clients and mediates their outbound requests to
arbitrary servers; a **reverse proxy** sits in front of servers and mediates inbound
requests from arbitrary clients, presenting one address to the outside world regardless of
how many real backends exist behind it.

### Nginx's Event-Driven Architecture

Nginx does not spawn a new OS thread or process per connection, which is what makes it
handle tens of thousands of concurrent connections on modest hardware where a
thread-per-connection server would exhaust memory and context-switching overhead long
before that:

```mermaid
flowchart TB
    M["Master process (reads config, manages workers, binds ports)"] --> W1["Worker process 1"]
    M --> W2["Worker process 2"]
    M --> W3["Worker process N (typically = CPU cores)"]
    W1 --> E1["Event loop: epoll — thousands of connections, single thread"]
    W2 --> E2["Event loop: epoll"]
    W3 --> E3["Event loop: epoll"]
```

A configurable number of **worker processes** (commonly one per CPU core) each run a single
event loop handling potentially thousands of connections simultaneously — network waiting normally does not block a worker, it registers interest in a socket
becoming readable/writable and moves on to whatever other connection is ready right now.
Blocking disk operations or third-party module work can still stall a worker. This is covered in full in the Expert tier; the beginner-level takeaway is that Nginx's
concurrency scales with the number of connections, not the number of OS threads.

### Basic Reverse Proxy Configuration

This is an `http`-context excerpt, assuming a public edge proxy directly receiving client
connections and reachable example backends. A complete `nginx.conf` also needs `events {}`.
For a proxy behind another load balancer, configure its trusted address ranges and real-IP
handling rather than accepting arbitrary incoming forwarded headers.

```nginx
http {
    upstream backend {
        server 10.0.1.10:8080;
        server 10.0.1.11:8080;
        server 10.0.1.12:8080;
    }

    server {
        listen 80;
        server_name api.example.com;

        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $remote_addr;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

An `upstream` block names a pool of backend servers. `proxy_pass` forwards matching
requests to that pool. The `proxy_set_header` lines matter more than they look: without
them, the backend sees Nginx as the TCP peer and a default upstream-oriented `Host` header, unless the original client and host are conveyed by a trusted forwarding contract —
`X-Forwarded-For` and `X-Real-IP` are how the backend recovers the actual client IP for
logging, rate limiting, or geo-based logic. Trust these headers only when requests
arrive through a known proxy; a direct client can forge them.

---

## 🟡 Intermediate Level

### Load Balancing Algorithms

An `upstream` block picks which backend gets each request using one of several algorithms:

| Algorithm | Directive | Behavior |
|---|---|---|
| Round robin (default) | *(none needed)* | Requests distributed sequentially, one at a time, across all servers |
| Weighted round robin | `server ... weight=3` | Servers with a higher weight receive proportionally more requests |
| Least connections | `least_conn` | Routes to whichever backend currently has the fewest open connections |
| IP hash | `ip_hash` | A client's IP is hashed to consistently pick the same backend |

Worked example: three backends, weights `5`, `3`, `2` (summing to 10). Over any 10 requests,
round-robin-with-weights sends approximately 5 to the first server, 3 to the second, 2 to
the third — useful when backends have genuinely different capacity (a newer, larger
instance getting proportionally more traffic than an older, smaller one). `least_conn` is
the better choice when requests have wildly uneven durations — plain round robin can pile
several slow, long-running requests onto one backend by coincidence of arrival order, while
`least_conn` actively routes new requests away from an already-busy backend. `ip_hash`
trades load-balancing precision for **session affinity**: the same client IP is
deterministically routed to the same backend every time, sometimes used for affinity, but not a durability guarantee for in-memory sessions — at the cost that a single
backend going down disrupts every client hashed to it, and any client behind a NAT sharing
one public IP with many other clients all land on the same backend regardless of load.

### Health Checks and Upstream Failure Handling

Nginx's open-source version performs **passive health checks** by default: it does not
proactively probe backends, it notices failures on real traffic. `max_fails=3
fail_timeout=30s` on an upstream server means after 3 failed attempts within 30 seconds,
Nginx marks that backend unavailable and stops routing new requests to it for the next 30
seconds, after which it tries again. This means the *first* few real client requests during
an outage are the ones that discover the backend is down — there is no proactive probing
loop catching it in advance, unlike an active-health-check system (available in Nginx Plus,
or supplied by another traffic-management layer). Which failures count depends on
`proxy_next_upstream`; a one-server group ignores `max_fails` and `fail_timeout`.
Retrying after a response has started is not possible, and retrying a write after it may
have committed needs an idempotency contract, not just a second healthy backend.

```mermaid
sequenceDiagram
    participant C as Client
    participant N as Nginx
    participant B1 as Backend A (down)
    participant B2 as Backend B (healthy)
    C->>N: Request 1
    N->>B1: forward
    B1--xN: connection refused (fail 1)
    N->>B2: retry on next upstream
    B2-->>N: 200 OK
    N-->>C: 200 OK
    Note over N,B1: after max_fails within fail_timeout, B1 marked down
    C->>N: Request 2
    N->>B2: forward directly, B1 skipped
    B2-->>N: 200 OK
```

### TLS Termination

Nginx commonly **terminates TLS**: the client's encrypted connection ends at Nginx, and
Nginx talks to backends over plain HTTP inside a trusted internal network. This
concentrates certificate management in one place instead of every backend instance needing
its own certificate and TLS stack, and offloads the CPU cost of the TLS handshake and
encryption to a component built for it. The trade-off is that traffic between Nginx and the
backend is unencrypted unless a second, internal TLS layer is deliberately added (common in
zero-trust network designs where "inside the data center" is not assumed to be safe by
default).

### Caching Static Content and Proxy Responses

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g;

location /api/ {
    proxy_pass http://backend;
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_key "$scheme$proxy_host$request_uri";
    proxy_cache_bypass $http_authorization $http_cookie;
    proxy_no_cache $http_authorization $http_cookie;
    add_header X-Cache-Status $upstream_cache_status;
}
```

This `server`-context location excerpt is for public, user-independent GET/HEAD responses;
the `proxy_cache_path` line belongs in `http`, and its cache directory must be writable.
`proxy_cache_valid 200 5m` supplies a default freshness period for eligible 200 responses.
Response cache headers, `Set-Cookie`, bypass rules, eviction and other settings can change
whether an entry is stored or served. It does not guarantee a HIT for every repeated request.

The example bypasses both lookup and storage when Authorization or Cookie is present.
That is a teaching safeguard, not a universal personalization detector: keep personalized
routes out of a shared cache unless their complete identity and authorization rules are
explicitly designed. `$upstream_cache_status` helps distinguish HIT, MISS, EXPIRED and
BYPASS before attributing stale data to the application. Read the response's cache headers too.

### Request Buffering and Timeouts

Default request buffering reads the full request body before forwarding. Default response
buffering uses memory buffers and potentially temporary files to decouple a fast upstream
from a slow client; it does **not** require receiving the whole response before sending
any bytes to the client. For streaming or Server-Sent Events, inspect `proxy_buffering`,
application flush behavior and any intermediate proxies.

`proxy_read_timeout` is the allowed inactivity between successive upstream reads, not an
end-to-end deadline. With a 60-second setting, a report that sends nothing for 70 seconds
can time out; a stream sending data every 20 seconds can last longer than 60 seconds.
An application or gateway overall deadline is a separate control. If headers have already
been sent, a later timeout can truncate a response rather than produce a fresh 504 page.

---

## 🔴 Expert Level

### The Master-Worker Model and Zero-Downtime Config Reloads

The master process's most operationally important job is handling `nginx -s reload`
while normally preserving active traffic through a graceful worker transition:

```mermaid
flowchart LR
    A["nginx -s reload"] --> B["Master re-reads config, validates it"]
    B -->|"invalid"| C["Reject reload, old workers keep running unaffected"]
    B -->|"valid"| D["Master spawns new worker processes with new config"]
    D --> E["Old workers finish in-flight requests, then exit"]
    E --> F["Only new workers remain"]
```

The listening sockets remain available while workers transition: new workers are started
alongside the old ones, and old workers are told to finish whatever requests they are
currently handling and then exit gracefully rather than being killed outright — no new
connections are routed to an old worker once new workers exist, and old workers drain their active requests. A configured
`worker_shutdown_timeout`, resource exhaustion or worker failure can still interrupt work;
long-lived WebSockets may keep old workers around until closed. A syntactically invalid config is rejected *before* any new
worker is spawned, so a bad reload leaves the previous, known-good workers running
untouched rather than taking the service down — this is why `nginx -t` (test configuration)
before every reload is close to a non-negotiable operational habit.

### Connection Handling: epoll and the C10K Problem

The **C10K problem** — serving 10,000+ concurrent connections on one machine — is
historically hard because a thread- or process-per-connection model exhausts memory (each
thread's stack alone is typically megabytes) and spends increasing CPU time just context
switching between them long before reaching that count. Nginx's worker processes instead
use **epoll** (on Linux; equivalent mechanisms exist on other platforms) — a kernel facility
letting one thread register interest in thousands of file descriptors and be woken only for
the ones that actually became readable or writable, rather than the process having to poll
or block on each one individually. A single worker's event loop can therefore hold open,
idle-but-connected clients without a dedicated thread; each still consumes
socket state, file descriptors and buffers — the cost is proportional to active I/O events, not to the
raw count of open connections for idle CPU work, which is exactly the property that lets one worker process
per CPU core serve far more concurrent connections than that many OS threads ever could on
the same hardware.

### Rate Limiting: `limit_req` and a Worked Example

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    proxy_pass http://backend;
}
```

`rate=10r/s` leaks accumulated excess at about one request every 100 ms; it is not a
fresh allowance of ten immediate requests at each wall-clock second. `burst=20` allows
20 excess requests. Under an idealized empty bucket with 25 requests at the exact same
instant, one has no excess, 20 fit the burst and four are rejected.

Without `nodelay`, those 20 are delayed in roughly 100 ms steps, through about 2 seconds.
With the shown `nodelay`, the allowed 21 proceed immediately, while the excess accounting
still drains over time. Actual arrivals are not perfectly simultaneous; measure against
real timings before calling an observed count a bug. Rejection defaults to 503; configure
`limit_req_status 429` if that is the API contract you intend.

The shared zone coordinates workers of **one instance**, not an entire fleet. Ten
independent instances could permit much more traffic if a client reaches all ten. A
per-user fleet-wide quota needs an appropriate shared enforcement design.

### Production Failure Modes

**Thundering herd on mass reload/restart.** Restarting every Nginx instance in a fleet
simultaneously (a bad deploy script, an unthinking rolling restart with no stagger) means
every one of them re-establishes every upstream connection at the same moment, which can
spike backend connection counts far above steady state and trip backend-side connection
limits that were sized for gradual reconnection, not a synchronized flood.

**Sticky sessions via `ip_hash` breaking under NAT.** Many clients behind one corporate or
mobile-carrier NAT share a single public IP; `ip_hash` routes all of them to the same
backend regardless of that backend's actual load, silently creating a hot spot that looks
like unexplained uneven load from the outside — the fix is a real session store (Redis,
a database-backed session) shared across backends instead of relying on IP-based affinity.

**Buffer size misconfiguration on large headers.** Nginx allocates fixed-size buffers for
request headers (`large_client_header_buffers`); a client or an authentication proxy
sending unusually large headers (a bloated JWT in an `Authorization` header, an oversized
cookie) can exceed the default and receive a `400 Bad Request` or `414 Request-URI Too
Large` that has nothing to do with the actual backend logic — a frequent source of "it
works for most users but fails for some" bug reports traced back to session/token size, not
application code.

**Slowloris-style attacks.** A client that opens many connections and sends request data
extremely slowly, one byte at a time, can exhaust available worker connections if timeouts
are not tuned defensively; `client_body_timeout` measures inactivity between body reads, while
`client_header_timeout` bounds header reading. They do not represent one universal
whole-request deadline, closing connections that stall
past that window rather than holding them open indefinitely on the hope the client
eventually finishes.

### Common Misconceptions

- **"Nginx uses one thread per connection like a traditional web server."** It uses a small,
  fixed number of worker processes, each running a single-threaded event loop over
  `epoll`, handling potentially thousands of connections each — this is precisely why it
  scales past connection counts that would exhaust a thread-per-connection model.
- **"Reloading Nginx's config causes a brief outage."** A valid reload starts new workers
  alongside old ones and lets old workers drain in-flight requests before exiting — no
  normal traffic can continue. A forced shutdown deadline or failure can still interrupt work.
- **"Round robin distributes load evenly."** It distributes *request count* evenly, not
  actual load — a mix of fast and slow requests routed round-robin can still leave one
  backend disproportionately busy purely by the coincidence of which requests it happened
  to receive; `least_conn` targets actual concurrent load instead.
- **"`ip_hash` guarantees perfectly even load."** It aims for client-IP affinity while the usable pool is stable, which is a
  different goal — clients sharing one IP (common behind NAT) all land on the same backend
  regardless of that backend's real load, which can create hot spots invisible to per-request
  load metrics.
- **"TLS termination at Nginx means the whole path is encrypted."** It means the client-to-Nginx
  hop is encrypted; Nginx-to-backend traffic is plain HTTP unless a second internal TLS
  layer is deliberately configured — assuming otherwise is a common false sense of
  end-to-end security.

### Interview Questions

**Q1. What is the difference between a forward proxy and a reverse proxy?** `[easy]`

A forward proxy acts on behalf of the client, sitting between clients and arbitrary servers
they want to reach, typically for anonymizing or filtering outbound traffic — the client is
usually explicitly configured to use it. A reverse proxy acts on behalf of the server,
sitting between arbitrary clients and a pool of backend servers, presenting one stable
address to the outside world; clients have no idea a reverse proxy or multiple backends
exist at all.

**Q2. Why does Nginx handle many more concurrent connections than a typical thread-per-connection application server on the same hardware?** `[easy]`

Nginx uses a small, fixed number of worker processes, each running a single event loop over
a kernel facility like `epoll` that lets one thread monitor thousands of file descriptors
and only wakes up for the ones actually ready for I/O. A thread-per-connection model instead
pays a real memory cost per thread (each thread's stack alone is typically megabytes) and
increasing CPU overhead from context-switching between them, which is why it hits a much
lower practical connection ceiling on identical hardware. The trade-off is that the event
loop is cooperative: any blocking work inside a worker — a slow disk read, a synchronous
third-party module — stalls every other connection that worker is serving, which is why
Nginx pushes application work to a backend rather than doing it inline.

**Q3. What do `proxy_set_header X-Real-IP` and `X-Forwarded-For` actually solve?** `[easy]`

Without them, every request the backend receives appears to originate from Nginx's own IP
address, since Nginx is the one making the actual TCP connection to the backend — the real
client's IP is otherwise lost entirely. These headers carry the original client IP through
explicitly so backend logging, rate limiting, or geo-based logic can use the real client
address instead of Nginx's. Trust depends on the whole proxy chain, not just whether the header exists. A public edge
can overwrite incoming forwarded-client values; a proxy behind a known load balancer must
validate its immediate peer and parse the trusted chain. Configure the application to trust
only the authorized proxies, and carry the original scheme for secure redirects. Otherwise
a client can forge an identity used for logging, rate limits or access decisions.

**Q4. Explain the difference between round robin, least connections, and IP hash load balancing.** `[easy]`

Round robin distributes requests sequentially across backends regardless of how busy each
one currently is. Least connections routes each new request to whichever backend currently
has the fewest open connections, actively balancing based on real-time load rather than
just request count. IP hash deterministically routes a given client IP to the same backend
every time, trading load-balancing precision for session affinity, useful when a backend
holds in-memory session state with no shared store.

**Q5. What happens, step by step, when you run `nginx -s reload` with a valid config change?** `[medium]`

The master process reads and validates the new configuration first; if it's valid, the
master spawns new worker processes running the new configuration while the existing workers
keep running unaffected. New connections are routed only to the new workers, while old
workers are told to finish any requests they are currently handling and then exit — the intended behavior is graceful draining. A forced shutdown timeout or worker failure
can interrupt active requests, and long-lived connections may delay old-worker exit. Test
syntax with `nginx -t`, then verify actual requests and the error log after the reload.

**Q6. Why might round-robin load balancing still leave one backend meaningfully more loaded than the others, even though each receives an equal request count?** `[medium]`

Round robin balances request *count*, not request *cost* — if some requests are far more
expensive than others (a heavy report query versus a simple lookup), a backend can
accumulate several long-running expensive requests purely by the coincidence of arrival
order, while another backend's requests all happen to be cheap and finish quickly. Least
connections targets this directly by routing new requests toward whichever backend
currently has the fewest requests actually in flight, rather than by a fixed rotation.
Least-connections is not free, though — it uses per-worker state unless an upstream shared `zone` is configured,
and measures active connections rather than request cost, so a backend holding one very expensive
request still looks idle next to one holding three cheap ones.

**Q7. A client reports intermittent `504 Gateway Timeout` errors only for one specific, slow report-generation endpoint. What's the likely cause and fix?** `[medium]`

Correlate the 504 with the error log and upstream timings. `proxy_read_timeout` is an
inactivity timer between upstream reads, not a total request duration; a report that stays
silent too long can hit it while a longer stream with periodic data may not. Check backend
saturation and database time before increasing it. An endpoint-specific timeout or an
asynchronous job API can be appropriate, with an explicit overall deadline and cancellation
contract rather than allowing unbounded work.

**Q8. What does `proxy_cache_valid 200 5m` actually guarantee, and what's the first thing to check if a cached endpoint is serving data that should have already changed?** `[medium]`

It supplies a default five-minute freshness period for eligible 200 responses, not a
promise that every response is cached or every lookup is a HIT. Upstream cache headers,
Set-Cookie, authorization, bypass/no-cache settings and eviction also matter. Inspect
`$upstream_cache_status`, cache key and response headers. Use complete public-response
identity and bypass both lookup and storage for personalized traffic unless the application
has deliberately designed a safe identity-aware cache.

**Q9. Why does `ip_hash` load balancing sometimes create a hot backend that receives far more traffic than the others, even under otherwise uniform traffic?** `[medium]`

Many real clients share a single public IP address behind a NAT — a corporate network, a
mobile carrier's gateway — and `ip_hash` deterministically routes every client hashing to
the same value to the same backend regardless of how many distinct real users that
represents or how loaded that backend already is. A large enough group of NAT'd clients can
therefore concentrate disproportionate real traffic onto one backend purely because they
share one apparent IP, which per-backend request-count metrics alone won't explain without
knowing the client IP distribution. `ip_hash` also rehashes when the backend list changes,
so removing one server reshuffles a share of clients onto different backends — which is why
`hash ... consistent` exists, trading a slightly less even spread for far less churn when
the pool is resized.

**Q10. Walk through what `limit_req_zone ... rate=10r/s` combined with `limit_req ... burst=20` actually does when a client sends 25 requests at once.** `[hard]`

Assume an empty bucket and exactly simultaneous arrivals: one request proceeds without
excess, 20 fit `burst=20`, and four are rejected. At 10r/s, without `nodelay`, those excess
requests are delayed approximately 100 ms apart; with `nodelay`, the allowed burst proceeds
immediately but still consumes excess capacity until it drains. This is not a ten-request
fixed-window allowance plus twenty more. Default rejection is 503, configurable with
`limit_req_status`; a shared zone coordinates one instance's workers, not a whole fleet.

**Q11. Why is `nginx -t` before every reload considered close to mandatory operational practice?** `[hard]`

A reload with an invalid configuration is rejected by the master process before any new
worker is spawned, so the existing, known-good workers keep running completely unaffected —
but only if the master gets the chance to validate first rather than being interrupted or
scripted around. `nginx -t` performs that exact syntax and basic semantic validation ahead
of time, letting an operator catch a bad config change in a controlled way instead of
discovering it only when a scripted reload silently no-ops (or, in edge cases depending on
how the reload is invoked, potentially leaves the fleet in an inconsistent state across
instances) during an actual deploy. Its limit is worth knowing too — `nginx -t` checks
syntax and resolvable references, not intent, so a config that parses cleanly can still
point `proxy_pass` at the wrong upstream or drop a `location` block that a live route
depended on.

**Q12. How does Nginx's event-driven model let one worker handle thousands of slow, idle-but-open connections (like long-polling or websockets) without proportionally more resource usage?** `[hard]`

Each connection registered with `epoll` costs the kernel a lightweight file-descriptor entry,
not a dedicated thread or process — the worker's single event loop is only woken up when a
specific connection actually has readable or writable data, so a connection that is open but
idle consumes essentially no CPU time while it waits. This is fundamentally different from a
thread-per-connection model, where every open connection ties up a full OS thread's memory
and scheduling overhead regardless of whether that connection is currently doing anything at
all, which is exactly why event-driven servers scale to far higher counts of mostly-idle,
long-lived connections on the same hardware. The ceiling moves rather than disappearing:
each idle connection still holds a file descriptor and a per-connection buffer, so the
binding limits become `worker_connections`, the process `nofile` ulimit, and memory for
buffers — which is what you actually tune when a worker starts refusing connections.

**Q13. A fleet-wide restart of every Nginx instance at the same moment causes a spike in backend errors immediately afterward. What's the mechanism, and how would you prevent it?** `[hard]`

Every restarted instance re-establishes its upstream connections and begins routing live
traffic to backends at essentially the same moment, which can produce a synchronized surge
in new backend connections far above the gradual, staggered pattern the backend's own
connection limits and connection-pool sizing assumed. The fix is restarting instances in
a staggered rolling fashion — a fraction of the fleet at a time, with a pause between
batches — so backend connection counts ramp up gradually instead of all at once, the same
principle behind a Kubernetes Deployment's rolling update `maxSurge`/`maxUnavailable`
bounds. The same spike can arrive without a restart, since `keepalive_timeout` expiring
across a fleet synchronises reconnections on its own — which is why backends that care
about this jitter their timeouts rather than relying on restarts always being staggered.

**Q14. Why can a client's authentication token size alone cause `400 Bad Request` errors at the proxy layer that have nothing to do with the backend application?** `[hard]`

Nginx allocates fixed-size buffers for request headers via directives like
`large_client_header_buffers`, and a request with a single header field too large for one configured large-header buffer, or
aggregate headers beyond the available buffers is rejected by Nginx itself before the request ever reaches the
backend application. The handler never sees the rejected request, although the
application's token design may be what made the header excessively large. The fix is either increasing the relevant buffer-size directive to accommodate the
actual token size in use, or reducing what is carried in the header (a shorter session
reference instead of an inline token) if the token size itself is avoidable.

### Further Reading

 [Nginx's own documentation on load balancing](https://nginx.org/en/docs/http/load_balancing.html)
covers every algorithm and its exact directives; the
[Nginx architecture whitepaper on connection processing](https://nginx.org/en/docs/events.html)
explains the event-loop model referenced throughout; the
[C10K problem essay](http://www.kegel.com/c10k.html) is the original write-up of the
scaling problem event-driven servers like Nginx were built to solve.

The [proxy module reference](https://nginx.org/en/docs/http/ngx_http_proxy_module.html) defines buffering, caching and inactivity timeouts; [request limiting](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html) defines burst handling. [Controlling Nginx](https://nginx.org/en/docs/control.html) explains graceful reloads; the [HTTP core reference](https://nginx.org/en/docs/http/ngx_http_core_module.html) defines header buffers and shutdown timeouts. [Upstream configuration](https://nginx.org/en/docs/http/ngx_http_upstream_module.html) covers failure accounting and shared worker state.
