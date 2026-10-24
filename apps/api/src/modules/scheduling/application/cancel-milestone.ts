import { NotFoundError } from '../../../platform/errors/app-error.js';
import { todayForOwner, toMilestoneView, type MilestoneView } from './milestone-view.js';
import type { SchedulingAppDeps, Trx } from './ports.js';
import { notPending } from './update-milestone.js';

/** `POST /milestones/{id}/cancel` (US-047): idempotent; mốc đã DONE → 409. */
export async function cancelMilestone(
  deps: SchedulingAppDeps,
  trx: Trx,
  ownerId: string,
  id: string,
): Promise<MilestoneView> {
  const today = await todayForOwner(deps, trx, ownerId);
  const now = deps.clock.now();
  const row = await deps.milestones.cancelIfPending(trx, ownerId, id, now);
  if (row) {
    await deps.events.publish(trx, {
      type: 'MilestoneCancelled',
      milestoneId: id,
      ownerId,
      at: now,
    });
    return toMilestoneView(row, today);
  }
  const current = await deps.milestones.findById(trx, ownerId, id);
  if (!current) throw new NotFoundError();
  if (current.status === 'CANCELLED') return toMilestoneView(current, today);
  throw notPending();
}
