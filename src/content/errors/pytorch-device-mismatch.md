---
module: "PyTorch"
errorCode: "PYTORCH_DEVICE_MISMATCH"
title: "RuntimeError: Expected all tensors on the same device"
summary: "Mixing CPU and GPU tensors in a forward pass, often from partial CPU offload during quantized inference."
severity: "warning"
---

## Symptom

`RuntimeError: Expected all tensors to be on the same device, but found at least two devices, cuda:0 and cpu!`

Typically appears mid-inference, not at model load.

## Cause

Some layers or tensors ended up on CPU while others are on GPU. Common
with partial GPU offload (e.g. `llama.cpp`-style `--n-gpu-layers`, or a
`device_map="auto"` split in `transformers`/`accelerate` that spills
onto CPU RAM when VRAM runs out) — the split itself isn't the bug, but a
custom hook, input tensor, or cache object created without `.to(device)`
can land on the wrong device and trip this error.

## Fix

Confirm every tensor you construct manually (inputs, attention masks, KV
cache buffers) is explicitly moved with `.to(model.device)` rather than
assuming default placement. If using `accelerate`'s `device_map="auto"`,
check `model.hf_device_map` to see which layers actually landed on CPU —
if that's unintentional, it usually means the model doesn't fit in VRAM
at your current quantization and needs a lower bit-width or fewer
GPU-offloaded layers.