# S3-04 · API ảnh bản ghi khám

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S3 · T7–8 |
| Story | US-033, US-034 |
| Yêu cầu | FR-VIS-005, 006, 007, 008; NFR-SEC-006, NFR-SEC-011; FR-GEN-005 |
| Phụ thuộc | [S3-03](S3-03-visits-api.md), [S2-02](S2-02-media-pipeline.md) |
| Ước lượng | 1 ngày |
| Màn hình Figma | — |

## Mục tiêu

Cho phép đính kèm tối đa 5 ảnh (JPG/PNG/HEIC, ≤ 5 MB) vào một bản ghi khám, mỗi ảnh một request độc lập, xử lý bất đồng bộ bằng pipeline ảnh đã có; xem ảnh qua URL ký 15 phút và xóa từng ảnh.

## Phạm vi

**Trong phạm vi:** `POST /visits/{id}/photos`; `DELETE /photos/{id}`; mở rộng `media.process` cho `target_kind = 'VISIT_PHOTO'`; `GET /uploads/{id}` trả `photo` cho ảnh khám; điền `photos` trong `GET /visits/{id}`; ca IDOR.

**Ngoài phạm vi:** bảng `visit_photos` (đã tạo ở [S3-03](S3-03-visits-api.md)); kiểm magic bytes, giải mã HEIC, xóa metadata, ký URL, `GET /media/{key}`, `media.purge-prefix` (đã có ở [S2-02](S2-02-media-pipeline.md)); giao diện ([S3-05](S3-05-visits-ui.md)).

## Chi tiết kỹ thuật

**Vị trí mã**

- `apps/api/src/modules/health-records/application/` — `attach-visit-photo.ts`, `delete-visit-photo.ts`, `on-visit-photo-processed.ts`.
- `adapters/http/visit-photos.routes.ts`; `adapters/persistence/visit-photos.repo.ts`.
- `MediaPort` (S2-02): `receiveUpload(stream, { maxBytes }) → { uploadId, incomingKey, sizeBytes, format }`, `createUpload(trx, …)`, `signUrl(key)`, `enqueuePurgePrefix(prefix, trx)`.

**Hằng số:** `MAX_PHOTOS_PER_VISIT = 5`; `MAX_PHOTO_BYTES = 5 * 1024 * 1024`; Caddy giới hạn body 6 MB; URL ký `exp = now + 900 s`.

**`POST /visits/{id}/photos`** — `multipart/form-data`, field `file`, header `Idempotency-Key` bắt buộc.

1. Xác thực + CSRF. Thiếu key → `400 IDEMPOTENCY_KEY_REQUIRED`; key đã có → trả lại response đã lưu (S0-05), không đọc tiếp body.
2. Đọc visit (RLS) → không có → `404 NOT_FOUND`, trước khi nhận tệp.
3. Đếm sơ bộ `SELECT count(*) FROM visit_photos WHERE visit_id = $1 AND status <> 'FAILED'`; ≥ 5 → `409 PHOTO_LIMIT_REACHED` "Tối đa 5 ảnh mỗi lần khám".
4. `MediaPort.receiveUpload` stream vào `incoming/{uploadId}`, ngắt khi vượt 5 MB → xóa tệp, `413 PAYLOAD_TOO_LARGE` "Ảnh vượt 5 MB". 16 byte đầu không phải `FFD8FF` / `89504E47` / `ftyp heic|heix|mif1` → xóa tệp, `415 UNSUPPORTED_FORMAT` "Định dạng không hỗ trợ (chỉ JPG, PNG, HEIC)".
5. Transaction:
   - `SELECT pet_id FROM visits WHERE id = $1 FOR UPDATE` (tuần tự hóa các request song song cho cùng bản ghi).
   - Đếm lại; ≥ 5 → rollback, xóa tệp incoming, `409 PHOTO_LIMIT_REACHED`.
   - `photoId = uuidv7()`; `INSERT visit_photos (id, owner_id, visit_id, storage_key = 'u/{owner}/p/{pet}/v/{visit}/{photoId}.jpg', thumb_key = '…/{photoId}_thumb.jpg', size_bytes, status = 'PROCESSING')`.
   - `INSERT uploads (id = uploadId, owner_id, target_kind = 'VISIT_PHOTO', target_id = photoId, incoming_key, status = 'PROCESSING')`.
   - Enqueue `media.process { uploadId }` và lưu bản ghi idempotency trong cùng transaction.
6. Trả `202 { photoId, uploadId, status: "PROCESSING" }`.

**Worker `media.process` với `VISIT_PHOTO`** (mở rộng handler S2-02, role `app_worker`):

1. Pipeline chung: giải mã → xoay theo EXIF → xóa EXIF/XMP/IPTC → JPEG q82 cạnh dài ≤ 2048 px + thumbnail 320 px; > 50 megapixel → lỗi.
2. Ghi `storage_key`, `thumb_key`; xóa `incoming/{uploadId}`.
3. `UPDATE visit_photos SET status = 'READY', size_bytes = <kích thước JPEG> WHERE id = $photoId` và `uploads.status = 'READY'`. Nếu `UPDATE` ảnh hưởng 0 dòng (ảnh hoặc bản ghi đã bị xóa) → xóa hai tệp vừa ghi, kết thúc không lỗi.
4. Lỗi giải mã hoặc hết 3 lần thử → `status = 'FAILED'`, `fail_reason` ∈ `CORRUPT`, `TOO_MANY_PIXELS`, `UNSUPPORTED_FORMAT`, `INTERNAL`. Lỗi của ảnh này không chạm tới ảnh khác hay bản ghi (FR-VIS-006).

