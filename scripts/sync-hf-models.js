#!/usr/bin/env node

const REPOS = [
  'bartowski/Meta-Llama-3.1-8B-Instruct-GGUF',
  'bartowski/Meta-Llama-3.1-70B-Instruct-GGUF',
  'bartowski/gemma-2-9b-it-GGUF',
  'bartowski/gemma-2-27b-it-GGUF',
  'Qwen/Qwen2.5-7B-Instruct-GGUF',
  'Qwen/Qwen2.5-32B-Instruct-GGUF',
  'MaziyarPanahi/Phi-3-mini-4k-instruct-GGUF',
  'TheBloke/Mixtral-8x7B-Instruct-v0.1-GGUF',
  'QuantFactory/Meta-Llama-3-8B-Instruct-GGUF',
  'bartowski/Mistral-7B-Instruct-v0.3-GGUF'
];

const OUTPUT_DIR = new URL('../src/content/models/', import.meta.url);
const GB = 1024 ** 3;

function slugify(repoId) {
  return repoId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Matches both `model.Q4_K_M.gguf` (dot-separated, common on TheBloke/
// QuantFactory repos) and `model-Q4_K_M.gguf` (hyphen-separated, common
// on bartowski repos).
function parseQuantType(filename) {
  const match = filename.match(/[.-](Q\d[\w-]*|F16|F32|IQ\d[\w-]*)\.gguf$/i);
  return match ? match[1].toUpperCase() : filename.replace(/\.gguf$/i, '');
}

// Some repos split a single quantization's weights across multiple
// downloadable files, named like "...Q4_K_M-00001-of-00002.gguf" (case
// of "of" varies by uploader). Left unhandled, each split part was
// previously recorded as its own separate "quantization" — producing
// entries like "Q4_K_M-00002-OF-00002" with a tiny size (just that
// part's share of the total), which then got picked up downstream as
// a spuriously small "best-fitting" quantization. This strips the
// split-part suffix so all parts of the same quant group together.
const SPLIT_PART_PATTERN = /-\d{5}-of-\d{5}$/i;

function stripSplitPartSuffix(type) {
  return type.replace(SPLIT_PART_PATTERN, '');
}

async function fetchRepoTree(repoId) {
  const url = `https://huggingface.co/api/models/${repoId}/tree/main?recursive=true`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch tree for ${repoId}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchArchitecture(repoId) {
  try {
    const res = await fetch(`https://huggingface.co/api/models/${repoId}`);
    if (!res.ok) return 'unknown';
    const data = await res.json();
    return data?.config?.model_type ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

// Extracts one quantization entry per GGUF file, then merges any that
// are split parts of the same quantization (same base type after
// stripping the "-NNNNN-of-NNNNN" suffix) into a single entry whose
// size_gb is the sum of all its parts — the true total file size for
// that quantization, not just one fragment of it.
function extractQuantizations(treeItems) {
  const rawEntries = treeItems
    .filter((item) => item.type === 'file' && item.path.toLowerCase().endsWith('.gguf'))
    .map((item) => {
      const bytes = item.lfs?.size ?? item.size ?? 0;
      return {
        type: parseQuantType(item.path),
        size_gb: Number((bytes / GB).toFixed(2)),
      };
    })
    .filter((q) => q.size_gb > 0);

  const merged = new Map();
  for (const entry of rawEntries) {
    const baseType = stripSplitPartSuffix(entry.type);
    const existing = merged.get(baseType);
    if (existing) {
      existing.size_gb += entry.size_gb;
    } else {
      merged.set(baseType, { type: baseType, size_gb: entry.size_gb });
    }
  }

  // Re-round after summing — individual part sizes were already rounded
  // to 2 decimals, so a sum of several parts can pick up float drift
  // beyond 2 decimals (e.g. 3.72 + 0.64 = 4.359999999999999).
  return Array.from(merged.values()).map((q) => ({
    type: q.type,
    size_gb: Number(q.size_gb.toFixed(2)),
  }));
}

function toFrontmatter({ title, last_synced, architecture, quantizations }) {
  const quantLines = quantizations
    .map((q) => `  - type: "${q.type}"\n    size_gb: ${q.size_gb}`)
    .join('\n');

  return `---
title: "${title}"
last_synced: "${last_synced}"
architecture: "${architecture}"
quantizations:
${quantLines}
---

Synced from Hugging Face. Do not edit quantizations by hand — re-run
\`npm run sync:hf\` instead, or this file will be overwritten and your
edit lost on the next build.
`;
}

async function syncRepo(repoId) {
  const [tree, architecture] = await Promise.all([
    fetchRepoTree(repoId),
    fetchArchitecture(repoId),
  ]);

  const quantizations = extractQuantizations(tree);
  if (quantizations.length === 0) {
    console.warn(`[sync-hf-models] No .gguf files found for ${repoId} — skipping.`);
    return;
  }

  const slug = slugify(repoId);
  const frontmatter = toFrontmatter({
    title: repoId.split('/')[1] ?? repoId,
    last_synced: new Date().toISOString(),
    architecture,
    quantizations,
  });

  const fs = await import('node:fs/promises');
  const outPath = new URL(`${slug}.md`, OUTPUT_DIR);
  await fs.writeFile(outPath, frontmatter, 'utf-8');
  console.log(`[sync-hf-models] Wrote ${slug}.md (${quantizations.length} quantizations)`);
}

async function main() {
  const fs = await import('node:fs/promises');
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  let failures = 0;
  for (const repoId of REPOS) {
    try {
      await syncRepo(repoId);
    } catch (err) {
      failures += 1;
      console.error(`[sync-hf-models] ${repoId} failed: ${err.message}`);
    }
  }

  if (failures > 0 && failures === REPOS.length) {
    console.error('[sync-hf-models] All repos failed to sync. Aborting build.');
    process.exit(1);
  }
}

main();