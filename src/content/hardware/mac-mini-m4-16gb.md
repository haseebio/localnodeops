---
title: "Mac Mini M4 16GB"
category: "GPU"
metricLabel: "Tokens/sec ceiling (Llama 3.1 8B, Q4_K_M)"
metricValue: "26"
status: "estimated"
summary: "16GB unified memory shared between CPU, GPU, and OS. By default macOS lets the GPU use about 75% of it (around 12GB), not the full 16GB."
publishedAt: 2026-01-20
---

The Mac Mini M4 uses Apple's unified memory architecture: a single pool
of RAM shared between the CPU, GPU, and the rest of the system, rather
than a separate VRAM pool the way discrete NVIDIA and AMD GPUs work.

## Why 16GB unified memory isn't the same as 16GB VRAM

On a discrete GPU, the number on the box is roughly what a model can use.
On Apple Silicon, macOS limits how much of the shared pool the GPU can
use. The default is about 75% of total memory (the exact share varies),
which is around 12GB on a 16GB Mac Mini. On macOS 14 or later, the
`sysctl iogpu.wired_limit_mb` setting can raise the limit, but memory has
to be left for macOS itself or the system can slow down badly or crash.

The VRAM calculator at [/hardware](/hardware) accounts for this. Under
"Your GPU", pick "Apple Silicon 16GB unified" and it compares your model
against the roughly 12GB the GPU can use by default. There is no system-RAM
offload tier, because there is no separate system RAM.

## What actually fits

An 8B model at Q4_K_M (the Llama 3.1 8B file is 4.58 GB) needs about 6.1 GB
at 8K context by this site's formula, so it fits with room to spare. A 13B
model at Q4 needs about 14.9 GB at 8K context by the generic estimate,
which is more than the 12GB default limit, so it does not fit without a
shorter context or a smaller quantization. Unified memory is also slower
than the dedicated memory on a high-end discrete GPU, which affects speed
as well as capacity.

## Where the 26 tokens/sec comes from

The figure is a theoretical ceiling, not a measurement. Generating each
token reads the whole model from memory, so the maximum speed is roughly
memory bandwidth divided by model size. The base M4 chip has 120 GB/s of
memory bandwidth and the Llama 3.1 8B Q4_K_M file is 4.58 GB, so 120 / 4.58
is about 26 tokens/sec. Real speeds are lower than the ceiling.

## Known limitation

This is a calculation, not a benchmark, and it has not been measured on
LocalNodeOps hardware, which is why the entry keeps the "estimated" label.
The 12GB figure is a default that varies by macOS version and settings, and
the memory actually available also depends on what else is running. See
[/methodology](/methodology) for what estimates mean on this site.