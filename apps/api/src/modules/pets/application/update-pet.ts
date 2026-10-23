import { NotFoundError, ValidationError } from '../../../platform/errors/app-error.js';
import { validatePetInput, type RawPetInput } from '../domain/pet.js';
import { toPetView, type PetView } from './pet-view.js';
import type { PetsAppDeps } from './pets-deps.js';
import type { Trx } from './ports.js';
import { todayFor } from './today-for.js';

/** Sửa hồ sơ (US-013), last-write-wins. Của người khác hoặc không tồn tại đều 404. */
export async function updatePet(
  deps: PetsAppDeps,
  trx: Trx,
  ownerId: string,
  petId: string,
  raw: RawPetInput,
): Promise<PetView> {
  const today = await todayFor(deps, trx, ownerId);
  const result = validatePetInput(raw, today, 'patch');
  if (!result.ok) throw new ValidationError(result.errors);
  const row = await deps.pets.update(trx, ownerId, petId, result.value, deps.clock.now());
  if (!row) throw new NotFoundError();
  return toPetView(row, today);
}
