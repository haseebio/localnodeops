// Engine-aware VRAM estimates. Builds on vram-math.ts (weights + fp16 KV
// cache using GQA KV heads) and adds how each inference engine reserves
// memory. Server/build-time only: the client calculator keeps its own
// inline copy of this logic (see the note at the top of vram-math.ts).
//
// Verified engine behavior this module models:
// - llama.cpp reserves the KV cache for the full declared context (-c /
//   num_ctx) when the model loads. With several server slots, -c is the
//   TOTAL across slots, so slot count does not add memory.
// - vLLM sizes its KV block pool from gpu_memory_utilization (default
//   0.9) of total VRAM, in blocks of 16 tokens by default. It cannot use
//   the last 10% of the card at default settings.
//
// Not verified, so not modeled: exact vLLM activation / CUDA-graph
// overhead. The same 10% estimate used for llama.cpp is reused for it
// and labeled an estimate in the result.

import { GB, kvBytesFor, type ArchBucket } from './vram-math';

export type Engine = 'llamacpp' | 'vllm';

export const VLLM_BLOCK_TOKENS = 16;
export const VLLM_GPU_UTILIZATION = 0.9;
const OVERHEAD_FRACTION = 0.1;

export interface EngineEstimate {
  engine: Engine;
  weightGb: number;
  kvGb: number;
  overheadGb: number;
  // Memory the model, cache and overhead need.
  totalGb: number;
  // VRAM the GPU must have for the engine to start with these settings.
  requiredGpuGb: number;
  note: string;
}

// concurrentSeqs only matters for vLLM: how many sequences you want the
// KV pool to hold at full context at the same time (minimum 1).
export function estimateForEngine(
  weightSizeGb: number,
  bucket: ArchBucket,
  contextTokens: number,
  engine: Engine,
  concurrentSeqs = 1
): EngineEstimate {
  const weightBytes = weightSizeGb * GB;
  let kvBytes: number;
  let requiredGpuMultiplier = 1;
  let note: string;

  if (engine === 'vllm') {
    const seqs = Math.max(1, Math.floor(concurrentSeqs));
    const blockRoundedCtx = Math.ceil(contextTokens / VLLM_BLOCK_TOKENS) * VLLM_BLOCK_TOKENS;
    kvBytes = kvBytesFor(bucket, blockRoundedCtx) * seqs;
    requiredGpuMultiplier = 1 / VLLM_GPU_UTILIZATION;
    note =
      'vLLM reserves 90% of VRAM by default, so the GPU needs the total divided by 0.9. ' +
      'Overhead reuses the 10% estimate. vLLM usually serves safetensors (AWQ, GPTQ, FP8), not GGUF, so weight size here is a GGUF-based estimate.';
  } else {
    kvBytes = kvBytesFor(bucket, contextTokens);
    note =
      'llama.cpp reserves the KV cache for the full context when the model loads. Slot count does not add memory because the context is shared across slots.';
  }

  const overheadBytes = (weightBytes + kvBytes) * OVERHEAD_FRACTION;
  const totalBytes = weightBytes + kvBytes + overheadBytes;

  return {
    engine,
    weightGb: weightBytes / GB,
    kvGb: kvBytes / GB,
    overheadGb: overheadBytes / GB,
    totalGb: totalBytes / GB,
    requiredGpuGb: (totalBytes * requiredGpuMultiplier) / GB,
    note,
  };
}