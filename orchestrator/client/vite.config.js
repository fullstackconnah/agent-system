import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execFileSync } from 'child_process';

function getDeployInfo() {
  // Prefer DEPLOY_TITLE build arg (set by CI), fall back to git
  if (process.env.DEPLOY_TITLE) {
    return { title: process.env.DEPLOY_TITLE, sha: process.env.DEPLOY_SHA || '' };
  }

  try {
    const title = execFileSync('git', ['log', '-1', '--format=%s'], { encoding: 'utf-8' }).trim();
    const sha = execFileSync('git', ['log', '-1', '--format=%h'], { encoding: 'utf-8' }).trim();
    return { title, sha };
  } catch {
    return null;
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __DEPLOYED_PR__: JSON.stringify(getDeployInfo()),
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
  },
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
