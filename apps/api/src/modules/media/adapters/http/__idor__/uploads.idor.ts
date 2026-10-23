// Fixture IDOR cho `GET /uploads/:uploadId` (S1-08). Tạo bằng kết nối app_worker (BYPASSRLS).
import { sql } from 'kysely';

import { registerIdorParam } from '../../../../../../test/idor/registry.js';
import { newId } from '../../../../../platform/ids.js';

registerIdorParam('/uploads/:uploadId', 'uploadId', {
  async create({ db, owner }) {
    const id = newId();
    await sql`
      INSERT INTO uploads (id, owner_id, target_kind, target_id, incoming_key)
      VALUES (${id}, ${owner.userId}, 'AVATAR', ${newId()}, ${`incoming/${id}`})`.execute(db);
    return id;
  },
  async snapshot({ db, ownerId }) {
    const { rows } = await sql`
      SELECT id, status, fail_reason FROM uploads WHERE owner_id = ${ownerId} ORDER BY id`.execute(
      db,
    );
    return rows;
  },
});
