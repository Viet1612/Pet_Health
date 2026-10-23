import { createRuntime } from './composition-root.js';
import { loadConfigOrExit } from './config.js';
import { createSendTransactionalEmail } from './modules/identity/adapters/jobs/send-transactional-email.js';
import { EMAIL_QUEUE } from './platform/email/jobs.js';
import { SmtpEmailAdapter } from './platform/email/smtp-email-adapter.js';
import { startHeartbeat } from './platform/heartbeat.js';

const config = loadConfigOrExit();
const runtime = await createRuntime(config, 'worker');

// Email tài khoản (S1-02): concurrency 1, giữ 1 kết nối SMTP.
const email = new SmtpEmailAdapter(config);
const sendEmail = createSendTransactionalEmail({
  db: runtime.db,
  email,
  clock: runtime.clock,
  logger: runtime.logger,
  appOrigin: config.APP_ORIGIN,
  dailyLimit: config.SMTP_DAILY_LIMIT,
});
await runtime.boss.work(EMAIL_QUEUE, { batchSize: 1 }, async (jobs) => {
  for (const job of jobs) await sendEmail(job.data);
});

// Handler khác: ảnh (S2-02), dọn dẹp (S6-06).

const stopHeartbeat = startHeartbeat(config.HEARTBEAT_FILE, (error) => {
  runtime.logger.warn({ err: error }, 'heartbeat write failed');
});
runtime.logger.info('worker started');

let stopping = false;
async function shutdown(): Promise<void> {
  if (stopping) return;
  stopping = true;
  stopHeartbeat();
  // Chờ job đang chạy xong (boss.stop graceful) rồi mới đóng SMTP và DB.
  await runtime.close();
  email.close();
  process.exit(0);
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => void shutdown());
}
