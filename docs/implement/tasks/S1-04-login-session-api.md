# S1-04 · API đăng nhập, đăng xuất, phiên, CSRF, khóa tạm

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S1 · T3–4 |
| Story | US-003 |
| Yêu cầu | FR-AUTH-005, 006, 007, 012, 014, SD-003, NFR-SEC-001, NFR-SEC-002, NFR-SEC-005, AD-010, G-10 |
| Phụ thuộc | [S1-01](S1-01-identity-schema-rls.md) |
| Ước lượng | 1,5 |
| Màn hình Figma | SCR-01 · Đăng nhập (14:1772), sai mật khẩu (23:2828), tạm khóa (23:2868) |

## Mục tiêu
Đăng nhập bằng email + mật khẩu tạo phiên opaque lưu ở server; đăng xuất hủy phiên ngay; `GET /auth/session` cho SPA biết đã đăng nhập chưa và lấy CSRF token. Middleware `requireSession` và kiểm CSRF chạy cho mọi route không khai báo `public: true` (deny by default).

## Phạm vi
**Trong phạm vi:**
- `POST /auth/login`, `POST /auth/logout`, `GET /auth/session`.
- Plugin `requireSession` (đọc cookie, gia hạn trượt), plugin CSRF (`Origin` + synchronizer token), helper `clientIp`.
- Khóa tạm sau 5 lần sai trong 15 phút.

**Ngoài phạm vi:**
- Tạo phiên khi đăng ký: [S1-03](S1-03-register-api.md) (dùng chung `SessionService`).
- Hủy mọi phiên khi đặt lại mật khẩu: [S1-06](S1-06-password-reset-api.md); khi đổi mật khẩu: [S6-01](S6-01-settings-api.md).
- Màn hình, route guard phía web: [S1-07](S1-07-auth-ui.md).
- Token bearer cho app Giai đoạn 2 (`POST /auth/token`): không làm.

## Chi tiết kỹ thuật

### Endpoint

| Method + Path | Bảo vệ | Input | Thành công | Lỗi |
|---|---|---|---|---|
| `POST /api/v1/auth/login` | `public`, kiểm `Origin` | `{ email, password }` | `200 { user, csrfToken }` + Set-Cookie | `401 INVALID_CREDENTIALS`, `423 ACCOUNT_LOCKED` + `retryAfter`, `422`, `429` |
| `POST /api/v1/auth/logout` | phiên + CSRF | — | `204` + cookie xóa | `401 UNAUTHENTICATED`, `403 CSRF_INVALID` |
| `GET /api/v1/auth/session` | phiên | — | `200 { user, csrfToken, userIdHash }` | `401 UNAUTHENTICATED` |

- `401 INVALID_CREDENTIALS`: `title` = "Email hoặc mật khẩu không đúng", không có `errors[]` theo trường (một thông điệp chung cho mọi nguyên nhân, FR-AUTH-005).
- `423 ACCOUNT_LOCKED`: thêm trường `retryAfter` (số giây, làm tròn lên) trong body và header `Retry-After`.
- Body login: `email` trim + lowercase, `password` 1–128 ký tự (không áp tối thiểu 8 để không lộ quy tắc; quá 128 → `401` như sai mật khẩu, tránh băm chuỗi rất dài).
- `userIdHash` = `HMAC-SHA256(ANALYTICS_HMAC_KEY, userId)` hex (dùng cho analytics [S6-05](S6-05-analytics.md)). Thêm `ANALYTICS_HMAC_KEY` vào `.env.example`.

### Use case `Login` — `modules/identity/application/login.ts`
1. `user = findByEmail(email)`.
2. Không có user → `argon2.verify(DUMMY_HASH, password)` rồi trả `401` (thời gian như có user).
3. `locked_until > now` → vẫn chạy `verify` (đồng đều thời gian), **luôn** trả `423` dù mật khẩu đúng, `retryAfter = ceil((locked_until − now)/1000)`.
4. `ok = verify(user.password_hash, password)`.
5. Sai: transaction, `SELECT ... FOR UPDATE` dòng user, rồi:
   - `failed_login_window_start IS NULL` hoặc `now − window_start ≥ 15 phút` → `window_start = now`, `count = 1`;
   - ngược lại `count = count + 1`;
   - `count ≥ 5` → `locked_until = now + 15 phút`, `count = 0`, `window_start = NULL`.
   Trả `401` (kể cả lần thứ 5; lần thứ 6 mới gặp `423`, đúng AC).
6. Đúng: `count = 0`, `window_start = NULL`, `locked_until = NULL`; `SessionService.create()`; đặt cookie; `200`.

Thời điểm lấy từ `ClockPort` để test được bằng `FakeClock`.

### `requireSession` — `apps/api/src/platform/http/require-session.ts`
Hook `onRequest` đăng ký toàn cục; bỏ qua route có `config.public === true`.
1. Đọc cookie `__Host-ph_sid`; thiếu → `401 UNAUTHENTICATED`.
2. `findValidByTokenHash(sha256(token), now)`: `sessions JOIN users WHERE token_hash = $1 AND expires_at > $now`. Không có → `401`, gửi kèm cookie xóa (`Max-Age=0`).
3. `now − last_seen_at ≥ 5 phút` → `UPDATE sessions SET last_seen_at = now, expires_at = now + 30 ngày` và gửi lại Set-Cookie `Max-Age=2592000` (gia hạn trượt, SD-003). Dưới 5 phút thì không ghi DB.
4. Gắn `req.ctx = { userId, sessionId, csrfSecret, user }`.

