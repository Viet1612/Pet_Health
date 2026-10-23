# S2-02 · Pipeline ảnh: tải lên, `media.process`, URL ký, `GET /media`, `purge-prefix` — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S2-02](../tasks/S2-02-media-pipeline.md) |
| Trạng thái | Xong (code), chưa chạy với ảnh HEIC thật |
| Ngày hoàn thành | 2026-10-24 |
| Commit | xem [README](README.md) |

## Kết quả

- **Migration `202610251010_uploads`:** bảng `uploads` đúng spec (có `fail_reason`), RLS `owner_isolation`, cấp quyền `app_rw`/`app_worker`. Đã chạy trên DB dev.
- **`platform/storage/`:**
  - `ObjectStoragePort`: `writeStream`, `readStream`, `read`, `readHead`, `put`, `delete`, `deletePrefix`.
  - `LocalDiskStorage`: mọi khóa phải nằm trong `MEDIA_ROOT`. `put` ghi `.tmp`, `fsync` rồi rename. `writeStream` dừng khi vượt `maxBytes`.
- **`platform/http/multipart.ts`:** giới hạn 5 MB, đúng 1 tệp. `@fastify/multipart` đăng ký trong `buildApp`.
- **Config:** thêm `MEDIA_ROOT` (mặc định `./.data/media`) và `MEDIA_SIGNING_KEY` (≥ 32 ký tự, bắt buộc).
- **Mô-đun `modules/media/`:**
  - `domain/magic-bytes.ts`: nhận JPEG, PNG, HEIC (`heic`/`heix`/`mif1`); từ chối AVIF và mọi định dạng khác.
  - `domain/media-key.ts`: regex khóa ảnh và prefix xóa, hàm dựng khóa `avatarKey`/`visitPhotoKey`/`thumbKeyOf`/`petPrefix`/`userPrefix`.
  - `domain/signed-url.ts`: `exp` làm tròn xuống phút (hiệu lực 840–900 s). Chữ ký HMAC-SHA256 base64url, so độ dài rồi `timingSafeEqual`.
  - `application/accept-upload.ts`: ghi `uploads (PROCESSING)` và gửi `media.process` (`retryLimit 3`, backoff) trong transaction của route gọi.
  - `application/process-image.ts`:
    - `transformImage`: `rotate()` theo EXIF, rồi JPEG q82 cạnh dài ≤ 2048 (không phóng to) và thumbnail ≤ 320. Đầu ra không giữ metadata.
    - Phân loại lỗi: vượt 50 MP → `TOO_MANY_PIXELS`; giải mã lỗi → `CORRUPT`. Hai lỗi này đặt `FAILED` không thử lại.
    - `processImage`: idempotent (upload không còn `PROCESSING` thì bỏ qua). Lỗi khác ném để pg-boss thử lại; lần cuối → `PROCESSING_ERROR`.
    - Gọi `TargetResolver` (`finalKey`, `onReady` cùng transaction với `READY`, `onFailed`).
  - `application/purge-prefix.ts`: `enqueuePurgePrefix` (kiểm prefix trước khi gửi job) và `purgePrefix`.
  - `adapters/http/receive-upload.ts`:
    - Nhận field `file`, ghi vào `incoming/{uploadId}`, kiểm 16 byte đầu.
    - Lỗi: `413 FILE_TOO_LARGE`, `415 UNSUPPORTED_FORMAT`, `422 FILE_REQUIRED`, `400 INVALID_UPLOAD`. Mọi lỗi đều xóa tệp tạm.
  - **`GET /api/v1/uploads/{uploadId}`** → `{ status, reason? }`; của người khác hoặc ID sai → `404`.
  - **`GET /media/*`** (gốc, `public`):
    - Khóa sai mẫu → `404`; chữ ký sai hoặc hết hạn → `403 MEDIA_URL_INVALID`; không có tệp → `404`.
    - Header `image/jpeg`, `private, max-age=900`, `nosniff`.
  - `MediaService` cho mô-đun khác: `receive`, `accept`, `discard`, `signUrl`, `enqueuePurge`.
- **`buildApp`:** thêm `registerRootRoutes` (route ngoài `/api/v1`). `modules/index.ts` có `registerRootModuleRoutes` và `mediaTargetResolvers()` (rỗng; S2-03 thêm `AVATAR`).
- **Worker:**
  - `media.process` (2 song song, đọc `retryCount`/`retryLimit`) và `media.purge-prefix` (2 song song; prefix sai thì log rồi bỏ).
  - Log `sharp heif input`; production mà `false` thì thoát.
- **Compose dev (profile `full`):** `api` mount thư mục ảnh read-only, chỉ `incoming/` ghi được; `worker` mount read-write.
- **IDOR:** fixture `uploads.idor.ts`; danh sách route public đổi `GET /media/:key` → `GET /media/*`.
- **Contract:** `openapi.yaml` và api-client đã sinh lại.

## Tiêu chí chấp nhận

**Đã kiểm:** typecheck, lint, depcruise, 121 unit test. Trong đó 12 test mới ở `test/media.test.ts`:
- Magic bytes 6 mẫu.
- Regex khóa: traversal, UUID hoa, đuôi khác.
- Prefix xóa.
- URL ký: đúng / sửa 1 ký tự / độ dài khác / khóa khác / thiếu sig / +901 s / biên `exp = now`.
- `transformImage`: 3000×1000 → 2048×683 và thumb 320, không EXIF/XMP/IPTC/orientation; JPEG Orientation 6 → xoay đúng, không phóng to; vượt giới hạn pixel → `TOO_MANY_PIXELS`; dữ liệu hỏng → `CORRUPT`.
- `LocalDiskStorage`: xóa prefix 2 lần, chặn khóa ngoài gốc.

**Trên server dev:**
- `/media` chữ ký sai → `403`; `..` → `404`.
- `/uploads/{id}` không phiên → `401`.
- Worker khởi động với `heifInput: true`.

**Chưa kiểm:**
- Ảnh HEIC thật từ iPhone. Sharp prebuilt trên Windows báo `heifInput: true` nhưng thường chỉ đọc AVIF, không đọc HEIC; cần chạy trong image `ph-app`.
- Luồng upload đầu-cuối (chưa có route dùng `receive`, S2-03 mới gắn).
- `413` ở 5 MB + 1 byte; Caddy chặn > 6 MB; retry khi lỗi I/O; quyền ghi của container `api`; bộ test IDOR.

## Khác với file task

- **Tên migration** `202610251010_uploads.ts` theo quy ước của repo.
- **Không có fixture ảnh thật** (`iphone-gps.heic`…) trong `test/fixtures/media/`. Unit test dựng ảnh bằng sharp trong bộ nhớ; giới hạn pixel kiểm bằng ngưỡng nhỏ thay cho ảnh 64 MP.
- **`ObjectStoragePort` thêm `read(key)`**, để worker đọc cả tệp (≤ 5 MB) vào bộ nhớ trước khi đưa cho sharp.
- **Mục tiêu đã bị xóa** khi xử lý → `FAILED` với lý do `PROCESSING_ERROR` (spec không nêu lý do).
- **Kiểm sharp HEIF khi khởi động:** chỉ dừng worker ở production; máy dev chỉ ghi log.
- **Giới hạn multipart** đặt trong `platform/http/multipart.ts`, vì `buildApp` (platform) không được import từ mô-đun.
