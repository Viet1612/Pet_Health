# S2-02 · Pipeline ảnh: tải lên, `media.process`, URL ký, `GET /media`, `purge-prefix`

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S2 · T5–6 |
| Story | — (hạ tầng cho US-012, US-033, US-034) |
| Yêu cầu | FR-PET-005, FR-VIS-005→008, NFR-SEC-006, NFR-SEC-011, SD-007, AD-007, G-11; RSK-A06 |
| Phụ thuộc | [S1-01](S1-01-identity-schema-rls.md), [S0-10](S0-10-docker-images.md) |
| Ước lượng | 2,5 |
| Màn hình Figma | — |

## Mục tiêu

Xây mô-đun `media` dùng chung cho ảnh đại diện (S2-03) và ảnh bản ghi khám (S3-04): nhận tệp ≤ 5 MB, kiểm định dạng bằng nội dung, worker chuyển HEIC/PNG/JPG thành JPEG đã xóa sạch metadata kèm thumbnail, phục vụ ảnh chỉ qua URL ký HMAC hiệu lực 15 phút, xóa ảnh theo prefix khi xóa dữ liệu chủ.

## Phạm vi

**Trong phạm vi:** bảng `uploads`; `ObjectStoragePort` + adapter đĩa; service nhận upload dùng chung; job `media.process` và `media.purge-prefix`; ký và kiểm URL; `GET /media/{key}`; `GET /api/v1/uploads/{id}`; giới hạn body ở Caddy; mount volume; test với ảnh HEIC thật.

**Ngoài phạm vi:** endpoint gắn ảnh vào thú cưng ([S2-03](S2-03-pet-avatar-api.md)) và bản ghi khám (S3-04); dọn `uploads` bỏ dở > 1 ngày (S6-06); rule bypass cache `/media/*` trên Cloudflare (S7-02).

## Chi tiết kỹ thuật

**Vị trí mã**

```
apps/api/migrations/0210_uploads.ts
apps/api/src/platform/storage/{object-storage.port.ts,local-disk-storage.ts}
apps/api/src/modules/media/
  domain/{media-key.ts,magic-bytes.ts,signed-url.ts}
  application/{accept-upload.ts,get-upload.ts,process-image.ts,purge-prefix.ts,ports.ts}
  adapters/http/{uploads.routes.ts,media.routes.ts}
  adapters/persistence/kysely-upload-repository.ts
  adapters/jobs/{media-process.job.ts,media-purge-prefix.job.ts}
apps/api/test/fixtures/media/   # iphone-gps.heic, orient6.jpg, sample.png, fake.jpg, 64mp.png
```

**Bảng `uploads`** (SAD §3.1.3; thêm `fail_reason` để `GET /uploads` trả `reason`)

```sql
CREATE TABLE uploads (
  id           uuid PRIMARY KEY,
  owner_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_kind  text NOT NULL CHECK (target_kind IN ('AVATAR','VISIT_PHOTO')),
  target_id    uuid NOT NULL,
  incoming_key text NOT NULL,
  status       text NOT NULL DEFAULT 'PROCESSING' CHECK (status IN ('PROCESSING','READY','FAILED')),
  fail_reason  text CHECK (fail_reason IN ('UNSUPPORTED_FORMAT','CORRUPT','TOO_MANY_PIXELS','PROCESSING_ERROR')),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX uploads_owner_id_idx ON uploads(owner_id);
-- RLS owner_isolation như SAD §3.1.2; GRANT cho app_rw, app_worker
```

**`ObjectStoragePort`** (`platform/storage`, AD-007)

```ts
interface ObjectStoragePort {
  writeStream(key: string, src: Readable, opts: { maxBytes: number }): Promise<{ bytes: number; truncated: boolean }>;
  readStream(key: string): Promise<Readable | null>;   // null nếu không có
  readHead(key: string, n: number): Promise<Buffer>;
  put(key: string, data: Buffer): Promise<void>;       // ghi tệp .tmp rồi rename (nguyên tử)
  delete(key: string): Promise<void>;                  // không lỗi nếu không có
  deletePrefix(prefix: string): Promise<void>;         // rm -rf, idempotent
}
```

Adapter `LocalDiskStorage(MEDIA_ROOT)`: `path.resolve(root, key)` phải bắt đầu bằng `root + sep`, ngược lại ném lỗi. Bố cục (SAD §2.3): `incoming/{uploadId}`, `u/{userId}/p/{petId}/avatar/{id}.jpg`, `u/{userId}/p/{petId}/v/{visitId}/{photoId}.jpg`, mỗi ảnh kèm `{id}_thumb.jpg`.

