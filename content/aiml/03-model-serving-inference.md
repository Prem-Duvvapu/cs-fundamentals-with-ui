# LLM Model Serving & Low-Latency Inference Optimization

## 🟢 Beginner Level

### Model Serving vs. Traditional Web Services
Serving Machine Learning models in production backend systems presents unique architectural challenges:
- **High Memory Footprint**: A 70B parameter model in FP16 requires **140 GB of GPU VRAM** just to load model weights!
- **Compute-Bound Processing**: Token generation evaluates billions of matrix multiplications ($W \cdot x + b$) per generated token.

```
+-------------------------------------------------------------------------+
|                        LLM Inference Pipeline                           |
| 1. Prefill Phase (Prompt Processing)  -->  2. Decode Phase (Token Generation)|
|    - High Compute (Parallel Matrix Mult)    - High Memory I/O Bound        |
|    - Processes prompt tokens in 1 pass     - Generates 1 token at a time  |
+-------------------------------------------------------------------------+
```

---

## 🟡 Intermediate Level

### Key Inference Optimization Techniques

1. **Model Quantization**: Reduces numerical precision of weights to save GPU memory and increase throughput:
   - **FP32 (32-bit Float)** $\rightarrow$ **FP16 (16-bit Float)**: $50\%$ memory reduction with zero accuracy loss.
   - **INT8 (8-bit Integer) / INT4 (4-bit Integer)**: $75\% - 87.5\%$ memory reduction using AWQ / GPTQ techniques.
2. **KV Caching (Key-Value Cache)**: During token generation, past token Key and Value projection vectors are cached in GPU VRAM to avoid recomputing Attention matrix multiplications for previous tokens.
3. **Continuous Dynamic Batching**: Unlike static web batching, incoming requests join and leave the active inference batch dynamically at every iteration step.

---

## 🔴 Expert Level

### vLLM & PagedAttention Memory Architecture

Standard KV Caching causes up to $60-80\%$ GPU VRAM waste due to memory fragmentation and static allocation per request context window.

> **PagedAttention (vLLM)**: Inspired by Virtual Memory Paging in OS kernel architecture!
> - Divides KV Cache into fixed-size physical blocks (e.g. 16 tokens per block).
> - Allocates physical blocks dynamically on-demand from a shared GPU page pool.
> - Allows different requests to share KV Cache blocks during parallel decoding (e.g., parallel system prompts).

```
VIRTUAL KV CACHE BLOCKS                  PHYSICAL GPU VRAM BLOCKS
Request 1 [ Block 0 | Block 1 ]  ──►  Block 4 [ Tokens 0..15 ]
                                      Block 12 [ Tokens 16..31 ]
Request 2 [ Block 0 | Block 2 ]  ──►  Block 7 [ Shared System Prompt ]
```

### Interview Questions

1. **Why is the Decode phase of LLM generation memory-bandwidth bound rather than compute-bound?**
   - *Answer*: During decoding, the GPU loads 140 GB of model weights from High Bandwidth Memory (HBM) to SRAM to generate a single token (Arithmetic Intensity $= 1 \text{ FLOP/byte}$). High-performance inference engines rely on KV Caching and FlashAttention to maximize memory bandwidth utilization.

2. **How does Speculative Decoding speed up LLM inference by 2-3x?**
   - *Answer*: A small, fast Draft Model (e.g. 1B params) generates $K$ candidate tokens rapidly. A large Target Model (e.g. 70B params) evaluates all $K$ candidate tokens in a single parallel forward pass, accepting valid tokens and rejecting bad ones.
