---
title: "RTX 4090 24GB"
category: "GPU"
metricLabel: "Tokens/sec (Llama 3 70B, Q4)"
metricValue: "18.2"
status: "estimated"
summary: "24GB VRAM handles 70B models at Q4 quantization with room for an 8K context window."
publishedAt: 2026-08-12
vramGB: 24
---

24GB of GDDR6X at ~1008 GB/s memory bandwidth is the relevant spec for
LLM inference, not the CUDA core count most listings lead with.
Inference is memory-bandwidth-bound at typical batch sizes, so the
4090's bandwidth advantage over lower-tier 40-series cards matters more
than its compute throughput for single-user local inference.

## VRAM budget at Q4

A 70B model at Q4_K_M (~4.83 bits per weight) puts weights at roughly
42 GB before quantization — GGUF Q4_K_M brings that down to
approximately 40 GB for the full 70B, which does not fit in 24GB on
its own. What fits at 24GB is a 70B model split across CPU/GPU offload
(`llama.cpp`'s `--n-gpu-layers` flag controls how many transformer
layers land on the GPU vs. system RAM), or a smaller model — the more
common case in practice is running a 70B at Q4 with partial offload, or
running an 8B–13B model fully on-GPU with substantial context headroom
to spare.

For a model that actually fits entirely in 24GB at Q4 (roughly up to
~30B parameters depending on context length), KV cache becomes the
constraint that eats remaining headroom as context grows — see the
[VRAM calculator](/hardware) for the exact math.

## Practical llama.cpp configuration

```bash
./llama-server \
  -m ./models/Meta-Llama-3-70B-Instruct.Q4_K_M.gguf \
  --n-gpu-layers 40 \
  --ctx-size 8192 \
  --flash-attn
```

`--n-gpu-layers 40` is a starting point for partial offload on a 70B
model at 24GB — the exact number that avoids OOM depends on quantization
and context length; increase it until `nvidia-smi` shows VRAM
utilization near capacity without erroring, then back off by a few
layers for headroom. `--flash-attn` reduces KV cache memory overhead
on supported quantizations and is worth enabling by default on Ada
Lovelace hardware.

## Known limitation

Full 70B-at-Q4 fully on-GPU without offload requires roughly 40GB+ of
VRAM — this card cannot do that on its own. Dual-GPU configurations or
a single 48GB+ card (A6000, RTX 6000 Ada) are the alternatives if
full-GPU 70B inference without CPU offload is the requirement.