---
title: "Ryzen 9 7950X"
category: "CPU"
metricLabel: "Tokens/sec (Llama 2 7B, Q4_0, CPU-only)"
metricValue: "16"
status: "estimated"
summary: "A CPU-only fallback for 7B models. Memory bandwidth, not core count, sets the speed."
publishedAt: 2026-07-28
---

CPU-only inference is limited by system RAM bandwidth, not by the CPU
cores. Every generated token reads the whole quantized model from memory,
so dual-channel DDR5 bandwidth (see the
[DDR5-6000 entry](/hardware/ddr5-6000-dual-channel)) is the ceiling, not
core count or clock speed.

## Why CPU-only is a fallback, not a strategy

A 7B model at Q4_K_M is roughly 4.4 to 4.9 GB (the Llama 3.1 8B file is
4.58 GiB), and standard autoregressive decoding reads all of those weights
for every token. The DDR5-6000 entry gives a theoretical peak of 96 GB/s, but
a CPU rarely reaches it. As a rough check, a public llama.cpp result of
about 16 tokens/sec on a 3.56 GiB (about 3.8 GB) 7B Q4_0 file implies about
60 GB/s of effective bandwidth (16.4 × 3.8 is about 62). That is arithmetic
on one result, not a bandwidth measurement. It is also why adding cores
past the point where memory is saturated does not improve throughput.

## Thread count configuration

```bash
./llama-server \
  -m ./models/your-7b-model-Q4_K_M.gguf \
  --threads 16 \
  --ctx-size 4096
```

`--threads 16` matches the 7950X's 16 physical cores and is a reasonable
starting point. Speed often stops scaling well before the thread count
reaches the core count, and results differ between systems, so try a few
values. One user report measured only about 7 tokens/sec on a 7950X with 32
threads in a desktop app, with the CPU well below full load, so settings
and software matter. llama.cpp ships a `llama-bench` tool for comparing
settings.

## Where the 16 tokens/sec comes from

The figure is a third-party measurement, not a LocalNodeOps test.
[Public benchmark results](https://openbenchmarking.org/test/pts/llama-cpp&eval=6ec440762e0ebc1af4c8a53ca2fae5a7403dd9fd)
for a Ryzen 9 7950X average about 16.4 tokens/sec for llama-2-7b at Q4_0 on
an older llama.cpp build (b1808), across 9 results. An early llama.cpp test
of 7B Q4_K_M on the same CPU at 4 threads measured 71 ms per token, about 14
tokens/sec. Newer builds, faster memory and different thread counts will
change these numbers.

## When this makes sense

CPU-only inference on this class of hardware is a fallback for systems
without a discrete GPU with enough VRAM, or for testing and development where
throughput isn't the priority. It is not a path to competitive tokens/sec
versus even a mid-range GPU. Hybrid CPU/GPU offload (partial
`--n-gpu-layers` on a GPU-equipped system) is almost always the better
option when any GPU with meaningful VRAM is available.

## Known limitation

The 16 tokens/sec figure is for a Llama 2 7B file at Q4_0, not for Mistral 7B
at Q4_K_M, and has not been reproduced on LocalNodeOps hardware, so this
entry keeps the "estimated" label. See [/methodology](/methodology) for what
that means on this site.