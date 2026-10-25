// Ca IDOR dạng query parameter (S5-03): A gọi `GET /dashboard?pet=<thú cưng của B>` → 404, không lộ
// dữ liệu của B.
import { sql } from 'kysely';
import { expect } from 'vitest';

import { authHeaders } from '../../../../../../test/idor/accounts.js';
import { registerIdorCustom } from '../../../../../../test/idor/registry.js';
import { newId } from '../../../../../platform/ids.js';

registerIdorCustom('GET /dashboard?pet= với thú cưng của người khác', async ({ app, a, b, db }) => {
  const petId = newId();
  await sql`
    INSERT INTO pets (id, owner_id, name, breed, sex, birth_date)
    VALUES (${petId}, ${b.userId}, 'Bơ', 'Corgi', 'MALE', '2021-05-01')`.execute(db);

  const res = await app.inject({
    method: 'GET',
    url: `/api/v1/dashboard?pet=${petId}`,
    headers: authHeaders(a),
  });
  expect(res.statusCode).toBe(404);
  expect(res.body).not.toContain('Bơ');
});
