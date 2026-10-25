// Fixture IDOR cho `/routines/:id` (S1-08). `/pets/:petId/routines` dùng fixture `petId` của mô-đun
// pets; ở đây chỉ thêm body hợp lệ. Tạo bằng kết nối app_worker (BYPASSRLS).
import { sql } from 'kysely';

import { registerIdorBody, registerIdorParam } from '../../../../../../test/idor/registry.js';
import { newId } from '../../../../../platform/ids.js';

registerIdorParam(/^\/routines\/:id(\/|$)/, 'id', {
  async create({ db, owner }) {
    const petId = newId();
    const id = newId();
    await sql`
      INSERT INTO pets (id, owner_id, name, breed, sex, birth_date)
      VALUES (${petId}, ${owner.userId}, 'Mochi', 'Poodle', 'FEMALE', '2020-01-15')`.execute(db);
    await sql`
      INSERT INTO routine_tasks (id, owner_id, pet_id, name, time_of_day)
      VALUES (${id}, ${owner.userId}, ${petId}, 'Cho ăn sáng', '07:00')`.execute(db);
    return id;
  },
  async snapshot({ db, ownerId }) {
    const { rows } = await sql`
      SELECT t.id, t.name, t.time_of_day::text, t.deleted_at,
             (SELECT count(*) FROM routine_completions c WHERE c.task_id = t.id) AS done_count
      FROM routine_tasks t WHERE owner_id = ${ownerId} ORDER BY id`.execute(db);
    return rows;
  },
});

registerIdorBody('POST', '/pets/:petId/routines', () => ({
  name: 'Dắt đi dạo',
  timeOfDay: '18:00',
}));
registerIdorBody('PATCH', '/routines/:id', () => ({ name: 'Bị sửa' }));
registerIdorBody('PUT', '/routines/:id/completion', () => ({ done: true }));
