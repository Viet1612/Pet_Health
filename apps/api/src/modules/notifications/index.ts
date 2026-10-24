import type { Transaction } from 'kysely';

import type { Database } from '../../platform/db/kysely.js';
import { notificationRepository } from './adapters/persistence/notification.repository.js';

export { onMilestoneEvent, type MilestoneEventInput } from './application/on-milestone-event.js';

/** Trạng thái thông báo của một mốc, cho chi tiết mốc (`scheduling`). */
export const notificationQuery = {
  async byMilestone(trx: Transaction<Database>, ownerId: string, milestoneId: string) {
    const rows = await notificationRepository.byMilestone(trx, ownerId, milestoneId);
    return rows.map((r) => ({
      id: r.id,
      level: r.level,
      dueOnSnapshot: r.due_on_snapshot,
      readAt: r.read_at,
      resolvedAt: r.resolved_at,
      resolution: r.resolution,
    }));
  },
};
