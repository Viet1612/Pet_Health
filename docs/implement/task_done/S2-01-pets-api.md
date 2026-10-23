# S2-01 · Schema `pets`, API CRUD, giới hạn 10, tuổi — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S2-01](../tasks/S2-01-pets-api.md) |
| Trạng thái | Xong, đã gọi thử trên DB dev |
| Ngày hoàn thành | 2026-10-24 |
| Commit | xem [README](README.md) |

## Kết quả

- **Migration `202610251000_pets`:** bảng `pets` đúng spec (CHECK tên/giống không rỗng, `sex`, `weight_target_kg`), index `owner_id`, bật RLS bằng `enableOwnerRls` (có `FORCE` và policy `owner_isolation`), cấp quyền cho `app_rw`/`app_worker`. Đã chạy trên DB dev.
- **Mô-đun `modules/pets/`:**
  - `domain/pet.ts`: `PET_LIMIT = 10`, `validatePetInput(raw, today, 'create' | 'patch')`.
    - Tên và giống: trim, 1–50 code point.
    - `sex`: `MALE`/`FEMALE`.
    - Ngày sinh: đúng ngày lịch, không sau hôm nay.
    - Mô tả: tối đa 2000 ký tự; rỗng sau trim thành `null`.
    - Mã lỗi: `REQUIRED`, `TOO_LONG`, `INVALID_ENUM`, `INVALID_DATE`, `FUTURE_DATE`.
  - `application/`: `createPet`, `updatePet`, `getPet`, `listPets`, `PetRepository` (port), `toPetView` (tính `ageText` theo múi giờ tài khoản).
  - `createPet` khóa dòng user (`SELECT … FOR UPDATE`) trước khi đếm, nên request song song không vượt 10 con. Con thứ 11 → `409 PET_LIMIT_REACHED`.
  - `adapters/persistence/kysely-pet-repository.ts`: mọi truy vấn lọc `owner_id` (thêm một lớp ngoài RLS).
- **Endpoint** (đều cần phiên; method ghi cần CSRF):
  - `GET /pets` → `{ items }`, sắp `created_at, id`.
  - `POST /pets` → `201`. Bắt buộc `Idempotency-Key`, chạy trong `runIdempotent`.
  - `GET /pets/{petId}`, `PATCH /pets/{petId}` → `404` khi của người khác, không tồn tại hoặc ID sai định dạng. `PATCH` rỗng → `422`.
  - `avatarUrl`/`avatarThumbUrl` luôn `null` (S2-03 làm tiếp).
- **Fixture IDOR** `adapters/http/__idor__/pets.idor.ts` cho `:petId` (body PATCH hợp lệ). `tsconfig.build.json` loại `__idor__` khỏi bản build.
- **Đăng ký mô-đun:** thêm `pets` vào `ModuleDeps`, `main-api`, `gen-openapi`, bộ test IDOR.
- **Contract:** `openapi.yaml` và `packages/api-client/src/schema.d.ts` đã sinh lại.
- **Test:** `test/pets-domain.test.ts`, 9 ca.
  - Độ dài tên 0/1/50/51, tên toàn khoảng trắng, emoji 50 code point.
  - `sex` sai; ngày sinh hôm nay / ngày mai / `2026-02-30`; mô tả 2000/2001; PATCH một phần.
  - `createPet` với FakeClock `2026-10-22T17:30Z`: múi giờ VN nhận ngày `2026-10-23`, múi giờ UTC báo `FUTURE_DATE`.
  - Đủ 10 con → `409`.

## Tiêu chí chấp nhận

**Đã kiểm:**
- Typecheck, lint, 109 unit test.
- Gọi thử trên server dev (tài khoản `smoke-test@example.test`):
  - Tạo → `201`, `ageText` "7 năm 7 tháng".
  - Gửi lại cùng key → `201` kèm `Idempotency-Replayed: true`, không tạo bản ghi thứ hai.
  - Dữ liệu sai → `422` đủ 4 lỗi (`REQUIRED`, `INVALID_ENUM`, `FUTURE_DATE`).
  - `GET /pets` có bản ghi; `PATCH` đổi ngày sinh → `ageText` tính lại ("10 tháng").
  - ID sai định dạng → `404`.

**Chưa kiểm:** 20 request song song chỉ tạo 10; bộ test IDOR (cần chạy `test:idor` với Docker); kiểm RLS trực tiếp bằng `app_rw`.

## Khác với file task

- **Tên migration** `202610251000_pets.ts` theo quy ước 12 chữ số của repo, thay cho `0200_pets.ts`. Policy RLS dùng helper `enableOwnerRls` (có `NULLIF`, thiếu `app.user_id` thì thấy 0 dòng thay vì lỗi cast).
- **Thứ tự trong `createPet`:** kiểm giới hạn 10 trước khi kiểm dữ liệu, vì cần khóa user trước khi đếm.
- **`PetCreate`/`PetPatch` khai báo các trường là chuỗi tùy chọn** trong Zod. Nội dung kiểm ở domain để trả đúng mã lỗi riêng (`FUTURE_DATE`, `INVALID_ENUM`…). Vì vậy trong api-client, `sex` của input có kiểu `string`; output `Pet.sex` vẫn là `'MALE' | 'FEMALE'`.
- **Tên schema trong OpenAPI** do `fastify-type-provider-zod` tự đặt (`Pet`, `PetCreateInput`…).
