import { sql, type Kysely, type Transaction } from 'kysely';

import type { Database } from '../../../../platform/db/kysely.js';

type Q = Kysely<Database> | Transaction<Database>;

/** Bảng `blocks` (F-12). Đọc: cả hai bên; ghi: chỉ người chặn (RLS F-03). */
export const blockRepository = {
  async isBlocking(q: Q, blockerId: string, blockedId: string): Promise<boolean> {
    const row = await q
      .selectFrom('blocks')
      .select('blocker_id')
      .where('blocker_id', '=', blockerId)
      .where('blocked_id', '=', blockedId)
      .executeTakeFirst();
    return row !== undefined;
  },

  /**
   * Dọn dữ liệu giữa hai người **trước** khi ghi dòng chặn (sau đó RLS không còn thấy nhau): follow
   * hai chiều, tim và bình luận của người bị chặn trên bài của mình, thông báo hai chiều.
   */
  async cleanup(q: Q, me: string, other: string): Promise<void> {
    await q
      .deleteFrom('follows')
      .where((eb) =>
        eb.or([
          eb.and([eb('follower_id', '=', me), eb('followee_id', '=', other)]),
          eb.and([eb('follower_id', '=', other), eb('followee_id', '=', me)]),
        ]),
      )
      .execute();
    await sql`
      DELETE FROM post_likes l USING posts p
      WHERE l.post_id = p.id AND p.owner_id = ${me} AND l.user_id = ${other}`.execute(q);
    await sql`
      DELETE FROM post_comments c USING posts p
      WHERE c.post_id = p.id AND p.owner_id = ${me} AND c.owner_id = ${other}`.execute(q);
    await q
      .deleteFrom('social_notifications')
      .where((eb) =>
        eb.or([
          eb.and([eb('owner_id', '=', me), eb('actor_id', '=', other)]),
          eb.and([eb('owner_id', '=', other), eb('actor_id', '=', me)]),
        ]),
      )
      .execute();
  },

  async block(q: Q, blockerId: string, blockedId: string, now: Date): Promise<void> {
    await q
      .insertInto('blocks')
      .values({ blocker_id: blockerId, blocked_id: blockedId, created_at: now })
      .onConflict((oc) => oc.doNothing())
      .execute();
  },

  async unblock(q: Q, blockerId: string, blockedId: string): Promise<void> {
    await q
      .deleteFrom('blocks')
      .where('blocker_id', '=', blockerId)
      .where('blocked_id', '=', blockedId)
      .execute();
  },

  /** Người mình đã chặn, mới nhất trước. */
  list(
    q: Q,
    blockerId: string,
  ): Promise<
    { user_id: string; username: string; display_name: string; avatar_key: string | null }[]
  > {
    return q
      .selectFrom('blocks as b')
      .innerJoin('profiles as pr', 'pr.user_id', 'b.blocked_id')
      .select(['pr.user_id', 'pr.username', 'pr.display_name', 'pr.avatar_key'])
      .where('b.blocker_id', '=', blockerId)
      .orderBy('b.created_at', 'desc')
      .limit(500)
      .execute();
  },
};
