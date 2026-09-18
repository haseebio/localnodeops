---
title: "RTX 5090 32GB"
category: "GPU"
metricLabel: "Tokens/sec (Llama 3 70B, Q4)"
metricValue: "24.7"
status: "estimated"
summary: "32GB GDDR7 at 1,792 GB/s bandwidth — the first consumer GPU able to hold a 70B model at Q4 fully on-GPU without CPU offload."
publishedAt: 2026-01-15
vramGB: 32
---

The RTX 5090 launched in January 2025 as NVIDIA's Blackwell-generation
flagship, with 32GB of GDDR7 VRAM on a 512-bit memory bus — a meaningful
jump from the RTX 4090's 24GB. Memory bandwidth reaches 1,792 GB/s, roughly
a 78% increase over the 4090's ~1,008 GB/s, at a 575W total board power
draw.

## Why 32GB matters for local inference

A 70B model at Q4_K_M quantization needs roughly 40GB for weights alone —
still more than 32GB can hold outright. But 32GB is enough to fully load
smaller 70B-adjacent quantizations with meaningful context headroom, and
comfortably runs 30B-and-under models entirely on-GPU with room for long
context windows, where the previous 24GB generation was context-constrained.

## Bandwidth, not just capacity

Inference throughput is memory-bandwidth-bound at typical batch sizes.
The 5090's 1,792 GB/s is the more consequential upgrade over the 4090 for
token generation speed — the extra 8GB of capacity mostly changes what
fits, while the bandwidth increase changes how fast it runs once it does.

## Known limitation

This benchmark figure is estimated from published specifications and
architectural reasoning — not yet measured on physical hardware. See
[/methodology](/methodology) for what "estimated" means on this site.