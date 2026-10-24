// Fixture IDOR cho `/visits/:id` (S1-08). `/pets/:petId/visits` dùng fixture `petId` của mô-đun
// pets; ở đây chỉ thêm body hợp lệ. Tạo bằng kết nối app_worker (BYPASSRLS).
import { sql } from 'kysely';

import { registerIdorBody, registerIdorParam } from '../../../../../../test/idor/registry.js';
import { newId } from '../../../../../platform/ids.js';

registerIdorParam(/^\/visits\/:id(\/|$)/, 'id', {
  async create({ db, owner }) {
    const petId = newId();
    const id = newId();
    await sql`
      INSERT INTO pets (id, owner_id, name, breed, sex, birth_date)
      VALUES (${petId}, ${owner.userId}, 'Mochi', 'Poodle', 'FEMALE', '2020-01-15')`.execute(db);
    await sql`
      INSERT INTO visits (id, owner_id, pet_id, visited_on, diagnosis)
      VALUES (${id}, ${owner.userId}, ${petId}, '2026-10-01', 'Viêm da')`.execute(db);
    return id;
  },
  async snapshot({ db, ownerId }) {
    const { rows } = await sql`
      SELECT v.id, v.visited_on::text, v.symptoms, v.diagnosis, v.prescription, v.updated_at,
             (SELECT count(*) FROM visit_photos p WHERE p.visit_id = v.id) AS photos
      FROM visits v WHERE v.owner_id = ${ownerId} ORDER BY v.id`.execute(db);
    return rows;
  },
});

registerIdorBody('POST', '/pets/:petId/visits', () => ({ diagnosis: 'Viêm da' }));
registerIdorBody('PATCH', '/visits/:id', () => ({ diagnosis: 'Bị sửa' }));
