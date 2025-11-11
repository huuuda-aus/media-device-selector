import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MediaDeviceSelector',
      formats: ['es', 'cjs'],
      fileName: (format) => format === 'es' ? 'esm/index.js' : 'cjs/index.js'
    },
    cssCodeSplit: false,  // Disable CSS code splitting to ensure all styles are in one file
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
        assetFileNames: (assetInfo) => {
          // Handle all CSS files
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'index.css';
          }
          // Handle other assets
          return assetInfo.name || '';
        }
      }
    },
  },
});
