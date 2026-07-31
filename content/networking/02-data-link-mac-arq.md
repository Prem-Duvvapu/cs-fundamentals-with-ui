# Data Link Layer, Error Control (ARQ) & MAC Protocols

## 🟢 Beginner Level

### What is the Data Link Layer?
The **Data Link Layer (Layer 2)** is responsible for node-to-node data transfer across a single physical link. It transforms raw bitstreams from Layer 1 into structured **Frames**.

### Error Detection Techniques

1. **Parity Check**: Appends a single parity bit to ensure the total count of 1s is even (Even Parity) or odd (Odd Parity). Cannot detect even numbers of bit flips.
2. **Checksum**: Sums binary words of a message using 1's complement addition. Transmitted alongside packet header.
3. **Cyclic Redundancy Check (CRC)**: Polynomial division technique executed in hardware shift registers. Detects single-bit, double-bit, and burst errors.

---

## 🟡 Intermediate Level

### Automatic Repeat reQuest (ARQ) Protocols

When frames are corrupted or lost over noisy channels, **ARQ Protocols** handle retransmission.

```
1. STOP-AND-WAIT ARQ:
Sender    ─── Frame 0 ───► Receiver
Sender    ◄───── ACK 1 ─── Receiver (Sends 1 frame at a time, waits for ACK)

2. GO-BACK-N ARQ (Window Size N = 4):
Sender    ─── F0, F1, F2, F3 ───► (F1 Lost!)
Receiver  ◄── ACK0, NACK1 ────── (Discards F2, F3! Retransmits ALL from F1)

3. SELECTIVE REPEAT ARQ:
Sender    ─── F0, F1, F2, F3 ───► (F1 Lost!)
Receiver  ◄── ACK0, NACK1, Buffers F2, F3 (Retransmits ONLY F1!)
```

#### Comparison Matrix

| Feature | Stop-and-Wait | Go-Back-N (GBN) | Selective Repeat (SR) |
| :--- | :--- | :--- | :--- |
| **Sender Window Size ($W_s$)** | $1$ | $N > 1$ | $N > 1$ |
| **Receiver Window Size ($W_r$)**| $1$ | $1$ | $W_s$ |
| **Out-of-Order Frames** | Discarded | Discarded | **Buffered** in memory |
| **Efficiency** | Extremely Low | Moderate | **Maximum** |

---

## 🔴 Expert Level

### Multiple Access Control (MAC) Protocols

When multiple nodes share a single transmission medium (Ethernet bus, Wi-Fi channel), MAC protocols prevent packet collisions.

1. **CSMA/CD (Carrier Sense Multiple Access with Collision Detection)**:
   - Used in legacy wired Ethernet.
   - Nodes listen to line (*Carrier Sense*). If idle, transmit. If collision detected, send jam signal, abort, and apply **Binary Exponential Backoff**: $\text{Backoff Time} = K \times \text{Slot Time}$, where $K \in [0, 2^n - 1]$.

2. **CSMA/CA (Carrier Sense Multiple Access with Collision Avoidance)**:
   - Used in wireless Wi-Fi (802.11).
   - Collision detection is impossible over radio frequencies. Uses **RTS/CTS (Request-to-Send / Clear-to-Send)** handshaking and Inter-Frame Spacing (IFS).

### Interview Questions

1. **What is the minimum frame size in Ethernet CSMA/CD?**
   - *Answer*: $\text{Min Frame Size} = 2 \times \text{Propagation Delay} \times \text{Bandwidth}$. For 10 Mbps Ethernet over 2.5 km, minimum frame size is **64 bytes** (512 bits) to guarantee collision detection before transmission finishes.

2. **Why must Receiver Window Size $W_r \le 2^{m-1}$ in Selective Repeat ARQ (where $m$ is sequence number bits)?**
   - *Answer*: To prevent ambiguity between new frames and retransmitted frames when ACKs are lost.
