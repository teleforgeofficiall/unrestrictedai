// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://unrestrictedai.vercel.app',
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/404'),
      serialize(item) {
        const url = item.url;
        if (url === 'https://unrestrictedai.vercel.app/') {
          item.priority = 1.0;
          item.changefreq = 'daily';
        } else if (url.includes('/generate')) {
          item.priority = 0.9;
          item.changefreq = 'weekly';
        } else if (url.includes('/chat')) {
          item.priority = 0.8;
          item.changefreq = 'weekly';
        } else if (url.includes('/tools/')) {
          item.priority = 0.7;
          item.changefreq = 'monthly';
        } else if (url.includes('/blog/')) {
          item.priority = 0.6;
          item.changefreq = 'weekly';
        } else if (url.includes('/about') || url.includes('/contact') || url.includes('/faq')) {
          item.priority = 0.5;
          item.changefreq = 'monthly';
        } else {
          item.priority = 0.4;
          item.changefreq = 'monthly';
        }
        item.lastmod = new Date().toISOString();
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
