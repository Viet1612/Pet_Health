# S4-05 · Giao diện SCR-17 và chuông trên TopBar

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S4 · T9–10 |
| Story | US-049 (hiển thị của US-041, US-048) |
| Yêu cầu | FR-NTF-006, 007, 008, 010, 011; FR-GEN-008; UXD-009; CMP-07, CMP-26; ST-05 |
| Phụ thuộc | [S4-03](S4-03-notifications-api.md) |
| Ước lượng | 1 |
| Màn hình Figma | SCR-17 · Thông báo (8:364); chuông trên TopBar ở SCR-06 · Dashboard (8:3) |

## Mục tiêu

Mọi màn hình sau đăng nhập có chuông kèm số nhắc chưa xem; mục Thông báo liệt kê mọi nhắc 90 ngày gần nhất, phân biệt chưa xem / đã xem / đã xử lý, chạm để mở thẳng mốc.

## Phạm vi

**Trong phạm vi:** `BellButton` (CMP-07) trong `TopBar` ở mọi breakpoint; route `/notifications` (SCR-17); `NotificationItem` (CMP-26); đánh dấu đã xem từng mục và tất cả (optimistic); tải thêm khi cuộn.

**Ngoài phạm vi:** banner nhắc trên Dashboard → [S5-04](S5-04-dashboard-ui.md). Mở mốc (SCR-15) → [S4-04](S4-04-milestones-ui.md). Banner mất kết nối → [S6-03](S6-03-system-states.md).

## Chi tiết kỹ thuật

```
apps/web/src/features/notifications/
  components/BellButton.tsx, NotificationItem.tsx, NotificationDayGroup.tsx
  routes/notifications.route.tsx
  hooks/useNotificationSummary.ts, useNotificationList.ts, useMarkRead.ts, useMarkAllRead.ts
  lib/group-by-day.ts
```

**Chuông**

- `useQuery(['notifications','summary'], GET /notifications/summary?pet=all)`, `staleTime: 0`, `refetchOnWindowFocus: true`. Không polling, không real-time (DC-003).
- Lấy lại khi đổi route: `router.subscribe('onResolved', () => queryClient.invalidateQueries({ queryKey: ['notifications','summary'] }))` trong `AppShell`.
- Lấy lại sau mỗi mutation mốc (đã làm ở S4-04) và sau `read`/`read-all`.
- Badge: `unreadCount = 0` → ẩn; 1–9 → số; > 9 → "9+". `aria-label`: "Thông báo" khi 0, "Thông báo, N chưa xem" khi > 0. Bấm → `/notifications`.

**Danh sách**

- `useInfiniteQuery(['notifications','list'], GET /notifications?limit=20&cursor)`; `getNextPageParam = nextCursor`. Tải trang kế khi phần tử cuối vào viewport (`IntersectionObserver`) + nút "Tải thêm" cho bàn phím.
- Nhóm theo `appearOn` so với `today` của trang đầu: bằng → "HÔM NAY", `today − 1` → "HÔM QUA", khác → `dd/MM/yyyy`. Không tự tính "hôm nay" ở client.
- Chạm mục chưa xem: cập nhật lạc quan (`unread = false`, giảm `unreadCount` trong cache summary) → `POST /notifications/read { ids: [id] }` → điều hướng `/milestones/{milestoneId}?from=notification`. Mục đã xem/đã xử lý: chỉ điều hướng. Lỗi → hoàn lại + toast "Không lưu được" (điều hướng vẫn diễn ra).
- "Đánh dấu đã xem": lạc quan đặt mọi mục `unread = false`, chuông về 0 → `POST /notifications/read-all { upTo: fetchedAt của trang đầu }` → đặt `unreadCount` theo response. Lỗi → hoàn lại + toast.

## Giao diện

**SCR-17 · Thông báo (8:364)**

- Thanh trên: "←" + tiêu đề "Thông báo"; bên phải nút chữ "Đánh dấu đã xem" (`aria-label="Đánh dấu tất cả đã xem"`), ẩn khi không có mục chưa xem.
- Tiêu đề nhóm chữ hoa nhỏ, xám: "HÔM NAY", "HÔM QUA", "10/11/2026".
- `NotificationItem` là `<a>` toàn dòng, icon loại mốc trong vòng tròn:
  - Dòng 1: "Mochi · Tiêm vaccine (Dại)" — tên thú cưng · loại mốc, ghi chú trong ngoặc nếu có.
  - Dòng 2: "Đến hạn 15/11/2026 · ngày mai"; mức `OVERDUE`: "Hạn 12/11/2026 · quá hạn 2 ngày". Nhãn lấy nguyên `label` từ API ("còn N ngày" / "ngày mai" / "hôm nay" / "quá hạn N ngày").
  - **Chưa xem:** nền `--primary-soft`, dòng 1 đậm, chấm tròn `--primary` bên phải, chữ ẩn "Chưa xem" cho trình đọc màn hình.
  - **Đã xem:** nền thẻ thường, chữ thường.
  - **Đã xử lý** (`resolution ≠ null`): mờ 60%, không có nhãn ngày, chip bên phải "Đã thực hiện" (xanh, icon `check-circle-2`) / "Đã hủy" / "Đã đổi lịch" (trung tính); không tính là chưa xem.
