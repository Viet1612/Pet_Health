import type { Kysely } from 'kysely';

import { disableOwnerRls, enableOwnerRls } from './_helpers/rls.js';

// idempotency_keys có owner_id từ S0-05 → bật RLS. rate_limits không có chủ, không bật.
export async function up(db: Kysely<unknown>): Promise<void> {
  await enableOwnerRls(db, 'idempotency_keys');
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await disableOwnerRls(db, 'idempotency_keys');
}
