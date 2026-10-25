# S5-03 · `GET /dashboard` — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S5-03](../tasks/S5-03-dashboard-api.md) |
| Trạng thái | Xong, test E2E API Pass; chưa đo hiệu năng |
| Ngày hoàn thành | 2026-10-25 |
| Commit | xem [README](README.md) |

## Kết quả

- **Mô-đun `dashboard`** (không có bảng):
  - `application/get-dashboard.ts`: `getDashboard(ports, withTx, ownerId, emailVerified, pet)`.
  - `adapters/http/dashboard.route.ts`: `GET /dashboard?pet=all|{uuid}` với schema Zod `DashboardView` và `Cache-Control: no-store`.
  - `index.ts`: ghép port của các mô-đun khác.
- **Luồng xử lý:**
  1. Một transaction đọc múi giờ và danh sách thú cưng. `pet` không thuộc tài khoản → `404`; sai định dạng → `422`.
  2. Không có thú cưng → trả các phần rỗng ngay.
  3. Đồng bộ thông báo + đọc banner (tuần tự).
  4. Checklist, mốc sắp tới và cân nặng chạy `Promise.all`, mỗi phần một transaction ngắn có RLS.
- **Port mới ở các mô-đun:**
  - `pets`: `createPetListQuery(media).listForOwner`, trả `{ id, name, avatarThumbUrl (đã ký), weightTargetKg }`. Thêm `PetQueryPort.lockOwnedPet` (S5-01).
  - `scheduling`: `milestoneQuery.upcomingForDashboard`, repository `upcoming` (PENDING, `pet_id IN`, `due_on ≤ today + 30`, sắp `due_on, created_at, id`, `LIMIT 5`), tính `displayStatus`, `daysUntilDue`.
  - `health-records`: `weightQuery.summaryForDashboard` (`latest` + `delta`, `series` 6 tháng tăng dần), dùng lại truy vấn của S3-01.
  - `notifications`: `notificationSummaryFor` (cùng hàm của `GET /notifications/summary`); export `zNotification`.
  - `routines`: `routineQuery.checklistForToday` (S5-01).
- **`platform/calendar/months.ts`:** thêm `subtractCalendarMonths` (kẹp ngày cuối tháng).
- **`AuthContext.emailVerified`:** session resolver điền từ `users.email_verified_at` (đã có trong câu đọc phiên), Dashboard không phải truy vấn thêm.
- **`unreadCount` của Dashboard** chỉ tính thông báo trong phạm vi lọc (`banner.moreCount + 1`), khác chuông (`/notifications/summary` đếm cả tài khoản).
- **IDOR:** `__idor__/dashboard.idor.ts`: ca custom `?pet=<thú cưng của B>` → `404`, body không chứa tên của B.
- Sinh lại `openapi.yaml` và `api-client`.

## Tiêu chí chấp nhận

Đã kiểm bằng `e2e/api/dashboard.api.spec.ts` (4 ca, bộ API 23/23):
- Tài khoản rỗng: các phần rỗng, `weight: null`, `no-store`. `pet=abc` → `422`.
- 6 mốc quá hạn → 5 mốc sớm nhất, `displayStatus: OVERDUE`, `daysUntilDue: -12`. Mốc +30 ngày có, +31 không.
- Banner: OVERDUE (Bơ) > D1 > D7, `moreCount = 2`. `?pet=Mochi` → `unreadCount = 2`, `top = D1` của Mochi, mốc chỉ của Mochi. Đọc hết → `banner: null`.
- Checklist có `petName`, `doneCount/totalCount` đúng. Cân nặng `delta = 0.7`; số đo hơn 6 tháng trước không có trong `series`.

Unit `test/dashboard.test.ts` (4 ca, port giả):
- Đồng bộ chạy trước, sau đó 3 truy vấn.
- "Tất cả" lấy cân nặng của thú cưng đầu; lọc một thú cưng chỉ truy vấn thú cưng đó.
- Không có thú cưng thì không gọi port nào.
- Thú cưng lạ → 404.

Ngoài ra: IDOR 92/92, unit tổng 188, typecheck, lint, depcruise.

## Khác với file task

- **Chưa đo hiệu năng:** chưa có script seed SD-011 + autocannon, chưa xem `EXPLAIN`. Để S7-03 hoặc khi có server.
- **Đọc banner nằm cùng bước đồng bộ** (hàm `getNotificationSummary` của S4-03 làm cả hai), nên chạy song song 3 truy vấn chứ không phải 4.
- **Test tích hợp bằng bộ E2E API** thay vì Testcontainers. Không có ca riêng "lần gọi thứ hai không sync" (đường nhanh `notifications_synced_on` đã có ở S4-03).
