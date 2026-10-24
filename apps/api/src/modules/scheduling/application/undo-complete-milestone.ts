import { ConflictError, NotFoundError } from '../../../platform/errors/app-error.js';
import { UNDO_WINDOW_MS } from './complete-milestone.js';
import { todayForOwner, toMilestoneView, type MilestoneView } from './milestone-view.js';
import type { SchedulingAppDeps, Trx } from './ports.js';
import { notPending } from './update-milestone.js';

const undoExpired = () => new ConflictError('UNDO_WINDOW_EXPIRED', 'Đã quá thời gian hoàn tác');

/**
 * `POST /milestones/{id}/undo-complete` (US-043): trong 15 s sau khi đánh dấu, đưa mốc về PENDING,
 * xóa mốc kế tiếp vừa tạo, mở lại thông báo về đúng trạng thái trước. Idempotent.
 */
export async function undoCompleteMilestone(
  deps: SchedulingAppDeps,
  trx: Trx,
  ownerId: string,
  id: string,
): Promise<{ milestone: MilestoneView }> {
  const today = await todayForOwner(deps, trx, ownerId);
  const current = await deps.milestones.lock(trx, ownerId, id);
  if (!current) throw new NotFoundError();
  if (current.status === 'PENDING') return { milestone: toMilestoneView(current, today) };
  if (current.status === 'CANCELLED' || !current.completed_at) throw notPending();

  const now = deps.clock.now();
  const completedAt = current.completed_at;
  if (now.getTime() - completedAt.getTime() > UNDO_WINDOW_MS) throw undoExpired();

  const deleted = await deps.milestones.deleteAutoNext(trx, ownerId, id);
  if (deleted === 0 && (await deps.milestones.findByPrevious(trx, ownerId, id))) {
    // Mốc kế tiếp đã bị sửa trạng thái (đánh dấu/hủy): không hoàn tác được nữa.
    throw undoExpired();
  }

  const row = await deps.milestones.update(trx, ownerId, id, {
    status: 'PENDING',
    done_on: null,
    completed_at: null,
    updated_at: now,
  });
  if (!row) throw new NotFoundError();
  await deps.events.publish(trx, {
    type: 'MilestoneUndone',
    milestoneId: id,
    ownerId,
    at: now,
    completedAt,
  });
  await deps.analytics.track(trx, 'milestone_undone');
  return { milestone: toMilestoneView(row, today) };
}
