import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://essentis.xyz',
  integrations: [sitemap({ filter: (page) => !page.includes('/admin') })],
  trailingSlash: 'always',
  build: { format: 'directory' },
});
