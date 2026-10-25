# F-03 · Schema mạng xã hội và RLS — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [F-03](../tasks-feed/F-03-social-schema.md) |
| Trạng thái | Xong, test tích hợp RLS Pass |
| Ngày hoàn thành | 2026-10-26 |
| Commit | xem [README](README.md) |

## Kết quả

- **Migration `202610261210_social_tables`** (đã chạy trên DB dev):
  - **Bảng:**
    - `posts`: `DRAFT`/`PUBLISHED`, `pet_ids uuid[]` gồm 0–5 thú cưng, 1–5 ảnh.
    - `post_photos`.
    - `follows`: không tự theo dõi chính mình.
    - `post_likes`.
    - `post_comments`: 1–500 ký tự.
    - `blocks`.
    - `social_notifications`: unique một phần cho LIKE và FOLLOW để không trùng thông báo.
  - **Hàm `not_blocked(other)`:** `false` nếu một trong hai người đã chặn người kia.
  - **RLS + FORCE trên mọi bảng:**
    - Đọc công khai cho người đã đăng nhập (`social_read`), trừ người đã chặn nhau. Bài nháp chỉ chủ thấy.
    - Ghi chỉ chủ (`owner_id` / `follower_id` / `user_id` / `blocker_id` = `app_user()`).
    - Chủ bài xóa được bình luận trên bài của mình.
    - `blocks` đọc được bởi cả người chặn lẫn người bị chặn, để `not_blocked` chạy đúng dưới RLS.
    - `social_notifications`: chỉ người nhận đọc (`owner_isolation`); người gây ra (actor) được thêm và xóa thông báo của mình.
  - **`profiles.social_read`:** tạo lại có `not_blocked`.
- **Khác thiết kế:** không có trigger đếm (`like_count`…). Số đếm tính bằng truy vấn, vì trigger chạy dưới RLS của người gọi sẽ không cập nhật được dòng của người khác. Sẽ xem lại ở F-09 nếu cần tối ưu.
- **Dữ liệu sức khỏe** vẫn dùng `owner_isolation` (D4); không bảng social nào tham chiếu tới bảng sức khỏe ngoài `pet_ids`.
- **Meta-test RLS** trong bộ IDOR:
  - Bảng có `owner_id` chấp nhận policy `social_read` cho `posts`, `post_photos`, `post_comments`.
  - Thêm ca kiểm cả 8 bảng social đều bật RLS + FORCE và có policy.

## Tiêu chí chấp nhận

Đã kiểm bằng `apps/api/test/social-rls.int.test.ts` (PostgreSQL 16 qua Testcontainers, kết nối `app_rw` chịu RLS):
- **Chưa đặt `app.user_id`:** không đọc được hồ sơ hay bài.
- **Người khác:** thấy hồ sơ và bài đã đăng, không thấy bản nháp; chủ thấy cả hai.
- **Ghi thay người khác:** sửa hồ sơ hay xóa bài của người khác → 0 dòng; tạo bài hay theo dõi thay người khác → lỗi RLS.
- **Chặn nhau:** C chặn A → A không thấy hồ sơ C; C không thấy hồ sơ và bài của A; B (người thứ ba) vẫn thấy bài của A.
- **`social_notifications`:** chỉ người nhận đọc được.

IDOR 104/104 Pass (gồm meta-test RLS mới).
