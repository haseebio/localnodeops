---
title: "Why Your 24GB VRAM Isn't Enough: Context Spillover and Layer Offloading Explained"
excerpt: "Why does a 14GB GGUF model crash a 24GB RTX 4090? A deep dive into KV cache scaling, CUDA context overhead, and layer offloading math."
category: "Hardware"
pubDate: 2026-09-18
author: "LocalNodeOps"
tags:
  - "VRAM"
  - "GGUF"
  - "Ollama"
  - "llama.cpp"
  - "Hardware"
readingTime: 5
faq:
  - question: "Why does my GPU throw CUDA_OUT_OF_MEMORY if the model file is smaller than my VRAM?"
    answer: "Model file size only represents static weights stored on disk. During inference, your GPU also requires memory for CUDA runtime initialization (~0.5–1.2 GB), tensor activation overhead, and the Key-Value (KV) cache. As context windows expand (e.g., 16k–128k tokens), the KV cache grows rapidly, pushing total VRAM usage past physical card limits even when the raw .gguf file appears to fit easily."
  - question: "How much generation speed do I lose when offloading layers to System RAM?"
    answer: "Offloading even a small percentage of layers to system memory causes a steep drop in token speed. While a modern GPU's VRAM transfers data at roughly 1,000 GB/s, dual-channel DDR5 system RAM maxes out around 60–80 GB/s over PCIe buses. When layers are split between VRAM and RAM, generation speed typically drops from 80+ tokens/sec down to 2–5 tokens/sec because the pipeline must wait for memory transfers across the PCIe bus."
---

It is one of the most frustrating experiences in local AI inference: you buy a 24GB GPU like the RTX 3090 or 4090, pull a 70B GGUF quantized down to 14GB, hit `run`, and immediately watch your driver throw a `CUDA_OUT_OF_MEMORY` crash or tank your generation speed to 1.2 tokens per second.

On paper, 14GB fits inside 24GB with 10GB of safety margin. In practice, model parameter size is only the baseline cost of running a local LLM. 

If you want to size local hardware accurately—or prevent system RAM spillover—you need to calculate the hidden VRAM consumers: **CUDA runtime context**, **KV cache scaling**, and **layer offloading math**.

---

## 1. The Baseline: Static Weights vs. Dynamic Memory

When you inspect a `.gguf` file on Hugging Face, the file size tells you only the static storage cost of the model's weights. 

For example, a **32B model** at **Q4_K_M** quantization takes up roughly **19.8 GB** of disk space. When loaded into VRAM, those weights remain fixed. However, inference is a dynamic process. The moment you send a prompt, your system allocates additional VRAM across three primary pools:

1. **CUDA Context & Driver Overhead:** Allocates ~0.5 GB to 1.2 GB merely initializing the GPU runtime environment.
2. **Activation Memory:** Temporary memory used during tensor calculations during forward passes.
3. **KV Cache (Key-Value Cache):** Memory required to maintain context across multi-turn conversations or long prompts.

While CUDA context and activation memory remain relatively small and constant, **KV cache scales linearly with context length and batch size**.

---

## 2. The KV Cache Trap: How Context Window Kills VRAM

The KV cache stores attention states for every token processed in a session so the transformer does not have to recalculate the entire history for every newly generated token.

The VRAM required for KV cache depends on five parameters:
* L: Number of layers in the model
* H: Number of key-value heads
* D: Head dimension size
* C: Context window length (e.g., 4,096 vs 32,768 vs 128,000 tokens)
* P: Precision byte size (e.g., FP16 = 2 bytes, Q8_0 = 1 byte, Q4_0 = 0.5 bytes)

For a dense 70B parameter model (e.g., Llama 3 70B with 80 layers and Grouped-Query Attention):

* **At 4k context (FP16 KV cache):** Needs ~1.2 GB of extra VRAM.
* **At 32k context (FP16 KV cache):** Needs ~9.6 GB of extra VRAM.
* **At 128k context (FP16 KV cache):** Needs ~38.4 GB of extra VRAM **just for context memory**.

This is why a 19GB model running on a 24GB card crashes at 16k context: the static model weights (19 GB) + CUDA overhead (1 GB) + KV cache (6 GB) exceed the card's physical limit of 24 GB.

