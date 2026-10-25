import { sql, type Kysely } from 'kysely';

// Job `maintenance.daily` (S6-06) chạy bằng `app_worker`, không phải chủ bảng: hàm quản lý
// partition chạy với quyền chủ (SECURITY DEFINER, search_path cố định).
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER FUNCTION analytics_ensure_partitions(int)
      SECURITY DEFINER SET search_path = public`.execute(db);

  // Xóa partition analytics_events_YYYYMM có tháng trước `cutoff`; trả số partition đã xóa.
  await sql`
    CREATE OR REPLACE FUNCTION analytics_drop_partitions_before(cutoff date) RETURNS int
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    DECLARE
      part record;
      dropped int := 0;
    BEGIN
      FOR part IN
        SELECT c.relname
        FROM pg_inherits i
        JOIN pg_class c ON c.oid = i.inhrelid
        JOIN pg_class p ON p.oid = i.inhparent
        WHERE p.relname = 'analytics_events' AND c.relname ~ '^analytics_events_[0-9]{6}$'
      LOOP
        IF to_date(right(part.relname, 6), 'YYYYMM') < date_trunc('month', cutoff)::date THEN
          EXECUTE format('DROP TABLE %I', part.relname);
          dropped := dropped + 1;
        END IF;
      END LOOP;
      RETURN dropped;
    END $$`.execute(db);

  await sql`REVOKE ALL ON FUNCTION analytics_ensure_partitions(int) FROM PUBLIC`.execute(db);
  await sql`REVOKE ALL ON FUNCTION analytics_drop_partitions_before(date) FROM PUBLIC`.execute(db);
  await sql`GRANT EXECUTE ON FUNCTION analytics_ensure_partitions(int) TO app_worker`.execute(db);
  await sql`GRANT EXECUTE ON FUNCTION analytics_drop_partitions_before(date) TO app_worker`.execute(
    db,
  );
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP FUNCTION IF EXISTS analytics_drop_partitions_before(date)`.execute(db);
  await sql`ALTER FUNCTION analytics_ensure_partitions(int) SECURITY INVOKER`.execute(db);
}
