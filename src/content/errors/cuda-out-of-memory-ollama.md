---
module: "CUDA"
errorCode: "CUDA_OUT_OF_MEMORY"
title: "CUDA error: out of memory"
summary: "The model, context length, or batch size requested more VRAM than the GPU has available."
severity: "critical"
faq:
  - question: "Will restarting Ollama fix this?"
    answer: "Only if another process, or a stale Ollama instance, was already holding VRAM. Check nvidia-smi first — if the model, quantization, and context you're loading genuinely exceed your GPU's VRAM, a restart won't help; you need a smaller quantization or shorter context."
  - question: "Why does this usually happen at load instead of partway through a conversation?"
    answer: "llama.cpp reserves the KV cache for the full context window when the model loads, and Ollama's num_ctx setting sets that window. So a model that does not fit fails at load. If the error appears later, check nvidia-smi: another process may have taken VRAM since the model loaded."
---

## Symptom

`CUDA error: out of memory` or `torch.cuda.OutOfMemoryError: CUDA out of memory. Tried to allocate X GiB...`

Usually happens at model load, because the KV cache for the full context is reserved up front. If it appears later, another process has probably taken VRAM.

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