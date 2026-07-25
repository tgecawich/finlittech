import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Local scratch pad only. Gitignored, never runs in CI, asserts nothing —
// it exists so the domain can be exercised by hand before there is a UI.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    include: ['scratch/**/*.test.ts'],
    environment: 'node',
  },
});
