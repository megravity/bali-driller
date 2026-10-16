import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const base = process.env.BASE_PATH || '';
if (base && (!base.startsWith('/') || base.endsWith('/'))) {
  throw new Error(
    'BASE_PATH must start with / and have no trailing slash, or be empty.'
  );
}

export default defineConfig({
  plugins: [
    sveltekit({
      adapter: adapter(),
      preprocess: vitePreprocess(),
      paths: { base: base as '' | `/${string}` }
    })
  ]
});
