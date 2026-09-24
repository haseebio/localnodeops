import { defineCollection, z } from 'astro:content';

const hardware = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    category: z.enum(['GPU', 'CPU', 'Memory', 'Quantization']),
    metricLabel: z.string(),
    metricValue: z.string(),
    status: z.enum(['verified', 'community', 'estimated']),
    summary: z.string().max(160),
    publishedAt: z.date(),
    // Only meaningful for category: 'GPU' — CPU/Memory/Quantization
    // entries have no VRAM figure, so this is optional rather than
    // required across the whole collection. Replaces the earlier
    // regex-parsed-from-title heuristic in vram-math.ts.
    vramGB: z.number().positive().optional(),
  }),
});

// GGUF quantization file sizes, synced from Hugging Face by
// scripts/sync-hf-models.js. Deliberately a separate collection from
// `hardware` — this describes per-model file sizes for specific HF
// repos, not GPU/CPU/Memory performance benchmarks, and the two
// shouldn't be conflated (see the Step 5 discussion in project history).
const models = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    last_synced: z.string(),
    architecture: z.string(),
    quantizations: z.array(
      z.object({
        type: z.string(),
        size_gb: z.number(),
      })
    ),
  }),
});

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    excerpt: z.string().max(160),
    category: z.string(),
    pubDate: z.date(),
    author: z.string(),
    tags: z.array(z.string()),
    readingTime: z.number(),
    faq: z
      .array(
        z.object({
          question: z.string(),
          answer: z.string(),
        })
      )
      .optional(),
  }),
});

const docs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    sidebarPosition: z.number(),
    version: z.string(),
  }),
});

const errors = defineCollection({
  type: 'content',
  schema: z.object({
    module: z.enum(['CUDA', 'vLLM', 'Ollama', 'PyTorch']),
    errorCode: z.string(),
    title: z.string(),
    summary: z.string().max(160),
    severity: z.enum(['critical', 'warning', 'info']),
    faq: z
      .array(
        z.object({
          question: z.string(),
          answer: z.string(),
        })
      )
      .optional(),
  }),
});

export const collections = { hardware, models, posts, docs, errors };