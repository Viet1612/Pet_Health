import { NotFoundError } from '../../../platform/errors/app-error.js';
import type { HealthRecordsAppDeps, Trx } from './ports.js';

/**
 * `DELETE /photos/{id}` (US-034): xóa dòng ảnh rồi gửi job xóa `{photoId}.jpg` và `_thumb.jpg`
 * cùng transaction. Ảnh đang xử lý: worker thấy dòng không còn thì xóa tệp vừa ghi (TargetGone).
 */
export async function deleteVisitPhoto(
  deps: HealthRecordsAppDeps,
  trx: Trx,
  ownerId: string,
  id: string,
): Promise<void> {
  const photo = await deps.visitPhotos.lock(trx, ownerId, id);
  if (!photo) throw new NotFoundError();
  await deps.visitPhotos.delete(trx, ownerId, id);
  await deps.media.enqueuePurge(trx, photo.storage_key.replace(/\.jpg$/, ''));
}
