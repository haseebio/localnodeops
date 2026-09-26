// Single source of truth for outbound commercial URLs.
//
// PUBLIC_* env vars are inlined at build time. If one is set (locally in
// .env, or in Vercel > Settings > Environment Variables) it overrides the
// default below. Blank or unset falls back to the tagged default, so a
// missing env var can no longer produce an untagged link.

export const RUNPOD_URL =
  import.meta.env.PUBLIC_RUNPOD_AFFILIATE_URL || 'https://www.runpod.io/?ref=localnodeops';

export const LAMBDA_URL =
  import.meta.env.PUBLIC_LAMBDA_AFFILIATE_URL || 'https://lambdalabs.com/';

// Just the tag, not a full URL — used to build a SEARCH QUERY THAT
// VARIES per recommended card (see VramCalculator.astro's compute()).
// Separate from PUBLIC_AMAZON_AFFILIATE_URL below, which is a full URL
// override for the static/no-JS default only.
export const AMAZON_AFFILIATE_TAG =
  import.meta.env.PUBLIC_AMAZON_TAG || 'localnodeops-20';

export function amazonSearchUrl(query: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${AMAZON_AFFILIATE_TAG}`;
}

// Static default — used only as the pre-JS fallback href on the Amazon
// button in CloudFallbackCTA.astro. VramCalculator.astro's compute()
// overwrites both the href and the button text on page load with the
// specific card that actually fits the current estimate.
export const AMAZON_RTX_4090_URL =
  import.meta.env.PUBLIC_AMAZON_AFFILIATE_URL || amazonSearchUrl('RTX 4090 24GB');