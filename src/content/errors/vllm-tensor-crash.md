---
module: "vLLM"
errorCode: "VLLM_TENSOR_PARALLEL_CRASH"
title: "vLLM tensor-parallel crash on startup"
summary: "Tensor-parallel size doesn't evenly divide the model's attention heads."
severity: "critical"
faq:
  - question: "How do I know what tensor_parallel_size values are valid for my model?"
    answer: "Check the model's num_key_value_heads, not num_attention_heads, using AutoConfig — tensor_parallel_size must evenly divide that number. A model with 8 KV heads only supports 1, 2, 4, or 8 GPUs for tensor parallelism."
  - question: "My GPU count doesn't divide the KV head count evenly, what are my options?"
    answer: "Use fewer GPUs for tensor parallelism so the count divides evenly, leaving the rest idle or for a different model, or switch to --pipeline-parallel-size instead, which doesn't have this divisibility constraint."
---

## What's actually happening

Tensor parallelism splits each attention layer's computation across
multiple GPUs by dividing attention heads (or KV heads, for GQA
models) among them. This division has to be exact — if
`tensor_parallel_size` doesn't evenly divide the model's head count,
vLLM crashes on startup rather than silently misallocating heads.

## Check the model's actual head count

```python
from transformers import AutoConfig
config = AutoConfig.from_pretrained("your-model-name")
print("Attention heads:", config.num_attention_heads)
print("KV heads:", getattr(config, "num_key_value_heads", config.num_attention_heads))
```

For GQA models, `tensor_parallel_size` must evenly divide
`num_key_value_heads`, not `num_attention_heads` — this is the most
common cause of this crash, since people check the wrong head count.
A model with 8 KV heads only supports `tensor_parallel_size` values of
1, 2, 4, or 8 — attempting `tensor_parallel_size=3` or `6` will crash.

## Fix

```bash
python -m vllm.entrypoints.openai.api_server \
  --model your-model-name \
  --tensor-parallel-size 4
```

Set `--tensor-parallel-size` to a divisor of the model's KV head count
that matches your available GPU count. If your GPU count doesn't
evenly divide the KV head count, either use fewer GPUs for tensor
parallelism (leaving the rest idle or for a different model) or switch
to pipeline parallelism (`--pipeline-parallel-size`) instead, which
doesn't have this divisibility constraint.