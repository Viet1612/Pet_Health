# S4-05 · Giao diện Thông báo và chuông — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S4-05](../tasks/S4-05-notifications-ui.md) |
| Trạng thái | Xong (code), chưa bấm thử trên trình duyệt |
| Ngày hoàn thành | 2026-10-25 |
| Commit | xem [README](README.md) |

## Kết quả

- **Chuông (CMP-07)** `features/notifications/BellButton.tsx`, thay chuông giữ chỗ trên TopBar:
  - `['notifications', 'summary']` gọi `GET /notifications/summary?pet=all`, `staleTime 0`, cập nhật khi quay lại tab. Không polling.
  - Badge: ẩn khi 0, "9+" khi > 9. `aria-label` là "Thông báo" khi 0, "Thông báo, N chưa xem" khi có. Bấm → `/notifications`.
  - `AppShell` gọi `router.subscribe('onResolved')` → invalidate summary mỗi lần đổi route. Các thao tác với mốc (S4-04) đã invalidate `['notifications']`.
- **SCR-17 `/notifications`** (`NotificationsScreen`):
  - `useInfiniteQuery(['notifications', 'list'])`; cuộn tới cuối tự tải trang kế, kèm nút "Tải thêm".
  - Nhóm theo `appearOn` so với `today` của API: "Hôm nay" / "Hôm qua" / `dd/MM/yyyy` (`group-by-day.ts`).
  - `NotificationItem`:
    - Cả dòng là link tới `/milestones/{id}?from=notification`. Icon loại mốc. Dòng 1 "Mochi · Tiêm vaccine (Dại)"; dòng 2 "Đến hạn … · nhãn" (quá hạn: "Hạn … · quá hạn N ngày").
    - Chưa xem: nền primary-soft, chữ đậm, chấm màu, chữ ẩn "Chưa xem".
    - Đã xử lý: mờ 60%, chip "Đã thực hiện" (xanh) / "Đã hủy" / "Đã đổi lịch", không có nhãn ngày.
  - Chạm mục chưa xem: cập nhật lạc quan (`unread = false`, chuông giảm 1) → `POST /notifications/read`. Lỗi thì hoàn lại + toast; điều hướng vẫn diễn ra.
  - "Đánh dấu đã xem" (`aria-label` "Đánh dấu tất cả đã xem", ẩn khi không có mục chưa xem): lạc quan về 0 → `read-all` với `upTo = fetchedAt` của trang đầu → đặt số theo phản hồi.
  - Trạng thái rỗng, skeleton 4 dòng, `ErrorState` + "Thử lại", dòng chân "Nhắc nhở được giữ 90 ngày…". Bề rộng tối đa 760 px, căn giữa.
- **i18n:** nhóm `vi.notifications`.
- **Test:** `features/notifications/notifications.test.ts`, 2 ca: nhóm Hôm nay / Hôm qua / ngày; hôm qua qua ranh giới năm.
- **Bundle:** JS ban đầu 129,8 KB gzip.

## Tiêu chí chấp nhận

**Đã kiểm:** typecheck, lint, depcruise, `vite build`, size-limit, unit test. Dev server biên dịch được các module mới. API phía sau đã kiểm ở S4-03 (3 thông báo, đọc / đọc tất cả, resolve).

**Chưa kiểm** (cần bấm thử): badge, chạm mở chi tiết mốc kèm tô nền, đánh dấu tất cả, chuông cập nhật khi đổi route hoặc quay lại tab, cuộn tải thêm.

## Khác với file task

- **Vị trí file:** `features/notifications/{BellButton,NotificationItem,NotificationsScreen,queries,group-by-day}.ts(x)`, gộp các hook vào `queries.ts` (`useMarkRead` xử lý cả read và read-all). Route ở `routes/_app/notifications.tsx`.
