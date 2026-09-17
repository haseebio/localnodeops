---
module: "CUDA"
errorCode: "CUDA_OUT_OF_MEMORY"
title: "CUDA error: out of memory"
summary: "The model, context length, or batch size requested more VRAM than the GPU has available."
severity: "critical"
---

## Symptom

`CUDA error: out of memory` or `torch.cuda.OutOfMemoryError: CUDA out of memory. Tried to allocate X GiB...`

Can happen at model load, or partway through generation as context grows.

## Cause

Total VRAM demand — model weights + KV cache + runtime overhead — exceeded
what the GPU has available. This is almost always one of three things:
the model/quantization is too large for the card, the context length is
set higher than the remaining VRAM after weights are loaded, or another
process (a desktop environment, another model instance) is already using
VRAM you assumed was free.

## Fix

- Check actual free VRAM before loading: `nvidia-smi` — don't assume the
  card's full VRAM is available if anything else is running.
- Use this site's [VRAM calculator](/calculator) to check whether your
  model, quantization, and context length combination fits your card
  before loading — see [/methodology](/methodology) for what the
  estimate does and doesn't account for.
- Drop to a smaller quantization (e.g. Q4_K_M instead of Q8_0) or reduce
  context length — KV cache scales linearly with context, so halving
  context roughly halves that portion of VRAM use.
- If running multiple services (Ollama + a separate inference server),
  confirm only one is actually holding the model in VRAM at a time.