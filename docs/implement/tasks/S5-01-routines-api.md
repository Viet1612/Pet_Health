# S5-01 · API việc hằng ngày

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S5 · T11–12 |
| Story | US-050, US-052, US-053, US-045 |
| Yêu cầu | FR-RT-001→007, SD-005, SD-008, NFR-MNT-002 |
| Phụ thuộc | [S2-01](S2-01-pets-api.md) |
| Ước lượng | 1 ngày |
| Màn hình Figma | — |

## Mục tiêu

Dựng mô-đun `routines`: bảng `routine_tasks`, `routine_completions` và 5 endpoint để tạo, xem, sửa, xóa mềm việc hằng ngày và đánh dấu xong/chưa xong theo **ngày địa phương của tài khoản**. Checklist tự "đặt lại" lúc 00:00 vì trạng thái gắn với `local_date`, không có job reset. Mô-đun cung cấp `RoutineQueryPort` cho Dashboard (S5-03).

## Phạm vi

**Trong phạm vi:** migration 2 bảng + RLS; `GET/POST /pets/{petId}/routines`, `PATCH/DELETE /routines/{id}`, `PUT /routines/{id}/completion`; giới hạn 20 việc/thú cưng; `RoutineQueryPort.checklistForToday`; schema Zod và `openapi.yaml`; ca IDOR.

**Ngoài phạm vi:** giao diện SCR-16 và sheet ([S5-02](S5-02-routines-ui.md)); phần `routines` trong `GET /dashboard` ([S5-03](S5-03-dashboard-api.md)); báo cáo MET-003 (chỉ giữ dữ liệu, không làm view).

## Chi tiết kỹ thuật

**Vị trí code** (SAD §4.4.2): `apps/api/src/modules/routines/{domain,application,adapters/http,adapters/persistence}`; migration `apps/api/migrations/<ts>_routines.ts`.

**Migration** (SAD §3.1.3):

```sql
CREATE TABLE routine_tasks (
  id          uuid PRIMARY KEY,            -- UUIDv7 sinh ở ứng dụng
  owner_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id      uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  name        varchar(100) NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  time_of_day time NOT NULL,
  deleted_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX routine_tasks_pet_active ON routine_tasks(pet_id) WHERE deleted_at IS NULL;

CREATE TABLE routine_completions (
  task_id      uuid NOT NULL REFERENCES routine_tasks(id) ON DELETE CASCADE,
  owner_id     uuid NOT NULL,
  local_date   date NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, local_date)
);
```

Bật RLS `owner_isolation` cho cả hai bảng như SAD §3.1.2; cấp quyền cho `app_rw`, `app_worker`.

**Domain** (`domain/routine.ts`): `RoutineName` = chuỗi sau `trim`, 1–100 ký tự; `TimeOfDay` khớp `^([01]\d|2[0-3]):[0-5]\d$` (24 giờ, đủ 2 chữ số, "7:00" và "24:00" bị từ chối). Hằng `MAX_ROUTINES_PER_PET = 20`.

**Endpoint** (mọi route cần phiên; method ghi cần `X-CSRF-Token`; tài nguyên không có hoặc của người khác → `404 NOT_FOUND`):

| Method + Path | Input | Thành công | Lỗi đặc thù |
|---|---|---|---|
| `GET /pets/{petId}/routines` | — | `200 { today, doneCount, totalCount, items: RoutineItem[] }` | `404` |
| `POST /pets/{petId}/routines` | `{ name, timeOfDay: "HH:MM" }` + `Idempotency-Key` | `201 RoutineItem` (`done: false`) | `409 ROUTINE_LIMIT_REACHED`, `422 VALIDATION_FAILED`, `400 IDEMPOTENCY_KEY_REQUIRED` |
| `PATCH /routines/{id}` | `{ name?, timeOfDay? }` (ít nhất 1 trường) | `200 RoutineItem` | `404`, `422` |
| `DELETE /routines/{id}` | — | `204` | `404` (kể cả việc đã xóa) |
| `PUT /routines/{id}/completion` | `{ done: boolean }` | `200 { localDate, done }` | `404`, `422` |

`RoutineItem = { id, petId, name, timeOfDay: "HH:MM", done }` — `done` tính cho `today`. `timeOfDay` trả dạng `HH:MM` (cắt giây của kiểu `time`).

**Các bước xử lý:**

