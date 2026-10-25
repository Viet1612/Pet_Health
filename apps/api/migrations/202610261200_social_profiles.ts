import { sql, type Kysely } from 'kysely';

// Bản tin F-02: nickname khi đăng ký, hồ sơ công khai `profiles`, ảnh đại diện người dùng.
// Bảng xã hội đọc công khai cho người đã đăng nhập, ghi chỉ chủ (chính sách hoàn chỉnh ở F-03).
export async function up(db: Kysely<unknown>): Promise<void> {
  // Tài khoản cũ có thể chưa có nickname (hỏi một lần khi đăng nhập); đăng ký mới bắt buộc.
  await sql`
    ALTER TABLE users ADD COLUMN nickname varchar(50) NULL
      CHECK (nickname IS NULL OR char_length(btrim(nickname)) BETWEEN 1 AND 50)`.execute(db);

  // Người dùng hiện tại của transaction (RLS); rỗng → NULL.
  await sql`
    CREATE OR REPLACE FUNCTION app_user() RETURNS uuid
    LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.user_id', true), '')::uuid $$`.execute(
    db,
  );

  await sql`
    CREATE TABLE profiles (
      user_id              uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      username             citext NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9._]{3,30}$'),
      display_name         varchar(50) NOT NULL
                           CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 50),
      bio                  varchar(150) NULL,
      avatar_key           text NULL,
      username_changed_at  timestamptz NOT NULL,
      created_at           timestamptz NOT NULL,
      updated_at           timestamptz NOT NULL
    )`.execute(db);

  await sql`ALTER TABLE profiles ENABLE ROW LEVEL SECURITY`.execute(db);
  await sql`ALTER TABLE profiles FORCE ROW LEVEL SECURITY`.execute(db);
  // Chặn nhau (bảng `blocks`) được thêm vào chính sách đọc ở F-03.
  await sql`CREATE POLICY social_read ON profiles FOR SELECT USING (app_user() IS NOT NULL)`.execute(
    db,
  );
  await sql`
    CREATE POLICY social_insert ON profiles FOR INSERT WITH CHECK (user_id = app_user())`.execute(
    db,
  );
  await sql`
    CREATE POLICY social_update ON profiles FOR UPDATE
      USING (user_id = app_user()) WITH CHECK (user_id = app_user())`.execute(db);
  await sql`CREATE POLICY social_delete ON profiles FOR DELETE USING (user_id = app_user())`.execute(
    db,
  );
  await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO app_rw, app_worker`.execute(db);

  // Ảnh đại diện người dùng (F-02) và ảnh bài đăng (F-04).
  await sql`ALTER TABLE uploads DROP CONSTRAINT IF EXISTS uploads_target_kind_check`.execute(db);
  await sql`
    ALTER TABLE uploads ADD CONSTRAINT uploads_target_kind_check
      CHECK (target_kind IN ('AVATAR', 'VISIT_PHOTO', 'USER_AVATAR', 'POST_PHOTO'))`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE uploads DROP CONSTRAINT IF EXISTS uploads_target_kind_check`.execute(db);
  await sql`
    ALTER TABLE uploads ADD CONSTRAINT uploads_target_kind_check
      CHECK (target_kind IN ('AVATAR', 'VISIT_PHOTO'))`.execute(db);
  await sql`DROP TABLE profiles`.execute(db);
  await sql`DROP FUNCTION IF EXISTS app_user()`.execute(db);
  await sql`ALTER TABLE users DROP COLUMN nickname`.execute(db);
}
