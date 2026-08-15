# Physical Layer: Transmission Media, Modes & Encoding

## 🟢 Beginner Level

### What is the Physical Layer?
The **Physical Layer (Layer 1)** is the foundational layer of the OSI model. Its primary duty is the transmission of raw unstructured bit streams ($0$s and $1$s) over a physical transmission medium. It defines mechanical, electrical, functional, and procedural specifications:
- Voltage levels and signal pulse shapes
- Bit duration and line synchronization
- Pin counts, connector geometries (e.g., RJ-45, SC/LC fiber connectors), and cable impedance

```
[ Data Link Layer ]  ── Frames (01011001) ──►  [ Physical Layer ]
                                                     │ (Transceiver)
                                                     ▼
                                        Analog / Digital Signal
                                  (Voltage, Optical Pulses, Radio Waves)
                                                     │
                                                     ▼
                                            [ Physical Medium ]
```

### Transmission Media Classifications

Physical transmission media fall into two fundamental classes: **Guided (Wired)** and **Unguided (Wireless)**.

```
                             TRANSMISSION MEDIA
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
     GUIDED (Bounded)                                UNGUIDED (Unbounded)
  ┌────────┼────────┐                             ┌────────┼────────┐
  ▼        ▼        ▼                             ▼        ▼        ▼
Twisted  Coaxial  Optical                      Radio   Microwave Infrared
 Pair    Cable    Fiber                        Waves     Waves
```

#### Guided Media (Wired) Comparison

| Medium | Construction | Max Range (without repeater) | Bandwidth / Data Rates | Immunity to EMI / Noise | Typical Deployment |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **UTP (Unshielded Twisted Pair - Cat5e/Cat6/Cat6a)** | Pairs of insulated copper wires twisted together to cancel out electromagnetic crosstalk | 100 meters | 1 Gbps (Cat5e) to 10 Gbps (Cat6a) | **Low to Moderate** | Office LANs, home routers, Ethernet patch cords |
| **STP (Shielded Twisted Pair - Cat7/Cat8)** | Twisted pairs wrapped in metal foil shielding + braided outer shield | 100 meters (Cat7) / 30m (Cat8) | 10 Gbps – 40 Gbps | **High** | Industrial factories, data centers with high RF noise |
| **Coaxial Cable (RG-6 / RG-59)** | Central copper conductor, dielectric insulator, metallic braided mesh, outer jacket | 200m – 500m | 10 Mbps – 1 Gbps (DOCSIS) | **Moderate to High** | Cable TV distribution, cable broadband internet |
| **Single-Mode Fiber (SMF)** | Ultra-thin core (~9 µm diameter); laser light propagates in a single axial path | **10 km – 80+ km** | **100+ Gbps per wavelength** | **Immune (100%)** | Telco backbones, submarine transoceanic cables, ISP WAN |
| **Multi-Mode Fiber (MMF)** | Wider core (~50–62.5 µm); LED/VCSEL light propagates across multiple reflection modes | 300m – 550m | 10 Gbps – 100 Gbps | **Immune (100%)** | Intra-datacenter interconnections, campus backbones |

#### Unguided Media (Wireless)

1. **Radio Waves (3 kHz – 1 GHz)**:
   - Omnidirectional propagation. Capable of penetrating solid walls.
   - Applications: FM/AM radio, Cellular GSM/LTE, Wi-Fi (2.4 GHz).
2. **Microwaves (1 GHz – 300 GHz)**:
   - Unidirectional line-of-sight propagation. Requires parabolic dish antennas. Cannot penetrate deep obstacles.
   - Applications: Point-to-point terrestrial microwave towers, Satellite communication (GPS, Starlink), 5 GHz Wi-Fi.
3. **Infrared (300 GHz – 400 THz)**:
   - Very short range; cannot penetrate walls (offers natural physical security).
   - Applications: TV remote controls, legacy IrDA device links.

---

## 🟡 Intermediate Level

### Digital Line Encoding Schemes

