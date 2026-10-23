# S6-05 · Analytics tự lưu

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S6 · T13–14 |
| Story | — |
| Yêu cầu | FR-ANL-001, FR-ANL-002, FR-ANL-003, FR-ANL-004, FR-ANL-005, AD-015, NFR-SEC-009 |
| Phụ thuộc | [S5-04](S5-04-dashboard-ui.md) |
| Ước lượng | 1 |
| Màn hình Figma | — |

## Mục tiêu

Ghi đủ các event ở PRD §5.2 vào bảng `analytics_events` trong PostgreSQL (AD-015), không chứa dữ liệu cá nhân hay nội dung y tế, không bao giờ làm hỏng chức năng chính, và có sẵn view SQL cho 3 funnel.

## Phạm vi

**Trong phạm vi:** migration bảng phân vùng; mô-đun `apps/api/src/modules/analytics/` (route nhận event, danh sách trắng, `AnalyticsPort` cho event server); client `apps/web/src/lib/analytics.ts`; gắn event tại các điểm kích hoạt; `web_vitals`, `client_error`; 3 view funnel.

**Ngoài phạm vi:** tạo partition tháng tới và xóa partition > 13 tháng ([S6-06](S6-06-maintenance-job.md)); dashboard chỉ số (truy vấn SQL tay); công cụ bên thứ ba (không dùng).

## Chi tiết kỹ thuật

**1. Migration**

```sql
CREATE TABLE analytics_events (
  id uuid NOT NULL, name text NOT NULL, user_id_hash text NULL,
  platform text NOT NULL DEFAULT 'web' CHECK (platform IN ('web')),
  device_class text NOT NULL CHECK (device_class IN ('phone','tablet','desktop','server')),
  viewport_w smallint NULL, props jsonb NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);
CREATE INDEX ON analytics_events (name, occurred_at);
```
Hàm `analytics_ensure_partitions(months_ahead int)` tạo `analytics_events_YYYYMM` từ tháng hiện tại tới `+months_ahead`; migration gọi với 2. Bảng không có RLS theo `owner_id` (không có cột này); `app_rw` chỉ có quyền `INSERT`, không `SELECT`.

**2. `POST /api/v1/analytics/events`**

- Body: `{ viewportW: int 0..10000, events: [{ name, props, occurredAt }] }`, 1–20 event, body ≤ 16 KB. Vượt → `400`/`413`.
- Phiên **không bắt buộc** (cho `signup_started`). Có phiên → bắt buộc `X-CSRF-Token`, `user_id_hash = HMAC-SHA256(ANALYTICS_HMAC_KEY, userId)` hex; không phiên → `NULL`. Luôn kiểm `Origin`. Client không gửi được `user_id_hash`.
- Không yêu cầu `Idempotency-Key` (đánh dấu ngoại lệ trong route config; event trùng chấp nhận được).
- Rate limit `analytics:{ip}` 60 request/phút → `429`, client bỏ qua.
- Với mỗi event: tên không có trong danh sách trắng → bỏ; `props` chỉ giữ khóa được phép, giá trị phải đúng kiểu (enum/số/boolean), chuỗi tự do bị loại; `occurredAt` ngoài khoảng `[now − 24h, now + 5 phút]` → thay bằng `now`. `device_class` server tính từ `viewportW`: < 768 `phone`, 768–1279 `tablet`, ≥ 1280 `desktop`.
- Luôn trả `204` khi body hợp lệ, kể cả khi đã bỏ event. Lỗi DB → log `warn`, vẫn `204`.

**3. Danh sách trắng** (`analytics/domain/allowlist.ts`, đúng PRD §5.2):

| Event | Props cho phép |
|---|---|
| `signup_started` | `source` enum (`direct`, `login_page`, `other`) |
| `signup_completed`, `pet_limit_reached`, `weight_target_set` | — |
| `email_verified` | `hours_since_signup` int |
| `login` | `device_class` |
| `app_opened` | `device_class`, `orientation` (`portrait`/`landscape`) |
| `pet_created` | `pet_count_after` 1–10, `has_photo` bool |
| `weight_logged` | `has_target` bool, `days_since_last_log` int ≥ 0 \| null, `entry_point` (`dashboard`/`weight_page`) |
| `weight_chart_viewed` | `points_count` int |
| `visit_created` | `has_prescription` bool, `photo_count` 0–5 |
| `visit_photo_uploaded` | `size_kb` int, `format` (`jpg`/`png`/`heic`) |
| `visit_photo_failed` | `reason` (`size`/`format`/`network`) |
| `milestone_created` | `type`, `days_until_due` int, `has_cycle` bool, `auto_generated` bool |
| `milestone_completed` | `type`, `days_from_due` int |
| `milestone_completed_undone` | `type` |
| `milestone_auto_created` | `type`, `cycle_months` 1–60 |
| `notification_created` | `level` (`d7`/`d1`/`overdue`), `type`, `days_until_due` int |
| `banner_shown` | `level`, `unread_count` int |
| `banner_dismissed` | `unread_count` |
| `notification_center_opened` | `unread_count`, `entry_point` (`bell`/`banner`) |
| `notification_opened` | `level`, `type`, `days_until_due`, `entry_point` (`banner`/`list`) |
| `routine_created` | `task_count_after` 1–20 |
| `routine_checked`, `routine_unchecked` | `minutes_from_scheduled` int |
| `offline_banner_shown` | `screen` |
| `client_error` | `screen`, `code` (`^[A-Z0-9_]{1,40}$` hoặc mã HTTP) |
| `web_vitals` | `metric` (`LCP`/`INP`/`CLS`), `value` number, `rating` (`good`/`needs-improvement`/`poor`), `screen` |

