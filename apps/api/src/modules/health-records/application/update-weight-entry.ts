import { NotFoundError } from '../../../platform/errors/app-error.js';
import type { HealthRecordsAppDeps, Trx } from './ports.js';
import {
  todayForOwner,
  toWeightEntryView,
  validateWeightInput,
  type WeightEntryView,
} from './weight-input.js';

/** `PATCH /weights/{id}` (US-022): cùng quy tắc như POST, last-write-wins. */
export async function updateWeightEntry(
  deps: HealthRecordsAppDeps,
  trx: Trx,
  ownerId: string,
  id: string,
  input: { weightKg?: string | undefined; measuredOn?: string | undefined },
): Promise<WeightEntryView> {
  const today = await todayForOwner(deps, trx, ownerId);
  const valid = validateWeightInput(input, today);
  const row = await deps.weights.update(trx, ownerId, id, valid);
  if (!row) throw new NotFoundError();
  return toWeightEntryView(row);
}
