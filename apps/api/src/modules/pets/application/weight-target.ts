import { NotFoundError, ValidationError } from '../../../platform/errors/app-error.js';
import {
  formatTenths,
  parseWeightKg,
  WEIGHT_RANGE_MESSAGE,
  WEIGHT_RANGE_PARAMS,
} from '../../health-records/domain/weight.js';
import type { PetsAppDeps } from './pets-deps.js';
import type { Trx } from './ports.js';

/** `PUT /pets/{petId}/weight-target` (US-023): đặt cân nặng mục tiêu, trả `"9.0"`. */
export async function setWeightTarget(
  deps: PetsAppDeps,
  trx: Trx,
  ownerId: string,
  petId: string,
  weightKg: string,
): Promise<{ weightKg: string }> {
  const tenths = parseWeightKg(weightKg);
  if (tenths === null) {
    throw new ValidationError([
      {
        field: 'weightKg',
        code: 'OUT_OF_RANGE',
        message: WEIGHT_RANGE_MESSAGE,
        params: WEIGHT_RANGE_PARAMS,
      },
    ]);
  }
  const value = formatTenths(tenths);
  const found = await deps.pets.setWeightTarget(trx, ownerId, petId, value, deps.clock.now());
  if (!found) throw new NotFoundError();
  return { weightKg: value };
}

/** `DELETE /pets/{petId}/weight-target`: chưa có mục tiêu vẫn thành công. */
export async function clearWeightTarget(
  deps: PetsAppDeps,
  trx: Trx,
  ownerId: string,
  petId: string,
): Promise<void> {
  const found = await deps.pets.setWeightTarget(trx, ownerId, petId, null, deps.clock.now());
  if (!found) throw new NotFoundError();
}