`type` ∈ `vaccine`/`flea`/`deworm`; `screen` là ID route cố định (`dashboard`, `weight`, `visits`, `visit_detail`, `milestones`, `settings`, …), không phải URL có ID.

**4. Event phía server (FR-ANL-004)** qua `AnalyticsPort.record(tx, { name, userId, props })`, `device_class = 'server'`:
- `notification_created`: trong `syncNotifications` (S4-03), chỉ cho dòng thực sự chèn (`RETURNING` sau `ON CONFLICT DO NOTHING`).
- `milestone_auto_created`: khi tạo mốc kế tiếp (S4-02).
- Server cũng phát `email_verified` (cần `created_at`), `milestone_created`, `milestone_completed` (cần "hôm nay" theo múi giờ tài khoản, client không tính).
- Ghi trong `SAVEPOINT analytics`; lỗi → `ROLLBACK TO SAVEPOINT`, log `warn`, transaction nghiệp vụ vẫn commit.

**5. Client** (`lib/analytics.ts`, ≤ 2 KB gzip):
- `track(name, props)` đẩy vào hàng đợi bộ nhớ; gửi khi đủ 20 event, sau 5 s, hoặc `visibilitychange → hidden` (`fetch(..., { keepalive: true })`). Không retry, mọi lỗi bị nuốt (`catch {}`), không ghi `console.error`.
- `web_vitals`: import động `web-vitals` (`onLCP`, `onINP`, `onCLS`) sau khi Dashboard render.
- `client_error`: `window.onerror`, `unhandledrejection`, và lỗi API ≥ 500 / timeout từ `useSubmitForm` ([S6-03](S6-03-system-states.md)); chỉ gửi `code` (`JS_ERROR`, `TIMEOUT`, `NETWORK`, mã `problem+json`), không gửi message hay stack. Tối đa 10 `client_error`/phiên trang.
- `offline_banner_shown` khi `useOnline` chuyển sang offline.

**6. View funnel** (`migrations/xxxx_analytics_views.sql`):
- `analytics_funnel_activation`: theo `user_id_hash`, mốc thời gian đầu tiên của `signup_completed`, `pet_created`, `milestone_created`, và `count(DISTINCT occurred_at::date) FILTER (WHERE name='app_opened') >= 3`. `signup_started` đếm riêng theo ngày (chưa có hash).
- `analytics_funnel_reminder_loop`: theo tuần, số `notification_created` → số người có `banner_shown` hoặc `notification_opened` sau đó → `milestone_completed` sau đó.
- `analytics_funnel_daily_habit`: theo ngày, số user có `app_opened` và số trong đó có `routine_checked` cùng ngày (UTC+7).

## Giao diện

Không có.

## Tiêu chí chấp nhận

- [ ] Mọi event PRD §5.2 được ghi đúng điều kiện kích hoạt và thuộc tính (FR-ANL-001).
- [ ] Mỗi dòng có `user_id_hash` (trừ `signup_started`), `platform = 'web'`, `device_class`, `viewport_w`, `occurred_at` (FR-ANL-002).
- [ ] Gửi event có prop `email`, `petName`, `symptoms` hay tên event lạ → dòng lưu không có các khóa/event đó (FR-ANL-003).
- [ ] `notification_created` được ghi khi chỉ gọi API, không có client (FR-ANL-004); gọi đồng bộ 2 lần không ghi trùng.
- [ ] **Given** bảng `analytics_events` bị khóa hoặc `/analytics/events` trả 500, **When** người dùng lưu cân nặng, **Then** lưu thành công, "Đã lưu" hiện bình thường, không lỗi console (FR-ANL-005).
- [ ] Batch 21 event → `400`; batch hợp lệ → `204`.
- [ ] 3 view funnel truy vấn được trên dữ liệu seed và trả số đúng.

## Kiểm thử

- **Unit:** bộ lọc danh sách trắng (khóa lạ, sai kiểu, chuỗi tự do); tính `device_class` biên 767/768/1279/1280; HMAC ổn định với cùng key.
- **Integration:** `POST /analytics/events` có/không phiên, thiếu CSRF khi có phiên → `403`; `syncNotifications` sinh đúng số `notification_created`; ép lỗi insert analytics (đổi quyền bảng) → use case nghiệp vụ vẫn commit.
- **E2E:** chặn `**/analytics/events` bằng `route.fulfill({ status: 500 })` rồi chạy luồng G-3 → Pass; luồng đăng ký → tạo thú cưng → tạo mốc → truy vấn DB thấy đủ event theo thứ tự.
- **Rà dữ liệu:** test quét `props` của mọi dòng sau E2E, không có khóa ngoài danh sách trắng và không có chuỗi chứa `@`.
- **IDOR:** route không có path param, không đọc dữ liệu; thêm vào suite ca "không trả dữ liệu" (luôn `204`, body rỗng).

## Ghi chú

- `ANALYTICS_HMAC_KEY` (32 byte) nằm trong `secrets/*.env`, thêm vào `.env.example`; đổi key làm đứt liên tục `user_id_hash`, chỉ xoay khi nghi lộ.
- `GET /auth/session` đã trả `userIdHash` (SAD §2.4.2) để log client; analytics không dùng giá trị client gửi.
