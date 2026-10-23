import { sql, type Kysely } from 'kysely';

import { disableOwnerRls, enableOwnerRls } from './_helpers/rls.js';

// Ảnh tải lên chờ worker xử lý (S2-02, SAD §3.1.3). `fail_reason` để GET /uploads/{id} trả lý do.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE uploads (
      id            uuid PRIMARY KEY,
      owner_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_kind   text NOT NULL CHECK (target_kind IN ('AVATAR', 'VISIT_PHOTO')),
      target_id     uuid NOT NULL,
      incoming_key  text NOT NULL,
      status        text NOT NULL DEFAULT 'PROCESSING'
                    CHECK (status IN ('PROCESSING', 'READY', 'FAILED')),
      fail_reason   text NULL CHECK (fail_reason IN
                    ('UNSUPPORTED_FORMAT', 'CORRUPT', 'TOO_MANY_PIXELS', 'PROCESSING_ERROR')),
      created_at    timestamptz NOT NULL DEFAULT now()
    )`.execute(db);
  await sql`CREATE INDEX uploads_owner_id_idx ON uploads (owner_id)`.execute(db);
  await enableOwnerRls(db, 'uploads');
  await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON uploads TO app_rw, app_worker`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await disableOwnerRls(db, 'uploads');
  await sql`DROP TABLE uploads`.execute(db);
}