Thứ tự hook: `requireSession` → CSRF → handler. Route gọi DB nghiệp vụ qua `req.withTx()` ([S1-01](S1-01-identity-schema-rls.md)).

### CSRF — `apps/api/src/platform/http/csrf.ts`
Áp cho method `POST`, `PUT`, `PATCH`, `DELETE`:
- Header `Origin` phải bằng `APP_ORIGIN`; thiếu hoặc khác → `403 CSRF_INVALID`. Áp cả cho route `public` (login, register, forgot, reset, verify).
- Route có phiên: `X-CSRF-Token` phải bằng `base64url(csrf_secret)` của phiên, so bằng `crypto.timingSafeEqual`; sai → `403 CSRF_INVALID`.
- `csrfToken` trả về trong body của register/login/session; SPA giữ trong bộ nhớ.

### IP client — `apps/api/src/platform/http/client-ip.ts`
`clientIp(req)` = header `CF-Connecting-IP` khi `TRUST_CF_CONNECTING_IP=true` (staging/prod); ngược lại `req.socket.remoteAddress`. Chỉ ghi `userIdHash` và không ghi IP vào log.

### Logout
`DELETE FROM sessions WHERE id = ctx.sessionId`; Set-Cookie `__Host-ph_sid=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict`; `204`. Request kế tiếp bằng cookie cũ → `401`.

### Tệp
`modules/identity/adapters/http/{login-route,logout-route,session-route}.ts`, `modules/identity/application/{login,logout,get-session}.ts`, plugin ở `platform/http/`. Sinh lại `openapi.yaml`.

## Giao diện
Không có (SCR-01 ở [S1-07](S1-07-auth-ui.md)).

## Tiêu chí chấp nhận
- [ ] **Given** tài khoản đã tồn tại, **When** gửi đúng email và mật khẩu, **Then** `200 { user, csrfToken }` và cookie `__Host-ph_sid; HttpOnly; Secure; SameSite=Strict; Path=/`.
- [ ] **Given** sai email hoặc sai mật khẩu, **When** đăng nhập, **Then** cùng `401 INVALID_CREDENTIALS` "Email hoặc mật khẩu không đúng", body giống hệt nhau (trừ `ref`).
- [ ] Thời gian phản hồi trung vị của "email không tồn tại" và "sai mật khẩu" chênh nhau < 20% (đo 20 lần mỗi loại).
- [ ] **Given** 5 lần sai liên tiếp trong 15 phút, **When** thử lần thứ 6 (kể cả mật khẩu đúng), **Then** `423 ACCOUNT_LOCKED` với `retryAfter` ≤ 900.
- [ ] Sau 15 phút khóa (`FakeClock` +15 phút), đăng nhập đúng thành công; bộ đếm về 0.
- [ ] 4 lần sai, 1 lần đúng, 4 lần sai nữa → chưa khóa (đếm "liên tiếp").
- [ ] 4 lần sai, đợi 15 phút, 1 lần sai → chưa khóa (cửa sổ mới).
- [ ] **Given** đã đăng nhập, **When** `POST /auth/logout`, **Then** `204`, dòng `sessions` bị xóa, `GET /auth/session` với cookie cũ trả `401`.
- [ ] `GET /auth/session` không có cookie hoặc cookie sai → `401`; phiên quá 30 ngày không hoạt động → `401`.
- [ ] Request sau 5 phút cập nhật `last_seen_at` và đẩy `expires_at` thêm 30 ngày; request trong 5 phút không ghi DB.
- [ ] `POST` thiếu hoặc sai `X-CSRF-Token` trên route có phiên → `403 CSRF_INVALID`; `Origin` lạ → `403` kể cả route `public`.
- [ ] Mọi route không khai báo `public: true` trả `401` khi không có phiên (kiểm toàn bộ bảng route trong [S1-08](S1-08-idor-suite.md)).
- [ ] DB chỉ chứa `SHA-256` của token phiên; log không chứa cookie hay mật khẩu.

## Kiểm thử
- **Unit:** `Login` với `FakeClock` và repository giả: bảng các ca đếm sai (1→5, reset khi đúng, cửa sổ hết hạn, đang khóa + mật khẩu đúng → 423, `retryAfter` làm tròn lên). `requireSession`: ngưỡng 4 phút 59 giây (không ghi) / 5 phút (ghi).
- **Integration (Testcontainers, `app.inject()`):** luồng đăng nhập → session → logout → session 401; khóa tạm qua HTTP; CSRF thiếu/sai/đúng; `Origin` sai; hai phiên trên 2 "thiết bị" độc lập (logout một cái không ảnh hưởng cái kia).
- **Timing:** test đo `durationMs` hai nhánh như tiêu chí trên (đánh dấu `slow`, chạy trong CI integration).

## Ghi chú
- Cookie `__Host-` bắt buộc `Secure`. Chrome và Firefox chấp nhận `Secure` trên `http://localhost`; Safari thì không, nên kiểm Safari trên staging.
- SRS NFR-SEC-002 ghi `SameSite=Lax`; SAD §4.1.1 chọn `Strict` (chặt hơn, dùng được vì cùng origin). Làm theo SAD.
- Email không tồn tại không bao giờ bị khóa, nên kẻ dò có thể phân biệt sau 6 lần thử. Đây là hệ quả chấp nhận được của FR-AUTH-006; rule rate limit Cloudflare 30 request/phút/IP cho `/api/v1/auth/*` ([S7-02](S7-02-cloudflare-email.md)) làm việc dò chậm lại.
