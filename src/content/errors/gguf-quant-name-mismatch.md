---
module: "HF Sync"
errorCode: "SYNC-QUANT"
title: "Synced quantization names look garbled or duplicated"
summary: "GGUF filenames using hyphens instead of dots between the base name and quant type parse incorrectly with older sync logic."
severity: "info"
---

## Symptom

A synced model's quantization list shows entries like
`model-name-Q4_K_M` as the "type" instead of just `Q4_K_M`, or shows
oddly long names that repeat part of the model's title.

## Cause

GGUF filenames aren't fully standardized across uploaders. Some repos use
a dot before the quant suffix (`model.Q4_K_M.gguf`), others use a hyphen
(`model-Q4_K_M.gguf`). A version of `scripts/sync-hf-models.js`'s
`parseQuantType()` regex that only matched the dot form would fall
through to a raw-filename fallback on hyphenated repos, producing exactly
this garbled output.

## Fix

This was fixed in `sync-hf-models.js` by matching both separators. If you
maintain a fork or modify this script, confirm `parseQuantType()`'s regex
includes `[.-]` before the quant pattern, not just `\.` — then re-run
`npm run sync:hf` to regenerate clean entries.