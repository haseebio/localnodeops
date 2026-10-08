---
title: "RTX 5090 32GB"
category: "GPU"
metricLabel: "Tokens/sec (Qwen3 32B, Q4_K_M)"
metricValue: "61"
status: "estimated"
summary: "32GB GDDR7 at 1,792 GB/s bandwidth. Fits 32B-class Q4 models fully on the GPU; a 70B at Q4 still needs CPU offload."
publishedAt: 2026-01-15
vramGB: 32
---

The RTX 5090 launched in January 2025 as NVIDIA's Blackwell-generation
flagship, with 32GB of GDDR7 VRAM on a 512-bit memory bus, a meaningful
jump from the RTX 4090's 24GB. Memory bandwidth reaches 1,792 GB/s, roughly
a 78% increase over the 4090's ~1,008 GB/s, at a 575W total board power
draw.

## Why 32GB matters for local inference

A 70B model at Q4_K_M quantization needs roughly 40GB for weights alone
(the Llama 3.1 70B Q4_K_M file is 39.6 GB), so it does not fit in 32GB.
Running it means offloading part of the model to system RAM, which is much
slower than keeping everything on the GPU.

What 32GB changes is the 30B class. By this site's formula, a 32B model
with an 18.49 GB Q4_K_M file needs about 29.1 GB at 32K context (FP16 KV
cache), so it fits on a 32GB card. At 64K context it needs about 37.9 GB
and does not. Models of 30B and under run entirely on the GPU with room for
long context, where the previous 24GB generation was context-constrained.

## Bandwidth, not just capacity

Inference throughput is memory-bandwidth-bound at typical batch sizes.
The 5090's 1,792 GB/s is the more consequential upgrade over the 4090 for
token generation speed. The extra 8GB of capacity mostly changes what
fits, while the bandwidth increase changes how fast it runs once it does.

## Where the 61 tokens/sec comes from

The figure is a third-party measurement, not a LocalNodeOps test. A
[llama.cpp benchmark published in 2025](https://www.hardware-corner.net/rtx-5090-llm-benchmarks/)
ran the dense Qwen3 32B model at Q4_K_M (an 18.64 GiB model) on an RTX 5090
and reported about 61 tokens/sec at 4K context. Real speed depends on the
driver, the llama.cpp build, the context length and the settings, and newer
builds may differ.

## Known limitation

The 61 tokens/sec figure comes from a dense 32B model of about the same size
as the 32B files used elsewhere on this site, not those exact files. It has
not been reproduced on LocalNodeOps hardware, so this entry keeps the
"estimated" label. See [/methodology](/methodology) for what that means on
this site.