### Mitigating KV Cache Bloat

If you run high-context workflows on consumer hardware, you have two primary levers:

1. **FlashAttention (`--flash-attn`):** Compresses memory access patterns and avoids storing redundant intermediate attention matrices.
2. **KV Cache Quantization (`--cache-type-k q8_0 --cache-type-v q8_0`):** Reduces KV cache precision from FP16 down to Q8 or Q4 in `llama.cpp` or Ollama, cutting memory footprint by 50% to 75% with minimal perplexity loss.

---

## 3. Layer Offloading & System RAM Spillover

When a model is slightly too large for your GPU, runners like `llama.cpp` allow partial offloading (`-ngl` or `--n-gpu-layers`). 

If a 32-layer model has 20 layers offloaded to VRAM and 12 layers sitting in System RAM (CPU execution), execution does not just slow down slightly—**it hits a performance cliff**.

```text
+-------------------------------------------------------------+
| VRAM (PCIe Gen4 x16 = ~31.5 GB/s Bandwidth)                 |
| [ Layer 0 ]  [ Layer 1 ] ... [ Layer 20 ]                   |
+-------------------------------------------------------------+
                              ||  <-- PCIe Bottleneck
+-------------------------------------------------------------+
| System RAM (DDR5 Dual-Channel = ~60 GB/s Bandwidth)         |
| [ Layer 21 ] [ Layer 22 ] ... [ Layer 32 ]                  |
+-------------------------------------------------------------+

```

While VRAM on an RTX 4090 moves data at **1,008 GB/s**, DDR5 system memory maxes out around **60–80 GB/s**, and PCIe transfers introduce heavy latency bottlenecks. The entire pipeline executes only as fast as its slowest tensor transfer.

* **100% VRAM Offload:** ~80 to 120 tokens/sec (8B/14B models).
* **90% VRAM / 10% RAM Spillover:** Drops to ~5 to 12 tokens/sec.
* **50% VRAM / 50% RAM Spillover:** Drops to ~1.5 to 3 tokens/sec (unusable interactive speed).

---

## 4. Hardware Sizing Cheat Sheet

To keep your models running entirely inside VRAM without hitting swap or context OOM crashes, use these practical sizing rules:

| GPU / VRAM Target | Safe Model Size Target | Ideal Quantization | Max Safe Context (Default FP16 KV) |
| --- | --- | --- | --- |
| **8 GB VRAM** (RTX 4060, Mac 8GB) | 8B Parameters | Q4_K_M (~4.8 GB) | 4,096 tokens |
| **12 GB VRAM** (RTX 3060, RTX 4070) | 8B to 14B Parameters | Q4_K_M / Q8_0 (~8.5 GB) | 16,384 tokens |
| **16 GB VRAM** (RTX 4070 Ti, M-Series 16GB) | 14B to 27B Parameters | Q4_K_M (~10.5 GB) | 16,384 tokens |
| **24 GB VRAM** (RTX 3090, 4090, 5090) | 32B Parameters | Q4_K_M / Q5_K_M (~20 GB) | 16,384 tokens |
| **48 GB VRAM** (Dual RTX 3090 / 4090) | 70B Parameters | Q4_K_M (~41 GB) | 8,192 tokens |

*Note on Apple Silicon:* Macs share Unified Memory between the CPU and GPU. macOS automatically reserves 20% to 30% of total system RAM for OS tasks, meaning a 16GB Mac Mini M4 has an effective Metal allocation ceiling of ~11.5 GB for model execution.

---

## Summary Recommendation

Before downloading a model, do not look solely at the raw file size. Calculate your true VRAM footprint using this formula:

**Total VRAM Required = Model File Size (GB) + KV Cache Size (GB) + 10% of that subtotal (runtime overhead)**

This matches the exact formula this site's own [VRAM calculator](/calculator) and [methodology](/methodology) use — overhead scales with model size rather than being a fixed number, since CUDA context and activation memory needs grow with larger models too.

You can calculate precise VRAM requirements for any GGUF quantization level, context length, and GPU configuration directly on our [Interactive VRAM Calculator](/calculator).