import { sql, type Kysely } from 'kysely';

// Bảng của mô-đun identity (SAD §3.1.3). Không bật RLS: phải đọc được trước khi biết người dùng
// (tìm theo email khi đăng nhập, theo token_hash khi kiểm phiên). Bảo vệ bằng: chỉ
// modules/identity/adapters/persistence truy cập, và mọi truy vấn lọc theo khóa duy nhất.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE users (
      id                         uuid PRIMARY KEY,
      email                      citext NOT NULL,
      password_hash              text NOT NULL,
      email_verified_at          timestamptz NULL,
      timezone                   text NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
      notifications_synced_on    date NULL,
      failed_login_count         int NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
      failed_login_window_start  timestamptz NULL,
      locked_until               timestamptz NULL,
      created_at                 timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT users_email_key UNIQUE (email)
    )`.execute(db);

  await sql`
    CREATE TABLE sessions (
      id              uuid PRIMARY KEY,
      user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash      bytea NOT NULL,
      client_type     text NOT NULL DEFAULT 'web' CHECK (client_type IN ('web', 'mobile')),
      csrf_secret     bytea NULL,
      refresh_family  uuid NULL,
      last_seen_at    timestamptz NOT NULL,
      expires_at      timestamptz NOT NULL,
      created_at      timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT sessions_token_hash_key UNIQUE (token_hash)
    )`.execute(db);
  await sql`CREATE INDEX sessions_user_id_idx ON sessions (user_id)`.execute(db);
  await sql`CREATE INDEX sessions_expires_at_idx ON sessions (expires_at)`.execute(db);

  await sql`
    CREATE TABLE auth_tokens (
      id          uuid PRIMARY KEY,
      user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind        text NOT NULL CHECK (kind IN ('VERIFY_EMAIL', 'RESET_PASSWORD', 'CHANGE_EMAIL')),
      token_hash  bytea NOT NULL,
      payload     jsonb NULL,
      expires_at  timestamptz NOT NULL,
      used_at     timestamptz NULL,
      created_at  timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT auth_tokens_token_hash_key UNIQUE (token_hash)
    )`.execute(db);
  // Mỗi user chỉ có 1 token chưa dùng cho mỗi loại.
  await sql`
    CREATE UNIQUE INDEX auth_tokens_one_active_per_kind
      ON auth_tokens (user_id, kind) WHERE used_at IS NULL`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS auth_tokens`.execute(db);
  await sql`DROP TABLE IF EXISTS sessions`.execute(db);
  await sql`DROP TABLE IF EXISTS users`.execute(db);
}
