import { sql, type Kysely, type Selectable, type Transaction } from 'kysely';

import type { PostPhotos, Posts } from '../../../../platform/db/database.types.js';
import type { Database } from '../../../../platform/db/kysely.js';

export type PostRow = Selectable<Posts>;
export type PostPhotoRow = Selectable<PostPhotos>;
type Q = Kysely<Database> | Transaction<Database>;
type Trx = Transaction<Database>;

/** Bài cùng thông tin tác giả (hồ sơ công khai). */
export interface PostWithAuthor extends PostRow {
  username: string;
  display_name: string;
  author_avatar_key: string | null;
}

/**
 * Bảng `posts`, `post_photos` (F-04). Đọc dưới RLS `social_read` (bài nháp chỉ chủ thấy, bỏ người
 * đã chặn nhau); ghi chỉ chủ. Worker ảnh dùng kết nối app_worker (BYPASSRLS).
 */
export const postRepository = {
  insert(
    trx: Trx,
    row: {
      id: string;
      ownerId: string;
      caption: string | null;
      petIds: string[];
      photoCount: number;
      now: Date;
    },
  ): Promise<PostRow> {
    return trx
      .insertInto('posts')
      .values({
        id: row.id,
        owner_id: row.ownerId,
        caption: row.caption,
        pet_ids: row.petIds,
        photo_count: row.photoCount,
        status: 'DRAFT',
        created_at: row.now,
        updated_at: row.now,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  findById(q: Q, id: string): Promise<PostRow | undefined> {
    return q.selectFrom('posts').selectAll().where('id', '=', id).executeTakeFirst();
  },

  /** Bài của chính `ownerId` (khóa dòng): kiểm quyền trước khi sửa, xóa, thêm ảnh. */
  lockOwned(trx: Trx, ownerId: string, id: string): Promise<PostRow | undefined> {
    return trx
      .selectFrom('posts')
      .selectAll()
      .where('id', '=', id)
      .where('owner_id', '=', ownerId)
      .forUpdate()
      .executeTakeFirst();
  },

  findWithAuthor(q: Q, id: string): Promise<PostWithAuthor | undefined> {
    return q
      .selectFrom('posts as p')
      .innerJoin('profiles as pr', 'pr.user_id', 'p.owner_id')
      .selectAll('p')
      .select(['pr.username', 'pr.display_name', 'pr.avatar_key as author_avatar_key'])
      .where('p.id', '=', id)
      .executeTakeFirst();
  },

  async update(
    trx: Trx,
    id: string,
    set: { caption?: string | null; petIds?: string[]; now: Date },
  ): Promise<void> {
    await trx
      .updateTable('posts')
      .set({
        updated_at: set.now,
        ...(set.caption === undefined ? {} : { caption: set.caption }),
        ...(set.petIds === undefined ? {} : { pet_ids: set.petIds }),
      })
      .where('id', '=', id)
      .execute();
  },

  async delete(trx: Trx, id: string): Promise<void> {
    await trx.deleteFrom('posts').where('id', '=', id).execute();
  },

  async setPhotoCount(trx: Trx, id: string, photoCount: number, now: Date): Promise<void> {
    await trx
      .updateTable('posts')
      .set({ photo_count: photoCount, updated_at: now })
      .where('id', '=', id)
      .execute();
  },

  /**
   * Bài nháp đủ ảnh READY → `PUBLISHED`. Gọi sau mỗi lần ảnh READY hoặc bỏ ảnh lỗi; trả `true` nếu
   * vừa chuyển trạng thái. Khóa dòng bài trước rồi mới đếm (câu lệnh sau, snapshot mới): hai ảnh
   * xử lý song song thì transaction sau chờ transaction trước commit và thấy cả hai ảnh READY.
   */
  async publishIfComplete(trx: Trx, id: string, now: Date): Promise<boolean> {
    await trx.selectFrom('posts').select('id').where('id', '=', id).forUpdate().execute();
    const res = await sql<{ id: string }>`
      UPDATE posts p SET status = 'PUBLISHED', published_at = ${now}, created_at = ${now},
                         updated_at = ${now}
      WHERE p.id = ${id} AND p.status = 'DRAFT'
        AND (SELECT count(*) FROM post_photos ph
             WHERE ph.post_id = p.id AND ph.status = 'READY') = p.photo_count
      RETURNING p.id`.execute(trx);
    return res.rows.length > 0;
  },

  // ---- Ảnh ----

  listPhotos(q: Q, postIds: string[]): Promise<PostPhotoRow[]> {
    if (postIds.length === 0) return Promise.resolve([]);
    return q
      .selectFrom('post_photos')
      .selectAll()
      .where('post_id', 'in', postIds)
      .orderBy('post_id')
      .orderBy('position')
      .execute();
  },

  findPhoto(q: Q, id: string): Promise<PostPhotoRow | undefined> {
    return q.selectFrom('post_photos').selectAll().where('id', '=', id).executeTakeFirst();
  },

  async insertPhoto(
    trx: Trx,
    row: {
      id: string;
      ownerId: string;
      postId: string;
      position: number;
      storageKey: string;
      thumbKey: string;
      now: Date;
    },
  ): Promise<void> {
    await trx
      .insertInto('post_photos')
      .values({
        id: row.id,
        owner_id: row.ownerId,
        post_id: row.postId,
        position: row.position,
        storage_key: row.storageKey,
        thumb_key: row.thumbKey,
        status: 'PROCESSING',
        created_at: row.now,
      })
      .execute();
  },

  async deletePhoto(trx: Trx, id: string): Promise<void> {
    await trx.deleteFrom('post_photos').where('id', '=', id).execute();
  },

  async markPhotoReady(
    trx: Trx,
    id: string,
    size: { width: number; height: number },
  ): Promise<string | undefined> {
    const row = await trx
      .updateTable('post_photos')
      .set({ status: 'READY', width: size.width, height: size.height })
      .where('id', '=', id)
      .returning('post_id')
      .executeTakeFirst();
    return row?.post_id;
  },

  async markPhotoFailed(q: Q, id: string): Promise<void> {
    await q.updateTable('post_photos').set({ status: 'FAILED' }).where('id', '=', id).execute();
  },

  // ---- Đọc cho hiển thị ----

  /** Tên thú cưng gắn trong các bài người gọi thấy được (hàm `post_pet_names`, F-04). */
  async petNames(
    q: Q,
    postIds: string[],
  ): Promise<{ post_id: string; pet_id: string; name: string }[]> {
    if (postIds.length === 0) return [];
    const { rows } = await sql<{ post_id: string; pet_id: string; name: string }>`
      SELECT post_id, pet_id, name FROM post_pet_names(${postIds}::uuid[])`.execute(q);
    return rows;
  },

  /** Số tim, số bình luận, mình đã thả tim chưa (dưới RLS). */
  async engagement(
    q: Q,
    viewerId: string,
    postIds: string[],
  ): Promise<Map<string, { likes: number; comments: number; liked: boolean }>> {
    const out = new Map<string, { likes: number; comments: number; liked: boolean }>();
    if (postIds.length === 0) return out;
    const { rows } = await sql<{ id: string; likes: string; comments: string; liked: boolean }>`
      SELECT p.id,
             (SELECT count(*) FROM post_likes l WHERE l.post_id = p.id) AS likes,
             (SELECT count(*) FROM post_comments c WHERE c.post_id = p.id) AS comments,
             EXISTS (SELECT 1 FROM post_likes l
                     WHERE l.post_id = p.id AND l.user_id = ${viewerId}) AS liked
      FROM unnest(${postIds}::uuid[]) AS p(id)`.execute(q);
    for (const r of rows) {
      out.set(r.id, { likes: Number(r.likes), comments: Number(r.comments), liked: r.liked });
    }
    return out;
  },

  /** Lưới hồ sơ: bài đã đăng của `ownerId`, mới nhất trước, keyset `(created_at, id)`. */
  async grid(
    q: Q,
    ownerId: string,
    after: { createdAt: Date; id: string } | null,
    limit: number,
  ): Promise<{ id: string; created_at: Date; photo_count: number; thumb_key: string | null }[]> {
    let query = q
      .selectFrom('posts as p')
      .select(['p.id', 'p.created_at', 'p.photo_count'])
      .select((eb) =>
        eb
          .selectFrom('post_photos as ph')
          .select('ph.thumb_key')
          .whereRef('ph.post_id', '=', 'p.id')
          .orderBy('ph.position')
          .limit(1)
          .as('thumb_key'),
      )
      .where('p.owner_id', '=', ownerId)
      .where('p.status', '=', 'PUBLISHED');
    if (after) {
      query = query.where((eb) =>
        eb.or([
          eb('p.created_at', '<', after.createdAt),
          eb.and([eb('p.created_at', '=', after.createdAt), eb('p.id', '<', after.id)]),
        ]),
      );
    }
    return query.orderBy('p.created_at', 'desc').orderBy('p.id', 'desc').limit(limit).execute();
  },

  /**
   * Bản tin (F-08): bài đã đăng của mình và người mình theo dõi, mới nhất trước, keyset
   * `(created_at, id)`. RLS loại người đã chặn nhau.
   */
  feed(
    q: Q,
    viewerId: string,
    after: { createdAt: Date; id: string } | null,
    limit: number,
  ): Promise<PostWithAuthor[]> {
    let query = q
      .selectFrom('posts as p')
      .innerJoin('profiles as pr', 'pr.user_id', 'p.owner_id')
      .selectAll('p')
      .select(['pr.username', 'pr.display_name', 'pr.avatar_key as author_avatar_key'])
      .where('p.status', '=', 'PUBLISHED')
      .where((eb) =>
        eb.or([
          eb('p.owner_id', '=', viewerId),
          eb(
            'p.owner_id',
            'in',
            eb.selectFrom('follows').select('followee_id').where('follower_id', '=', viewerId),
          ),
        ]),
      );
    if (after) {
      query = query.where((eb) =>
        eb.or([
          eb('p.created_at', '<', after.createdAt),
          eb.and([eb('p.created_at', '=', after.createdAt), eb('p.id', '<', after.id)]),
        ]),
      );
    }
    return query.orderBy('p.created_at', 'desc').orderBy('p.id', 'desc').limit(limit).execute();
  },

  /** Số bài mới trên bản tin sau `since` (không tính bài của mình). */
  async feedNewCount(q: Q, viewerId: string, since: Date): Promise<number> {
    const row = await q
      .selectFrom('posts as p')
      .select((eb) => eb.fn.countAll<string>().as('n'))
      .where('p.status', '=', 'PUBLISHED')
      .where('p.created_at', '>', since)
      .where(
        'p.owner_id',
        'in',
        q.selectFrom('follows').select('followee_id').where('follower_id', '=', viewerId),
      )
      .executeTakeFirstOrThrow();
    return Number(row.n);
  },
};
