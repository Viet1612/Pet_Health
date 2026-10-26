import { sql, type Kysely } from 'kysely';

// F-12 (sửa): chặn **ẩn** tim và bình luận của người bị chặn trên bài của người chặn thay vì xóa;
// bỏ chặn thì hiện lại. Dòng ẩn không ai đọc được, trừ chủ bài (để bỏ ẩn sau khi bỏ chặn; lúc
// còn chặn thì `not_blocked` vẫn ẩn với chủ bài). Chủ bài được UPDATE dòng trên bài mình (cờ ẩn).
export async function up(db: Kysely<unknown>): Promise<void> {
  for (const table of ['post_likes', 'post_comments']) {
    await sql`
      ALTER TABLE ${sql.table(table)}
        ADD COLUMN hidden_by_block boolean NOT NULL DEFAULT false`.execute(db);
  }

  await sql`DROP POLICY social_read ON post_likes`.execute(db);
  await sql`
    CREATE POLICY social_read ON post_likes FOR SELECT USING (
      EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id)
      AND not_blocked(user_id)
      AND (NOT hidden_by_block
           OR EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.owner_id = app_user())))`.execute(
    db,
  );
  await sql`
    CREATE POLICY social_block_hide ON post_likes FOR UPDATE
      USING (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.owner_id = app_user()))
      WITH CHECK (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.owner_id = app_user()))`.execute(
    db,
  );

  await sql`DROP POLICY social_read ON post_comments`.execute(db);
  await sql`
    CREATE POLICY social_read ON post_comments FOR SELECT USING (
      EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id)
      AND not_blocked(owner_id)
      AND (NOT hidden_by_block
           OR EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.owner_id = app_user())))`.execute(
    db,
  );
  await sql`
    CREATE POLICY social_block_hide ON post_comments FOR UPDATE
      USING (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.owner_id = app_user()))
      WITH CHECK (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.owner_id = app_user()))`.execute(
    db,
  );
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const table of ['post_likes', 'post_comments']) {
    await sql`DROP POLICY IF EXISTS social_block_hide ON ${sql.table(table)}`.execute(db);
  }
  await sql`DROP POLICY social_read ON post_likes`.execute(db);
  await sql`
    CREATE POLICY social_read ON post_likes FOR SELECT USING (
      EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id) AND not_blocked(user_id))`.execute(db);
  await sql`DROP POLICY social_read ON post_comments`.execute(db);
  await sql`
    CREATE POLICY social_read ON post_comments FOR SELECT USING (
      EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id) AND not_blocked(owner_id))`.execute(db);
  for (const table of ['post_likes', 'post_comments']) {
    await sql`ALTER TABLE ${sql.table(table)} DROP COLUMN hidden_by_block`.execute(db);
  }
}
