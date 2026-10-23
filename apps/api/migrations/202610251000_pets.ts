import { sql, type Kysely } from 'kysely';

import { disableOwnerRls, enableOwnerRls } from './_helpers/rls.js';

// Bảng của mô-đun pets (S2-01, SAD §3.1.3). `birth_date ≤ hôm nay` kiểm ở use case vì "hôm nay"
// phụ thuộc múi giờ tài khoản. `weight_target_kg` dùng từ S3-01.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE pets (
      id                uuid PRIMARY KEY,
      owner_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name              varchar(50) NOT NULL CHECK (length(btrim(name)) >= 1),
      breed             varchar(50) NOT NULL CHECK (length(btrim(breed)) >= 1),
      sex               text NOT NULL CHECK (sex IN ('MALE', 'FEMALE')),
      birth_date        date NOT NULL,
      description       varchar(2000) NULL,
      avatar_key        text NULL,
      weight_target_kg  numeric(4,1) NULL CHECK (weight_target_kg BETWEEN 0.1 AND 150),
      created_at        timestamptz NOT NULL DEFAULT now(),
      updated_at        timestamptz NOT NULL DEFAULT now()
    )`.execute(db);
  await sql`CREATE INDEX pets_owner_id_idx ON pets (owner_id)`.execute(db);
  await enableOwnerRls(db, 'pets');
  await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON pets TO app_rw, app_worker`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await disableOwnerRls(db, 'pets');
  await sql`DROP TABLE pets`.execute(db);
}