**`GET /uploads/{id}`** (route của S2-02) với `VISIT_PHOTO`: `READY` → `{ status, photo: { id, thumbUrl, url } }`; `FAILED` → `{ status, reason }`.

**`GET /visits/{id}`** điền `photos`:

```ts
type VisitPhoto = {
  id: string;
  status: "PROCESSING" | "READY";  // ảnh FAILED không trả về
  thumbUrl: string | null;         // /media/u/…/{photoId}_thumb.jpg?exp=…&sig=…, null khi PROCESSING
  url: string | null;              // bản 2048 px, ký 15 phút
  createdAt: string;
};
```

Sắp theo `created_at ASC`. `photoCount` ở danh sách (S3-03) chỉ đếm `READY`.

**`DELETE /photos/{id}`** — transaction: `SELECT … FROM visit_photos WHERE id = $1 FOR UPDATE` (RLS) → không có → `404`; `DELETE`; `MediaPort.enqueuePurgePrefix('u/{owner}/p/{pet}/v/{visit}/{photoId}')` xóa `{photoId}.jpg` và `{photoId}_thumb.jpg`. Trả `204`. Nếu `media.purge-prefix` của S2-02 chỉ xóa theo thư mục, mở rộng để nhận prefix tên tệp (khớp `{prefix}*`), vẫn kiểm regex khóa an toàn của SAD §3.2.2.

## Giao diện

Không có.

## Tiêu chí chấp nhận

- [ ] JPG, PNG, HEIC ≤ 5 MB → `202 { photoId, uploadId, status: "PROCESSING" }`; worker chuyển ảnh sang `READY`.
- [ ] Ảnh HEIC từ iPhone được lưu thành JPG; tệp đã lưu không còn EXIF (kể cả GPS).
- [ ] Ảnh thứ 6 (đếm `status <> 'FAILED'`) → `409 PHOTO_LIMIT_REACHED`; 4 ảnh cũ + 1 ảnh `FAILED` vẫn cho tải thêm 1 ảnh.
- [ ] Hai request song song khi đã có 4 ảnh: đúng một request `202`, request kia `409`.
- [ ] Tệp > 5 MB → `413`; tệp đổi đuôi `.jpg` nhưng nội dung là PDF → `415`.
- [ ] Một ảnh `FAILED` không làm thay đổi trạng thái các ảnh khác hay nội dung bản ghi.
- [ ] Gửi lại cùng `Idempotency-Key` trả cùng `photoId`, không tạo ảnh thứ hai.
- [ ] `GET /visits/{id}` trả `thumbUrl`, `url` ký; URL hết hạn sau 15 phút → `GET /media/...` trả `403`.
- [ ] `DELETE /photos/{id}` → `204`; ảnh biến mất khỏi `GET /visits/{id}`, `photoCount` ở danh sách giảm 1; tệp trên đĩa bị xóa bởi job.
- [ ] Xóa ảnh/bản ghi khi ảnh đang `PROCESSING`: worker không ghi lại tệp mồ côi.
- [ ] Route mới có Zod, `openapi.yaml`, ca IDOR.

## Kiểm thử

- **Integration (Testcontainers + volume tạm):** JPG 1 KB; PNG; HEIC thật từ iPhone (fixture của S2-02); tệp đúng 5.242.880 byte được nhận, 5.242.881 byte → `413`; PDF đổi đuôi → `415`; ảnh 60 megapixel → `FAILED/TOO_MANY_PIXELS`; ảnh JPEG cắt cụt → `FAILED/CORRUPT`.
- **Giới hạn:** 5 ảnh `READY` → ảnh 6 `409`; 2 request song song ở ảnh thứ 5 bằng `Promise.all`.
- **Đua xóa:** enqueue ảnh, xóa bản ghi trước khi worker chạy → không còn tệp trong `u/.../v/{visitId}/`.
- **EXIF:** đọc lại tệp đầu ra bằng `sharp().metadata()` → không có `exif`, `xmp`, `iptc`.
- **IDOR (S1-08):** `POST /visits/{id}/photos` vào bản ghi của tài khoản khác → `404` và không có tệp nào trong `incoming/`; `DELETE /photos/{id}` và `GET /uploads/{id}` của người khác → `404`.

## Ghi chú

- Dòng `visit_photos` ở trạng thái `FAILED` không trả về client và không tính vào giới hạn; client "Thử lại" bằng request mới. Có thể gộp việc dọn dòng `FAILED` > 1 ngày vào `maintenance.daily` ([S6-06](S6-06-maintenance-job.md)) cùng `uploads` bỏ dở.
- `api` chỉ ghi/xóa trong `incoming/` (theo SAD §3.2.2); tệp chính thức dưới `u/` chỉ worker ghi và xóa, nên xóa ảnh luôn đi qua job.
