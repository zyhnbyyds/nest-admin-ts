import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    passWithNoTests: false,
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
});
