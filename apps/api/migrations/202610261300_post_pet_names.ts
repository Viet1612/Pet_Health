import { sql, type Kysely } from 'kysely';

// F-04: bài đăng chỉ lưu id thú cưng (D5); tên đọc lúc hiển thị. Bảng `pets` giữ `owner_isolation`
// (D4) nên người xem khác không đọc được. Hàm này chỉ trả (id, tên) của thú cưng gắn trong bài mà
// người gọi **thấy được** (lọc bằng RLS của `posts` dưới `app.user_id` của người gọi), rồi đọc
// `pets` dưới `app.user_id` của chủ bài và trả lại giá trị cũ. Không lộ cột nào khác của `pets`.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE OR REPLACE FUNCTION post_pet_names(p_post_ids uuid[])
    RETURNS TABLE (post_id uuid, pet_id uuid, name text)
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    DECLARE
      viewer text := current_setting('app.user_id', true);
      ids uuid[];
      owners uuid[];
      i int;
    BEGIN
      IF NULLIF(viewer, '') IS NULL THEN
        RETURN;
      END IF;
      -- Đọc hết bài thấy được trước khi đổi app.user_id.
      SELECT array_agg(p.id), array_agg(p.owner_id)
        INTO ids, owners
        FROM posts p
        WHERE p.id = ANY(p_post_ids) AND cardinality(p.pet_ids) > 0;
      IF ids IS NULL THEN
        RETURN;
      END IF;
      FOR i IN 1 .. array_length(ids, 1) LOOP
        PERFORM set_config('app.user_id', owners[i]::text, true);
        RETURN QUERY
          SELECT ids[i], pt.id, pt.name::text
          FROM pets pt
          JOIN posts p ON p.id = ids[i]
          WHERE pt.owner_id = owners[i] AND pt.id = ANY(p.pet_ids);
      END LOOP;
      PERFORM set_config('app.user_id', viewer, true);
    EXCEPTION WHEN OTHERS THEN
      PERFORM set_config('app.user_id', viewer, true);
      RAISE;
    END
    $$`.execute(db);
  await sql`REVOKE ALL ON FUNCTION post_pet_names(uuid[]) FROM PUBLIC`.execute(db);
  await sql`GRANT EXECUTE ON FUNCTION post_pet_names(uuid[]) TO app_rw, app_worker`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP FUNCTION IF EXISTS post_pet_names(uuid[])`.execute(db);
}
