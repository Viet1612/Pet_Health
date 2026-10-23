import { NotFoundError } from '../../../platform/errors/app-error.js';
import type { FailReason, Q, UploadRepository, UploadStatus } from './ports.js';

/** `GET /uploads/{id}`: trạng thái xử lý ảnh của chính chủ (S3-04 bổ sung `photo`). */
export async function getUpload(
  uploads: UploadRepository,
  q: Q,
  ownerId: string,
  id: string,
): Promise<{ status: UploadStatus; reason?: FailReason }> {
  const upload = await uploads.findForOwner(q, ownerId, id);
  if (!upload) throw new NotFoundError();
  return upload.failReason
    ? { status: upload.status, reason: upload.failReason }
    : { status: upload.status };
}
