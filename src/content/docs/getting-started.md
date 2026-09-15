---
title: "Getting started"
description: "Set up your first local inference environment and run a model end to end."
sidebarPosition: 1
version: "1.0"
---

## Prerequisites

- A GPU with at least 8GB VRAM for a comfortable first run (CPU-only
  works but is slow — see [Ollama vs llama.cpp
  server](/posts/ollama-vs-llama-cpp-server) for what to expect).
- ~10GB free disk space for a first model download.
- NVIDIA driver installed if using GPU offload — verify with
  `nvidia-smi` before proceeding.

## Option 1: Ollama (fastest path to a working setup)

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3:8b-instruct-q4_0
ollama run llama3:8b-instruct-q4_0
```

This pulls an 8B model at Q4 quantization (~4.5GB) and drops you into
an interactive prompt. GPU offload is automatic if a supported GPU is
detected — confirm it's actually using the GPU, not falling back to
CPU:

```bash
nvidia-smi
```

Check `nvidia-smi`'s output while a generation is running — VRAM usage
should show meaningful allocation if GPU offload is active.

## Option 2: llama.cpp server (more control, more setup)

```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
cmake -B build -DGGML_CUDA=ON
cmake --build build --config Release -j
```

Then download a GGUF model directly (see [Quantization
basics](/docs/quantization-basics) for choosing a quantization level)
and run:

```bash
./build/bin/llama-server \
  -m ./models/your-model.Q4_K_M.gguf \
  --n-gpu-layers 999 \
  --ctx-size 4096
```

`--n-gpu-layers 999` requests full GPU offload — llama.cpp caps this at
the model's actual layer count, so this is safe to set high by
default rather than calculating the exact layer count yourself.

## Verifying it's actually working

Send a test request:

```bash
curl http://localhost:8080/completion -d '{
  "prompt": "The capital of France is",
  "n_predict": 10
}'
```

A response in a few seconds (not tens of seconds) on GPU-offloaded 7B-
8B class models is the expected baseline — if it's dramatically slower,
confirm GPU offload is actually active via `nvidia-smi` before assuming
something else is wrong.

## Next steps

Figure out how much VRAM your actual target model needs before
committing to hardware or a larger download — see the [VRAM
calculator](/hardware). If you hit errors, check the [error
directory](/errors) before assuming your setup is broken; most
first-run issues are one of a small number of well-known causes.