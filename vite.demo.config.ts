import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
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
    outDir: '../dist-demo',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      // Add any necessary aliases here
    },
  },
});