**Nhận upload — `acceptUpload({ ownerId, targetKind, targetId, file })`** (gọi từ route của S2-03, S3-04)

1. `@fastify/multipart` đăng ký với `limits: { fileSize: 5_242_880, files: 1, fields: 0, parts: 1 }`; chỉ nhận field `file`. Caddy: `request_body { max_size 6MB }` cho `/api/*` (SAD §3.2.2).
2. Sinh `uploadId = uuidv7()`; stream vào `incoming/{uploadId}`; khi `file.truncated` → xóa tệp, `413 FILE_TOO_LARGE` "Ảnh vượt 5 MB".
3. Đọc 16 byte đầu (`domain/magic-bytes.ts`): `FF D8 FF` → JPEG; `89 50 4E 47` → PNG; byte 4–7 = `ftyp` và byte 8–11 ∈ {`heic`,`heix`,`mif1`} → HEIC. Khác → xóa tệp, `415 UNSUPPORTED_FORMAT` "Định dạng không hỗ trợ (chỉ JPG, PNG, HEIC)". Không tin `Content-Type` hay đuôi tệp.
4. Trong transaction của route gọi: `INSERT uploads (PROCESSING)` + `boss.send('media.process', { uploadId }, { retryLimit: 3, retryBackoff: true })` cùng transaction (AD-006). Lỗi transaction → xóa `incoming/{uploadId}`.

**Job `media.process`** (worker, 2 handler song song, retry 3 lần)

1. Đọc `uploads` (role `app_worker`); không còn hoặc khác `PROCESSING` → bỏ qua (idempotent).
2. Gọi `TargetResolver` của `targetKind` (port do `pets`/`health-records` đăng ký) để lấy `finalKey` dạng `u/{ownerId}/p/{petId}/avatar/{id}.jpg`; mục tiêu đã bị xóa → xóa incoming, đặt `FAILED`, dừng.
3. `sharp(input, { limitInputPixels: 50_000_000, failOn: 'error' })` → `.rotate()` (xoay theo EXIF Orientation) → `.resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })` → `.jpeg({ quality: 82 })`. Không gọi `withMetadata()`/`keepExif()`: đầu ra không có EXIF, XMP, IPTC, GPS (SD-007). Thumbnail: cùng nguồn, cạnh dài ≤ 320 px, q82.
4. `put(finalKey)`, `put(thumbKey)`; xóa `incoming/{uploadId}`; `UPDATE uploads SET status='READY'`; gọi `TargetResolver.onReady(targetId, finalKey)` trong cùng transaction.
5. Lỗi phân loại: vượt 50 MP → `TOO_MANY_PIXELS`; libvips không giải mã được → `CORRUPT`; hai lỗi này đặt `FAILED` **không retry**. Lỗi I/O → ném để pg-boss retry; lần cuối thất bại → `FAILED` + `PROCESSING_ERROR` và gọi `onFailed`.

Sharp phải dùng libvips hệ thống có libheif + libde265 (S0-10); khởi động worker log `sharp.format.heif.input.file === true`, nếu `false` thì thoát với lỗi.

**Job `media.purge-prefix`** (`{ prefix }`, 2 song song, retry 10): `prefix` phải khớp `^u/[0-9a-f-]{36}/(p/[0-9a-f-]{36}/((avatar|v/[0-9a-f-]{36})/)?)?$`; gọi `deletePrefix`. Chạy lại nhiều lần không lỗi.

**URL ký** (SAD §3.2.2, `domain/signed-url.ts`)

- `exp = floor((now + 900) / 60) * 60` (giây Unix; URL ổn định trong 1 phút để trình duyệt dùng lại cache, hiệu lực 840–900 s ≤ 15 phút).
- `sig = base64url(HMAC-SHA256(MEDIA_SIGNING_KEY, key + "\n" + exp))`; URL `/media/{key}?exp={exp}&sig={sig}`.
- `signMediaUrl(key)` xuất qua `MediaUrlPort` cho mô-đun khác dùng.

**`GET /media/{key}`** (route `public: true`, không cần phiên; Caddy chuyển `/media/*` tới `api:3000`)

