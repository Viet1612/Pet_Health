import { NotFoundError } from '../../../platform/errors/app-error.js';
import type { HealthRecordsAppDeps, Trx } from './ports.js';

/** `DELETE /weights/{id}` (US-022). */
export async function deleteWeightEntry(
  deps: HealthRecordsAppDeps,
  trx: Trx,
  ownerId: string,
  id: string,
): Promise<void> {
  if (!(await deps.weights.delete(trx, ownerId, id))) throw new NotFoundError();
}
