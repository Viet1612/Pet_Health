import { NotFoundError } from '../../../platform/errors/app-error.js';
import type { Transaction } from 'kysely';

import type { Database } from '../../../platform/db/kysely.js';
import type { FailReason, UploadPresenters, UploadRepository, UploadStatus } from './ports.js';

/**
 * `GET /uploads/{id}`: trạng thái xử lý ảnh của chính chủ. Ảnh `READY` có thể kèm thông tin của
 * mô-đun sở hữu mục tiêu (ví dụ `photo` của ảnh khám).
 */
export async function getUpload(
  deps: { uploads: UploadRepository; presenters: UploadPresenters },
  trx: Transaction<Database>,
  ownerId: string,
  id: string,
): Promise<{ status: UploadStatus; reason?: FailReason } & Record<string, unknown>> {
  const upload = await deps.uploads.findForOwner(trx, ownerId, id);
  if (!upload) throw new NotFoundError();
  if (upload.failReason) return { status: upload.status, reason: upload.failReason };
  const extra =
    upload.status === 'READY' ? await deps.presenters[upload.targetKind]?.(trx, upload) : undefined;
  return { status: upload.status, ...extra };
}
