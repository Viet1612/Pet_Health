# S3-01 · API cân nặng và mục tiêu

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S3 · T7–8 |
| Story | US-020, US-021, US-022, US-023 |
| Yêu cầu | FR-WGT-001, 002, 003, 005, 009, 010; FR-GEN-001, 005, 007; NFR-SEC-007 |
| Phụ thuộc | [S2-01](S2-01-pets-api.md) |
| Ước lượng | 1 ngày |
| Màn hình Figma | — |

## Mục tiêu

Cung cấp API ghi, xem, sửa, xóa số đo cân nặng và đặt/xóa cân nặng mục tiêu cho từng thú cưng. Một lần gọi `GET /pets/{petId}/weights` trả đủ dữ liệu cho thẻ tóm tắt, biểu đồ và lịch sử ở SCR-10.

## Phạm vi

**Trong phạm vi:** migration `weight_entries` (RLS, index); domain kiểm giá trị kg; 6 endpoint cân nặng và mục tiêu; schema Zod, cập nhật `openapi.yaml`, sinh lại `packages/api-client`; ca IDOR cho mọi route mới.

**Ngoài phạm vi:** giao diện SCR-10, FLW-02, biểu đồ ([S3-02](S3-02-weights-ui.md)); khối cân nặng trong `GET /dashboard` ([S5-03](S5-03-dashboard-api.md)).

## Chi tiết kỹ thuật

**Vị trí mã**

- `apps/api/migrations/NNNN_weight_entries.ts` (số thứ tự kế tiếp).
- `apps/api/src/modules/health-records/domain/weight.ts` — `parseWeightKg`, `formatDelta`.
- `apps/api/src/modules/health-records/application/` — `add-weight-entry.ts`, `list-weights.ts`, `update-weight-entry.ts`, `delete-weight-entry.ts`.
- `apps/api/src/modules/health-records/adapters/persistence/weight-entries.repo.ts`, `adapters/http/weights.routes.ts`.
- Mục tiêu thuộc mô-đun `pets` (SAD §2.2.1): `modules/pets/application/set-weight-target.ts`, `clear-weight-target.ts`, route trong `modules/pets/adapters/http/`. `health-records` đọc mục tiêu và kiểm thú cưng qua `PetQueryPort` (`getOwnedPet(petId) → { id, weightTargetKg } | null`), không đọc bảng `pets` trực tiếp.

**Migration**

```sql
CREATE TABLE weight_entries (
  id          uuid PRIMARY KEY,                       -- UUIDv7 sinh ở ứng dụng
  owner_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id      uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  measured_on date NOT NULL,
  weight_kg   numeric(4,1) NOT NULL CHECK (weight_kg BETWEEN 0.1 AND 150),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX weight_entries_pet_measured_idx
  ON weight_entries (pet_id, measured_on DESC, created_at DESC);
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_isolation ON weight_entries
  USING (owner_id = current_setting('app.user_id')::uuid)
  WITH CHECK (owner_id = current_setting('app.user_id')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON weight_entries TO app_rw;
```

Cột `pets.weight_target_kg numeric(4,1)` đã có từ S2-01; nếu chưa, thêm trong migration này kèm `CHECK (weight_target_kg BETWEEN 0.1 AND 150)`.

**Quy tắc giá trị kg (domain)**

1. API nhận và trả kg dạng chuỗi thập phân dấu chấm: `"9.2"` (SAD §2.4.1). Client đổi `,` thành `.` trước khi gửi.
2. `parseWeightKg(s)`: khớp `^\d{1,3}(\.\d)?$`, đổi sang số nguyên phần mười (`"9.2"` → `92`), hợp lệ khi `1 ≤ tenths ≤ 1500`. Không dùng `Number` dấu phẩy động để so sánh.
3. Sai bất kỳ điều kiện nào → `422 VALIDATION_FAILED`, `errors[0] = { field: "weightKg", code: "OUT_OF_RANGE", message: "Cân nặng phải từ 0,1 đến 150 kg, tối đa 1 chữ số thập phân" }`.
4. `measuredOn` (`YYYY-MM-DD`) tùy chọn; thiếu thì server dùng `todayIn(user.timezone, clock.now())`. `measuredOn > today` → `422`, `{ field: "measuredOn", code: "DATE_IN_FUTURE", message: "Ngày không được ở tương lai" }`.
5. Cho phép nhiều số đo cùng ngày; không có ràng buộc unique (FR-WGT-002).

**Endpoint**

| Method + Path | Input | Thành công | Lỗi |
|---|---|---|---|
| `GET /pets/{petId}/weights` | `?from&to` (tùy chọn, `YYYY-MM-DD`, bao gồm 2 đầu) | `200 WeightsView` | `404 NOT_FOUND`; `422` khi `from > to` |
| `POST /pets/{petId}/weights` | `{ measuredOn?, weightKg }` + `Idempotency-Key` | `201 WeightEntry` | `400 IDEMPOTENCY_KEY_REQUIRED`, `404`, `422` |
| `PATCH /weights/{id}` | `{ measuredOn?, weightKg? }` (ít nhất 1 trường) | `200 WeightEntry` | `404`, `422` |
| `DELETE /weights/{id}` | — | `204` | `404` |
| `PUT /pets/{petId}/weight-target` | `{ weightKg }` | `200 { weightKg: "9.0" }` | `404`, `422` (cùng thông điệp kg) |
| `DELETE /pets/{petId}/weight-target` | — | `204` (kể cả khi chưa có mục tiêu) | `404` |

