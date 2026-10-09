import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  publicDir: 'public',
  base: './',
  assetsInclude: ['**/*.otf'],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(root, 'src/scripts/main.js'),
      output: {
        format: 'iife',
        name: 'Sakanela',
        entryFileNames: 'js/main.js',
        assetFileNames: ({ name = '' }) => {
          if (name.endsWith('.css')) {
            return 'style.css';
          }

          return 'assets/[name][extname]';
        },
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern',
      },
    },
  },
});
