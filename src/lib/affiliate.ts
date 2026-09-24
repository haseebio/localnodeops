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

// Opens an Amazon search for the RTX 4090 (not a specific listing).
export const AMAZON_RTX_4090_URL =
  import.meta.env.PUBLIC_AMAZON_AFFILIATE_URL ||
  'https://www.amazon.com/s?k=RTX+4090&tag=localnodeops-20';