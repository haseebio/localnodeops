---
module: "vLLM"
errorCode: "VLLM_KV_CACHE_OOM"
title: "vLLM KV cache allocation failure"
summary: "gpu_memory_utilization is set too high, leaving no room for the KV cache."
severity: "warning"
faq:
  - question: "Is gpu_memory_utilization a percentage of free memory or total memory?"
    answer: "Total memory, not currently-free memory. If another process is already using VRAM, vLLM's calculation doesn't automatically account for that, so the effective headroom is smaller than the utilization fraction suggests."
  - question: "I already lowered gpu_memory_utilization and it still fails, what next?"
    answer: "Check --max-model-len — a context length higher than your use case actually needs increases the KV cache block vLLM tries to pre-allocate, independent of the utilization fraction, and can still cause this even at a conservative utilization setting."
---

## What's actually happening

vLLM pre-allocates a fixed block of VRAM for KV cache at startup, sized
according to `gpu_memory_utilization` (the fraction of total GPU
memory vLLM is allowed to use) minus whatever the model weights
already consume. If `gpu_memory_utilization` is set too high relative
to actual available VRAM — or if something else on the GPU is already
using memory vLLM didn't account for — this pre-allocation fails.

## Check what's actually available

```bash
nvidia-smi --query-gpu=memory.total,memory.used,memory.free --format=csv
```

`gpu_memory_utilization` is a fraction of **total** GPU memory, not of
currently-free memory — if something else is already using VRAM,
vLLM's calculation doesn't automatically account for that, and the
requested allocation can exceed what's actually free.

## Fix

```bash
python -m vllm.entrypoints.openai.api_server \
  --model your-model-name \
  --gpu-memory-utilization 0.85
```

Lower `--gpu-memory-utilization` from vLLM's default (typically 0.9)
to leave more headroom — 0.85 is a reasonable starting point on a GPU
that's otherwise idle, lower still if other processes share the card.

If the failure persists after lowering utilization, check
`--max-model-len` — a context length set higher than your use case
needs increases the KV cache block vLLM tries to pre-allocate,
independent of the utilization fraction.