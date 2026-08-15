# Network QoS, Traffic Shaping & Modern Networking

## 🟢 Beginner Level

### What is Quality of Service (QoS)?
**Quality of Service (QoS)** is a set of network mechanisms, scheduling algorithms, and traffic policing rules designed to prioritize mission-critical and latency-sensitive network traffic over background bulk data, ensuring predictable performance under congested conditions.

```
Incoming Traffic Mix:
[ 4K Video Streaming  (Loss Tolerant, Jitter Sensitive) ] ──┐
[ VoIP Audio Call     (Low Latency < 150ms)             ] ──┼──► [ QoS Scheduler ] ──► Egress Pipe
[ Large OS File Patch (Bulk, Delay Tolerant)            ] ──┘      (Priority Queue)
```

### Traffic Classifications & SLAs

| Traffic Type | Example Application | Latency Sensitivity | Jitter Sensitivity | Loss Sensitivity | QoS Priority Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Real-Time Interactive** | VoIP (SIP/RTP), Zoom, Cloud Gaming | **Extreme (< 150ms)** | **Extreme (< 30ms)** | Moderate (~1–2% loss ok) | **Highest (Expedited Forwarding - EF)** |
| **Streaming Media** | YouTube, Netflix, Spotify | Moderate (Buffered) | Low | Low (Video codecs conceal loss) | **Medium (Assured Forwarding - AF)** |
| **Mission-Critical Data**| Database replication, FinTech trades | High | Low | **Zero Loss Permitted** | **High** |
| **Best-Effort** | Web browsing, Email, BitTorrent | Low (Delay tolerant) | None | Zero Loss (TCP retransmits) | **Lowest (Default)** |

### Content Delivery Networks (CDN) Architecture

A **CDN** is a geographically distributed network of **Point of Presence (PoP)** edge proxy cache servers positioned close to end users to accelerate web content delivery.

```
[ User in Tokyo ] ────────► [ CDN Tokyo Edge PoP (Cache HIT: 5ms) ]
                                   │
                                   │ (Cache MISS: Fetch Origin)
                                   ▼
                         [ Origin Server in Virginia, US ]
```

- **Edge Caching**: Static assets (images, JavaScript, CSS, video segments) are cached at edge locations.
- **Anycast DNS Routing**: Users resolving `cdn.example.com` are routed via BGP Anycast to the topologically nearest healthy PoP.
- **Origin Shielding**: Edge nodes funnel cache misses through regional shield servers, protecting the backend database and APIs from thundering herds.

---

## 🟡 Intermediate Level

### Traffic Shaping & Rate Limiting: Token Bucket vs. Leaky Bucket

Traffic shaping smooths bursty network transmissions to match a designated contractual rate profile.

```
TOKEN BUCKET ALGORITHM (Allows Bursts up to Capacity B):
              Tokens arrive at rate 'r' tokens/sec
                          │
                          ▼
                 ┌─────────────────┐
                 │  Token Bucket   │  ◄── Max Capacity 'B' tokens
                 │   ●  ●  ●  ●    │
                 └────────┬────────┘
                          │
  Packets In ──► [ Check Tokens ] ──► Transmit if tokens available!
                 (If tokens < packet size, packet queues or drops)


LEAKY BUCKET ALGORITHM (Strict Constant Output Rate):
  Bursty Packets In ──► ┌─────────────────┐
                        │  FIFO Buffer    │ ◄── Max Capacity 'C' packets
                        │  [P1][P2][P3]   │ (Drops if buffer overflows)
                        └────────┬────────┘
                                 │
                                 ▼ Constant Leak Rate 'r' pkts/sec
                        Smooth Output Stream
```

#### Detailed Comparison

| Parameter | Token Bucket Algorithm | Leaky Bucket Algorithm |
| :--- | :--- | :--- |
| **Burst Tolerance** | **Allows bursts** up to bucket capacity $B$ at full link speed | **Strictly removes bursts**; flattens output to constant rate |
| **Idle Capacity Savings** | Tokens accumulate during quiet periods up to max capacity $B$ | Does not accumulate credits; unused capacity is lost |
| **Output Rate** | Variable (Bursts when full, sustained rate $r$ when empty) | Fixed constant output rate $r$ |
| **Implementation In Code** | `tokens = min(B, tokens + (now - last) * r)` | Leaky queue timer or leaky token accumulator |
| **Common Use Cases** | AWS API Gateway, NGINX `limit_req`, Redis Rate Limiters | Telecommunications ATM cells, strict interface policing |

### QoS Architecture Models: IntServ vs. DiffServ

