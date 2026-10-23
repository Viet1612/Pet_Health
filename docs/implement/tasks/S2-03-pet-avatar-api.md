# S2-03 · API ảnh đại diện

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S2 · T5–6 |
| Story | US-012 |
| Yêu cầu | FR-PET-005, FR-PET-006, NFR-SEC-006, NFR-SEC-011, SD-007, G-11 |
| Phụ thuộc | [S2-01](S2-01-pets-api.md), [S2-02](S2-02-media-pipeline.md) |
| Ước lượng | 0,5 |
| Màn hình Figma | — |

## Mục tiêu

Cho phép đặt, thay và gỡ một ảnh đại diện cho thú cưng qua pipeline ảnh của S2-02; mọi phản hồi `Pet` trả `avatarUrl` và `avatarThumbUrl` đã ký 15 phút.

## Phạm vi

**Trong phạm vi:** `PUT`/`DELETE /pets/{petId}/avatar`; `TargetResolver` cho `AVATAR`; ghi `pets.avatar_key`; xóa tệp ảnh cũ; ký URL trong `GET /pets`, `GET/PATCH /pets/{petId}`, `POST /pets`; ca IDOR.

**Ngoài phạm vi:** pipeline, `GET /uploads/{id}`, `GET /media/{key}` ([S2-02](S2-02-media-pipeline.md)); ô tải ảnh ở form ([S2-04](S2-04-pets-ui.md)); xóa cả thư mục khi xóa thú cưng ([S2-05](S2-05-delete-pet.md)).

## Chi tiết kỹ thuật

**Vị trí mã**

```
apps/api/src/modules/pets/
  application/{set-avatar.ts,remove-avatar.ts}
  application/avatar-target-resolver.ts   # cài đặt TargetResolver của media
  adapters/http/pet-avatar.routes.ts
  adapters/http/pet-presenter.ts          # toPetDto(): ký URL
```

**Endpoint** (SAD §2.4.2)

| Method + Path | Input | Thành công | Lỗi |
|---|---|---|---|
| `PUT /api/v1/pets/{petId}/avatar` | `multipart/form-data`, field `file` (≤ 5 MB) | `202 { uploadId, status: "PROCESSING" }` | `404`, `413 FILE_TOO_LARGE`, `415 UNSUPPORTED_FORMAT` |
| `DELETE /api/v1/pets/{petId}/avatar` | — | `204` | `404` |

`PUT` thay thế tài nguyên nên idempotent về ngữ nghĩa, không yêu cầu `Idempotency-Key`; vẫn yêu cầu `X-CSRF-Token`.

**`PUT` — luồng**

1. Kiểm `pets` thuộc `ctx.userId` (`SELECT id FROM pets WHERE id=$1 AND owner_id=$2`) **trước** khi đọc body; không có → `404` (không ghi tệp nào).
2. Gọi `acceptUpload({ ownerId, targetKind: 'AVATAR', targetId: petId, file })` của S2-02 (giới hạn 5 MB, magic bytes, insert `uploads`, enqueue `media.process`).
3. Trả `202 { uploadId, status: "PROCESSING" }`. `pets.avatar_key` **chưa đổi**: ảnh cũ vẫn hiển thị tới khi ảnh mới READY.

**`AvatarTargetResolver`** (đăng ký vào media lúc khởi tạo worker)

- `resolveKey(upload)` → `u/{ownerId}/p/{petId}/avatar/{uploadId}.jpg`; thú cưng không còn → `null` (media đặt `FAILED`).
- `onReady(tx, petId, finalKey)`:
  1. `SELECT avatar_key FROM pets WHERE id=$1 FOR UPDATE`; không có dòng (thú cưng vừa bị xóa) → xóa `finalKey` và thumbnail vừa ghi, đánh dấu upload `FAILED`, dừng.
  2. `UPDATE pets SET avatar_key=$finalKey, updated_at=now()`.
  3. Nếu có `oldKey` khác `finalKey` → sau commit xóa `oldKey` và `oldKey` `_thumb` qua `ObjectStoragePort.delete`.
- Hai lần `PUT` liên tiếp: ảnh xử lý xong sau cùng thắng (last-write-wins, FR-GEN-007); tệp của ảnh thua bị xóa ở bước 3 của lần sau.

**`DELETE`**: `UPDATE pets SET avatar_key = NULL, updated_at = now() WHERE id=$1 AND owner_id=$2 RETURNING` khóa cũ; 0 dòng → `404`; có khóa cũ → enqueue `media.purge-prefix` với `u/{ownerId}/p/{petId}/avatar/` trong cùng transaction. Gọi khi đã không có ảnh → vẫn `204`.

**Presenter** (`toPetDto`): `avatar_key` khác `null` → `avatarUrl = signMediaUrl(avatar_key)`, `avatarThumbUrl = signMediaUrl(avatar_key.replace(/\.jpg$/, '_thumb.jpg'))`; ngược lại cả hai `null`. Dùng cho mọi endpoint trả `Pet`. Dashboard (S5-03) dùng lại `avatarThumbUrl`.

**OpenAPI:** thêm 2 route, schema `UploadAccepted { uploadId: uuid, status: "PROCESSING" }`; cập nhật `api-client`.

## Giao diện

Không có.

## Tiêu chí chấp nhận

- [ ] `PUT` ảnh JPG/PNG/HEIC ≤ 5 MB → `202`; sau khi job xong `GET /pets/{petId}` trả `avatarUrl`, `avatarThumbUrl` mở được (`200 image/jpeg`).
- [ ] HEIC được chuyển sang JPG; ảnh lưu không còn EXIF/GPS.
- [ ] Ảnh > 5 MB → `413`; tệp không phải ảnh → `415`; thú cưng giữ ảnh cũ.
- [ ] Thay ảnh: ảnh cũ hiển thị tới khi ảnh mới READY; sau đó tệp cũ và thumbnail cũ bị xóa khỏi đĩa.
- [ ] `DELETE` → `204`, `avatarUrl = null`, thư mục `avatar/` của thú cưng trống sau khi job chạy.
- [ ] URL trong phản hồi có `exp` ≤ now + 900 s; quá hạn → `403`.
- [ ] `PUT`/`DELETE` với `petId` của tài khoản khác → `404`, không có tệp nào được ghi vào `incoming/`.

## Kiểm thử

- **Unit:** `toPetDto` với `avatar_key` null / có giá trị (đúng tên thumb); `resolveKey` khi thú cưng đã xóa → `null`.
- **Integration** (Testcontainers + worker chạy trong test): `PUT iphone-gps.heic` → chờ job → `avatar_key` có giá trị, 2 tệp tồn tại; `PUT` lần 2 → tệp lần 1 bị xóa; `DELETE` → `avatar_key` null và thư mục trống; `DELETE FROM pets` trực tiếp khi job đang chờ → upload `FAILED`, không còn tệp mồ côi ngoài `incoming/`.
- **IDOR:** `PUT`/`DELETE /pets/{petIdCủaA}/avatar` từ user B → `404`; số tệp trong `incoming/` không đổi.
- **Contract:** `openapi.yaml` diff sạch.
