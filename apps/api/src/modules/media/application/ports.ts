import type { Kysely, Transaction } from 'kysely';

import type { Database } from '../../../platform/db/kysely.js';

export type Q = Kysely<Database> | Transaction<Database>;

export type TargetKind = 'AVATAR' | 'VISIT_PHOTO' | 'USER_AVATAR' | 'POST_PHOTO';
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
  /**
   * Gắn ảnh vào mục tiêu; chạy cùng transaction với `uploads.status = READY`. Trả các khóa ảnh cũ
   * cần xóa sau commit. Mục tiêu vừa bị xóa → ném `TargetGoneError`.
   */
  onReady(
    trx: Transaction<Database>,
    upload: UploadRecord,
    key: string,
    output: { bytes: number },
  ): Promise<string[]>;
  onFailed?(q: Q, upload: UploadRecord, reason: FailReason): Promise<void>;
}

/** Mục tiêu (thú cưng, lần khám) không còn khi ảnh xử lý xong. */
export class TargetGoneError extends Error {
  constructor() {
    super('Mục tiêu của ảnh không còn');
    this.name = 'TargetGoneError';
  }
}

export type TargetResolvers = Partial<Record<TargetKind, TargetResolver>>;

/**
 * Thông tin bổ sung cho `GET /uploads/{id}` khi ảnh đã `READY` (ví dụ `photo` của ảnh khám, S3-04);
 * mô-đun sở hữu mục tiêu cung cấp. Chạy trong transaction có `app.user_id` của chủ.
 */
export type UploadPresenter = (
  trx: Transaction<Database>,
  upload: UploadRecord,
) => Promise<Record<string, unknown> | undefined>;

export type UploadPresenters = Partial<Record<TargetKind, UploadPresenter>>;

/** Job `media.process`. */
export interface MediaProcessJob {
  uploadId: string;
}

/** Job `media.purge-prefix`. */
export interface MediaPurgePrefixJob {
  prefix: string;
}
