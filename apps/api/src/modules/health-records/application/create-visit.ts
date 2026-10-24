import { NotFoundError } from '../../../platform/errors/app-error.js';
import { newId } from '../../../platform/ids.js';
import type { HealthRecordsAppDeps, Trx } from './ports.js';
import {
  buildVisitFields,
  toVisitView,
  type RawVisitInput,
  type VisitView,
} from './visit-input.js';
import { todayForOwner } from './weight-input.js';

/** `POST /pets/{petId}/visits` (US-030): ngày khám mặc định hôm nay theo múi giờ tài khoản. */
export async function createVisit(
  deps: HealthRecordsAppDeps,
  trx: Trx,
  ownerId: string,
  petId: string,
  input: RawVisitInput,
): Promise<VisitView> {
  const pet = await deps.pets.getOwnedPet(trx, ownerId, petId);
  if (!pet) throw new NotFoundError();
  const fields = buildVisitFields(input, null, await todayForOwner(deps, trx, ownerId));
  const row = await deps.visits.insert(trx, {
    ...fields,
    id: newId(),
    ownerId,
    petId,
    now: deps.clock.now(),
  });
  return toVisitView(row);
}
