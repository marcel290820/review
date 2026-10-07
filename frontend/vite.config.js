import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// One script and one stylesheet with fixed names, embedded by the Rust server. Fonts stay
// in public/fonts, served by the server as they are, so CSS keeps their URLs.
export default defineConfig({
  plugins: [svelte()],
  build: {
    copyPublicDir: false,
    rolldownOptions: {
      input: 'src/main.ts',
      output: { entryFileNames: 'app.js', assetFileNames: 'app.css' },
    },
  },
});
