// Ca IDOR đặc biệt (S1-08, SAD §3.1.2): ID thông báo nằm trong body. A đánh dấu đã xem thông báo
// của B → bị bỏ qua âm thầm (`200`), thông báo của B vẫn chưa xem.
import { sql } from 'kysely';
import { expect } from 'vitest';

import { authHeaders } from '../../../../../../test/idor/accounts.js';
import { registerIdorCustom } from '../../../../../../test/idor/registry.js';
import { newId } from '../../../../../platform/ids.js';

registerIdorCustom('POST /notifications/read với ID của người khác', async ({ app, a, b, db }) => {
  const petId = newId();
  const milestoneId = newId();
  const notificationId = newId();
  await sql`
    INSERT INTO pets (id, owner_id, name, breed, sex, birth_date)
    VALUES (${petId}, ${b.userId}, 'Mochi', 'Poodle', 'FEMALE', '2020-01-15')`.execute(db);
  await sql`
    INSERT INTO milestones (id, owner_id, pet_id, type, due_on, due_set_on, origin, created_at, updated_at)
    VALUES (${milestoneId}, ${b.userId}, ${petId}, 'VACCINE', '2026-11-01', '2026-10-01', 'MANUAL', now(), now())`.execute(
    db,
  );
  await sql`
    INSERT INTO notifications (id, owner_id, milestone_id, level, due_on_snapshot, appear_on, created_at)
    VALUES (${notificationId}, ${b.userId}, ${milestoneId}, 'D7', '2026-11-01', '2026-10-25', now())`.execute(
    db,
  );

  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/notifications/read',
    headers: authHeaders(a),
    payload: { ids: [notificationId] },
  });
  expect(res.statusCode).toBe(200);
  const { rows } = await sql<{ read_at: Date | null }>`
    SELECT read_at FROM notifications WHERE id = ${notificationId}`.execute(db);
  expect(rows[0]?.read_at).toBeNull();
});
