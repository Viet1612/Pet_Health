import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['apps/*', 'packages/*'],
    passWithNoTests: true,
    // Coverage gate (NFR-MNT-003, G-2): khi tụt dưới ngưỡng thì thêm test, không hạ ngưỡng.
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['apps/*/src/**/*.{ts,tsx}', 'packages/*/src/**/*.{ts,tsx}'],
      exclude: ['**/*.d.ts', '**/routeTree.gen.ts', '**/database.types.ts', '**/main-*.ts'],
      thresholds: {
        lines: 70,
        'apps/api/src/modules/*/domain/**': { lines: 90 },
        'apps/api/src/platform/calendar/**': { lines: 90 },
      },
    },
  },
});
