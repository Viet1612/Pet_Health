# S4-02 · Đánh dấu đã thực hiện, mốc kế tiếp, hoàn tác — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S4-02](../tasks/S4-02-complete-undo-api.md) |
| Trạng thái | Xong, đã gọi thử trên server dev |
| Ngày hoàn thành | 2026-10-25 |
| Commit | xem [README](README.md) |

## Kết quả

- **`domain/next-milestone.ts`:** `nextDueOn(type, cycleMonths, doneOn)`, tính từ **ngày thực hiện**.
  - Vaccine + 12 tháng; ve/giun + chu kỳ; ve/giun không chu kỳ → `null`.
  - Ngày vượt cuối tháng kẹp về ngày cuối (dùng `addCalendarMonths` của S0-06).
- **`platform/analytics/analytics.port.ts`:** `AnalyticsPort.track(trx, event, props)` và adapter `noopAnalytics` (S6-05 làm adapter thật).
- **`POST /milestones/{id}/complete`** `{ doneOn }` → `{ milestone, nextMilestone, resolvedNotificationIds, undoExpiresAt }`:
  - `doneOn` sai → `INVALID_DATE`; sau hôm nay theo múi giờ tài khoản → `422 FUTURE_DATE`.
  - Khóa lạc quan `UPDATE … WHERE status = 'PENDING'`. Không cập nhật được dòng nào: mốc DONE cùng `doneOn` → trả lại kết quả cũ; khác → `409 MILESTONE_NOT_PENDING`.
  - Phát `MilestoneCompleted`: `notifications` resolve thông báo đang mở với `DONE` và đặt cần đồng bộ lại.
  - Mốc kế tiếp: cùng thú cưng, loại, ghi chú, chu kỳ; `origin = AUTO`, `previous_id`, `due_set_on = today`. Chèn bằng `ON CONFLICT (previous_id) DO NOTHING` nên chỉ có 1 mốc kế tiếp.
  - Analytics: `milestone_completed`, `milestone_auto_created`.
  - `undoExpiresAt = completed_at + 15 s`.
- **`POST /milestones/{id}/undo-complete`:**
  - Khóa dòng. Đã PENDING → `200` (idempotent). CANCELLED → `409`.
  - Quá 15 s → `409 UNDO_WINDOW_EXPIRED`.
  - Xóa mốc AUTO còn PENDING. Mốc kế tiếp đã đổi trạng thái → `409 UNDO_WINDOW_EXPIRED`.
  - Đưa mốc về PENDING (giữ `due_set_on`), phát `MilestoneUndone`: `notifications` mở lại thông báo bị resolve `DONE` từ lúc hoàn thành và trả trạng thái đọc như trước. Analytics `milestone_undone`.
- **Port mở rộng:** `NotificationQueryPort.byMilestone` trả thêm `id`, `resolution`; `SchedulingAppDeps.analytics`.
- **IDOR:** `/milestones/:id/complete` và `/undo-complete` dùng fixture `/milestones/:id` (S4-01), có body hợp lệ cho `complete`.
- **Contract:** `openapi.yaml` và api-client đã sinh lại.
- **Test:** `test/next-milestone.test.ts`, 2 ca: vaccine 14/11/2026 → 14/11/2027; 29/02/2028 → 28/02/2029; FLEA chu kỳ 3; DEWORM chu kỳ 1 từ 31/01 → 28/02; không chu kỳ → `null`.

## Tiêu chí chấp nhận

**Đã kiểm trên server dev:**
- `doneOn` năm 2099 → `422 FUTURE_DATE`.
- Vaccine hạn 15/11, ghi chú "Dại", đánh dấu ngày 20/10 → DONE và 1 mốc AUTO hạn **2027-10-20**, ghi chú "Dại", `dueSetOn` = hôm nay.
- Gọi lại cùng ngày → cùng mốc kế tiếp; khác ngày → `409`.
- Hoàn tác ngay → PENDING, mốc AUTO bị xóa; hoàn tác lần 2 → vẫn `200`.
- FLEA chu kỳ 3: **2 request song song** → cả hai `200`, chỉ 1 mốc kế tiếp, hạn 24/10 + 3 tháng = **2027-01-24**, giữ chu kỳ 3.
- DEWORM không chu kỳ → `nextMilestone = null`.
- Sau 16 s → `409 UNDO_WINDOW_EXPIRED`, mốc vẫn DONE.
- Typecheck, lint, depcruise, unit test.

**Chưa kiểm:** resolve và khôi phục trạng thái đọc của thông báo D7 khi đánh dấu/hoàn tác (kiểm ở S4-03, khi đã có thông báo); rollback toàn bộ khi bước tạo mốc kế tiếp lỗi; bộ test IDOR.

## Khác với file task

- **`resolvedNotificationIds`** lấy bằng cách đọc lại các thông báo có `resolution = DONE` và `resolved_at = completed_at`, vì bus sự kiện không trả kết quả về.
- **Thêm lỗi `INVALID_DATE`** khi `doneOn` sai định dạng (spec chỉ nêu Zod bắt buộc).
