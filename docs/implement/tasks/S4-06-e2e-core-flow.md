# S4-06 · E2E luồng cốt lõi với `FakeClock`, test song song

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S4 · T9–10 |
| Story | US-040→049 (kiểm chứng đầu-cuối) |
| Yêu cầu | G-3, G-5 (chuẩn bị), G-15, G-18; NFR-MNT-005; NFR-REL-003; FR-NTF-001→006; SAD §3.2.1 (kiểm thử luồng), P7 |
| Phụ thuộc | [S4-02](S4-02-complete-undo-api.md), [S4-03](S4-03-notifications-api.md), [S4-04](S4-04-milestones-ui.md), [S4-05](S4-05-notifications-ui.md) |
| Ước lượng | 1,5 |
| Màn hình Figma | — (kịch bản giao diện đi qua SCR-14, SCR-15, SCR-17, FLW-04) |

## Mục tiêu

Chứng minh luồng giá trị cốt lõi đúng với thời gian giả: đăng ký → xác minh → tạo thú cưng → tạo mốc → D7, D1 xuất hiện → đánh dấu → thông báo đã xử lý → mốc kế tiếp. Chạy được chỉ qua API (G-18) và qua giao diện; nhắc không bao giờ bị nhân đôi (G-15). Đạt mốc M4.

## Phạm vi

**Trong phạm vi:** endpoint `POST /__test/clock`; Playwright project `api` và `ui`; 9 ca SRS §2.6 qua API; test song song; ca múi giờ; job CI chạy E2E trên stack compose tạm.

**Ngoài phạm vi:** banner Dashboard trong kịch bản UI → bổ sung ở [S5-04](S5-04-dashboard-ui.md) (G-3 hoàn tất ở S5). Kiểm thử múi giờ trên thiết bị thật → [S7-05](S7-05-contract-device-test.md). Đổi múi giờ qua giao diện Cài đặt → [S6-01](S6-01-settings-api.md).

## Chi tiết kỹ thuật

**1. Endpoint đồng hồ giả**

```
apps/api/src/platform/testing/test-routes.ts    # chỉ thư mục này chứa route __test
apps/api/src/main-api.ts:
  if (process.env.NODE_ENV === 'test') {
    const { registerTestRoutes } = await import('./platform/testing/test-routes.js');
    registerTestRoutes(app, clock as FakeClock);
  }
```

- `POST /api/v1/__test/clock` body `{ now: "2026-11-08T01:00:00+07:00" }` → `FakeClock.set(now)`, trả `200 { now }` (UTC). `{ reset: true }` → về giờ thật. `{ advanceMs: 16000 }` → cộng thời gian (dùng cho cửa sổ hoàn tác).
- Route công khai (`public: true`) nhưng chỉ tồn tại khi `NODE_ENV=test`; khởi động với `NODE_ENV=production` mà thư mục `platform/testing` có trong bundle → tiến trình thoát với lỗi.
- Dockerfile: stage `app-test` giữ `dist/platform/testing`; stage `app` (image đẩy lên GHCR cho staging/prod) chạy `rm -rf dist/platform/testing`. CI kiểm: `docker run ph-app ls dist/platform/testing` phải lỗi; `POST /api/v1/__test/clock` trên staging trả `404`.
- `ClockPort` là singleton trong tiến trình `api`; mọi use case S4 lấy giờ từ đây (không `now()` SQL).

**2. Bố trí Playwright**

```
e2e/
  playwright.config.ts          # projects: api, ui-phone (390×844), ui-tablet (834×1112)
  fixtures/clock.ts             # setClock(iso), advance(ms), resetClock()
  fixtures/account.ts           # register + đọc link xác minh từ Mailpit API + login
  api/core-flow.api.spec.ts
  api/srs-2-6-table.api.spec.ts
  api/concurrency.api.spec.ts
  api/timezone.api.spec.ts
  ui/core-flow.ui.spec.ts
infra/compose.e2e.yml           # postgres, mailpit, api+worker (target app-test, NODE_ENV=test), caddy
```

- `workers: 1`, `fullyParallel: false` cho mọi spec dùng đồng hồ (đồng hồ dùng chung cả tiến trình). `afterEach` → `resetClock()`.
- Mỗi test tạo tài khoản mới (`e2e+<uuid>@example.test`) để `notifications_synced_on` sạch.
- Mailpit: `GET http://mailpit:8025/api/v1/messages?query=to:<email>` → lấy `#token=` trong liên kết xác minh.
- CI: job `e2e` sau `integration`: `docker compose -f infra/compose.e2e.yml up -d --wait` → `pnpm playwright test` → upload trace khi lỗi.

