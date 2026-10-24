import { sql, type Kysely, type Selectable, type Transaction } from 'kysely';

import type { Notifications } from '../../../../platform/db/database.types.js';
import type { Database } from '../../../../platform/db/kysely.js';

type Trx = Transaction<Database>;
type Q = Kysely<Database> | Trx;
export type NotificationRow = Selectable<Notifications>;
export type Resolution = 'DONE' | 'CANCELLED' | 'RESCHEDULED';

/** Bảng `notifications` (+ cờ `users.notifications_synced_on`); mọi hàm lọc `owner_id`. */
export const notificationRepository = {
  /** Đánh dấu cần đồng bộ lại ở lần đọc kế tiếp (mọi command của mốc). */
  async markUnsynced(trx: Trx, ownerId: string): Promise<void> {
    await trx
      .updateTable('users')
      .set({ notifications_synced_on: null })
      .where('id', '=', ownerId)
      .execute();
  },

  /** Thông báo chưa resolve của mốc → resolve và coi như đã xem (đảm bảo 8). */
  async resolve(
    trx: Trx,
    ownerId: string,
    milestoneId: string,
    resolution: Resolution,
    now: Date,
  ): Promise<string[]> {
    const rows = await trx
      .updateTable('notifications')
      .set({
        resolved_at: now,
        resolution,
        read_at: sql<Date>`coalesce(read_at, ${now})`,
        read_reason: sql<string>`coalesce(read_reason, 'RESOLVED')`,
      })
      .where('owner_id', '=', ownerId)
      .where('milestone_id', '=', milestoneId)
      .where('resolved_at', 'is', null)
      .returning('id')
      .execute();
    return rows.map((r) => r.id);
  },

  /** Hoàn tác "đã thực hiện": mở lại thông báo bị resolve DONE từ lúc hoàn thành. */
  async unresolveDone(trx: Trx, ownerId: string, milestoneId: string, since: Date): Promise<void> {
    await trx
      .updateTable('notifications')
      .set({
        resolved_at: null,
        resolution: null,
        read_at: sql<Date | null>`CASE WHEN read_reason = 'RESOLVED' THEN NULL ELSE read_at END`,
        read_reason: sql<
          string | null
        >`CASE WHEN read_reason = 'RESOLVED' THEN NULL ELSE read_reason END`,
      })
      .where('owner_id', '=', ownerId)
      .where('milestone_id', '=', milestoneId)
      .where('resolution', '=', 'DONE')
      .where('resolved_at', '>=', since)
      .execute();
  },

  byMilestone(q: Q, ownerId: string, milestoneId: string): Promise<NotificationRow[]> {
    return q
      .selectFrom('notifications')
      .selectAll()
      .where('owner_id', '=', ownerId)
      .where('milestone_id', '=', milestoneId)
      .execute();
  },
};
