# S1-02 · Worker email: `email.transactional`, `nodemailer`, React Email, hạn mức ngày

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S1 · T3–4 |
| Story | — (phục vụ US-001, US-002, US-004) |
| Yêu cầu | FR-AUTH-002, FR-AUTH-008, NFR-PERF-004, AD-006, AD-008, G-14 |
| Phụ thuộc | [S1-01](S1-01-identity-schema-rls.md) |
| Ước lượng | 1 |
| Màn hình Figma | — |

## Mục tiêu
Có đường gửi email tài khoản hoàn chỉnh: use case enqueue job trong cùng transaction, worker render template tiếng Việt (HTML + plain text) và gửi qua SMTP (Mailpit ở local/staging, Gmail ở production), có retry và giới hạn số thư mỗi ngày.

## Phạm vi
**Trong phạm vi:**
- `EmailPort` + adapter SMTP (`nodemailer`) + adapter giả cho test.
- Hàng đợi pg-boss `email.transactional`, handler trong worker, enqueue trong transaction.
- Package `packages/email-templates`: 2 template `VerifyEmail`, `ResetPassword`.
- Đếm hạn mức ngày `SMTP_DAILY_LIMIT`.

**Ngoài phạm vi:**
- Tạo token và gọi enqueue: [S1-03](S1-03-register-api.md), [S1-05](S1-05-verify-email-api.md), [S1-06](S1-06-password-reset-api.md).
- Template đổi email (`CHANGE_EMAIL`, thư báo email cũ): [S6-01](S6-01-settings-api.md).
- Cấu hình Gmail App Password, kiểm spam G-14 trên production: [S7-02](S7-02-cloudflare-email.md).

## Chi tiết kỹ thuật

### 1. Port và adapter — `apps/api/src/platform/email/`
```ts
// email-port.ts
export interface EmailMessage { to: string; subject: string; html: string; text: string }
export interface EmailPort { send(msg: EmailMessage): Promise<void> }
export class EmailRejectedError extends Error { constructor(public responseCode: number) { super() } }
```
- `smtp-email-adapter.ts`: `nodemailer.createTransport({ host, port, secure, auth, pool: true, maxConnections: 1, connectionTimeout: 10_000, socketTimeout: 30_000 })`. Lỗi có `responseCode >= 500` → ném `EmailRejectedError`; lỗi `4xx` hoặc lỗi mạng → ném lại nguyên lỗi (để retry).
- `fake-email-adapter.ts`: lưu thư vào mảng `outbox` cho unit test; có cờ giả lập lỗi `4xx`/`5xx`.

| Biến môi trường | Local / staging (Mailpit) | Production (Gmail) |
|---|---|---|
| `SMTP_HOST` | `mailpit` | `smtp.gmail.com` |
| `SMTP_PORT` | `1025` | `465` |
| `SMTP_SECURE` | `false` | `true` (TLS từ đầu, kiểm chứng chỉ) |
| `SMTP_USER` / `SMTP_PASS` | rỗng | địa chỉ Gmail riêng của Pet Health / App Password |
| `SMTP_FROM` | `"Pet Health" <no-reply@pethealth.example>` | `"Pet Health" <địa chỉ Gmail đó>` (AD-008: phải trùng tài khoản gửi) |
| `SMTP_DAILY_LIMIT` | `400` | `400` |
| `APP_ORIGIN` | `http://localhost:5173` | `https://app.pethealth.example` |

Thêm vào `infra/*.env.example`. Mailpit xem thư ở `http://localhost:8025`.

### 2. Hàng đợi — `apps/api/src/platform/queue/`
- Khai báo queue khi worker khởi động: `boss.createQueue('email.transactional', { retryLimit: 5, retryDelay: 30, retryBackoff: true, deleteAfterSeconds: 86_400 })` → thử lại sau ~30 s, 60 s, 120 s, 240 s, 480 s. Job thành công xóa sau 1 ngày (không giữ 7 ngày như queue khác) vì payload có token.
- Payload (Zod, `packages`-độc lập, đặt ở `platform/email/jobs.ts`):
```ts
type EmailJob =
  | { template: 'VERIFY_EMAIL';   to: string; token: string }
  | { template: 'RESET_PASSWORD'; to: string; token: string };
```
- `JobQueuePort.enqueueInTx(tx, queue, data)`: gọi `boss.send(queue, data, { db: kyselyTxAdapter(tx) })` với `db.executeSql` chạy qua transaction Kysely hiện tại. Rollback transaction thì job cũng mất (không có user nào thiếu email, không có email nào cho user không tồn tại).

### 3. Handler — `apps/api/src/modules/identity/adapters/jobs/send-transactional-email.ts`
Chạy trong `main-worker.ts`, `boss.work('email.transactional', { batchSize: 1 }, handler)` (concurrency 1).

