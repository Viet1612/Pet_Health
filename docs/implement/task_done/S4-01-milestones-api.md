# S4-01 · Schema `milestones`, `notifications`; API mốc — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S4-01](../tasks/S4-01-milestones-api.md) |
| Trạng thái | Xong, đã gọi thử trên server dev |
| Ngày hoàn thành | 2026-10-25 |
| Commit | `565b679` |

## Kết quả

- **Migration `202610251040_milestones_notifications`:**
  - Hai bảng `milestones` và `notifications` đúng ràng buộc của spec (vaccine không có chu kỳ, cặp `done_*`, `UNIQUE (previous_id)`, `UNIQUE (milestone_id, channel, level, due_on_snapshot)`, cặp `read_*` và `resolved_*`) cùng các index. `users.notifications_synced_on` thêm bằng `IF NOT EXISTS` (đã có từ S1-01).
  - Cả hai bảng bật RLS `owner_isolation` và cấp quyền cho `app_rw`/`app_worker`. Đã chạy trên DB dev.
- **`platform/events/sync-event-bus.ts`:** `SyncEventBus.publish(trx, event)` gọi lần lượt các handler trong cùng transaction.
- **`platform/calendar/reminder-level.ts`:** chuyển `appearOn` / `dueLevel` / `levelLabel` từ `notifications/domain` sang đây, để `scheduling` dùng mà không import `notifications`. File cũ giữ dạng re-export.
- **Mô-đun `scheduling`:**
  - `domain/milestone.ts`: `validateNewMilestone`, `validateMilestonePatch`.
    - Ghi chú trim, rỗng → `null`, ≤ 500 ký tự.
    - Chu kỳ là số nguyên 1–60 (`OUT_OF_RANGE`); vaccine kèm chu kỳ → `NOT_ALLOWED_FOR_VACCINE`; ngày sai → `INVALID_DATE`.
  - `domain/events.ts`: `MilestoneCreated | Edited | Rescheduled | Cancelled | Completed | Undone`.
  - Use case:
    - `createMilestone`: `due_set_on = today`, origin `MANUAL`, phát `Created`.
    - `updateMilestone`: có khóa `type` → `422 TYPE_IMMUTABLE`; khóa dòng; mốc không còn PENDING → `409 MILESTONE_NOT_PENDING`; đổi hạn → `due_set_on = today` và phát `Rescheduled`, sửa khác phát `Edited`.
    - `cancelMilestone`: idempotent; mốc đã DONE → `409`.
    - `listMilestonesByPet`: 4 nhóm theo FR-MS-012.
    - `getMilestoneDetail`: kèm `petName`, `previousDoneOn` và `reminders` (PLANNED / UNREAD / READ / RESOLVED, bỏ mức đã qua lúc đặt hạn).
  - `MilestoneView`: `displayStatus`, `daysUntilDue` (null khi không còn PENDING). "Hôm nay" lấy từ `ClockPort` theo múi giờ tài khoản.
  - `MilestoneRepository` (Kysely): đã gồm các hàm cho S4-02/S4-03 (`completeIfPending`, `insertNext` dùng `ON CONFLICT (previous_id) DO NOTHING`, `deleteAutoNext`, `listPendingDueBy`, `findMany`).
  - `milestoneQuery` (`listPendingDueBy`, `getSummaries`) cho mô-đun khác.
  - Route:
    - `GET` / `POST /pets/{petId}/milestones` (POST bắt buộc `Idempotency-Key`).
    - `GET` / `PATCH /milestones/{id}`, `POST /milestones/{id}/cancel`.
- **Mô-đun `notifications`:**
  - `onMilestoneEvent`:
    - `Rescheduled` / `Cancelled` / `Completed` → resolve thông báo đang mở (coi như đã xem, `read_reason = RESOLVED`).
    - `Undone` → mở lại thông báo bị resolve `DONE`.
    - Mọi sự kiện → `users.notifications_synced_on = NULL`.
  - `notificationQuery.byMilestone` cho chi tiết mốc.
- **Nối hai mô-đun:** `modules/index.ts` tạo bus và đăng ký handler của `notifications`. `scheduling` chỉ khai báo port `NotificationQueryPort`.
- **IDOR:** fixture `milestones.idor.ts` cho `/milestones/:id` (khớp cả `/cancel`, `/complete`), kèm body hợp lệ cho POST, PATCH, complete.
- **Contract:** `openapi.yaml` và api-client đã sinh lại.
- **Test:** `test/milestone-domain.test.ts`, 4 ca: vaccine/ghi chú; chu kỳ 1/60 nhận, 0/61/1,5 từ chối; vaccine kèm chu kỳ; loại, ngày, ghi chú sai; PATCH bỏ chu kỳ.
- **Sửa thêm:** test kho ảnh của S3-05 chuyển sang `features/photos/photos.test.ts`, vì depcruise cấm feature khác import vào bên trong `photos`.

## Tiêu chí chấp nhận

**Đã kiểm trên server dev** (Mochi, hôm nay 2026-10-25):
- Tạo vaccine hạn 15/11, ghi chú "Dại" → `UPCOMING`, `daysUntilDue = 21`, nằm trong `upcoming`.
- Gửi lại cùng key → `Idempotency-Replayed`, cùng `id`. Thiếu key → `400`.
- Hạn 01/09 (đã qua) → `OVERDUE`, nằm trong `overdue`.
- Chu kỳ 1 → `201`; 0/61/1,5 → `OUT_OF_RANGE`; vaccine kèm chu kỳ → `NOT_ALLOWED_FOR_VACCINE`.
- PATCH có `type` → `422 TYPE_IMMUTABLE`. Đổi hạn + bỏ chu kỳ → `200`. Chi tiết trả 3 mức nhắc `PLANNED`.
- Hủy → `CANCELLED`; hủy lại → vẫn `200`; sửa mốc đã hủy → `409`. Danh sách chuyển mốc sang `cancelled`.
- `users.notifications_synced_on` = `NULL` sau các command. ID sai → `404`.
- Typecheck, lint, depcruise, unit test.

**Chưa kiểm:** resolve thông báo khi đổi hạn/hủy (chưa có thông báo nào; kiểm ở S4-03); bộ test IDOR; rollback cả 3 bảng khi lỗi.

## Khác với file task

- **`reminder-level.ts` chuyển sang `platform/calendar`** (spec S4-03 cũng gọi đây là hàm của platform/calendar).
- **Kiểu sự kiện được khai báo hai lần** (`scheduling/domain/events.ts` và `notifications/application/on-milestone-event.ts`), để hai mô-đun không import nhau; bus ở composition root nối hai bên.
- **Tên migration** `202610251040_milestones_notifications.ts`; RLS bằng `enableOwnerRls` (có `FORCE`).
