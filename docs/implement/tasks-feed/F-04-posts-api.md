# F-04 · API bài đăng: đăng, sửa chú thích, xóa, xem; ảnh `POST_PHOTO`

| Thuộc tính | Giá trị |
|---|---|
| Nhóm | Bản tin (Giai đoạn 2) |
| Phụ thuộc | [F-01](F-01-r2-storage.md), [F-03](F-03-social-schema.md) |
| Ước lượng | 2 ngày |

## Mục tiêu

Người dùng đăng bài 1–5 ảnh kèm chú thích và thú cưng được gắn; sửa chú thích; xóa bài (xóa luôn ảnh). Ảnh đi qua pipeline hiện có (HEIC, xoay EXIF, bỏ metadata vị trí).

## Phạm vi

**Trong phạm vi:** `POST /posts` (2 bước), `PATCH /posts/{id}`, `DELETE /posts/{id}`, `GET /posts/{id}`, `GET /profiles/{username}/posts`; target ảnh `POST_PHOTO`; giới hạn 30 bài/ngày.

**Ngoài phạm vi:** bản tin (F-08), tim/bình luận (F-09), báo cáo (F-12).

## Chi tiết kỹ thuật

**Luồng đăng bài** (tránh bài "nửa vời" khi ảnh lỗi):
1. `POST /posts` `{ caption?, petIds?: uuid[] ≤ 5, photoCount: 1–5 }` + `Idempotency-Key` → `201 { id, status: 'DRAFT' }`. Bài nháp không hiện ở đâu ngoài chủ.
2. Client tải từng ảnh: `POST /posts/{id}/photos` (multipart, `position`) → dùng lại `MediaService.receive/accept`, `targetKind = POST_PHOTO`.
3. Worker xử lý ảnh:
   - Tạo bản 1080 px cạnh dài và thumbnail vuông 360 px (cắt giữa).
   - Bỏ toàn bộ EXIF, kể cả GPS.
   - Khóa `u/{userId}/posts/{postId}/{photoId}.jpg`.
4. Ảnh cuối cùng `READY` → bài chuyển `PUBLISHED` (`published_at = now`). Ảnh lỗi → bài giữ `DRAFT`, client cho chọn bỏ ảnh lỗi hoặc thử lại.
5. Bài `DRAFT` quá 24 h → `maintenance.daily` xóa kèm ảnh.

**Quy tắc:**
- `caption` ≤ 2.200 ký tự sau trim.
- `petIds` phải là thú cưng **của chính người đăng** (kiểm qua `PetQueryPort`); bài chỉ lưu id và hiện **tên** lúc đọc (D5).
- **Giới hạn:** 30 bài/ngày/tài khoản (`rate_limits`, bucket `post:{userId}`) → `429 POST_LIMIT_REACHED`.
- **Sửa:** chỉ `caption` và `petIds`; không đổi ảnh sau khi đăng.
- **Xóa:** cascade + `media.purge-prefix u/{userId}/posts/{postId}/` trong cùng transaction.

**`PostView`:** `{ id, author: { username, displayName, avatarThumbUrl }, caption, pets: [{ id, name }], photos: [{ url, thumbUrl, width, height }], likeCount, commentCount, likedByMe, createdAt, isMine }`. URL ảnh ký 15 phút như hiện có.

**`GET /profiles/{username}/posts?cursor=`:** lưới, 18 bài/trang, keyset `(created_at, id)`, chỉ `PUBLISHED`, chỉ trả `{ id, thumbUrl, photoCount }`.

## Tiêu chí chấp nhận

- [ ] Đăng bài 3 ảnh → `PUBLISHED` sau khi worker xử lý xong; ảnh không còn EXIF GPS.
- [ ] Gắn thú cưng của người khác → `422 PET_NOT_OWNED`.
- [ ] Bài thứ 31 trong ngày → `429`.
- [ ] B không sửa, xóa được bài của A (`404`, dữ liệu không đổi).
- [ ] Xóa bài → ảnh trên R2 bị xóa ≤ 1 phút; tim, bình luận, thông báo liên quan mất theo.
- [ ] `PostView` không chứa email, ngày sinh, giống hay dữ liệu sức khỏe của thú cưng.

## Kiểm thử

- **Unit:** kiểm caption, `photoCount`, chuyển trạng thái `DRAFT → PUBLISHED`.
- **Integration:** worker xử lý `POST_PHOTO`, kiểm metadata đã bỏ (`sharp().metadata()` không có `exif`).
- **IDOR:** fixture `/posts/:id`; B gọi `PATCH`/`DELETE` → `404`.
- **E2E API:** đăng → xem → sửa → xóa.
