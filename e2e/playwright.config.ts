import { defineConfig, devices } from '@playwright/test';

import { API_ENV, API_PORT, WEB_PORT } from './support/env';

/**
 * E2E luồng cốt lõi (S4-06). Đồng hồ giả dùng chung cả tiến trình API, nên chạy tuần tự
 * (`workers: 1`). Playwright tự bật API (3100) và web (5174); worker email bật ở global-setup.
 * Cần: PostgreSQL ServBay (DB `pethealth_e2e`, infra/dev/e2e-db.sql) và Mailpit (`pnpm dev:up`).
 */
export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: '../.data/e2e-report' }]],
  outputDir: '../.data/e2e-results',
  globalSetup: './global-setup.ts',
  use: { trace: 'retain-on-failure', locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' },
  projects: [
    { name: 'api', testMatch: /api\/.*\.spec\.ts/ },
    {
      name: 'ui-phone',
      testMatch: /ui\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
    {
      name: 'ui-tablet',
      testMatch: /ui\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 834, height: 1112 } },
    },
  ],
  webServer: [
    {
      command: 'pnpm exec tsx --env-file=.env src/main-api.ts',
      cwd: '../apps/api',
      url: `http://localhost:${String(API_PORT)}/api/v1/healthz`,
      env: API_ENV,
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: 'ignore',
    },
    {
      command: `pnpm exec vite --port ${String(WEB_PORT)} --strictPort`,
      cwd: '../apps/web',
      url: `http://localhost:${String(WEB_PORT)}`,
      env: { DEV_API_TARGET: `http://localhost:${String(API_PORT)}` },
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: 'ignore',
    },
  ],
});
