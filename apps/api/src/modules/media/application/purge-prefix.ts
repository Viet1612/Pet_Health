import type { Transaction } from 'kysely';

import type { Database } from '../../../platform/db/kysely.js';
import type { JobQueuePort } from '../../../platform/queue/job-queue.port.js';
import type { ObjectStoragePort } from '../../../platform/storage/object-storage.port.js';
import { isPurgePrefix } from '../domain/media-key.js';
import type { MediaPurgePrefixJob } from './ports.js';

export class InvalidPurgePrefixError extends Error {
  constructor(prefix: string) {
    super(`Prefix không hợp lệ: ${prefix}`);
    this.name = 'InvalidPurgePrefixError';
  }
}

/** Gửi job xóa ảnh theo prefix cùng transaction xóa dữ liệu (S2-05, S6-01). */
export async function enqueuePurgePrefix(
  jobQueue: JobQueuePort,
  trx: Transaction<Database>,
  prefix: string,
): Promise<void> {
  if (!isPurgePrefix(prefix)) throw new InvalidPurgePrefixError(prefix);
  const job: MediaPurgePrefixJob = { prefix };
  await jobQueue.enqueue(trx, 'media.purge-prefix', job, { retryLimit: 10 });
}

/** Job `media.purge-prefix`: xóa cả thư mục; chạy lại nhiều lần không lỗi. */
export async function purgePrefix(storage: ObjectStoragePort, prefix: string): Promise<void> {
  if (!isPurgePrefix(prefix)) throw new InvalidPurgePrefixError(prefix);
  await storage.deletePrefix(prefix);
}
