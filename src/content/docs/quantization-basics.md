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
the model's architecture or capabilities, only the numeric precision
each weight is stored at.

## The formats you'll actually encounter

**GGUF** — the format used by `llama.cpp` and Ollama. Supports a range
of quantization levels from Q2 (aggressive, noticeable quality loss)
through Q8_0 (close to FP16 quality) via k-quant variants (`Q4_K_M`,
`Q5_K_S`, etc.) that allocate bits unevenly across layers based on
sensitivity, rather than uniformly. Runs on both CPU and GPU. Broadest
tooling support for local single-user inference.

**AWQ** — Activation-aware Weight Quantization. Identifies which
weight channels matter most by observing activations on a calibration
dataset, then protects those channels during quantization. Typically
faster GPU inference than an equivalent-bit-width GGUF model on
serving frameworks like vLLM, but GPU-only — limited or no CPU
inference support depending on the framework.

**GPTQ** — an earlier post-training quantization method, largely
superseded by AWQ for new deployments but still common in
already-published model repos. GPU-only, similar tooling profile to
AWQ.

## Choosing a quantization level

| Level | Bits/weight (approx) | When to use it |
|---|---|---|
| Q8_0 / 8-bit | ~8.5 | Quality-sensitive tasks, VRAM isn't the constraint |
| Q5_K_M | ~5.5 | Middle ground, noticeable VRAM savings vs Q8 |
| Q4_K_M | ~4.83 | Default choice for most consumer hardware |
| Q3_K_M | ~3.9 | VRAM-constrained, expect noticeable quality loss |

For models under ~7B parameters, quantization error is proportionally
larger relative to the model's total capacity — favor Q5_K_M or higher
if quality is distinguishable in your use case. For 30B+ models,
Q4_K_M's error becomes less noticeable and is a reasonable default.

## Verifying quality loss for your specific model

Published perplexity deltas for one model don't transfer exactly to a
different architecture or fine-tune. If quality matters for your use
case, measure it directly:

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