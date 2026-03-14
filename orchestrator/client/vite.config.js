import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/health': 'http://localhost:3000',
      '/run': 'http://localhost:3000',
      '/tasks': 'http://localhost:3000',
      '/containers': 'http://localhost:3000',
      '/logs': 'http://localhost:3000',
    },
  },
});
