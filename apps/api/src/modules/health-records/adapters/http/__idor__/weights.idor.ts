// Fixture IDOR cho `/weights/:id` (S1-08). Route `/pets/:petId/weights` dùng fixture `petId` của
// mô-đun pets; ở đây chỉ thêm body hợp lệ. Tạo bằng kết nối app_worker (BYPASSRLS).
import { sql } from 'kysely';

import { registerIdorBody, registerIdorParam } from '../../../../../../test/idor/registry.js';
import { newId } from '../../../../../platform/ids.js';

registerIdorParam('/weights/:id', 'id', {
  async create({ db, owner }) {
    const petId = newId();
    const id = newId();
    await sql`
      INSERT INTO pets (id, owner_id, name, breed, sex, birth_date)
      VALUES (${petId}, ${owner.userId}, 'Mochi', 'Poodle', 'FEMALE', '2020-01-15')`.execute(db);
    await sql`
      INSERT INTO weight_entries (id, owner_id, pet_id, measured_on, weight_kg)
      VALUES (${id}, ${owner.userId}, ${petId}, '2026-10-01', 9.2)`.execute(db);
    return id;
  },
  async snapshot({ db, ownerId }) {
    const { rows } = await sql`
      SELECT id, measured_on::text, weight_kg::text FROM weight_entries
      WHERE owner_id = ${ownerId} ORDER BY id`.execute(db);
    return rows;
  },
});

registerIdorBody('POST', '/pets/:petId/weights', () => ({ weightKg: '9.2' }));
registerIdorBody('PATCH', '/weights/:id', () => ({ weightKg: '9.5' }));
registerIdorBody('PUT', '/pets/:petId/weight-target', () => ({ weightKg: '9.0' }));
