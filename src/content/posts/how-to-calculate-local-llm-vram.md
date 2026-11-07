---
title: "How to Calculate Local LLM VRAM: Formulas for Weights, KV Cache, and Quantization"
seoTitle: "How to Calculate Local LLM VRAM (Formulas)"
excerpt: "Learn how to calculate exact local LLM VRAM requirements including model weights, GQA KV cache scaling, quantization overhead, and CPU offloading bottlenecks."
category: "Hardware"
pubDate: 2026-10-29
readingTime: 6
author: "Haseeb"
tags: ["LLM", "VRAM", "GPU", "Quantization", "Local AI"]
---

Running large language models locally often presents a frustrating challenge: developers spend hours downloading tens of gigabytes of model weights, only to face an immediate Out-Of-Memory (OOM) error upon execution. This typically happens because many users look only at the size of the model file on disk. However, true hardware planning requires accounting for dynamic memory allocations like Key-Value (KV) cache scaling and runtime overhead.

To estimate GPU VRAM requirements and avoid these crashes, add up three things: the model weights, the KV cache, and an allowance for runtime overhead. This site uses a 10% allowance:

```text
Total VRAM = (Weights + KV cache) x 1.10
```

The 10% is an estimate, not a measurement. The [methodology page](/methodology) explains how the numbers are made.

---

## 1. Calculating Model Weight Memory

The baseline VRAM requirement is set by the parameter count and the quantization precision, measured in bits per weight. Unquantized models run at 16-bit floating point (FP16), which takes two bytes per parameter. Quantized GGUF formats such as Q8_0 and Q4_K_M compress the weights to about 8.5 or 4.9 bits per weight.

```text
Weights (bytes) = parameters x bits per weight / 8
```

For example, an 8 billion parameter model at 4.89 bits per weight is about 8 x 10^9 x 4.89 / 8, or roughly 4.9 GB (decimal), which is about 4.6 GiB. That is close to the real Llama 3.1 8B Q4_K_M file of 4.58 GiB.

### Bits per Weight in Practice

Quantized files store a scale value with each block of weights, so the real bits per weight sit above the nominal tier. These are the figures in [llama.cpp's quantization table](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md) for Llama 3.1 8B:

- **FP16 (16-bit):** 16.00 bits, 2.00 bytes per parameter
- **Q8_0 (8-bit):** 8.50 bits, about 1.06 bytes per parameter
- **Q4_K_M (4-bit Medium):** 4.89 bits, about 0.61 bytes per parameter

The calculator uses 4.83 bits for generic Q4_K_M estimates, because the real value varies from model to model. When you pick a synced model, the calculator uses its real file size instead.

---

## 2. Context Window VRAM Usage and the KV Cache

A common cause of unexpected CUDA OOM crashes is **context window VRAM usage**. As the context length grows, the Key-Value (KV) cache must store past token representations in GPU memory. This prevents the system from recomputing attention at every inference step, but it takes VRAM quickly.

### Grouped Query Attention (GQA)

Many modern architectures, such as Llama 3 and Mistral 7B, use **Grouped Query Attention (GQA)**. GQA stores fewer key and value heads than attention heads, which shrinks the KV cache and saves memory during long conversations. The KV cache size is:

```text
KV cache = 2 x layers x KV heads x head size x context length x bytes per value
```

Where:

- **layers:** the number of transformer layers.
- **KV heads:** the number of key and value heads, which is smaller than the number of attention heads in a GQA model.
- **head size:** the size of each head.
- **context length:** the active context window in tokens.
- **bytes per value:** 2 for FP16. If you quantize the cache, `q8_0` is 8.5 bits (about 1.06 bytes) and `q4_0` is 4.5 bits (about 0.56 bytes) per value.

For Llama 3.1 8B (32 layers, 8 KV heads, head size 128) in FP16, that is 2 x 32 x 8 x 128 x 2 bytes, or 128 KiB per token. At 8,192 tokens the cache is 1.0 GB, and at 32,768 tokens it is 4.0 GB. Quantizing the cache has a quality cost. The [24GB VRAM post](/posts/why-your-24gb-vram-isnt-enough) covers the measured numbers.

---

## 3. Quantization Memory Comparison

Here is how the formulas work out for an 8B and a 70B model. Weights are real file sizes. The 70B model has 80 layers, 8 KV heads and head size 128, so its cache is 2.5 GB at 8K and 10.0 GB at 32K. Totals use (weights + KV cache) x 1.10.

| Model | Quantization | Weights (File) | KV Cache 8K | KV Cache 32K | Total at 8K | Total at 32K |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Llama 3.1 8B** | FP16 | 14.96 GB | 1.0 GB | 4.0 GB | **17.6 GB** | **20.9 GB** |
| **Llama 3.1 8B** | Q8_0 | 7.95 GB | 1.0 GB | 4.0 GB | **9.8 GB** | **13.1 GB** |
| **Llama 3.1 8B** | Q4_K_M | 4.58 GB | 1.0 GB | 4.0 GB | **6.1 GB** | **9.4 GB** |
| **Llama 3.1 70B** | Q8_0 | 69.82 GB | 2.5 GB | 10.0 GB | **79.6 GB** | **87.8 GB** |
| **Llama 3.1 70B** | Q4_K_M | 39.6 GB | 2.5 GB | 10.0 GB | **46.3 GB** | **54.6 GB** |

*File sizes are in GiB (1024^3 bytes) and shown as GB, as everywhere on this site.*

To check any row against your own card, use the [VRAM calculator](/hardware). To see every synced model that fits at once, use the [matchmaker](/matchmaker).

---

## 4. GPU VRAM vs System RAM: CPU Offload Bottlenecks

When the total memory requirement exceeds GPU VRAM, `llama.cpp` can run some layers on the CPU from system RAM. The `--n-gpu-layers` option sets how many layers stay on the GPU.

CPU offloading is a good fallback against CUDA OOM crashes, but it runs into a large memory bandwidth gap:

- **NVIDIA RTX 4090 memory bandwidth:** about 1,008 GB/s.
- **Dual-channel DDR5 system RAM:** roughly 55 to 90 GB/s in synthetic benchmarks, depending on the kit and the test. The theoretical peak for DDR5-6000 is 96 GB/s.

At those figures, each gigabyte read from system RAM takes roughly 11 to 18 times as long as one read from the 4090's VRAM (1,008 divided by 89 and by 55). Token speed falls as soon as layers spill into RAM. The [24GB VRAM post](/posts/why-your-24gb-vram-isnt-enough) works through the arithmetic for a 32B model and lists the sources for the DDR5 figures.

---

## 5. Automated Hardware Sizing

Instead of doing the layer math by hand for every deployment, you can check your hardware directly:

- The **[VRAM calculator](/hardware)** shows the memory breakdown for one model at your context length, with a headroom check and a CPU offload check, before you download any weights.
- The **[matchmaker](/matchmaker)** takes your GPU memory, system RAM and context length and sorts every synced model into full GPU fit, offload required or out of memory. Its multi-model card adds up several models run together.

## Sources

- [llama.cpp quantization README](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md): bits per weight and file sizes for Llama 3.1 8B.
- [llama.cpp pull request #7412](https://github.com/ggerganov/llama.cpp/pull/7412): bits per value for quantized KV cache types.
- [RTX 4070 and RTX 4070 Ti specs (Guru3D)](https://www.guru3d.com/news-story/nvidia-geforce-rtx-4070-and-rtx-4070-ti-specs-get-detailed.html): memory bandwidth figures for the RTX 40 series.