import { NotFoundError, ValidationError } from '../../../platform/errors/app-error.js';
import { newId } from '../../../platform/ids.js';
import { validateNewMilestone } from '../domain/milestone.js';
import { todayForOwner, toMilestoneView, type MilestoneView } from './milestone-view.js';
import type { SchedulingAppDeps, Trx } from './ports.js';

/**
 * `POST /pets/{petId}/milestones` (US-040). Không tạo thông báo nào; hạn đã qua → OVERDUE ngay và
 * không bao giờ có nhắc bù (mọi `appearOn ≤ due_set_on`).
 */
export async function createMilestone(
  deps: SchedulingAppDeps,
  trx: Trx,
  ownerId: string,
  petId: string,
  raw: {
    type: string;
    dueOn: string;
    note?: string | null | undefined;
    cycleMonths?: number | null | undefined;
  },
): Promise<MilestoneView> {
  const pet = await deps.pets.getOwnedPet(trx, ownerId, petId);
  if (!pet) throw new NotFoundError();
  const result = validateNewMilestone(raw);
  if (!result.ok) throw new ValidationError(result.errors);

  const today = await todayForOwner(deps, trx, ownerId);
  const now = deps.clock.now();
  const row = await deps.milestones.insert(trx, {
    id: newId(),
    owner_id: ownerId,
    pet_id: petId,
    type: result.value.type,
    due_on: result.value.dueOn,
    due_set_on: today,
    note: result.value.note,
    cycle_months: result.value.cycleMonths,
    status: 'PENDING',
    origin: 'MANUAL',
    created_at: now,
    updated_at: now,
  });
  await deps.events.publish(trx, {
    type: 'MilestoneCreated',
    milestoneId: row.id,
    ownerId,
    at: now,
  });
  return toMilestoneView(row, today);
}
