import { NotFoundError } from '../../../platform/errors/app-error.js';
import { toPetView, type PetView } from './pet-view.js';
import type { PetsAppDeps } from './pets-deps.js';
import type { Trx } from './ports.js';
import { todayFor } from './today-for.js';

export async function getPet(
  deps: PetsAppDeps,
  trx: Trx,
  ownerId: string,
  petId: string,
): Promise<PetView> {
  const row = await deps.pets.findById(trx, ownerId, petId);
  if (!row) throw new NotFoundError();
  return toPetView(row, await todayFor(deps, trx, ownerId));
}
