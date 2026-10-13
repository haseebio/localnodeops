---
title: "Quantization basics"
description: "What quantization is, the common formats (GGUF, AWQ, GPTQ), and how to pick one."
sidebarPosition: 2
version: "1.0"
---

## What quantization actually does

A model trained in FP16 or BF16 (16 bits per weight) can run at much
lower precision — typically 4-8 bits per weight — with a measurable but
often acceptable quality cost. Quantization reduces both the file size
on disk and the VRAM required to load the model; it does not change
the model's architecture, only the numeric precision each weight is
stored at.

## The formats you'll actually encounter

**GGUF** — the format used by `llama.cpp` and Ollama. Supports a range
of quantization levels from Q2 (aggressive, noticeable quality loss)
through Q8_0 (close to FP16 quality) via k-quant variants (`Q4_K_M`,
`Q5_K_S`, etc.) that use mixed precision across tensors, giving more bits
to the more sensitive ones instead of quantizing everything uniformly.
Runs on both CPU and GPU. Broadest tooling support for local single-user
inference.

**AWQ** — Activation-aware Weight Quantization. Uses activation
statistics from a small calibration dataset to find which weight
channels matter most, then protects those channels during quantization.
It is mainly used on GPU serving stacks such as vLLM, and has limited or
no CPU inference support depending on the framework. Its published
speedups are measured against FP16, so how it compares with GGUF on your
hardware depends on the engine and the GPU kernels. Benchmark your own
stack.

**GPTQ** — an earlier post-training quantization method that is still
common in published model repos. GPU-oriented, with a similar tooling
profile to AWQ.

## Choosing a quantization level

| Level | Bits/weight (approx) | When to use it |
|---|---|---|
| Q8_0 / 8-bit | ~8.5 | Quality-sensitive tasks, VRAM isn't the constraint |
| Q5_K_M | ~5.7 | Middle ground, noticeable VRAM savings vs Q8 |
| Q4_K_M | ~4.8 to 4.9 | Default choice for most consumer hardware |
| Q3_K_M | ~3.9 | VRAM-constrained, expect noticeable quality loss |

Bits per weight vary by model. llama.cpp measures 4.89 for Q4_K_M on
Llama 3.1 8B, while this site's generic estimates use 4.83. The Q5_K_M
figure comes from the ratio of llama.cpp's published file sizes for Llama 3 8B
(5.33 GiB against 4.58 GiB for Q4_K_M). The Q3_K_M figure has not been
re-checked.

For models under ~7B parameters, quantization error can be more noticeable
relative to the model's total capacity, so consider Q5_K_M or higher if
quality matters in your use case. Larger models (30B+) are generally reported
to tolerate Q4_K_M better, which makes it a reasonable default.

## Verifying quality loss for your specific model

Published perplexity deltas for one model don't transfer exactly to a
different architecture or fine-tune. For one example, the table printed by
`llama-quantize --help` lists the perplexity increase over FP16 on Llama 3 8B
as about +0.18 for Q4_K_M, +0.06 for Q5_K_M and +0.02 for Q6_K. If quality
matters for your use case, measure it directly:

```bash
./llama-perplexity \
  -m ./models/your-model.Q4_K_M.gguf \
  -f ./wikitext-2-raw/wiki.test.raw
```

Compare against the same command run on a higher-precision version of
the same model to get a real, model-specific delta rather than relying
on a generic published figure.

## Where the actual numbers live

Exact on-disk sizes for synced models are on this site's
[per-model calculator pages](/calculator) — those are measured file
sizes from Hugging Face, not estimates. See
[/methodology](/methodology) for what's exact vs. estimated across the
rest of this site's VRAM figures.