Line encoding converts binary digits ($0$ and $1$) into continuous voltage waveforms for copper wire transmission.

```
Binary Input:      1       0       1       1       0       0       1
                ┌──────┐       ┌──────┬──────┐               ┌──────┐
NRZ-L:          │  +V  │   0V  │  +V  │  +V  │   0V      0V  │  +V  │
                └──────┴───────┴──────┴──────┴───────────────┴──────┘

                ┌──┐   ┌──┐    ┌──┐   ┌──┐     ┌──┐   ┌──┐   ┌──┐
Manchester:     │  └───┘  │    │  └───┘  └───┐ │  └───┘  └───┤  └───
                (High-Low = 1, Low-High = 0; mid-bit transition provides clock)
```

1. **NRZ-L (Non-Return to Zero - Level)**:
   - Positive voltage represents $1$, zero or negative voltage represents $0$.
   - **Flaw**: Long sequences of consecutive $0$s or $1$s result in flat DC voltage, causing clock synchronization loss (**baseline wander**).
2. **NRZ-I (Non-Return to Zero - Invert)**:
   - Transition at beginning of bit interval represents $1$; no transition represents $0$.
3. **Manchester Encoding (Used in Classic 10BASE-T Ethernet)**:
   - Every bit interval has a transition in the exact middle.
   - Low-to-High transition represents $0$; High-to-Low transition represents $1$.
   - **Advantage**: Built-in clock recovery on every bit.
   - **Disadvantage**: Requires **double the bandwidth** (baud rate = $2 \times$ bit rate).
4. **Differential Manchester (Used in Token Ring 802.5)**:
   - Mid-bit transition always present for clocking. A transition at the *start* of the bit period represents $0$; absence of transition at start represents $1$.

### Multiplexing Techniques

Multiplexing combines multiple independent data signals over a single high-bandwidth physical medium.

```
FDM (Frequency Division):
Frequency ▲  [ Channel 1: Voice 1 (88-92 MHz) ]
          │  [ Channel 2: Voice 2 (92-96 MHz) ]  (Simultaneous frequencies)
          └────────────────────────────────────────► Time

TDM (Time Division):
Frequency ▲  [ Time Slot 1 ] [ Time Slot 2 ] [ Time Slot 3 ]
          │  (All users share full frequency band in interleaved time slices)
          └────────────────────────────────────────► Time
```

- **FDM (Frequency Division Multiplexing)**: Analog technique dividing frequency spectrum into non-overlapping channels separated by guard bands (e.g. Radio, Cable TV).
- **TDM (Time Division Multiplexing)**: Digital technique where users take turns utilizing the entire bandwidth in assigned recurring time slots (Synchronous TDM vs Statistical Asynchronous TDM).
- **WDM (Wavelength Division Multiplexing)**: Optical fiber equivalent of FDM combining multiple light beams of distinct wavelengths ($\lambda$) onto a single glass strand (Dense WDM / DWDM handles 80+ channels per fiber).
- **CDMA (Code Division Multiple Access)**: All users transmit simultaneously across the entire frequency band using mathematically orthogonal pseudo-random spreading codes.

### Fundamental Physical Limits: Nyquist and Shannon Theorems

#### 1. Nyquist Bit Rate (For Noiseless Channels)
Defines maximum theoretical data rate on a noiseless channel with bandwidth $B$ and $L$ signal voltage levels:
$$\text{Max Bit Rate} = 2 \times B \times \log_2(L) \quad \text{[bits/second]}$$

#### 2. Shannon Channel Capacity (For Noisy Real-World Channels)
Defines maximum theoretical channel capacity $C$ in the presence of thermal Gaussian noise:
$$C = B \times \log_2\left(1 + \frac{S}{N}\right) \quad \text{[bits/second]}$$
where $\frac{S}{N}$ is the linear Signal-to-Noise Ratio ($\text{SNR}_{\text{dB}} = 10 \log_{10}\frac{S}{N}$).

---

## 🔴 Expert Level

