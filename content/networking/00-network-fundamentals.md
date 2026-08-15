# Computer Network Fundamentals, Devices & Topologies

## 🟢 Beginner Level

### What is a Computer Network?
A **Computer Network** is an interconnected collection of autonomous computational nodes (computers, servers, smartphones, IoT sensors, switches, routers) capable of exchanging data and sharing resources (such as storage, compute power, printers, and internet access) over communication channels.

```
       [ Client A ] ──────┐
                          │
       [ Client B ] ──── [ SWITCH / ROUTER ] ──── [ Cloud / Server ]
                          │
       [ Client C ] ──────┘
```

### Network Classifications by Geographical Scale

| Network Type | Full Name | Coverage Range | Typical Data Rates | Example Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **PAN** | Personal Area Network | ~1 to 10 meters | 1 – 24 Mbps (Bluetooth) | Smartwatch synced to phone, wireless headphones |
| **LAN** | Local Area Network | ~10m to 1 km | 100 Mbps – 10 Gbps (Ethernet/Wi-Fi) | Home, university lab, office floor |
| **CAN** | Campus Area Network | ~1 km to 5 km | 1 Gbps – 10 Gbps | College campus, military base |
| **MAN** | Metropolitan Area Network | ~5 km to 50 km | 100 Mbps – 1 Gbps (Fiber rings) | City-wide cable TV, municipal municipal network |
| **WAN** | Wide Area Network | Country / Global | Variable (Mbps to 100+ Gbps) | The Global Internet, cross-continent enterprise WAN |

### Network Hardware Devices & OSI Layer Mappings

1. **Repeater & Hub (Layer 1 - Physical)**:
   - **Repeater**: Regenerates electrical or optical signals attenuated over long distances.
   - **Hub**: A multiport repeater. Operates in a **single collision domain** and a **single broadcast domain**. It blindly broadcasts all incoming electrical signals to every connected port (half-duplex).
2. **Bridge & Switch (Layer 2 - Data Link)**:
   - **Switch**: A multiport bridge that maintains a hardware **MAC Address Table (CAM Table)**. Inspects destination MAC addresses in Ethernet frames and forwards traffic exclusively to the designated egress port. Creates separate collision domains per port while maintaining a single broadcast domain.
3. **Router (Layer 3 - Network)**:
   - Connects heterogeneous networks (e.g., LAN to WAN). Maintains a **Routing Table** and forwards IP packets based on logical IP addressing, breaking both collision and broadcast domains.
4. **Modem (Modulator-Demodulator)**:
   - Converts digital signals from computers into analog signals for transmission over analog telephone/coaxial lines and demodulates analog signals back to digital.
5. **Access Point (AP)**:
   - Transceives radio frequency (RF) signals allowing Wi-Fi enabled client devices to connect to a wired Ethernet backbone.

### Packet Switching vs. Circuit Switching

```
CIRCUIT SWITCHING (Dedicated Pipe):
[Host A] ════════════════════════════════════════════════════════ [Host B]
           (Dedicated continuous physical path, e.g. Landline PSTN)

PACKET SWITCHING (Shared Statistical Multiplexing):
[Host A] ──[Pkt 1]──► [ Router 1 ] ──[Pkt 1]──► [ Router 3 ] ──► [Host B]
         ──[Pkt 2]──► [ Router 2 ] ──[Pkt 2]──►
```

| Feature | Packet Switching | Circuit Switching |
| :--- | :--- | :--- |
| **Connection Setup** | No pre-allocation needed (Connectionless / Datagram) | Explicit reservation phase required prior to transfer |
| **Resource Allocation** | Dynamic, statistical multiplexing | Dedicated reserved bandwidth per call |
| **Bandwidth Efficiency** | **High** (Idle capacity used by other packets) | **Low** (Idle line capacity is wasted) |
| **Congestion / Latency** | Variable delay (queuing + processing jitter) | Constant latency once established |
| **Failure Recovery** | Robust (packets dynamically rerouted around dead nodes) | Fragile (entire circuit drops if one switch fails) |
| **Primary Domain** | The Internet (IP), Ethernet | Traditional PSTN Telephony |

---

## 🟡 Intermediate Level

### Network Topologies

A network **topology** defines the geometric and logical arrangement of nodes and communication links.

```
1. STAR TOPOLOGY          2. BUS TOPOLOGY             3. RING TOPOLOGY
     [Node A]                [Node A]  [Node B]           [A] ──► [B]
        │                       │         │                ▲       │
  [Hub/Switch] ── [Node B]  ════╪═════════╪════ (Bus)      │       ▼
        │                       │         │               [D] ◄── [C]
     [Node C]                [Node C]  [Node D]
```

