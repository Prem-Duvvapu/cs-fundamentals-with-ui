# Transport Layer: TCP vs UDP & Connection Management

TCP and UDP provide process-to-process delivery above IP, using ports to multiplex many applications on one host.
TCP adds an ordered reliable byte stream and congestion-aware connection state; UDP preserves message boundaries with minimal transport policy.
Choosing between them means choosing which guarantees the application must implement, observe, and recover itself.

## 🟢 Beginner Level

### TCP vs. UDP Protocols

The Transport Layer provides process-to-process communication using **Port Numbers**.

```mermaid
flowchart LR
    A["Application"] --> T{"Transport choice"}
    T -->|"TCP"| R["Ordered byte stream"]
    T -->|"UDP"| D["Independent datagrams"]
    R --> I["IP packets"]
    D --> I
```

```
CLIENT (Port 5173)                                  SERVER (Port 80)
┌───────────────────┐                              ┌───────────────────┐
│ Application Data  │                              │ Application Data  │
└─────────┬─────────┘                              └─────────▲─────────┘
          │                                                  │
          ▼                                                  │
┌───────────────────┐   TCP (Reliable, Ordered, Stream)    ┌─┴─────────────────┐
│ Transport Header  │ ────────────────────────────────────►│ Transport Header  │
└───────────────────┘   UDP (Fast, Unreliable Datagrams)   └───────────────────┘
```

#### Key Differences

| Feature | TCP (Transmission Control Protocol) | UDP (User Datagram Protocol) |
| :--- | :--- | :--- |
| **Connection Mode** | Connection-oriented (Handshake required) | Connectionless (Fire and forget) |
| **Reliability** | **Guaranteed** (ACKs, Retransmissions) | No guarantees (Packets may drop) |
| **Ordering** | In-order delivery via Sequence Numbers | Out-of-order delivery possible |
| **Header Overhead** | **20 Bytes minimum** | **8 Bytes fixed** |
| **Use Cases** | Web (HTTP/HTTPS), Email (SMTP), SSH | Video Streaming, Online Gaming, DNS |

---

## 🟡 Intermediate Level

### TCP connection management and reliability

TCP's defining characteristics are a connection-oriented, full-duplex, ordered, reliable byte stream rather than independent application messages. Its **three-way handshake** exchanges initial sequence numbers and confirms that both endpoints can send and receive before application bytes flow. Graceful close normally uses a **four-way termination** because each endpoint shuts down its sending direction independently.

TCP assigns **sequence numbers** to bytes, and cumulative **ACKs** report the next contiguous byte expected. A **sliding window** permits multiple bytes to remain in flight instead of waiting after every segment. Receiver-advertised **flow control** prevents a fast sender from overrunning one endpoint, while path-oriented **congestion control** reduces traffic when the network shows loss, delay, or explicit congestion signals.

Reliability comes from checksums, ordered reassembly, acknowledgments, timers, and **retransmission** after inferred loss; it does not guarantee that an application processed a request exactly once. **TCP vs UDP** is therefore a semantics choice: UDP sends independent datagrams without built-in connection setup, ordering, retransmission, flow control, or congestion control, so applications that need those behaviours must supply them.

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    C->>S: SYN seq x
    S-->>C: SYN-ACK seq y ack x+1
    C->>S: ACK ack y+1
    Note over C,S: ESTABLISHED
```

```
TCP 3-WAY HANDSHAKE (Connection Setup):
Client (CLOSED)                                        Server (LISTEN)
  │                                                      │
  │ ──────── SYN (seq = 100) ──────────────────────────► │ (SYN_RCVD)
  │                                                      │
  │ ◄─────── SYN-ACK (seq = 300, ack = 101) ──────────── │
  │                                                      │
  │ ──────── ACK (ack = 301) ──────────────────────────► │ (ESTABLISHED)
  ▼ (ESTABLISHED)                                        ▼

TCP 4-WAY HANDSHAKE (Connection Teardown):
Client (ESTABLISHED)                                   Server (ESTABLISHED)
  │ ──────── FIN (seq = 500) ──────────────────────────► │ (CLOSE_WAIT)
  │ ◄─────── ACK (ack = 501) ─────────────────────────── │
  │                                                      │
  │ ◄─────── FIN (seq = 700) ─────────────────────────── │ (LAST_ACK)
  │ ──────── ACK (ack = 701) ──────────────────────────► │ (CLOSED)
  ▼ (TIME_WAIT: 2 * MSL)
