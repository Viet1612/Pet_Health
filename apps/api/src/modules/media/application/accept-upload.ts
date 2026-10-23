import type { Transaction } from 'kysely';

import type { Database } from '../../../platform/db/kysely.js';
import type { JobQueuePort } from '../../../platform/queue/job-queue.port.js';
import type { MediaProcessJob, TargetKind, UploadRepository } from './ports.js';

export interface AcceptUploadDeps {
  uploads: UploadRepository;
  jobQueue: JobQueuePort;
}

/**
 * Ghi `uploads (PROCESSING)` và gửi job `media.process` trong cùng transaction của route gọi
 * (AD-006). Tệp đã nằm ở `incoming/{uploadId}`; transaction lỗi thì route gọi xóa tệp.
 */
export async function acceptUpload(
  deps: AcceptUploadDeps,
  trx: Transaction<Database>,
  input: {
    uploadId: string;
    incomingKey: string;
    ownerId: string;
    targetKind: TargetKind;
    targetId: string;
  },
): Promise<void> {
  await deps.uploads.insert(trx, {
    id: input.uploadId,
    ownerId: input.ownerId,
    targetKind: input.targetKind,
    targetId: input.targetId,
    incomingKey: input.incomingKey,
  });
  const job: MediaProcessJob = { uploadId: input.uploadId };
  await deps.jobQueue.enqueue(trx, 'media.process', job, { retryLimit: 3, retryBackoff: true });
}
