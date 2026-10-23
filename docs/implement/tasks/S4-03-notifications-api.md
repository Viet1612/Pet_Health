# S4-03 · `syncNotifications` và API Thông báo

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S4 · T9–10 |
| Story | US-041, US-048, US-049 (phần server của banner US-062) |
| Yêu cầu | FR-NTF-001→011; NFR-PERF-005; NFR-REL-003; AD-016; G-15; SAD §2.2.3, §3.1.4, §3.2.1 (đảm bảo 2–5, 9) |
| Phụ thuộc | [S4-01](S4-01-milestones-api.md) |
| Ước lượng | 2 |
| Màn hình Figma | — (giao diện ở [S4-05](S4-05-notifications-ui.md)) |

## Mục tiêu

Thông báo nhắc được tạo khi đọc (AD-016), idempotent và an toàn khi song song; có 4 API cho chuông, banner và mục Thông báo. Không có cron.

## Phạm vi

**Trong phạm vi:** use case `syncNotifications(user, today)`; `GET /notifications/summary`, `GET /notifications`, `POST /notifications/read`, `POST /notifications/read-all`; service `getNotificationSummary` dùng lại cho Dashboard; ca IDOR.

**Ngoài phạm vi:** chuông, SCR-17 → [S4-05](S4-05-notifications-ui.md). Banner trên Dashboard và `GET /dashboard` → [S5-03](S5-03-dashboard-api.md), [S5-04](S5-04-dashboard-ui.md). Xóa thông báo > 90 ngày → [S6-06](S6-06-maintenance-job.md). Đổi múi giờ qua `PATCH /me` → [S6-01](S6-01-settings-api.md).

## Chi tiết kỹ thuật

**File**

```
apps/api/src/modules/notifications/
  application/sync-notifications.ts
  application/get-summary.ts          # dùng ở /notifications/summary và S5-03
  application/list-notifications.ts, mark-read.ts, mark-all-read.ts
  application/ports.ts                # NotificationRepository, NotificationQueryPort
  adapters/persistence/notification.repository.ts
  adapters/http/notifications.routes.ts + notifications.schemas.ts
```

Đọc mốc qua `MilestoneQueryPort` (S4-01), tên thú cưng qua `PetQueryPort.getNames(ids)` của `pets`. Hàm thuần lấy từ `platform/calendar` (S0-06): `todayIn`, `appearOn`, `dueLevel`, `levelLabel`.

**`syncNotifications(userId, now)`** — transaction riêng, ngắn, commit trước khi chạy truy vấn đọc

1. `SELECT timezone, notifications_synced_on FROM users WHERE id = $1`; `today = todayIn(timezone, now)`. Nếu `notifications_synced_on = today` → dừng (đường nhanh, NFR-PERF-005).
2. `candidates = MilestoneQueryPort.listPendingDueBy(ownerId, today + 7)`:
   ```sql
   SELECT id, due_on, due_set_on FROM milestones
   WHERE owner_id = $1 AND status = 'PENDING' AND due_on <= $2;   -- partial index
   ```
3. Với mỗi mốc: `level = dueLevel(m, today, overdueEnabled = true)`; bỏ `null`. Dòng mới: `{ id: uuidv7(), milestoneId, level, dueOnSnapshot: m.dueOn, appearOn: appearOn(level, m.dueOn) }` — chỉ mức muộn nhất (FR-NTF-004).
4. Một câu chèn:
   ```sql
   INSERT INTO notifications (id, owner_id, milestone_id, channel, level, due_on_snapshot, appear_on, created_at)
   SELECT u.id, $owner, u.mid, 'in_app', u.level, u.due, u.appear, $now
   FROM unnest($ids::uuid[], $mids::uuid[], $levels::text[], $dues::date[], $appears::date[])
        AS u(id, mid, level, due, appear)
   ON CONFLICT (milestone_id, channel, level, due_on_snapshot) DO NOTHING
   RETURNING id, milestone_id;
   ```
5. Supersede chỉ cho mốc có dòng vừa chèn:
   ```sql
   UPDATE notifications SET read_at = $now, read_reason = 'SUPERSEDED'
   WHERE milestone_id = ANY($insertedMids) AND id <> ALL($insertedIds) AND read_at IS NULL;
   ```
6. `UPDATE users SET notifications_synced_on = $today WHERE id = $1`.

