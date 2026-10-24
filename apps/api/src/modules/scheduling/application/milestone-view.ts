import type { LocalDate } from '../../../platform/calendar/local-date.js';
import { todayIn } from '../../../platform/calendar/today.js';
import { UnauthenticatedError } from '../../../platform/errors/app-error.js';
import {
  daysUntilDue,
  displayStatus,
  type DisplayStatus,
  type MilestoneStatus,
} from '../domain/display-status.js';
import type { MilestoneOrigin, MilestoneType } from '../domain/milestone.js';
import type { MilestoneRow, SchedulingAppDeps, Trx } from './ports.js';

export interface MilestoneView {
  id: string;
  petId: string;
  type: MilestoneType;
  dueOn: string;
  dueSetOn: string;
  note: string | null;
  cycleMonths: number | null;
  status: MilestoneStatus;
  displayStatus: DisplayStatus;
  /** `dueOn − today` khi PENDING (âm = quá hạn), `null` khi khác. */
  daysUntilDue: number | null;
  doneOn: string | null;
  origin: MilestoneOrigin;
  previousId: string | null;
  createdAt: string;
}

export function toMilestoneView(row: MilestoneRow, today: LocalDate): MilestoneView {
  const status = row.status as MilestoneStatus;
  const dueOn = row.due_on as LocalDate;
  return {
    id: row.id,
    petId: row.pet_id,
    type: row.type as MilestoneType,
    dueOn: row.due_on,
    dueSetOn: row.due_set_on,
    note: row.note,
    cycleMonths: row.cycle_months,
    status,
    displayStatus: displayStatus({ status, dueOn }, today),
    daysUntilDue: status === 'PENDING' ? daysUntilDue(dueOn, today) : null,
    doneOn: row.done_on,
    origin: row.origin as MilestoneOrigin,
    previousId: row.previous_id,
    createdAt: row.created_at.toISOString(),
  };
}

/** Hôm nay theo múi giờ tài khoản (ClockPort, không dùng now() của SQL để FakeClock chi phối). */
export async function todayForOwner(
  deps: SchedulingAppDeps,
  trx: Trx,
  ownerId: string,
): Promise<LocalDate> {
  const tz = await deps.pets.ownerTimezone(trx, ownerId);
  if (tz === undefined) throw new UnauthenticatedError();
  return todayIn(tz, deps.clock.now());
}
