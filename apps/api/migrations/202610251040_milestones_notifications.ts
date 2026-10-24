import { sql, type Kysely } from 'kysely';

import { disableOwnerRls, enableOwnerRls } from './_helpers/rls.js';

// Lịch mốc y tế và thông báo trong ứng dụng (S4-01, SAD §3.1.3). Thời điểm do ứng dụng ghi (ClockPort)
// nên `created_at`/`updated_at` không có DEFAULT now(). `users.notifications_synced_on` có từ S1-01.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_synced_on date`.execute(db);

  await sql`
    CREATE TABLE milestones (
      id            uuid PRIMARY KEY,
      owner_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pet_id        uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
      type          text NOT NULL CHECK (type IN ('VACCINE', 'FLEA', 'DEWORM')),
      due_on        date NOT NULL,
      due_set_on    date NOT NULL,
      note          varchar(500) NULL,
      cycle_months  smallint NULL CHECK (cycle_months BETWEEN 1 AND 60),
      status        text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DONE', 'CANCELLED')),
      done_on       date NULL,
      completed_at  timestamptz NULL,
      origin        text NOT NULL CHECK (origin IN ('MANUAL', 'AUTO')),
      previous_id   uuid NULL REFERENCES milestones(id) ON DELETE SET NULL,
      created_at    timestamptz NOT NULL,
      updated_at    timestamptz NOT NULL,
      CONSTRAINT milestones_vaccine_no_cycle CHECK (type <> 'VACCINE' OR cycle_months IS NULL),
      CONSTRAINT milestones_done_fields
        CHECK ((status = 'DONE') = (done_on IS NOT NULL AND completed_at IS NOT NULL)),
      CONSTRAINT milestones_previous_unique UNIQUE (previous_id)
    )`.execute(db);
  await sql`
    CREATE INDEX milestones_pending_due_idx ON milestones (owner_id, due_on)
      WHERE status = 'PENDING'`.execute(db);
  await sql`CREATE INDEX milestones_pet_idx ON milestones (pet_id, status, due_on)`.execute(db);

  await sql`
    CREATE TABLE notifications (
      id               uuid PRIMARY KEY,
      owner_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      milestone_id     uuid NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
      channel          text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app')),
      level            text NOT NULL CHECK (level IN ('D7', 'D1', 'OVERDUE')),
      due_on_snapshot  date NOT NULL,
      appear_on        date NOT NULL,
      read_at          timestamptz NULL,
      read_reason      text NULL CHECK (read_reason IN ('USER', 'BANNER', 'SUPERSEDED', 'RESOLVED')),
      resolved_at      timestamptz NULL,
      resolution       text NULL CHECK (resolution IN ('DONE', 'CANCELLED', 'RESCHEDULED')),
      created_at       timestamptz NOT NULL,
      CONSTRAINT notifications_once UNIQUE (milestone_id, channel, level, due_on_snapshot),
      CONSTRAINT notifications_read_pair CHECK ((read_at IS NULL) = (read_reason IS NULL)),
      CONSTRAINT notifications_resolved_pair CHECK ((resolved_at IS NULL) = (resolution IS NULL))
    )`.execute(db);
  await sql`
    CREATE INDEX notifications_unread_idx ON notifications (owner_id, appear_on DESC)
      WHERE read_at IS NULL`.execute(db);
  await sql`
    CREATE INDEX notifications_list_idx ON notifications (owner_id, appear_on DESC, id DESC)`.execute(
    db,
  );

  for (const table of ['milestones', 'notifications']) {
    await enableOwnerRls(db, table);
    await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON ${sql.table(table)} TO app_rw, app_worker`.execute(
      db,
    );
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const table of ['notifications', 'milestones']) {
    await disableOwnerRls(db, table);
    await sql`DROP TABLE ${sql.table(table)}`.execute(db);
  }
}
