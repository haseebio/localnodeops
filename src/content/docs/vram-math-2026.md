---
title: "VRAM Math: Sizing Hardware for Local LLMs"
description: "How LocalNodeOps estimates VRAM for local LLMs: weights, KV cache and 10% overhead, with a worked example for a 32B model on a 24GB GPU."
sidebarPosition: 4
version: "2.2.0"
---

Running out of VRAM (CUDA OOM) is the most common failure when running local models. This page shows the exact math LocalNodeOps uses, so you can check a model before you download it. The full formula reference is on the [methodology page](/methodology).

## The Formula

**Total VRAM = Weights + KV Cache + 10% Overhead**

The 10% is taken on top of weights plus KV cache combined. It covers the CUDA context and inference engine buffers (Ollama, llama.cpp).

### 1. Weights

Weights are the size of the model file loaded into memory. For GGUF models, use the real file size of the quantization you plan to download. The [calculator](/calculator) lists synced sizes for each model.

* *Example:* DeepSeek-R1-Distill-Qwen-32B at Q4_K_M is an 18.49 GB file.
### 2. KV Cache

Every token in the conversation is stored in the KV cache. It grows in a straight line with context length.

* *Example:* A dense 32B model with 64 layers, 8 KV heads and a head size of 128 uses 2.0 GB of KV cache at 8K context, 8.0 GB at 32K, and 16.0 GB at 64K (fp16 cache).
* Models differ a lot here. Mixture-of-experts and sliding-window models can use far less KV cache than their size suggests, so always check the model's own calculator page.

### 3. The 10% Overhead

Add 10% of (weights + KV cache). Skipping it is a common reason a model loads fine and then crashes mid-chat.

## Worked Example: 32B Model on a 24GB GPU

DeepSeek-R1-Distill-Qwen-32B at Q4_K_M, 8K context:

* **Weights:** 18.49 GB
* **KV cache (8K):** 2.00 GB
* **Base subtotal:** 20.49 GB
* **10% overhead:** 2.05 GB
* **Total required:** about 22.5 GB

That fits on a 24GB card (RTX 3090 or 4090) with roughly 1.5 GB to spare. Now raise the context:

| Context | KV cache | Total required | Fits 24GB? |
| :--- | :--- | :--- | :--- |
| 8K | 2.0 GB | ~22.5 GB | Yes, barely |
| 32K | 8.0 GB | ~29.1 GB | No |
| 64K | 16.0 GB | ~37.9 GB | No |

Weights stay fixed. The KV cache is what pushes you into an OOM error when you raise the context window.

## A Smaller Example: gpt-oss 20b

gpt-oss 20b at Q4_K_M is a 10.83 GB file. It is a mixture-of-experts model with sliding-window attention, so its KV cache stays small: about 0.2 GB at 8K and 1.5 GB at 64K. The total is roughly 12.1 GB at 8K and 13.6 GB at 64K, so it fits a 16GB card with room to spare.

## If Your Hardware Fails the Math

1. **Cut the context window.** This is the fastest fix and costs nothing.
2. **Use a smaller quantization.** A lower-bit file shrinks the weights.
3. **Rent a cloud GPU.** For heavy models, you can [spin up a RunPod instance](https://www.runpod.io/?ref=localnodeops) by the hour instead of buying hardware.
4. **Upgrade locally.** Browse [24GB graphics cards on Amazon](https://www.amazon.com/s?k=RTX+4090+24GB&tag=localnodeops-20).

***

*(The benchmarks and math formulas on this page are licensed under CC BY 4.0. The license covers benchmark and VRAM figures only. It excludes site code, branding, and the paid Docker Stack.)*