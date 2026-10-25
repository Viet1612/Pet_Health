import { diffDays, parseLocalDate, type LocalDate } from '../../../platform/calendar/local-date.js';
import { NotFoundError, ValidationError } from '../../../platform/errors/app-error.js';
import { newId } from '../../../platform/ids.js';
import type { MilestoneType } from '../domain/milestone.js';
import { nextDueOn } from '../domain/next-milestone.js';
import { todayForOwner, toMilestoneView, type MilestoneView } from './milestone-view.js';
import type { MilestoneRow, SchedulingAppDeps, Trx } from './ports.js';
import { notPending } from './update-milestone.js';

/** Server cho hoàn tác 15 s; client chỉ hiện 10 s để chịu được độ trễ mạng (AD-017). */
export const UNDO_WINDOW_MS = 15_000;

export interface CompleteResult {
  milestone: MilestoneView;
  nextMilestone: MilestoneView | null;
  resolvedNotificationIds: string[];
  undoExpiresAt: string;
}

/**
 * `POST /milestones/{id}/complete` (US-042, 043): đánh dấu đã thực hiện, resolve thông báo, tạo mốc
 * kế tiếp (hạn tính từ ngày thực hiện). Idempotent: gọi lại cùng `doneOn` trả cùng kết quả, chỉ
 * có 1 mốc kế tiếp; khác `doneOn` → 409.
 */
export async function completeMilestone(
  deps: SchedulingAppDeps,
  trx: Trx,
  ownerId: string,
  id: string,
  rawDoneOn: string,
): Promise<CompleteResult> {
  let doneOn: LocalDate;
  try {
    doneOn = parseLocalDate(rawDoneOn);
  } catch {
    throw new ValidationError([
      { field: 'doneOn', code: 'INVALID_DATE', message: 'Ngày không hợp lệ' },
    ]);
  }
  const today = await todayForOwner(deps, trx, ownerId);
  if (doneOn > today) {
    throw new ValidationError([
      { field: 'doneOn', code: 'FUTURE_DATE', message: 'Ngày không được ở tương lai' },
    ]);
  }
  const now = deps.clock.now();

  // Khóa lạc quan: request song song chờ dòng, sau đó không còn khớp PENDING → nhánh dưới.
  const done = await deps.milestones.completeIfPending(trx, ownerId, id, doneOn, now);
  if (!done) {
    const current = await deps.milestones.findById(trx, ownerId, id);
    if (!current) throw new NotFoundError();
    if (current.status === 'DONE' && current.done_on === doneOn) {
      return resultOf(deps, trx, ownerId, current, today);
    }
    throw notPending();
  }

  await deps.events.publish(trx, { type: 'MilestoneCompleted', milestoneId: id, ownerId, at: now });

  const type = done.type as MilestoneType;
  const nextDue = nextDueOn(type, done.cycle_months, doneOn);
  if (nextDue) {
    await deps.milestones.insertNext(trx, {
      id: newId(),
      owner_id: ownerId,
      pet_id: done.pet_id,
      type,
      due_on: nextDue,
      due_set_on: today,
      note: done.note,
      cycle_months: done.cycle_months,
      status: 'PENDING',
      origin: 'AUTO',
      previous_id: id,
      created_at: now,
      updated_at: now,
    });
    await deps.analytics.track(
      trx,
      'milestone_auto_created',
      { type: type.toLowerCase(), cycle_months: done.cycle_months ?? 12 },
      ownerId,
    );
  }
  await deps.analytics.track(
    trx,
    'milestone_completed',
    { type: type.toLowerCase(), days_from_due: diffDays(doneOn, done.due_on as LocalDate) },
    ownerId,
  );
  return resultOf(deps, trx, ownerId, done, today);
}

/** Dựng phản hồi từ dữ liệu hiện có (dùng cả cho lần gọi lại idempotent). */
async function resultOf(
  deps: SchedulingAppDeps,
  trx: Trx,
  ownerId: string,
  row: MilestoneRow,
  today: LocalDate,
): Promise<CompleteResult> {
  const completedAt = row.completed_at ?? deps.clock.now();
  const [next, notes] = await Promise.all([
    deps.milestones.findByPrevious(trx, ownerId, row.id),
    deps.notifications.byMilestone(trx, ownerId, row.id),
  ]);
  return {
    milestone: toMilestoneView(row, today),
    nextMilestone: next ? toMilestoneView(next, today) : null,
    resolvedNotificationIds: notes
      .filter((n) => n.resolution === 'DONE' && n.resolvedAt?.getTime() === completedAt.getTime())
      .map((n) => n.id),
    undoExpiresAt: new Date(completedAt.getTime() + UNDO_WINDOW_MS).toISOString(),
  };
}
