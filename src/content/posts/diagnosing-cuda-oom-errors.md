---
title: "Diagnosing CUDA out-of-memory errors"
excerpt: "The five most common causes of CUDA OOM during local inference, and how to tell them apart."
category: "Troubleshooting"
pubDate: 2026-08-02
author: "LocalNodeOps Editorial"
tags: ["cuda", "troubleshooting", "oom"]
readingTime: 5
faq:
  - question: "What's the fastest way to check if it's a CUDA OOM error?"
    answer: "Look for CUDA_ERROR_OUT_OF_MEMORY or 'CUDA out of memory' in the traceback — it's usually explicit rather than a silent failure. Running nvidia-smi right before the crash also shows how much VRAM was already in use."
  - question: "Does lowering context length always fix CUDA OOM?"
    answer: "Often, but not always — check batch size and quantization level first, since either can matter more depending on your setup. If weights alone already exceed your VRAM, no context length reduction will fix it."
---

CUDA out-of-memory errors have a small number of real root causes, even though the error message itself is always the same generic "not enough VRAM." This is a quick reference for telling them apart before reaching for a fix.

## 1. Weights alone exceed VRAM

The simplest case: the model's weight size at your chosen quantization is larger than your GPU's total VRAM, with no context or overhead needed to explain it. Check the exact synced weight size on this site's [per-model calculator pages](/calculator) — if that number alone exceeds your card's VRAM, no other tuning will fix it; you need a smaller model or a lower quantization.

## 2. Weights fit, but KV cache pushes past the limit

This is the case covered in depth in [Why Your 24GB VRAM Isn't Enough](/posts/why-your-24gb-vram-isnt-enough) — weights fit comfortably, but a long context window's KV cache, plus the ~10% runtime overhead this site's formula accounts for, pushes the total past your card's limit. The fix here is context length reduction, KV cache quantization (`--cache-type-k q8_0 --cache-type-v q8_0` in llama.cpp), or both.

## 3. Something else is already using VRAM

Before assuming the model itself is the problem, run `nvidia-smi` and check what's already allocated. A desktop environment, a second inference process, a browser with hardware acceleration, or a previous model instance that didn't fully unload can all eat into VRAM you assumed was free. This is a common false alarm — the model and settings may be entirely fine once the actual available VRAM is confirmed.

## 4. Batch size multiplies the problem

If you're serving multiple concurrent requests, KV cache and activation memory scale with batch size, not just context length. A configuration that works fine for one request at a time can OOM under concurrent load. If you're running a server (llama-server, vLLM) rather than a single interactive session, check your batch size / concurrent-request settings before assuming the per-request math is wrong.

## 5. Fragmentation on long-running sessions

Less common, but real: on servers that stay up for a long time and handle many requests with varying context lengths, CUDA memory can fragment — enough total VRAM is technically free, but not in one contiguous block large enough for a new allocation. This usually shows up as OOM errors that seem to happen "randomly" rather than consistently at the same model/context configuration. Restarting the server process is the usual short-term fix; some runners have memory pool settings that reduce fragmentation over long uptimes.

## Working through it in order

Check weights-alone first (#1), since it rules out everything else immediately if true. Then check `nvidia-smi` for other VRAM usage (#3) before adjusting your own configuration — no sense tuning context length if a stale process is holding 6GB you thought was free. If those two are clean, the [VRAM calculator](/calculator) will tell you whether your specific model, quantization, and context length combination should fit at all — if the calculator says it fits but you're still OOMing, that's a sign of #4 or #5 rather than a sizing problem.