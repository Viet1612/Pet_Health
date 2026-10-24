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

  async getSyncedOn(trx: Trx, ownerId: string): Promise<string | null> {
    const row = await trx
      .selectFrom('users')
      .select('notifications_synced_on')
      .where('id', '=', ownerId)
      .executeTakeFirst();
    return row?.notifications_synced_on ?? null;
  },

  async setSyncedOn(trx: Trx, ownerId: string, day: string): Promise<void> {
    await trx
      .updateTable('users')
      .set({ notifications_synced_on: day })
      .where('id', '=', ownerId)
      .execute();
  },

  /** Chèn, trùng `(milestone_id, channel, level, due_on_snapshot)` thì bỏ qua; trả dòng thật sự chèn. */
  async insertMany(
    trx: Trx,
    rows: {
      id: string;
      owner_id: string;
      milestone_id: string;
      level: string;
      due_on_snapshot: string;
      appear_on: string;
      created_at: Date;
    }[],
  ): Promise<{ id: string; milestone_id: string }[]> {
    if (rows.length === 0) return [];
    return trx
      .insertInto('notifications')
      .values(rows.map((r) => ({ ...r, channel: 'in_app' })))
      .onConflict((oc) =>
        oc.columns(['milestone_id', 'channel', 'level', 'due_on_snapshot']).doNothing(),
      )
      .returning(['id', 'milestone_id'])
      .execute();
  },

  /** Mức muộn hơn vừa xuất hiện → mức cũ chưa xem coi như đã xem (`SUPERSEDED`). */
  async supersede(
    trx: Trx,
    ownerId: string,
    milestoneIds: string[],
    keepIds: string[],
    now: Date,
  ): Promise<void> {
    if (milestoneIds.length === 0) return;
    await trx
      .updateTable('notifications')
      .set({ read_at: now, read_reason: 'SUPERSEDED' })
      .where('owner_id', '=', ownerId)
      .where('milestone_id', 'in', milestoneIds)
      .where('id', 'not in', keepIds)
      .where('read_at', 'is', null)
      .execute();
  },

  listUnread(q: Q, ownerId: string): Promise<NotificationRow[]> {
    return q
      .selectFrom('notifications')
      .selectAll()
      .where('owner_id', '=', ownerId)
      .where('read_at', 'is', null)
      .execute();
  },

  async countUnread(q: Q, ownerId: string): Promise<number> {
    const row = await q
      .selectFrom('notifications')
      .select((eb) => eb.fn.countAll<string>().as('n'))
      .where('owner_id', '=', ownerId)
      .where('read_at', 'is', null)
      .executeTakeFirstOrThrow();
    return Number(row.n);
  },

  /** Danh sách: `appear_on DESC, level_rank DESC, id DESC`, keyset sau `after`. */
  list(
    q: Q,
    ownerId: string,
    since: string,
    after: { appearOn: string; rank: number; id: string } | null,
    limit: number,
  ): Promise<NotificationRow[]> {
    const rank = sql<number>`CASE level WHEN 'OVERDUE' THEN 3 WHEN 'D1' THEN 2 ELSE 1 END`;
    let query = q
      .selectFrom('notifications')
      .selectAll()
      .where('owner_id', '=', ownerId)
      .where('appear_on', '>=', since);
    if (after) {
      query = query.where(
        sql<boolean>`(appear_on, ${rank}, id) < (${after.appearOn}::date, ${after.rank}::int, ${after.id}::uuid)`,
      );
    }
    return query
      .orderBy('appear_on', 'desc')
      .orderBy(rank, 'desc')
      .orderBy('id', 'desc')
      .limit(limit)
      .execute();
  },

  /** ID của người khác bị RLS và điều kiện `owner_id` loại, bỏ qua âm thầm. */
  async markRead(
    trx: Trx,
    ownerId: string,
    ids: string[],
    reason: 'USER' | 'BANNER',
    now: Date,
  ): Promise<void> {
    await trx
      .updateTable('notifications')
      .set({ read_at: now, read_reason: reason })
      .where('owner_id', '=', ownerId)
      .where('id', 'in', ids)
      .where('read_at', 'is', null)
      .execute();
  },

  /** Chỉ các thông báo tạo trước `upTo` (thông báo mới trên thiết bị khác vẫn chưa xem). */
  async markAllRead(trx: Trx, ownerId: string, upTo: Date, now: Date): Promise<void> {
    await trx
      .updateTable('notifications')
      .set({ read_at: now, read_reason: 'USER' })
      .where('owner_id', '=', ownerId)
      .where('read_at', 'is', null)
      .where('created_at', '<=', upTo < now ? upTo : now)
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
