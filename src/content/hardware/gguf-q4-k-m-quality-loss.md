---
title: "GGUF Q4_K_M"
category: "Quantization"
metricLabel: "Perplexity delta vs FP16"
metricValue: "+0.31"
status: "estimated"
summary: "The sweet spot for most consumer GPUs — minimal quality loss, roughly 4x size reduction."
publishedAt: 2026-07-15
---

Q4_K_M uses ~4.83 bits per weight on average — not a flat 4 bits. The
"K_M" suffix denotes k-quant medium: a mixed-precision scheme that
allocates more bits to weights identified as more sensitive to
quantization error (typically attention output projections and certain
FFN layers) and fewer bits elsewhere, rather than quantizing uniformly.
This is why Q4_K_M consistently outperforms naive 4-bit quantization at
nearly the same file size.

## Size math

For a 7B parameter model: 7 × 10⁹ params × 4.83 bits ÷ 8 bits/byte ≈
4.23 GB, before GGUF container overhead (typically a few hundred MB for
tokenizer data and metadata). Compare against FP16 at 7 × 10⁹ × 2 bytes
= 14 GB — roughly a 3.3x reduction, not a full 4x, because of the K_M
scheme's mixed bit allocation pushing the average above 4 bits flat.

## When Q4_K_M is the wrong choice

For models under ~7B parameters, quantization error compounds more
noticeably relative to the model's total capacity — Q5_K_M or Q6_K is
worth the extra VRAM cost on smaller models if quality is
distinguishable in your use case. For models over 30B, Q4_K_M's error
becomes proportionally less noticeable, and it's a reasonable default
without needing to step up in precision.

## Verifying quantization quality yourself

```bash
./llama-perplexity \
  -m ./models/model.Q4_K_M.gguf \
  -f ./wikitext-2-raw/wiki.test.raw
```

Run this against both the FP16 source and the quantized GGUF to get a
real perplexity delta for your specific model — published deltas for
one model architecture don't transfer exactly to a different
architecture or fine-tune, since quantization sensitivity varies by
how weights are distributed after training.