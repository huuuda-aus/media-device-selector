import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory
  const env = loadEnv(mode, process.cwd(), '');
  
  const isProduction = mode === 'production';
  const isPreview = command === 'serve' && env.VITE_PREVIEW === 'true';
  const base = isProduction || isPreview ? './' : '/';

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
      outDir: isPreview ? 'dist-preview' : '../docs',
      emptyOutDir: true,
      sourcemap: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'demo/index.html'),
        },
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
