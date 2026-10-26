import { sql, type Kysely } from 'kysely';

// F-12: chặn người dùng. Khi chặn, người chặn xóa follow hai chiều và tim của người bị chặn trên
// bài mình (trước khi ghi dòng chặn, lúc còn thấy nhau). Người chặn vẫn thấy hồ sơ người bị chặn
// (để "Bỏ chặn"); bài và mọi thứ khác vẫn ẩn hai chiều.
export async function up(db: Kysely<unknown>): Promise<void> {
  // follows: người được theo dõi cũng xóa được dòng theo dõi mình ("gỡ người theo dõi").
  await sql`DROP POLICY social_delete ON follows`.execute(db);
  await sql`
    CREATE POLICY social_delete ON follows FOR DELETE
      USING (follower_id = app_user() OR followee_id = app_user())`.execute(db);

  // post_likes: chủ bài gỡ được tim trên bài của mình.
  await sql`DROP POLICY social_delete ON post_likes`.execute(db);
  await sql`
    CREATE POLICY social_delete ON post_likes FOR DELETE USING (
      user_id = app_user()
      OR EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.owner_id = app_user()))`.execute(
    db,
  );

  // profiles: người chặn vẫn thấy hồ sơ người mình chặn.
  await sql`DROP POLICY social_read ON profiles`.execute(db);
  await sql`
    CREATE POLICY social_read ON profiles FOR SELECT USING (
      app_user() IS NOT NULL
      AND (not_blocked(user_id)
           OR EXISTS (SELECT 1 FROM blocks b
                      WHERE b.blocker_id = app_user() AND b.blocked_id = user_id)))`.execute(db);

  await sql`CREATE INDEX blocks_blocker_idx ON blocks (blocker_id, created_at DESC)`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS blocks_blocker_idx`.execute(db);
  await sql`DROP POLICY social_read ON profiles`.execute(db);
  await sql`
    CREATE POLICY social_read ON profiles FOR SELECT
      USING (app_user() IS NOT NULL AND not_blocked(user_id))`.execute(db);
  await sql`DROP POLICY social_delete ON post_likes`.execute(db);
  await sql`
    CREATE POLICY social_delete ON post_likes FOR DELETE USING (user_id = app_user())`.execute(db);
  await sql`DROP POLICY social_delete ON follows`.execute(db);
  await sql`
    CREATE POLICY social_delete ON follows FOR DELETE USING (follower_id = app_user())`.execute(db);
}
