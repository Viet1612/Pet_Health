import { createRuntime } from './composition-root.js';
import { loadConfigOrExit } from './config.js';
import { startHeartbeat } from './platform/heartbeat.js';

const config = loadConfigOrExit();
const runtime = await createRuntime(config, 'worker');

// Handler job đăng ký ở các mô-đun: email (S1-02), ảnh (S2-02), dọn dẹp (S6-06).

const stopHeartbeat = startHeartbeat(config.HEARTBEAT_FILE, (error) => {
  process.stderr.write(`[worker] heartbeat lỗi: ${String(error)}\n`);
});
process.stdout.write('[worker] started\n');

let stopping = false;
async function shutdown(): Promise<void> {
  if (stopping) return;
  stopping = true;
  stopHeartbeat();
  await runtime.close();
  process.exit(0);
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => void shutdown());
}
