# S4-03 · `syncNotifications` và API Thông báo — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S4-03](../tasks/S4-03-notifications-api.md) |
| Trạng thái | Xong, đã gọi thử trên server dev |
| Ngày hoàn thành | 2026-10-25 |
| Commit | `5da9019` |

## Kết quả

- **`syncNotifications`** (transaction riêng, ngắn):
  - `notifications_synced_on = today` → dừng ngay (lần đọc thứ hai trong ngày chỉ có 1 câu `SELECT`).
  - Lấy mốc PENDING hạn ≤ today + 7 qua `milestoneQuery`. Mỗi mốc chỉ tạo mức muộn nhất `dueLevel` (không nhắc bù mức đã qua lúc đặt hạn).
  - Chèn một lần với `ON CONFLICT (milestone_id, channel, level, due_on_snapshot) DO NOTHING`; chỉ supersede cho mốc có dòng thật sự vừa chèn (G-15). Ghi `synced_on = today`.
- **API** (mọi `GET` đồng bộ trước khi đọc):
  - `GET /notifications/summary?pet=all|{petId}` → `{ unreadCount, banner? }`.
    - `unreadCount` tính cho cả tài khoản.
    - Banner chỉ gồm thông báo chưa xem, chưa resolve, trong phạm vi `pet`. Thứ tự: OVERDUE > D1 > D7, rồi hạn sớm trước, xuất hiện muộn trước, id. Có `moreCount` và tối đa 50 `notificationIds`.
    - `petId` lạ → `404`.
  - `GET /notifications?limit&cursor` → `{ today, fetchedAt, items, nextCursor, unreadCount }`.
    - Chỉ lấy `appear_on ≥ today − 90`, sắp `appear_on DESC, level_rank DESC, id DESC`, keyset theo con trỏ. Cursor hỏng → `400 INVALID_CURSOR`.
  - `POST /notifications/read { ids, reason }`: ID lạ hoặc của người khác bị bỏ qua âm thầm, trả `unreadCount` thực.
  - `POST /notifications/read-all { upTo }`: chỉ thông báo tạo trước `min(upTo, now)`.
- **DTO `Notification`:** `label` tính lúc đọc ("còn N ngày" / "ngày mai" / "hôm nay" / "quá hạn N ngày"), `null` khi đã resolve. `petName`, `type`, `note` lấy theo mốc hiện tại.
- **Mô-đun `notifications`:** `application/{sync-notifications,get-summary,list-notifications,mark-read,notification-view,ports}.ts`, `adapters/http/notifications.routes.ts`. Repository thêm `getSyncedOn`, `setSyncedOn`, `insertMany`, `supersede`, `listUnread`, `countUnread`, `list`, `markRead`, `markAllRead`. `getNotificationSummary` xuất ra cho Dashboard (S5-03).
- **`PetQueryPort.getNames`** (tên thú cưng theo id).
- **IDOR:** ca riêng `notifications.idor.ts` (`registerIdorCustom`): A gửi ID thông báo của B → `200` nhưng thông báo của B vẫn chưa xem.
- **Contract:** `openapi.yaml` và api-client đã sinh lại.

## Tiêu chí chấp nhận

**Đã kiểm trên server dev** (hôm nay 25/10; chèn bằng SQL 3 mốc có `due_set_on = 01/10`: hạn 01/11, 26/10, 20/10):
- **2 request song song** lần đầu trong ngày → đúng 3 dòng (mỗi mốc 1 dòng).
- Summary: `unreadCount = 3`, banner.top = OVERDUE "quá hạn 5 ngày", `moreCount = 2`. Summary theo thú cưng có `moreCount` đúng; `petId` lạ → `404`.
- Danh sách: D1 "ngày mai", D7 "còn 7 ngày", OVERDUE "quá hạn 5 ngày", đủ tên thú cưng, đều chưa xem. `synced_on` = 2026-10-25.
- `read` 1 ID → `unreadCount` 2.
- Đổi hạn mốc D7 → `RESCHEDULED` và `read_reason = RESOLVED`; trong danh sách `label = null`, `unread = false`.
- Đánh dấu đã thực hiện mốc D1 → `DONE` / `RESOLVED`. Hoàn tác → trở lại chưa resolve, chưa xem (đúng trạng thái trước). Đây cũng là phần kiểm còn thiếu của S4-01 và S4-02.
- `read-all` với `upTo = fetchedAt` → `unreadCount = 0`. Summary cuối không còn banner.
- Typecheck, lint, depcruise, unit test (`dueLevel` / `appearOn` / `levelLabel` đã có test từ S0-06).

**Chưa kiểm:** các kịch bản theo ngày (08/11 → 11/11 → 14/11, đổi hạn 05/11) cần `FakeClock`, để dành cho E2E ở S4-06; lọc 90 ngày; bộ test IDOR.

## Khác với file task

- **Chèn nhiều dòng bằng `insertInto(...).values([...])`** của Kysely thay vì `unnest(...)`; cùng `ON CONFLICT DO NOTHING RETURNING`.
- **Thông báo của mốc đã bị xóa** (khi xóa thú cưng thì cascade) bị bỏ khỏi danh sách nếu không còn mốc tương ứng.
