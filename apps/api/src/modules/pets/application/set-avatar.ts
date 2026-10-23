import type { FastifyRequest } from 'fastify';

import { NotFoundError } from '../../../platform/errors/app-error.js';
import type { MediaService } from '../../media/index.js';
import type { PetRepository, Trx } from './ports.js';

export interface SetAvatarDeps {
  pets: PetRepository;
  media: MediaService;
  withTx: <T>(fn: (trx: Trx) => Promise<T>) => Promise<T>;
}

/**
 * `PUT /pets/{petId}/avatar` (US-012). Kiểm thú cưng thuộc chủ **trước** khi đọc body, nên ID của
 * người khác không ghi tệp nào. `avatar_key` chưa đổi: ảnh cũ vẫn hiện tới khi ảnh mới READY.
 */
export async function setAvatar(
  deps: SetAvatarDeps,
  req: FastifyRequest,
  ownerId: string,
  petId: string,
): Promise<{ uploadId: string; status: 'PROCESSING' }> {
  const pet = await deps.withTx((trx) => deps.pets.findById(trx, ownerId, petId));
  if (!pet) throw new NotFoundError();

  const upload = await deps.media.receive(req);
  try {
    await deps.withTx((trx) =>
      deps.media.accept(trx, { ...upload, ownerId, targetKind: 'AVATAR', targetId: petId }),
    );
  } catch (error) {
    await deps.media.discard(upload);
    throw error;
  }
  return { uploadId: upload.uploadId, status: 'PROCESSING' };
}
