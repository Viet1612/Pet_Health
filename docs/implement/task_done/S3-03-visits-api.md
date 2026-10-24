# S3-03 · API bản ghi khám — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S3-03](../tasks/S3-03-visits-api.md) |
| Trạng thái | Xong, đã gọi thử trên server dev |
| Ngày hoàn thành | 2026-10-25 |
| Commit | xem [README](README.md) |

## Kết quả

- **Migration `202610251030_visits`:**
  - Bảng `visits`: `pet_id … ON DELETE CASCADE`, CHECK mỗi trường văn bản ≤ 2000 ký tự, CHECK có triệu chứng hoặc chẩn đoán. Index `(pet_id, visited_on DESC, created_at DESC, id DESC)`.
  - Bảng `visit_photos` tạo sẵn cho S3-04 (`ON DELETE CASCADE` theo `visit_id`).
  - Cả hai bảng bật RLS `owner_isolation` và cấp quyền cho `app_rw`/`app_worker`. Đã chạy trên DB dev.
- **`health-records/domain/visit.ts`:**
  - `normalizeVisitText` (NFC, trim, rỗng → `null`).
  - `validateVisitText`: > 2000 code point → `TOO_LONG`; thiếu cả triệu chứng lẫn chẩn đoán → `SYMPTOMS_OR_DIAGNOSIS_REQUIRED` gắn cho cả hai trường.
  - `summarizeVisitText`: xuống dòng → khoảng trắng, giữ 120 code point.
  - `encodeVisitCursor` / `decodeVisitCursor`: base64url của `{v, c, i}`; `c` là `created_at::text` để giữ micro giây. Từng phần được kiểm bằng regex.
- **`application/`:**
  - `visit-input.ts`: `buildVisitFields` gộp dữ liệu gửi lên với bản ghi hiện có (PATCH) rồi kiểm lại toàn bộ. `null` hoặc `""` xóa trường. Ngày thiếu → hôm nay theo múi giờ tài khoản; tương lai → `DATE_IN_FUTURE`; sai định dạng → `REQUIRED`.
  - Use case `createVisit`, `listVisits`, `getVisit`, `updateVisit` (khóa dòng, last-write-wins), `deleteVisit`.
  - `deleteVisit` khóa dòng, xóa (cascade ảnh), rồi gửi `media.purge-prefix` cho `u/{owner}/p/{pet}/v/{visit}/` cùng transaction.
  - `visit-photo-views.ts` tạm trả mảng rỗng (S3-04 điền ảnh).
- **`adapters/persistence/visits.repo.ts`:** keyset `(visited_on, created_at, id) < (…)`, đếm `photoCount` bằng subquery chỉ tính ảnh `READY`. Mọi truy vấn lọc `owner_id`.
- **`adapters/http/visits.routes.ts`:**
  - `GET /pets/{petId}/visits?limit&cursor` → `{ items, nextCursor, totalCount }`. `limit` 1–50, mặc định 20. Cursor hỏng → `400 INVALID_CURSOR`.
  - `POST /pets/{petId}/visits` (bắt buộc `Idempotency-Key`) → `201 Visit`.
  - `GET` / `PATCH` / `DELETE /visits/{id}`. ID sai định dạng → `404`.
- **`health-records` nhận `MediaService`** (từ `MediaDeps`) để gửi job xóa ảnh.
- **IDOR:** fixture `visits.idor.ts` cho `/visits/:id` (khớp cả `/visits/:id/…` của S3-04), kèm body hợp lệ cho POST và PATCH.
- **Contract:** `openapi.yaml` và api-client đã sinh lại.
- **Test:** `test/visit-domain.test.ts`, 6 ca: chuẩn hóa NFC; 2000/2001 code point; lỗi 2 trường; rút gọn; `buildVisitFields` cho POST/PATCH; con trỏ (giữ micro giây, từ chối con trỏ hỏng hay chứa chuỗi chèn SQL).

## Tiêu chí chấp nhận

**Đã kiểm trên server dev:**
- `POST` không có ngày → `201`, `visitedOn` = 2026-10-25, `photos: []`. Gửi lại cùng key → `Idempotency-Replayed: true`.
- Chỉ có khoảng trắng → `422` với lỗi ở cả `symptoms` và `diagnosis`. Ngày năm 2099 → `DATE_IN_FUTURE`.
- 2001 ký tự → `TOO_LONG`; đúng 2000 ký tự → `201`.
- 6 bản ghi (3 bản ghi cùng ngày 20/09), `limit=2` → 3 trang, không trùng, không sót, đúng thứ tự giảm dần, `totalCount=6`.
- Mục danh sách có triệu chứng rút gọn ("Ngứa rụng lông") và `photoCount`. Cursor hỏng → `400 INVALID_CURSOR`.
- `PATCH` chẩn đoán → `GET` trả nội dung mới. `PATCH` xóa cả hai trường chính → `422`.
- `DELETE` → `204`, `GET` sau đó → `404`. Job `media.purge-prefix` với `…/v/{visitId}/` đã chạy xong. ID sai → `404`.
- Typecheck, lint, depcruise, unit test.

**Chưa kiểm:** bộ test IDOR (cần Docker); xóa bản ghi có ảnh (chờ S3-04).

## Khác với file task

- **Tên migration** `202610251030_visits.ts` theo quy ước của repo. RLS bằng `enableOwnerRls` (có `FORCE`).
- **`visit_photos.size_bytes`** có `DEFAULT 0` (khi tạo dòng chưa biết kích thước JPEG) và `status DEFAULT 'PROCESSING'`.
- **`MediaService.enqueuePurge(trx, prefix)`** của S2-02 thay cho `MediaPort.enqueuePurgePrefix(prefix, trx)`.
