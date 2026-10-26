# F-07 · Theo dõi, danh sách theo dõi, tìm người — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [F-07](../tasks-feed/F-07-follow-search.md) |
| Trạng thái | Xong, E2E API + giao diện + test tích hợp Pass |
| Ngày hoàn thành | 2026-10-26 |
| Commit | xem [README](README.md) |

## Kết quả

### API

- **Theo dõi / bỏ theo dõi** (`PUT` / `DELETE /follows/{username}`):
  - Theo dõi ngay, không cần duyệt. Cả hai đều idempotent (`ON CONFLICT DO NOTHING` / xóa không lỗi) và trả `{ following, followerCount }`.
  - Tự theo dõi chính mình → `422 CANNOT_FOLLOW_SELF`.
  - Không có hồ sơ hoặc đã chặn nhau → 404 (RLS).
  - Giới hạn 200 lần theo dõi mới mỗi ngày → `429 FOLLOW_LIMIT_REACHED`. Bấm lại người đang theo dõi không bị tính.
- **Danh sách** `GET /profiles/{username}/followers|following?cursor=`:
  - 30 người/trang, mới nhất trước, keyset `(created_at, user_id)`.
  - Mỗi dòng `{ username, displayName, avatarThumbUrl, followedByMe, isMe }`.
- **Tìm người** `GET /search/profiles?q=`:
  - Từ khóa 1–30 ký tự, bỏ `@` ở đầu.
  - Khớp **tiền tố username** hoặc **chuỗi con tên hiển thị**, không dấu, không phân biệt hoa thường.
  - Sắp xếp: username khớp chính xác lên đầu, rồi người nhiều người theo dõi hơn. Tối đa 20 kết quả.
  - Rate limit 60 lần/phút.
  - Không tìm theo email; email không có trong kết quả.
- **Migration `202610261400_social_search`:**
  - Bật extension `unaccent` + `pg_trgm`.
  - Hàm `social_fold(text)` IMMUTABLE (bọc `unaccent` với từ điển chỉ định rõ) để index được.
  - Index GIN trigram trên `social_fold(display_name)`; index `text_pattern_ops` trên `lower(username)`; index `follows (follower_id, created_at DESC)`.
- **IDOR:** miễn kiểm các route có `:username`. Đây là danh tính công khai; thao tác chỉ ghi dòng `follows` của chính người gọi (RLS `follower_id = app_user()`).
- **Khác thiết kế:** không có cột `follower_count`. Số người theo dõi được đếm khi đọc (đã quyết ở F-03).

### Web

- **Hồ sơ người khác:**
  - Nút **Theo dõi** (primary) / **Đang theo dõi** (secondary). Bấm "Đang theo dõi" → hỏi "Bỏ theo dõi @x?".
  - Nút và số người theo dõi đổi ngay; lỗi thì trả lại trạng thái cũ và báo toast.
- **Số người theo dõi / đang theo dõi** bấm được, mở `/u/{username}/followers` và `/u/{username}/following`. Danh sách có nút Theo dõi tại chỗ.
- **Màn Tìm người** `/search`:
  - Mở từ icon kính lúp trên Bản tin hoặc nút "Tìm người" khi bản tin rỗng.
  - Ô tìm chờ 300 ms sau khi ngừng gõ; kết quả có nút Theo dõi tại chỗ.
  - Mục "Bản tin" trên thanh điều hướng sáng khi đang ở màn này.

## Tiêu chí chấp nhận

- **Test tích hợp** `apps/api/test/social-feed.int.test.ts`:
  - 10 request theo dõi song song chỉ tạo 1 dòng.
  - Tìm "mochi" ra `@mochi.cute` và "Mèo Mochi"; tìm "ho" khớp "Hồ Văn D".
  - Tìm theo email và tìm "%" không ra ai.
- **E2E API:**
  - Theo dõi: 5 lần song song → 1 người theo dõi; tự theo dõi → 422.
  - Bỏ theo dõi 2 lần → không lỗi.
  - Danh sách đúng; username không tồn tại → 404.
  - Tìm "meo ho …" ra "Mèo Hồ …"; không trả email.
- **E2E giao diện (phone + tablet):** bản tin rỗng → "Tìm người" → gõ tên không dấu → mở hồ sơ → Theo dõi → hiện "Đang theo dõi" (cả sau khi tải lại).
- **Trợ năng:** axe 0 lỗi serious/critical trên `/search` và `/u/{username}/followers`.
