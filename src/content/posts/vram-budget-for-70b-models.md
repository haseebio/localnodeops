---
title: "How to budget VRAM for a 70B model"
excerpt: "A walkthrough of how quantization level, context length, and batch size trade off against the VRAM you actually have."
category: "Guides"
pubDate: 2026-08-20
author: "LocalNodeOps Editorial"
tags: ["vram", "quantization", "70b"]
readingTime: 7
faq:
  - question: "Can I run a 70B model on a single 24GB GPU?"
    answer: "Not fully on-GPU at Q4 or higher — weights alone need roughly 40GB at Q4_K_M. You can run it with partial CPU offload (llama.cpp's --n-gpu-layers), but expect a significant speed drop, or use a much lower quantization (Q2/IQ2) that trades quality for fitting more layers on-GPU."
  - question: "What's the single biggest lever for fitting a 70B model into less VRAM?"
    answer: "Quantization level, by a wide margin. Dropping from Q8_0 to Q4_K_M roughly halves weight size; dropping further to IQ2/IQ3 nearly halves it again. Context length matters too, but weight size is the larger and more controllable factor for a 70B model specifically."
---

A 70B parameter model is a different budgeting problem than an 8B or 13B model — at this size, weight size alone competes directly with your GPU's entire VRAM budget, and every other cost (KV cache, runtime overhead) has to fit in whatever's left over.

## Start with the weights, not the parameter count

"70B parameters" tells you almost nothing about VRAM until you know the quantization. At FP16, a 70B model's weights alone need roughly 140GB — completely impractical for consumer hardware. The quantization level is what actually determines whether this is feasible:

| Quantization | Approx. bits/weight | Approx. weight size (70B) |
| --- | --- | --- |
| FP16 | 16 | ~140 GB |
| Q8_0 | 8.5 | ~74 GB |
| Q5_K_M | ~5.7 | ~50 GB |
| Q4_K_M | ~4.83 | ~42 GB |
| IQ3_XS | ~3.3 | ~29 GB |
| IQ2_M | ~2.5 | ~22 GB |

These are approximate — exact sizes depend on the specific GGUF build, since different quantization methods (K-quants vs I-quants) pack bits differently even at similar nominal bit-widths. Always check the actual synced file size for the model you're using rather than these round numbers; this site's [per-model calculator pages](/calculator) pull exact `.gguf` sizes directly from Hugging Face.

## Where the rest of your VRAM goes

Once weights are loaded, the same three-part formula this site uses everywhere applies: **total VRAM = weights + KV cache + 10% runtime overhead** (see [/methodology](/methodology) for the exact KV cache formula). At 70B scale, KV cache is not a rounding error — a 70B model at a long context window can add several gigabytes on top of weights, and the 10% overhead on a 42GB Q4_K_M load is itself over 4GB.

This is why "the file is 42GB and my card has 48GB" doesn't leave nearly as much headroom as it looks like on paper.

## Realistic configurations by VRAM tier

**24GB (RTX 3090/4090):** A full-precision 70B doesn't fit without heavy CPU offload, which drops generation speed substantially — DDR5 system RAM bandwidth (roughly 60-80 GB/s) is far below a modern GPU's VRAM bandwidth (roughly 1,000 GB/s), so every offloaded layer becomes the bottleneck. IQ2/IQ3 quantizations can fit fully on-GPU, but at a real quality cost — this is the tier where you should seriously consider whether a smaller, higher-quantization model (a 30B-ish model at Q5/Q6) outperforms a heavily-quantized 70B for your actual use case.

**48GB (dual 3090/4090):** Q4_K_M fits with real headroom for a moderate context window. This is the more comfortable 70B tier for consumer hardware — see the [RTX 4090 hardware page](/hardware) for what a single-card configuration handles, and note that dual-GPU setups require your inference server to support tensor or layer splitting across devices, which not every runner does equally well.

**80GB+ (A100, H100, or similar):** Q8_0 or even FP16 becomes realistic with substantial context headroom, though this tier is outside typical consumer/prosumer budgets.

## The practical takeaway

For a 70B model specifically, decide your quantization level first, then check whether the resulting weight size plus a realistic KV cache estimate actually fits your card — don't reason from "my card has X GB" backward. Use the [VRAM calculator](/calculator) with your target model and context length before committing to a download; a 70B GGUF at the wrong quantization is a multi-hour download you may not be able to use.