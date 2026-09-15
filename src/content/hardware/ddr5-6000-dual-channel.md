---
title: "DDR5-6000 Dual Channel"
category: "Memory"
metricLabel: "Bandwidth"
metricValue: "96 GB/s"
status: "estimated"
summary: "Minimum viable bandwidth for hybrid CPU/GPU offload setups without heavy bottlenecking."
publishedAt: 2026-07-20
---

DDR5-6000 in dual-channel configuration yields a theoretical maximum of
~96 GB/s (6000 MT/s × 8 bytes × 2 channels = 96,000 MB/s). Real-world
sustained bandwidth typically lands at 80-85% of theoretical peak due
to refresh overhead and access pattern inefficiency — expect ~78-82
GB/s achievable, not the full 96 GB/s, when benchmarking actual
inference workloads.

## Why this matters for hybrid offload

When running `llama.cpp` with partial GPU offload (`--n-gpu-layers`
less than the full layer count), the layers left on CPU are bound by
this system memory bandwidth figure, not GPU VRAM bandwidth. A 70B
model with half its layers offloaded to a 24GB GPU still bottlenecks
on system RAM bandwidth for the CPU-resident half — the overall
tokens/sec is limited by whichever half is slower, and system RAM
bandwidth is almost always the slower half compared to GPU VRAM
bandwidth (which typically runs 300 GB/s to 1TB/s+ depending on the
card).

## Single vs. dual channel — verify this, don't assume it

A common, easy-to-miss misconfiguration: motherboards and RAM kits
don't always default to dual-channel operation depending on DIMM slot
population. Running two sticks in the wrong slot pairing yields
single-channel operation at half the bandwidth (~48 GB/s), silently
halving CPU-side inference throughput with no error message anywhere.

```bash
# Linux: confirm channel configuration is actually dual-channel
sudo dmidecode --type memory | grep -A2 "Locator:"
```

Check your motherboard manual for the correct DIMM slot pairing before
assuming dual-channel is active just because two sticks are installed.

## Upgrade path

DDR5-8000 or higher dual-channel kits push theoretical bandwidth past
100 GB/s, but CPU memory controller support and motherboard QVL
(qualified vendor list) compatibility become real constraints at those
speeds — verify CPU and motherboard support before purchasing memory
faster than what's officially validated for the platform.