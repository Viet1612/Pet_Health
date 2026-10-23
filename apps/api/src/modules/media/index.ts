import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Transaction } from 'kysely';

import type { ClockPort } from '../../platform/clock/clock.js';
import type { Database } from '../../platform/db/kysely.js';
import type { JobQueuePort } from '../../platform/queue/job-queue.port.js';
import type { ObjectStoragePort } from '../../platform/storage/object-storage.port.js';
import { mediaFileRoutes } from './adapters/http/media.routes.js';
import { receiveUploadFile, type ReceivedUpload } from './adapters/http/receive-upload.js';
import { uploadsRoutes } from './adapters/http/uploads.routes.js';
import { kyselyUploadRepository } from './adapters/persistence/kysely-upload-repository.js';
import { acceptUpload } from './application/accept-upload.js';
import type { TargetKind } from './application/ports.js';
import { enqueuePurgePrefix } from './application/purge-prefix.js';
import { signMediaUrl } from './domain/signed-url.js';

export { TargetGoneError } from './application/ports.js';
export type {
  FailReason,
  MediaProcessJob,
  MediaPurgePrefixJob,
  TargetKind,
  TargetResolver,
  TargetResolvers,
  UploadRecord,
} from './application/ports.js';
export { avatarKey, petPrefix, thumbKeyOf, userPrefix, visitPhotoKey } from './domain/media-key.js';
export { createMediaProcessHandler } from './adapters/jobs/media-process.job.js';
export { createMediaPurgePrefixHandler } from './adapters/jobs/media-purge-prefix.job.js';
export { kyselyUploadRepository } from './adapters/persistence/kysely-upload-repository.js';

/** Phụ thuộc của mô-đun media, tiêm từ composition root. */
export interface MediaDeps {
  storage: ObjectStoragePort;
  jobQueue: JobQueuePort;
  clock: ClockPort;
  signingKey: string;
}

/** API của mô-đun media cho mô-đun khác (pets S2-03, health-records S3-04). */
export interface MediaService {
  /** Nhận field `file` (multipart) vào `incoming/`; ném 413/415/422. */
  receive(req: FastifyRequest): Promise<ReceivedUpload>;
  /** Ghi `uploads` + gửi `media.process` trong transaction của route gọi. */
  accept(
    trx: Transaction<Database>,
    input: ReceivedUpload & { ownerId: string; targetKind: TargetKind; targetId: string },
  ): Promise<void>;
  /** Xóa tệp tạm khi transaction của route gọi thất bại. */
  discard(upload: ReceivedUpload): Promise<void>;
  /** URL ký `/media/{key}?exp=&sig=` hiệu lực ≤ 15 phút. */
  signUrl(key: string): string;
  /** Gửi `media.purge-prefix` trong transaction xóa dữ liệu. */
  enqueuePurge(trx: Transaction<Database>, prefix: string): Promise<void>;
}

export function createMediaService(deps: MediaDeps): MediaService {
  return {
    receive: (req) => receiveUploadFile(req, deps.storage),
    accept: (trx, input) =>
      acceptUpload({ uploads: kyselyUploadRepository, jobQueue: deps.jobQueue }, trx, input),
    discard: (upload) => deps.storage.delete(upload.incomingKey),
    signUrl: (key) => signMediaUrl(deps.signingKey, key, deps.clock.now()),
    enqueuePurge: (trx, prefix) => enqueuePurgePrefix(deps.jobQueue, trx, prefix),
  };
}

/** Route dưới `/api/v1`. */
export async function registerMediaApiRoutes(api: FastifyInstance): Promise<void> {
  await api.register(uploadsRoutes);
}

/** `GET /media/*` ở gốc (ngoài `/api/v1`). */
export async function registerMediaFileRoutes(
  app: FastifyInstance,
  deps: MediaDeps,
): Promise<void> {
  await app.register(mediaFileRoutes, {
    storage: deps.storage,
    clock: deps.clock,
    signingKey: deps.signingKey,
  });
}
