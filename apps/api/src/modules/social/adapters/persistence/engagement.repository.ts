import { sql, type Kysely, type Transaction } from 'kysely';

import type { Database } from '../../../../platform/db/kysely.js';
import { newId } from '../../../../platform/ids.js';
import type { PersonRow } from './follow.repository.js';

type Q = Kysely<Database> | Transaction<Database>;

export interface CommentRow {
  id: string;
  post_id: string;
  owner_id: string;
  body: string;
  created_at: Date;
  username: string;
  display_name: string;
  avatar_key: string | null;
  post_owner_id: string;
}

/** Tim (`post_likes`) và bình luận (`post_comments`) dưới RLS F-03 (F-09). */
export const engagementRepository = {
  /** Thả tim (idempotent); `true` nếu vừa tạo. */
  async like(q: Q, postId: string, userId: string, now: Date): Promise<boolean> {
    const row = await q
      .insertInto('post_likes')
      .values({ post_id: postId, user_id: userId, created_at: now })
      .onConflict((oc) => oc.doNothing())
      .returning('post_id')
      .executeTakeFirst();
    return row !== undefined;
  },

  async unlike(q: Q, postId: string, userId: string): Promise<boolean> {
    const res = await q
      .deleteFrom('post_likes')
      .where('post_id', '=', postId)
      .where('user_id', '=', userId)
      .executeTakeFirst();
    return res.numDeletedRows > 0n;
  },

  async likeCount(q: Q, postId: string): Promise<number> {
    const row = await q
      .selectFrom('post_likes')
      .select((eb) => eb.fn.countAll<string>().as('n'))
      .where('post_id', '=', postId)
      .executeTakeFirstOrThrow();
    return Number(row.n);
  },

  /** Người thả tim, mới nhất trước (tối đa `limit`). */
  async likers(q: Q, viewerId: string, postId: string, limit: number): Promise<PersonRow[]> {
    const { rows } = await sql<PersonRow>`
      SELECT pr.user_id, pr.username, pr.display_name, pr.avatar_key,
             EXISTS (SELECT 1 FROM follows me
                     WHERE me.follower_id = ${viewerId} AND me.followee_id = pr.user_id)
               AS followed_by_me
      FROM post_likes l JOIN profiles pr ON pr.user_id = l.user_id
      WHERE l.post_id = ${postId}
      ORDER BY l.created_at DESC, pr.user_id
      LIMIT ${limit}`.execute(q);
    return rows;
  },

  /** Bình luận cũ trước, keyset `(created_at, id)` tăng dần. */
  async comments(
    q: Q,
    postId: string,
    after: { at: Date; id: string } | null,
    limit: number,
  ): Promise<CommentRow[]> {
    const { rows } = await sql<CommentRow>`
      SELECT c.id, c.post_id, c.owner_id, c.body, c.created_at,
             pr.username, pr.display_name, pr.avatar_key, p.owner_id AS post_owner_id
      FROM post_comments c
      JOIN profiles pr ON pr.user_id = c.owner_id
      JOIN posts p ON p.id = c.post_id
      WHERE c.post_id = ${postId}
        ${after ? sql`AND (c.created_at, c.id) > (${after.at}, ${after.id})` : sql``}
      ORDER BY c.created_at, c.id
      LIMIT ${limit}`.execute(q);
    return rows;
  },

  async findComment(q: Q, id: string): Promise<CommentRow | undefined> {
    const { rows } = await sql<CommentRow>`
      SELECT c.id, c.post_id, c.owner_id, c.body, c.created_at,
             pr.username, pr.display_name, pr.avatar_key, p.owner_id AS post_owner_id
      FROM post_comments c
      JOIN profiles pr ON pr.user_id = c.owner_id
      JOIN posts p ON p.id = c.post_id
      WHERE c.id = ${id}`.execute(q);
    return rows[0];
  },

  async insertComment(
    q: Q,
    row: { id: string; postId: string; ownerId: string; body: string; now: Date },
  ): Promise<void> {
    await q
      .insertInto('post_comments')
      .values({
        id: row.id,
        post_id: row.postId,
        owner_id: row.ownerId,
        body: row.body,
        created_at: row.now,
      })
      .execute();
  },

  /** Xóa bình luận (RLS: người viết hoặc chủ bài); `true` nếu đã xóa. */
  async deleteComment(q: Q, id: string): Promise<boolean> {
    const res = await q.deleteFrom('post_comments').where('id', '=', id).executeTakeFirst();
    return res.numDeletedRows > 0n;
  },
};

export interface ActivityRow {
  kind: 'LIKE' | 'COMMENT' | 'FOLLOW';
  post_id: string | null;
  comment_id: string | null;
  /** Thời điểm mới nhất của nhóm. */
  created_at: Date;
  /** id dòng mới nhất (keyset + key hiển thị). */
  id: string;
  unread: boolean;
  actor_count: number;
  /** Tối đa 3 người gần nhất: `[user_id, username, display_name, avatar_key]`. */
  actors: { user_id: string; username: string; display_name: string; avatar_key: string | null }[];
  comment_body: string | null;
  post_thumb_key: string | null;
}

