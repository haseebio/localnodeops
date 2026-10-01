---
title: VRAM Calculation Methodology
description: Mathematical formulas and system overhead models used by LocalNodeOps for local LLM hardware profiling.
sidebarPosition: 1
version: "1.0"
---

LocalNodeOps predicts GPU memory consumption for Large Language Models prior to downloading or running inference.

## Primary Formula

Total memory allocation is calculated using:

$$VRAM_{total} = (VRAM_{weights} + VRAM_{kv\_cache}) \times 1.10$$

*The **1.10 multiplier** accounts for a mandatory 10% CUDA context and framework overhead (PyTorch/llama.cpp).*

---

## 1. Model Weights ($VRAM_{weights}$)

Model weight memory depends on total parameter count and quantization bit-width:

$$VRAM_{weights} = \frac{\text{Parameters (Billions)} \times \text{Bits per Weight}}{8}$$

### Quantization Reference Table

| Precision | Bits / Weight | Memory per 1B Params |
| :--- | :--- | :--- |
| **FP16 / BF16** | 16.0 | 2.00 GB |
| **Q8_0** | 8.5 | 1.06 GB |
| **Q6_K** | 6.56 | 0.82 GB |
| **Q5_K_M** | 5.5 | 0.69 GB |
| **Q4_K_M** | 4.5 | 0.56 GB |
| **Q3_K_M** | 3.5 | 0.44 GB |
| **IQ2_XXS** | 2.2 | 0.28 GB |

---

## 2. KV Cache Overhead ($VRAM_{kv\_cache}$)

Key-Value (KV) cache grows linearly with context length and batch size:

$$VRAM_{kv\_cache} = \frac{2 \times L \times H \times D \times C \times P \times B}{10^9}$$

Where:
* $L$ = Number of Hidden Layers
* $H$ = Number of Attention Heads
* $D$ = Head Dimension Size
* $C$ = Active Context Length (Tokens)
* $P$ = Precision Bytes (FP16 = 2, Q8_0 = 1, Q4_0 = 0.5)
* $B$ = Concurrent Batch Size

---

## 3. Hardware Profiling Rules

* **Single GPU Fit:** $VRAM_{total} \le VRAM_{gpu\_usable}$
* **Tensor Parallelism (Multi-GPU):** $VRAM_{total} \le \sum (VRAM_{gpu\_i}) \times 0.95$ *(5% loss to inter-GPU communication buffers)*
* **OOM Threshold:** Triggered if estimated peak memory exceeds 98% of physical VRAM.