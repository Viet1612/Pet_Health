import { sql, type Kysely, type Transaction } from 'kysely';

import type { Database } from './kysely.js';

/**
 * Mở transaction và đặt `app.user_id` cho Row-Level Security (SAD §3.1.2). Giá trị chỉ sống trong
 * transaction (`set_config(..., true)`). Repository của route cần đăng nhập chỉ dùng `trx` này.
 */
export function withUserTx<T>(
  db: Kysely<Database>,
  userId: string,
  fn: (trx: Transaction<Database>) => Promise<T>,
): Promise<T> {
  return db.transaction().execute(async (trx) => {
    await sql`SELECT set_config('app.user_id', ${userId}, true)`.execute(trx);
    return fn(trx);
  });
}
