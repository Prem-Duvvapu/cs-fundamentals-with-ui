# Computer Networks: OSI & TCP/IP Reference Models

## 🟢 Beginner Level

### What is a Computer Network?
A **Computer Network** is a digital telecommunications network that allows nodes (computers, servers, routers, mobile devices) to share resources and exchange data via packet switching.

### The OSI 7-Layer Model
The **Open Systems Interconnection (OSI)** model is a conceptual framework that standardizes network communication into 7 distinct layers:

```
┌─────────────────────────────────────────────────────────────┐
│ 7. Application Layer    (HTTP, HTTPS, DNS, FTP, SSH)       │
├─────────────────────────────────────────────────────────────┤
│ 6. Presentation Layer   (Encryption, Compression, TLS/SSL)  │
├─────────────────────────────────────────────────────────────┤
│ 5. Session Layer        (RPC, NetBIOS, Session Management)  │
├─────────────────────────────────────────────────────────────┤
│ 4. Transport Layer      (TCP, UDP - Ports, Reliability)     │
├─────────────────────────────────────────────────────────────┤
│ 3. Network Layer        (IP, ICMP, Routing, IP Packets)     │
├─────────────────────────────────────────────────────────────┤
│ 2. Data Link Layer      (Ethernet, MAC Addresses, Switches) │
├─────────────────────────────────────────────────────────────┤
│ 1. Physical Layer       (Cables, Fiber, Wi-Fi, Bits)        │
└─────────────────────────────────────────────────────────────┘
```

### Encapsulation & Decapsulation
- **Encapsulation (Sender)**: Data moves **top-down** (Layer 7 → Layer 1). Each layer prepends its own header (and optional trailer) containing control info (e.g., port numbers, IP addresses, MAC addresses).
- **Decapsulation (Receiver)**: Data moves **bottom-up** (Layer 1 → Layer 7). Each layer strips off its corresponding header and processes the payload.

---

## 🟡 Intermediate Level

### TCP vs UDP Protocols

| Feature | TCP (Transmission Control Protocol) | UDP (User Datagram Protocol) |
| :--- | :--- | :--- |
| **Connection Type** | Connection-oriented (3-way handshake) | Connectionless (Fire and forget) |
| **Reliability** | Guaranteed delivery (ACKs, Retransmissions) | No guarantee (Loss permissible) |
| **Ordering** | In-order delivery guaranteed (Seq numbers) | Out-of-order delivery possible |
| **Flow Control** | Yes (Sliding Window Protocol) | None |
| **Header Size** | 20 – 60 bytes | 8 bytes |
| **Use Cases** | Web (HTTP/S), Email (SMTP), SSH, File Transfer | Video Streaming, Gaming, DNS, VoIP |

### TCP 3-Way Handshake
Before data transfer begins, TCP establishes a connection via 3 control flags:

```
Client                                      Server
  │                 SYN (Seq=X)                │
  ├───────────────────────────────────────────►│ (Server allocates TCB)
  │            SYN-ACK (Seq=Y, Ack=X+1)        │
  │◄───────────────────────────────────────────┤
  │                 ACK (Ack=Y+1)              │
  ├───────────────────────────────────────────►│ Connection ESTABLISHED
```

---

## 🔴 Expert Level

### Socket Buffer Architecture in Linux Kernel
In Linux, network data is encapsulated in kernel structures called `sk_buff` (socket buffers):

```c
struct sk_buff {
    struct sk_buff *next;
    struct sk_buff *prev;
    struct sock *sk;
    ktime_t tstamp;
    struct net_device *dev;
    
    /* Header pointers */
    unsigned char *head;  // Start of buffer
    unsigned char *data;  // Start of protocol header
    unsigned char *tail;  // End of data payload
    unsigned char *end;   // End of buffer
};
```

### High-Performance Networking: epoll & io_uring
- **epoll**: Linux kernel $O(1)$ event notifications for high concurrency (C10K problem).
- **io_uring**: Asynchronous zero-copy kernel submission/completion ring buffers, bypassing syscall overhead.

### Key Interview Questions
1. What happens step-by-step when you type `https://google.com` in your browser?
2. Explain the TCP 4-way handshake tear-down (`FIN`, `ACK`, `FIN`, `ACK`) and time wait state (`TIME_WAIT`).
3. Difference between MAC address (Layer 2) and IP address (Layer 3).
4. How does ARP (Address Resolution Protocol) resolve IP to MAC address?
