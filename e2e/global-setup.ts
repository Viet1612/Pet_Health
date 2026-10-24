import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdirSync, openSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { API_ENV, MAILPIT_URL } from './support/env';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const isWindows = process.platform === 'win32';

/**
 * Trước khi chạy test: migrate DB `pethealth_e2e` và bật worker email (gửi link xác minh vào
 * Mailpit). Trả hàm dọn dẹp: tắt worker.
 */
export default async function globalSetup(): Promise<() => void> {
  const env = { ...process.env, ...API_ENV };
  const migrate = spawnSync('pnpm', ['--filter', '@ph/api', 'migrate'], {
    cwd: ROOT,
    env,
    shell: isWindows,
    encoding: 'utf8',
  });
  if (migrate.status !== 0) {
    throw new Error(`Migrate DB E2E lỗi:\n${migrate.stdout}\n${migrate.stderr}`);
  }

  const mailpit = await fetch(`${MAILPIT_URL}/api/v1/info`).catch(() => null);
  if (!mailpit?.ok) throw new Error('Mailpit chưa chạy: chạy `pnpm dev:up` trước.');

  // Log worker để xem khi email xác minh không tới.
  mkdirSync(`${ROOT}.data`, { recursive: true });
  const log = openSync(`${ROOT}.data/e2e-worker.log`, 'w');
  const worker: ChildProcess = spawn(
    'pnpm',
    ['exec', 'tsx', '--env-file=.env', 'src/main-worker.ts'],
    { cwd: `${ROOT}apps/api`, env, shell: isWindows, stdio: ['ignore', log, log] },
  );

  return () => {
    if (worker.pid === undefined) return;
    // Windows: tắt cả cây tiến trình (pnpm → tsx → node).
    if (isWindows) spawnSync('taskkill', ['/pid', String(worker.pid), '/T', '/F']);
    else worker.kill('SIGTERM');
  };
}
