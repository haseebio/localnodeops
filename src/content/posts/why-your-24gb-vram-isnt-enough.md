---
title: "Why Your 24GB VRAM Isn't Enough: Context Spillover and Layer Offloading Explained"
excerpt: "Why does an 18.49GB 32B GGUF crash a 24GB RTX 4090? A deep dive into KV cache scaling, CUDA context overhead, and layer offloading math."
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
    answer: "Model file size only represents static weights stored on disk. During inference, your GPU also requires memory for CUDA runtime initialization, tensor activation overhead, and the Key-Value (KV) cache. The KV cache is reserved for your full context window when the model loads, so as you set larger context windows (e.g., 16k–128k tokens), the KV cache grows rapidly, pushing total VRAM usage past physical card limits even when the raw .gguf file appears to fit easily."
  - question: "How much generation speed do I lose when offloading layers to System RAM?"
    answer: "A lot, even for a small share of layers. Layers that sit in system RAM run on the CPU at system-memory speed, and every token has to wait for them. Token generation is limited by memory bandwidth: a modern GPU's VRAM moves roughly 1,000 GB/s, while dual-channel DDR5 manages about 60–80 GB/s. As a worked example (arithmetic, not a benchmark), an 18.49 GB model has a bandwidth ceiling of about 54 tokens/sec fully in VRAM, about 22 with 10% of the weights in RAM, and about 7 with half in RAM, assuming 1,008 GB/s for VRAM and 65 GB/s for RAM. Real speeds are lower than these ceilings."
---

It is one of the most frustrating experiences in local AI inference: you buy a 24GB GPU like the RTX 3090 or 4090, download a 32B model such as DeepSeek-R1-Distill-Qwen-32B at Q4_K_M, see that the file is only 18.49 GB, set a 16K context window, hit `run`, and watch the loader throw a `CUDA_OUT_OF_MEMORY` error, or watch your generation speed collapse once layers spill into system RAM.

On paper, 18.49 GB fits inside 24 GB with 5.5 GB to spare. In practice, the weights are only the baseline cost of running a local LLM. At a 16K context window, the KV cache alone reserves about 4 GB, and the runtime adds roughly 10% on top, for a total of about 24.7 GB. That is past the card's limit. At 8K context the same model needs about 22.5 GB and just fits.

If you want to size local hardware accurately—or prevent system RAM spillover—you need to calculate the hidden VRAM consumers: **CUDA runtime context**, **KV cache scaling**, and **layer offloading math**.

---

## 1. The Baseline: Static Weights vs. Everything Else

When you inspect a `.gguf` file on Hugging Face, the file size tells you only the static storage cost of the model's weights. 

For example, a **32B model** at **Q4_K_M** quantization takes up **18.49 GB** of disk space. When loaded into VRAM, those weights remain fixed. However, weights are not the only thing that needs VRAM. When the model loads, your system also reserves memory for three more things:

1. **CUDA Context & Driver Overhead:** Memory the GPU runtime reserves just to initialize (the amount varies with the driver and the card).
2. **Activation Memory:** Temporary memory used during tensor calculations during forward passes.
3. **KV Cache (Key-Value Cache):** Memory reserved for the full context window you set, sized up front when the model loads.

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

For a dense 70B parameter model (e.g., Llama 3 70B with 80 layers, 8 key-value heads, and a head size of 128 under Grouped-Query Attention):

* **At 4k context (FP16 KV cache):** Needs about 1.25 GB of extra VRAM.
* **At 32k context (FP16 KV cache):** Needs about 10 GB of extra VRAM.
* **At 128k context (FP16 KV cache):** Needs about 40 GB of extra VRAM **just for context memory**.

This is why an 18.49 GB 32B model that loads on a 24GB card at 8k context fails to load at 16k: the weights (18.49 GB) + KV cache (4.0 GB) + 10% runtime overhead (2.25 GB) come to about 24.7 GB, past the card's physical limit of 24 GB.

### Mitigating KV Cache Bloat

If you run high-context workflows on consumer hardware, you have two primary levers:

1. **FlashAttention (`--flash-attn`):** Compresses memory access patterns and avoids storing redundant intermediate attention matrices.
2. **KV Cache Quantization (`--cache-type-k q8_0 --cache-type-v q8_0`):** Reduces KV cache precision from FP16 down to Q8 or Q4 in `llama.cpp` or Ollama, cutting memory footprint by 50% to 75% with minimal perplexity loss.

---

## 3. Layer Offloading & System RAM Spillover

When a model is slightly too large for your GPU, runners like `llama.cpp` allow partial offloading (`-ngl` or `--n-gpu-layers`). 

