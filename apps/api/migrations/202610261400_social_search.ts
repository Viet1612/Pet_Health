import { sql, type Kysely } from 'kysely';

// F-07: tìm người theo username (tiền tố) hoặc tên hiển thị (chuỗi con, không dấu: "ho" khớp "Hồ").
// `unaccent()` chỉ STABLE nên bọc trong hàm IMMUTABLE (từ điển chỉ định rõ) để tạo index trigram.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS unaccent`.execute(db);
  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`.execute(db);
  await sql`
    CREATE OR REPLACE FUNCTION social_fold(t text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
    AS $$ SELECT lower(public.unaccent('public.unaccent'::regdictionary, t)) $$`.execute(db);
  await sql`
    CREATE INDEX profiles_display_name_trgm ON profiles
      USING gin (social_fold(display_name) gin_trgm_ops)`.execute(db);
  await sql`
    CREATE INDEX profiles_username_prefix ON profiles
      (lower(username::text) text_pattern_ops)`.execute(db);
  // Danh sách "đang theo dõi" của một người, mới nhất trước.
  await sql`
    CREATE INDEX follows_follower_idx ON follows (follower_id, created_at DESC)`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS follows_follower_idx`.execute(db);
  await sql`DROP INDEX IF EXISTS profiles_username_prefix`.execute(db);
  await sql`DROP INDEX IF EXISTS profiles_display_name_trgm`.execute(db);
  await sql`DROP FUNCTION IF EXISTS social_fold(text)`.execute(db);
}
