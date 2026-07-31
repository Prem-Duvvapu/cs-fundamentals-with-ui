# Network Security, Cryptography & Threat Prevention

## 🟢 Beginner Level

### Fundamentals of Network Security
Network Security involves policies, processes, and cryptographic mechanisms designed to prevent unauthorized access, misuse, modification, or denial of a computer network.

### The CIA Triad

- **Confidentiality**: Ensures data is readable ONLY by authorized recipients (Symmetric & Asymmetric Encryption).
- **Integrity**: Guarantees data has NOT been modified or tampered with in transit (Cryptographic Hashes: SHA-256, HMAC).
- **Availability**: Ensures network services remain accessible during attacks (DDoS Mitigation, Firewalls).

---

## 🟡 Intermediate Level

### Symmetric vs. Asymmetric Cryptography

```
SYMMETRIC ENCRYPTION (AES-256):
Sender (Shared Key K) ─── Encrypt ──► Ciphertext ─── Decrypt ──► Receiver (Shared Key K)

ASYMMETRIC ENCRYPTION (RSA / ECC):
Sender ─── Encrypt (Receiver Public Key) ──► Ciphertext ──► Decrypt (Receiver Private Key)
```

| Parameter | Symmetric Encryption (AES) | Asymmetric Encryption (RSA/ECC) |
| :--- | :--- | :--- |
| **Key Count** | 1 Shared Secret Key | 2 Keys (Public Key & Private Key) |
| **Performance** | Extremely Fast (Hardware SIMD instructions) | Slow (Heavy modular exponentiation) |
| **Key Distribution** | Difficult (Requires secure key exchange) | Easy (Public key published freely) |
| **Primary Usage** | Bulk data encryption | Handshakes & Digital Signatures |

---

## 🔴 Expert Level

### Network Attacks & Mitigations

1. **SYN Flood Attack**: Exploits TCP 3-way handshake by sending thousands of SYN packets with spoofed source IPs without sending final ACKs.
   - *Mitigation*: SYN Cookies, Firewalls.
2. **ARP Poisoning (Spoofing)**: Attacker sends fake ARP messages on LAN mapping default gateway IP to attacker MAC.
   - *Mitigation*: Dynamic ARP Inspection (DAI) on managed switches.
3. **Man-In-The-Middle (MITM)**: Intercepts unencrypted traffic.
   - *Mitigation*: TLS Certificates issued by trusted Certificate Authorities (CAs).

### Firewalls & Packet Filtering

- **Packet Filter (Stateless)**: Filters individual packets based on IP/Port tuples (`iptables`).
- **Stateful Inspection**: Tracks TCP connection states (`ESTABLISHED`, `NEW`).
- **Web Application Firewall (WAF)**: Inspects HTTP Layer 7 payloads for SQL Injection and XSS attacks.

### Interview Questions

1. **How does Diffie-Hellman Key Exchange allow 2 untrusted parties to establish a shared secret over an eavesdropped public network?**
   - *Answer*: Based on the computational hardness of Discrete Logarithms: $A = g^a \bmod p$ and $B = g^b \bmod p$. Both calculate shared secret $S = B^a \bmod p = A^b \bmod p = g^{ab} \bmod p$.

2. **What is perfect forward secrecy (PFS)?**
   - *Answer*: PFS generates ephemeral key pairs for each TLS session. Even if a server's long-term private key is compromised in the future, past recorded encrypted sessions cannot be decrypted.
