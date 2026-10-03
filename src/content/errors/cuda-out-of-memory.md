---
module: "CUDA"
errorCode: "CUDA_ERROR_OUT_OF_MEMORY"
title: "CUDA out of memory"
summary: "The model, context, or batch size requested more VRAM than the GPU has available."
severity: "critical"
faq:
  - question: "Is this the same error as Ollama's \"CUDA error: out of memory\"?"
    answer: "They're two different error codes, CUDA_ERROR_OUT_OF_MEMORY vs CUDA_OUT_OF_MEMORY, that mean the same thing at the CUDA driver level. Which one you see depends on which framework is reporting it, not on a different root cause."
  - question: "My GPU shows free VRAM in nvidia-smi, so why does this still happen?"
    answer: "nvidia-smi's free memory doesn't account for CUDA's own allocation overhead, fragmentation on long-running processes, or a batching setting like gpu_memory_utilization that reserves memory ahead of actual use — see the diagnostic steps above to isolate which one applies."
---

## What's actually happening

`CUDA_ERROR_OUT_OF_MEMORY` fires when the CUDA driver can't satisfy an
allocation request — it does not tell you *which* allocation failed or
why your total demand exceeded available VRAM. Treat this as a
starting point for diagnosis, not a complete diagnosis on its own.

## Diagnostic steps, in order

**1. Confirm nothing else is holding VRAM before you start.**

```bash
nvidia-smi --query-compute-apps=pid,used_memory --format=csv
```

If `used_memory` is nonzero before you've launched your inference
process, kill whatever's holding it or account for it in your budget.

**2. Check whether the failure happens on load or later.**

Failure on model load means the weights plus the KV cache reserved for
your full context exceed VRAM. Check your model's file size at its
quantization level against
`nvidia-smi --query-gpu=memory.total --format=csv`, then see how much
your context length adds in the
[VRAM budgeting guide](/posts/vram-budget-for-70b-models). llama.cpp and
vLLM both reserve their KV cache up front, so a failure after
generation has started usually means another process took VRAM since
the model loaded, or concurrent requests (see step 3 below).

**3. If it only happens under concurrent load, it's a batching issue,
not a sizing issue.**

Check `gpu_memory_utilization` (vLLM) or equivalent batch/queue
settings — defaults are often too permissive for the VRAM actually
available when multiple requests overlap.

## Fixes, by cause

- **Weights too large**: drop to a more aggressive quantization
  (Q4_K_M instead of Q8_0), or reduce parameter count.
- **KV cache too large for your context**: lower `--ctx-size` (llama.cpp) or the
  equivalent context window setting; enable KV cache quantization if
  your inference engine supports it.
- **Concurrent batching**: lower `gpu_memory_utilization` or the
  equivalent max-batch-size setting to leave real headroom.
- **Fragmentation on long-running processes**: restart the inference
  process. If OOM recurs immediately after a fresh restart, it's not
  fragmentation — go back to the causes above.

Full diagnostic walkthrough: [Diagnosing CUDA OOM
errors](/posts/diagnosing-cuda-oom-errors).