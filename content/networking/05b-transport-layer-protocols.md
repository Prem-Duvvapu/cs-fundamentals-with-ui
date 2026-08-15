# Transport Protocols: QUIC, SCTP & TCP Segment Internals

## 🟢 Beginner Level

### The Role of the Transport Layer
The **Transport Layer (OSI Layer 4)** is responsible for end-to-end process-to-process communication across a network. While the Network Layer delivers packets between host IP addresses, the Transport Layer delivers data to specific application processes identified by **Port Numbers**.

```
Host A (192.168.1.10)                                 Host B (142.250.190.46)
┌─────────────────────────┐                         ┌─────────────────────────┐
│ Browser (Port: 54321)   │                         │ Web Server (Port: 443)  │
│ Terminal (Port: 54322)  │                         │ SSH Daemon (Port: 22)   │
└────────────┬────────────┘                         └────────────▲────────────┘
             │                                                   │
             ▼                                                   │
┌─────────────────────────┐       IP Packet Delivery        ┌────┴────────────────────┐
│ Socket:                 │ ───────────────────────────────►│ Socket:                 │
│ 192.168.1.10:54321      │                                 │ 142.250.190.46:443      │
└─────────────────────────┘                                 └─────────────────────────┘
```

### Port Number Allocations

A **Socket Address** is the combination of an IP Address and a Port Number (e.g., `192.168.1.10:8080`).

| Port Category | Range | Authority / Purpose | Common Examples |
| :--- | :--- | :--- | :--- |
| **Well-Known Ports** | `0` – `1023` | Assigned by IANA for standard system services (requires root/admin privilege to bind) | `80` (HTTP), `443` (HTTPS), `22` (SSH), `53` (DNS), `25` (SMTP) |
| **Registered Ports** | `1024` – `49151` | Registered by companies and software vendors for specific user services | `3306` (MySQL), `5432` (PostgreSQL), `6379` (Redis), `8080` (Tomcat/Spring) |
| **Dynamic / Ephemeral Ports** | `49152` – `65535` | Temporary ports dynamically allocated by client OS for outbound connections | Ephemeral client ports assigned during web browsing |

---

## 🟡 Intermediate Level

### Deep-Dive: TCP Segment Header Structure (20–60 Bytes)

TCP wraps application data in a reliable, ordered, byte-stream segment.

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          Source Port          |       Destination Port        |  (4 Bytes)
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                        Sequence Number                        |  (4 Bytes)
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Acknowledgment Number                      |  (4 Bytes)
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Data |           |U|A|P|R|S|F|                               |
| Offset| Reserved  |R|C|S|S|Y|I|            Window Size        |  (4 Bytes)
| (4bit)|  (4/6bit) |G|K|H|T|N|N|                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|           Checksum            |        Urgent Pointer         |  (4 Bytes)
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Options (0 to 40 Bytes)                    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                             DATA                              |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

#### Field Specifications:
1. **Source & Destination Port (16 bits each)**: Identifies calling and receiving application endpoints.
2. **Sequence Number (32 bits)**: Tracks the byte position of the first byte of data in this segment within the entire stream.
3. **Acknowledgment Number (32 bits)**: If ACK flag is set, contains the **next expected byte number** from the remote sender (cumulative ACK).
4. **Data Offset (Header Length, 4 bits)**: Specifies number of 32-bit (4-byte) words in the header. Default is $5 \times 4 = 20 \text{ bytes}$, max is $15 \times 4 = 60 \text{ bytes}$.
5. **Control Flags (6 bits)**:
   - `SYN` (Synchronize): Initial connection sequence synchronization.
   - `ACK` (Acknowledgment): Validates ACK number field.
   - `FIN` (Finish): Sender has finished sending data (graceful termination).
   - `RST` (Reset): Abruptly aborts connection (e.g. port closed or connection rejected).
   - `PSH` (Push): Informs receiver to immediately pass buffer to application without waiting for full buffer.
   - `URG` (Urgent): Indicates urgent data pointer is valid.
6. **Window Size (16 bits)**: The receiver's sliding flow control buffer capacity (**rwnd**). Can be scaled up to 1GB using the TCP Window Scale Option.
7. **Checksum (16 bits)**: 1's complement sum over pseudo-IP header, TCP header, and data.
8. **Urgent Pointer (16 bits)**: Offset to urgent out-of-band byte when URG=1.

### UDP Datagram Header Structure (8 Bytes Fixed)

UDP is a connectionless, minimal overhead transport layer wrapper.

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          Source Port          |       Destination Port        |  (4 Bytes)
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|            Length             |           Checksum            |  (4 Bytes)
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                             DATA                              |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

