import type { LocalDate } from '../../../platform/calendar/local-date.js';
import { NotFoundError } from '../../../platform/errors/app-error.js';
import { appearOn, type ReminderLevel } from '../../../platform/calendar/reminder-level.js';
import { todayForOwner, toMilestoneView, type MilestoneView } from './milestone-view.js';
import type { SchedulingAppDeps, Trx } from './ports.js';

export type ReminderState = 'PLANNED' | 'UNREAD' | 'READ' | 'RESOLVED';

export interface MilestoneDetail {
  today: string;
  milestone: MilestoneView;
  petName: string;
  /** Ngày thực hiện của mốc trước (mốc AUTO). */
  previousDoneOn: string | null;
  reminders: { level: ReminderLevel; appearOn: string; state: ReminderState }[];
}

const LEVELS: readonly ReminderLevel[] = ['D7', 'D1', 'OVERDUE'];

/**
 * `GET /milestones/{id}` (SCR-15). `reminders`: với mốc PENDING, các mức có `appearOn > dueSetOn`
 * (mức đã qua lúc đặt hạn không nhắc bù); mức đã tới mà không có thông báo thì bỏ. Mốc đã xong/hủy
 * chỉ trả các thông báo đã có.
 */
export async function getMilestoneDetail(
  deps: SchedulingAppDeps,
  trx: Trx,
  ownerId: string,
  id: string,
): Promise<MilestoneDetail> {
  const row = await deps.milestones.findById(trx, ownerId, id);
  if (!row) throw new NotFoundError();
  const today = await todayForOwner(deps, trx, ownerId);
  const [pet, previous, notes] = await Promise.all([
    deps.pets.getOwnedPet(trx, ownerId, row.pet_id),
    row.previous_id ? deps.milestones.findById(trx, ownerId, row.previous_id) : undefined,
    deps.notifications.byMilestone(trx, ownerId, id),
  ]);

  const stateOf = (n: (typeof notes)[number]): ReminderState =>
    n.resolvedAt ? 'RESOLVED' : n.readAt ? 'READ' : 'UNREAD';
  const dueOn = row.due_on as LocalDate;
  const reminders: MilestoneDetail['reminders'] = [];
  for (const level of LEVELS) {
    const existing = notes.find((n) => n.level === level && n.dueOnSnapshot === row.due_on);
    const day = appearOn(level, dueOn);
    if (row.status === 'PENDING') {
      if (day <= row.due_set_on) continue;
      if (existing) reminders.push({ level, appearOn: day, state: stateOf(existing) });
      else if (day > today) reminders.push({ level, appearOn: day, state: 'PLANNED' });
    } else if (existing) {
      reminders.push({ level, appearOn: day, state: stateOf(existing) });
    }
  }

  return {
    today,
    milestone: toMilestoneView(row, today),
    petName: pet?.name ?? '',
    previousDoneOn: previous?.done_on ?? null,
    reminders,
  };
}