Hai request song song: cùng chèn, `UNIQUE` + `DO NOTHING` giữ 1 dòng; request thua có `RETURNING` rỗng nên không supersede gì (G-15). Đổi múi giờ chỉ cần `notifications_synced_on = NULL` (đảm bảo 9); thông báo đã tạo giữ nguyên.

**DTO `Notification`:** `{ id, level, label, milestoneId, petId, petName, type, note, dueOn, appearOn, unread, resolution, createdAt }`. `dueOn = due_on_snapshot`; `unread = read_at IS NULL`; `resolution` ∈ `DONE|CANCELLED|RESCHEDULED|null`; `label = levelLabel(level, dueOn, today)` tính lúc đọc ("còn N ngày" / "ngày mai" / "hôm nay" / "quá hạn N ngày"), `null` khi đã resolve; `note` lấy từ mốc hiện tại.

**Endpoint** (mọi `GET` gọi `syncNotifications` trước)

| Endpoint | Input | Output | Lỗi |
|---|---|---|---|
| `GET /notifications/summary` | `?pet=all\|{petId}` (mặc định `all`) | `200 { unreadCount, banner? }` | `404` khi `petId` không thuộc user |
| `GET /notifications` | `?limit=20&cursor` (`limit` 1–50) | `200 { today, fetchedAt, items, nextCursor, unreadCount }` | `400 INVALID_CURSOR` |
| `POST /notifications/read` | `{ ids: uuid[1..50], reason?: "USER"\|"BANNER" }` | `200 { unreadCount }` | `422` |
| `POST /notifications/read-all` | `{ upTo: ISO timestamp }` | `200 { unreadCount }` | `422` |

**Summary và banner** (FR-NTF-009)

- `unreadCount` = số dòng `read_at IS NULL` của **cả tài khoản** (chuông), không phụ thuộc `pet`.
- `banner` chỉ có khi có ≥ 1 thông báo chưa xem trong phạm vi `pet`. Sắp: hạng mức `OVERDUE (3) > D1 (2) > D7 (1)` giảm dần → `due_on_snapshot` tăng dần → `appear_on` giảm dần → `id`. `banner = { top: Notification, moreCount: n − 1, notificationIds: [≤ 50 ID theo thứ tự trên] }`.
- Lọc theo thú cưng: lấy các dòng chưa xem (≤ số mốc `PENDING`, ~100), gọi `MilestoneQueryPort.getSummaries` lấy `petId`, lọc trong bộ nhớ.
- Đóng banner = `POST /notifications/read { ids: banner.notificationIds, reason: "BANNER" }`.

**Danh sách** (FR-NTF-008, 011): `WHERE owner_id = $1 AND appear_on >= today − 90`, sắp `appear_on DESC, level_rank DESC, id DESC` (`level_rank` = `CASE level WHEN 'OVERDUE' THEN 3 WHEN 'D1' THEN 2 ELSE 1 END`). Cursor = base64url của `(appear_on, level_rank, id)` dòng cuối, so sánh tuple. `fetchedAt = clock.now()` để client gửi lại làm `upTo`.

**Đánh dấu đã xem**

```sql
-- read
UPDATE notifications SET read_at = $now, read_reason = $reason
WHERE id = ANY($ids) AND read_at IS NULL;          -- RLS tự loại ID của tài khoản khác
-- read-all
UPDATE notifications SET read_at = $now, read_reason = 'USER'
WHERE read_at IS NULL AND created_at <= least($upTo, $now);
```

ID không tồn tại hoặc của người khác bị bỏ qua âm thầm, vẫn `200`. Cả hai trả `unreadCount` thực sau khi cập nhật (thông báo tạo sau `upTo` trên thiết bị khác vẫn chưa xem).

## Giao diện

Không có.

## Tiêu chí chấp nhận

Ví dụ: mốc "Tiêm vaccine (Dại)" của Mochi, hạn 15/11/2026, tạo 01/11/2026, `Asia/Ho_Chi_Minh`.

