import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
    // The domain layer is pure and framework-free, so it needs no DOM.
    environment: 'node',
    coverage: {
      provider: 'v8',
      // Coverage is measured on the domain only. Components are covered by
      // Lighthouse and by review, not by unit tests (CLAUDE.md → Testing).
      include: ['lib/finance/**/*.ts'],
      reporter: ['text', 'lcov'],
      // A few hundred lines of pure functions. Anything less than total
      // coverage means an edge case is unexercised.
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
});