1. Parse payload bằng Zod; sai → log `error`, kết thúc job (không retry).
2. Tăng bộ đếm ngày: `INSERT INTO rate_limits(bucket, window_start, count) VALUES ('smtp:daily', date_trunc('day', now() AT TIME ZONE 'UTC'), 1) ON CONFLICT DO UPDATE SET count = rate_limits.count + 1 RETURNING count` (dùng hàm đếm của [S0-05](S0-05-idempotency-ratelimit.md)).
3. Hạn mức (`limit = SMTP_DAILY_LIMIT`):
   - `count > limit` → log `error` `{ job, template, count }`, không gửi, kết thúc job.
   - `count > 0.8 × limit` và `template !== 'RESET_PASSWORD'` → log `warn` `smtp_daily_limit_80`, không gửi, kết thúc job.
   - `count > 0.8 × limit` và là `RESET_PASSWORD` → vẫn gửi, log `warn`.
4. Render: `link = ${APP_ORIGIN}/verify-email#token=${token}` hoặc `${APP_ORIGIN}/reset-password#token=${token}`; `html = await render(<Tpl link />)`, `text = await render(<Tpl link />, { plainText: true })`.
5. `email.send(...)`. `EmailRejectedError` → log `warn` kèm `responseCode`, kết thúc job (không retry). Lỗi khác → ném ra để pg-boss retry.
6. Log `info` `{ job: 'email.transactional', template, durationMs }`. Không log `to`, `token`, `link` (redact `*.email`, `*.token` đã có; thêm `*.to`, `*.link` vào danh sách `redact` của `pino`).

Nếu bước 3 bỏ qua thư thì vẫn đếm (đơn giản, chấp nhận lệch nhỏ).

### 4. Template — `packages/email-templates`
- Dependency: `@react-email/components`, `@react-email/render`, `react`. Export `VerifyEmail`, `ResetPassword` và `subjects`.
- Nội dung (UI/UX Blueprint §3.5.4): tiêu đề, 1 câu giải thích, 1 nút, 1 dòng hạn. Không chứa dữ liệu thú cưng (SAD §4.1.7).

| Template | Subject | Câu giải thích | Nút | Dòng hạn |
|---|---|---|---|---|
| `VerifyEmail` | Xác minh email Pet Health | Bấm nút dưới đây để xác minh địa chỉ email của tài khoản Pet Health. | Xác minh email | Liên kết hết hạn sau 24 giờ. |
| `ResetPassword` | Đặt lại mật khẩu Pet Health | Bấm nút dưới đây để đặt mật khẩu mới cho tài khoản Pet Health. | Đặt lại mật khẩu | Liên kết hết hạn sau 60 phút. |

- Thêm dòng nhỏ cuối thư: "Nếu bạn không yêu cầu, hãy bỏ qua email này." và liên kết dạng văn bản (để copy khi nút không hiển thị).
- Màu nút `#C2185B`, chữ trắng; inline style (React Email lo). `lang="vi"`.
- Script `pnpm --filter email-templates preview` mở `email dev` để xem.

## Giao diện
Không có (giao diện email mô tả ở mục 4).

## Tiêu chí chấp nhận
- [ ] Use case gọi `enqueueInTx` trong transaction bị rollback thì không có job trong `pgboss.job`.
- [ ] Trên local, job `VERIFY_EMAIL` xuất hiện trong Mailpit trong ≤ 1 phút kể từ khi enqueue (NFR-PERF-004), có cả phần HTML và plain text, subject "Xác minh email Pet Health", liên kết dạng `/verify-email#token=...`.
- [ ] Lỗi `4xx`/mạng được thử lại tối đa 5 lần với khoảng chờ tăng gấp đôi từ 30 s.
- [ ] Lỗi `5xx` không thử lại; job kết thúc, log `warn` có `responseCode`.
- [ ] Vượt 80% `SMTP_DAILY_LIMIT`: thư xác minh bị bỏ qua và log `warn`; thư đặt lại mật khẩu vẫn gửi. Vượt 100%: không gửi thư nào.
- [ ] Log worker không chứa địa chỉ email, token hay liên kết.
- [ ] Worker dừng (`SIGTERM`) bằng `boss.stop({ graceful: true })`; job đang chạy hoàn tất hoặc được trả lại hàng đợi.

## Kiểm thử
- **Unit (Vitest):** handler với `FakeEmailAdapter` và bộ đếm giả: các ca `count` = 320 (80%, gửi), 321 (VERIFY bỏ qua, RESET gửi), 401 (không gửi) với `SMTP_DAILY_LIMIT = 400`; lỗi `550` → không ném; lỗi `421` → ném; payload sai → không ném.
- **Unit template:** render cả 2 template, kiểm có subject, link, dòng hạn; `text` không chứa thẻ HTML.
- **Integration (Testcontainers PostgreSQL + container Mailpit):** enqueue trong transaction commit → thư tới Mailpit (đọc qua API `GET /api/v1/messages` của Mailpit); transaction rollback → không có thư.

## Ghi chú
- Token nằm trong payload job (bảng `pgboss.job`) tối đa 1 ngày sau khi gửi; DB chỉ `app_owner`/`app_rw`/`app_worker` đọc được. Không đưa payload job vào log.
- Giới hạn gửi thực tế của Gmail cần kiểm lại trước khi lên production (SAD §2.2.4).
