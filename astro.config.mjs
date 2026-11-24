import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import preact from '@astrojs/preact';
import vercel from '@astrojs/vercel';

// Static site. Only the admin's API routes (src/pages/api/, prerender = false) run on demand,
// as Vercel functions.
export default defineConfig({
  site: 'https://essentis.xyz',
  adapter: vercel(),
  integrations: [preact(), sitemap({ filter: (page) => !page.includes('/admin') })],
  trailingSlash: 'always',
  // The Now page was removed; the Now note lives on Home.
  redirects: { '/ciapier/': '/', '/en/now/': '/en/' },
  build: { format: 'directory' },
});
