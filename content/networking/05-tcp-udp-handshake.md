# Transport Layer: TCP vs UDP & Connection Management

## 🟢 Beginner Level

### TCP vs. UDP Protocols

The Transport Layer provides process-to-process communication using **Port Numbers**.

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

### TCP 3-Way Handshake Connection Establishment

Before data transfer begins, TCP client and server synchronize Initial Sequence Numbers (ISN):

```
CLIENT (CLOSED -> SYN_SENT)                         SERVER (LISTEN -> SYN_RCVD)
     │                                                   │
     │ ────── 1. SYN (Seq = X) ────────────────────────► │ (Allocates Buffers)
     │                                                   │
     │ ◄───── 2. SYN-ACK (Seq = Y, Ack = X + 1) ─────── │
     │                                                   │
     │ ────── 3. ACK (Seq = X + 1, Ack = Y + 1) ────────►│
     ▼                                                   ▼
CLIENT (ESTABLISHED)                                SERVER (ESTABLISHED)
```

### TCP 4-Way Connection Termination (Teardown)

```
CLIENT (ESTABLISHED)                                SERVER (ESTABLISHED)
     │ ────── 1. FIN ──────────────────────────────────► │ (Close Wait)
     │ ◄───── 2. ACK ─────────────────────────────────── │
     │ ◄───── 3. FIN ─────────────────────────────────── │
     │ ────── 4. ACK ──────────────────────────────────► │
     ▼                                                   ▼
TIME_WAIT (2 * MSL)                                 CLOSED
```

---

## 🔴 Expert Level

### TIME_WAIT State & TIME_WAIT Assassination

After sending the final ACK during teardown, the client enters `TIME_WAIT` for **$2 \times \text{MSL}$** (Maximum Segment Lifetime, typically 2 minutes):
1. Ensures delayed in-flight packets expire on network.
2. Guarantees the server receives the final ACK (if ACK lost, server retransmits FIN).

### Interview Questions

1. **What is SYN Flooding and how do SYN Cookies defend against it?**
   - *Answer*: An attacker floods SYN requests without sending final ACKs, exhausting server connection backlogs. **SYN Cookies** encode connection state into the initial SYN-ACK sequence number ($ISN$), eliminating memory allocation until the 3rd ACK arrives.

2. **Why does UDP not need connection setup or TIME_WAIT states?**
   - *Answer*: UDP is stateless and datagram-based; it maintains no connection Control Blocks (TCBs), sequence numbers, or acknowledgement timers.