/**
 * Thông báo hoạt động (`social_notifications`, F-11). Ghi bởi người gây ra (actor) trong cùng
 * transaction với thao tác; đọc chỉ người nhận (`owner_isolation`).
 */
export const activityRepository = {
  /** Bỏ qua khi tự tác động lên chính mình. `ON CONFLICT` chặn trùng LIKE/FOLLOW. */
  async add(
    q: Q,
    row: {
      ownerId: string;
      actorId: string;
      kind: 'LIKE' | 'COMMENT' | 'FOLLOW';
      postId?: string;
      commentId?: string;
      now: Date;
    },
  ): Promise<void> {
    if (row.ownerId === row.actorId) return;
    await sql`
      INSERT INTO social_notifications
        (id, owner_id, actor_id, kind, post_id, comment_id, created_at)
      VALUES (${newId()}, ${row.ownerId}, ${row.actorId}, ${row.kind},
              ${row.postId ?? null}, ${row.commentId ?? null}, ${row.now})
      ON CONFLICT DO NOTHING`.execute(q);
  },

  /** Bỏ theo dõi → xóa thông báo FOLLOW chưa đọc của mình gửi người kia. */
  async removeUnreadFollow(q: Q, actorId: string, ownerId: string): Promise<void> {
    await q
      .deleteFrom('social_notifications')
      .where('actor_id', '=', actorId)
      .where('owner_id', '=', ownerId)
      .where('kind', '=', 'FOLLOW')
      .where('read_at', 'is', null)
      .execute();
  },

  async unreadCount(q: Q, ownerId: string): Promise<number> {
    const row = await q
      .selectFrom('social_notifications')
      .select((eb) => eb.fn.countAll<string>().as('n'))
      .where('owner_id', '=', ownerId)
      .where('read_at', 'is', null)
      .executeTakeFirstOrThrow();
    return Number(row.n);
  },

  async readAll(q: Q, ownerId: string, upTo: Date, now: Date): Promise<number> {
    const res = await q
      .updateTable('social_notifications')
      .set({ read_at: now })
      .where('owner_id', '=', ownerId)
      .where('read_at', 'is', null)
      .where('created_at', '<=', upTo)
      .executeTakeFirst();
    return Number(res.numUpdatedRows);
  },

  /**
   * Danh sách đã gộp: tim **chưa đọc** cùng một bài gộp thành một dòng; còn lại mỗi bản ghi một
   * dòng. Mới nhất trước, keyset `(created_at, id)` của dòng.
   */
  async list(
    q: Q,
    ownerId: string,
    after: { at: Date; id: string } | null,
    limit: number,
  ): Promise<ActivityRow[]> {
    const { rows } = await sql<ActivityRow>`
      WITH n AS (
        SELECT sn.*,
               CASE WHEN sn.kind = 'LIKE' AND sn.read_at IS NULL
                    THEN 'L:' || sn.post_id::text ELSE 'R:' || sn.id::text END AS grp
        FROM social_notifications sn
        WHERE sn.owner_id = ${ownerId}
      ),
      g AS (
        SELECT grp,
               (array_agg(kind ORDER BY created_at DESC, id DESC))[1] AS kind,
               (array_agg(post_id ORDER BY created_at DESC, id DESC))[1] AS post_id,
               (array_agg(comment_id ORDER BY created_at DESC, id DESC))[1] AS comment_id,
               max(created_at) AS created_at,
               (array_agg(id ORDER BY created_at DESC, id DESC))[1] AS id,
               bool_or(read_at IS NULL) AS unread,
               count(*)::int AS actor_count,
               (array_agg(actor_id ORDER BY created_at DESC, id DESC))[1:3] AS actor_ids
        FROM n GROUP BY grp
      )
      SELECT g.kind, g.post_id, g.comment_id, g.created_at, g.id, g.unread, g.actor_count,
             COALESCE((
               SELECT json_agg(json_build_object(
                        'user_id', pr.user_id, 'username', pr.username,
                        'display_name', pr.display_name, 'avatar_key', pr.avatar_key)
                      ORDER BY array_position(g.actor_ids, pr.user_id))
               FROM profiles pr WHERE pr.user_id = ANY(g.actor_ids)), '[]'::json) AS actors,
             (SELECT left(c.body, 80) FROM post_comments c WHERE c.id = g.comment_id)
               AS comment_body,
             (SELECT ph.thumb_key FROM post_photos ph WHERE ph.post_id = g.post_id
              ORDER BY ph.position LIMIT 1) AS post_thumb_key
      FROM g
      WHERE ${after ? sql`(g.created_at, g.id) < (${after.at}, ${after.id})` : sql`TRUE`}
      ORDER BY g.created_at DESC, g.id DESC
      LIMIT ${limit}`.execute(q);
    return rows;
  },
};
