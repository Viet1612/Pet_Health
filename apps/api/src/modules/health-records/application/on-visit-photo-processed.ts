import {
  TargetGoneError,
  type MediaService,
  type TargetResolver,
  type UploadPresenter,
} from '../../media/index.js';
import type { VisitPhotoRepository } from './ports.js';

/**
 * Ảnh khám trong worker `media.process` (chạy bằng app_worker). Ảnh hoặc lần khám đã bị xóa →
 * `TargetGoneError`: worker xóa tệp vừa ghi, không để tệp mồ côi. Lỗi của ảnh này không chạm tới
 * ảnh khác hay bản ghi (FR-VIS-006).
 */
export function visitPhotoTargetResolver(photos: VisitPhotoRepository): TargetResolver {
  return {
    async finalKey(q, upload) {
      const photo = await photos.findById(q, upload.ownerId, upload.targetId);
      return photo ? photo.storage_key : null;
    },

    async onReady(trx, upload, _key, output) {
      if (!(await photos.markReady(trx, upload.ownerId, upload.targetId, output.bytes))) {
        throw new TargetGoneError();
      }
      return [];
    },

    async onFailed(q, upload, reason) {
      await photos.markFailed(q, upload.ownerId, upload.targetId, reason);
    },
  };
}

/** `GET /uploads/{id}` của ảnh khám `READY` → `photo: { id, thumbUrl, url }` đã ký. */
export function visitPhotoUploadPresenter(
  photos: VisitPhotoRepository,
  media: Pick<MediaService, 'signUrl'>,
): UploadPresenter {
  return async (trx, upload) => {
    const photo = await photos.findById(trx, upload.ownerId, upload.targetId);
    if (photo?.status !== 'READY') return undefined;
    return {
      photo: {
        id: photo.id,
        thumbUrl: media.signUrl(photo.thumb_key),
        url: media.signUrl(photo.storage_key),
      },
    };
  };
}
