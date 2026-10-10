---
title: "RTX 4090 24GB"
category: "GPU"
metricLabel: "Tokens/sec (Qwen3 32B, Q4_K)"
metricValue: "40"
status: "estimated"
summary: "24GB of GDDR6X at about 1,008 GB/s. Fits 32B-class Q4 models at 8K context; a 70B at Q4 needs about 40GB and still requires CPU offload."
publishedAt: 2026-08-12
vramGB: 24
---

24GB of GDDR6X at ~1008 GB/s memory bandwidth is the relevant spec for
LLM inference, not the CUDA core count most listings lead with.
Inference is memory-bandwidth-bound at typical batch sizes, so the
4090's bandwidth advantage over lower-tier 40-series cards matters more
than its compute throughput for single-user local inference.

## VRAM budget at Q4

A 70B model at Q4_K_M needs about 40GB for weights alone (the Llama 3.1
70B Q4_K_M file is 39.6 GB), so it does not fit in 24GB. Running it means
partial CPU offload: `llama.cpp`'s `--n-gpu-layers` flag sets how many
transformer layers go to the GPU, and the rest run from system RAM, which
is much slower. The offload speed math is in
[Why Your 24GB VRAM Isn't Enough](/posts/why-your-24gb-vram-isnt-enough).

What fits entirely in 24GB is the 30B class. By this site's formula, a 32B
model with an 18.49 GB Q4_K_M file needs about 22.5 GB at 8K context (FP16
KV cache), so it fits, but it needs about 24.7 GB at 16K, which does not.
8B to 13B models fit with much more room. As context grows, the KV cache
is what uses up the remaining headroom; see the
[VRAM calculator](/hardware) for exact figures.

## Practical llama.cpp configuration

A 32B model fully on the GPU:

```bash
./llama-server \
  -m ./models/your-32b-model-Q4_K_M.gguf \
  --n-gpu-layers 99 \
  --ctx-size 8192
```

`--n-gpu-layers 99` asks llama.cpp to put every layer on the GPU, and
`--ctx-size 8192` keeps a 32B Q4_K_M model inside 24GB by this site's
formula. FlashAttention, which can lower memory use during attention, is
controlled by the `--flash-attn` option; its exact syntax differs between
llama.cpp versions, so check `llama-server --help` for yours.

To run a 70B Q4_K_M with partial offload instead, set `--n-gpu-layers` to a
number below the model's layer count (80 layers for the 70B reference model
on this site), then raise it until `nvidia-smi` shows VRAM near capacity
without an error, and back off a few layers for headroom.

## Where the 40 tokens/sec comes from

The figure is a third-party measurement, not a LocalNodeOps test. A
[published llama.cpp benchmark](https://www.hardware-corner.net/gpu-llm-benchmarks/rtx-4090/)
lists about 40 tokens/sec for token generation with the dense Qwen3 32B
model at Q4_K on an RTX 4090, and speed drops as context grows. Real speed
depends on the driver, the llama.cpp build, the context length and the
settings.

## Known limitation

The 40 tokens/sec figure comes from a dense 32B model of about the same size
as the 32B files used elsewhere on this site, not those exact files. It has
not been reproduced on LocalNodeOps hardware, so this entry keeps the
"estimated" label. Running a 70B at Q4 without offload needs about 40GB for
weights plus room for context. A single 48GB card (the RTX 6000 Ada or an
A6000) just fits it at around 8K context (about 46 GB by this site's
formula), and two 24GB cards split the load (pooled VRAM is an upper
bound). See [/methodology](/methodology) for what "estimated" means on this
site.