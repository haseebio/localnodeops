#!/usr/bin/env node
// Fetches GGUF file listings from Hugging Face for the repos configured
// below, and writes/overwrites markdown files in src/content/models/
// matching the `models` collection schema in src/content/config.ts.
// This is a separate collection from `hardware` (GPU/CPU/Memory
// benchmark cards) — do not point OUTPUT_DIR back at src/content/hardware/,
// the schemas are incompatible and it will break the Hardware Hub build.
//
// Requires Node 18+ (uses global fetch). No npm dependencies.
//
// LIMITATION — read before relying on this script:
// This only pulls file sizes for GGUF quantizations of specific models.
// It does NOT determine tokens/sec, VRAM headroom, or hardware
// compatibility on its own. VramCalculator.astro uses the exact size_gb
// from this data for the model-weights term when a specific ingested
// model is selected, but still estimates the KV-cache term from an
// architecture bucket (7B/13B/70B/120B) matched by parsing a parameter
// count out of the model's title string — this schema has no layer
// count / head count / head dimension fields, so KV cache cannot be
// computed exactly from this data alone. See VramCalculator.astro's
// footnote for the precise breakdown of what's exact vs. estimated.
//
// UNVERIFIED: huggingface.co is not reachable from the sandbox this was
// built in, so the actual network calls below have not been executed
// against the real API. The parsing logic was tested against a mocked
// response shape matching HF's documented tree endpoint format. Run
// this for real before trusting it in CI.

const REPOS = [
  // Add/remove Hugging Face GGUF repos here. Each becomes one file at
  // src/content/hardware/<slug>.md
  'QuantFactory/Meta-Llama-3-8B-Instruct-GGUF',
  'bartowski/Mistral-7B-Instruct-v0.3-GGUF',
];

const OUTPUT_DIR = new URL('../src/content/models/', import.meta.url);
const GB = 1024 ** 3;

function slugify(repoId) {
  return repoId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Extracts a quant label like "Q4_K_M" or "Q8_0" from a .gguf filename.
function parseQuantType(filename) {
  const match = filename.match(/\.(Q\d[\w-]*|F16|F32|IQ\d[\w-]*)\.gguf$/i);
  return match ? match[1].toUpperCase() : filename.replace(/\.gguf$/i, '');
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
  // Best-effort. HF's model info endpoint doesn't reliably expose
  // architecture for every GGUF repo. Falls back to "unknown" rather
  // than guessing — a wrong architecture label silently poisons any
  // calculator math built on top of it later, which is worse than an
  // honest gap.
  try {
    const res = await fetch(`https://huggingface.co/api/models/${repoId}`);
    if (!res.ok) return 'unknown';
    const data = await res.json();
    return data?.config?.model_type ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

function extractQuantizations(treeItems) {
  return treeItems
    .filter((item) => item.type === 'file' && item.path.toLowerCase().endsWith('.gguf'))
    .map((item) => {
      // LFS-tracked files report their real size under .lfs.size —
      // .size alone is the git pointer file size (a few hundred bytes),
      // not the actual blob. Using .size alone would report ~0 GB for
      // every quantization.
      const bytes = item.lfs?.size ?? item.size ?? 0;
      return {
        type: parseQuantType(item.path),
        size_gb: Number((bytes / GB).toFixed(2)),
      };
    })
    .filter((q) => q.size_gb > 0);
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

  // If every single repo failed, it's almost certainly a network/API
  // problem, not a data problem — fail the build loudly instead of
  // silently shipping a Hardware Hub with stale or missing content.
  if (failures > 0 && failures === REPOS.length) {
    console.error('[sync-hf-models] All repos failed to sync. Aborting build.');
    process.exit(1);
  }
}

main();
