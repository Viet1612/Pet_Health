import { NotFoundError } from '../../../platform/errors/app-error.js';
import type { HealthRecordsAppDeps, Trx } from './ports.js';
import { toVisitView, type VisitView } from './visit-input.js';
import { visitPhotoViews } from './visit-photo-views.js';

/** `GET /visits/{id}` (US-032): kèm ảnh (ẩn ảnh FAILED), URL ký 15 phút. */
export async function getVisit(
  deps: HealthRecordsAppDeps,
  trx: Trx,
  ownerId: string,
  id: string,
): Promise<VisitView> {
  const row = await deps.visits.findById(trx, ownerId, id);
  if (!row) throw new NotFoundError();
  return toVisitView(row, await visitPhotoViews(deps, trx, ownerId, id));
}
