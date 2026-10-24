// Fixture IDOR cho `/milestones/:id` (S1-08). `/pets/:petId/milestones` dùng fixture `petId` của
// mô-đun pets; ở đây chỉ thêm body hợp lệ. Tạo bằng kết nối app_worker (BYPASSRLS).
import { sql } from 'kysely';

import { registerIdorBody, registerIdorParam } from '../../../../../../test/idor/registry.js';
import { newId } from '../../../../../platform/ids.js';

registerIdorParam(/^\/milestones\/:id(\/|$)/, 'id', {
  async create({ db, owner }) {
    const petId = newId();
    const id = newId();
    await sql`
      INSERT INTO pets (id, owner_id, name, breed, sex, birth_date)
      VALUES (${petId}, ${owner.userId}, 'Mochi', 'Poodle', 'FEMALE', '2020-01-15')`.execute(db);
    await sql`
      INSERT INTO milestones (id, owner_id, pet_id, type, due_on, due_set_on, cycle_months,
                              origin, created_at, updated_at)
      VALUES (${id}, ${owner.userId}, ${petId}, 'FLEA', '2026-11-15', '2026-10-01', 1,
              'MANUAL', now(), now())`.execute(db);
    return id;
  },
  async snapshot({ db, ownerId }) {
    const { rows } = await sql`
      SELECT id, status, due_on::text, due_set_on::text, note, cycle_months, done_on::text,
             (SELECT count(*) FROM milestones c WHERE c.previous_id = m.id) AS next_count
      FROM milestones m WHERE owner_id = ${ownerId} ORDER BY id`.execute(db);
    return rows;
  },
});

registerIdorBody('POST', '/pets/:petId/milestones', () => ({
  type: 'VACCINE',
  dueOn: '2026-11-15',
}));
registerIdorBody('PATCH', '/milestones/:id', () => ({ note: 'Bị sửa' }));
registerIdorBody('POST', '/milestones/:id/complete', () => ({ doneOn: '2026-10-20' }));
