import { sql, type Kysely } from 'kysely';

import { disableOwnerRls, enableOwnerRls } from './_helpers/rls.js';

// Số đo cân nặng (S3-01, SAD §3.1.3). Cho phép nhiều số đo cùng ngày (FR-WGT-002). Xóa thú cưng
// thì xóa theo (S2-05). Mục tiêu cân nặng nằm ở `pets.weight_target_kg` (S2-01).
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE weight_entries (
      id           uuid PRIMARY KEY,
      owner_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pet_id       uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
      measured_on  date NOT NULL,
      weight_kg    numeric(4,1) NOT NULL CHECK (weight_kg BETWEEN 0.1 AND 150),
      created_at   timestamptz NOT NULL DEFAULT now()
    )`.execute(db);
  await sql`
    CREATE INDEX weight_entries_pet_measured_idx
      ON weight_entries (pet_id, measured_on DESC, created_at DESC)`.execute(db);
  await enableOwnerRls(db, 'weight_entries');
  await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON weight_entries TO app_rw, app_worker`.execute(
    db,
  );
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await disableOwnerRls(db, 'weight_entries');
  await sql`DROP TABLE weight_entries`.execute(db);
}
