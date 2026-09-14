# LocalNodeOps

Local AI infrastructure and hardware benchmarking blog. Built with Astro,
Tailwind CSS, and Astro Content Collections (markdown-only backend, no CMS).

## Setup

npm install
npm run dev       # local dev server
npm run build     # runs sync:hf, then astro check, then astro build

## Content collections

- `hardware`  — GPU/CPU/Memory/Quantization benchmark cards (manually authored)
- `models`    — GGUF quantization file sizes, synced from Hugging Face by
                scripts/sync-hf-models.js. Two example fixtures are checked
                in so the site isn't empty before the first real sync —
                they're clearly marked as fixtures in their own frontmatter,
                run `npm run sync:hf` to replace them with real data.
- `posts`     — blog articles
- `docs`      — documentation pages, ordered by sidebarPosition

## The HF sync script (scripts/sync-hf-models.js)

- Edit the `REPOS` array at the top of the script to add/remove Hugging
  Face GGUF repos.
- `npm run sync:hf` runs it manually. It also runs automatically before
  `npm run build` via the `prebuild` script.
- UNVERIFIED end-to-end: huggingface.co wasn't reachable from the
  sandbox this was built in. The parsing logic (quant type extraction,
  LFS size handling) was unit-tested against a mocked API response
  shape, not the live API. Run it for real and check its output before
  trusting it in CI.
- If every repo in REPOS fails to fetch, the script exits with a
  non-zero code and fails the build on purpose, rather than silently
  shipping stale data.

## VramCalculator (src/components/VramCalculator.astro)

Two modes:
- Generic estimate: parameter-count bucket (7B/13B/70B/120B) × bits-per-weight.
  120B has no real published reference model — architecture is extrapolated
  from 70B.
- Model-specific: exact weight size from a synced `models` entry. KV cache
  is STILL estimated in this mode — the `models` schema has no layer/head
  count fields, so the calculator parses an approximate parameter count out
  of the model's title and reuses the nearest size bucket's architecture.
  If no parameter count can be parsed, it falls back to the 7B architecture
  and says so in the UI.

Read the footnote text in the component before treating either mode's
output as exact — only the model-specific mode's *weight* figure is exact.

## Before deploying

- [ ] Replace the placeholder PGP key on /contact and in
      public/.well-known/security.txt with a real exported public key
      (gpg --armor --export you@yourdomain.com).
- [ ] Replace corrections@ / sponsorship@ / security@ placeholder emails
      with real, monitored addresses.
- [ ] Replace public/og-default.png — it's a bare technical placeholder
      (default bitmap font, not a designed asset).
- [ ] Replace the About page author bio content with anything you want
      changed — the sameAs links currently point to your real profiles.
- [ ] Wire the /hardware "System status" block to a real telemetry
      endpoint, or remove it — it's currently a static placeholder.
- [ ] Wire the /errors search bar to real filtering JS, or remove the
      disabled state — it's currently a static shell only.
- [ ] Add real content to the placeholder markdown files under
      src/content/ — titles/summaries are real, body text says
      "pending" everywhere.
- [ ] Run `npm run sync:hf` for real (network access required) and
      verify its output before deploying — it has not been run against
      the live Hugging Face API in this project's history so far.
- [ ] Update the Terms page if/when an affiliate program actually goes
      live — it currently discloses affiliate links as a future
      possibility, not a current fact.

## Structure

- src/content/  — Content Collections: hardware, models, posts, docs, errors
- src/components/ — reusable Astro components
- src/layouts/  — BaseLayout.astro (theme toggle, SEO/schema injection)
- src/pages/    — routes, several dynamic via getStaticPaths()
- scripts/      — sync-hf-models.js (HF -> models collection)
- public/       — static assets, llms.txt, .well-known/security.txt
