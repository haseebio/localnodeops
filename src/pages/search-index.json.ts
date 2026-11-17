// Lightweight, build-time search index for the header search. Loaded only when
// a visitor opens the search box, so it adds nothing to normal page loads.
import { getCollection } from 'astro:content';

export async function GET() {
  const [posts, docs, errors, hardware, models] = await Promise.all([
    getCollection('posts'),
    getCollection('docs'),
    getCollection('errors'),
    getCollection('hardware'),
    getCollection('models'),
  ]);
  const items: { t: string; u: string; k: string }[] = [
    { t: 'VRAM calculator', u: '/hardware', k: 'Tool' },
    { t: 'GPU matchmaker: what can your GPU run?', u: '/matchmaker', k: 'Tool' },
    { t: 'Local AI builds', u: '/builds', k: 'Tool' },
    { t: 'Model directory', u: '/models', k: 'Models' },
    { t: 'Methodology', u: '/methodology', k: 'Page' },
    { t: 'About', u: '/about', k: 'Page' },
    { t: 'Contact', u: '/contact', k: 'Page' },
    ...posts.map((p) => ({ t: p.data.title, u: `/posts/${p.slug}`, k: 'Guide' })),
    ...docs.map((d) => ({ t: d.data.title, u: `/docs/${d.slug}`, k: 'Docs' })),
    ...errors.map((e) => ({ t: `${e.data.errorCode}: ${e.data.title}`, u: `/errors/${e.slug}`, k: 'Error' })),
    ...hardware.map((h) => ({ t: h.data.title, u: `/hardware/${h.slug}`, k: 'Hardware' })),
    ...models.map((m) => ({ t: m.data.title.replace(/-GGUF$/i, ''), u: `/calculator/${m.slug}`, k: 'Model' })),
  ];
  return new Response(JSON.stringify(items), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
