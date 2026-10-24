import { ConflictError, ValidationError } from '../../../platform/errors/app-error.js';
import { newId } from '../../../platform/ids.js';
import { PET_LIMIT, validatePetInput, type RawPetInput } from '../domain/pet.js';
import { toPetView, type PetView } from './pet-view.js';
import type { PetsAppDeps } from './pets-deps.js';
import type { Trx } from './ports.js';
import { todayFor } from './today-for.js';

/**
 * Tạo thú cưng (US-010). Khóa dòng user trước khi đếm, để hai request song song không cùng thấy
 * 9 con rồi cùng tạo (BRU-009).
 */
export async function createPet(
  deps: PetsAppDeps,
  trx: Trx,
  ownerId: string,
  raw: RawPetInput,
): Promise<PetView> {
  const today = await todayFor(deps, trx, ownerId, true);
  if ((await deps.pets.countByOwner(trx, ownerId)) >= PET_LIMIT) {
    throw new ConflictError('PET_LIMIT_REACHED', `Đã đạt tối đa ${String(PET_LIMIT)} thú cưng`, {
      params: { max: PET_LIMIT },
    });
  }
  const result = validatePetInput(raw, today, 'create');
  if (!result.ok) throw new ValidationError(result.errors);
  const row = await deps.pets.insert(trx, {
    ...result.value,
    id: newId(),
    ownerId,
    now: deps.clock.now(),
  });
  return toPetView(row, today);
}
