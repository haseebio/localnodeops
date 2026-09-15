---
module: "Ollama"
errorCode: "OLLAMA_MODEL_NOT_FOUND"
title: "Ollama model not found locally"
summary: "The model tag hasn't been pulled yet, or the tag name doesn't match the registry exactly."
severity: "info"
---

## What's actually happening

This is almost always one of two causes: the model hasn't been pulled
yet, or the tag name in your request doesn't exactly match what's in
Ollama's local registry (including the quantization suffix, which is
part of the tag, not a separate parameter).

## Check what's actually pulled

```bash
ollama list
```

Compare the exact tag shown here against what your request is asking
for. `llama3:8b` and `llama3:8b-instruct-q4_0` are different tags —
requesting one when you've only pulled the other produces this error,
even though "the model" is technically present.

## Fix

```bash
ollama pull llama3:8b-instruct-q4_0
```

Pull the exact tag your application requests. If you're unsure of the
exact tag format for a model, check the model's page on Ollama's
registry (`ollama.com/library`) — tag naming conventions (quantization
suffix format, instruct vs. base model naming) vary by model family
and aren't fully standardized across them.

## If this happens inside a script or CI pipeline

Add an explicit pull step before the run step, rather than relying on
Ollama's automatic pull-on-first-use behavior — that behavior exists
for interactive use, but in an unattended pipeline it turns a slow
first run into an unexplained hang or timeout instead of a clear
"pulling model" log line.

```bash
ollama pull llama3:8b-instruct-q4_0 && \
ollama run llama3:8b-instruct-q4_0 "your prompt here"
```