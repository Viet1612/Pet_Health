# F-04 · API bài đăng — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [F-04](../tasks-feed/F-04-posts-api.md) |
| Trạng thái | Xong, E2E API + IDOR Pass |
| Ngày hoàn thành | 2026-10-26 |
| Commit | xem [README](README.md) |

## Kết quả

**Luồng đăng bài:**
1. `POST /posts` (`Idempotency-Key`) với `{ caption?, petIds?, photoCount 1–5 }` → `201 { id, status: 'DRAFT' }`.
   - Chưa có hồ sơ công khai → `409 PROFILE_NOT_SET`.
   - Quá 30 bài/ngày (`rate_limits`, bucket `post:{user}`, tính cả bài nháp) → `429 POST_LIMIT_REACHED`.
2. `POST /posts/{id}/photos?position=` (multipart, `Idempotency-Key`).
   - Kiểm bài nháp của mình và vị trí **trước** khi nhận tệp.
   - Vị trí đang có ảnh lỗi thì được thay bằng ảnh mới (Thử lại).
3. Worker (`POST_PHOTO`):
   - Ảnh 1080 px cạnh dài + thumbnail vuông 360 px cắt giữa, bỏ toàn bộ EXIF.
   - Ghi `width`/`height` của ảnh.
   - Khi ảnh READY cuối cùng xong, bài chuyển `PUBLISHED` (`published_at` = `created_at` = lúc đăng).
4. Ảnh lỗi:
   - Bỏ ảnh lỗi: `DELETE /post-photos/{id}` (chỉ với bài nháp, bài còn ≥ 1 ảnh). Server giảm `photo_count`, xóa tệp, rồi đăng nếu các ảnh còn lại đã READY.
   - Thử lại: tải lại ảnh vào đúng vị trí đó.
5. Bài nháp quá 24 giờ bị xóa kèm tệp: thêm bước `post_drafts` vào `maintenance.daily`.

**Các API khác:**
- `GET /posts/{id}` → `PostView`.
  - Trường: `id`, `status`, `author { username, displayName, avatarThumbUrl }`, `caption`, `pets [{ id, name }]`, `photos [{ id, position, status, url, thumbUrl, width, height }]`, `photoCount`, `likeCount`, `commentCount`, `likedByMe`, `createdAt`, `isMine`.
  - Bài nháp chỉ chủ thấy; người đã chặn nhau → 404 (RLS).
- `PATCH /posts/{id}`: sửa `caption` và/hoặc `petIds` (bỏ hết = `[]`); không đổi ảnh.
- `DELETE /posts/{id}`: xóa bài (ảnh, tim, bình luận, thông báo theo CASCADE) + `media.purge-prefix u/{user}/posts/{post}/` cùng transaction.
- `GET /profiles/{username}/posts?cursor=`: lưới 18 bài/trang, keyset `(created_at, id)`, chỉ bài đã đăng; trả `{ id, thumbUrl, photoCount }`.

**Thú cưng gắn kèm (D4, D5):**
- `petIds` không bắt buộc. Nếu có, mỗi id phải là thú cưng của chính người đăng (`petQuery.getNames`); sai → `422 PET_NOT_OWNED`.
- Tên được đọc lúc hiển thị qua hàm `post_pet_names(uuid[])` (migration `202610261300_post_pet_names`, `SECURITY DEFINER`):
  - Hàm chỉ xét bài mà người gọi **thấy được** (lọc bằng RLS của `posts`).
  - Hàm đọc `pets` dưới `app.user_id` của chủ bài, rồi đặt lại giá trị cũ.
  - Chỉ trả `(id, tên)`. Bảng `pets` vẫn giữ `owner_isolation`, người khác không đọc được giống, ngày sinh hay ảnh.
- Thú cưng đã xóa thì tự biến khỏi bài.

**Media:**
- Khóa ảnh `u/{user}/posts/{post}/{photo}.jpg`; `MEDIA_KEY_RE`, `PURGE_PREFIX_RE`, `PURGE_FILE_RE` nhận thêm dạng này.
- `transformImage` có thêm tham số `variant` (`DEFAULT_VARIANT` / `POST_VARIANT`) và trả thêm kích thước ảnh.

**IDOR:**
- Fixture `/posts/:id` và `/post-photos/:id` dùng bài **nháp**, vì bài đã đăng được đọc công khai có chủ đích.
- Miễn kiểm `GET /profiles/:username/posts`.

## Tiêu chí chấp nhận

- **E2E API** (`e2e/api/social-posts.api.spec.ts`, có worker thật xử lý ảnh, ảnh mẫu `e2e/fixtures/photo.jpg` 1600×1200 có EXIF):
  - Đăng 2 ảnh gắn 1 bé:
    - Lúc còn nháp, người khác bị 404.
    - Sau khi xử lý xong, bài `PUBLISHED`; ảnh rộng 1080.
    - Người khác thấy tên bé, không thấy email hay giống.
    - Lưới hồ sơ có bài; `postCount` = 1.
  - Gắn thú cưng: không gắn → `pets: []`; gắn bé của người khác → 422 `PET_NOT_OWNED`.
  - Sửa và xóa:
    - Sửa chú thích và bỏ gắn bé → thành công.
    - B sửa hoặc xóa bài của A → 404, dữ liệu không đổi.
    - A xóa bài → bài 404.
  - Kiểm đầu vào: chưa có hồ sơ → 409; `photoCount` 6 → 422.
- **Unit:** ảnh bài đăng 3000×1000 → 1080×360, thumbnail 360×360, không còn EXIF.
- **IDOR:** 116/116 Pass.
- **Chưa kiểm tự động:**
  - Bài thứ 31 trong ngày → 429. Dùng rate limiter chung đã kiểm ở S0-05.
  - Tệp bị xóa ≤ 1 phút sau khi xóa bài. Dùng job purge đã kiểm ở S2-02.
