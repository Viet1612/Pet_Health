// Fixture IDOR cho `/posts/:id` và `/post-photos/:id` (F-04). Bài **nháp** để người khác không
// thấy được (bài đã đăng thì đọc công khai có chủ đích). Tạo bằng kết nối app_worker (BYPASSRLS).
import { sql, type Kysely } from 'kysely';

import {
  exemptFromIdor,
  registerIdorBody,
  registerIdorParam,
} from '../../../../../../test/idor/registry.js';
import type { Database } from '../../../../../platform/db/kysely.js';
import { newId } from '../../../../../platform/ids.js';

async function draftPost(db: Kysely<Database>, ownerId: string, photoCount: number) {
  const id = newId();
  // Bài hiện kèm hồ sơ tác giả: chủ cần có hồ sơ để tự xem bài của mình (ca 7).
  await sql`
    INSERT INTO profiles (user_id, username, display_name, created_at, updated_at)
    VALUES (${ownerId}, ${`idor_${ownerId.slice(0, 8)}`}, 'IDOR', now(), now())
    ON CONFLICT (user_id) DO NOTHING`.execute(db);
  await sql`
    INSERT INTO posts (id, owner_id, caption, photo_count, status, created_at, updated_at)
    VALUES (${id}, ${ownerId}, 'Nháp', ${photoCount}, 'DRAFT', now(), now())`.execute(db);
  return id;
}

const snapshot = async ({ db, ownerId }: { db: Kysely<Database>; ownerId: string }) => {
  const { rows } = await sql`
    SELECT p.id, p.caption, p.pet_ids, p.photo_count, p.status, p.updated_at,
           (SELECT count(*) FROM post_photos ph WHERE ph.post_id = p.id) AS photos
    FROM posts p WHERE p.owner_id = ${ownerId} ORDER BY p.id`.execute(db);
  return rows;
};

registerIdorParam(/^\/posts\/:id(\/|$)/, 'id', {
  create: ({ db, owner }) => draftPost(db, owner.userId, 1),
  snapshot,
});

registerIdorParam('/post-photos/:id', 'id', {
  async create({ db, owner }) {
    const postId = await draftPost(db, owner.userId, 2);
    const id = newId();
    await sql`
      INSERT INTO post_photos (id, owner_id, post_id, position, status, created_at)
      VALUES (${id}, ${owner.userId}, ${postId}, 1, 'FAILED', now())`.execute(db);
    return id;
  },
  snapshot,
});

registerIdorBody('PATCH', '/posts/:id', () => ({ caption: 'Bị sửa' }));
registerIdorBody('POST', '/posts', () => ({ photoCount: 1 }));

exemptFromIdor(
  'GET',
  '/profiles/:username/posts',
  'Lưới bài đã đăng của hồ sơ công khai (D1); bài nháp và người đã chặn nhau bị RLS lọc',
);
