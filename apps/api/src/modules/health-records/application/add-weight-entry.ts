import { NotFoundError } from '../../../platform/errors/app-error.js';
import { newId } from '../../../platform/ids.js';
import type { HealthRecordsAppDeps, Trx } from './ports.js';
import {
  todayForOwner,
  toWeightEntryView,
  validateWeightInput,
  type WeightEntryView,
} from './weight-input.js';

/** `POST /pets/{petId}/weights` (US-020): thiếu `measuredOn` thì lấy hôm nay theo múi giờ tài khoản. */
export async function addWeightEntry(
  deps: HealthRecordsAppDeps,
  trx: Trx,
  ownerId: string,
  petId: string,
  input: { weightKg: string; measuredOn?: string | undefined },
): Promise<WeightEntryView> {
  const pet = await deps.pets.getOwnedPet(trx, ownerId, petId);
  if (!pet) throw new NotFoundError();
  const today = await todayForOwner(deps, trx, ownerId);
  const valid = validateWeightInput(input, today);
  const row = await deps.weights.insert(trx, {
    id: newId(),
    ownerId,
    petId,
    measuredOn: valid.measuredOn ?? today,
    weightKg: valid.weightKg ?? input.weightKg,
    createdAt: deps.clock.now(),
  });
  return toWeightEntryView(row);
}
