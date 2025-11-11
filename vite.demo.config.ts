import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  base: './',  // This is important for GitHub Pages
  root: 'demo',
  publicDir: 'public',
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    fs: {
      strict: true,
    },
  },
  build: {
    outDir: '../docs',
    emptyOutDir: true,
    sourcemap: true,  // Helpful for debugging
  },
  resolve: {
    alias: {
      // Add any necessary aliases here
    },
  },
});
