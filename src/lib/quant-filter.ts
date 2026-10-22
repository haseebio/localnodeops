// Which synced quantizations count as real model weights worth listing.
// Same rules as the "What can this hardware run?" list inside
// components/VramCalculator.astro and the best-fit grid in
// pages/hardware/[slug].astro. Keep the three in sync.

// Quantizations below this many bits are skipped as too lossy to recommend.
export const MIN_USABLE_BITS = 3;

export interface QuantLike {
  type: string;
  size_gb: number;
}

const isNamedQuant = (type: string) => /I?Q\d/i.test(type);

export function usableQuants<T extends QuantLike>(quants: T[]): T[] {
  // Vision projectors and importance-matrix files are not model weights.
  const weights = quants.filter((q) => !/mmproj|imatrix/i.test(q.type));
  // Named quants (Q4_K_M, IQ3_XS, ...) must be at least MIN_USABLE_BITS.
  const named = weights.filter((q) => {
    if (!isNamedQuant(q.type)) return false;
    const m = q.type.match(/I?Q(\d)/i);
    return m ? parseInt(m[1], 10) >= MIN_USABLE_BITS : false;
  });
  // A full-precision file (F16, BF16, F32) is never smaller than a
  // quantized file of the same model. If one is, it is a different file.
  const smallestNamed = named.reduce((min, q) => Math.min(min, q.size_gb), Infinity);
  const full = weights.filter(
    (q) => !isNamedQuant(q.type) && (!Number.isFinite(smallestNamed) || q.size_gb >= smallestNamed)
  );
  return [...named, ...full];
}