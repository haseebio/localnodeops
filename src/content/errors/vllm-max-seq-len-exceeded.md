---
module: "vLLM"
errorCode: "VLLM_MAX_SEQ_LEN_EXCEEDED"
title: "ValueError: prompt exceeds the model's maximum context length"
summary: "The request's prompt + max_tokens exceeds max_model_len, often after that value was manually raised past what KV cache memory supports."
severity: "warning"
---

## Symptom

`ValueError: This model's maximum context length is X tokens. However, you requested Y tokens in the messages...`

## Cause

Either a genuinely long prompt exceeded the model's real context window,
or `--max-model-len` was manually set higher than the model actually
supports (or higher than available KV cache memory can serve) when
starting the vLLM server.

## Fix

- If the prompt is legitimately long, reduce it or truncate history
  before sending.
- If `--max-model-len` was raised manually, confirm it doesn't exceed the
  model's actual trained context length (check the model card) — setting
  it higher doesn't extend real context, it just changes what vLLM
  accepts before rejecting the request outright.
- If context length is correct but VRAM is the real constraint, lowering
  `--max-model-len` reduces reserved KV cache memory, which may resolve
  this alongside CUDA OOM errors on the same server.