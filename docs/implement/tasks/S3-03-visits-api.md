# S3-03 · API bản ghi khám

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S3 · T7–8 |
| Story | US-030, US-031, US-032 |
| Yêu cầu | FR-VIS-001, 002, 003, 004; FR-GEN-001, 005, 007; NFR-SEC-007 |
| Phụ thuộc | [S2-01](S2-01-pets-api.md) |
| Ước lượng | 1 ngày |
| Màn hình Figma | — |

## Mục tiêu

API tạo, liệt kê (phân trang keyset), xem, sửa và xóa bản ghi khám của một thú cưng. Xóa bản ghi xóa luôn mọi ảnh đính kèm.

## Phạm vi

**Trong phạm vi:** migration `visits` và `visit_photos` (bảng ảnh tạo sẵn để `photoCount`, cascade và dọn tệp hoạt động ngay); 5 endpoint bản ghi khám; con trỏ keyset; enqueue `media.purge-prefix` khi xóa; Zod, `openapi.yaml`, `api-client`; ca IDOR.

**Ngoài phạm vi:** tải lên và xóa từng ảnh, URL ký trong `photos` ([S3-04](S3-04-visit-photos-api.md)); giao diện SCR-11→13 ([S3-05](S3-05-visits-ui.md)).

## Chi tiết kỹ thuật

**Vị trí mã**

- `apps/api/migrations/NNNN_visits.ts`.
- `apps/api/src/modules/health-records/domain/visit.ts` — `normalizeVisitText`, `assertSymptomsOrDiagnosis`, `encodeVisitCursor` / `decodeVisitCursor`.
- `application/` — `create-visit.ts`, `list-visits.ts`, `get-visit.ts`, `update-visit.ts`, `delete-visit.ts`.
- `adapters/persistence/visits.repo.ts`, `adapters/http/visits.routes.ts`.
- Kiểm thú cưng qua `PetQueryPort.getOwnedPet`; dọn tệp qua `MediaPort.enqueuePurgePrefix(prefix, trx)` (S2-02).

**Migration**

```sql
CREATE TABLE visits (
  id           uuid PRIMARY KEY,
  owner_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id       uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  visited_on   date NOT NULL,
  symptoms     text CHECK (char_length(symptoms) <= 2000),
  diagnosis    text CHECK (char_length(diagnosis) <= 2000),
  prescription text CHECK (char_length(prescription) <= 2000),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT visits_symptoms_or_diagnosis
    CHECK (coalesce(btrim(symptoms), '') <> '' OR coalesce(btrim(diagnosis), '') <> '')
);
CREATE INDEX visits_pet_list_idx ON visits (pet_id, visited_on DESC, created_at DESC, id DESC);

CREATE TABLE visit_photos (
  id          uuid PRIMARY KEY,
  owner_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visit_id    uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  thumb_key   text NOT NULL,
  size_bytes  integer NOT NULL,
  status      text NOT NULL CHECK (status IN ('PROCESSING','READY','FAILED')),
  fail_reason text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX visit_photos_visit_idx ON visit_photos (visit_id);
-- RLS policy owner_isolation + GRANT cho app_rw trên cả hai bảng, như weight_entries (S3-01)
```

**Quy tắc dữ liệu (domain)**

1. Mỗi trường văn bản: chuẩn hóa NFC, `trim`; chuỗi rỗng → `null`.
2. Độ dài đếm theo code point (`[...s].length`), khớp `char_length` của PostgreSQL và bộ đếm ở client; > 2000 → `422`, `{ field, code: "TOO_LONG", message: "Tối đa 2.000 ký tự" }`.
3. Sau chuẩn hóa, thiếu cả `symptoms` lẫn `diagnosis` → `422`, lỗi gắn cho **cả hai** trường: `{ field: "symptoms" | "diagnosis", code: "SYMPTOMS_OR_DIAGNOSIS_REQUIRED", message: "Cần ít nhất triệu chứng hoặc chẩn đoán" }`.
4. `visitedOn` thiếu → mặc định `todayIn(user.timezone, clock.now())`; `> today` → `422 DATE_IN_FUTURE` "Ngày không được ở tương lai"; sai định dạng → `422 REQUIRED` "Trường bắt buộc".
5. `PATCH` gộp trường gửi lên với bản ghi hiện có rồi áp lại bước 1–4; gửi `null` hoặc `""` để xóa một trường. Cập nhật `updated_at = now()`; last-write-wins (FR-GEN-007).

**Endpoint**

| Method + Path | Input | Thành công | Lỗi |
|---|---|---|---|
| `GET /pets/{petId}/visits` | `?limit=20&cursor` (`limit` 1–50, mặc định 20) | `200 { items: VisitSummary[], nextCursor, totalCount }` | `404`, `400 INVALID_CURSOR` |
| `POST /pets/{petId}/visits` | `{ visitedOn?, symptoms?, diagnosis?, prescription? }` + `Idempotency-Key` | `201 Visit` | `400 IDEMPOTENCY_KEY_REQUIRED`, `404`, `422` |
| `GET /visits/{id}` | — | `200 Visit` | `404` |
| `PATCH /visits/{id}` | các trường như trên, tùy chọn | `200 Visit` | `404`, `422` |
| `DELETE /visits/{id}` | — | `204` | `404` |