**3. Kịch bản G-3 qua API (`core-flow.api.spec.ts`)** — múi giờ `Asia/Ho_Chi_Minh`

1. Clock `2026-11-01T09:00+07:00`. Đăng ký → xác minh qua Mailpit → đăng nhập → `POST /pets` "Mochi".
2. `POST /pets/{id}/milestones { type: VACCINE, dueOn: 2026-11-15, note: "Dại" }` → `dueSetOn = 2026-11-01`.
3. Clock `2026-11-07T23:59+07:00` → `summary.unreadCount = 0`.
4. Clock `2026-11-08T00:01+07:00` → `unreadCount = 1`, `banner.top.level = D7`, `label = "còn 7 ngày"`; `GET /notifications` có 1 mục.
5. Clock `2026-11-14T08:00+07:00` → 1 chưa xem `D1` "ngày mai"; mục D7 `unread = false`.
6. `POST /milestones/{id}/complete { doneOn: 2026-11-14 }` → `nextMilestone.dueOn = 2027-11-14`, `note = "Dại"`, `resolvedNotificationIds` có 2 ID; `summary.unreadCount = 0`; danh sách: cả hai `resolution = DONE`.
7. Hoàn tác: `undo-complete` ngay → `200`, D1 chưa xem lại, mốc kế tiếp `404`. Đánh dấu lại → `advance(16000)` → `undo-complete` → `409 UNDO_WINDOW_EXPIRED`.
8. Clock `2027-11-07` → D7 cho mốc 2027-11-14 xuất hiện (vòng lặp chạy tiếp).

**4. Kịch bản G-3 qua giao diện (`core-flow.ui.spec.ts`, phone + tablet)** — chỉ dùng `getByRole`/`getByLabel`

Đăng ký, mở liên kết xác minh, thêm thú cưng → Lịch → "+ Tạo mốc" (Tiêm vaccine, 15/11/2026, "Dại") → đặt clock 08/11 → reload: chuông "Thông báo, 1 chưa xem" → SCR-17 thấy "Mochi · Tiêm vaccine (Dại)", "còn 7 ngày" → chạm → SCR-15, chuông ẩn badge → đặt clock 14/11 → reload: chuông 1, SCR-17 có "ngày mai" → SCR-15 "Đánh dấu đã thực hiện" → "Xác nhận" → toast "Đã đánh dấu thực hiện" + "Hoàn tác" và "Đã tạo lịch tiêm tiếp theo: 14/11/2027" → SCR-17 hai mục mờ "Đã thực hiện" → tab Sắp tới có mốc hạn 14/11/2027. Nhánh phụ: bấm "Hoàn tác" trong 10 s → mốc quay lại tab Sắp tới. axe-core chạy ở mỗi màn hình đi qua.

**5. 9 ca SRS §2.6 qua API (`srs-2-6-table.api.spec.ts`)** — `test.each`, mỗi ca 1 tài khoản; clock đặt 09:00 giờ VN của ngày tương ứng; tạo mốc ở ngày đặt hạn, mở app (`GET /notifications/summary` + `GET /notifications`) ở từng ngày trong cột "mở app":

| # | Đặt hạn | Hạn | Mở app | Kỳ vọng |
|---|---|---|---|---|
| 1 | 11-01 | 11-15 | 11-07 | 0 thông báo |
| 2 | 11-01 | 11-15 | 11-08 | 1 D7 chưa xem "còn 7 ngày" |
| 3 | 11-01 | 11-15 | 11-07, 11-11 | 1 D7 chưa xem "còn 4 ngày" |
| 4 | 11-01 | 11-15 | 11-08, 11-14 | D1 chưa xem "ngày mai"; D7 đã xem; tổng 2 |
| 5 | 11-01 | 11-15 | 11-07, 11-14 | chỉ 1 D1, không có D7 |
| 6 | 11-11 | 11-15 | 11-11 | 0 |
| 7 | 11-11 | 11-12 | 11-11 | 0 |
| 8 | 11-11 | 11-12 | 11-13 | 1 OVERDUE "quá hạn 1 ngày" |
| 9 | 11-11 | 11-01 | 11-11, 11-20 | 0; mốc nằm trong `overdue` của `GET /pets/{id}/milestones` |

