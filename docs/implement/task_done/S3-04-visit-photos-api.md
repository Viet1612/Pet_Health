# S3-04 · API ảnh bản ghi khám — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S3-04](../tasks/S3-04-visit-photos-api.md) |
| Trạng thái | Xong, đã chạy đầu-cuối trên server dev (chưa thử HEIC) |
| Ngày hoàn thành | 2026-10-25 |
| Commit | xem [README](README.md) |

## Kết quả

- **`POST /visits/{id}/photos`** (multipart, field `file`, bắt buộc `Idempotency-Key`) → `202 { photoId, uploadId, status: "PROCESSING" }`. Use case `attachVisitPhoto`:
  1. Khóa idempotency đã có phản hồi → trả lại phản hồi cũ, không đọc body (`findStoredResponse`, hàm mới trong `platform/idempotency`).
  2. Kiểm lần khám (`404`) và đếm ảnh chưa `FAILED` (≥ 5 → `409 PHOTO_LIMIT_REACHED`) **trước** khi nhận tệp.
  3. `MediaService.receive` → `413` / `415`.
  4. Một transaction (`runIdempotent`):
     - Khóa dòng lần khám (`FOR UPDATE`) rồi đếm lại, để request song song không vượt 5 ảnh.
     - Ghi `visit_photos (PROCESSING)` với `storage_key` = `u/{owner}/p/{pet}/v/{visit}/{photoId}.jpg`.
     - `MediaService.accept`: ghi `uploads` (`VISIT_PHOTO`, `target_id = photoId`) và gửi job `media.process`.
  5. Lỗi hoặc phát lại do request song song → xóa tệp tạm.
- **`DELETE /photos/{id}`** → `204`. Khóa dòng, xóa, gửi `media.purge-prefix` với `…/{photoId}` (không có đuôi), cùng transaction.
- **Worker:** `visitPhotoTargetResolver` (`application/on-visit-photo-processed.ts`) đăng ký `VISIT_PHOTO` trong `mediaTargetResolvers`.
  - `finalKey`: lấy `storage_key` của dòng ảnh; ảnh không còn → `null` (upload `FAILED`).
  - `onReady`: `status = READY`, `size_bytes` = kích thước JPEG. Không cập nhật được dòng nào (ảnh hoặc lần khám vừa bị xóa) → `TargetGoneError`; worker xóa tệp vừa ghi, không để tệp mồ côi.
  - `onFailed`: `status = FAILED` kèm lý do. Không ảnh hưởng ảnh khác hay bản ghi.
- **`GET /uploads/{id}`** của ảnh khám `READY` → thêm `photo: { id, thumbUrl, url }` đã ký.
  - Mô-đun media có thêm cơ chế `UploadPresenters` để mô-đun sở hữu mục tiêu tự điền thông tin; media không phụ thuộc ngược health-records.
- **`GET /visits/{id}`** (và phản hồi `PATCH`): `photos` gồm ảnh chưa `FAILED`, cũ nhất trước. Ảnh `READY` có `thumbUrl`/`url` ký 15 phút; ảnh `PROCESSING` để `null`.
- **Mô-đun media mở rộng:**
  - `TargetResolver.onReady` nhận thêm `{ bytes }`.
  - `purgePrefix` nhận thêm dạng tệp `…/{id}` (regex `PURGE_FILE_RE`) để xóa `{id}.jpg` và `{id}_thumb.jpg`; vẫn từ chối mọi khóa khác mẫu.
- **Repository** `visit-photos.repo.ts`: mọi truy vấn lọc `owner_id`.
- **IDOR:** fixture `visit-photos.idor.ts` cho `/photos/:id`. `/visits/:id/photos` dùng fixture `/visits/:id`.
- **Contract:** `openapi.yaml` và api-client đã sinh lại.
- **Test:** thêm 1 ca trong `test/media.test.ts`: xóa dạng tệp chỉ xóa đúng ảnh và thumbnail, giữ ảnh khác; từ chối `…/{id}.jpg`.

## Tiêu chí chấp nhận

**Đã kiểm trên server dev:**
- Tệp PDF đặt tên `.jpg` → `415 UNSUPPORTED_FORMAT`. Tệp > 5 MB → `413`.
- JPEG → `202`. Gửi lại cùng key → cùng `photoId`, có `Idempotency-Replayed: true`.
- `GET /uploads/{id}` → `READY` kèm `photo.url`.
- 5 ảnh `READY`; ảnh thứ 6 → `409 PHOTO_LIMIT_REACHED`.
- `GET /visits/{id}` trả 5 ảnh; mở `thumbUrl` → `200 image/jpeg`. `photoCount` ở danh sách = 5.
- `DELETE /photos/{id}` → `204`; sau khoảng 3 giây không còn tệp của ảnh đó; `photoCount` = 4; tải thêm 1 ảnh được.
- Xóa lần khám → `204`; không còn tệp nào của lần khám.
- Typecheck, lint, depcruise, unit test.

**Chưa kiểm:** ảnh HEIC thật; hai request song song khi đã có 4 ảnh; ca 4 ảnh + 1 ảnh `FAILED`; xóa ảnh đang `PROCESSING`; bộ test IDOR.

## Khác với file task

- **Mã lỗi `413` là `FILE_TOO_LARGE`** (dùng chung với S2-02/S2-03), không phải `PAYLOAD_TOO_LARGE`.
- **Lý do lỗi của ảnh** dùng tập của S2-02 (`CORRUPT`, `TOO_MANY_PIXELS`, `PROCESSING_ERROR`), không có `INTERNAL`.
- **`MediaService.receive` / `accept`** thay cho `MediaPort.receiveUpload` / `createUpload`.
