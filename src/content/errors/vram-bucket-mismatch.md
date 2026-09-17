---
module: "VRAM Calculator"
errorCode: "CALC-BUCKET"
title: "VRAM estimate looks wrong for an unusual model size"
summary: "Models far from a reference architecture bucket, or MoE models, get no estimate rather than a misleading one."
severity: "info"
---

## Symptom

A model's calculator page shows exact weight sizes per quantization but no
total VRAM estimate — just a message saying no reference architecture
closely matches this model.

## Cause

This site's KV cache math (see [/methodology](/methodology)) matches every
model to the nearest of four reference architecture buckets by parameter
count. Two cases are excluded on purpose rather than force-matched: a
parsed parameter count more than 5B away from any bucket, and
mixture-of-experts models (detected by name pattern, e.g. Mixtral), since
neither fits the dense-model KV cache assumptions the buckets are built on.

## This is expected behavior, not a bug

Forcing a mismatched bucket would produce a number that looks precise but
likely understates real VRAM usage — for example, a 32B model estimated
with the 13B bucket's KV cache shape. Showing nothing was a deliberate
choice over showing a wrong-looking number. See the "When no estimate is
shown" section on [/methodology](/methodology) for the exact thresholds.