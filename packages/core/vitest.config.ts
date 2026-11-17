import { defineConfig } from 'vitest/config';

// Couverture exigée par CLAUDE.md : ≥ 80 % sur packages/core (échec du test sinon).
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text-summary', 'text'],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
    },
  },
});
