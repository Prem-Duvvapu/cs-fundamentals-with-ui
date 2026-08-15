# IP Addressing, Subnetting (CIDR/VLSM) & Network Protocols

## 🟢 Beginner Level

### IPv4 vs IPv6 Addressing
Every device connected to an IP network requires a unique logical address at the Network Layer (Layer 3).

- **IPv4 Address**: 32-bit binary number written as four decimal octets separated by dots (`192.168.1.50`). Allows $2^{32} \approx 4.3 \text{ billion}$ unique addresses.
- **IPv6 Address**: 128-bit hexadecimal number grouped into 8 colon-separated blocks (`2001:0db8:85a3:0000:0000:8a2e:0370:7334`).

### Classful IPv4 Addressing

| Class | First Octet Range | Default Subnet Mask | Use Case |
| :--- | :--- | :--- | :--- |
| **Class A** | `1.0.0.0` to `126.255.255.255` | `255.0.0.0` (`/8`) | Massive enterprises (16M hosts/net) |
| **Class B** | `128.0.0.0` to `191.255.255.255` | `255.255.0.0` (`/16`) | Medium networks (65K hosts/net) |
| **Class C** | `192.0.0.0` to `223.255.255.255` | `255.255.255.0` (`/24`)| Small LANs (254 hosts/net) |
| **Class D** | `224.0.0.0` to `239.255.255.255` | N/A | IP Multicast |

---

## 🟡 Intermediate Level

### CIDR (Classless Inter-Domain Routing) & Subnetting

Classful addressing wasted billions of IP addresses. **CIDR** uses prefix notation (`/N`) where $N$ represents the exact number of network bits.

#### CIDR Subnet Calculation Formula
For IP `192.168.1.50/24`:
1. **Subnet Mask**: `255.255.255.0` (24 ones, 8 zeros).
2. **Network Address**: $\text{IP} \text{ AND } \text{Mask} = 192.168.1.0$.
3. **Broadcast Address**: Set all host bits to 1 $\rightarrow 192.168.1.255$.
4. **Total Usable Host Range**: `192.168.1.1` to `192.168.1.254`.
5. **Total Usable Hosts**: $2^{(32 - N)} - 2 = 2^8 - 2 = 254$ hosts.

```
IPv4 ADDRESS IN BINARY (192.168.1.50 / 24):
11000000.16800000.00000001 . 00110010
├──────────────────────────┤ ├──────┤
      24 Network Bits       8 Host Bits
```

---

## 🔴 Expert Level

### Essential Network Protocols (ARP, DHCP, NAT)

1. **ARP (Address Resolution Protocol)**: Maps a known IP address to an unknown Layer 2 MAC address using broadcast ARP Requests (`Who has 192.168.1.1?`) and unicast ARP Replies.
2. **DHCP (Dynamic Host Configuration Protocol)**: DORA process (**D**iscover $\rightarrow$ **O**ffer $\rightarrow$ **R**equest $\rightarrow$ **A**ck) to automatically assign IP address, gateway, and DNS to new devices.
3. **NAT (Network Address Translation)**: Maps multiple private internal IP addresses (`10.0.0.0/8`, `192.168.0.0/16`) to a single public IP address using **PAT (Port Address Translation)** tables.

### Interview Questions

1. **Why subtract 2 from total host calculations ($2^h - 2$)?**
   - *Answer*: Host portion with all 0s is reserved for the **Network Address**, and host portion with all 1s is reserved for the **Subnet Broadcast Address**.

2. **How does NAT Traversal work for peer-to-peer applications (STUN, TURN, ICE)?**
   - *Answer*: STUN servers discover a client's public reflexive IP and port mapped by NAT, allowing direct P2P socket communication. If symmetric NAT blocks UDP traffic, TURN relays packets through an intermediate server.
