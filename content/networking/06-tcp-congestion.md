# TCP Flow Control & Congestion Control Algorithms

## 🟢 Beginner Level

### Flow Control vs. Congestion Control

- **TCP Flow Control**: Protects the **Receiver** from being overwhelmed by a sender that transmits data faster than the receiver's application buffer can process.
- **TCP Congestion Control**: Protects the **Network Core** (intermediate routers and links) from becoming bottlenecked by excessive concurrent traffic.

---

## 🟡 Intermediate Level

### TCP Sliding Window & Receiver Window (`rwnd`)

The receiver advertises its available buffer space via the **Receiver Window (`rwnd`)** header field in every ACK.

$$\text{Effective Window} = \min(\text{Congestion Window } cwnd, \text{Receiver Window } rwnd)$$

```
SLIDING WINDOW AT SENDER:
┌───┬───┬───┬───┬───┬───┬───┬───┐
│ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │ 8 │
└───┴───┴───┴───┴───┴───┴───┴───┘
 ◄───── Sent & ACKed ────► ◄── Sent, UnACKed ──► ◄── Usable Window ──►
```

---

## 🔴 Expert Level

### Classical TCP Congestion Control (Tahoe / Reno / CUBIC)

TCP manages the **Congestion Window (`cwnd`)** across 4 state phases:

```
cwnd (MSS)
  ▲
16│                                     /─/─ Fast Recovery (Reno)
  │                                    /
 8│                      /───/───/───/  ◄── Congestion Avoidance (Linear: +1 MSS/RTT)
  │                     /
 4│          /───/───/                  ◄── Slow Start (Exponential: Double per RTT)
  │        /
 1│__/__/__
  └────────────────────────────────────────► Time (RTT)
     Timeout Event ➔ Drop cwnd to 1 MSS & ssthresh = cwnd / 2
```

#### 1. Slow Start Phase
- Initial $cwnd = 1 \text{ MSS}$.
- For every ACK received, $cwnd = cwnd + 1 \text{ MSS}$ (Exponential growth: $1 \rightarrow 2 \rightarrow 4 \rightarrow 8 \dots$).
- Continues until $cwnd \ge ssthresh$ (Slow Start Threshold).

#### 2. Congestion Avoidance Phase
- Triggered when $cwnd \ge ssthresh$.
- Linear AIMD growth: $cwnd = cwnd + \frac{1}{cwnd} \text{ MSS}$ per ACK (+1 MSS per RTT).

#### 3. Fast Retransmit & Fast Recovery (TCP Reno)
- Upon receiving **3 Duplicate ACKs** for a missing segment:
  1. Immediately retransmit the missing segment without waiting for Retransmission Timeout (RTO).
  2. Set $ssthresh = \frac{cwnd}{2}$.
  3. Set $cwnd = ssthresh + 3 \text{ MSS}$ (**Fast Recovery** without dropping back to 1 MSS!).

### Interview Questions

1. **Why does TCP BBR (Bottleneck Bandwidth and RTT) outperform AIMD loss-based algorithms like CUBIC on high-bandwidth optical links?**
   - *Answer*: Loss-based algorithms treat random wireless packet drops as network congestion and halve $cwnd$. BBR models actual physical bottleneck bandwidth and minimum RTT using pacing rates rather than packet drop loss triggers.
