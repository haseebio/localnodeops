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
3. A small amount of intermediate data passes between the GPU and the CPU for every generated token. In typical setups this is small compared with the model weights, so the main slowdown is the CPU-side layers reading their weights from system RAM.

## The Performance Penalty: Memory Bandwidth

Inference speed is largely limited by memory bandwidth, not compute:

* **Dedicated VRAM (RTX 3090/4090):** ~936 to 1,008 GB/s
* **Mid-range card (RTX 4060 Ti 16GB):** ~288 GB/s
* **System RAM (DDR5 Dual-Channel):** roughly 60 to 96 GB/s (96 GB/s is the theoretical peak of DDR5-6000; one public benchmark result on a Ryzen 9 7950X implies about 60 GB/s in practice)
* **PCIe 4.0 x16 Bus:** ~31.5 GB/s per direction. In layer offloading it typically carries only small intermediate data, not the model weights.

System RAM is roughly 10x to 17x slower than an RTX 3090/4090's VRAM, and about 3x to 5x slower than a mid-range card's. Layers that stay on the CPU read their weights from system RAM for every token, so that part sets the pace, and offloading even 10% to 20% of a model's layers can make generation speed (tokens per second) drop significantly. For a worked example with numbers, see [Why Your 24GB VRAM Isn't Enough](/posts/why-your-24gb-vram-isnt-enough).

## Calculating Offloaded VRAM Allocations

To estimate how many layers you can load onto your GPU before hitting CUDA OOM errors, approximate the per-layer footprint (this is approximate because the embedding and output tensors are not spread evenly across layers):

$$\text{Layer Memory} \approx \frac{\text{Model Weights}}{\text{Total Layers}}$$

Combine the weight memory of the layers on the GPU with your KV cache, then apply our standard **10% runtime overhead** formula:

$$\text{Required VRAM} = \left( (\text{GPU Layers} \times \text{Layer Memory}) + \text{KV Cache} \right) \times 1.10$$

Using the full KV cache here is conservative, because the KV cache for layers that stay on the CPU is typically held in system RAM. If the resulting figure exceeds your physical VRAM limit, lower your GPU layer count (`-ngl`) until the GPU allocation fits within your hardware capacity.

## Best Practices for Hybrid Inference

1. **Prioritize Context Sizes:** Reducing your context window size frees up VRAM, allowing you to move additional model layers back onto the GPU.
2. **Avoid Disk Swap Spills:** If system RAM is exhausted and the OS spills over into disk swap, generation speed can fall to well under 1 token/second. Ensure your total system RAM accommodates all remaining offloaded layers.
3. **Use the primary GPU slot:** Install your primary GPU in the main PCIe x16 slot so it runs at full speed. This helps model loading and any data that crosses the bus, but it matters less for token speed than system RAM bandwidth.

## Related Resources

* Calculate exact memory limits for your GPU using the **[VRAM Calculator](/hardware)**.
* Troubleshooting memory allocation spikes? Read our guide on **[diagnosing CUDA OOM errors](/posts/diagnosing-cuda-oom-errors)**.
* Deploy pre-configured inference environments with our production **[Docker Stack](/docker-stack)**.