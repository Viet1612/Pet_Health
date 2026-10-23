# S1-03 · API đăng ký

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S1 · T3–4 |
| Story | US-001 |
| Yêu cầu | FR-AUTH-001, FR-AUTH-002, FR-AUTH-011, SD-001, SD-002, NFR-SEC-001, NFR-SEC-005, G-10 |
| Phụ thuộc | [S1-01](S1-01-identity-schema-rls.md), [S1-02](S1-02-email-worker.md) |
| Ước lượng | 1 |
| Màn hình Figma | SCR-02 · Đăng ký (14:1807) |

## Mục tiêu
`POST /api/v1/auth/register` tạo tài khoản *chưa xác minh*, tạo token xác minh 24 giờ, enqueue email xác minh và mở phiên đăng nhập ngay, tất cả trong một transaction. Người dùng vào thẳng Dashboard sau khi đăng ký.

## Phạm vi
**Trong phạm vi:**
- Use case `RegisterUser`, route, schema Zod, mục trong `openapi.yaml`.
- Hàm băm mật khẩu `PasswordHasher` (Argon2id) dùng chung cho cả mô-đun.
- `SessionService.create()` và hàm đặt cookie dùng chung (nếu [S1-04](S1-04-login-session-api.md) làm trước thì dùng lại bản ở đó).
- Hàm token email `TokenService` (sinh 256 bit, băm SHA-256) dùng chung cho S1-05, S1-06.

**Ngoài phạm vi:**
- Kiểm phiên, CSRF, đăng nhập: [S1-04](S1-04-login-session-api.md).
- Xác minh và gửi lại: [S1-05](S1-05-verify-email-api.md).
- Màn hình SCR-02: [S1-07](S1-07-auth-ui.md).
- Banner nhắc xác minh trên Dashboard: [S5-04](S5-04-dashboard-ui.md).

## Chi tiết kỹ thuật

### Endpoint
`POST /api/v1/auth/register` · `public: true` · không yêu cầu `Idempotency-Key` (chưa có `owner_id`; chống trùng bằng `UNIQUE(email)`) · có kiểm `Origin` ([S1-04](S1-04-login-session-api.md)).

| | Nội dung |
|---|---|
| Input | `{ email: string, password: string, timezone?: string }` |
| `201` | `{ user: User, csrfToken: string }` + `Set-Cookie: __Host-ph_sid=...` |
| `409 EMAIL_TAKEN` | `errors: [{ field: "email", code: "EMAIL_TAKEN", message: "Email đã được sử dụng" }]` |
| `422 VALIDATION_FAILED` | Lỗi từng trường |
| `429 RATE_LIMITED` | Header `Retry-After` (giây) |

`User` (schema dùng chung `modules/identity/adapters/http/schemas.ts`): `{ id, email, emailVerified: boolean, timezone, createdAt }`.

### Kiểm tra đầu vào (Zod)
- `email`: `trim()` → `toLowerCase()` → định dạng email, tối đa 254 ký tự (FR-AUTH-001 chuẩn hóa).
- `password`: 8–128 ký tự, đếm theo code point (`[...pw].length`), không bắt buộc ký tự đặc biệt (SD-001). Không `trim`.
- `timezone`: tùy chọn, mặc định `Asia/Ho_Chi_Minh`; phải hợp lệ theo `IANAZone.isValidZone` (Luxon, qua `platform/calendar`) → nếu sai `422` với `field: "timezone", code: "INVALID_TIMEZONE"`.

Thông điệp lỗi trường tiếng Việt: "Trường bắt buộc", "Email không đúng định dạng", "Mật khẩu cần 8–128 ký tự", "Múi giờ không hợp lệ".

### Băm mật khẩu — `modules/identity/application/password-hasher.ts`
`@node-rs/argon2`: `hash(pw, { algorithm: Algorithm.Argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 })` (19 MiB, t = 2, p = 1). `verify(hash, pw)`. Thêm hằng `DUMMY_HASH` (băm sẵn một chuỗi ngẫu nhiên khi khởi động) cho [S1-04](S1-04-login-session-api.md).

### Token email — `modules/identity/application/token-service.ts`
`generate()` → `{ token: randomBytes(32).toString('base64url'), hash: sha256(token) }`. `hashOf(token)`.

### Phiên — `modules/identity/application/session-service.ts`
`create(tx, userId, now)`: token = `randomBytes(32)` (256 bit), `csrf_secret = randomBytes(32)`, insert `sessions { id: newId(), token_hash: sha256(token), client_type: 'web', csrf_secret, last_seen_at: now, expires_at: now + 30 ngày }`. Trả `{ token, csrfToken: base64url(csrf_secret) }`.
Cookie: `__Host-ph_sid=<base64url token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000` (dùng `@fastify/cookie`).

