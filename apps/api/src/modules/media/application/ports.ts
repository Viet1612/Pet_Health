import type { Kysely, Transaction } from 'kysely';

import type { Database } from '../../../platform/db/kysely.js';

export type Q = Kysely<Database> | Transaction<Database>;

export type TargetKind = 'AVATAR' | 'VISIT_PHOTO';
export type UploadStatus = 'PROCESSING' | 'READY' | 'FAILED';
export type FailReason = 'UNSUPPORTED_FORMAT' | 'CORRUPT' | 'TOO_MANY_PIXELS' | 'PROCESSING_ERROR';

export interface UploadRecord {
  id: string;
  ownerId: string;
  targetKind: TargetKind;
  targetId: string;
  incomingKey: string;
  status: UploadStatus;
  failReason: FailReason | null;
}

export interface UploadRepository {
  insert(
    q: Q,
    upload: Pick<UploadRecord, 'id' | 'ownerId' | 'targetKind' | 'targetId' | 'incomingKey'>,
  ): Promise<void>;
  /** Route có phiên: lọc theo chủ (RLS chặn thêm một lớp). */
  findForOwner(q: Q, ownerId: string, id: string): Promise<UploadRecord | undefined>;
  /** Worker (BYPASSRLS): tìm theo id. */
  findById(q: Q, id: string): Promise<UploadRecord | undefined>;
  markReady(q: Q, id: string): Promise<void>;
  markFailed(q: Q, id: string, reason: FailReason): Promise<void>;
}

/**
 * Mô-đun sở hữu mục tiêu (pets, health-records) cho biết nơi lưu ảnh và nhận kết quả. Chạy trong
 * worker với kết nối app_worker.
 */
export interface TargetResolver {
  /** Khóa đích `u/{owner}/p/{pet}/…/{id}.jpg`; `null` nếu mục tiêu không còn. */
  finalKey(q: Q, upload: UploadRecord): Promise<string | null>;
  /** Gắn ảnh vào mục tiêu; chạy cùng transaction với `uploads.status = READY`. */
  onReady(trx: Transaction<Database>, upload: UploadRecord, key: string): Promise<void>;
  onFailed?(q: Q, upload: UploadRecord, reason: FailReason): Promise<void>;
}

export type TargetResolvers = Partial<Record<TargetKind, TargetResolver>>;

/** Job `media.process`. */
export interface MediaProcessJob {
  uploadId: string;
}

/** Job `media.purge-prefix`. */
export interface MediaPurgePrefixJob {
  prefix: string;
}
