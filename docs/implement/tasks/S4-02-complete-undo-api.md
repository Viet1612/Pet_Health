# S4-02 · Đánh dấu đã thực hiện, mốc kế tiếp, hoàn tác

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S4 · T9–10 |
| Story | US-042, US-043 (kèm phần tự lặp của US-044) |
| Yêu cầu | FR-MS-003, 004, 005, 008, 009, 011; FR-NTF-006; BRU-011, BRU-012; AD-017; SAD §2.4.4, §3.2.1 (đảm bảo 6, 7) |
| Phụ thuộc | [S4-01](S4-01-milestones-api.md) |
| Ước lượng | 1,5 |
| Màn hình Figma | — (giao diện FLW-04 ở [S4-04](S4-04-milestones-ui.md)) |

## Mục tiêu

`POST /milestones/{id}/complete` chuyển mốc sang `DONE`, resolve thông báo và tạo tối đa 1 mốc kế tiếp trong **một transaction**; `POST /milestones/{id}/undo-complete` khôi phục chính xác trạng thái trước đó trong cửa sổ 15 giây ở server.

## Phạm vi

**Trong phạm vi:** use case `completeMilestone`, `undoCompleteMilestone`; handler `MilestoneCompleted`, `MilestoneUndone` trong `notifications`; tính mốc kế tiếp bằng `addCalendarMonths`; gọi `AnalyticsPort`; schema Zod, `openapi.yaml`, ca IDOR.

**Ngoài phạm vi:** sheet FLW-04, toast "Hoàn tác" → [S4-04](S4-04-milestones-ui.md). Nút "Đã thực hiện" trên banner Dashboard → [S5-04](S5-04-dashboard-ui.md). Bảng `analytics_events` và adapter ghi thật → [S6-05](S6-05-analytics.md).

## Chi tiết kỹ thuật

**File**

```
apps/api/src/modules/scheduling/domain/next-milestone.ts      # nextDueOn(type, cycleMonths, doneOn)
apps/api/src/modules/scheduling/application/complete-milestone.ts
apps/api/src/modules/scheduling/application/undo-complete-milestone.ts
apps/api/src/modules/notifications/application/on-milestone-event.ts  # thêm Completed, Undone
apps/api/src/platform/analytics/analytics.port.ts             # track(tx, event); adapter no-op tới S6-05
```

**Quy tắc mốc kế tiếp** (`domain/next-milestone.ts`, hàm thuần)

| Loại | Chu kỳ | Hạn mới |
|---|---|---|
| `VACCINE` | — | `addCalendarMonths(doneOn, 12)` |
| `FLEA`, `DEWORM` | `cycle_months = N` | `addCalendarMonths(doneOn, N)` |
| `FLEA`, `DEWORM` | `NULL` | Không tạo |

Tính từ **ngày thực hiện**, không từ ngày hạn (BRU-011). Mốc mới: cùng `pet_id`, `type`, sao chép `note` và `cycle_months`, `origin = 'AUTO'`, `previous_id = id`, `status = 'PENDING'`, `due_set_on = today`.

**`POST /milestones/{id}/complete`** — input `{ doneOn: "YYYY-MM-DD" }`

1. Zod: `doneOn` bắt buộc, ngày hợp lệ. Domain: `doneOn > today` → `422`, field `doneOn`, code `FUTURE_DATE`, "Ngày không được ở tương lai".
2. `BEGIN; set_config('app.user_id')`. `now = clock.now()`, `today = todayIn(tz, now)`.
3. Khóa lạc quan:
   ```sql
   UPDATE milestones SET status = 'DONE', done_on = $doneOn, completed_at = $now, updated_at = $now
   WHERE id = $id AND status = 'PENDING' RETURNING *;
   ```
4. 0 dòng → `SELECT` mốc: không thấy → `404`; `DONE` và `done_on = $doneOn` → trả lại kết quả cũ (bước 9 dựng từ dữ liệu hiện có, `undoExpiresAt = completed_at + 15 s`); `DONE` khác ngày hoặc `CANCELLED` → `409 MILESTONE_NOT_PENDING`.
5. `publish(tx, MilestoneCompleted)` → handler `notifications`:
   ```sql
   UPDATE notifications SET resolved_at = $now, resolution = 'DONE',
     read_at = coalesce(read_at, $now), read_reason = coalesce(read_reason, 'RESOLVED')
   WHERE milestone_id = $id AND resolved_at IS NULL RETURNING id;
   UPDATE users SET notifications_synced_on = NULL WHERE id = $owner;
   ```
