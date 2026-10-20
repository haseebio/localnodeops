---
title: "DDR5-6000 Dual Channel"
seoTitle: "DDR5-6000 Dual Channel Bandwidth: 96 GB/s"
category: "Memory"
metricLabel: "Theoretical peak bandwidth"
metricValue: "96 GB/s"
status: "estimated"
summary: "Theoretical peak for dual-channel DDR5-6000. Real sustained bandwidth is lower, and it sets the speed of any model layers that run from system RAM."
publishedAt: 2026-07-20
---

DDR5-6000 in a dual-channel configuration has a theoretical maximum of
96 GB/s (6000 MT/s × 8 bytes × 2 channels = 96,000 MB/s). Real sustained
bandwidth is lower and depends on the CPU, the memory controller and the
settings. One indirect data point: a public llama.cpp result on a Ryzen 9
7950X implies about 60 GB/s of effective bandwidth during token generation
(see the [Ryzen 9 7950X entry](/hardware/ryzen-9-7950x-cpu-inference)). That
is arithmetic on one benchmark whose memory speed is not stated, not a
measurement of DDR5-6000.

## Why this matters for hybrid offload

When running `llama.cpp` with partial GPU offload (`--n-gpu-layers` less than
the full layer count), the layers left on the CPU are bound by system memory
bandwidth, not GPU VRAM bandwidth. A 70B Q4_K_M model (a 39.6 GB file) with
roughly half its layers on a 24GB GPU still bottlenecks on system RAM for the
CPU-resident half. Overall tokens/sec is limited by the slower half, and
system RAM is almost always slower than GPU VRAM, which runs from about 288
GB/s on a mid-range card to about 1,008 GB/s on an RTX 4090.

## Single vs. dual channel: verify this, don't assume it

A common, easy-to-miss misconfiguration: motherboards and RAM kits don't
always default to dual-channel operation, depending on DIMM slot population.
Two sticks in the wrong slot pairing run as single-channel, which has half the
theoretical bandwidth (about 48 GB/s), silently halving CPU-side inference
throughput with no error message anywhere.

```bash
# Linux: list the populated DIMM slots and their sizes
sudo dmidecode --type memory | grep -A2 "Locator:"
```

This shows which slots are populated, not the channel mode itself. Compare it
with your motherboard manual's DIMM pairing guidance. On Windows, the Memory
tab of a tool such as CPU-Z typically shows the channel mode directly.

## Upgrade path

DDR5-8000 dual-channel kits have a theoretical bandwidth of 128 GB/s
(8000 × 16 bytes), but CPU memory controller support and motherboard QVL
(qualified vendor list) compatibility become real constraints at those speeds.
Verify CPU and motherboard support before purchasing memory faster than what
is officially validated for the platform.

## Known limitation

The 96 GB/s figure is a calculation of the theoretical peak, not a measured
result, which is why this entry keeps the "estimated" label. See
[/methodology](/methodology) for what that means on this site.