- **Length (16 bits)**: Total byte length of UDP header + Payload (minimum 8 bytes).
- **Checksum (16 bits)**: Error checking for header and payload (optional in IPv4, mandatory in IPv6).

---

## 🔴 Expert Level

### The QUIC Protocol (HTTP/3 Transport Engine)

Traditional HTTPS incurs high latency due to layered handshakes: TCP 3-Way Handshake ($1 \text{ RTT}$) + TLS 1.3 Key Exchange ($1 \text{ RTT}$) = $2 \text{ RTT}$ before first byte of application data.

**QUIC (Quick UDP Internet Connections)** reimagines transport over UDP in user space:

```
TRADITIONAL HTTPS STACK (2 RTT Setup):
┌───────────────────────────┐
│   HTTP/2 (Multiplexed)    │
├───────────────────────────┤
│   TLS 1.3 (Encryption)    │ ◄── 1 RTT TLS Handshake
├───────────────────────────┤
│   TCP (Reliable Stream)   │ ◄── 1 RTT TCP Handshake
├───────────────────────────┤
│   IP / Ethernet           │
└───────────────────────────┘

QUIC / HTTP/3 STACK (0-RTT / 1-RTT Setup):
┌───────────────────────────┐
│   HTTP/3                  │
├───────────────────────────┤
│   QUIC (Multiplexing +    │ ◄── 1 RTT Combined Crypto + Transport
│         Loss Recovery +   │     (0-RTT on session resumption!)
│         Built-in TLS 1.3) │
├───────────────────────────┤
│   UDP                     │
├───────────────────────────┤
│   IP / Ethernet           │
└───────────────────────────┘
```

#### Key QUIC Architectural Innovations:
1. **Elimination of Head-of-Line (HoL) Blocking**:
   - In TCP, if a single packet of Stream A is dropped, the OS kernel blocks *all* streams in the connection until that packet is retransmitted.
   - In QUIC, streams are independent multiplexed channels within UDP. A packet loss on Stream A pauses only Stream A; Stream B and Stream C continue streaming unimpeded.
2. **Connection Migration via Connection ID (CID)**:
   - TCP connections are locked to the 4-tuple `(SrcIP, SrcPort, DstIP, DstPort)`. Switching from Wi-Fi to 5G changes IP and breaks the TCP socket.
   - QUIC uses a unique 64-bit **Connection ID** in the header. If IP changes, the client continues the encrypted session without a reconnect handshake.
3. **0-RTT Connection Resumption**:
   - Returning clients encrypt HTTP request payload with cached server keys in the very first packet.

### Stream Control Transmission Protocol (SCTP)

SCTP combines characteristics of both TCP and UDP for telecommunications (SS7 signaling, WebRTC data channels):
- **Message-Oriented**: Preserves application message boundaries (like UDP) rather than a continuous unstructured byte stream (like TCP).
- **Multi-Streaming**: Supports multiple independent logical message streams inside a single association.
- **Multi-Homing**: A single association can bind to multiple IP network interfaces on both endpoints, enabling instantaneous transparent failover if an ISP link dies.

---

### Key Interview Questions

#### Q1: Why can't TCP connection teardown be completed in 3 packets like connection setup?
**Answer**: TCP connections are **full-duplex** — both directions operate independently. When Client sends `FIN`, it signifies: *"I have no more data to send."* Server sends `ACK` to confirm receipt of the FIN. However, the Server may still have pending response data to transmit to the Client. Once the Server finishes its outgoing transmission, it sends its own distinct `FIN`. Client responds with `ACK`, completing the 4-step teardown (`FIN` → `ACK` → `FIN` → `ACK`).

#### Q2: What is the purpose of the `TIME_WAIT` state and why does it typically last for $2 \times \text{MSL}$ (Maximum Segment Lifetime)?
**Answer**:
1. **Reliable Teardown**: Ensures the final ACK reaches the remote server. If the final ACK is lost, the server retransmits its FIN. The client in `TIME_WAIT` can resend the ACK.
2. **Old Duplicate Drain**: Prevents delayed duplicate segments from a closed connection from being misdelivered to a newly opened connection reusing the same port numbers ($2 \times \text{MSL} \approx 60 \text{ to } 120 \text{ seconds}$).

#### Q3: How does QUIC handle packet loss detection without ambiguity in sequence numbers?
**Answer**: In TCP, when a segment with sequence number 1000 is retransmitted, the retransmitted segment uses the identical sequence number 1000, making it ambiguous whether an incoming ACK was for the original or retransmitted segment (**Retransmission Ambiguity**). QUIC assigns every single transmitted UDP packet a strictly increasing monotonic **Packet Number** (e.g. Packet 1, Packet 2, Retransmission is Packet 3). This allows the sender to accurately calculate RTT samples without ambiguity.
