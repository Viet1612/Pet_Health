import { buildApp } from './app.js';
import { createRuntime } from './composition-root.js';
import { loadConfigOrExit } from './config.js';

const SHUTDOWN_TIMEOUT_MS = 15_000;

const config = loadConfigOrExit();
const runtime = await createRuntime(config, 'api');
const lifecycle = { shuttingDown: false };

const app = await buildApp({
  appOrigin: config.APP_ORIGIN,
  nodeEnv: config.NODE_ENV,
  clock: runtime.clock,
  checkDb: runtime.checkDb,
  lifecycle,
  logger: runtime.logger,
});

await app.listen({ host: '0.0.0.0', port: config.PORT });

/** Tắt êm (SAD §4.2.2): readyz → 503, ngừng nhận kết nối, chờ request đang chạy tối đa 15 s. */
async function shutdown(signal: string): Promise<void> {
  if (lifecycle.shuttingDown) return;
  lifecycle.shuttingDown = true;
  app.log.info({ signal }, 'shutting down');

  const timer = setTimeout(() => {
    app.log.error('shutdown timed out');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  timer.unref();

  await app.close();
  await runtime.close();
  clearTimeout(timer);
  process.exit(0);
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => void shutdown(signal));
}
