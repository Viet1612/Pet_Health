# S4-01 · Schema `milestones`, `notifications`; API tạo, xem, sửa, hủy mốc

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S4 · T9–10 |
| Story | US-040, US-044, US-046, US-047 (danh sách) |
| Yêu cầu | FR-MS-001, 002, 006, 007, 010, 012; FR-NTF-003, 006; FR-GEN-001, 005; NFR-SEC-004; AD-011, AD-012, AD-016; SAD §2.2.2, §3.1.3, §3.2.1 (đảm bảo 1, 2, 8) |
| Phụ thuộc | [S2-01](S2-01-pets-api.md), [S0-06](S0-06-calendar-domain.md) |
| Ước lượng | 1,5 |
| Màn hình Figma | — (giao diện ở [S4-04](S4-04-milestones-ui.md)) |

## Mục tiêu

Có hai bảng `milestones`, `notifications` đúng ràng buộc SAD §3.1.3 và các API vòng đời mốc (tạo, xem danh sách, xem chi tiết, sửa, hủy). Mọi command của mốc chạy trong một transaction, phát sự kiện đồng bộ sang `notifications` và đặt `users.notifications_synced_on = NULL`.

## Phạm vi

**Trong phạm vi:** migration 2 bảng + RLS + index; cột `users.notifications_synced_on`; mô-đun `scheduling` (domain, use case, route, repository, `MilestoneQueryPort`); bus sự kiện đồng bộ và handler resolve thông báo trong `notifications`; `GET/POST /pets/{petId}/milestones`, `GET/PATCH /milestones/{id}`, `POST /milestones/{id}/cancel`; schema Zod, `openapi.yaml`, ca IDOR.

**Ngoài phạm vi:** đánh dấu đã thực hiện, mốc kế tiếp, hoàn tác → [S4-02](S4-02-complete-undo-api.md). `syncNotifications` và API Thông báo → [S4-03](S4-03-notifications-api.md). Giao diện → [S4-04](S4-04-milestones-ui.md). Panel mốc trên Dashboard → [S5-03](S5-03-dashboard-api.md).

## Chi tiết kỹ thuật

**Cấu trúc file**

```
apps/api/migrations/<ts>_s4_milestones_notifications.ts
apps/api/src/modules/scheduling/
  domain/milestone.ts            # kiểu, validate, displayStatus (dùng platform/calendar)
  domain/events.ts               # MilestoneCreated|Edited|Rescheduled|Completed|Undone|Cancelled
  application/{create,update,cancel,list-by-pet,get-detail}-milestone.ts
  application/ports.ts           # MilestoneRepository, MilestoneQueryPort, DomainEventPublisher
  adapters/persistence/milestone.repository.ts   # Kysely
  adapters/http/milestones.routes.ts + milestones.schemas.ts (Zod)
apps/api/src/modules/notifications/
  application/on-milestone-event.ts   # handler đồng bộ, nhận (tx, event)
  adapters/persistence/notification.repository.ts
apps/api/src/platform/events/sync-event-bus.ts  # publish(tx, event) gọi handler tuần tự, cùng tx
```

`scheduling` không import `notifications`; composition root đăng ký handler vào bus. `MilestoneQueryPort` (dùng ở S4-03, S5-03): `listPendingDueBy(ownerId, date)`, `getSummaries(ids)` → `{ id, petId, type, note, dueOn, status }`.

**Migration** (một file, expand-only)

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_synced_on date;