- [ ] Mở app lúc bất kỳ giờ nào ngày 08/11 → đúng 1 thông báo D7, `label = "còn 7 ngày"`, có trong `banner.top` và `GET /notifications`.
- [ ] Không mở từ 08/11 tới 10/11, mở 11/11 → D7 vẫn chưa xem, `label = "còn 4 ngày"`.
- [ ] Mở 14/11 (đã có D7) → đúng 1 thông báo chưa xem D1 "ngày mai"; D7 `read_reason = SUPERSEDED`.
- [ ] Mốc tạo 11/11 hạn 15/11 → không có D7 bù; D1 xuất hiện 14/11.
- [ ] Ngày 05/11 đổi hạn 15/11 → 20/11 → D7 xuất hiện 13/11, D1 xuất hiện 19/11; không có gì trước 13/11.
- [ ] Hai thiết bị tải lại nhiều lần ngày 08/11 (kể cả song song) → đúng 1 dòng D7.
- [ ] Mốc vẫn `PENDING` sau hạn → `OVERDUE` từ hạn + 1, `label = "quá hạn N ngày"`; banner ưu tiên `OVERDUE > D1 > D7`, cùng mức hạn sớm hơn trước, `moreCount` đúng.
- [ ] Có 3 thông báo, 2 chưa xem → danh sách trả cả 3, mới nhất trước, `unread` đúng, `unreadCount = 2`.
- [ ] `read` 1 ID chưa xem → `unreadCount` giảm 1; trạng thái thấy được ở phiên khác lần tải kế tiếp.
- [ ] `read-all` với `upTo = fetchedAt` → `unreadCount = 0` nếu không có thông báo mới sau `upTo`.
- [ ] Thông báo của mốc đã thực hiện/hủy/đổi hạn: `unread = false`, `resolution` đúng, `label = null`, không vào banner.
- [ ] Danh sách không trả thông báo có `appear_on` trước `today − 90`.
- [ ] Lần đọc thứ hai trong cùng ngày không chạy bước 2–6 (chỉ 1 câu `SELECT users`).

## Kiểm thử

- **Integration `syncNotifications` (`FakeClock`, Testcontainers):** đủ 9 dòng bảng SRS §2.6, mỗi dòng một user mới:

  | `due_set_on` | Hạn | Mở app | Kỳ vọng chưa xem |
  |---|---|---|---|
  | 11-01 | 11-15 | 11-07 | không có |
  | 11-01 | 11-15 | 11-08 | D7 "còn 7 ngày" |
  | 11-01 | 11-15 | 11-07 rồi 11-11 | D7 "còn 4 ngày" |
  | 11-01 | 11-15 | 11-08 rồi 11-14 | D1 "ngày mai"; D7 đã xem |
  | 11-01 | 11-15 | 11-07 rồi 11-14 | chỉ D1, không có dòng D7 |
  | 11-11 | 11-15 | 11-11 | không có |
  | 11-11 | 11-12 | 11-11 | không có |
  | 11-11 | 11-12 | 11-13 | OVERDUE "quá hạn 1 ngày" |
  | 11-11 | 11-01 | 11-11, 11-20 | không có |

- **Song song (G-15):** 2 kết nối pool khác nhau gọi `syncNotifications` cùng lúc 20 lần (`Promise.all`) → `COUNT(*) = 1`; không deadlock.
- **Hiệu năng (NFR-PERF-005):** seed 10 thú cưng × 100 mốc `PENDING`, đo `syncNotifications` lần đầu trong ngày ≤ 50 ms p95 trên máy CI (ghi số đo vào PR).
- **Banner:** OVERDUE hạn 12/11 + D1 hạn 15/11 + D7 hạn 21/11 → `top` là OVERDUE, `moreCount = 2`; `pet={id của Bơ}` chỉ thấy D7.
- **Phân trang:** 45 thông báo → 3 trang 20/20/5, không trùng, không sót; cursor sửa tay → `400`.
- **IDOR:** `POST /notifications/read` với ID của tài khoản B → `200`, `unreadCount` của A không đổi, dòng của B vẫn chưa xem; `GET /notifications/summary?pet={petId của B}` → `404`. Thêm vào bộ [S1-08](S1-08-idor-suite.md).

## Ghi chú

- `reason` trong `POST /notifications/read`, `banner.notificationIds`, `today` và `fetchedAt` là trường bổ sung so với SAD §2.4.2, cần để đóng banner ghi `read_reason = BANNER` và để `upTo` dùng đồng hồ server; cập nhật `openapi.yaml` và SAD.
- `appear_on` luôn là ngày xuất hiện lý thuyết (`appearOn(level, dueOn)`), kể cả khi dòng được chèn muộn; mục Thông báo nhóm theo cột này, và hạn giữ 90 ngày tính từ đó.
- `syncNotifications` và `getNotificationSummary` được [S5-03](S5-03-dashboard-api.md) gọi lại; không đổi chữ ký sau sprint này.
