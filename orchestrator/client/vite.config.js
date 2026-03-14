import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

function getLatestMergedPR() {
  try {
    // Find the most recent merge commit that matches "Merge pull request #N"
    const log = execSync(
      'git log --merges --oneline --grep="Merge pull request" -1',
      { encoding: 'utf-8' }
    ).trim();

    // Extract PR number from "abc1234 Merge pull request #4 from owner/branch"
    const prMatch = log.match(/Merge pull request #(\d+) from (.+)/);
    if (!prMatch) return null;

    const prNumber = prMatch[1];
    const branch = prMatch[2];
    const hash = log.split(' ')[0];

    // Get the commit message from the PR's actual commit (second parent)
    let title = '';
    try {
      title = execSync(`git log ${hash}^2 --oneline -1 --format="%s"`, {
        encoding: 'utf-8',
      }).trim();
    } catch {
      title = branch;
    }

    return { number: prNumber, title };
  } catch {
    return null;
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __DEPLOYED_PR__: JSON.stringify(getLatestMergedPR()),
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
