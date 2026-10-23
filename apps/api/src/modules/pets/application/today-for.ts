import type { LocalDate } from '../../../platform/calendar/local-date.js';
import { todayIn } from '../../../platform/calendar/today.js';
import { UnauthenticatedError } from '../../../platform/errors/app-error.js';
import type { PetsAppDeps } from './pets-deps.js';
import type { Trx } from './ports.js';

/** Hôm nay theo múi giờ tài khoản; `lock` khóa dòng user tới hết transaction. */
export async function todayFor(
  deps: PetsAppDeps,
  trx: Trx,
  ownerId: string,
  lock = false,
): Promise<LocalDate> {
  const tz = lock
    ? await deps.pets.lockOwnerTimezone(trx, ownerId)
    : await deps.pets.ownerTimezone(trx, ownerId);
  if (tz === undefined) throw new UnauthenticatedError();
  return todayIn(tz, deps.clock.now());
}