6. Nếu có hạn mới:
   ```sql
   INSERT INTO milestones (id, owner_id, pet_id, type, due_on, due_set_on, note, cycle_months,
                           status, origin, previous_id, created_at, updated_at)
   VALUES ($newId, $owner, $pet, $type, $nextDue, $today, $note, $cycle, 'PENDING', 'AUTO', $id, $now, $now)
   ON CONFLICT (previous_id) DO NOTHING RETURNING *;
   ```
   Không trả dòng → `SELECT ... WHERE previous_id = $id` (FR-MS-011).
7. `analytics.track(tx, 'milestone_completed', { type, daysFromDue: doneOn − dueOn })`; nếu có mốc mới: `'milestone_auto_created', { type, months }`.
8. `COMMIT`.
9. `200`:
   ```json
   { "milestone": { "...": "Milestone, status DONE, displayStatus DONE, doneOn" },
     "nextMilestone": { "...": "Milestone AUTO" } | null,
     "resolvedNotificationIds": ["..."],
     "undoExpiresAt": "<completed_at + 15 s, ISO UTC>" }
   ```

Hai request song song: request sau chờ khóa dòng ở bước 3, sau khi request trước commit thì `WHERE status='PENDING'` không còn khớp → đi nhánh bước 4. Không cần `Idempotency-Key` (idempotent theo thiết kế); nếu client gửi thì middleware vẫn xử lý bình thường.

**`POST /milestones/{id}/undo-complete`** — không có body

1. `BEGIN`; `SELECT * FROM milestones WHERE id = $id FOR UPDATE`; không thấy → `404`.
2. `status = 'PENDING'` → `200 { milestone }` (đã hoàn tác trước đó, idempotent). `status = 'CANCELLED'` → `409 MILESTONE_NOT_PENDING`.
3. `now − completed_at > 15 s` → `409 UNDO_WINDOW_EXPIRED` "Đã quá thời gian hoàn tác".
4. Xóa mốc kế tiếp (cascade xóa thông báo của nó):
   ```sql
   DELETE FROM milestones WHERE previous_id = $id AND origin = 'AUTO' AND status = 'PENDING' RETURNING id;
   ```
   Có mốc `AUTO` với `previous_id = $id` nhưng không còn `PENDING` → `409 UNDO_WINDOW_EXPIRED`.
5. `UPDATE milestones SET status = 'PENDING', done_on = NULL, completed_at = NULL, updated_at = $now WHERE id = $id`.
6. `publish(tx, MilestoneUndone { id, completedAt })` → handler:
   ```sql
   UPDATE notifications SET resolved_at = NULL, resolution = NULL,
     read_at     = CASE WHEN read_reason = 'RESOLVED' THEN NULL ELSE read_at END,
     read_reason = CASE WHEN read_reason = 'RESOLVED' THEN NULL ELSE read_reason END
   WHERE milestone_id = $id AND resolution = 'DONE' AND resolved_at >= $completedAt;
   UPDATE users SET notifications_synced_on = NULL WHERE id = $owner;
   ```
7. `analytics.track(tx, 'milestone_undone')`; `COMMIT`; `200 { milestone }` (`due_set_on` giữ nguyên).

Server cho 15 s, client chỉ hiển thị 10 s (AD-017) để chịu được độ trễ mạng.

## Giao diện

Không có.

## Tiêu chí chấp nhận

