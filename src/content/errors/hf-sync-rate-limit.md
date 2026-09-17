---
module: "HF Sync"
errorCode: "SYNC-429"
title: "Hugging Face sync fails with 429 Too Many Requests"
summary: "npm run sync:hf hits HF's unauthenticated rate limit when syncing many repos in one run."
severity: "warning"
---

## Symptom

Running `npm run sync:hf` logs `[sync-hf-models] <repo> failed: 429 Too Many
Requests` for one or more repos, usually the later ones in the list. Earlier
repos in the same run often succeed.

## Cause

`scripts/sync-hf-models.js` calls the Hugging Face API without an auth
token. Unauthenticated requests share a much lower per-IP rate limit than
authenticated ones, and a run syncing 10+ repos back-to-back can exceed it.

## Fix

Set an `HF_TOKEN` environment variable with a free Hugging Face access
token (read-only scope is enough) before running the sync. The script does
not currently send this header automatically — add an `Authorization:
Bearer $HF_TOKEN` header to both `fetchRepoTree()` and `fetchArchitecture()`
if you hit this regularly. As a workaround without code changes, re-run
`npm run sync:hf` after a few minutes — the script's per-repo try/catch
means it won't fail the whole build over one repo, so a partial sync is
still usable while you wait out the rate limit.