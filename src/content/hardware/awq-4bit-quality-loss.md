---
title: "AWQ 4-bit"
category: "Quantization"
metricLabel: "Perplexity delta vs FP16 (Llama 3 8B)"
metricValue: "+0.40"
status: "estimated"
summary: "GPU-focused 4-bit weight quantization. The perplexity cost varies by model, from about +0.07 to +0.40 in published tables."
publishedAt: 2026-07-10
---

AWQ (Activation-aware Weight Quantization) uses activation statistics from a
small calibration dataset to find the weight channels that matter most, then
protects them by scaling those channels before quantizing, while keeping the
weights in a uniform 4-bit format. GGUF's k-quants mainly choose bits by
tensor type rather than by activation statistics. llama.cpp's quantize tool
can also take an importance matrix (`--imatrix`) computed from calibration
data, so the difference between the two approaches is smaller than it once
was.

## What the published numbers show

The AWQ paper lists WikiText-2 perplexity for INT4 with group size 128. For
Llama-2 7B it is 5.47 for FP16 and 5.60 for AWQ (+0.13), for Llama-2 13B it
is 4.88 and 4.97, and for Llama-2 70B it is 3.32 and 3.41. A later paper's
table lists Llama 3 8B at 6.14 for FP16 and 6.54 for AWQ, a difference of
+0.40, and Mistral 7B at 5.25 and 5.37. The +0.40 shown on this card is the
Llama 3 8B result. These numbers are not directly comparable to the GGUF
entry, because they come from different test setups.

Note that "g128" means AWQ checkpoints use group-wise quantization with 128
weights per group, the same family of layout as many other 4-bit formats.

## Speed

The AWQ paper reports its speedups against FP16 inference, using its own
inference engine, not against GGUF. Real speed depends mostly on the GPU
kernels in the serving framework, so benchmark your own stack instead of
assuming one format is faster.

## The calibration dataset dependency

AWQ is a calibration-based method. Its authors report that it generalizes
across different domains and modalities, but perplexity on a benchmark and
quality on your own task don't always track each other, so test on your actual
workload.

## Practical trade-off vs GGUF

GGUF has broader tooling support (llama.cpp, Ollama, LM Studio) and runs on
CPU as well as GPU. AWQ is GPU-first. CPU inference support is limited or
absent depending on the serving framework, and AWQ is more commonly deployed
through GPU-serving stacks such as vLLM than through local single-user tools.
Choose based on your serving stack, not on the perplexity delta alone.

## Known limitation

The figures come from published papers, not from LocalNodeOps hardware, so
this entry keeps the "estimated" label. See [/methodology](/methodology) for
what that means on this site. The papers are
[the AWQ paper](https://arxiv.org/pdf/2306.00978) and
[a later table on Llama 3 8B](https://arxiv.org/html/2405.04532v2).