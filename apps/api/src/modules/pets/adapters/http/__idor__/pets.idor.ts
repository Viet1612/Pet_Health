// Fixture IDOR cho route có `:petId` (S1-08). Tạo bằng kết nối app_worker (BYPASSRLS).
import { sql } from 'kysely';

import { registerIdorBody, registerIdorParam } from '../../../../../../test/idor/registry.js';
import { newId } from '../../../../../platform/ids.js';

registerIdorParam(/^\/pets\/:petId(\/|$)/, 'petId', {
  async create({ db, owner }) {
    const id = newId();
    await sql`
      INSERT INTO pets (id, owner_id, name, breed, sex, birth_date)
      VALUES (${id}, ${owner.userId}, 'Mochi', 'Poodle', 'FEMALE', '2020-01-15')`.execute(db);
    return id;
  },
  async snapshot({ db, ownerId }) {
    const { rows } = await sql`
      SELECT id, name, breed, sex, birth_date::text, description, avatar_key, updated_at
      FROM pets WHERE owner_id = ${ownerId} ORDER BY id`.execute(db);
    return rows;
  },
});

registerIdorBody('PATCH', '/pets/:petId', () => ({ name: 'Bị sửa' }));
// Fixture tạo thú cưng tên 'Mochi': B xóa con của mình (ca 7) thì tên khớp → 204.
registerIdorBody('DELETE', '/pets/:petId', () => ({ confirmName: 'Mochi' }));
