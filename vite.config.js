import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'app',
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8100',
    },
  },
  build: {
    outDir: '../app_build',
    emptyOutDir: true,
  },
});
