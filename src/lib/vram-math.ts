// Server/build-time copy of the VRAM math used in VramCalculator.astro's
// client-side script. Kept as a separate module (rather than imported by
// the client script) because that script is intentionally plain inline
// vanilla JS with no build step — these constants are duplicated there
// on purpose. If you change one, change the other, or the calculator's
// live output and this site's own stated formulas will disagree.

import archData from '../data/model-arch.json';

export const GB = 1024 ** 3;

// One group of attention layers that share the same KV shape. A window
// makes the group's KV cache stop growing at that many tokens (sliding-
// window attention). Standard models are a single group with no window.
export interface KvGroup {
  layers: number;
  kvHeads: number;
  headDim: number;
  window?: number;
}

export interface ArchBucket {
  label: string;
  params: number;
  layers: number;
  kvHeads: number;
  headDim: number;
  // Only set for per-model overrides (src/data/model-arch.json). When
  // present, KV cache is computed from these groups instead of the
  // single layers/kvHeads/headDim triple above.
  kvGroups?: KvGroup[];
  maxContext?: number;
  note?: string;
}

// Reference architectures. 7B/13B/70B are real published model specs
// (Llama 3 8B / Mistral 7B-style GQA for 7B, Llama 2 13B-style MHA for
// 13B, Llama 3 70B-style GQA for 70B). 32B is Qwen2.5-32B-Instruct's
// published config (verified against Hugging Face: 64 layers, 8 KV
// heads, head_dim 128 — standard GQA, no MoE, no sliding window). 120B
// has no real published reference model at that size and is
// extrapolated from the 70B architecture — not a measured spec.
export const MODEL_SIZES: ArchBucket[] = [
  { label: '7B', params: 7e9, layers: 32, kvHeads: 8, headDim: 128 },
  { label: '13B', params: 13e9, layers: 40, kvHeads: 40, headDim: 128 },
  { label: '32B', params: 32e9, layers: 64, kvHeads: 8, headDim: 128 },
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

// Per-model attention configs taken from each model's published
// config. Keyed by the synced model's slug. Returns null for any model
// without one, which then falls back to nearestBucket() as before.
// Overrides only change the KV cache shape: weights still come from
// the exact synced .gguf size, so MoE models are covered correctly
// (all experts are resident in the file).
const MODEL_ARCH = archData as unknown as Record<
  string,
  { label: string; maxContext?: number; kvGroups: KvGroup[]; note?: string }
>;

export function getModelArch(slug: string): ArchBucket | null {
  const entry = MODEL_ARCH[slug];
  if (!entry) return null;
  const first = entry.kvGroups[0];
  return {
    label: entry.label,
    params: 0,
    layers: first.layers,
    kvHeads: first.kvHeads,
    headDim: first.headDim,
    kvGroups: entry.kvGroups,
    maxContext: entry.maxContext,
    note: entry.note,
  };
}

// Bytes of KV cache (fp16 K and V) for a given context length.
export function kvBytesFor(bucket: ArchBucket, contextTokens: number): number {
  const groups: KvGroup[] = bucket.kvGroups ?? [
    { layers: bucket.layers, kvHeads: bucket.kvHeads, headDim: bucket.headDim },
  ];
  return groups.reduce(
    (sum, g) =>
      sum + 2 * g.layers * g.kvHeads * g.headDim * Math.min(contextTokens, g.window ?? contextTokens) * 2,
    0
  );
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
  const kvBytes = kvBytesFor(bucket, contextTokens);
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