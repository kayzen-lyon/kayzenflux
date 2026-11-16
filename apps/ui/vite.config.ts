import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En développement, l'interface (port 5173) relaie l'API vers le démon local.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:49152', changeOrigin: true },
      '/media': { target: 'http://127.0.0.1:49152', changeOrigin: true },
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
