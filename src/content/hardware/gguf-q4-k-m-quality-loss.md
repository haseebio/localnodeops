---
title: "GGUF Q4_K_M"
category: "Quantization"
metricLabel: "Perplexity delta vs FP16 (Llama 3 8B)"
metricValue: "+0.18"
status: "estimated"
summary: "A common default for consumer GPUs: about 3.3x smaller than FP16 on Llama 3 8B, for a small perplexity increase."
publishedAt: 2026-07-15
---

Q4_K_M averages about 4.9 bits per weight, not a flat 4 bits. llama.cpp
measures 4.89 bits per weight for it on Llama 3.1 8B. The "K_M" suffix
means k-quant medium: a mixed scheme where most tensors use 4-bit blocks and
a subset of the more sensitive tensors are stored at a wider 6-bit type,
rather than quantizing everything uniformly.

## Size math

File size is roughly parameters × bits per weight ÷ 8. For Llama 3.1 8B, the
Q4_K_M file is 4.58 GiB, against about 15 GiB for FP16, so about 3.3x
smaller, not 4x. The calculator's generic estimate uses 4.83 bits per weight,
about 1% below that measurement, so generic sizes can run slightly low; model
pages with synced file sizes use the exact numbers.

## When Q4_K_M is the wrong choice

Stepping up costs some memory but cuts the quality loss a lot. llama.cpp's own
quantize table for Llama 3 8B lists the perplexity increase over FP16 as
+0.1754 for Q4_K_M (4.58 GiB), +0.0569 for Q5_K_M (5.33 GiB) and +0.0217 for
Q6_K (6.14 GiB). If you have the VRAM to spare and quality matters, Q5_K_M or
Q6_K is worth considering, especially on smaller models. Larger models are
generally reported to tolerate 4-bit quantization better, but test on your own
workload.

## Verifying quantization quality yourself

```bash
./llama-perplexity \
  -m ./models/model.Q4_K_M.gguf \
  -f ./wikitext-2-raw/wiki.test.raw
```

Run this against both the FP16 source and the quantized GGUF to get a real
perplexity delta for your specific model. Published deltas for one model
architecture don't transfer exactly to a different architecture or fine-tune.

## Where the +0.18 comes from

The figure is a third-party measurement, not a LocalNodeOps test. It is the
Q4_K_M row of the table printed by `llama-quantize --help`, for Llama 3 8B,
rounded from +0.1754. A separate llama.cpp measurement of the same model lists
6.2331 for FP16 and 6.3830 for Q4_K_M, a difference of +0.15, so the exact
delta depends on the run settings. These perplexity numbers are not directly
comparable to the AWQ entry, which comes from a different test setup.

## Known limitation

The figure has not been reproduced on LocalNodeOps hardware, so this entry
keeps the "estimated" label. See [/methodology](/methodology) for what that
means on this site.