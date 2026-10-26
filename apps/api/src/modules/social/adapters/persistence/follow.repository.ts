import { sql, type Kysely, type Transaction } from 'kysely';

import type { Database } from '../../../../platform/db/kysely.js';

type Q = Kysely<Database> | Transaction<Database>;

/** Một dòng người dùng trong danh sách theo dõi / kết quả tìm kiếm. */
export interface PersonRow {
  user_id: string;
  username: string;
  display_name: string;
  avatar_key: string | null;
  followed_by_me: boolean;
}

/** Danh sách theo dõi: thêm thời điểm theo dõi để phân trang keyset. */
export interface FollowListRow extends PersonRow {
  followed_at: Date;
}

/** Bảng `follows` (F-07). Dưới RLS: bỏ người đã chặn nhau; ghi chỉ bởi người theo dõi. */
export const followRepository = {
  /** Theo dõi (idempotent); `true` nếu vừa tạo dòng mới. */
  async follow(q: Q, followerId: string, followeeId: string, now: Date): Promise<boolean> {
    const res = await q
      .insertInto('follows')
      .values({ follower_id: followerId, followee_id: followeeId, created_at: now })
      .onConflict((oc) => oc.doNothing())
      .returning('follower_id')
      .executeTakeFirst();
    return res !== undefined;
  },

  /** Bỏ theo dõi (idempotent); `true` nếu vừa xóa. */
  async unfollow(q: Q, followerId: string, followeeId: string): Promise<boolean> {
    const res = await q
      .deleteFrom('follows')
      .where('follower_id', '=', followerId)
      .where('followee_id', '=', followeeId)
      .executeTakeFirst();
    return res.numDeletedRows > 0n;
  },

  async followerCount(q: Q, userId: string): Promise<number> {
    const row = await q
      .selectFrom('follows')
      .select((eb) => eb.fn.countAll<string>().as('n'))
      .where('followee_id', '=', userId)
      .executeTakeFirstOrThrow();
    return Number(row.n);
  },

  /**
   * Người theo dõi (`side = 'followers'`) hoặc đang theo dõi (`'following'`) của `userId`, mới
   * nhất trước, keyset `(created_at, user_id)`. Chỉ người có hồ sơ công khai.
   */
  async list(
    q: Q,
    viewerId: string,
    userId: string,
    side: 'followers' | 'following',
    after: { at: Date; id: string } | null,
    limit: number,
  ): Promise<FollowListRow[]> {
    const mine = side === 'followers' ? sql.ref('f.followee_id') : sql.ref('f.follower_id');
    const other = side === 'followers' ? sql.ref('f.follower_id') : sql.ref('f.followee_id');
    const { rows } = await sql<FollowListRow>`
      SELECT pr.user_id, pr.username, pr.display_name, pr.avatar_key,
             f.created_at AS followed_at,
             EXISTS (SELECT 1 FROM follows me
                     WHERE me.follower_id = ${viewerId} AND me.followee_id = pr.user_id)
               AS followed_by_me
      FROM follows f
      JOIN profiles pr ON pr.user_id = ${other}
      WHERE ${mine} = ${userId}
        ${after ? sql`AND (f.created_at, pr.user_id) < (${after.at}, ${after.id})` : sql``}
      ORDER BY f.created_at DESC, pr.user_id DESC
      LIMIT ${limit}`.execute(q);
    return rows;
  },

  /**
   * Tìm hồ sơ: tiền tố username hoặc chuỗi con của tên hiển thị, so sánh không dấu, không phân biệt
   * hoa thường (`social_fold`). Username khớp chính xác lên đầu, rồi người nhiều người theo dõi hơn.
   */
  async search(q: Q, viewerId: string, raw: string, limit: number): Promise<PersonRow[]> {
    // Thoát ký tự đặc biệt của LIKE (ký tự thoát mặc định là `\`).
    const escaped = raw.replace(/[\\%_]/g, (c) => `\\${c}`);
    const { rows } = await sql<PersonRow>`
      SELECT pr.user_id, pr.username, pr.display_name, pr.avatar_key,
             EXISTS (SELECT 1 FROM follows me
                     WHERE me.follower_id = ${viewerId} AND me.followee_id = pr.user_id)
               AS followed_by_me
      FROM profiles pr
      WHERE lower(pr.username::text) LIKE lower(${escaped}) || '%'
         OR social_fold(pr.display_name) LIKE '%' || social_fold(${escaped}) || '%'
      ORDER BY (lower(pr.username::text) = lower(${raw})) DESC,
               (SELECT count(*) FROM follows f WHERE f.followee_id = pr.user_id) DESC,
               pr.username
      LIMIT ${limit}`.execute(q);
    return rows;
  },
};