### Use case `RegisterUser` — `modules/identity/application/register-user.ts`
1. Rate limit: `hit('register:ip:' + clientIp, 10, 3600)` (hàm của [S0-05](S0-05-idempotency-ratelimit.md)); vượt → `429`. IP lấy từ `CF-Connecting-IP` (helper `clientIp(req)` của [S1-04](S1-04-login-session-api.md)).
2. Băm mật khẩu **trước** transaction (Argon2 ~50–100 ms, không giữ transaction).
3. Transaction (`db.transaction()`, chưa có `app.user_id`):
   1. `userId = newId()`; `INSERT users (id, email, password_hash, timezone)`. Lỗi `23505` trên `users_email_key` → `409 EMAIL_TAKEN`.
   2. `TokenService.generate()`; `INSERT auth_tokens { kind: 'VERIFY_EMAIL', expires_at: now + 24h }`.
   3. `enqueueInTx(tx, 'email.transactional', { template: 'VERIFY_EMAIL', to: email, token })`.
   4. `SessionService.create(tx, userId, now)`.
4. Đặt cookie, trả `201 { user, csrfToken }`.

`now` lấy từ `ClockPort`. Không kiểm "email đã tồn tại" bằng SELECT trước; dựa vào UNIQUE để không có race.

### Tệp
- `modules/identity/adapters/http/register-route.ts`
- `modules/identity/application/register-user.ts`
- Cập nhật `openapi.yaml` (sinh lại, commit) và `packages/api-client`.

## Giao diện
Không có (màn hình SCR-02 ở [S1-07](S1-07-auth-ui.md)).

## Tiêu chí chấp nhận
- [ ] **Given** khách chưa có tài khoản, **When** gửi email hợp lệ chưa dùng và mật khẩu ≥ 8 ký tự, **Then** `201`, user có `emailVerified: false`, cookie `__Host-ph_sid` được đặt, và email xác minh tới Mailpit trong 1 phút.
- [ ] **Given** email đã có tài khoản (kể cả khác hoa thường, có khoảng trắng đầu/cuối), **When** đăng ký lại, **Then** `409 EMAIL_TAKEN` với thông điệp "Email đã được sử dụng"; số dòng `users` không đổi; không có job email mới.
- [ ] Mật khẩu 7 ký tự hoặc 129 ký tự → `422`; 8 và 128 ký tự → `201`.
- [ ] Email sai định dạng → `422` với `field: "email"`.
- [ ] Không gửi `timezone` → user có `Asia/Ho_Chi_Minh`; gửi `Europe/Berlin` → lưu đúng; gửi `Mars/Base` → `422 INVALID_TIMEZONE`.
- [ ] `password_hash` bắt đầu bằng `$argon2id$v=19$m=19456,t=2,p=1$`.
- [ ] `auth_tokens` có đúng 1 dòng `VERIFY_EMAIL`, `expires_at = created + 24h`, `token_hash` là SHA-256 của token trong liên kết email.
- [ ] Request thứ 11 trong 1 giờ từ cùng IP → `429` có `Retry-After`.
- [ ] Lỗi ở bất kỳ bước nào trong transaction → không có user, token, phiên hay job nào được tạo.
- [ ] Log request không chứa `password` hay `email`.
- [ ] `openapi.yaml` có endpoint với đủ mã lỗi; CI contract diff xanh.

## Kiểm thử
- **Unit:** `RegisterUser` với repository/queue giả và `FakeClock`: thứ tự bước, xử lý `23505`, mặc định timezone, rate limit vượt.
- **Integration (Testcontainers):** gọi qua `app.inject()`:
  - Ca thành công: kiểm DB (user, token, session, job `pgboss.job`), cookie đủ thuộc tính `HttpOnly; Secure; SameSite=Strict; Path=/`, không có `Domain`.
  - Biên mật khẩu 7/8/128/129; email `"  Viet@Example.COM "` lưu thành `viet@example.com`.
  - 2 request đăng ký cùng email chạy song song → đúng 1 cái `201`, cái còn lại `409`.
  - Rate limit 10/11 với header `CF-Connecting-IP` cố định; IP khác không bị ảnh hưởng.
- **Integration email:** worker chạy cùng Mailpit, thư tới trong < 60 s.

## Ghi chú
- `409 EMAIL_TAKEN` tiết lộ email đã có tài khoản; đây là yêu cầu của AC US-001, đã chấp nhận. Rate limit 10/giờ/IP + rule Cloudflare giảm dò quét.
- Client không tự gửi lại request đăng ký khi timeout (lần gửi lại có thể nhận `409` dù lần đầu đã thành công); xem [S1-07](S1-07-auth-ui.md).
