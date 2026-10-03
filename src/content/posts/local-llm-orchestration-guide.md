---
title: "The Baseline Architecture for Local LLM Orchestration: Avoiding VRAM Bottlenecks"
excerpt: "What actually consumes VRAM in local LLM serving, and how to architect a baseline setup that doesn't blow past it."
category: "Architecture"
pubDate: 2026-09-11
author: "Haseeb"
tags: ["Local LLM", "CUDA", "GGUF", "VRAM", "Orchestration"]
readingTime: 11
faq:
  - question: "Does more VRAM always mean I can run a bigger model?"
    answer: "No — VRAM headroom is consumed by three separate things (weights, KV cache, runtime overhead), and a long context window can eat more VRAM than the weights themselves. Sizing for weights alone is the most common mistake."
  - question: "Is GQA always better than MHA for local inference?"
    answer: "For VRAM budgeting, yes — GQA shares key/value projections across multiple query heads, which shrinks the KV cache substantially. The trade-off is a small, usually acceptable, quality delta versus full MHA at the same parameter count."
  - question: "Can I run local LLM orchestration fully offline?"
    answer: "Yes, and for regulated or sensitive data that's often the entire point — once weights are downloaded, inference, embedding, and RAG retrieval can run with zero outbound network calls, which changes your compliance posture, not just your latency."
---

Most "why is my GPU running out of memory" threads end with someone
buying a bigger card. That fixes the symptom. It doesn't fix the fact
that nobody budgeted VRAM before choosing the model, the context
length, and the serving stack in the first place. This is a baseline
architecture for doing that budgeting up front, written for people who
are past the "how do I run Ollama" stage and into "why did this crash
in production at 2am" territory.

## VRAM Is Not One Number — It's Three

Every local inference stack — llama.cpp, vLLM, TGI, doesn't matter —
is allocating VRAM across three distinct consumers, and treating them
as one lump sum is how you get surprised.

### 1. Model weights

Fixed at load time. Parameter count × bytes-per-weight at your chosen
quantization. This is the number everyone budgets for, and it's the
easiest to get right because it doesn't move once the process is
running.

### 2. KV cache

This is the one that bites people. It grows with context length,
batch size, and — critically — with the model's attention
architecture. Unlike weights, KV cache isn't fixed; it scales with
the context length you set, which means a model that fits comfortably at a 4K context can
OOM at 32K with the exact same weights loaded.

### 3. Runtime overhead

CUDA context, activation buffers, framework overhead. Usually 5-15% on
top of the first two, and the number that people forget to leave
headroom for when they're already running close to the card's limit.

If your capacity planning only accounts for (1), you have not actually
sized your deployment — you've sized one third of it.

## GQA vs MHA: The Architecture Decision That Sets Your Ceiling

This is the part that separates "I picked a model" from "I understand
what I picked."

Multi-Head Attention (MHA) gives every attention head its own key and
value projections. Grouped-Query Attention (GQA) shares key/value
projections across groups of query heads. The practical consequence:
GQA's KV cache is a fraction of the size of an equivalent MHA model at
the same parameter count and context length — often 4-8x smaller,
depending on how aggressively the groups are shared.

This is why two "70B" models can have wildly different VRAM footprints
at long context, even at identical quantization. If a model card
doesn't tell you whether it's GQA or MHA, check the config — it's
almost always in `num_key_value_heads` vs `num_attention_heads`. If
they're equal, it's MHA. If `num_key_value_heads` is smaller, it's
GQA, and the ratio between them tells you the KV cache reduction
factor.

For any deployment where context length matters — RAG pipelines,
long-document summarization, multi-turn agents — this single
architectural detail affects your hardware requirements more than the
parameter count does.

## Context Window Memory Bloat, in Practice

KV cache size scales linearly with context length. Doubling your
context window roughly doubles your KV cache VRAM cost. That sounds
manageable until you look at where context length actually goes in a
real system:

- The system prompt (often larger than people think once you add tool
  definitions and few-shot examples)
- Retrieved RAG chunks
- Conversation history
- The model's own generated output, which stays in context for
  multi-turn use

None of that is "your" 4K-token question. It's overhead you're paying
on every request, and it's the reason a demo that worked fine at 2K
tokens falls over in production once real conversation history and
RAG context get added.

## A Baseline Orchestration Layout

Here's the shape of a setup that accounts for all three VRAM
consumers instead of just the first one.

### Step 1 — pull the weights you're actually going to run

```bash
# Download a specific GGUF quantization instead of the whole repo —
# pulling every quant in a repo wastes bandwidth and disk for weights
# you were never going to load.
huggingface-cli download \
  QuantFactory/Meta-Llama-3-8B-Instruct-GGUF \
  Meta-Llama-3-8B-Instruct.Q4_K_M.gguf \
  --local-dir ./models \
  --local-dir-use-symlinks False
```

### Step 2 — set runtime limits explicitly, don't rely on defaults

```json
{
  "model": "./models/Meta-Llama-3-8B-Instruct.Q4_K_M.gguf",
  "context_length": 8192,
  "gpu_memory_utilization": 0.85,
  "max_batch_size": 4,
  "kv_cache_dtype": "fp16"
}
```

`gpu_memory_utilization` is the field people leave at a library's
default and then wonder why a second process can't get scheduled on
the same card. Set it deliberately, based on the three-part budget
above, not on whatever the framework ships with.

### Step 3 — treat context length as a cost, not a convenience

Don't set `context_length` to the model's maximum just because it's
available. Set it to what your actual use case needs, then leave
headroom for growth. A RAG pipeline that only ever sends 6K tokens of
retrieved context doesn't need a 128K context window configured — that
unused ceiling is either wasted VRAM reservation or a production
incident waiting for someone to send a 100K-token request the box was
never sized for.

## Offline Operation as an Architectural Property, Not a Feature Flag

Local orchestration is usually framed as a cost or latency decision.
For a meaningful chunk of real deployments — healthcare, legal,
anything under strict data-residency rules — it's a compliance
decision instead. Once weights are on disk, inference, embedding
generation, and RAG retrieval can all run with zero outbound network
calls. That's not a nice-to-have; for some organizations, it's the
only way local LLM deployment is legally viable at all.

The operational implication: your architecture needs to actually
guarantee no outbound calls, not just default to none. Telemetry,
crash reporting, and "phone home" update checks baked into some
serving frameworks will quietly violate an offline requirement if
nobody audits for it. If offline operation is a requirement, verify it
at the network layer (firewall rules, no egress), not just by trusting
a config flag.

## Practical Checklist

Before you deploy, you should be able to answer all five of these
without guessing:

1. What's your model's exact weight size at your chosen quantization?
2. Is it GQA or MHA, and what's the KV-cache-per-token cost at your
   configured context length?
3. What context length does your use case *actually* need, measured,
   not assumed?
4. What's your total budget — weights + KV cache + ~10% overhead —
   against the card you're deploying to?
5. If offline operation matters, have you verified zero egress at the
   network layer, not just in a config file?

If you can't answer all five, you haven't finished sizing the
deployment — you've picked a model and hoped.
