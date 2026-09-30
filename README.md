# LocalNodeOps

[![Live Website](https://img.shields.io/badge/Live-localnodeops.com-blue?style=for-the-badge)](https://localnodeops.com)
[![Built with Astro](https://img.shields.io/badge/Astro-FF5D01?style=for-the-badge&logo=astro&logoColor=white)](https://astro.build)

An open-source VRAM calculator and vendor-blind orchestration hub for local Large Language Model (LLM) deployments. 

LocalNodeOps helps developers accurately calculate hardware requirements before downloading massive model weights. It accounts for parameter counts, quantization methods, and context length overhead (KV Cache) to prevent CUDA Out of Memory (OOM) errors.

## The VRAM Math
We enforce a strict baseline formula for local infrastructure that goes beyond just weight sizes:
**Total VRAM = Weights + KV Cache + 10% System Overhead**

## Core Features
* **Dynamic VRAM Calculation:** Real-time client-side sliders to estimate memory footprints based on model size, context length, and quantization (bpw). Uses real `.gguf` file sizes synced from Hugging Face.
* **Hardware Benchmarking:** Curated profiles for consumer GPUs to determine if a model fits your local machine, including multi-GPU Tensor Parallelism pooling.
* **Cloud GPU Fallbacks:** Automatically maps to practical cloud alternatives (e.g., RunPod, Lambda Labs) with live budget estimation when local hardware limits are exceeded.

## Tech Stack
* **Framework:** [Astro](https://astro.build/)
* **Styling:** Tailwind CSS
* **Deployment:** Vercel

## Local Development

Clone the repository and install dependencies:

```bash
git clone [https://github.com/haseebio/localnodeops.git](https://github.com/haseebio/localnodeops.git)
cd localnodeops
npm install