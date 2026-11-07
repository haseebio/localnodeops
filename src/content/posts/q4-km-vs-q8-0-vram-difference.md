---
title: "Q4_K_M vs Q8_0: VRAM Footprint and Perplexity Trade-offs in Local LLMs"
seoTitle: "Q4_K_M vs Q8_0: VRAM and Quality Trade-offs"
excerpt: "Compare Q4_K_M and Q8_0 quantizations to determine the optimal balance of VRAM savings, token generation speed, and model accuracy."
category: "Quantization"
pubDate: 2026-10-31
readingTime: 5
author: "Haseeb"
tags: ["LLM", "VRAM", "Quantization", "GGUF", "Local AI"]
---

When deploying local Large Language Models (LLMs) via `llama.cpp` or Ollama, selecting the correct GGUF quantization format is one of the most important decisions for hardware planning. For developers balancing VRAM constraints against model quality, the choice often narrows down to **Q4_K_M** and **Q8_0**.

This guide compares the VRAM footprint, the measured quality cost and the speed of the two formats, using numbers from llama.cpp's own documentation where they exist.

## The VRAM Difference

Quantization reduces the memory footprint of an LLM by storing each model weight in fewer bits than the 16 bits of FP16. These are the figures in [llama.cpp's own quantization table](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md) for Llama 3.1 8B:

* **Q8_0 (8-bit):** Stores each weight in 8 bits plus a scale value for every block of weights, which averages **8.5 bits (about 1.06 bytes) per weight**.
* **Q4_K_M (4-bit Medium):** A mixed-precision format. Most tensors are stored at 4-bit and some at higher precision. llama.cpp measures **4.89 bits (about 0.61 bytes) per weight** on Llama 3.1 8B. The VRAM calculator on this site uses 4.83 as its generic estimate, and real files vary from model to model.

### VRAM Calculation Example: Llama 3.1 8B

Weights are the real file sizes. The KV cache for this model is 1.0 GB at 8,192 tokens in FP16 (32 layers, 8 KV heads, head size 128). The total follows the site formula, **(weights + KV cache) x 1.10**, where the extra 10% is an estimate of runtime overhead.

| Quantization | Bits per Weight | Model File (Weights) | KV Cache (8K Context) | Total at 8K Context |
| :--- | :--- | :--- | :--- | :--- |
| **FP16 (Uncompressed)** | 16.00 | 14.96 GB | 1.0 GB | **17.6 GB** |
| **Q8_0** | 8.50 | 7.95 GB | 1.0 GB | **9.8 GB** |
| **Q4_K_M** | 4.89 | 4.58 GB | 1.0 GB | **6.1 GB** |

*Note: File sizes are in GiB (1024^3 bytes) and shown as GB, as everywhere on this site. Unless you change `--cache-type-k` and `--cache-type-v`, llama.cpp stores the KV cache as f16, which is why the cache stays the same across weight quantizations.*

To run these numbers for your own model and context length, use the [VRAM calculator](/hardware).

## Perplexity: Is Q4_K_M "Dumbed Down"?

**Perplexity** measures how well a model predicts the next token. Lower is better. Compressing weights from 16-bit to 4-bit always loses some information, so the question is how much.

* **Q8_0:** Sits closest to FP16 of the common formats, since it keeps 8-bit weights. No measured figure is quoted here.
* **Q4_K_M:** In llama.cpp's own tests on one Llama 3 8B model, Q4_K_M raised perplexity from 6.23 (FP16) to 6.41, an increase of about 0.18, or 2.8% ([llama.cpp pull request #7412](https://github.com/ggerganov/llama.cpp/pull/7412)).

Perplexity is not the same as accuracy on your own tasks, and the effect depends on the model. Smaller models are commonly reported to lose more from quantization than larger ones, so test the format on your own workload before committing.

## Memory Bandwidth and Token Speed

Token generation speed is usually limited by memory bandwidth, because the GPU has to read the model weights from memory for every token. A smaller file means less to read, so **Q4_K_M** is generally faster than **Q8_0**.

How much faster? In llama.cpp's table for Llama 3.1 8B, text generation ran at 71.93 tokens per second with Q4_K_M and 50.93 with Q8_0. That is about **1.4 times** faster, even though the Q8_0 file is about 1.7 times larger. Those speeds come from llama.cpp's own test machine, so yours will differ, but the gain in that test was smaller than the size ratio.

* On an RTX 4070 (504 GB/s bandwidth), the theoretical ceiling is about 59 tokens per second for Q8_0 and 102 for Q4_K_M (bandwidth divided by file size in decimal GB). Real speeds are lower, as in llama.cpp's table.

## Final Verdict

* **Choose Q8_0 if:** You are running smaller models and have the VRAM to spare. An 8B model needs 9.8 GB at 8K context, which fits a 12GB RTX 3060. Small models are commonly reported to suffer more from quantization loss.
* **Choose Q4_K_M if:** You are deploying large models (32B to 70B parameters). The VRAM savings are large: the Llama 3.1 70B file is 39.6 GB in Q4_K_M against 69.8 GB in Q8_0, about 30 GB less. Token speed also improves, about 1.4 times in llama.cpp's 8B test. Check the quality cost on your own tasks.

Not sure what fits your card? The [matchmaker](/matchmaker) lists every synced model that fits your GPU memory, system RAM and context length. For a worked example of a model that does not fit, read [why 24GB of VRAM isn't enough for a 32B model](/posts/why-your-24gb-vram-isnt-enough).

## Sources

* [llama.cpp quantization README](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md): bits per weight, file size and generation speed for Llama 3.1 8B.
* [llama.cpp pull request #7412](https://github.com/ggerganov/llama.cpp/pull/7412): perplexity measured for quantized weights and KV caches.
* [RTX 4070 and RTX 4070 Ti specs (Guru3D)](https://www.guru3d.com/news-story/nvidia-geforce-rtx-4070-and-rtx-4070-ti-specs-get-detailed.html): the 504 GB/s memory bandwidth.