---
title: "Diagnosing and Fixing CUDA Out of Memory (OOM) Errors"
description: "Stop your local LLMs from crashing. Learn how to calculate KV cache, adjust quantization, and fix CUDA OOM errors permanently."
excerpt: "Stop your local LLMs from crashing. Learn how to calculate KV cache, adjust quantization, and fix CUDA OOM errors permanently."
sidebarPosition: 2
version: "1.0"
category: "Guides"
pubDate: 2026-09-25
author: "Haseeb"
tags: ["CUDA", "OOM", "VRAM", "Troubleshooting", "Local LLM"]
readingTime: 5
faq:
  - question: "Why do I get a CUDA Out of Memory error when chatting?"
    answer: "This usually happens because the KV cache (memory used to store conversation history) expands beyond your GPU's available VRAM as the context window grows, pushing the total memory usage over the limit."
  - question: "How can I fix an OOM error without buying a new GPU?"
    answer: "You can reduce your model's context window in your inference engine, drop to a lower quantization (like from Q4_K_M to IQ3), or offload some layers to your CPU."
---
If you are running local Large Language Models, you will eventually see the dreaded `RuntimeError: CUDA out of memory`. It kills your server, dumps your chat history, and forces a hard restart.

An OOM (Out of Memory) crash happens when your inference engine tries to allocate VRAM that your GPU simply doesn't have. But why does it happen mid-conversation when the model loaded fine initially? Let's diagnose the root causes and fix them.

## The Silent Killer: KV Cache Expansion

The most common reason models crash *after* a few prompts is the **KV (Key-Value) Cache**. 

When you load a model, the weights take up a static amount of VRAM. However, as you chat or process large documents, the context window grows. The inference engine must store this context in the KV cache, which grows linearly. If you don't account for this dynamically expanding cache, you will OOM as soon as the conversation gets deep.

**The Fix:** Always calculate VRAM using our **10% runtime overhead formula**. If you have a 24GB card and your model weights are 22.8GB, it might load, but it *will* crash during inference. Check your specific model on our [VRAM Calculator](/calculator) to find your maximum safe context size.

## Step-by-Step OOM Solutions

If you are constantly hitting the VRAM ceiling, try these solutions in order:

### 1. Hard-Cap Your Context Window
If you are using Ollama, text-generation-webui, or LM Studio, your default context size might be set to 8k or 16k. If you only need it for coding snippets, restrict your max context to `4096` or `8192`.
* *In Ollama:* Add `PARAMETER num_ctx 4096` to your Modelfile.

### 2. Drop the Quantization Tier
If you are running a `Q5_K_M` or `Q4_K_M` GGUF model and running out of space, drop down to an `IQ3_M` or `IQ3_S` tier. The degradation in reasoning is minimal, but it can shave 2–3 GB off the model size, freeing up enough space for your KV cache.

### 3. CPU Offloading
If you absolutely must run a larger model (like Llama-3 70B on a 24GB card), you cannot keep it purely in VRAM. You must offload layers to your system RAM.
*   **Trade-off:** Your generation speed (tokens per second) will drop significantly because system RAM is much slower than GPU VRAM. 

## When to Scale Your Hardware

Sometimes, the only fix for an OOM error is more memory. You can't fit a 70B parameter model in 12GB of VRAM no matter how much you optimize.

*   **Temporary Cloud Scaling:** If you just need to run a massive model for a weekend project, don't buy new hardware. Spin up a multi-GPU instance on **[RunPod (affiliate link)](https://www.runpod.io/?ref=9k9rtpui)** for a few cents an hour.
*   **Local Server Setup:** If you are expanding your physical hardware, ensure your software environment is optimized so OS background tasks aren't stealing your VRAM. Streamline your deployment using our optimized **[Docker Stack](/docs)**.

By respecting the 10% overhead rule and managing your context windows, you can eliminate CUDA OOM errors and keep your local nodes running 24/7.