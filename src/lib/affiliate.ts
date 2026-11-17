// Single source of truth for outbound commercial URLs.
//
// PUBLIC_* env vars are inlined at build time. If one is set (locally in
// .env, or in Vercel > Settings > Environment Variables) it overrides the
// default below. Blank or unset falls back to the tagged default, so a
// missing env var can no longer produce an untagged link.

export const RUNPOD_URL =
  import.meta.env.PUBLIC_RUNPOD_AFFILIATE_URL || 'https://runpod.io?ref=9k9rtpui';

// Product checkout (Docker Stack). Not an affiliate link, kept here so every
// outbound commercial URL lives in one file.
export const LEMONSQUEEZY_URL =
  import.meta.env.PUBLIC_LEMONSQUEEZY_PRODUCT_URL ||
  'https://getlocalnodeops.lemonsqueezy.com/checkout/buy/65274943-26ca-490f-9fab-e5ab0231d73b';

// Every affiliate link on the site uses this rel value, opens in a new tab and
// carries visible "(affiliate link)" text next to it.
export const AFFILIATE_REL = 'sponsored nofollow noopener noreferrer';

// Shown once above the first affiliate block on a page. Wording is fixed.
export const AFFILIATE_DISCLOSURE =
  'Affiliate links: we may earn a commission if you buy or sign up through these links, at no extra cost to you. It never affects the VRAM math.';

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