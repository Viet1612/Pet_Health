import { NotFoundError } from '../../../platform/errors/app-error.js';
import { todayForOwner, toMilestoneView, type MilestoneView } from './milestone-view.js';
import type { SchedulingAppDeps, Trx } from './ports.js';

export interface MilestoneGroups {
  today: string;
  upcoming: MilestoneView[];
  overdue: MilestoneView[];
  done: MilestoneView[];
  cancelled: MilestoneView[];
}

/**
 * `GET /pets/{petId}/milestones` (FR-MS-012): Sắp tới và Quá hạn theo hạn tăng dần; Đã thực hiện
 * theo ngày thực hiện giảm dần; Đã hủy theo lúc hủy giảm dần.
 */
export async function listMilestonesByPet(
  deps: SchedulingAppDeps,
  trx: Trx,
  ownerId: string,
  petId: string,
): Promise<MilestoneGroups> {
  const pet = await deps.pets.getOwnedPet(trx, ownerId, petId);
  if (!pet) throw new NotFoundError();
  const today = await todayForOwner(deps, trx, ownerId);
  const rows = await deps.milestones.listByPet(trx, ownerId, petId);

  const byDue = (a: { due_on: string }, b: { due_on: string }) => a.due_on.localeCompare(b.due_on);
  const pending = rows.filter((r) => r.status === 'PENDING').sort(byDue);
  const done = rows
    .filter((r) => r.status === 'DONE')
    .sort(
      (a, b) =>
        (b.done_on ?? '').localeCompare(a.done_on ?? '') ||
        (b.completed_at?.getTime() ?? 0) - (a.completed_at?.getTime() ?? 0),
    );
  const cancelled = rows
    .filter((r) => r.status === 'CANCELLED')
    .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
  const view = (r: (typeof rows)[number]) => toMilestoneView(r, today);

  return {
    today,
    upcoming: pending.filter((r) => r.due_on >= today).map(view),
    overdue: pending.filter((r) => r.due_on < today).map(view),
    done: done.map(view),
    cancelled: cancelled.map(view),
  };
}