```
4. FULL MESH TOPOLOGY                      5. TREE / HIERARCHICAL TOPOLOGY
      [A] ───────── [B]                                [Core Switch]
      │ ╲         ╱ │                                 ╱             ╲
      │   ╲     ╱   │                       [Dist Switch 1]     [Dist Switch 2]
      │     ╳       │                           ╱        ╲           ╱        ╲
      │   ╱     ╲   │                       [Edge 1]  [Edge 2]   [Edge 3]  [Edge 4]
      [C] ───────── [D]
```

#### Topology Evaluation & Cost Analysis

| Topology | Cable Lines Needed ($N$ nodes) | Fault Tolerance | Scalability & Installation | Bottlenecks / Failure Point |
| :--- | :--- | :--- | :--- | :--- |
| **Star** | $N$ | **Moderate** (Single cable failure affects only 1 node) | Easy to add/remove nodes | Central Switch/Hub is a Single Point of Failure (SPOF) |
| **Bus** | $1$ backbone trunk | **Low** (Backbone break splits or crashes entire bus) | Difficult to troubleshoot reflections | Bus terminators, traffic collisions |
| **Ring** | $N$ | **Low** (Single token break halts ring unless dual counter-rotating ring) | Hard to reconfigure live ring | Any broken node drops the loop |
| **Full Mesh** | $\frac{N(N-1)}{2}$ | **Highest** (Multiple redundant paths available) | Extremely expensive & complex ($O(N^2)$ cabling) | High port density and maintenance cost |
| **Partial Mesh** | Between $N$ and $\frac{N(N-1)}{2}$ | **High** (Redundant links only between critical core routers) | Cost-effective compromise for WAN backbones | Complex dynamic routing protocols needed |
| **Tree / Hybrid**| $N-1$ | **Moderate to High** (Failure of a leaf isolates only that branch) | Highly scalable for enterprise hierarchies | Failure of root/core switch isolates subnets |

### Network Communication Models: Client-Server vs. Peer-to-Peer (P2P)

```
CLIENT-SERVER ARCHITECTURE:
    [Client 1] ──┐
    [Client 2] ──┼──► [ Centralized Server ] (Database / Web API)
    [Client 3] ──┘

PEER-TO-PEER (P2P) ARCHITECTURE:
    [ Peer A ] ◄───────► [ Peer B ]
        ▲                   ▲
        │                   │
        ▼                   ▼
    [ Peer C ] ◄───────► [ Peer D ] (BitTorrent, Blockchain, IPFS)
```

- **Client-Server**:
  - Dedicated central nodes respond to client requests.
  - Strengths: Centralized security, backup, access control, consistency.
  - Weaknesses: Central bottleneck, costly server scaling, single point of failure.
- **Peer-to-Peer (P2P)**:
  - Every node acts as both a consumer (Client) and provider (Server) of resources (e.g. BitTorrent, Bitcoin network).
  - Strengths: High fault tolerance, decentralized scaling, cost-free infrastructure.
  - Weaknesses: Complex discovery (Distributed Hash Tables - DHT), lack of centralized trust, security vulnerabilities.

### Modes of Data Transmission

1. **Simplex**:
   - Unidirectional communication only. One transmitter, one receiver (e.g., Keyboards to CPU, Radio/TV broadcast, GPS satellites).
2. **Half-Duplex**:
   - Bidirectional communication, but **only one direction at a time**. Nodes must take turns transmitting (e.g., Walkie-Talkies, Legacy Hub-based Ethernet with CSMA/CD).
3. **Full-Duplex**:
   - Simultaneous bidirectional transmission on separate transmit/receive wire pairs or frequency channels (e.g., Modern switched Ethernet, Telephone calls, Fiber optics).

### Core Network Performance Metrics

- **Bandwidth**: The theoretical maximum data carrying capacity of a link (measured in bits per second, e.g., 1 Gbps).
- **Throughput**: The actual rate of successful data delivery over a channel in real conditions (always $\le$ Bandwidth due to protocol overhead, loss, and latency).
- **Latency (Propagation + Transmission + Queuing + Processing Delay)**:
  $$\text{Total Latency} = D_{\text{prop}} + D_{\text{trans}} + D_{\text{queue}} + D_{\text{proc}}$$
  - $D_{\text{trans}} = \frac{L \text{ (Packet Length in bits)}}{R \text{ (Transmission Rate in bps)}}$
  - $D_{\text{prop}} = \frac{d \text{ (Distance in meters)}}{s \text{ (Propagation Speed } \approx 2 \times 10^8 \text{ m/s in copper/fiber)}}$
