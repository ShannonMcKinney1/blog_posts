// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import icon from 'astro-icon';

import react from '@astrojs/react';


// Use Node adapter for local dev, Cloudflare for production
const adapter = process.env.CF_PAGES ? cloudflare({ imageService: 'compile' }) : node({ mode: 'standalone' });

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [icon(), react()],

   site: "https://shansblog.xyz"
});