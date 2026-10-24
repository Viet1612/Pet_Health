import type { Transaction } from 'kysely';

import type { Database } from '../../../platform/db/kysely.js';
import { notificationRepository } from '../adapters/persistence/notification.repository.js';

/**
 * Sự kiện mốc mà `notifications` cần biết. Khai báo lại ở đây (không import `scheduling`): bus ở
 * composition root nối hai mô-đun.
 */
export interface MilestoneEventInput {
  type:
    | 'MilestoneCreated'
    | 'MilestoneEdited'
    | 'MilestoneRescheduled'
    | 'MilestoneCancelled'
    | 'MilestoneCompleted'
    | 'MilestoneUndone';
  milestoneId: string;
  ownerId: string;
  at: Date;
  completedAt?: Date;
}

/**
 * Handler đồng bộ, chạy trong transaction của command mốc:
 * - Đổi hạn / hủy / hoàn thành → resolve thông báo đang mở (RESCHEDULED / CANCELLED / DONE).
 * - Hoàn tác → mở lại thông báo bị resolve DONE từ lúc hoàn thành.
 * - Mọi sự kiện → `users.notifications_synced_on = NULL` (đồng bộ lại ở lần đọc kế tiếp).
 */
export async function onMilestoneEvent(
  trx: Transaction<Database>,
  event: MilestoneEventInput,
): Promise<void> {
  const repo = notificationRepository;
  switch (event.type) {
    case 'MilestoneRescheduled':
      await repo.resolve(trx, event.ownerId, event.milestoneId, 'RESCHEDULED', event.at);
      break;
    case 'MilestoneCancelled':
      await repo.resolve(trx, event.ownerId, event.milestoneId, 'CANCELLED', event.at);
      break;
    case 'MilestoneCompleted':
      await repo.resolve(trx, event.ownerId, event.milestoneId, 'DONE', event.at);
      break;
    case 'MilestoneUndone':
      if (event.completedAt) {
        await repo.unresolveDone(trx, event.ownerId, event.milestoneId, event.completedAt);
      }
      break;
    case 'MilestoneCreated':
    case 'MilestoneEdited':
      break;
  }
  await repo.markUnsynced(trx, event.ownerId);
}
