# S5-01 · API việc hằng ngày — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S5-01](../tasks/S5-01-routines-api.md) |
| Trạng thái | Xong, test E2E API Pass trên DB E2E |
| Ngày hoàn thành | 2026-10-25 |
| Commit | xem [README](README.md) |

## Kết quả

- **Migration** `202610251200_routines`: `routine_tasks` (xóa mềm `deleted_at`, index việc còn hiệu lực theo `pet_id`), `routine_completions` (PK `(task_id, local_date)`). Bật RLS `owner_isolation` + FORCE, cấp quyền `app_rw`, `app_worker`. Đã chạy trên DB dev.
- **Mô-đun `routines`:**
  - `domain/routine.ts`: tên 1–100 ký tự sau trim (NFC, đếm code point), giờ `^([01]\d|2[0-3]):[0-5]\d$`, `MAX_ROUTINES_PER_PET = 20`. Lỗi trường tiếng Việt kèm `params` (S4-08).
  - `application/routines.ts`: list, create, update, delete (mềm), setCompletion. `today` luôn tính ở server theo `users.timezone` + `ClockPort`.
  - `adapters/persistence/routine.repository.ts`: một câu `LEFT JOIN` completion của `today`, sắp xếp `done ASC, time_of_day, pet_id, created_at`. `markDone` dùng `ON CONFLICT DO NOTHING`, `unmarkDone` xóa dòng của hôm nay; cả hai idempotent.
  - 5 route: `GET/POST /pets/{petId}/routines`, `PATCH/DELETE /routines/{id}`, `PUT /routines/{id}/completion`. `POST` cần `Idempotency-Key`.
  - `routineQuery.checklistForToday` cho Dashboard (S5-03).
- **Giới hạn 20 khi song song:** thêm `PetQueryPort.lockOwnedPet` (khóa `FOR UPDATE` dòng `pets`) để mô-đun routines không đọc bảng `pets` trực tiếp.
- **IDOR:** `__idor__/routines.idor.ts` (fixture `/routines/:id`, body hợp lệ cho 3 route ghi).
- **Web:** `en.apiErrors` thêm `ROUTINE_LIMIT_REACHED` và lỗi giờ `timeOfDay`.
- Sinh lại `openapi.yaml` và `api-client`.

## Tiêu chí chấp nhận

Đã kiểm bằng `e2e/api/routines.api.spec.ts` (4 ca, chạy cùng bộ E2E API 19/19):
- 19 việc rồi 2 `POST` song song → đúng một `201`, một `409 ROUTINE_LIMIT_REACHED`. Xóa 1 việc rồi tạo lại → `201`.
- Đánh dấu lúc 23:50 ngày 14 giờ VN → 00:01 ngày 15: `today = 2026-11-15`, `done: false`. `PUT` lặp vẫn 200.
- Cùng thời điểm UTC, tài khoản `America/Los_Angeles` có `today` khác.
- Thứ tự 18:00, 19:00, 07:00 (xong), 07:30 (xong). Xóa mềm → `DELETE`, `PATCH`, `PUT completion` lần sau đều `404`.

Ngoài ra: unit domain 5 ca, IDOR 90/90 (gồm deny-by-default và RLS meta cho 2 bảng mới), unit tổng 182, typecheck, lint.

## Khác với file task

- **Kiểm thử tích hợp chạy bằng bộ E2E API** (DB `pethealth_e2e` + `FakeClock` qua `/__test/clock`) thay vì Testcontainers. Chưa có ca riêng cho Idempotency-Key `POST` gửi lặp (đã có ở middleware chung S0-05).
- **`created_at`, `completed_at` lấy từ `ClockPort`**, không dùng `DEFAULT now()` (giữ DEFAULT trong bảng), để `FakeClock` chi phối như các mô-đun khác.
