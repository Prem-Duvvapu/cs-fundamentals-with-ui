# Routing Algorithms, Link State & Distance Vector

## 🟢 Beginner Level

### What is Routing?
**Routing** is the process by which routers inspect incoming IP packets and determine the optimal path across interconnecting networks from source host to destination host using **Routing Tables**.

```
                   ┌───────────┐
                   │ Router B  │
                 ╱ └─────┬─────┘ ╲ Cost: 1
        Cost: 2 ╱        │         ╲
               ▼         │ Cost: 3  ▼
        ┌───────────┐    │    ┌───────────┐
        │ Router A  │────┴────│ Router C  │
        └───────────┘         └───────────┘
```

### Circuit Switching vs Packet Switching

| Parameter | Circuit Switching | Packet Switching |
| :--- | :--- | :--- |
| **Path Setup** | Dedicated physical path established upfront (e.g. PSTN telephone call). | No dedicated path; packets routed dynamically independently. |
| **Bandwidth** | Reserved & Guaranteed. | Shared dynamically (**Store-and-Forward**). |
| **Congestion** | Occurs during connection setup. | Occurs at intermediate router queues (packet loss). |

---

## 🟡 Intermediate Level

### Distance Vector Routing (Bellman-Ford Algorithm)

Nodes share their complete routing table with direct neighbors periodically:
- **Formula**: $D_x(y) = \min_{v} \{ c(x,v) + D_v(y) \}$
- **Protocol**: RIP (Routing Information Protocol).
- **Major Problem**: **Count-to-Infinity Problem** when a link fails. Solved via **Split Horizon** and **Poison Reverse**.

### Link State Routing (Dijkstra's Algorithm)

Nodes flood Link-State Advertisements (LSAs) so every router builds a complete topological map of the entire network:
- **Algorithm**: Runs Dijkstra's Shortest Path algorithm locally.
- **Protocol**: OSPF (Open Shortest Path First), IS-IS.

---

## 🔴 Expert Level

### Dijkstra's Shortest Path Algorithm Step-by-Step

Given source node $S$:
1. Set $\text{dist}[S] = 0$ and $\text{dist}[V] = \infty$ for all other nodes.
2. Maintain priority queue $Q$ of unvisited nodes.
3. Extract node $u$ with minimum distance from $Q$.
4. For each neighbor $v$ of $u$:
   $$\text{if } \text{dist}[u] + \text{weight}(u,v) < \text{dist}[v] \implies \text{dist}[v] = \text{dist}[u] + \text{weight}(u,v)$$

### BGP (Border Gateway Protocol)

BGP is the **Path-Vector** routing protocol that runs the global Internet core across Autonomous Systems (AS). It relies on AS-PATH vectors and policy rules rather than raw latency metrics.

### Interview Questions

1. **Why does Link State converge faster than Distance Vector?**
   - *Answer*: Link State routers have a full topological map and re-calculate shortest paths instantly upon LSA flood, while Distance Vector relies on iterative neighbor rumor exchanges ("routing by rumor").

2. **What is ECMP (Equal-Cost Multi-Path)?**
   - *Answer*: ECMP enables routers to balance packet traffic across multiple parallel links of identical cost, increasing throughput.