```ts
type VisitSummary = {
  id: string; visitedOn: string;
  diagnosis: string | null;   // 120 code point đầu, đã thay xuống dòng bằng khoảng trắng
  symptoms: string | null;    // như trên
  photoCount: number;         // số ảnh status = 'READY'
};
type Visit = {
  id: string; petId: string; visitedOn: string;
  symptoms: string | null; diagnosis: string | null; prescription: string | null;
  createdAt: string; updatedAt: string;
  photos: VisitPhoto[];       // S3-04 điền; ở task này luôn []
};
```

**Phân trang keyset**

```sql
SELECT v.id, v.visited_on, v.created_at::text AS created_at_text, left(v.diagnosis, 120) ...,
       (SELECT count(*) FROM visit_photos p WHERE p.visit_id = v.id AND p.status = 'READY') AS photo_count
FROM visits v
WHERE v.pet_id = $1
  AND ($2::date IS NULL OR (v.visited_on, v.created_at, v.id) < ($2, $3::timestamptz, $4::uuid))
ORDER BY v.visited_on DESC, v.created_at DESC, v.id DESC
LIMIT $limit + 1;
```

- Cursor = base64url của `{"v":"2026-09-20","c":"2026-09-20 11:40:12.123456+00","i":"<uuid>"}`. Giữ `created_at` dạng text để không mất micro giây khi qua `Date` của JS. Cursor hỏng → `400 INVALID_CURSOR`.
- Lấy `limit + 1` dòng; có dòng thừa thì `nextCursor` từ dòng thứ `limit`, ngược lại `null`.
- `totalCount` = `count(*)` theo `pet_id` (dùng cho dòng "4 lần khám · mới nhất trước").

**Xóa (FR-VIS-004)** — trong một transaction:

1. `SELECT owner_id, pet_id FROM visits WHERE id = $1 FOR UPDATE` → không có → `404`.
2. `DELETE FROM visits WHERE id = $1` (cascade `visit_photos`).
3. `MediaPort.enqueuePurgePrefix("u/{ownerId}/p/{petId}/v/{visitId}/", trx)` — cùng transaction, job `media.purge-prefix`.

## Giao diện

Không có.

## Tiêu chí chấp nhận

- [ ] Given ngày khám mặc định và ít nhất triệu chứng hoặc chẩn đoán, When `POST`, Then `201` và bản ghi đứng đầu `GET /pets/{petId}/visits`.
- [ ] Given thiếu cả triệu chứng lẫn chẩn đoán (kể cả chỉ có khoảng trắng), When lưu, Then `422` có lỗi tại `symptoms` và `diagnosis`.
- [ ] Ngày khám ở tương lai bị từ chối; thiếu `visitedOn` lấy hôm nay theo múi giờ tài khoản.
- [ ] Trường vượt 2.000 ký tự (đếm code point) → `422 TOO_LONG`; đúng 2.000 ký tự được nhận.
- [ ] Given bản ghi 2026-01-10, 2026-05-02, 2026-09-20, When liệt kê, Then thứ tự 09-20, 05-02, 01-10; mỗi mục có ngày, chẩn đoán rút gọn và `photoCount`.
- [ ] Given > 20 bản ghi, When gọi tiếp với `nextCursor`, Then nhận 20 bản ghi kế tiếp, không trùng, không sót (kể cả nhiều bản ghi cùng ngày).
- [ ] Given bản ghi tồn tại, When `PATCH` chẩn đoán, Then `GET /visits/{id}` trả nội dung mới.
- [ ] Given bản ghi có ảnh, When `DELETE`, Then `204`, mọi dòng `visit_photos` bị xóa và có job `media.purge-prefix` với prefix của bản ghi.
- [ ] Gửi lại `POST` cùng `Idempotency-Key` trả response cũ, không tạo bản ghi thứ hai.
- [ ] Tài nguyên của tài khoản khác → `404`; mọi route mới có trong bộ IDOR (S1-08) và `openapi.yaml`.

## Kiểm thử

- **Unit domain:** `normalizeVisitText` (NFC, `"  "` → `null`); độ dài với chuỗi có dấu tiếng Việt tổ hợp và emoji (2.000 code point hợp lệ, 2.001 bị từ chối); `assertSymptomsOrDiagnosis` cho 4 tổ hợp có/không; cursor encode/decode và cursor rác.
- **Use case + `FakeClock`:** `visitedOn` mặc định quanh nửa đêm `Asia/Ho_Chi_Minh`; `PATCH` xóa chẩn đoán khi không có triệu chứng → `422`.
- **Integration (Testcontainers):** tạo 45 bản ghi, 5 bản ghi cùng `visited_on` → duyệt 3 trang (20/20/5), tập ID đủ 45, `nextCursor` trang cuối `null`; CHECK DB chặn insert thiếu cả hai trường; cascade khi xóa thú cưng; job purge được enqueue trong cùng transaction (rollback → không có job).
- **IDOR (S1-08):** `GET/POST /pets/{petId}/visits`, `GET/PATCH/DELETE /visits/{id}` với ID của tài khoản khác → `404`, bản ghi gốc không đổi.

## Ghi chú

- Xóa bản ghi khi ảnh đang `PROCESSING`: worker phải bỏ kết quả nếu dòng `visit_photos` không còn (xử lý ở S3-04).
- Không có tìm kiếm hay lọc ở Giai đoạn 1.
