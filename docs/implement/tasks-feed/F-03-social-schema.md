# F-03 · Schema mô-đun `social` và chính sách RLS đọc công khai

| Thuộc tính | Giá trị |
|---|---|
| Nhóm | Bản tin (Giai đoạn 2) |
| Phụ thuộc | [F-02](F-02-public-profile.md) |
| Ước lượng | 1,5 ngày |

## Mục tiêu

Dựng toàn bộ bảng của bản tin cùng phân quyền ở tầng DB: **ai đã đăng nhập cũng đọc được, chỉ chủ được ghi**, trừ nội dung bị ẩn hoặc giữa hai người đã chặn nhau. Dữ liệu sức khỏe giữ nguyên `owner_isolation`.

## Phạm vi

**Trong phạm vi:** migration các bảng dưới đây; helper `enablePublicReadRls(table)`; cập nhật meta-test RLS của IDOR suite để phân biệt 2 nhóm bảng.

**Ngoài phạm vi:** API và giao diện (F-04 trở đi).

## Chi tiết kỹ thuật

**Bảng** (mọi bảng có `owner_id`/`user_id` FK `ON DELETE CASCADE` tới `users`):

| Bảng | Cột chính | Ràng buộc |
|---|---|---|
| `posts` | `id, owner_id, caption varchar(2200) NULL, pet_ids uuid[] (≤ 5), photo_count smallint, hidden_at, created_at, updated_at` | index `(owner_id, created_at DESC, id DESC)`, `(created_at DESC, id DESC)` |
| `post_photos` | `id, owner_id, post_id → posts CASCADE, position 0–4, storage_key, thumb_key, width, height, status` | `UNIQUE (post_id, position)` |
| `follows` | `follower_id, followee_id, created_at` | PK `(follower_id, followee_id)`, `CHECK follower_id <> followee_id`, index `(followee_id)` |
| `post_likes` | `post_id → posts CASCADE, user_id, created_at` | PK `(post_id, user_id)` |
| `post_comments` | `id, post_id → posts CASCADE, owner_id, body varchar(500), hidden_at, created_at` | index `(post_id, created_at, id)` |
| `blocks` | `blocker_id, blocked_id, created_at` | PK `(blocker_id, blocked_id)`, `CHECK blocker_id <> blocked_id` |
| `post_reports` | `post_id → posts CASCADE, reporter_id, reason enum, created_at` | PK `(post_id, reporter_id)` |
| `social_notifications` | `id, owner_id (người nhận), actor_id, kind enum (LIKE, COMMENT, FOLLOW), post_id NULL, comment_id NULL, read_at, created_at` | `UNIQUE (owner_id, actor_id, kind, post_id)` cho LIKE/FOLLOW để không trùng |

Thêm cột đếm vào `posts` (`like_count`, `comment_count`) và `profiles` (`follower_count`, `following_count`, `post_count`), cập nhật bằng trigger. Lý do: tránh `count(*)` khi cuộn bản tin.

**Chính sách RLS** (`migrations/_helpers/rls.ts`, thêm `enablePublicReadRls`):

```sql
-- Đọc: người đã đăng nhập; ẩn nội dung bị ẩn, trừ với chính chủ; ẩn giữa 2 người đã chặn nhau.
CREATE POLICY social_read ON posts FOR SELECT USING (
  app_user() IS NOT NULL
  AND (hidden_at IS NULL OR owner_id = app_user())
  AND NOT EXISTS (SELECT 1 FROM blocks b
                  WHERE (b.blocker_id = owner_id AND b.blocked_id = app_user())
                     OR (b.blocker_id = app_user() AND b.blocked_id = owner_id)));
CREATE POLICY social_write ON posts FOR ALL USING (owner_id = app_user()) WITH CHECK (owner_id = app_user());
```

- `app_user()`: hàm SQL `NULLIF(current_setting('app.user_id', true), '')::uuid`.
- **`post_likes` / `follows`:** người ghi là `user_id` / `follower_id`. Chủ bài **không** được xóa tim của người khác.
- **`post_comments`:** xóa được nếu là chủ bình luận **hoặc chủ bài** (policy riêng cho `DELETE`).
- **`blocks`, `post_reports`:** chỉ chủ đọc và ghi (`owner_isolation` theo `blocker_id` / `reporter_id`).
- **`social_notifications`:** `owner_isolation` (chỉ người nhận đọc). Bản ghi do server tạo trong transaction của người gây ra hành động, nên policy `INSERT` cho phép `actor_id = app_user()`.

**Meta-test IDOR (S1-08):** danh sách bảng `PUBLIC_READ_TABLES` = `profiles, posts, post_photos, post_likes, post_comments, follows`. Mọi bảng khác có `owner_id` vẫn phải là `owner_isolation`. Thêm bảng sức khỏe mới mà quên RLS → test đỏ như cũ.

## Tiêu chí chấp nhận

- [ ] Tài khoản B đọc được bài, ảnh, tim, bình luận của A; **không** sửa, xóa được (0 dòng bị ảnh hưởng).
- [ ] Chưa đăng nhập (`app.user_id` rỗng) → đọc 0 dòng ở mọi bảng xã hội.
- [ ] A chặn B → B không đọc được bài của A và ngược lại.
- [ ] Bài có `hidden_at` chỉ chủ bài thấy.
- [ ] Bảng sức khỏe (`pets`, `weight_entries`, `visits`, `milestones`, `notifications`, `routine_*`) vẫn chỉ chủ đọc được: meta-test RLS xanh.
- [ ] Trigger đếm đúng khi thêm/xóa tim, bình luận, theo dõi, bài; xóa tài khoản trừ đếm ở hồ sơ người khác.

## Kiểm thử

- **Integration (Testcontainers):** seed A, B, C; kiểm từng chính sách bằng `SET app.user_id`. Đếm trigger sau 100 thao tác ngẫu nhiên khớp `count(*)`.
- **IDOR suite:** cập nhật meta-test như trên.
