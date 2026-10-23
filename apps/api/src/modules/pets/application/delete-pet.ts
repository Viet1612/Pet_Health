import { AppError, NotFoundError } from '../../../platform/errors/app-error.js';
import { petPrefix, type MediaService } from '../../media/index.js';
import { matchesConfirmName } from '../domain/confirm-name.js';
import type { PetRepository, Trx } from './ports.js';

/**
 * Xóa vĩnh viễn thú cưng (US-014). Phải nhập lại đúng tên. Bảng con xóa theo `ON DELETE CASCADE`;
 * thư mục ảnh `u/{owner}/p/{pet}/` xóa bằng job gửi cùng transaction (AD-006).
 */
export async function deletePet(
  deps: { pets: PetRepository; media: MediaService },
  trx: Trx,
  ownerId: string,
  petId: string,
  confirmName: string,
): Promise<void> {
  const pet = await deps.pets.lockForDelete(trx, ownerId, petId);
  if (!pet) throw new NotFoundError();
  if (!matchesConfirmName(confirmName, pet.name)) {
    throw new AppError(422, 'CONFIRM_NAME_MISMATCH', 'Tên không khớp', {
      errors: [{ field: 'confirmName', code: 'CONFIRM_NAME_MISMATCH', message: 'Tên không khớp' }],
    });
  }
  await deps.pets.delete(trx, ownerId, petId);
  await deps.media.enqueuePurge(trx, petPrefix(ownerId, petId));
}
