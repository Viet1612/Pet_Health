# S2-03 · API ảnh đại diện — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S2-03](../tasks/S2-03-pet-avatar-api.md) |
| Trạng thái | Xong, đã chạy đầu-cuối trên server dev (chưa thử HEIC) |
| Ngày hoàn thành | 2026-10-24 |
| Commit | xem [README](README.md) |

## Kết quả

- **`PUT /api/v1/pets/{petId}/avatar`** (multipart, field `file`) → `202 { uploadId, status: "PROCESSING" }`.
  - Kiểm thú cưng thuộc chủ **trước** khi đọc body; của người khác → `404`, không ghi tệp.
  - Gọi `MediaService.receive` + `accept` (S2-02); transaction lỗi thì xóa tệp tạm.
  - `avatar_key` chưa đổi tới khi ảnh mới `READY`.
  - Không cần `Idempotency-Key`; vẫn cần CSRF.
- **`DELETE /api/v1/pets/{petId}/avatar`** → `204`. Đặt `avatar_key = NULL`; có ảnh cũ thì gửi `media.purge-prefix` cho `u/{owner}/p/{pet}/avatar/` cùng transaction. Không có ảnh vẫn `204`.
- **`avatarTargetResolver`** (`pets/application/avatar-target-resolver.ts`), đăng ký vào worker qua `mediaTargetResolvers(clock)`:
  - `finalKey`: `u/{owner}/p/{pet}/avatar/{uploadId}.jpg`; thú cưng không còn → `null`.
  - `onReady`: khóa dòng thú cưng (`FOR UPDATE`), ghi `avatar_key`, trả khóa cũ để worker xóa (kèm thumbnail) sau commit. Thú cưng vừa bị xóa → `TargetGoneError`; worker xóa ảnh vừa ghi và đặt upload `FAILED`.
- **Mô-đun media:**
  - `TargetResolver.onReady` giờ trả danh sách khóa cũ cần xóa sau commit.
  - Thêm `TargetGoneError`.
- **Presenter** `pets/adapters/http/pet-presenter.ts`: `toPetDto(view, signUrl)` ký `avatarUrl` và `avatarThumbUrl` (15 phút) cho mọi phản hồi `Pet` (`GET /pets`, `POST`, `GET`/`PATCH /pets/{id}`). `PetView` trong application giữ `avatarKey`, không còn URL.
- **Tách `pets.schemas.ts`:** Zod schema dùng chung, `ownerOf`, `petIdOf`.
- **Contract:** `openapi.yaml` (2 route mới) và api-client đã sinh lại.

## Tiêu chí chấp nhận

**Đã kiểm trên server dev** (thú cưng Mochi của `smoke-test@example.test`):
- Tệp văn bản đặt tên `.jpg` → `415`.
- `petId` không thuộc tài khoản → `404`.
- JPEG 3000×2000 có EXIF Orientation 6 → `202`, rồi `READY` sau khoảng 1 giây. `GET /pets/{id}` trả 2 URL ký.
- Mở `avatarUrl` → `200 image/jpeg`, `private, max-age=900`, `nosniff`. Ảnh 1365×2048 đã xoay đúng, thumbnail 213×320, không còn EXIF hay orientation.
- Thay ảnh lần 2 → trên đĩa chỉ còn ảnh mới và thumbnail mới.
- `DELETE` → `204`; thư mục `avatar/` trống sau khi job chạy; `avatarUrl = null`.
- Typecheck, lint, depcruise, 121 unit test.

**Chưa kiểm:** ảnh HEIC thật (cần image `ph-app`); `413` với tệp 5 MB + 1 byte; bộ test IDOR.

## Sự cố khi chạy thử

`apps/api/.env` local còn `WORKER_DATABASE_URL` dùng `ph_owner`, nên worker bị RLS (`FORCE`) chặn: không thấy upload nào và job kết thúc ngay, upload kẹt ở `PROCESSING`. Đã sửa `.env` local sang `app_worker`; `.env.example` vốn đúng. Đã xóa upload kẹt và tệp tạm của nó.

## Khác với file task

- **`PUT` gọi `MediaService.receive` rồi `accept`** (hai bước), không có hàm `acceptUpload({ file })` gộp; tệp tạm được dọn bằng `discard` khi transaction lỗi.
- **Đổi tên:** `resolveKey` → `finalKey`. `onReady` nhận cả bản ghi upload và trả khóa cũ, thay vì tự xóa tệp (worker giữ `ObjectStoragePort`).
