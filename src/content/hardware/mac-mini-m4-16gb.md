---
title: "Mac Mini M4 16GB"
category: "GPU"
metricLabel: "Tokens/sec (Llama 3 8B, Q4)"
metricValue: "22.4"
status: "estimated"
summary: "16GB unified memory shared between CPU, GPU, and OS — realistic usable headroom for model inference is closer to 11-12GB, not the full 16GB."
publishedAt: 2026-01-20
---

The Mac Mini M4 uses Apple's unified memory architecture — a single pool
of RAM shared between the CPU, GPU, and the rest of the system, rather
than a discrete VRAM pool separate from system RAM the way NVIDIA/AMD
GPUs work.

## Why 16GB unified memory isn't the same as 16GB VRAM

This site's VRAM calculator and "fits on" comparisons are built around
discrete GPU VRAM, where the number on the box is roughly what's
available for a model. Unified memory doesn't work that way: macOS
itself reserves a meaningful share of system memory for the OS,
background processes, and the GPU's own working set before an
application ever gets to use it. In practice, a 16GB M4 leaves
something in the neighborhood of 11-12GB realistically available for
model weights and KV cache combined — not the full 16GB.

This is also why this entry deliberately has no VRAM figure wired into
the site's "models that fit" comparisons: doing so would tell people a
model fits when it may not, risking swap thrashing or an outright OOM
crash rather than a clean failure.

## What actually fits

At roughly 11-12GB of realistic headroom, an 8B model at Q4 quantization
fits comfortably with room for a meaningful context window. Larger
models — 13B and up — get tight fast once KV cache is added, especially
at longer context lengths, since unified memory bandwidth (not just
capacity) is also lower than a discrete GPU's dedicated VRAM bandwidth.

## Known limitation

This benchmark figure is estimated from published specifications and
architectural reasoning, not measured on physical hardware. The
usable-memory estimate above is a rule of thumb, not a guarantee — actual
headroom varies with what else is running on the machine. See
[/methodology](/methodology) for how estimates work on this site.