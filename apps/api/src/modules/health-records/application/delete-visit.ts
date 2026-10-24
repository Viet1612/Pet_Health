import { NotFoundError } from '../../../platform/errors/app-error.js';
import { petPrefix } from '../../media/index.js';
import type { HealthRecordsAppDeps, Trx } from './ports.js';

/** Thư mục ảnh của một lần khám: `u/{owner}/p/{pet}/v/{visit}/`. */
export const visitPrefix = (ownerId: string, petId: string, visitId: string): string =>
  `${petPrefix(ownerId, petId)}v/${visitId}/`;

/**
 * `DELETE /visits/{id}` (FR-VIS-004): xóa bản ghi (cascade `visit_photos`) và gửi job xóa thư mục
 * ảnh cùng transaction (AD-006).
 */
export async function deleteVisit(
  deps: HealthRecordsAppDeps,
  trx: Trx,
  ownerId: string,
  id: string,
): Promise<void> {
  const visit = await deps.visits.lock(trx, ownerId, id);
  if (!visit) throw new NotFoundError();
  await deps.visits.delete(trx, ownerId, id);
  await deps.media.enqueuePurge(trx, visitPrefix(ownerId, visit.pet_id, id));
}
