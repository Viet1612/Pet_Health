import type { ClockPort } from '../../../platform/clock/clock.js';
import { NotFoundError } from '../../../platform/errors/app-error.js';
import { petPrefix, type MediaService } from '../../media/index.js';
import type { PetRepository, Trx } from './ports.js';

/**
 * `DELETE /pets/{petId}/avatar`: bỏ ảnh đại diện; có ảnh cũ thì gửi job xóa thư mục `avatar/`
 * cùng transaction. Không có ảnh vẫn thành công.
 */
export async function removeAvatar(
  deps: { pets: PetRepository; media: MediaService; clock: ClockPort },
  trx: Trx,
  ownerId: string,
  petId: string,
): Promise<void> {
  const result = await deps.pets.setAvatarKey(trx, ownerId, petId, null, deps.clock.now());
  if (!result) throw new NotFoundError();
  if (result.oldKey) await deps.media.enqueuePurge(trx, `${petPrefix(ownerId, petId)}avatar/`);
}
