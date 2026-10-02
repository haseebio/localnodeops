import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://localnodeops.com',
  prefetch: true,
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap({
      serialize(item) {
        const path = new URL(item.url).pathname;

        if (path === '/') {
          item.priority = 1.0;
          item.changefreq = 'daily';
        } else if (path.startsWith('/calculator/')) {
          item.priority = 0.9;
          item.changefreq = 'weekly';
        } else if (path.startsWith('/posts/')) {
          item.priority = 0.8;
          item.changefreq = 'weekly';
        } else if (path.startsWith('/docs/')) {
          item.priority = 0.7;
          item.changefreq = 'monthly';
        }

        return item;
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
});