```ts
type WeightEntry = { id: string; measuredOn: string; weightKg: string; createdAt: string };
type WeightsView = {
  items: WeightEntry[];          // measured_on DESC, created_at DESC (FR-WGT-003), lọc theo from/to
  target: string | null;         // pets.weight_target_kg, "9.0"
  latest: WeightEntry | null;    // số đo đầu tiên theo thứ tự trên, KHÔNG phụ thuộc from/to
  deltaFromPrevious: string | null; // latest − số đo liền sau trong thứ tự: "0.3", "-0.1", "0.0"; null khi < 2 số đo
};
```

- `latest` và `deltaFromPrevious` lấy bằng một truy vấn riêng `ORDER BY measured_on DESC, created_at DESC LIMIT 2`.
- Chênh lệch tính bằng số nguyên phần mười rồi định dạng lại 1 chữ số thập phân.
- `PATCH` ghi đè theo last-write-wins (FR-GEN-007); không có `updated_at` trong schema.
- Mọi route chạy trong transaction có `set_config('app.user_id', …)`; số đo hoặc thú cưng của người khác → `404 NOT_FOUND`.

## Giao diện

Không có.

## Tiêu chí chấp nhận

- [ ] `POST` với `{ weightKg: "9.2" }` không có `measuredOn` → `201`, `measuredOn` = hôm nay theo múi giờ tài khoản.
- [ ] Given giá trị ≤ 0, > 150 hoặc nhiều hơn 1 chữ số thập phân, When lưu, Then `422` với thông điệp "Cân nặng phải từ 0,1 đến 150 kg, tối đa 1 chữ số thập phân".
- [ ] Given ngày đo ở tương lai, When lưu, Then `422 DATE_IN_FUTURE`.
- [ ] Given đã có số đo cùng ngày, When lưu số đo mới cho ngày đó, Then cả hai được giữ và cùng xuất hiện trong `items`.
- [ ] Given thú cưng chưa có mục tiêu, When `PUT weight-target { weightKg: "9" }`, Then `GET weights` trả `target: "9.0"`.
- [ ] Given đã có mục tiêu, When `DELETE weight-target`, Then `target: null`.
- [ ] `items` sắp theo ngày đo giảm dần, cùng ngày theo `createdAt` giảm dần.
- [ ] `latest` và `deltaFromPrevious` đúng khi có 0, 1, 2 và nhiều số đo; không đổi khi truyền `from/to`.
- [ ] `PATCH`/`DELETE /weights/{id}` áp dụng cùng quy tắc kiểm tra như `POST`.
- [ ] Gửi lại `POST` cùng `Idempotency-Key` trong 24 giờ trả lại đúng response cũ, không tạo bản ghi thứ hai.
- [ ] Tài nguyên của tài khoản khác → `404`; mọi route mới nằm trong bộ IDOR (S1-08).
- [ ] Route có schema Zod, có trong `openapi.yaml`; `api-client` được sinh lại, CI contract diff xanh.

## Kiểm thử

- **Unit `parseWeightKg`:** hợp lệ `"0.1"`, `"9"`, `"9.2"`, `"150"`, `"150.0"`; không hợp lệ `"0"`, `"0.0"`, `"0.05"`, `"9.25"`, `"150.1"`, `"-1"`, `"9,2"`, `""`, `"abc"`, `"1e2"`, `"1000"`.
- **Unit `formatDelta`:** `93 − 90` → `"0.3"`; `90 − 91` → `"-0.1"`; `90 − 90` → `"0.0"`.
- **Use case với `FakeClock`:** tài khoản `Asia/Ho_Chi_Minh`, `now = 2026-11-13T17:30Z` → mặc định `2026-11-14`; `measuredOn = 2026-11-15` bị từ chối, `2026-11-14` được nhận.
- **Integration (Testcontainers):** CHECK DB chặn `150.1` khi bỏ qua tầng ứng dụng; thứ tự 2 số đo cùng ngày; xóa thú cưng cascade số đo; RLS: user B `SELECT` không thấy số đo của A.
- **IDOR (S1-08):** thêm `GET/POST /pets/{petId}/weights`, `PATCH/DELETE /weights/{id}`, `PUT/DELETE /pets/{petId}/weight-target` với ID của tài khoản khác → `404`, dữ liệu A không đổi.

## Ghi chú

- Dùng chung hàm `parseWeightKg` cho số đo và mục tiêu để thông điệp lỗi giống hệt nhau.
- `numeric` từ `pg` trả về chuỗi; giữ nguyên chuỗi, chỉ chuẩn hóa về 1 chữ số thập phân (`"9.0"`).
- `GET /dashboard` (S5-03) dùng lại use case `list-weights` qua query port, không viết lại truy vấn.
