import { createRuntime } from './composition-root.js';
import { loadConfigOrExit } from './config.js';
import sharp from 'sharp';

import { createSendTransactionalEmail } from './modules/identity/adapters/jobs/send-transactional-email.js';
import { mediaTargetResolvers } from './modules/index.js';
import {
  createMediaProcessHandler,
  createMediaPurgePrefixHandler,
  kyselyUploadRepository,
  type MediaProcessJob,
  type MediaPurgePrefixJob,
} from './modules/media/index.js';
import { EMAIL_QUEUE } from './platform/email/jobs.js';
import { SmtpEmailAdapter } from './platform/email/smtp-email-adapter.js';
import { startHeartbeat } from './platform/heartbeat.js';
import { LocalDiskStorage } from './platform/storage/local-disk-storage.js';

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

// Ảnh (S2-02): HEIC cần libvips có libheif + libde265 (image ph-app, S0-10). Production thiếu thì
// dừng; máy dev (sharp prebuilt) chỉ cảnh báo.
const heifInput = sharp.format.heif.input.file;
runtime.logger.info({ heifInput }, 'sharp heif input');
if (!heifInput && config.NODE_ENV === 'production') {
  runtime.logger.fatal('sharp không đọc được HEIF/HEIC; kiểm tra libvips trong image');
  process.exit(1);
}
const storage = new LocalDiskStorage(config.MEDIA_ROOT);
const processImageHandler = createMediaProcessHandler({
  db: runtime.db,
  storage,
  uploads: kyselyUploadRepository,
  resolvers: mediaTargetResolvers(runtime.clock),
  logger: runtime.logger,
});
await runtime.boss.work(
  'media.process',
  { batchSize: 1, localConcurrency: 2, includeMetadata: true },
  async (jobs) => {
    for (const job of jobs) {
      await processImageHandler({
        data: job.data as MediaProcessJob,
        retryCount: job.retryCount,
        retryLimit: job.retryLimit,
      });
    }
  },
);
const purgePrefixHandler = createMediaPurgePrefixHandler({ storage, logger: runtime.logger });
await runtime.boss.work<MediaPurgePrefixJob>(
  'media.purge-prefix',
  { batchSize: 1, localConcurrency: 2 },
  async (jobs) => {
    for (const job of jobs) await purgePrefixHandler(job);
  },
);

// Dọn dẹp hằng ngày: S6-06.

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