### Pulse Code Modulation (PCM) & Analog-to-Digital Conversion

To digitize continuous voice/audio for digital networks:
1. **Sampling (Nyquist Criterion)**: Sample analog signal at frequency $f_s \ge 2 \times f_{\max}$ (e.g. human voice up to 4 kHz is sampled at 8,000 samples/sec).
2. **Quantization**: Map sampled voltages to discrete quantization levels. Companding algorithms ($\mu$-law in North America, A-law in Europe) apply logarithmic scaling to reduce quantization distortion in low-amplitude voice.
3. **Encoding**: Convert discrete quantization levels into $n$-bit binary words. Standard telephony DS0 = $8{,}000 \text{ samples/s} \times 8 \text{ bits} = 64 \text{ Kbps}$.

```
Analog Wave ──► [ Sampler (8 kHz) ] ──► [ Quantizer (256 levels) ] ──► [ 8-bit Binary ] ──► 64 Kbps DS0
```

### Orthogonal Frequency Division Multiplexing (OFDM)

OFDM is the core modulation underlying modern **Wi-Fi 5/6 (802.11ac/ax)**, **4G LTE**, and **5G NR**.
- Instead of transmitting high-speed serial data over a single wideband carrier (which suffers severe multipath fading and Inter-Symbol Interference - ISI), OFDM splits the stream into hundreds of low-rate sub-carriers.
- Sub-carriers are spaced closely such that they are mathematically **orthogonal** ($\int \sin(m \omega t) \sin(n \omega t) dt = 0$). Peak of each subcarrier corresponds to null point of adjacent subcarriers, eliminating spectral guard bands and maximizing spectral efficiency.

```
OFDM Orthogonal Subcarriers:
   ▲   Subcarrier 1       Subcarrier 2       Subcarrier 3
   │      ╭───╮              ╭───╮              ╭───╮
   │     ╱     ╲            ╱     ╲            ╱     ╲
───┼────┼───────┼──────────┼───────┼──────────┼───────┼───► Frequency
   │   Peak 1  Null       Peak 2  Null       Peak 3
```

---

### Key Interview Questions

#### Q1: Why does Manchester encoding require double the bandwidth of NRZ encoding?
**Answer**: Manchester encoding forces a signal transition in the center of *every* bit period regardless of whether the bit is $0$ or $1$. Therefore, transmitting $N$ bits per second requires a modulation rate of up to $2N$ baud (signal changes per second), requiring a minimum Nyquist bandwidth of $N$ Hz compared to $\frac{N}{2}$ Hz for NRZ.

#### Q2: Calculate the theoretical capacity of a 4 kHz telephone line with an SNR of 30 dB.
**Answer**:
1. Convert SNR from dB to linear ratio:
   $$\text{SNR}_{\text{dB}} = 10 \log_{10}\left(\frac{S}{N}\right) \implies 30 = 10 \log_{10}\left(\frac{S}{N}\right) \implies \frac{S}{N} = 10^3 = 1000$$
2. Apply Shannon's Formula:
   $$C = B \times \log_2\left(1 + \frac{S}{N}\right) = 4000 \times \log_2(1 + 1000) \approx 4000 \times \log_2(1001)$$
   $$\log_2(1001) \approx 9.967 \implies C \approx 4000 \times 9.967 \approx 39{,}868 \text{ bps} \approx 39.87 \text{ Kbps}$$

#### Q3: What is the physical mechanism causing Total Internal Reflection in optical fibers?
**Answer**: Fiber optic cables consist of an inner glass **core** with a higher refractive index ($n_1$) surrounded by an outer glass **cladding** with a lower refractive index ($n_2 < n_1$). When light enters the core at an angle of incidence greater than the critical angle $\theta_c = \arcsin\left(\frac{n_2}{n_1}\right)$ relative to the core-cladding boundary, 100% of the light energy is reflected back into the core with zero refraction leakage into the cladding, allowing optical pulses to travel tens of kilometers with minimal attenuation.
