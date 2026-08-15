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

### TCP 3-Way Handshake & Connection Teardown

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

A TCP connection endpoint is defined by a unique 4-tuple:
$$\text{Connection ID} = (\text{Source IP}, \text{Source Port}, \text{Dest IP}, \text{Dest Port})$$

This allows a single web server on Port 80/443 to handle hundreds of thousands of concurrent client connections simultaneously without port exhaustion.

### Interview Questions

1. **Why does TCP connection termination require 4 steps instead of 3?**
   - *Answer*: Because TCP connections are **Full-Duplex**. One side closing its sending channel with `FIN` does not prevent it from still receiving incoming data from the remote side until the remote side sends its own distinct `FIN`.

2. **What is the SYN Flood attack and how do SYN Cookies mitigate it?**
   - *Answer*: An attacker floods thousands of spoofed `SYN` packets without sending final `ACK`s, exhausting the server's SYN backlog queue memory. **SYN Cookies** encode connection state into the initial sequence number ($ISN = \text{hash}(\text{SrcIP}, \text{DstIP}, \text{Secret})$), allowing the server to avoid allocating memory until the final ACK arrives.
