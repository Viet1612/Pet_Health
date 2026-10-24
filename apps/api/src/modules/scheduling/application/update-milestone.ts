import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../platform/errors/app-error.js';
import { validateMilestonePatch, type MilestoneType } from '../domain/milestone.js';
import { todayForOwner, toMilestoneView, type MilestoneView } from './milestone-view.js';
import type { SchedulingAppDeps, Trx } from './ports.js';

export const notPending = () =>
  new ConflictError('MILESTONE_NOT_PENDING', 'Mốc đã hoàn thành hoặc đã hủy');

/**
 * `PATCH /milestones/{id}` (US-046). Đổi hạn → `due_set_on = today` và thông báo cũ bị resolve
 * `RESCHEDULED`; sửa khác chỉ đánh dấu cần đồng bộ lại. Last-write-wins.
 */
export async function updateMilestone(
  deps: SchedulingAppDeps,
  trx: Trx,
  ownerId: string,
  id: string,
  raw: {
    type?: unknown;
    dueOn?: string | undefined;
    note?: string | null | undefined;
    cycleMonths?: number | null | undefined;
  },
): Promise<MilestoneView> {
  if (raw.type !== undefined) {
    throw new AppError(422, 'TYPE_IMMUTABLE', 'Không đổi được loại mốc sau khi tạo');
  }
  const current = await deps.milestones.lock(trx, ownerId, id);
  if (!current) throw new NotFoundError();
  if (current.status !== 'PENDING') throw notPending();

  const result = validateMilestonePatch(current.type as MilestoneType, raw);
  if (!result.ok) throw new ValidationError(result.errors);
  const today = await todayForOwner(deps, trx, ownerId);
  const now = deps.clock.now();
  const rescheduled = result.value.dueOn !== undefined && result.value.dueOn !== current.due_on;

  const row = await deps.milestones.update(trx, ownerId, id, {
    ...(rescheduled ? { due_on: result.value.dueOn, due_set_on: today } : {}),
    ...(result.value.note !== undefined ? { note: result.value.note } : {}),
    ...(result.value.cycleMonths !== undefined ? { cycle_months: result.value.cycleMonths } : {}),
    updated_at: now,
  });
  if (!row) throw new NotFoundError();
  await deps.events.publish(trx, {
    type: rescheduled ? 'MilestoneRescheduled' : 'MilestoneEdited',
    milestoneId: id,
    ownerId,
    at: now,
  });
  return toMilestoneView(row, today);
}
