import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    exclude: ['src/modules/test/**', 'src/modules/menu/**', 'src/modules/role/**', 'src/modules/user/**'],
    passWithNoTests: false,
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
});
