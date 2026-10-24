import type { FastifyRequest } from 'fastify';

import { AppError, NotFoundError } from '../../../platform/errors/app-error.js';
import {
  findStoredResponse,
  runIdempotent,
  type IdempotencyInput,
  type IdempotentResult,
} from '../../../platform/idempotency/run-idempotent.js';
import { newId } from '../../../platform/ids.js';
import { thumbKeyOf, visitPhotoKey } from '../../media/index.js';
import type { HealthRecordsAppDeps, Trx } from './ports.js';

/** Tối đa 5 ảnh mỗi lần khám (FR-VIS-005), không tính ảnh `FAILED`. */
export const MAX_PHOTOS_PER_VISIT = 5;

const photoLimit = () =>
  new AppError(
    409,
    'PHOTO_LIMIT_REACHED',
    `Tối đa ${String(MAX_PHOTOS_PER_VISIT)} ảnh mỗi lần khám`,
  );

/**
 * `POST /visits/{id}/photos` (US-033): mỗi ảnh một request, xử lý nền.
 * 1. Khóa idempotency đã có → trả lại phản hồi cũ, không đọc body.
 * 2. Kiểm lần khám và giới hạn 5 ảnh **trước** khi nhận tệp.
 * 3. Nhận tệp vào `incoming/` (413/415).
 * 4. Một transaction: khóa lần khám, đếm lại (request song song), ghi `visit_photos` + `uploads`
 *    + job `media.process`, lưu idempotency.
 */
export async function attachVisitPhoto(
  deps: HealthRecordsAppDeps & { withTx: <T>(fn: (trx: Trx) => Promise<T>) => Promise<T> },
  req: FastifyRequest,
  ownerId: string,
  visitId: string,
  idem: Omit<IdempotencyInput, 'ownerId' | 'now'>,
): Promise<IdempotentResult> {
  const idemInput = { ...idem, ownerId, now: deps.clock.now() };
  const pre = await deps.withTx(async (trx) => {
    const stored = await findStoredResponse(trx, idemInput);
    if (stored) return stored;
    const visit = await deps.visits.findById(trx, ownerId, visitId);
    if (!visit) throw new NotFoundError();
    if ((await deps.visitPhotos.countActive(trx, ownerId, visitId)) >= MAX_PHOTOS_PER_VISIT) {
      throw photoLimit();
    }
    return null;
  });
  if (pre) return pre;

  const upload = await deps.media.receive(req);
  try {
    const result = await deps.withTx((trx) =>
      runIdempotent(trx, idemInput, async () => {
        const visit = await deps.visits.lock(trx, ownerId, visitId);
        if (!visit) throw new NotFoundError();
        if ((await deps.visitPhotos.countActive(trx, ownerId, visitId)) >= MAX_PHOTOS_PER_VISIT) {
          throw photoLimit();
        }
        const photoId = newId();
        const storageKey = visitPhotoKey(ownerId, visit.pet_id, visitId, photoId);
        await deps.visitPhotos.insert(trx, {
          id: photoId,
          ownerId,
          visitId,
          storageKey,
          thumbKey: thumbKeyOf(storageKey),
        });
        await deps.media.accept(trx, {
          ...upload,
          ownerId,
          targetKind: 'VISIT_PHOTO',
          targetId: photoId,
        });
        return { status: 202, body: { photoId, uploadId: upload.uploadId, status: 'PROCESSING' } };
      }),
    );
    // Request song song cùng khóa đã ghi trước: tệp vừa nhận không dùng tới.
    if (result.replayed) await deps.media.discard(upload);
    return result;
  } catch (error) {
    await deps.media.discard(upload);
    throw error;
  }
}
