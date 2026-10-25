import type { LocalDate } from '../../../platform/calendar/local-date.js';
import { todayIn } from '../../../platform/calendar/today.js';
import { UnauthenticatedError } from '../../../platform/errors/app-error.js';
import { toHHMM } from '../domain/routine.js';
import type { RoutineTaskRow, RoutinesAppDeps, Trx } from './ports.js';

export interface RoutineItem {
  id: string;
  petId: string;
  name: string;
  /** "HH:MM" */
  timeOfDay: string;
  /** Đã xong trong ngày `today` của tài khoản. */
  done: boolean;
}

export const toRoutineItem = (row: RoutineTaskRow, done: boolean): RoutineItem => ({
  id: row.id,
  petId: row.pet_id,
  name: row.name,
  timeOfDay: toHHMM(row.time_of_day),
  done,
});

/** Hôm nay theo múi giờ tài khoản (ClockPort). Client không gửi ngày. */
export async function todayForOwner(
  deps: Pick<RoutinesAppDeps, 'clock' | 'pets'>,
  trx: Trx,
  ownerId: string,
): Promise<LocalDate> {
  const tz = await deps.pets.ownerTimezone(trx, ownerId);
  if (tz === undefined) throw new UnauthenticatedError();
  return todayIn(tz, deps.clock.now());
}