1. **IntServ (Integrated Services - RFC 1633)**:
   - **Per-Flow Reservation**: Uses **RSVP (Resource Reservation Protocol)** to signal every router along the path to reserve dedicated bandwidth/buffers before communication starts.
   - **Flaw**: Requires intermediate core routers to maintain state for millions of active flows — does not scale to the public Internet.
2. **DiffServ (Differentiated Services - RFC 2474)**:
   - **Class-Based Aggregation**: Stateless core. Edge routers classify packets and mark the 6-bit **DSCP (Differentiated Services Code Point)** field in the IPv4/IPv6 header.
   - Core routers simply inspect DSCP and execute **Per-Hop Behaviors (PHB)** (e.g. Strict Priority, Weighted Fair Queuing - WFQ).

---

## 🔴 Expert Level

### Software-Defined Networking (SDN) & Network Function Virtualization (NFV)

Modern cloud hyperscalers (AWS VPC, Google Andromeda) operate on programmable virtual networks:

```
[ SDN Applications: Auto-scaling Load Balancers, Security Groups, VPC Peering ]
                                  │ Northbound API (REST / gRPC)
                                  ▼
                     [ SDN CONTROLLER CLUSTER ]
                                  │ Southbound API (OpenFlow / P4)
           ┌──────────────────────┼──────────────────────┐
           ▼                      ▼                      ▼
[ Hypervisor OVS Switch ] [ Spine-Leaf Switch ] [ Cloud Gateway Router ]
```

- **NFV (Network Function Virtualization)**: Decouples network functions (Firewalls, NAT gateways, VPN concentrators, Load Balancers) from proprietary physical ASIC appliances, running them as containerized/virtualized software instances (**VNFs**) orchestrated via Kubernetes.

### 5G Network Slicing

5G standalone architecture uses SDN/NFV to slice a single physical radio access network into isolated virtual end-to-end networks customized for specific SLAs:
1. **eMBB (Enhanced Mobile Broadband)**: High throughput (gigabits/sec) for 8K video and VR.
2. **URLLC (Ultra-Reliable Low-Latency Communication)**: Sub-1ms latency and 99.999% reliability for autonomous vehicles and robotic telesurgery.
3. **mMTC (Massive Machine Type Communication)**: Massive connection density (1 million devices/$km^2$) with minimal power draw for smart cities and agriculture.

### Modern Wireless Standards (Wi-Fi 4 through Wi-Fi 7)

| Standard | IEEE Name | Frequency Bands | Max Channel Width | Max Theoretical Speed | Key Technology Innovations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Wi-Fi 4** | 802.11n | 2.4 GHz, 5 GHz | 40 MHz | 600 Mbps | MIMO (up to 4 spatial streams) |
| **Wi-Fi 5** | 802.11ac | 5 GHz | 160 MHz | 6.9 Gbps | Multi-User MIMO (MU-MIMO downstream), 256-QAM |
| **Wi-Fi 6 / 6E** | 802.11ax | 2.4 GHz, 5 GHz, 6 GHz | 160 MHz | 9.6 Gbps | **OFDMA**, 1024-QAM, Target Wake Time (IoT) |
| **Wi-Fi 7** | 802.11be | 2.4 GHz, 5 GHz, 6 GHz | **320 MHz** | **46 Gbps** | 4096-QAM, Multi-Link Operation (MLO) |

---

### Key Interview Questions

#### Q1: In a Token Bucket with capacity $B = 10 \text{ MB}$, fill rate $r = 2 \text{ MB/s}$, and max line transmission speed $M = 10 \text{ MB/s}$, what is the maximum burst duration?
**Answer**:
During a burst, tokens are drained at rate $(M - r)$ while the bucket is initially full with $B$ tokens.
$$\text{Burst Time } T = \frac{B}{M - r} = \frac{10 \text{ MB}}{10 \text{ MB/s} - 2 \text{ MB/s}} = \frac{10}{8} = 1.25 \text{ seconds}$$
$$\text{Max Volume Transmitted} = M \times T = 10 \text{ MB/s} \times 1.25 \text{ s} = 12.5 \text{ MB}$$

#### Q2: How does OFDMA in Wi-Fi 6 differ from OFDM in Wi-Fi 5?
**Answer**: In OFDM (Wi-Fi 5), when a channel is allocated for transmission, the entire channel bandwidth is monopolized by a single user for the duration of the time slot, which is inefficient for small packets. OFDMA (Orthogonal Frequency Division Multiple Access in Wi-Fi 6) subdivides the channel into smaller **Resource Units (RUs)**, allowing the access point to transmit to or receive from multiple client devices concurrently within the same time transmission slot.
