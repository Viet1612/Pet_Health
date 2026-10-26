import { sql, type Kysely } from 'kysely';

// F-13: funnel bản tin theo người dùng (hash): tạo hồ sơ → đăng bài đầu → nhận tim đầu → theo dõi
// ≥ 3 người. Chỉ đọc `analytics_events` (không chạm bảng nghiệp vụ).
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE VIEW analytics_funnel_social AS
    SELECT user_id_hash,
           min(occurred_at) FILTER (WHERE name = 'profile_created')    AS profile_created_at,
           min(occurred_at) FILTER (WHERE name = 'post_created')       AS first_post_at,
           min(occurred_at) FILTER (WHERE name = 'post_like_received') AS first_like_received_at,
           count(*) FILTER (WHERE name = 'user_followed') >= 3         AS followed_3
    FROM analytics_events
    WHERE user_id_hash IS NOT NULL
      AND name IN ('profile_created', 'post_created', 'post_like_received', 'user_followed')
    GROUP BY user_id_hash`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP VIEW IF EXISTS analytics_funnel_social`.execute(db);
}
