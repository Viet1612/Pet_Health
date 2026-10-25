import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../platform/errors/app-error.js';
import { newId } from '../../../platform/ids.js';
import {
  MAX_ROUTINES_PER_PET,
  validateNewRoutine,
  validateRoutinePatch,
} from '../domain/routine.js';
import type { RoutinesAppDeps, Trx } from './ports.js';
import { todayForOwner, toRoutineItem, type RoutineItem } from './routine-view.js';

/** `GET /pets/{petId}/routines` (US-051): checklist hôm nay của một thú cưng. */
export async function listRoutines(
  deps: RoutinesAppDeps,
  trx: Trx,
  ownerId: string,
  petId: string,
): Promise<{ today: string; doneCount: number; totalCount: number; items: RoutineItem[] }> {
  if (!(await deps.pets.getOwnedPet(trx, ownerId, petId))) throw new NotFoundError();
  const today = await todayForOwner(deps, trx, ownerId);
  const rows = await deps.routines.listActive(trx, ownerId, [petId], today);
  const items = rows.map((r) => toRoutineItem(r, r.done));
  return {
    today,
    doneCount: items.filter((i) => i.done).length,
    totalCount: items.length,
    items,
  };
}

/**
 * `POST /pets/{petId}/routines` (US-050). Khóa dòng thú cưng để hai request song song không vượt
 * 20 việc.
 */
export async function createRoutine(
  deps: RoutinesAppDeps,
  trx: Trx,
  ownerId: string,
  petId: string,
  raw: { name: string; timeOfDay: string },
): Promise<RoutineItem> {
  if (!(await deps.pets.lockOwnedPet(trx, ownerId, petId))) throw new NotFoundError();
  const result = validateNewRoutine(raw);
  if (!result.ok) throw new ValidationError(result.errors);
  if ((await deps.routines.countActive(trx, ownerId, petId)) >= MAX_ROUTINES_PER_PET) {
    throw new ConflictError(
      'ROUTINE_LIMIT_REACHED',
      `Mỗi thú cưng có tối đa ${String(MAX_ROUTINES_PER_PET)} việc hằng ngày`,
      { params: { max: MAX_ROUTINES_PER_PET } },
    );
  }
  const row = await deps.routines.insert(trx, {
    id: newId(),
    owner_id: ownerId,
    pet_id: petId,
    name: result.value.name,
    time_of_day: result.value.timeOfDay,
    created_at: deps.clock.now(),
  });
  return toRoutineItem(row, false);
}

/** `PATCH /routines/{id}` (US-045): last-write-wins; completion hôm nay giữ nguyên. */
export async function updateRoutine(
  deps: RoutinesAppDeps,
  trx: Trx,
  ownerId: string,
  id: string,
  raw: { name?: string | undefined; timeOfDay?: string | undefined },
): Promise<RoutineItem> {
  const result = validateRoutinePatch(raw);
  if (!result.ok) throw new ValidationError(result.errors);
  const row = await deps.routines.update(trx, ownerId, id, {
    ...(result.value.name === undefined ? {} : { name: result.value.name }),
    ...(result.value.timeOfDay === undefined ? {} : { time_of_day: result.value.timeOfDay }),
  });
  if (!row) throw new NotFoundError();
  const today = await todayForOwner(deps, trx, ownerId);
  return toRoutineItem(row, await deps.routines.isDone(trx, id, today));
}

/** `DELETE /routines/{id}`: xóa mềm, lịch sử hoàn thành giữ nguyên (SD-008, FR-RT-005). */
export async function deleteRoutine(
  deps: RoutinesAppDeps,
  trx: Trx,
  ownerId: string,
  id: string,
): Promise<void> {
  if (!(await deps.routines.softDelete(trx, ownerId, id, deps.clock.now()))) {
    throw new NotFoundError();
  }
}

/** `PUT /routines/{id}/completion` (US-052): idempotent; ngày do server tính. */
export async function setRoutineCompletion(
  deps: RoutinesAppDeps,
  trx: Trx,
  ownerId: string,
  id: string,
  done: boolean,
): Promise<{ localDate: string; done: boolean }> {
  if (!(await deps.routines.findActive(trx, ownerId, id))) throw new NotFoundError();
  const today = await todayForOwner(deps, trx, ownerId);
  if (done) await deps.routines.markDone(trx, ownerId, id, today, deps.clock.now());
  else await deps.routines.unmarkDone(trx, id, today);
  return { localDate: today, done };
}
