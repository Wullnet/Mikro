import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readdirSync, existsSync } from 'node:fs';

// Faqet demo (demos/*.html) ndërtohen vetëm në dev; build-i final ka vetëm index.html.
const demos = existsSync('demos') ? readdirSync('demos').filter(f => f.endsWith('.html')) : [];

export default defineConfig(({ command }) => ({
  base: './',
  server: { host: '127.0.0.1' },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: command === 'build' && !process.env.DEMOS
        ? { index: resolve(__dirname, 'index.html') }
        : Object.fromEntries([['index', resolve(__dirname, 'index.html')], ...demos.map(f => [f.replace('.html', ''), resolve(__dirname, 'demos', f)])]),
    },
  },
}));
