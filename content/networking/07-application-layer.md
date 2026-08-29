# Application Layer: DNS, HTTP Evolution (1.1 ➔ 2 ➔ 3) & TLS 1.3

## 🟢 Beginner Level

### Domain Name System (DNS) Resolution

DNS translates human-readable domain names (`example.com`) into machine-routable IP addresses (`93.184.216.34`).

```
Client ──► Recursive Resolver ──► Root Nameserver (.) ──► TLD Nameserver (.com) ──► Authoritative Nameserver (example.com)
```

1. **Root Nameservers (`.`)**: 13 logical root server IP addresses worldwide.
2. **TLD (Top-Level Domain) Nameservers**: Manage `.com`, `.org`, `.edu`, `.net`.
3. **Authoritative Nameservers**: Hold final DNS resource records (A, AAAA, CNAME, MX, TXT).

---

## 🟡 Intermediate Level

### Evolution of HTTP Protocols

```
HTTP/1.1 (1997)                     HTTP/2 (2015)                        HTTP/3 (2020)
┌────────────────────────┐          ┌────────────────────────┐           ┌────────────────────────┐
│  Head-of-Line Blocking │          │ Binary Multiplexing    │           │ QUIC (UDP Protocol)    │
│  Sequential TCP conns  │ ───────► │ Streams over 1 TCP     │ ────────► │ 0-RTT Connection       │
│  Plaintext Headers     │          │ HPACK Header Compress  │           │ No TCP HoL Blocking    │
└────────────────────────┘          └────────────────────────┘           └────────────────────────┘
```

| Feature | HTTP/1.1 | HTTP/2 | HTTP/3 |
| :--- | :--- | :--- | :--- |
| **Transport Layer** | TCP | TCP | **QUIC (UDP)** |
| **Multiplexing** | No (HOL Blocking per connection) | Yes (Multiple streams over 1 TCP) | Yes (Independent QUIC streams) |
| **Header Format** | Plaintext ASCII | Binary HPACK | Binary QPACK |
| **Connection Setup** | 1 RTT (TCP) + 2 RTT (TLS) | 1 RTT (TCP) + 1 RTT (TLS 1.3) | **0-RTT / 1-RTT Combined** |

---

## 🔴 Expert Level

### TLS 1.3 Handshake Architecture

TLS 1.3 reduced handshake latency from 2 Round Trips down to a single **1-RTT** (or 0-RTT for resumed sessions):

```
CLIENT                                              SERVER
  │ ── ClientHello + Key Share (Diffie-Hellman) ──► │
  │                                                 │
  │ ◄─ ServerHello + EncryptedExtensions + Cert ─── │
  ▼                                                 ▼
[1-RTT ESTABLISHED — Encrypted Application Data Flows]
```

### Interview Questions

1. **How does HTTP/3 (QUIC) solve the TCP Head-of-Line (HoL) Blocking problem present in HTTP/2?**
   - *Answer*: HTTP/2 multiplexes streams over a single TCP connection. If 1 TCP packet is lost, TCP pauses ALL streams while waiting for retransmission. HTTP/3 runs over UDP; loss in Stream 1 does NOT block independent Stream 2.

2. **What is DNS Cache Poisoning and how does DNSSEC mitigate it?**
   - *Answer*: Attackers inject false IP mappings into recursive resolvers. **DNSSEC** uses public-key cryptography to digitally sign DNS records (RRSIG).
