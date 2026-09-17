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

// Parses a VRAM capacity in GB out of a hardware entry's title like
// "RTX 4090 24GB" -> 24. Heuristic, same pattern as parseParamsB above:
// this site's hardware schema has no dedicated numeric VRAM field, so
// this is inferred from the title text. Returns null if no "NNGB"
// pattern is found — callers must handle that, not assume a number.
export function parseVramGbFromTitle(title: string): number | null {
  const match = title.match(/(\d+(?:\.\d+)?)\s?GB/i);
  return match ? parseFloat(match[1]) : null;
}

// Max allowed distance (in billions of params) between a model's actual
// size and a reference bucket's size before we consider the bucket's
// architecture assumptions (layer count, KV head count) too unreliable
// to use. Below this, treating the bucket as a stand-in is a reasonable
// approximation. Above it, forcing a match produces a number that looks
// precise but is not — e.g. a 32B model estimated with the 13B bucket's
// KV cache shape.
const BUCKET_DISTANCE_CAP_B = 5;

// Name patterns that indicate a mixture-of-experts model. MoE models
// don't fit the dense-architecture assumptions baked into MODEL_SIZES
// at all — their active vs. total parameter count and KV cache shape
// don't scale the way a dense model's does. We exclude these outright
// rather than force a dense-model bucket match, regardless of distance.
const MOE_NAME_PATTERN = /\bmoe\b|mixtral|\d+x\d+b/i;

// Matches to the nearest bucket by parameter count, but returns null
// rather than force-matching when:
//  - no parameter count could be parsed from the title, or
//  - the model name indicates a MoE architecture, or
//  - the nearest bucket is still more than BUCKET_DISTANCE_CAP_B away.
// Callers must handle a null return — it means "no confident estimate
// is possible for this model," not an error.
export function nearestBucket(paramsB: number | null, modelName?: string): ArchBucket | null {
  if (paramsB == null) return null;
  if (modelName && MOE_NAME_PATTERN.test(modelName)) return null;

  let closest = MODEL_SIZES[0];
  let closestDiff = Infinity;
  for (const bucket of MODEL_SIZES) {
    const diff = Math.abs(bucket.params / 1e9 - paramsB);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = bucket;
    }
  }

  if (closestDiff > BUCKET_DISTANCE_CAP_B) return null;
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