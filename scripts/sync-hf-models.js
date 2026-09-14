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

  if (failures > 0 && failures === REPOS.length) {
    console.error('[sync-hf-models] All repos failed to sync. Aborting build.');
    process.exit(1);
  }
}

main();