- **Jitter**: The statistical variance in packet arrival latency. Critical for VoIP and live video streaming.

---

## 🔴 Expert Level

### Packet Forwarding Mechanics: Store-and-Forward vs. Cut-Through

Modern network switches and routers forward packets using two fundamental internal architectures:

```
1. STORE-AND-FORWARD SWITCHING:
   Frame In ──► [ Full Buffer (64-1518 bytes) ] ──► [ CRC-32 Checksum Validation ] ──► Egress Port
   (Zero bad frames forwarded, but higher latency equal to frame serialization time)

2. CUT-THROUGH SWITCHING:
   Frame In ──► [ Inspect first 6 bytes: Dst MAC ] ──► Immediately Forward to Egress Port
   (Ultra-low latency (< 1 microsecond), but corrupted frames are propagated downstream)
```

- **Fragment-Free (Modified Cut-Through)**: Reads the first 64 bytes (the minimum Ethernet collision window size) to filter out runt frames caused by CSMA/CD collisions before forwarding.

### Virtual Circuit vs. Datagram Networks

```
DATAGRAM NETWORKS (Connectionless - IP):
- Each packet contains full Destination IP address.
- Packets of the same flow may follow entirely different paths.
- Out-of-order delivery handled by end hosts (TCP).

VIRTUAL CIRCUIT NETWORKS (Connection-Oriented - MPLS / ATM / X.25):
- Virtual Circuit Identifier (VCI / MPLS Label) in header.
- Explicit signaling phase sets up state in intermediate switches.
- Fixed route for all packets in the flow; guaranteed FIFO delivery.
```

### Software-Defined Networking (SDN) Architecture

Traditional networking couples the **Control Plane** (routing logic, OSPF/BGP calculations) and **Data Plane** (packet forwarding hardware ASIC) inside every individual box.

SDN physically separates these layers:
- **Centralized Control Plane**: A centralized software SDN Controller (e.g., OpenDaylight, ONOS) computes global routing topology and provisions rules via southbound APIs (**OpenFlow**, P4).
- **Decoupled Data Plane**: Commodity white-box switches simply perform line-rate flow-table matching and forwarding without running complex distributed routing protocols locally.

```
┌─────────────────────────────────────────────────────────────┐
│               SDN Applications (Load Balancers, Firewalls)   │
├─────────────────────────────────────────────────────────────┤
│         Northbound API (RESTful / gRPC)                     │
├─────────────────────────────────────────────────────────────┤
│       SDN CONTROLLER (Centralized Routing & Policy Engine)  │
├─────────────────────────────────────────────────────────────┤
│         Southbound API (OpenFlow / P4 / NETCONF)            │
├─────────────────────────────────────────────────────────────┤
│   [ Whitebox Switch 1 ]   [ Whitebox Switch 2 ]   [ Switch 3 ]│
└─────────────────────────────────────────────────────────────┘
```

---

### Key Interview Questions

#### Q1: Why does a Layer 2 Switch separate Collision Domains while a Layer 1 Hub does not?
**Answer**: A Hub is an unmanaged physical repeater; electrical pulses arriving on one pin are repeated across all pins simultaneously. If two nodes transmit at the same time, electrical signals collide and destroy data across the entire hub (1 shared collision domain). A Switch has a dedicated buffer and microprocessor per port. When a frame arrives, the switch stores it in memory, consults its CAM table, and forwards it solely onto the specific destination port. Collisions cannot occur between ports, making every single switch port its own independent collision domain.

#### Q2: If link bandwidth is 100 Mbps and propagation delay is 20 ms, what is the Bandwidth-Delay Product (BDP)?
**Answer**:
$$\text{BDP} = \text{Bandwidth} \times \text{RTT} = 100 \times 10^6 \text{ bps} \times (2 \times 0.020 \text{ s}) = 4{,}000{,}000 \text{ bits} = 500{,}000 \text{ bytes} \ (500 \text{ KB})$$
The BDP represents the total volume of "in-flight" unacknowledged data necessary to fully saturate the transmission pipe.

#### Q3: What happens when a switch's MAC Address CAM Table becomes full or receives a frame for an unknown MAC?
**Answer**: When a switch receives a unicast frame whose destination MAC address is not currently in its CAM table, it performs **Unknown Unicast Flooding** — it broadcasts the frame out of all ports within that VLAN except the arrival port. Once the target host replies, the switch records the source MAC and ingress port, populating the CAM table. If an attacker floods random MACs (CAM Table Overflow attack), the switch reverts to behaving like a dumb hub, broadcasting all traffic to all ports and exposing unencrypted traffic to eavesdropping.
