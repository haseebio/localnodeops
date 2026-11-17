// One build-time table of every synced model, used by /models, /builds, the
// per-model calculator pages and the home page. It only calls the shared math
// (vram-math + engine-math), so every number matches the calculator and the
// matchmaker. Nothing here is hand-typed data.
import { getCollection } from 'astro:content';
import { getModelArch, nearestBucket, parseParamsB } from './vram-math';
import { estimateForEngine } from './engine-math';
import { usableQuants } from './quant-filter';

export const OS_RESERVED_RAM_GB = 4;
export const ASSUMED_RAM_GB = 32;
export const APPLE_GPU_SHARE = 0.75;

export type Fit = 'fits' | 'offload' | 'oom';

export interface GpuTarget {
  key: string;
  label: string;
  vramGb: number; // memory the model can use
  unified?: boolean; // Apple Silicon: no separate RAM to offload into
}

// Reference targets for the compatibility table (memory sizes from the
// existing hardware cards and the calculator's GPU list).
export const GPU_TARGETS: GpuTarget[] = [
  { key: '4060ti', label: 'RTX 4060 Ti 16GB', vramGb: 16 },
  { key: '3090', label: 'RTX 3090 24GB', vramGb: 24 },
  { key: '4090', label: 'RTX 4090 24GB', vramGb: 24 },
  { key: '5090', label: 'RTX 5090 32GB', vramGb: 32 },
  { key: 'dual3090', label: 'Dual RTX 3090 (48GB pooled)', vramGb: 48 },
  { key: 'mac16', label: 'Mac with 16GB unified memory', vramGb: 16 * APPLE_GPU_SHARE, unified: true },
];

export function fitFor(totalGb: number, gpu: GpuTarget, ramGb = ASSUMED_RAM_GB): Fit {
  if (totalGb <= gpu.vramGb) return 'fits';
  if (gpu.unified) return 'oom';
  return totalGb <= gpu.vramGb + Math.max(0, ramGb - OS_RESERVED_RAM_GB) ? 'offload' : 'oom';
}

export function shortQuant(type: string): string {
  const last = String(type).split('/').pop() ?? '';
  if (/^I?Q\d[A-Za-z0-9_-]*$/i.test(last)) return last;
  const full = last.match(/(bf16|f16|f32|fp16|fp32)$/i);
  if (full) return full[1].toUpperCase();
  const tail = last.match(/-([A-Za-z0-9_]+)$/);
  return tail ? tail[1] : last;
}

const FAMILIES: [RegExp, string][] = [
  [/devstral/i, 'Devstral'],
  [/gpt-oss/i, 'gpt-oss'],
  [/glm/i, 'GLM'],
  [/deepseek/i, 'DeepSeek'],
  [/llama/i, 'Llama'],
  [/qwen/i, 'Qwen'],
  [/gemma/i, 'Gemma'],
  [/mixtral|mistral/i, 'Mistral'],
  [/phi/i, 'Phi'],
];
export const FAMILY_ORDER = ['Llama', 'Qwen', 'Gemma', 'Mistral', 'DeepSeek', 'Devstral', 'GLM', 'gpt-oss', 'Phi', 'Other'];

export interface ModelRow {
  slug: string;
  title: string;
  name: string;
  family: string;
  paramsB: number | null;
  type: 'Dense' | 'MoE' | 'Hybrid';
  q4FileGb: number | null;
  total8kGb: number | null;
  total16kGb: number | null;
  total32kGb: number | null;
  kv8kGb: number | null;
  kv32kGb: number | null;
  hasEstimate: boolean;
  maxContext: number | null;
  note: string | null;
  fits: Record<string, Fit | null>; // per GPU target, Q4_K_M at 8K
}

export async function getModelRows(): Promise<ModelRow[]> {
  const entries = await getCollection('models');
  const rows: ModelRow[] = [];
  for (const entry of entries) {
    const title = entry.data.title;
    const arch = getModelArch(entry.slug) ?? nearestBucket(parseParamsB(title), title);
    const complete = entry.data.quantizations.flatMap((q) =>
      typeof q.type === 'string' && typeof q.size_gb === 'number'
        ? [{ type: q.type, size_gb: q.size_gb }]
        : []
    );
    const q4 = usableQuants(complete).find((q) => shortQuant(q.type).toUpperCase() === 'Q4_K_M') ?? null;
    const est = (ctx: number) =>
      q4 && arch ? estimateForEngine(q4.size_gb, arch, ctx, 'llamacpp') : null;
    const e8 = est(8192);
    const e16 = est(16384);
    const e32 = est(32768);
    const note = (arch as { note?: string } | null)?.note ?? null;
    const isMoe = /\bMoE\b/.test(note ?? '') || /\bmoe\b|mixtral|\d+x\d+b/i.test(title);
    const type: ModelRow['type'] = isMoe ? 'MoE' : /^Hybrid/i.test(note ?? '') ? 'Hybrid' : 'Dense';
    const fits: Record<string, Fit | null> = {};
    for (const g of GPU_TARGETS) fits[g.key] = e8 ? fitFor(e8.totalGb, g) : null;
    rows.push({
      slug: entry.slug,
      title,
      name: title.replace(/-GGUF$/i, ''),
      family: FAMILIES.find(([re]) => re.test(entry.slug))?.[1] ?? 'Other',
      paramsB: parseParamsB(title),
      type,
      q4FileGb: q4 ? q4.size_gb : null,
      total8kGb: e8 ? e8.totalGb : null,
      total16kGb: e16 ? e16.totalGb : null,
      total32kGb: e32 ? e32.totalGb : null,
      kv8kGb: e8 ? e8.kvGb : null,
      kv32kGb: e32 ? e32.kvGb : null,
      hasEstimate: !!e8,
      maxContext: arch?.maxContext ?? null,
      note,
      fits,
    });
  }
  rows.sort(
    (a, b) =>
      FAMILY_ORDER.indexOf(a.family) - FAMILY_ORDER.indexOf(b.family) ||
      (a.paramsB ?? 0) - (b.paramsB ?? 0) ||
      a.name.localeCompare(b.name)
  );
  return rows;
}
