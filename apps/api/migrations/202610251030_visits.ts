import { sql, type Kysely } from 'kysely';

import { disableOwnerRls, enableOwnerRls } from './_helpers/rls.js';

// Sổ y tế (S3-03, SAD §3.1.3): bản ghi khám và ảnh đính kèm. `visit_photos` tạo sẵn để `photoCount`,
// cascade và dọn tệp chạy ngay; tải ảnh làm ở S3-04. Xóa thú cưng/bản ghi → xóa theo (cascade).
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE visits (
      id            uuid PRIMARY KEY,
      owner_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pet_id        uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
      visited_on    date NOT NULL,
      symptoms      text NULL CHECK (char_length(symptoms) <= 2000),
      diagnosis     text NULL CHECK (char_length(diagnosis) <= 2000),
      prescription  text NULL CHECK (char_length(prescription) <= 2000),
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT visits_symptoms_or_diagnosis
        CHECK (coalesce(btrim(symptoms), '') <> '' OR coalesce(btrim(diagnosis), '') <> '')
    )`.execute(db);
  await sql`
    CREATE INDEX visits_pet_list_idx
      ON visits (pet_id, visited_on DESC, created_at DESC, id DESC)`.execute(db);

  await sql`
    CREATE TABLE visit_photos (
      id           uuid PRIMARY KEY,
      owner_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      visit_id     uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      storage_key  text NOT NULL,
      thumb_key    text NOT NULL,
      size_bytes   integer NOT NULL DEFAULT 0,
      status       text NOT NULL DEFAULT 'PROCESSING'
                   CHECK (status IN ('PROCESSING', 'READY', 'FAILED')),
      fail_reason  text NULL,
      created_at   timestamptz NOT NULL DEFAULT now()
    )`.execute(db);
  await sql`CREATE INDEX visit_photos_visit_idx ON visit_photos (visit_id)`.execute(db);

  for (const table of ['visits', 'visit_photos']) {
    await enableOwnerRls(db, table);
    await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON ${sql.table(table)} TO app_rw, app_worker`.execute(
      db,
    );
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const table of ['visit_photos', 'visits']) {
    await disableOwnerRls(db, table);
    await sql`DROP TABLE ${sql.table(table)}`.execute(db);
  }
}
