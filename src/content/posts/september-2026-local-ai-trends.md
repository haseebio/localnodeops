---
title: "Local LLM Trends: MoE Models and the KV Cache Problem"
excerpt: "Why KV cache size, not parameter count, decides which new MoE models fit a 16GB or 24GB GPU. Real GGUF sizes and the math behind each result."
category: "Analysis"
pubDate: 2026-09-27
author: "Haseeb"
tags: ["MoE", "KV cache", "VRAM", "Quantization", "Qwen3"]
readingTime: 4
---

Many of the strongest open-weight models you can run at home are now mixture-of-experts (MoE) models. They advertise small "active" parameter counts, but that number does not tell you how much VRAM you need. This post shows what actually decides whether a model fits your GPU.

## Active Parameters Do Not Shrink Your VRAM Bill

An MoE model only uses a few experts per token, but every expert must stay loaded in memory. The weights you need in VRAM are the full file size. Speed improves, memory does not.

The part that varies is the KV cache, the memory that stores your conversation. It depends on the model's attention design, not on its parameter count.

## Same Size Class, Very Different Memory Cost

Numbers below use the real Q4_K_M file from the LocalNodeOps database and the standard formula: total = weights + KV cache + 10% overhead. These are **mathematical estimates**, not benchmarks.

| Model | Q4_K_M file | KV cache at 8K | Total at 8K | KV cache at 32K | Total at 32K |
| :--- | :--- | :--- | :--- | :--- | :--- |
| gpt-oss 20b | 10.83 GB | 0.19 GB | ~12.1 GB | 0.75 GB | ~12.7 GB |
| Gemma 4 26B A4B | 15.87 GB | 0.35 GB | ~17.8 GB | 0.82 GB | ~18.4 GB |
| Qwen3-Coder 30B | 17.28 GB | 0.75 GB | ~19.8 GB | 3.00 GB | ~22.3 GB |
| GLM-4.7-Flash | 17.05 GB | 7.34 GB | ~26.8 GB | 29.38 GB | ~51.1 GB |
| R1-Distill-Qwen-32B (dense) | 18.49 GB | 2.00 GB | ~22.5 GB | 8.00 GB | ~29.1 GB |

What the table shows:

* **gpt-oss 20b and Gemma 4 26B A4B** use sliding-window attention in most layers, so their KV cache grows slowly. Both stay small even at 32K context.
* **Qwen3-Coder 30B** has a normal, grouped KV cache. It fits a 24GB card at 32K, but only just.
* **GLM-4.7-Flash** is the warning case. It has about the same file size as Qwen3-Coder, but it uses full multi-head attention, so its KV cache is ten times larger. At 8K context it already needs more than a 24GB card.

Two models with the same file size can need very different GPUs. Always check the model's own calculator page before you download it.

## Context Length Sets Your Memory Bill at Startup

Both llama.cpp and vLLM reserve KV cache memory for your full context window when the model loads. llama.cpp allocates the whole cache for the context you set. vLLM sizes a block pool from a fixed share of VRAM (90% by default). So an out-of-memory error shows up at startup, not halfway through a chat. Two ways to buy back memory:

* **Lower the context window.** This is free and works first.
* **Quantize the KV cache to 8-bit.** This roughly halves the KV part of the total, with some quality cost. It cannot rescue a model whose weights alone exceed your VRAM.

## A Benchmark Baseline, Not Breaking News

DeepSeek-R1-Distill-Qwen-32B was released in January 2025. DeepSeek reported 72.6% pass@1 on AIME 2024 for it. That figure is a useful baseline for judging newer reasoning models, but it is more than a year old, and benchmark setups differ between labs. Treat any comparison as indicative, not exact.

## Check Your Own Hardware

Open the [VRAM Calculator](/calculator) and pick your model, quantization and context length. If it does not fit, you can rent a GPU by the hour on [RunPod](https://www.runpod.io/?ref=localnodeops) or set up your own server with the [LocalNodeOps Docker Stack](/docker-stack).