1. `key` không khớp `^u/[0-9a-f-]{36}/p/[0-9a-f-]{36}/(avatar|v/[0-9a-f-]{36})/[0-9a-f-]{36}(_thumb)?\.jpg$` → `404`.
2. Thiếu `exp`/`sig`, `exp < now` → `403`. Tính lại chữ ký, so độ dài rồi `crypto.timingSafeEqual` → sai `403`.
3. Stream tệp: `Content-Type: image/jpeg`, `Cache-Control: private, max-age=900`, `X-Content-Type-Options: nosniff`; không có tệp → `404`.

**`GET /api/v1/uploads/{id}`** → `200 { status, reason? }` (S3-04 bổ sung `photo`); upload của người khác → `404`.

**Env và volume**

| Biến | Giá trị |
|---|---|
| `MEDIA_ROOT` | `/data/media` |
| `MEDIA_SIGNING_KEY` | 32 byte ngẫu nhiên base64 (`openssl rand -base64 32`), trong `secrets/app.env` |

Compose: `worker` mount `/srv/pethealth/media:/data/media:rw`; `api` mount `/srv/pethealth/media:/data/media:ro` **và** `/srv/pethealth/media/incoming:/data/media/incoming:rw` (api chỉ cần ghi `incoming/`). Thêm vào `compose.dev.yml` và `.env.example`.

## Giao diện

Không có.

## Tiêu chí chấp nhận

- [ ] Ảnh HEIC thật từ iPhone (có GPS, Orientation ≠ 1) → JPEG hiển thị đúng chiều trên Chrome; `exiftool` không còn thẻ GPS, EXIF, XMP, IPTC.
- [ ] Đầu ra cạnh dài ≤ 2048 px (ảnh nhỏ hơn không bị phóng to), thumbnail cạnh dài ≤ 320 px.
- [ ] Tệp 5 MB nhận; 5 MB + 1 byte → `413`; body > 6 MB bị Caddy chặn.
- [ ] Tệp văn bản đổi đuôi `.jpg` → `415 UNSUPPORTED_FORMAT`, không để lại tệp trong `incoming/`.
- [ ] Ảnh > 50 MP → `FAILED` `TOO_MANY_PIXELS`, không retry.
- [ ] URL ký đúng → `200`; sửa 1 ký tự `sig` → `403`; `exp` đã qua → `403`; FakeClock + 901 s → `403`.
- [ ] `key` chứa `..` hoặc không khớp regex → `404`, không đọc tệp ngoài `MEDIA_ROOT`.
- [ ] `media.purge-prefix` xóa đúng thư mục, chạy 2 lần không lỗi; prefix sai mẫu bị từ chối.
- [ ] Container `api` không ghi được ngoài `incoming/` (kiểm bằng `touch` trong container).
- [ ] `GET /uploads/{id}` của user khác → `404` (IDOR).

## Kiểm thử

- **Unit:** `magic-bytes` với 6 mẫu (JPEG, PNG, HEIC `heic`/`heix`/`mif1`, `ftypavif` → từ chối, tệp < 12 byte); `signed-url` (ký/kiểm, `exp` biên = now và now − 1, so sánh độ dài khác); regex key (path traversal, UUID viết hoa, thiếu `_thumb`).
- **Integration** (Testcontainers + thư mục tạm): chạy `media.process` thật trên 5 fixture: `iphone-gps.heic` → READY, đọc lại bằng `sharp().metadata()` có `exif`, `xmp`, `iptc` = `undefined`, `orientation` không có, kích thước đã xoay; `orient6.jpg` → chiều rộng/cao đổi chỗ; `sample.png` → JPEG; `fake.jpg` bị chặn ở API; `64mp.png` (8000×8000 một màu) → `TOO_MANY_PIXELS`.
- **Integration retry:** storage giả ném lỗi I/O 2 lần → lần 3 READY; ném 4 lần → `PROCESSING_ERROR`.
- **Integration HTTP:** `GET /media` với URL ký hợp lệ, hết hạn, sai chữ ký; kiểm header `Cache-Control`.
- **Thủ công:** chạy pipeline trong image `ph-app` thật (không chỉ trên máy dev) với ảnh HEIC chụp mới từ iPhone (RSK-A06).

## Ghi chú

- `@fastify/multipart` không tự xóa phần tệp đã ghi khi bị cắt; luôn `delete(incomingKey)` trong `finally` khi trả lỗi.
- Dọn `incoming/` mồ côi do worker chết giữa chừng thuộc `maintenance.daily` (S6-06).
