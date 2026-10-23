import { toPetView, type PetView } from './pet-view.js';
import type { PetsAppDeps } from './pets-deps.js';
import type { Trx } from './ports.js';
import { todayFor } from './today-for.js';

/** Danh sách thú cưng của tài khoản, cũ nhất trước (`created_at`, `id`). */
export async function listPets(deps: PetsAppDeps, trx: Trx, ownerId: string): Promise<PetView[]> {
  const today = await todayFor(deps, trx, ownerId);
  const rows = await deps.pets.listByOwner(trx, ownerId);
  return rows.map((row) => toPetView(row, today));
}
