import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://localnodeops.com',
  integrations: [
    tailwind({
      // We ship our own @tailwind base/components/utilities in global.css,
      // so Astro's auto-injected base stylesheet is disabled to avoid
      // duplicate/conflicting base styles.
      applyBaseStyles: false,
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
