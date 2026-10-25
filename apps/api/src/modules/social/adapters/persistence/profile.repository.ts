import { sql, type Kysely, type Selectable, type Transaction } from 'kysely';

import type { Profiles } from '../../../../platform/db/database.types.js';
import type { Database } from '../../../../platform/db/kysely.js';

export type ProfileRow = Selectable<Profiles>;
type Q = Kysely<Database> | Transaction<Database>;

/**
 * Bảng `profiles` (F-02). Đọc dưới RLS `social_read` (người đã đăng nhập, trừ người đã chặn nhau);
 * ghi chỉ chủ (`user_id = app_user()`).
 */
export const profileRepository = {
  findByUser(q: Q, userId: string): Promise<ProfileRow | undefined> {
    return q.selectFrom('profiles').selectAll().where('user_id', '=', userId).executeTakeFirst();
  },

  findByUsername(q: Q, username: string): Promise<ProfileRow | undefined> {
    return q.selectFrom('profiles').selectAll().where('username', '=', username).executeTakeFirst();
  },

  insert(
    trx: Transaction<Database>,
    row: {
      userId: string;
      username: string;
      displayName: string;
      bio: string | null;
      now: Date;
    },
  ): Promise<ProfileRow> {
    return trx
      .insertInto('profiles')
      .values({
        user_id: row.userId,
        username: row.username,
        display_name: row.displayName,
        bio: row.bio,
        created_at: row.now,
        updated_at: row.now,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  update(
    trx: Transaction<Database>,
    userId: string,
    set: {
      username?: string;
      displayName: string;
      bio: string | null;
      now: Date;
    },
  ): Promise<ProfileRow | undefined> {
    return trx
      .updateTable('profiles')
      .set({
        display_name: set.displayName,
        bio: set.bio,
        updated_at: set.now,
        ...(set.username === undefined
          ? {}
          : { username: set.username, username_changed_at: set.now }),
      })
      .where('user_id', '=', userId)
      .returningAll()
      .executeTakeFirst();
  },

  async lockAvatarKey(
    trx: Transaction<Database>,
    userId: string,
  ): Promise<{ avatarKey: string | null } | undefined> {
    const row = await trx
      .selectFrom('profiles')
      .select('avatar_key')
      .where('user_id', '=', userId)
      .forUpdate()
      .executeTakeFirst();
    return row && { avatarKey: row.avatar_key };
  },

  async setAvatarKey(
    trx: Transaction<Database>,
    userId: string,
    key: string | null,
    now: Date,
  ): Promise<boolean> {
    const res = await trx
      .updateTable('profiles')
      .set({ avatar_key: key, updated_at: now })
      .where('user_id', '=', userId)
      .executeTakeFirst();
    return res.numUpdatedRows > 0n;
  },

  /** Số bài đã đăng, người theo dõi, đang theo dõi (dưới RLS: bỏ người đã chặn nhau). */
  async counts(
    q: Q,
    userId: string,
  ): Promise<{ postCount: number; followerCount: number; followingCount: number }> {
    const { rows } = await sql<{ posts: string; followers: string; following: string }>`
      SELECT
        (SELECT count(*) FROM posts WHERE owner_id = ${userId} AND status = 'PUBLISHED') AS posts,
        (SELECT count(*) FROM follows WHERE followee_id = ${userId}) AS followers,
        (SELECT count(*) FROM follows WHERE follower_id = ${userId}) AS following`.execute(q);
    const r = rows[0];
    return {
      postCount: Number(r?.posts ?? 0),
      followerCount: Number(r?.followers ?? 0),
      followingCount: Number(r?.following ?? 0),
    };
  },

  async isFollowing(q: Q, followerId: string, followeeId: string): Promise<boolean> {
    const row = await q
      .selectFrom('follows')
      .select('follower_id')
      .where('follower_id', '=', followerId)
      .where('followee_id', '=', followeeId)
      .executeTakeFirst();
    return row !== undefined;
  },
};