- Chân danh sách: "Nhắc nhở được giữ 90 ngày. Chạm vào nhắc để mở mốc và đánh dấu đã xem."
- Empty: "Chưa có nhắc nhở nào. Nhắc sẽ xuất hiện ở đây trước 7 ngày và 1 ngày tới hạn của mỗi mốc y tế."
- Đang tải: skeleton 4 dòng cố định chiều cao; lỗi tải: `ErrorState` + "Thử lại".

**Chuông (CMP-07):** `IconButton` 44 × 44 icon `bell`; badge tròn `--primary`, chữ trắng `text-caption` (12/16, 600), góc trên phải. Phone: giữa PetSwitcher và "+"; tablet/desktop: giữa PetSwitcher và "+ Thêm".

**Responsive:** phone toàn chiều rộng; tablet danh sách tối đa 720 px; desktop tối đa 760 px, căn giữa vùng nội dung.

## Tiêu chí chấp nhận

- [ ] **Given** đã đăng nhập, **When** ở bất kỳ màn hình nào, **Then** thanh trên có chuông kèm số chưa xem: ẩn khi 0, "9+" khi lớn hơn 9.
- [ ] **Given** có 3 nhắc, 2 chưa xem, **When** mở Thông báo, **Then** hiển thị cả 3, mới nhất trước, 2 mục chưa xem tô đậm kèm chấm màu; mỗi mục có tên thú cưng, loại mốc, ghi chú, ngày hạn `dd/MM/yyyy` và nhãn.
- [ ] **Given** nhắc chưa xem, **When** chạm vào, **Then** nhắc chuyển sang đã xem, số trên chuông giảm 1 và mở thẳng SCR-15 của mốc; mở trên thiết bị khác (tải lại) thấy đã xem.
- [ ] **When** bấm "Đánh dấu đã xem", **Then** số trên chuông về 0 và nút ẩn.
- [ ] **Given** mốc đã thực hiện, hủy hoặc đổi hạn, **Then** nhắc cũ hiển thị mờ kèm nhãn "Đã thực hiện" / "Đã hủy" / "Đã đổi lịch" và không tính vào số chưa xem.
- [ ] Nhắc quá hạn hiển thị "quá hạn N ngày" (US-048).
- [ ] Chuông cập nhật khi đổi route, khi tab được chọn lại và sau mỗi thao tác với mốc; không có request định kỳ khi đứng yên.
- [ ] Danh sách nhóm đúng "HÔM NAY", "HÔM QUA", `dd/MM/yyyy`; tải thêm khi cuộn tới cuối; không hiển thị nhắc quá 90 ngày.

## Kiểm thử

- **Component (MSW):** `BellButton` với 0, 1, 9, 10, 37 → ẩn, "1", "9", "9+", "9+" và `aria-label` đúng; `NotificationItem` 3 trạng thái (snapshot + có chữ "Chưa xem" ẩn); `group-by-day` với `today = 2026-11-14` và `appearOn` 14/11, 13/11, 10/11.
- **Hành vi:** chạm mục → 1 request `read` + điều hướng có `?from=notification`; lỗi `500` → mục hoàn về chưa xem, toast hiện; "Đánh dấu đã xem" gửi `upTo = fetchedAt`; chuyển tab trình duyệt rồi quay lại → có 1 request summary mới.
- **Trợ năng:** axe-core 0 vi phạm; mỗi mục đọc được đầy đủ "Chưa xem, Mochi · Tiêm vaccine (Dại), đến hạn 15/11/2026, ngày mai".
- **Thủ công:** khớp frame 8:364 ở 390 px; 834 px và 1280 px không cuộn ngang.

## Ghi chú

- Nút ở frame ghi "Đánh dấu đã xem", AC ghi "Đánh dấu tất cả đã xem": hiển thị chữ ngắn của frame, tên truy cập dùng câu đầy đủ để Playwright tìm bằng `getByRole('button', { name: 'Đánh dấu tất cả đã xem' })`.
- Dùng `fetchedAt` (giờ server) làm `upTo`, không dùng `Date.now()` của client, để không lệch đồng hồ và chạy đúng với `FakeClock`.
