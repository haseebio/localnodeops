---
title: "CPU Offloading & System RAM Utilization"
description: "Learn how to offload LLM layers to system RAM, calculate performance trade-offs, and optimize hybrid CPU-GPU inference speed."
sidebarPosition: 3
version: "1.0"
---

When an LLM exceeds your available VRAM, you do not always have to drop down to a smaller parameter model or use aggressive quantization. Modern local engines like `llama.cpp` and Ollama support **CPU offloading**, allowing you to split model layers between your GPU's VRAM and your system's RAM.

While offloading prevents out-of-memory errors, it introduces performance bottlenecks that every local developer should understand before configuring hybrid pipelines.

## How Layer Offloading Works

Transformer architectures consist of stacked hidden layers (e.g., 32 layers for an 8B model, 80 layers for a 70B model). During inference, computation passes sequentially through each layer.

When offloading layers:
1. The layers assigned to the GPU (`-ngl` / `n_gpu_layers`) process at high speed in VRAM.
2. The remaining layers assigned to the CPU process in system RAM.
3. Intermediate tensor data must transfer across the PCIe bus for every single generated token.

## The Performance Penalty: Memory Bandwidth

Inference speed is almost entirely memory bandwidth-bound, not compute-bound:

* **Dedicated VRAM (RTX 3090/4090):** ~936 to 1,008 GB/s
* **System RAM (DDR5 Dual-Channel):** ~60 to 80 GB/s
* **PCIe 4.0 x16 Bus:** ~31.5 GB/s transfer ceiling

Because system RAM bandwidth is roughly 10x to 15x slower than GPU VRAM, offloading even 10% to 20% of a model's layers to CPU will cause generation speed (tokens per second) to drop significantly.

## Calculating Offloaded VRAM Allocations

To calculate how many layers you can safely load onto your GPU before hitting CUDA OOM errors, determine the per-layer footprint:

$$\text{Layer Memory} = \frac{\text{Model Weights}}{\text{Total Layers}}$$

Combine the weight memory of your offloaded layers with your KV cache, then apply our standard **10% runtime overhead** formula:

$$\text{Required VRAM} = \left( (\text{Offloaded Layers} \times \text{Layer Memory}) + \text{KV Cache} \right) \times 1.10$$

If the resulting figure exceeds your physical VRAM limit, lower your offloaded layer count (`-ngl`) until the GPU allocation fits within your hardware capacity.

## Best Practices for Hybrid Inference

1. **Prioritize Context Sizes:** Reducing your context window size frees up VRAM, allowing you to move additional model layers back onto the GPU.
2. **Avoid Disk Swap Spills:** If system RAM is exhausted and the OS spills over into disk swap, generation speeds will plummet below 1 token/second. Ensure your total system RAM accommodates all remaining offloaded layers.
3. **Optimize PCIe Bandwidth:** Always install your primary GPU in the top PCIe 4.0/5.0 x16 slot to maximize transfer rates between CPU and GPU layers.

## Related Resources

* Calculate exact memory limits for your GPU using the **[VRAM Calculator](/calculator)**.
* Troubleshooting memory allocation spikes? Read our guide on **[diagnosing CUDA OOM errors](/posts/diagnosing-cuda-oom-errors)**.
* Deploy pre-configured inference environments with our production **[Docker Stack](/docker-stack)**.