Thêm 2 ca từ AC US-041: (a) ngày 05/11 `PATCH dueOn 2026-11-20` → 12/11: 0; 13/11: D7; 19/11: D1; (b) ngày 10/11 `complete` mốc hạn 15/11 → 14/11: 0 thông báo chưa xem, không có dòng D1.

**6. Song song (`concurrency.api.spec.ts`, G-15)**

- Một tài khoản, 2 phiên đăng nhập riêng (2 `request.newContext`, như 2 thiết bị). Mốc hạn 15/11 tạo 01/11; clock 08/11.
- `Promise.all` 2 × 10 request `GET /notifications/summary` (khi S5-03 xong thêm `GET /dashboard` vào cùng lô) → mọi response `unreadCount = 1`; `GET /notifications` có đúng 1 mục.
- Lặp lại ở 14/11 → đúng 1 D1, D7 đã xem; tổng 2 dòng.
- Song song `complete` từ 2 phiên cùng `doneOn` → cùng `nextMilestone.id`; `GET /pets/{id}/milestones` có đúng 1 mốc `AUTO`.

**7. Múi giờ (`timezone.api.spec.ts`, chuẩn bị G-5)**

- Tài khoản `Asia/Ho_Chi_Minh`, mốc hạn 15/11 tạo 01/11: clock `2026-11-07T16:59:59Z` (07/11 23:59:59 VN) → 0; `2026-11-07T17:00:00Z` (08/11 00:00 VN) → D7.
- Tài khoản `America/Los_Angeles` (UTC−8), cùng mốc: `2026-11-08T07:59:59Z` → 0; `2026-11-08T08:00:00Z` → D7.
- Đổi múi giờ: tài khoản VN đã đồng bộ lúc `2026-11-07T15:30Z` (07/11 VN, 0 thông báo) → đổi sang `Asia/Tokyo` (08/11 00:30 JST) → lần đọc kế tiếp có D7 ngay; đổi ngược về VN → D7 vẫn còn (FR-AUTH-011). Tới khi có [S6-01](S6-01-settings-api.md), fixture đổi `users.timezone` và đặt `notifications_synced_on = NULL` trực tiếp qua kết nối DB test; sau S6-01 chuyển sang `PATCH /me`.

## Giao diện

Không có.

## Tiêu chí chấp nhận

- [ ] `POST /__test/clock` chỉ có khi `NODE_ENV=test`; image `ph-app` không chứa `dist/platform/testing`; staging trả `404`.
- [ ] Kịch bản G-3 chạy hoàn toàn qua API, không mở trình duyệt, Pass (G-18).
- [ ] Kịch bản G-3 qua giao diện Pass ở viewport phone 390 × 844 và tablet 834 × 1112.
- [ ] 9/9 ca bảng SRS §2.6 và 2 ca bổ sung của US-041 Pass qua API.
- [ ] Hai phiên × 10 request song song → đúng 1 thông báo mỗi `(mốc, mức, hạn)`; complete song song → đúng 1 mốc kế tiếp (G-15).
- [ ] Hoàn tác trong cửa sổ khôi phục đúng trạng thái; sau 15 s → `409 UNDO_WINDOW_EXPIRED`.
- [ ] Ranh giới 00:00 đúng theo múi giờ tài khoản ở 3 múi giờ; đổi múi giờ có hiệu lực ở lần đọc kế tiếp, thông báo cũ giữ nguyên.
- [ ] Job `e2e` chạy trong CI, lưu trace Playwright khi lỗi; toàn bộ bộ test < 10 phút.

## Kiểm thử

- Chạy bộ E2E 3 lần liên tiếp trên CI không có lỗi chập chờn (flaky) trước khi đánh dấu M4.
- Kiểm âm: tắt tạm `ON CONFLICT` trong nhánh thử → `concurrency.api.spec.ts` phải đỏ (chứng minh test bắt được lỗi).
- Kiểm âm: dùng `now()` của DB thay cho `ClockPort` ở `complete` → bước hoàn tác của kịch bản API phải đỏ.

## Ghi chú

- SAD §4.4.3 vẽ E2E chạy sau khi deploy staging, nhưng staging dùng image `ph-app` không có `/__test/clock`. Vì vậy các spec cần `FakeClock` chạy trên stack compose tạm trong CI (SAD §4.4.1, môi trường `ci`); trên staging chỉ chạy phần không đổi đồng hồ (smoke).
- Kịch bản UI chưa có banner Dashboard; [S5-04](S5-04-dashboard-ui.md) thêm bước banner (✕, "Xem", "Đã thực hiện") để hoàn tất G-3.