```

---

## 🔴 Expert Level

### Socket Programming & Port Multiplexing

```mermaid
stateDiagram-v2
    [*] --> CLOSED
    CLOSED --> SYN_SENT: active open
    CLOSED --> LISTEN: passive open
    SYN_SENT --> ESTABLISHED: SYN-ACK then ACK
    LISTEN --> ESTABLISHED: SYN received
    ESTABLISHED --> FIN_WAIT: local close
    ESTABLISHED --> CLOSE_WAIT: peer FIN
    FIN_WAIT --> TIME_WAIT: final ACK
    TIME_WAIT --> CLOSED: timeout
```

A TCP connection endpoint is defined by a unique 4-tuple:
$$\text{Connection ID} = (\text{Source IP}, \text{Source Port}, \text{Dest IP}, \text{Dest Port})$$

This allows a single web server on Port 80/443 to handle hundreds of thousands of concurrent client connections simultaneously without port exhaustion.

### Sequence Numbers, ACKs, and Byte Streams

TCP numbers bytes, not application messages.

An ACK acknowledges the next byte expected.

The receiver can buffer out-of-order segments and present only contiguous bytes to the application.

This is why one `send` does not imply one matching `read`.

Applications need their own message framing such as lengths, delimiters, or a protocol grammar.

UDP preserves one datagram boundary for each receive operation.

It can still lose, duplicate, reorder, or truncate messages when buffers or limits intervene.

### Worked Example: Window and Flight Size

Assume a 100 Mb/s path with 40 ms round-trip time.

The bandwidth-delay product is $100{,}000{,}000 \times 0.040 = 4{,}000{,}000$ bits.

That is 500,000 bytes in flight to fill the path.

With 1,460-byte TCP payloads, about $500{,}000 / 1460 \approx 343$ segments can be outstanding.

The effective send window is the smaller of receiver window and congestion window.

A 64 KiB receive window would therefore cap this example below link capacity.

Window scaling permits larger advertised windows when both peers negotiate it.

### Reliability and Failure Boundaries

TCP retransmits when acknowledgments suggest loss.

It cannot know whether a peer application processed bytes before a connection failed.

An HTTP client retry can therefore repeat a server-side effect.

Use idempotency keys or transactional business state for payments and creates.

UDP is appropriate when timeliness matters more than complete delivery, or when an application supplies its own protocol.

DNS, real-time media, games, and QUIC use UDP for different reasons.

### Flow Control and Congestion Control

Receiver flow control protects one receiver buffer with an advertised window.

Congestion control protects the network path by limiting a sender's congestion window.

They are independent limits.

Slow start grows cautiously from a small window.

Congestion avoidance grows more slowly after a threshold.

Loss, ECN, or delay signals can reduce sending rate.

### TIME_WAIT and Safe Reuse

The endpoint that sends the final ACK enters TIME_WAIT.

It keeps state long enough for delayed segments to expire and for a lost final ACK to be repeated.

TIME_WAIT is normal for active closers, not automatically a leak.

Exhaustion often indicates connection churn, incorrect pooling, or too few ephemeral ports.

Do not suppress it with unsafe reuse settings before measuring the workload.

### SYN Backlogs and Cookies

A listening server holds partial state after receiving a SYN.

A SYN flood can fill that backlog with spoofed or incomplete opens.

SYN cookies encode enough validation state in the initial sequence number under pressure.

The server allocates full connection state only after the final ACK proves reachability.

Cookies are mitigation, not a replacement for rate limits and capacity planning.

### Teardown Is Half-Duplex

TCP permits each endpoint to close its sending direction independently.

A FIN means “I will send no more bytes.”

It does not mean “I can no longer receive.”

The peer acknowledges that FIN and can finish bytes already queued for its own sending direction.

It later sends its own FIN when finished.

This produces the familiar four logical control messages.

An RST is different from FIN.

It aborts a connection without the graceful byte-stream completion contract.

Applications should distinguish a clean EOF from reset and timeout failures.

Closing a socket while another component still expects a response can create partial application transactions.

Coordinate shutdown with request deadlines and idempotent recovery.

### Retransmission Timers and Loss Signals

TCP estimates round-trip time from acknowledged segments.

It derives a retransmission timeout with variance so a short transient delay does not cause premature retransmission.

An ACK that repeats the same next expected byte can indicate a missing segment.

Several duplicate acknowledgments can trigger fast retransmit before the timer expires.

Selective acknowledgments help a sender identify received ranges beyond the gap.

Retransmission is not proof that a packet was lost; an ACK may have been delayed or lost.

The receiver must handle duplicate segments safely.

Excessive retransmissions can indicate congestion, Wi-Fi loss, interface errors, asymmetric routing, or overloaded endpoints.

Compare retransmission metrics with RTT, packet loss, queue delay, and server CPU before blaming one layer.

### Receive Buffers and Backpressure

A TCP receiver advertises how much buffer space it can accept.

When an application reads slowly, its receive buffer fills.

The advertised window shrinks and can reach zero.

The sender pauses ordinary data transmission until a window update arrives.

This protects memory but transfers pressure toward the producing application.

Backpressure is valuable only when upstream components honor it.

An unbounded application queue before the socket can still exhaust memory while TCP correctly advertises a small window.

Design queues, timeouts, and admission control as one flow-control policy.

### Socket Lifecycle and Resource Limits

Each accepted connection consumes kernel state, file descriptors, buffers, and application memory.

Servers also need a listening backlog for pending handshakes and accepted connections awaiting worker capacity.

Increasing every limit can only move overload to CPU, memory, or a dependency.

Set file-descriptor limits, backlog, application concurrency, and downstream pools from measured traffic and latency budgets.

Use keep-alive when reuse is safe to reduce handshake and TIME_WAIT churn.

Use idle deadlines so abandoned peers do not retain resources forever.

Application heartbeats are useful when an otherwise idle long-lived protocol needs to detect a dead peer sooner than TCP alone can.

They should have jitter and failure thresholds to avoid synchronized traffic spikes.

### NAT, Ephemeral Ports, and Proxies

Clients normally choose ephemeral source ports.

A NAT device may translate many internal tuples to a smaller public address and port space.

This state can expire during idle periods or be exhausted by very high connection churn.

Load balancers and proxies terminate one TCP connection and create another upstream connection.

The end-to-end application request then spans several independent transport connections.

Timeouts must be coherent across client, proxy, server, and downstream service.

Otherwise an upstream can abandon work while a downstream continues consuming resources.

Log connection and request identifiers separately because one is not a stable substitute for the other.

### Transport Security and Protocol Choice

TCP itself does not encrypt or authenticate application data.

TLS usually runs above TCP to provide confidentiality, integrity, and peer authentication.

TLS handshake latency and certificate validation are part of the connection budget.

UDP also provides no encryption by itself.

QUIC integrates transport-like reliability, congestion control, and TLS over UDP.

It avoids TCP head-of-line blocking between independent streams but still shares path congestion and endpoint limits.

Choose a protocol based on semantics, ecosystem support, observability, and operational maturity.

Do not choose UDP merely to bypass a firewall or TCP merely to avoid defining an application protocol.

### Measuring a Connection Problem

Start with the symptom: connect failure, timeout, reset, slow first byte, stalled transfer, or duplicate request.

Identify the exact hop and timestamp using client, proxy, and server logs.

Inspect DNS resolution, handshake time, TLS time, application queue time, request processing, and response transfer separately.

Use packet capture only with privacy controls and a clear capture point.

Kernel socket statistics show states, retransmissions, listen drops, and orphaned connections.

Application metrics show request outcomes and pool saturation that packet counters cannot explain.

Test under realistic loss, delay, and reconnect conditions rather than only on a local loopback interface.

### TCP Options and Middleboxes

Peers negotiate options in SYN segments.

Common options include maximum segment size, window scaling, selective acknowledgment permission, and timestamps.

Middleboxes that drop unfamiliar options or ICMP can break path behavior in ways not visible in local tests.

MSS is the maximum TCP payload per segment and is commonly derived from path MTU minus IP and TCP headers.

Reducing MSS can avoid fragmentation through tunnels at the cost of more headers and packets.

Path-MTU discovery failures often appear as connections that establish and small requests succeed while larger transfers hang.

Treat such a symptom as a path and firewall investigation, not immediately as a server application bug.

### Graceful Service Shutdown

A server shutdown should stop accepting new work before destroying active connections.

It can advertise draining at a load balancer, wait for bounded in-flight requests, and then close remaining sockets according to a deadline.

Long-lived streams need an explicit reconnection and resume contract.

Blindly killing a process produces resets and pushes retry work to every client at once.

Staggered draining and retry jitter prevent a reconnect storm during deployment.

The business layer must still make interrupted requests idempotent because graceful shutdown cannot cover power loss or forced termination.

### Common Misconceptions

1. **"TCP preserves writes as messages."**
   *Correction*: TCP is a byte stream. Application framing is required.

2. **"UDP is always faster."**
   *Correction*: It avoids TCP features, but loss recovery and security may move work to the application.

3. **"TCP guarantees exactly once."**
   *Correction*: It provides reliable ordered bytes while connected, not exactly-once business effects after retry.

4. **"TIME_WAIT is an error."**
   *Correction*: It protects against delayed segments and lost final acknowledgments.

5. **"Ports identify a process globally."**
   *Correction*: A connection is identified by protocol and address-port tuple, not one port alone.

### Interview Questions

**Q1. What does TCP provide that UDP does not?** `[easy]`

TCP provides an ordered reliable byte stream with connection state. It uses sequence numbers, acknowledgments, retransmission, flow control, and congestion control. UDP leaves these choices to the application.

**Q2. Why does TCP need a three-way handshake?** `[easy]`

Both peers must exchange initial sequence numbers and confirm reachability. The final ACK confirms the client received the server's sequence number. This prevents stale connection attempts from creating a fully established session alone.

**Q3. Why are ports required?** `[easy]`

Ports multiplex traffic to applications on one IP address. They let a host distinguish HTTPS, DNS, and many concurrent client sessions. A port is local endpoint information, not a globally unique connection identifier.

**Q4. Why is TCP a byte stream?** `[easy]`

TCP exposes ordered bytes rather than sender write boundaries. One read can return part of a message or several messages. Protocols must define lengths or delimiters before parsing.

**Q5. What is the TCP four-tuple?** `[medium]`

It is source address, source port, destination address, and destination port, with protocol understood. Many clients can connect to one server port because their source tuple differs. NAT can rewrite tuples while maintaining mappings.

**Q6. How do flow and congestion control differ?** `[medium]`

Flow control limits data for the receiver's available buffer. Congestion control limits data for the path's observed capacity. The sender obeys the smaller effective window.

**Q7. What does an ACK number mean?** `[medium]`

It normally identifies the next byte the receiver expects. It cumulatively confirms all earlier contiguous bytes. Selective acknowledgment can report additional received ranges.

**Q8. Why can an application retry create duplicate effects over TCP?** `[medium]`

The network can fail after a server acted but before a client saw a response. TCP reconnection cannot reveal that business outcome automatically. A durable idempotency key resolves the ambiguity.

**Q9. What is TIME_WAIT for?** `[medium]`

It lets delayed old segments expire before a tuple is reused. It also permits retransmission of the final ACK if the peer repeats FIN. Removing it unsafely risks old traffic entering a new connection.

**Q10. What is a SYN flood?** `[medium]`

It fills a server's pending-handshake capacity with incomplete opens. SYN cookies defer expensive state allocation until a valid final ACK arrives. Rate limiting and filtering complement cookies.

**Q11. When is UDP a good fit?** `[medium]`

It suits small independent messages or latency-sensitive data where an application manages loss and ordering. It is also the substrate for protocols such as QUIC. The application must budget validation, retries, and amplification defense.

**Q12. Scenario: a client receives occasional duplicate payment confirmations after retries. What changes?** `[hard]`

Treat the request as ambiguous after timeout rather than assuming TCP failure means no server action. Include one idempotency key and persist its outcome transactionally. Return the stored result for a repeated key.

**Q13. Scenario: a server has thousands of TIME_WAIT sockets. What do you inspect?** `[hard]`

Measure connection rate, active closer behavior, ephemeral-port use, and keep-alive policy. TIME_WAIT is expected under high short-lived connection churn. Reduce needless churn with safe pooling or protocol reuse before changing kernel timeouts.

**Q14. Scenario: a UDP game has low latency but missing state updates. What do you add?** `[hard]`

Classify updates as replaceable or essential. Add sequence numbers and selective recovery only for essential state while allowing stale movement updates to expire. This preserves timeliness instead of blindly copying TCP behavior.

### Further Reading

- [RFC 9293: Transmission Control Protocol](https://www.rfc-editor.org/rfc/rfc9293) defines modern TCP behavior.
- [RFC 768: User Datagram Protocol](https://www.rfc-editor.org/rfc/rfc768) defines UDP.
- [RFC 7323: TCP window scaling](https://www.rfc-editor.org/rfc/rfc7323) documents high-performance TCP extensions.

### Interview Questions

1. **Why does TCP connection termination require 4 steps instead of 3?**
   - *Answer*: Because TCP connections are **Full-Duplex**. One side closing its sending channel with `FIN` does not prevent it from still receiving incoming data from the remote side until the remote side sends its own distinct `FIN`.

2. **What is the SYN Flood attack and how do SYN Cookies mitigate it?**
   - *Answer*: An attacker floods thousands of spoofed `SYN` packets without sending final `ACK`s, exhausting the server's SYN backlog queue memory. **SYN Cookies** encode connection state into the initial sequence number ($ISN = \text{hash}(\text{SrcIP}, \text{DstIP}, \text{Secret})$), allowing the server to avoid allocating memory until the final ACK arrives.
