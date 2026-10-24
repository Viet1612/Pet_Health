// Fixture IDOR cho `/photos/:id` (S1-08). `/visits/:id/photos` dùng fixture `/visits/:id`.
// Tạo bằng kết nối app_worker (BYPASSRLS).
import { sql } from 'kysely';

import { registerIdorParam } from '../../../../../../test/idor/registry.js';
import { newId } from '../../../../../platform/ids.js';

registerIdorParam('/photos/:id', 'id', {
  async create({ db, owner }) {
    const petId = newId();
    const visitId = newId();
    const id = newId();
    const key = `u/${owner.userId}/p/${petId}/v/${visitId}/${id}`;
    await sql`
      INSERT INTO pets (id, owner_id, name, breed, sex, birth_date)
      VALUES (${petId}, ${owner.userId}, 'Mochi', 'Poodle', 'FEMALE', '2020-01-15')`.execute(db);
    await sql`
      INSERT INTO visits (id, owner_id, pet_id, visited_on, diagnosis)
      VALUES (${visitId}, ${owner.userId}, ${petId}, '2026-10-01', 'Viêm da')`.execute(db);
    await sql`
      INSERT INTO visit_photos (id, owner_id, visit_id, storage_key, thumb_key, status)
      VALUES (${id}, ${owner.userId}, ${visitId}, ${`${key}.jpg`}, ${`${key}_thumb.jpg`}, 'READY')`.execute(
      db,
    );
    return id;
  },
  async snapshot({ db, ownerId }) {
    const { rows } = await sql`
      SELECT id, visit_id, status FROM visit_photos WHERE owner_id = ${ownerId} ORDER BY id`.execute(
      db,
    );
    return rows;
  },
});
