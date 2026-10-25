import { sql, type Kysely } from 'kysely';

// Bản tin F-03: bảng mô-đun `social` và RLS "đọc công khai, ghi chỉ chủ" (khác `owner_isolation`
// của dữ liệu sức khỏe). Hai người đã chặn nhau không thấy nhau ở mọi bảng. Không có báo cáo nội
// dung (quyết định D2).
const SOCIAL_TABLES = [
  'posts',
  'post_photos',
  'follows',
  'post_likes',
  'post_comments',
  'blocks',
  'social_notifications',
];

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE posts (
      id            uuid PRIMARY KEY,
      owner_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      caption       varchar(2200) NULL,
      pet_ids       uuid[] NOT NULL DEFAULT '{}' CHECK (cardinality(pet_ids) <= 5),
      photo_count   smallint NOT NULL CHECK (photo_count BETWEEN 1 AND 5),
      status        text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
      published_at  timestamptz NULL,
      created_at    timestamptz NOT NULL,
      updated_at    timestamptz NOT NULL
    )`.execute(db);
  await sql`CREATE INDEX posts_owner_idx ON posts (owner_id, created_at DESC, id DESC)`.execute(db);
  await sql`
    CREATE INDEX posts_published_idx ON posts (created_at DESC, id DESC)
      WHERE status = 'PUBLISHED'`.execute(db);

  await sql`
    CREATE TABLE post_photos (
      id           uuid PRIMARY KEY,
      owner_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id      uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      position     smallint NOT NULL CHECK (position BETWEEN 0 AND 4),
      storage_key  text NULL,
      thumb_key    text NULL,
      width        integer NULL,
      height       integer NULL,
      status       text NOT NULL DEFAULT 'PROCESSING'
                   CHECK (status IN ('PROCESSING', 'READY', 'FAILED')),
      created_at   timestamptz NOT NULL,
      CONSTRAINT post_photos_position_key UNIQUE (post_id, position)
    )`.execute(db);

  await sql`
    CREATE TABLE follows (
      follower_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      followee_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at   timestamptz NOT NULL,
      PRIMARY KEY (follower_id, followee_id),
      CHECK (follower_id <> followee_id)
    )`.execute(db);
  await sql`CREATE INDEX follows_followee_idx ON follows (followee_id, created_at DESC)`.execute(
    db,
  );

  await sql`
    CREATE TABLE post_likes (
      post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at  timestamptz NOT NULL,
      PRIMARY KEY (post_id, user_id)
    )`.execute(db);

  await sql`
    CREATE TABLE post_comments (
      id          uuid PRIMARY KEY,
      post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      owner_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body        varchar(500) NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 500),
      created_at  timestamptz NOT NULL
    )`.execute(db);
  await sql`CREATE INDEX post_comments_post_idx ON post_comments (post_id, created_at, id)`.execute(
    db,
  );

  await sql`
    CREATE TABLE blocks (
      blocker_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at  timestamptz NOT NULL,
      PRIMARY KEY (blocker_id, blocked_id),
      CHECK (blocker_id <> blocked_id)
    )`.execute(db);
  await sql`CREATE INDEX blocks_blocked_idx ON blocks (blocked_id)`.execute(db);

  await sql`
    CREATE TABLE social_notifications (
      id          uuid PRIMARY KEY,
      owner_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      actor_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind        text NOT NULL CHECK (kind IN ('LIKE', 'COMMENT', 'FOLLOW')),
      post_id     uuid NULL REFERENCES posts(id) ON DELETE CASCADE,
      comment_id  uuid NULL REFERENCES post_comments(id) ON DELETE CASCADE,
      read_at     timestamptz NULL,
      created_at  timestamptz NOT NULL
    )`.execute(db);
  await sql`
    CREATE UNIQUE INDEX social_notifications_like_once ON social_notifications
      (owner_id, actor_id, post_id) WHERE kind = 'LIKE'`.execute(db);
  await sql`
    CREATE UNIQUE INDEX social_notifications_follow_once ON social_notifications
      (owner_id, actor_id) WHERE kind = 'FOLLOW'`.execute(db);
  await sql`
    CREATE INDEX social_notifications_owner_idx ON social_notifications
      (owner_id, created_at DESC, id DESC)`.execute(db);

  // Hai người không chặn nhau (theo một trong hai chiều). Dựa vào RLS của `blocks`, nên người bị
  // chặn cũng phải đọc được dòng chặn mình (chính sách bên dưới).
  await sql`
    CREATE OR REPLACE FUNCTION not_blocked(other uuid) RETURNS boolean
    LANGUAGE sql STABLE AS $$
      SELECT NOT EXISTS (
        SELECT 1 FROM blocks b
        WHERE (b.blocker_id = other AND b.blocked_id = app_user())
           OR (b.blocker_id = app_user() AND b.blocked_id = other))
    $$`.execute(db);

  for (const table of SOCIAL_TABLES) {
    await sql`ALTER TABLE ${sql.table(table)} ENABLE ROW LEVEL SECURITY`.execute(db);
    await sql`ALTER TABLE ${sql.table(table)} FORCE ROW LEVEL SECURITY`.execute(db);
    await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON ${sql.table(table)} TO app_rw, app_worker`.execute(
      db,
    );
  }

  // profiles (F-02): thêm điều kiện chặn.
  await sql`DROP POLICY social_read ON profiles`.execute(db);
  await sql`
    CREATE POLICY social_read ON profiles FOR SELECT
      USING (app_user() IS NOT NULL AND not_blocked(user_id))`.execute(db);

  // posts: bài nháp chỉ chủ thấy; ghi chỉ chủ.
  await sql`
    CREATE POLICY social_read ON posts FOR SELECT USING (
      app_user() IS NOT NULL
      AND (status = 'PUBLISHED' OR owner_id = app_user())
      AND not_blocked(owner_id))`.execute(db);
  await sql`
    CREATE POLICY social_write ON posts FOR ALL
      USING (owner_id = app_user()) WITH CHECK (owner_id = app_user())`.execute(db);

  // post_photos: thấy khi thấy bài (truy vấn con chịu RLS của posts); ghi chỉ chủ.
  await sql`
    CREATE POLICY social_read ON post_photos FOR SELECT
      USING (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id))`.execute(db);
  await sql`
    CREATE POLICY social_write ON post_photos FOR ALL
      USING (owner_id = app_user()) WITH CHECK (owner_id = app_user())`.execute(db);

  // follows: ghi bởi người theo dõi.
  await sql`
    CREATE POLICY social_read ON follows FOR SELECT USING (
      app_user() IS NOT NULL AND not_blocked(follower_id) AND not_blocked(followee_id))`.execute(
    db,
  );
  await sql`
    CREATE POLICY social_insert ON follows FOR INSERT
      WITH CHECK (follower_id = app_user() AND not_blocked(followee_id))`.execute(db);
  await sql`
    CREATE POLICY social_delete ON follows FOR DELETE USING (follower_id = app_user())`.execute(db);

  // post_likes: chủ bài không xóa được tim của người khác.
  await sql`
    CREATE POLICY social_read ON post_likes FOR SELECT USING (
      EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id) AND not_blocked(user_id))`.execute(db);
  await sql`
    CREATE POLICY social_insert ON post_likes FOR INSERT WITH CHECK (
      user_id = app_user() AND EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id))`.execute(db);
  await sql`
    CREATE POLICY social_delete ON post_likes FOR DELETE USING (user_id = app_user())`.execute(db);

  // post_comments: xóa được bởi người viết hoặc chủ bài.
  await sql`
    CREATE POLICY social_read ON post_comments FOR SELECT USING (
      EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id) AND not_blocked(owner_id))`.execute(db);
  await sql`
    CREATE POLICY social_insert ON post_comments FOR INSERT WITH CHECK (
      owner_id = app_user() AND EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id))`.execute(db);
  await sql`
    CREATE POLICY social_delete ON post_comments FOR DELETE USING (
      owner_id = app_user()
      OR EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.owner_id = app_user()))`.execute(
    db,
  );

  // blocks: hai bên đều đọc được dòng chặn (để ẩn hai chiều); chỉ người chặn ghi.
  await sql`
    CREATE POLICY social_read ON blocks FOR SELECT
      USING (blocker_id = app_user() OR blocked_id = app_user())`.execute(db);
  await sql`
    CREATE POLICY social_insert ON blocks FOR INSERT WITH CHECK (blocker_id = app_user())`.execute(
    db,
  );
  await sql`
    CREATE POLICY social_delete ON blocks FOR DELETE USING (blocker_id = app_user())`.execute(db);

  // social_notifications: người nhận đọc/đánh dấu (owner_isolation); người gây ra tạo/xóa.
  await sql`
    CREATE POLICY owner_isolation ON social_notifications
      USING (owner_id = app_user()) WITH CHECK (owner_id = app_user())`.execute(db);
  await sql`
    CREATE POLICY actor_insert ON social_notifications FOR INSERT
      WITH CHECK (actor_id = app_user())`.execute(db);
  await sql`
    CREATE POLICY actor_delete ON social_notifications FOR DELETE
      USING (actor_id = app_user())`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const table of [...SOCIAL_TABLES].reverse()) {
    await sql`DROP TABLE IF EXISTS ${sql.table(table)}`.execute(db);
  }
  await sql`DROP POLICY IF EXISTS social_read ON profiles`.execute(db);
  await sql`
    CREATE POLICY social_read ON profiles FOR SELECT USING (app_user() IS NOT NULL)`.execute(db);
  await sql`DROP FUNCTION IF EXISTS not_blocked(uuid)`.execute(db);
}
