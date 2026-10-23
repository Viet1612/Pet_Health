import { sql, type Kysely } from 'kysely';

// Idempotency-Key (FR-GEN-005) và bộ đếm giới hạn tần suất (NFR-SEC-005), SAD §3.1.3.
// created_at lấy từ ClockPort ở ứng dụng, không dùng now() của DB, để test được bằng FakeClock.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE idempotency_keys (
      owner_id      uuid        NOT NULL,
      key           uuid        NOT NULL,
      request_hash  bytea       NOT NULL,
      status_code   smallint,
      response_body jsonb,
      created_at    timestamptz NOT NULL,
      PRIMARY KEY (owner_id, key)
    )`.execute(db);
  await sql`CREATE INDEX idempotency_keys_created_at_idx ON idempotency_keys (created_at)`.execute(
    db,
  );

  await sql`
    CREATE TABLE rate_limits (
      bucket       text        NOT NULL,
      window_start timestamptz NOT NULL,
      count        int         NOT NULL,
      PRIMARY KEY (bucket, window_start)
    )`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS rate_limits`.execute(db);
  await sql`DROP TABLE IF EXISTS idempotency_keys`.execute(db);
}
