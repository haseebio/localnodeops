// Server/build-time copy of the VRAM math used in VramCalculator.astro's
// client-side script. Kept as a separate module (rather than imported by
// the client script) because that script is intentionally plain inline
// vanilla JS with no build step — these constants are duplicated there
// on purpose. If you change one, change the other, or the calculator's
// live output and this site's own stated formulas will disagree.

export const GB = 1024 ** 3;

export interface ArchBucket {
  label: string;
  params: number;
  layers: number;
  kvHeads: number;
  headDim: number;
}

// Reference architectures. 7B/13B/70B are real published model specs
// (Llama 3 8B / Mistral 7B-style GQA for 7B, Llama 2 13B-style MHA for
// 13B, Llama 3 70B-style GQA for 70B). 120B has no real published
// reference model at that size and is extrapolated from the 70B
// architecture — not a measured spec.
export const MODEL_SIZES: ArchBucket[] = [
  { label: '7B', params: 7e9, layers: 32, kvHeads: 8, headDim: 128 },
  { label: '13B', params: 13e9, layers: 40, kvHeads: 40, headDim: 128 },
  { label: '70B', params: 70e9, layers: 80, kvHeads: 8, headDim: 128 },
  { label: '120B', params: 120e9, layers: 88, kvHeads: 8, headDim: 128 },
];

// Parses an approximate parameter count in billions out of a model
// title like "Meta-Llama-3-8B-Instruct-GGUF" -> 8. Returns null if
// nothing matches, rather than guessing.
export function parseParamsB(title: string): number | null {
  const match = title.match(/(\d+(?:\.\d+)?)\s?B/i);
  return match ? parseFloat(match[1]) : null;
}

// Matches to the NEAREST bucket by parameter count only. This does not
// verify whether the actual model is GQA or MHA — it assumes the
// bucket's architecture applies. For 7B/70B-scale current models this
// is usually right (GQA is now the common choice at those sizes), but
// it is a heuristic, not a detection, and can be wrong for a specific
// model that doesn't follow the pattern its size bucket assumes.
export function nearestBucket(paramsB: number | null): ArchBucket {
  if (paramsB == null) return MODEL_SIZES[0];
  let closest = MODEL_SIZES[0];
  let closestDiff = Infinity;
  for (const bucket of MODEL_SIZES) {
    const diff = Math.abs(bucket.params / 1e9 - paramsB);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = bucket;
    }
  }
  return closest;
}

export interface VramEstimate {
  weightGb: number;
  kvGb: number;
  overheadGb: number;
  totalGb: number;
  bucket: ArchBucket;
}

// weightSizeGb: exact synced .gguf size for model-specific mode, or
// params * (bpw/8) for generic mode — caller decides which.
// contextTokens: context length to estimate KV cache at.
export function estimateVram(weightSizeGb: number, bucket: ArchBucket, contextTokens: number): VramEstimate {
  const weightBytes = weightSizeGb * GB;
  const kvBytes = 2 * bucket.layers * bucket.kvHeads * bucket.headDim * contextTokens * 2;
  const overheadBytes = (weightBytes + kvBytes) * 0.1;
  const totalBytes = weightBytes + kvBytes + overheadBytes;

  return {
    weightGb: weightBytes / GB,
    kvGb: kvBytes / GB,
    overheadGb: overheadBytes / GB,
    totalGb: totalBytes / GB,
    bucket,
  };
}