CREATE TABLE milestones (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('VACCINE','FLEA','DEWORM')),
  due_on date NOT NULL,
  due_set_on date NOT NULL,
  note varchar(500),
  cycle_months smallint CHECK (cycle_months BETWEEN 1 AND 60),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','DONE','CANCELLED')),
  done_on date,
  completed_at timestamptz,
  origin text NOT NULL CHECK (origin IN ('MANUAL','AUTO')),
  previous_id uuid REFERENCES milestones(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT milestones_vaccine_no_cycle CHECK (type <> 'VACCINE' OR cycle_months IS NULL),
  CONSTRAINT milestones_done_fields CHECK ((status = 'DONE') = (done_on IS NOT NULL AND completed_at IS NOT NULL)),
  CONSTRAINT milestones_previous_unique UNIQUE (previous_id)
);
CREATE INDEX milestones_pending_due_idx ON milestones (owner_id, due_on) WHERE status = 'PENDING';
CREATE INDEX milestones_pet_idx ON milestones (pet_id, status, due_on);

CREATE TABLE notifications (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_id uuid NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app')),
  level text NOT NULL CHECK (level IN ('D7','D1','OVERDUE')),
  due_on_snapshot date NOT NULL,
  appear_on date NOT NULL,
  read_at timestamptz,
  read_reason text CHECK (read_reason IN ('USER','BANNER','SUPERSEDED','RESOLVED')),
  resolved_at timestamptz,
  resolution text CHECK (resolution IN ('DONE','CANCELLED','RESCHEDULED')),
  created_at timestamptz NOT NULL,
  CONSTRAINT notifications_once UNIQUE (milestone_id, channel, level, due_on_snapshot),
  CONSTRAINT notifications_read_pair CHECK ((read_at IS NULL) = (read_reason IS NULL)),
  CONSTRAINT notifications_resolved_pair CHECK ((resolved_at IS NULL) = (resolution IS NULL))
);
CREATE INDEX notifications_unread_idx ON notifications (owner_id, appear_on DESC) WHERE read_at IS NULL;
CREATE INDEX notifications_list_idx ON notifications (owner_id, appear_on DESC, id DESC);
```

RLS cho cả hai bảng: `ENABLE ROW LEVEL SECURITY` + policy `owner_isolation` như SAD §3.1.2; `GRANT SELECT, INSERT, UPDATE, DELETE` cho `app_rw`.

**DTO `Milestone`:** `{ id, petId, type, dueOn, dueSetOn, note, cycleMonths, status, displayStatus, daysUntilDue, doneOn, origin, previousId, createdAt }`. `displayStatus` = `displayStatus(m, today)`; `daysUntilDue` = `dueOn − today` khi `PENDING`, `null` khi khác. Thời điểm lấy từ `ClockPort`, không dùng `now()` trong SQL (để `FakeClock` chi phối được).

**Endpoint**

| Endpoint | Input | Output | Lỗi |
|---|---|---|---|
| `GET /pets/{petId}/milestones` | — | `200 { today, upcoming, overdue, done, cancelled }` | `404 NOT_FOUND` |
| `POST /pets/{petId}/milestones` | `{ type, dueOn, note?, cycleMonths? }` + `Idempotency-Key` | `201 Milestone` | `400 IDEMPOTENCY_KEY_REQUIRED`, `404`, `422` |
| `GET /milestones/{id}` | — | `200 { today, milestone, petName, previousDoneOn, reminders }` | `404` |
| `PATCH /milestones/{id}` | `{ dueOn?, note?, cycleMonths? }` (≥ 1 trường) | `200 Milestone` | `404`, `409 MILESTONE_NOT_PENDING`, `422 TYPE_IMMUTABLE`, `422` |
| `POST /milestones/{id}/cancel` | — | `200 Milestone` | `404`, `409 MILESTONE_NOT_PENDING` |

Nhóm trong danh sách (FR-MS-012): `upcoming` = `PENDING` và `due_on ≥ today`, `due_on ASC`; `overdue` = `PENDING` và `due_on < today`, `due_on ASC`; `done` = `done_on DESC, completed_at DESC`; `cancelled` = `updated_at DESC`.

**Kiểm tra dữ liệu (Zod + domain):** `type` ∈ 3 giá trị; `dueOn` dạng `YYYY-MM-DD` hợp lệ, cho phép quá khứ; `note` trim, rỗng → `null`, ≤ 500 ký tự (`TOO_LONG`); `cycleMonths` số nguyên 1–60 (`OUT_OF_RANGE`, "Chu kỳ phải là số tháng nguyên từ 1 đến 60"); `VACCINE` có `cycleMonths` → `422`, field `cycleMonths`, code `NOT_ALLOWED_FOR_VACCINE`. `PATCH` chứa khóa `type` → `422 TYPE_IMMUTABLE` "Không đổi được loại mốc sau khi tạo"; `cycleMonths: null` được phép với `FLEA`/`DEWORM` (bỏ tự lặp).

**Tạo mốc**

1. `BEGIN; set_config('app.user_id')`; kiểm thú cưng thuộc user (qua `PetQueryPort`, không thấy → `404`).
2. `today = todayIn(user.timezone, clock.now())`.
3. `INSERT milestones (id = uuidv7(), status 'PENDING', origin 'MANUAL', due_set_on = today, created_at = updated_at = clock.now())`.
4. `publish(tx, MilestoneCreated)` → handler `notifications`: `UPDATE users SET notifications_synced_on = NULL WHERE id = $owner`.
5. Lưu `idempotency_keys`; `COMMIT`. Không tạo thông báo nào (đảm bảo 1). Hạn đã qua → `displayStatus = OVERDUE`; vì mọi `appearOn ≤ due_set_on` nên không bao giờ có nhắc (ca 9 SRS §2.6).

**Sửa mốc**

1. `SELECT ... FOR UPDATE`; không có → `404`; `status ≠ 'PENDING'` → `409 MILESTONE_NOT_PENDING`.
2. Nếu `dueOn` có và khác giá trị cũ: `due_on = $dueOn`, `due_set_on = today`, phát `MilestoneRescheduled`. Ngược lại phát `MilestoneEdited`.
3. Handler `Rescheduled` (đảm bảo 8):
   ```sql
   UPDATE notifications SET resolved_at = $now, resolution = 'RESCHEDULED',
     read_at = coalesce(read_at, $now), read_reason = coalesce(read_reason, 'RESOLVED')
   WHERE milestone_id = $1 AND resolved_at IS NULL;
   ```
4. Mọi handler đặt `notifications_synced_on = NULL`; cập nhật `updated_at`; `COMMIT`. Last-write-wins (FR-GEN-007).

**Hủy mốc:** `UPDATE milestones SET status='CANCELLED', updated_at=$now WHERE id=$1 AND status='PENDING'`. 0 dòng → đọc lại: `CANCELLED` → `200` trạng thái hiện tại (idempotent); `DONE` → `409`. Phát `MilestoneCancelled` → resolve như trên với `resolution = 'CANCELLED'` + reset cờ sync.

**`reminders` trong chi tiết** (cho dòng "Nhắc nhở" của SCR-15): với mốc `PENDING`, mỗi mức `D7`, `D1`, `OVERDUE` có `appearOn(level, dueOn) > dueSetOn` → `{ level, appearOn, state }`, `state` = `UNREAD` / `READ` / `RESOLVED` nếu có thông báo khớp `(level, due_on_snapshot = dueOn)`, `PLANNED` nếu `appearOn > today`; mức đã qua mà không có dòng (bị bỏ qua theo FR-NTF-004) thì không trả. Mốc `DONE`/`CANCELLED` chỉ trả các thông báo đã có. Trạng thái đọc lấy qua `NotificationQueryPort.byMilestone(id)` của `notifications`.

## Giao diện

Không có.

## Tiêu chí chấp nhận

- [ ] **Given** đang xem một thú cưng, **When** tạo "Tiêm vaccine" hạn 2026-11-15, ghi chú "Dại", **Then** mốc nằm trong `upcoming` của thú cưng đó với `displayStatus = UPCOMING`.
- [ ] **Given** ngày đến hạn đã qua, **When** lưu, **Then** mốc được tạo với `displayStatus = OVERDUE`, nằm trong `overdue` và không có thông báo nào được tạo, kể cả sau khi đồng bộ ở các ngày sau.
- [ ] `FLEA`/`DEWORM` lưu được `cycleMonths` 1–60; 0, 61, 1,5 bị từ chối `422`; `VACCINE` kèm `cycleMonths` bị `422`.
- [ ] **Given** mốc *Sắp tới*, **When** sửa ngày hạn, **Then** thông báo hiện có có `resolution = RESCHEDULED`, được coi là đã xem, và `due_set_on = today`.
- [ ] **Given** mốc *Sắp tới*, **When** hủy, **Then** `status = CANCELLED`, mốc nằm trong `cancelled`, không còn trong `upcoming`, thông báo có `resolution = CANCELLED`.
- [ ] `PATCH` có `type` → `422 TYPE_IMMUTABLE`; `PATCH` hoặc `cancel` mốc `DONE` → `409 MILESTONE_NOT_PENDING`.
- [ ] Mỗi command (tạo, sửa, hủy) đặt `users.notifications_synced_on = NULL` trong cùng transaction; transaction rollback thì không có thay đổi nào ở 3 bảng.
- [ ] `POST` thiếu `Idempotency-Key` → `400`; gửi lại cùng key trong 24 h trả lại đúng response cũ, không tạo mốc thứ hai.
- [ ] Mốc/thú cưng của tài khoản khác → `404 NOT_FOUND` ở mọi route; RLS chặn cả khi bỏ điều kiện `owner_id` trong repository.
- [ ] Ràng buộc DB tự chặn: `cycle_months` cho vaccine, hai mốc cùng `previous_id`, hai thông báo cùng `(milestone_id, channel, level, due_on_snapshot)`.
- [ ] Route và schema có trong `openapi.yaml`; CI contract diff xanh.

## Kiểm thử

- **Unit:** validate input (biên `note` 500/501 ký tự, `cycleMonths` 0/1/60/61); phân nhóm danh sách với `today = 2026-11-14`: hạn 14/11 → `upcoming`, hạn 13/11 → `overdue`; tính `reminders` cho mốc hạn 17/11, `dueSetOn` 01/11, today 12/11 → D7 10/11 (theo thông báo), D1 16/11 `PLANNED`, OVERDUE 18/11 `PLANNED`.
- **Integration (Testcontainers):** từng CHECK/UNIQUE ở migration (insert sai → lỗi đúng tên constraint); tạo mốc hạn 2026-11-01 vào `FakeClock` 2026-11-11 → `due_set_on = 2026-11-11`, `overdue`; đổi hạn 15/11 → 20/11 khi đã có D7 → D7 `RESCHEDULED`, `read_reason = RESOLVED`; hủy hai lần → lần 2 vẫn `200`; lỗi giữa transaction (giả lập handler ném lỗi) → mốc không đổi.
- **IDOR:** thêm vào bộ [S1-08](S1-08-idor-suite.md): `GET/POST /pets/{petId}/milestones`, `GET/PATCH /milestones/{id}`, `POST /milestones/{id}/cancel` với ID của tài khoản B → `404`, dữ liệu B không đổi.
- **Contract:** snapshot `openapi.yaml` cho 5 route.

## Ghi chú

- `GET /milestones/{id}` chưa có trong bảng SAD §2.4.2 nhưng cần cho route `/milestones/:milestoneId` (mở từ thông báo, UXD-009). Thêm vào `openapi.yaml` và cập nhật SAD §2.4.2.
- `MilestoneCreated` và `MilestoneEdited` là hai sự kiện bổ sung cho 4 sự kiện ở SAD §2.2.2; handler của chúng chỉ đặt lại cờ đồng bộ.
- `users.notifications_synced_on` chỉ được ghi trong `notifications/adapters/persistence` (S4-03 đặt giá trị, các handler ở đây đặt `NULL`).
- `GET /pets/{petId}/milestones` trả `today` để client có ngày mặc định và `max` cho DateField mà không cần logic múi giờ (SAD P1).