1. `today = todayIn(user.timezone, clock.now())` (hàm của [S0-06](S0-06-calendar-domain.md), `ClockPort` từ [S0-04](S0-04-platform-core.md)). Client **không** gửi ngày.
2. `GET`: kiểm `petId` thuộc user qua `PetQueryPort.exists` → đọc việc còn hiệu lực `LEFT JOIN routine_completions c ON c.task_id = t.id AND c.local_date = $today`. Sắp xếp: `done ASC, time_of_day ASC, created_at ASC` (việc xong xuống cuối, FR-RT-002).
3. `POST`: trong transaction `SELECT id FROM pets WHERE id=$1 FOR UPDATE` → `SELECT count(*) FROM routine_tasks WHERE pet_id=$1 AND deleted_at IS NULL` → nếu `≥ 20` trả `409 ROUTINE_LIMIT_REACHED` ("Mỗi thú cưng có tối đa 20 việc hằng ngày") → `INSERT`. Khóa hàng `pets` để hai request song song không vượt 20. Lưu phản hồi vào `idempotency_keys` ([S0-05](S0-05-idempotency-ratelimit.md)).
4. `PATCH`: `UPDATE ... WHERE id=$1 AND deleted_at IS NULL RETURNING *`; 0 dòng → `404`. Last-write-wins. Thay đổi áp dụng ngay cho checklist hôm nay; completion của hôm nay giữ nguyên.
5. `DELETE`: `UPDATE routine_tasks SET deleted_at = now() WHERE id=$1 AND deleted_at IS NULL`; 0 dòng → `404`. **Không** xóa `routine_completions` (SD-008, FR-RT-005). Việc đã xóa không còn tính vào giới hạn 20.
6. `PUT completion`: kiểm việc tồn tại, chưa xóa. `done=true` → `INSERT INTO routine_completions(task_id, owner_id, local_date) VALUES ($1,$2,$today) ON CONFLICT DO NOTHING`; `done=false` → `DELETE ... WHERE task_id=$1 AND local_date=$today`. Cả hai idempotent; gửi lặp cùng giá trị vẫn `200`. Không cần `Idempotency-Key` (PUT).
7. Xóa thú cưng → cascade xóa việc và lịch sử (đúng SAD §2.3, dữ liệu do người dùng xóa).

**Query port cho Dashboard** (`application/routine-query-port.ts`):

```ts
export interface RoutineQueryPort {
  checklistForToday(ownerId: string, petIds: string[], today: LocalDate):
    Promise<Array<{ id: string; petId: string; name: string; timeOfDay: string; done: boolean }>>;
}
```

Một câu `SELECT` với `pet_id = ANY($2)`, cùng thứ tự như bước 2 (thêm `pet_id` sau `time_of_day` để ổn định khi gộp "Tất cả").

**Lỗi trường** (`422`, tiếng Việt): `name` rỗng/khoảng trắng → "Nhập tên việc"; > 100 → "Tên việc tối đa 100 ký tự"; `timeOfDay` sai → "Giờ theo định dạng HH:MM, 24 giờ".

## Giao diện

Không có.

## Tiêu chí chấp nhận

- [ ] US-050: tạo việc với tên 1–100 ký tự và giờ HH:MM 24 giờ gắn với một thú cưng; việc thứ 21 của cùng thú cưng trả `409 ROUTINE_LIMIT_REACHED`.
- [ ] US-050: việc vừa tạo xuất hiện ngay trong `GET /pets/{petId}/routines` theo đúng thứ tự giờ.
- [ ] US-052: `PUT completion {done:true}` rồi `{done:false}` đảo trạng thái của hôm nay; gọi lặp cùng giá trị không lỗi.
- [ ] US-053: **Given** việc đánh dấu xong lúc 23:50 ngày D, **When** tới 00:01 ngày D+1 theo múi giờ tài khoản, **Then** `GET` trả `done: false`; dòng `(task_id, D)` vẫn còn trong DB.
- [ ] US-045: `PATCH` đổi tên và giờ, checklist hôm nay phản ánh ngay; `DELETE` làm việc biến mất khỏi checklist, lịch sử các ngày trước còn nguyên (SD-008).
- [ ] `local_date` luôn do server tính theo `users.timezone`; body chứa ngày bị bỏ qua.
- [ ] Hai `POST` song song khi đang có 19 việc: đúng 1 thành công, 1 nhận `409`.
- [ ] RLS bật trên 2 bảng; mọi route có path parameter nằm trong IDOR suite.
- [ ] Schema Zod và `openapi.yaml` cập nhật; `api-client` sinh lại type.

## Kiểm thử

- **Unit** (`domain`): tên `""`, `"   "`, 1 ký tự, 100 ký tự, 101 ký tự; giờ `00:00`, `23:59`, `24:00`, `7:00`, `07:60`, `07:00:00`.
- **Integration** (Testcontainers + `FakeClock`):
  - Giới hạn: 20 việc OK, việc thứ 21 → `409`; xóa 1 rồi tạo lại → `201`; 2 request song song ở mức 19.
  - Qua nửa đêm: user `Asia/Ho_Chi_Minh`, đặt đồng hồ `2026-11-14T16:50Z` (23:50 local) tick → chuyển `2026-11-14T17:01Z` (00:01 ngày 15) → `done:false`; `localDate` trả về `2026-11-15` khi tick lại.
  - Múi giờ khác: user `America/Los_Angeles` cùng thời điểm UTC cho `localDate` khác.
  - Xóa mềm: `DELETE` → biến khỏi `GET`, `PATCH`/`PUT completion`/`DELETE` lần 2 → `404`; `routine_completions` cũ còn.
  - Sắp xếp: 4 việc 18:00, 19:00, 07:00 (xong), 07:30 (xong) → thứ tự 18:00, 19:00, 07:00, 07:30.
  - Idempotency: `POST` cùng key 2 lần → 1 dòng, cùng phản hồi.
- **IDOR**: đăng ký 5 route (`/pets/{petId}/routines` GET/POST, `/routines/{id}` PATCH/DELETE, `/routines/{id}/completion` PUT) vào suite [S1-08](S1-08-idor-suite.md); user B gọi với ID của A → `404`, dữ liệu A không đổi.

## Ghi chú

- Không có job reset (SAD §3.2.3): "ngày mới" chỉ là `local_date` khác. Đổi múi giờ (S6-01) tự áp dụng ở request kế tiếp.
- `routine_completions` giữ vô thời hạn (MET-003); không đưa vào `maintenance.daily`.
