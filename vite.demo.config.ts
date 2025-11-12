import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  const isProduction = mode === 'production';
  const isPreview = command === 'serve' && env.VITE_PREVIEW === 'true';
  
  // Use repository name as base path for GitHub Pages
  const base = isProduction ? '/media-device-selector/' : './';
  
  return {
    base,
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
    preview: {
      port: 3000,
      open: true,
    },
    build: {
      outDir: '../docs',
      assetsDir: './',
      emptyOutDir: true,
      sourcemap: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'demo/index.html'),
        },
        output: {
          assetFileNames: 'assets/[name].[hash][extname]',
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js'
        }
      },
    },
    resolve: {
      alias: {
        // Add any necessary aliases here
      },
    },
    define: {
      'process.env': {}
    }
  };
});
