import { NotFoundError } from '../../../platform/errors/app-error.js';
import type { HealthRecordsAppDeps, Trx } from './ports.js';
import {
  buildVisitFields,
  toVisitView,
  type RawVisitInput,
  type VisitView,
} from './visit-input.js';
import { visitPhotoViews } from './visit-photo-views.js';
import { todayForOwner } from './weight-input.js';

/** `PATCH /visits/{id}` (US-032): gộp với bản ghi hiện có rồi kiểm lại; last-write-wins. */
export async function updateVisit(
  deps: HealthRecordsAppDeps,
  trx: Trx,
  ownerId: string,
  id: string,
  input: RawVisitInput,
): Promise<VisitView> {
  const current = await deps.visits.lock(trx, ownerId, id);
  if (!current) throw new NotFoundError();
  const fields = buildVisitFields(
    input,
    {
      visitedOn: current.visited_on,
      symptoms: current.symptoms,
      diagnosis: current.diagnosis,
      prescription: current.prescription,
    },
    await todayForOwner(deps, trx, ownerId),
  );
  const row = await deps.visits.update(trx, ownerId, id, fields, deps.clock.now());
  if (!row) throw new NotFoundError();
  return toVisitView(row, await visitPhotoViews(deps, trx, ownerId, id));
}