If a 32-layer model has 20 layers on the GPU and 12 layers in system RAM, those 12 layers run on the CPU, and execution does not just slow down slightly—**it hits a performance cliff**.

```text
+-------------------------------------------------------------+
| GPU VRAM (about 1,008 GB/s on an RTX 4090)                  |
| [ Layer 0 ]  [ Layer 1 ] ... [ Layer 19 ]                   |
+-------------------------------------------------------------+
                              ||
+-------------------------------------------------------------+
| System RAM (DDR5 dual-channel, about 60-80 GB/s)            |
| [ Layer 20 ] [ Layer 21 ] ... [ Layer 31 ]                  |
+-------------------------------------------------------------+

```

Token generation is limited by memory bandwidth. Every token reads all of the weights once, so the time per token is the time to read the GPU's share at VRAM speed plus the time to read the RAM share at system-memory speed. The slow part dominates.

**Worked example (arithmetic, not a benchmark).** Take the 18.49 GB 32B file, 1,008 GB/s for the RTX 4090's VRAM and 65 GB/s for DDR5-5600 system RAM. These are the best case for each setup:

* **All weights in VRAM:** about 54 tokens/sec at most.
* **10% of the weights in RAM:** about 22 tokens/sec at most.
* **50% of the weights in RAM:** about 7 tokens/sec at most.
* **All weights in RAM (CPU only):** about 3.5 tokens/sec at most. [A llama.cpp user report](https://github.com/ggml-org/llama.cpp/issues/19480) measured about 3.5 tokens/sec for a dense 32B Q4_K_M model on DDR5-5600, which matches.

Real speeds are lower than these ceilings and vary with the CPU, the memory setup, the llama.cpp build and the context length.

---

## 4. Hardware Sizing Cheat Sheet

To keep your models running entirely inside VRAM without hitting swap or context OOM crashes, use these practical sizing rules:

| GPU / VRAM Target | Safe Model Size Target | Ideal Quantization (file size) | Max Safe Context (FP16 KV, llama.cpp) |
| --- | --- | --- | --- |
| **8 GB VRAM** (RTX 4060) | 8B Parameters | Q4_K_M (~4.6 GB) | 16,384 tokens |
| **12 GB VRAM** (RTX 3060, RTX 4070) | 8B Parameters | Q8_0 (~8.0 GB) | 16,384 tokens |
| **16 GB VRAM** (RTX 4060 Ti 16GB, Arc A770 16GB) | 20B MoE (gpt-oss 20b) | Q4_K_M (~10.8 GB) | 131,072 tokens |
| **24 GB VRAM** (RTX 3090, 4090) | 32B Parameters | Q4_K_M (~18.5 GB) | 8,192 tokens |
| **32 GB VRAM** (RTX 5090) | 32B Parameters | Q4_K_M (~18.5 GB) | 32,768 tokens |
| **48 GB VRAM** (RTX 6000 Ada, or two 24 GB cards pooled) | 70B Parameters | Q4_K_M (~39.6 GB) | 8,192 tokens |

These rows come from the same formula as our [VRAM calculator](/hardware): weights + KV cache + 10% runtime overhead. They use real file sizes (Llama 3.1 8B, gpt-oss 20b, DeepSeek-R1-Distill-Qwen-32B, Llama 3.1 70B) and assume the GPU has nothing else loaded. A 32B Q4_K_M model at 16K context needs about 24.7 GB, so it is **not safe** on a 24 GB card. 27B-class Q4_K_M files are 15.5 to 16.2 GB, so they do not fit a 16 GB card at all: the weights alone fill it. The 16 GB row uses a mixture-of-experts model with sliding-window attention, which keeps its KV cache small; a dense model of similar size will not reach that context. The two-card row assumes the weights split evenly, which is an upper bound.

*Note on Apple Silicon:* Macs share Unified Memory between the CPU and GPU. By default macOS lets the GPU use roughly 75% of total RAM (the exact figure varies), so a 16GB Mac has about 12 GB for model execution. That is why Macs are not listed in the rows above.

---

## Summary Recommendation

Before downloading a model, do not look solely at the raw file size. Calculate your true VRAM footprint using this formula:

**Total VRAM Required = Model File Size (GB) + KV Cache Size (GB) + 10% of that subtotal (runtime overhead)**

This matches the exact formula this site's own [VRAM calculator](/hardware) and [methodology](/methodology) use — overhead scales with model size rather than being a fixed number, since CUDA context and activation memory needs grow with larger models too.

You can calculate precise VRAM requirements for any GGUF quantization level, context length, and GPU configuration directly on our [Interactive VRAM Calculator](/hardware).