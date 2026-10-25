# S6-05 · Analytics tự lưu — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S6-05](../tasks/S6-05-analytics.md) |
| Trạng thái | Xong, E2E API kiểm DB thật Pass |
| Ngày hoàn thành | 2026-10-26 |
| Commit | xem [README](README.md) |

## Kết quả

- **Migration `202610261000_analytics`:**
  - Bảng `analytics_events` phân vùng theo tháng (`PRIMARY KEY (id, occurred_at)`), index `(name, occurred_at)`.
  - Hàm `analytics_ensure_partitions(months_ahead)`; migration gọi với 2.
  - `app_rw`/`app_worker` chỉ có quyền `INSERT`. Không RLS (không có `owner_id`).
  - 3 view: `analytics_funnel_activation`, `analytics_funnel_reminder_loop`, `analytics_funnel_daily_habit` (ngày theo giờ VN). Đã chạy trên DB dev.
- **Mô-đun `analytics`:**
  - `domain/allowlist.ts`: danh sách trắng đúng PRD §5.2 (enum/số/boolean). Tên lạ → bỏ; khóa lạ, sai kiểu hay chuỗi tự do → bỏ. `client_error.code` chỉ `^[A-Z0-9_]{1,40}$` hoặc mã HTTP. `deviceClassOf` (< 768 / < 1280 / còn lại). `clampOccurredAt` ([now − 24 h, now + 5 phút]).
  - **`POST /analytics/events`:**
    - Phiên không bắt buộc (`config.optionalAuth`: auth hook gắn phiên nếu có, khi đó CSRF bắt buộc như mọi route ghi).
    - Body 1–20 event, giới hạn 16 KB; rate limit `analytics:{ip}` 60/phút.
    - `user_id_hash = HMAC-SHA256(ANALYTICS_HMAC_KEY, userId)` do server tính; `signup_started` luôn `NULL`.
    - Lỗi DB → log `warn`, vẫn `204`.
  - **`createAnalyticsPort`** (event phía server, `device_class = 'server'`): ghi trong `SAVEPOINT analytics`, lỗi thì `ROLLBACK TO SAVEPOINT` và transaction nghiệp vụ vẫn commit. `AnalyticsPort.track` nhận thêm `userId`.
- **Event phía server:**
  - `milestone_created`, `milestone_completed`, `milestone_auto_created`, `milestone_completed_undone` (sửa tên/props cũ cho khớp danh sách trắng: `type` chữ thường, `days_from_due`, `cycle_months`).
  - `notification_created`: chỉ cho dòng thực sự chèn khi đồng bộ, nên gọi lặp không ghi trùng.
  - `email_verified` (`hours_since_signup`).
  - Gắn qua `registerModules`: dùng chung db, rate limiter, khóa HMAC của identity.
- **Client `api/analytics.ts`:**
  - `track()` vào hàng đợi; gửi khi đủ 20 event, sau 5 s hoặc khi tab ẩn (`keepalive`); không retry, nuốt mọi lỗi.
  - `screenOf(pathname)` trả ID màn hình cố định.
  - `trackClientError` (tối đa 10 mỗi lần tải trang, chỉ mã): `window.onerror`, `unhandledrejection`, `TIMEOUT` / `NETWORK` / mã 5xx từ `QueryCache`/`MutationCache`.
  - `web_vitals` (LCP, INP, CLS) qua import động `web-vitals`.
- **Điểm gắn event phía client:**
  - `signup_started`, `signup_completed`, `login`.
  - `app_opened` (một lần mỗi lần tải trang).
  - `pet_created`, `weight_logged`, `visit_created`.
  - `routine_created`, `routine_checked`, `routine_unchecked`.
  - `banner_shown`, `banner_dismissed`.
  - `notification_center_opened`, `notification_opened`.
  - `offline_banner_shown` (callback `onOffline` của `watchConnection`).
- IDOR: thêm `POST /analytics/events` vào danh sách route public có chủ đích.

## Tiêu chí chấp nhận

Đã kiểm bằng `e2e/api/analytics.api.spec.ts` (đọc DB bằng ph_owner):
- **Không phiên:** tên lạ không lưu, khóa `email` và `petName` bị bỏ, `signup_started` có `user_id_hash = NULL`, `device_class = phone`. Batch 21 event → 422.
- **Có phiên:**
  - `user_id_hash` 64 hex do server tính.
  - Thứ tự event của user: `app_opened` → `milestone_created` (server, `days_until_due 14`) → `notification_created` (`d7`, `days_until_due 7`).
  - Gọi `summary` 2 lần vẫn chỉ 1 `notification_created`.

Unit `test/analytics.test.ts`: lọc danh sách trắng, biên `device_class`, kẹp `occurredAt`, HMAC ổn định.

Toàn bộ: unit 198, IDOR 97/97, E2E 48/48, typecheck, lint, depcruise, bundle 136,5 KB.

## Khác với file task

- **Batch sai → `422 VALIDATION_FAILED`** (quy ước lỗi kiểm dữ liệu của cả API), không phải `400`.
- **Chưa gắn** các event: `pet_limit_reached`, `weight_target_set`, `weight_chart_viewed`, `visit_photo_uploaded`/`failed`. `weight_logged.days_since_last_log` luôn `null`, `notification_center_opened` chưa có `entry_point`.
- **Chưa có E2E ép lỗi bảng analytics** (FR-ANL-005). Đã có `SAVEPOINT` phía server và client nuốt lỗi.
- **Funnel view chưa kiểm số trên dữ liệu seed.**
- Tạo partition tháng tới và xóa partition cũ để S6-06.
