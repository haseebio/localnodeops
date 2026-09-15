---
title: "Ryzen 9 7950X"
category: "CPU"
metricLabel: "Tokens/sec (Mistral 7B, Q4, CPU-only)"
metricValue: "6.4"
status: "estimated"
summary: "Usable CPU-only fallback for 7B models when GPU offload isn't available."
publishedAt: 2026-07-28
---

CPU-only inference is bandwidth-bound against system RAM, not compute-bound
against the CPU cores — this is the single most important fact for
setting expectations here. The 7950X's AVX-512 support (via double
pumping on Zen 4) helps llama.cpp's quantized matmul kernels, but
dual-channel DDR5 system memory bandwidth (see the
[DDR5-6000 entry](/hardware/ddr5-6000-dual-channel)) is the ceiling,
not core count or clock speed.

## Why CPU-only is a fallback, not a strategy

A 7B model at Q4_K_M needs roughly 4.5GB of memory bandwidth traversal
per token generated (the full quantized weight set is read from memory
for each token in naive autoregressive decoding). At ~96 GB/s
dual-channel DDR5-6000 bandwidth, that puts a hard ceiling on
tokens/sec regardless of CPU compute headroom — this is why CPU
inference plateaus well below what core count would suggest, and why
adding CPU cores past what's needed to saturate memory bandwidth
doesn't improve throughput.

## Thread count configuration

```bash
./llama-server \
  -m ./models/mistral-7b-instruct.Q4_K_M.gguf \
  --threads 16 \
  --ctx-size 4096
```

`--threads 16` (the 7950X's full core count) is a reasonable default,
but past the point of saturating memory bandwidth, additional threads
provide no further speedup and can add scheduling overhead. If
tokens/sec doesn't scale with thread count past 8-10 threads, that's
memory bandwidth saturation, not a misconfiguration.

## When this makes sense

CPU-only inference on this class of hardware is a fallback for systems
without a discrete GPU with enough VRAM, or for testing/development
where throughput isn't the priority — not a path to competitive
tokens/sec versus even a mid-range GPU. Hybrid CPU/GPU offload (partial
`--n-gpu-layers` on a GPU-equipped system) is almost always the better
option when any GPU with meaningful VRAM is available.