- [ ] **Given** mốc *Sắp tới* hạn 15/11/2026 đã có D7, **When** đánh dấu với `doneOn = 2026-11-10`, **Then** mốc `DONE`, D7 có `resolution = DONE`, và khi đồng bộ ngày 14/11 không có D1.
- [ ] `doneOn` mặc định do client gửi hôm nay; `doneOn` lớn hơn `today` theo múi giờ tài khoản → `422 FUTURE_DATE`.
- [ ] **Given** mốc vừa đánh dấu, **When** gọi `undo-complete` trong 15 s, **Then** mốc về `PENDING`, thông báo về đúng trạng thái trước (chưa xem vẫn chưa xem; đã xem vẫn đã xem), mốc `AUTO` vừa tạo bị xóa.
- [ ] Sau 15 s → `409 UNDO_WINDOW_EXPIRED`; mốc vẫn `DONE`, mốc kế tiếp còn nguyên.
- [ ] **Given** "Tiêm vaccine" hạn 15/11/2026, ghi chú "Dại", **When** đánh dấu ngày 14/11/2026, **Then** tạo đúng 1 mốc `VACCINE` hạn **2027-11-14**, `note = "Dại"`, `origin = AUTO`, `dueSetOn = 2026-11-14`.
- [ ] **Given** ngày thực hiện 29/02/2028, **Then** hạn mới 28/02/2029.
- [ ] `FLEA` chu kỳ 3 đánh dấu 14/11/2026 → mốc mới hạn 14/02/2027, giữ `cycleMonths = 3`; `DEWORM` không chu kỳ → `nextMilestone = null`.
- [ ] Gửi `complete` 2 lần (tuần tự hoặc song song) cùng `doneOn` → cùng response, chỉ 1 mốc kế tiếp; khác `doneOn` → lần sau `409`.
- [ ] Mốc kế tiếp có `due_set_on = today` nên không có nhắc bù; nếu hạn mới đã qua thì nằm ở `overdue` và không có nhắc.
- [ ] Response khớp SAD §2.4.4, có `undoExpiresAt = completed_at + 15 s`.
- [ ] Mọi bước trong một transaction; lỗi ở bước 6 → không bước nào được ghi.

## Kiểm thử

- **Unit `nextDueOn`:** 4 ca SRS §2.10.2 (2026-11-14 +12 → 2027-11-14; 2028-02-29 +12 → 2029-02-28; 2026-11-14 +3 → 2027-02-14; 2026-01-31 +1 → 2026-02-28) + `DEWORM` không chu kỳ → `null`.
- **Integration (Testcontainers, `FakeClock`):**
  - Luồng SAD §3.2.1: tạo 2026-11-01 hạn 15/11; sync 08/11 (D7); sync 14/11 (D1, D7 `SUPERSEDED`); complete 14/11 → cả D7 và D1 resolved, `resolvedNotificationIds` có 2 ID.
  - Hoàn tác khôi phục trạng thái đọc: D1 chưa xem → sau undo `read_at IS NULL`; D7 `SUPERSEDED` → sau undo vẫn `read_reason = SUPERSEDED`; D7 đã đọc bởi `USER` → giữ `USER`.
  - Cửa sổ: undo ở `completed_at + 15 s` → `200`; ở `+ 15,001 s` → `409`.
  - Song song: 2 kết nối gọi `complete` cùng lúc → 1 dòng `AUTO`, cả hai `200` cùng `nextMilestone.id`.
  - `complete` mốc `CANCELLED` → `409`; undo mốc `PENDING` → `200` không đổi gì.
  - `users.notifications_synced_on` là `NULL` sau complete và sau undo.
- **IDOR:** thêm `POST /milestones/{id}/complete`, `POST /milestones/{id}/undo-complete` vào bộ [S1-08](S1-08-idor-suite.md); mốc của B không đổi trạng thái.

## Ghi chú

- Mọi thời điểm (`completed_at`, `resolved_at`, so sánh 15 s) dùng `clock.now()` truyền vào SQL, không dùng `now()` của PostgreSQL; nếu không, E2E với `FakeClock` ở [S4-06](S4-06-e2e-core-flow.md) sẽ sai.
- `AnalyticsPort` dùng adapter no-op cho tới [S6-05](S6-05-analytics.md); chữ ký `track(tx, name, props)` giữ nguyên để S6-05 chỉ thay adapter.
- Điều kiện `resolved_at >= completedAt` ở bước undo chỉ khôi phục thông báo do chính lần đánh dấu đó resolve (FR-MS-005), không đụng thông báo `RESCHEDULED` cũ.
