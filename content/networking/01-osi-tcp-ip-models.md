# OSI 7-Layer & TCP/IP Reference Models

## 🟢 Beginner Level

### What is a Network Reference Model?
A **Network Reference Model** provides a standardized architectural framework to understand how hardware, operating systems, and software applications exchange data across local and global networks.

```
OSI 7-LAYER MODEL                       TCP/IP 4-LAYER MODEL
┌─────────────────────────┐             ┌─────────────────────────┐
│  7. Application         │             │                         │
├─────────────────────────┤             │  Application Layer      │
│  6. Presentation        │             │  (HTTP, DNS, SSH, TLS)  │
├─────────────────────────┤             │                         │
│  5. Session             │             └─────────────────────────┘
├─────────────────────────┤             ┌─────────────────────────┐
│  4. Transport           │ ──────────► │  Transport (TCP / UDP)  │
├─────────────────────────┤             ├─────────────────────────┤
│  3. Network             │ ──────────► │  Internet (IP, ICMP)    │
├─────────────────────────┤             ├─────────────────────────┤
│  2. Data Link           │ ──────────► │  Network Access         │
├─────────────────────────┤             │  (Ethernet, Wi-Fi, MAC) │
│  1. Physical            │             └─────────────────────────┘
└─────────────────────────┘
```

### Encapsulation & Decapsulation (PDUs)

As data travels down the protocol stack at the sender side, each layer wraps the payload with its own protocol header—a process called **Encapsulation**. The recipient unrolls these headers via **Decapsulation**.

| OSI Layer | Protocol Data Unit (PDU) | Header Components |
| :--- | :--- | :--- |
| **Application / Presentation / Session** | **Data** | HTTP Request Body, TLS Metadata |
| **Transport** | **Segment (TCP) / Datagram (UDP)** | Source & Destination Port Numbers (e.g. 5173 $\rightarrow$ 80), Sequence Numbers |
| **Network** | **Packet** | Source & Destination IP Addresses (e.g. `192.168.1.50` $\rightarrow$ `142.250.190.46`), TTL |
| **Data Link** | **Frame** | Source & Destination MAC Addresses (`AA:BB:CC:DD` $\rightarrow$ `11:22:33:44`), CRC Trailer |
| **Physical** | **Bits** | High/Low Voltages, Light Pulses, Radio Frequencies |

---

## 🟡 Intermediate Level

### Detailed Breakdown of the 7 OSI Layers

1. **Physical Layer (Layer 1)**: Transmits raw bit streams over physical media (cables, fiber optics, radio waves). Specifies pin layouts, voltage levels, signal bit timing.
2. **Data Link Layer (Layer 2)**: Ensures node-to-node frame delivery across a physical link. Handles MAC addressing, framing, and error detection (CRC).
3. **Network Layer (Layer 3)**: Manages end-to-end logical packet routing across multiple interconnected networks via IP addresses (IPv4/IPv6).
4. **Transport Layer (Layer 4)**: Delivers data process-to-process using port numbers. Guarantees reliability, segmentation, flow control, and error recovery (TCP).
5. **Session Layer (Layer 5)**: Establishes, maintains, synchronizes, and terminates interactive sessions between applications (e.g., RPC, NetBIOS).
6. **Presentation Layer (Layer 6)**: Data formatting, serialization, character encoding (ASCII/UTF-8), compression, and encryption/decryption (TLS/SSL).
7. **Application Layer (Layer 7)**: Provides direct network interfaces to end-user software applications (HTTP, SMTP, FTP, DNS).

---

## 🔴 Expert Level

### OSI vs. TCP/IP Architecture Comparison

- **Strict Separation**: The OSI model strictly distinguishes between Services, Interfaces, and Protocols. The TCP/IP model was designed pragmatically around operational protocols.
- **Connection Modes**: OSI supports both connection-oriented and connectionless communication at the Network layer, but only connection-oriented at Transport. TCP/IP supports ONLY connectionless (IP) at the Internet layer, but offers both options (TCP/UDP) at the Transport layer.

### Interview Questions

1. **Why does TCP/IP combine OSI Layers 5, 6, and 7 into a single Application Layer?**
   - *Answer*: Most modern applications implement session management, serialization, and presentation logic directly in user-space software libraries (e.g., OpenSSL, gRPC) rather than requiring operating system kernel primitives.

2. **What is MTU (Maximum Transmission Unit) and MSS (Maximum Segment Size)?**
   - *Answer*: MTU is the largest frame size (usually 1500 bytes on Ethernet) that Layer 2 can transmit. MSS is the maximum TCP payload size excluding IP (20B) and TCP (20B) headers ($\text{MSS} = \text{MTU} - 40 = 1460\text{ bytes}$).
