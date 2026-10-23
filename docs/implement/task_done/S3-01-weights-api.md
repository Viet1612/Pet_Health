# S3-01 · API cân nặng và mục tiêu — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S3-01](../tasks/S3-01-weights-api.md) |
| Trạng thái | Xong, đã gọi thử trên server dev |
| Ngày hoàn thành | 2026-10-24 |
| Commit | `07ba216` |

## Kết quả

- **Migration `202610251020_weight_entries`:** bảng `weight_entries` (`pet_id … ON DELETE CASCADE`, `CHECK 0.1–150`), index `(pet_id, measured_on DESC, created_at DESC)`, RLS `owner_isolation`, cấp quyền cho `app_rw`/`app_worker`. Đã chạy trên DB dev. Cột `pets.weight_target_kg` có sẵn từ S2-01.
- **Mô-đun mới `modules/health-records/`:**
  - `domain/weight.ts`: tính bằng số nguyên phần mười kg, không dùng số thực.
    - `parseWeightKg`: khớp `^\d{1,3}(\.\d)?$`, trong khoảng 1–1500 phần mười.
    - `formatTenths`, `tenthsOf`, `formatDelta` (`"0.3"`, `"-0.1"`, `"0.0"`).
  - `application/`:
    - `weight-input.ts`: `validateWeightInput` dùng chung POST/PATCH. Lỗi `OUT_OF_RANGE` với thông điệp đúng spec; `DATE_IN_FUTURE`; `INVALID_DATE`.
    - Use case `addWeightEntry` (thiếu `measuredOn` thì lấy hôm nay theo múi giờ tài khoản), `listWeights`, `updateWeightEntry`, `deleteWeightEntry`.
  - `adapters/persistence/weight-entries.repo.ts`: mọi truy vấn lọc `owner_id`.
  - `adapters/http/weights.routes.ts`:
    - `GET /pets/{petId}/weights?from&to` → `{ items, target, latest, deltaFromPrevious }`. `latest` và `delta` lấy bằng truy vấn `LIMIT 2` riêng, không phụ thuộc `from/to`. `from > to` → `422`.
    - `POST /pets/{petId}/weights` (bắt buộc `Idempotency-Key`) → `201`.
    - `PATCH /weights/{id}` (ít nhất 1 trường) và `DELETE /weights/{id}`.
    - ID sai định dạng → `404`.
- **Mục tiêu cân nặng thuộc mô-đun `pets`:**
  - `PUT /pets/{petId}/weight-target` → `{ weightKg: "9.0" }`.
  - `DELETE /pets/{petId}/weight-target` → `204`, kể cả khi chưa có mục tiêu.
  - Repository thêm `setWeightTarget`.
- **`PetQueryPort`** (`pets/index.ts`): `getOwnedPet` và `ownerTimezone`. `health-records` kiểm thú cưng và đọc mục tiêu qua port này, không đọc bảng `pets`.
- **IDOR:** fixture `weights.idor.ts` cho `/weights/:id`, kèm body hợp lệ cho POST/PATCH weights và PUT weight-target. Route `/pets/:petId/…` dùng fixture `petId` có sẵn.
- **Đăng ký:** `ModuleDeps.healthRecords` trong `main-api`, `gen-openapi`, bộ test IDOR. `openapi.yaml` và api-client đã sinh lại.
- **Test:** `test/weight-domain.test.ts`, 5 ca.
  - Biên 0,1 / 150 / 150,0; giá trị sai: 0, âm, 150,1, 2 chữ số thập phân, dấu phẩy…
  - Định dạng chênh lệch.
  - `validateWeightInput` báo cùng lúc `OUT_OF_RANGE` và `DATE_IN_FUTURE`.

## Tiêu chí chấp nhận

**Đã kiểm trên server dev** (thú cưng Mochi):
- `POST { weightKg: "9.2" }` không có ngày → `201`, `measuredOn` = 2026-10-24. Gửi lại cùng key → `Idempotency-Replayed: true`, không tạo bản ghi thứ hai.
- Hai số đo cùng ngày đều được giữ; thứ tự `items`: 24/10 9.5, 24/10 9.2, 01/10 8.9.
- `"9.25"` kèm ngày năm 2099 → `422` với `OUT_OF_RANGE` và `DATE_IN_FUTURE`.
- `PUT weight-target { "9" }` → `"9.0"`; `GET` trả `target: "9.0"`, `latest: "9.5"`, `deltaFromPrevious: "0.3"`.
- `from/to` chỉ lọc `items`; `latest` không đổi. `from > to` → `422`.
- `PATCH` → `200`. `DELETE` → `204`, xóa lại → `404`. Xóa mục tiêu → `204`, gọi lại khi chưa có vẫn `204`, sau đó `target: null`. ID sai → `404`.
- Typecheck, lint, depcruise, unit test.

**Chưa kiểm:** bộ test IDOR (cần Docker).

## Khác với file task

- **Tên migration** `202610251020_weight_entries.ts` theo quy ước của repo. RLS bằng `enableOwnerRls` (có `FORCE`). Cấp quyền thêm cho `app_worker`.
- **Thêm lỗi `INVALID_DATE` / `INVALID_RANGE`** cho `measuredOn` hoặc `from/to` sai định dạng (spec chưa nêu).
- **`pets/application/weight-target.ts`** dùng `parseWeightKg` từ `health-records/domain`; depcruise chỉ cấm đọc persistence của mô-đun khác.
