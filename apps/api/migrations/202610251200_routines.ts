import { sql, type Kysely } from 'kysely';

import { disableOwnerRls, enableOwnerRls } from './_helpers/rls.js';

// Việc chăm sóc hằng ngày (S5-01, SAD §3.1.3). Checklist "đặt lại" lúc 00:00 vì trạng thái gắn với
// `local_date` theo múi giờ tài khoản; không có job reset. Xóa việc là xóa mềm, lịch sử giữ (SD-008).
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE routine_tasks (
      id          uuid PRIMARY KEY,
      owner_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pet_id      uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
      name        varchar(100) NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
      time_of_day time NOT NULL,
      deleted_at  timestamptz NULL,
      created_at  timestamptz NOT NULL DEFAULT now()
    )`.execute(db);
  await sql`
    CREATE INDEX routine_tasks_pet_active ON routine_tasks (pet_id) WHERE deleted_at IS NULL`.execute(
    db,
  );

  await sql`
    CREATE TABLE routine_completions (
      task_id      uuid NOT NULL REFERENCES routine_tasks(id) ON DELETE CASCADE,
      owner_id     uuid NOT NULL,
      local_date   date NOT NULL,
      completed_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (task_id, local_date)
    )`.execute(db);

  for (const table of ['routine_tasks', 'routine_completions']) {
    await enableOwnerRls(db, table);
    await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON ${sql.table(table)} TO app_rw, app_worker`.execute(
      db,
    );
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const table of ['routine_completions', 'routine_tasks']) {
    await disableOwnerRls(db, table);
    await sql`DROP TABLE ${sql.table(table)}`.execute(db);
  }
}
