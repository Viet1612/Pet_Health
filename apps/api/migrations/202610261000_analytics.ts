import { sql, type Kysely } from 'kysely';

// Analytics tự lưu (S6-05, AD-015): bảng phân vùng theo tháng, không có dữ liệu cá nhân (chỉ
// `user_id_hash`). Không RLS (không có `owner_id`); app chỉ được INSERT, không đọc lại.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE analytics_events (
      id           uuid NOT NULL,
      name         text NOT NULL,
      user_id_hash text NULL,
      platform     text NOT NULL DEFAULT 'web' CHECK (platform IN ('web')),
      device_class text NOT NULL CHECK (device_class IN ('phone', 'tablet', 'desktop', 'server')),
      viewport_w   smallint NULL,
      props        jsonb NOT NULL DEFAULT '{}',
      occurred_at  timestamptz NOT NULL,
      received_at  timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (id, occurred_at)
    ) PARTITION BY RANGE (occurred_at)`.execute(db);
  await sql`CREATE INDEX analytics_events_name_idx ON analytics_events (name, occurred_at)`.execute(
    db,
  );

  // Tạo partition analytics_events_YYYYMM từ tháng hiện tại tới +months_ahead (S6-06 gọi hằng ngày).
  await sql`
    CREATE OR REPLACE FUNCTION analytics_ensure_partitions(months_ahead int) RETURNS void
    LANGUAGE plpgsql AS $$
    DECLARE
      m date := date_trunc('month', now())::date;
      i int;
    BEGIN
      FOR i IN 0..months_ahead LOOP
        EXECUTE format(
          'CREATE TABLE IF NOT EXISTS %I PARTITION OF analytics_events FOR VALUES FROM (%L) TO (%L)',
          'analytics_events_' || to_char(m + make_interval(months => i), 'YYYYMM'),
          m + make_interval(months => i),
          m + make_interval(months => i + 1));
      END LOOP;
    END $$`.execute(db);
  await sql`SELECT analytics_ensure_partitions(2)`.execute(db);
  await sql`GRANT INSERT ON analytics_events TO app_rw, app_worker`.execute(db);

  // Funnel 1 — kích hoạt: mốc đầu tiên của từng bước theo người dùng.
  await sql`
    CREATE VIEW analytics_funnel_activation AS
    SELECT user_id_hash,
           min(occurred_at) FILTER (WHERE name = 'signup_completed') AS signup_completed_at,
           min(occurred_at) FILTER (WHERE name = 'pet_created')      AS first_pet_at,
           min(occurred_at) FILTER (WHERE name = 'milestone_created') AS first_milestone_at,
           count(DISTINCT (occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
             FILTER (WHERE name = 'app_opened') >= 3 AS opened_3_days
    FROM analytics_events
    WHERE user_id_hash IS NOT NULL
    GROUP BY user_id_hash`.execute(db);

  // Funnel 2 — vòng nhắc: theo tuần, nhắc được tạo → được xem → mốc được đánh dấu.
  await sql`
    CREATE VIEW analytics_funnel_reminder_loop AS
    WITH created AS (
      SELECT user_id_hash, date_trunc('week', occurred_at) AS week, min(occurred_at) AS first_at
      FROM analytics_events WHERE name = 'notification_created' AND user_id_hash IS NOT NULL
      GROUP BY 1, 2
    )
    SELECT c.week,
           count(*) AS users_notified,
           count(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM analytics_events e
             WHERE e.user_id_hash = c.user_id_hash AND e.occurred_at >= c.first_at
               AND e.name IN ('banner_shown', 'notification_opened'))) AS users_seen,
           count(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM analytics_events e
             WHERE e.user_id_hash = c.user_id_hash AND e.occurred_at >= c.first_at
               AND e.name = 'milestone_completed')) AS users_completed
    FROM created c
    GROUP BY c.week`.execute(db);

  // Funnel 3 — thói quen hằng ngày (giờ Việt Nam): mở app và có tick việc cùng ngày.
  await sql`
    CREATE VIEW analytics_funnel_daily_habit AS
    SELECT (occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day,
           count(DISTINCT user_id_hash) FILTER (WHERE name = 'app_opened') AS users_opened,
           count(DISTINCT user_id_hash) FILTER (
             WHERE name = 'routine_checked' AND user_id_hash IN (
               SELECT o.user_id_hash FROM analytics_events o
               WHERE o.name = 'app_opened'
                 AND (o.occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
                   = (analytics_events.occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
           ) AS users_opened_and_checked
    FROM analytics_events
    WHERE user_id_hash IS NOT NULL
    GROUP BY 1`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const view of [
    'analytics_funnel_daily_habit',
    'analytics_funnel_reminder_loop',
    'analytics_funnel_activation',
  ]) {
    await sql`DROP VIEW IF EXISTS ${sql.table(view)}`.execute(db);
  }
  await sql`DROP TABLE analytics_events`.execute(db);
  await sql`DROP FUNCTION IF EXISTS analytics_ensure_partitions(int)`.execute(db);
}
