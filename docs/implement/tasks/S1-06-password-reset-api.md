# S1-06 · API quên và đặt lại mật khẩu

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S1 · T3–4 |
| Story | US-004 |
| Yêu cầu | FR-AUTH-008, FR-AUTH-009, SD-001, SD-002, NFR-SEC-005 |
| Phụ thuộc | [S1-02](S1-02-email-worker.md), [S1-04](S1-04-login-session-api.md) |
| Ước lượng | 1 |
| Màn hình Figma | SCR-03 · Quên mật khẩu (14:1854), SCR-04 · Đặt lại mật khẩu (14:1883) |

## Mục tiêu
Người dùng quên mật khẩu nhận liên kết dùng một lần hiệu lực 60 phút; phản hồi giống hệt nhau dù email có tài khoản hay không. Đặt lại thành công thì mọi phiên của tài khoản bị hủy.

## Phạm vi
**Trong phạm vi:** `POST /auth/password/forgot`, `POST /auth/password/reset`, use case tương ứng, `openapi.yaml`.

**Ngoài phạm vi:**
- Màn hình SCR-03, SCR-04: [S1-07](S1-07-auth-ui.md).
- Đổi mật khẩu khi đã đăng nhập (`POST /me/password`): [S6-01](S6-01-settings-api.md).

## Chi tiết kỹ thuật

### Endpoint

| Method + Path | Bảo vệ | Input | Thành công | Lỗi |
|---|---|---|---|---|
| `POST /api/v1/auth/password/forgot` | `public`, kiểm `Origin` | `{ email }` | `202` (body rỗng, luôn giống nhau) | `422` (email sai định dạng), `429 RATE_LIMITED` |
| `POST /api/v1/auth/password/reset` | `public`, kiểm `Origin` | `{ token, newPassword }` | `204` | `400 TOKEN_INVALID`, `410 TOKEN_EXPIRED`, `410 TOKEN_USED`, `422` |

- `email`: trim + lowercase + định dạng email (như đăng ký).
- `newPassword`: 8–128 ký tự theo code point (SD-001), thông điệp "Mật khẩu cần 8–128 ký tự".
- Mã và thông điệp lỗi token dùng chung với [S1-05](S1-05-verify-email-api.md).

### Use case `RequestPasswordReset` — `modules/identity/application/request-password-reset.ts`
1. Rate limit `hit('forgot:email:' + sha256hex(email), 5, 3600)`; vượt → `429` + `Retry-After`. Bucket theo hash nên không lưu email rõ trong `rate_limits`. Đếm cả khi email không có tài khoản.
2. `user = findByEmail(email)`. Không có → trả `202` ngay.
3. Có: transaction `replaceActive(userId, 'RESET_PASSWORD', { expires_at: now + 60 phút })` (xóa token đặt lại cũ chưa dùng, tạo token mới) + `enqueueInTx(tx, 'email.transactional', { template: 'RESET_PASSWORD', to: user.email, token })`.
4. `202`.

Tài khoản chưa xác minh email vẫn được đặt lại mật khẩu.

### Use case `ResetPassword` — `modules/identity/application/reset-password.ts`
1. Kiểm token như [S1-05](S1-05-verify-email-api.md) nhưng với `kind = 'RESET_PASSWORD'`: không có / sai kind → `400 TOKEN_INVALID`; `used_at` có → `410 TOKEN_USED`; `expires_at ≤ now` → `410 TOKEN_EXPIRED`.
2. Băm `newPassword` bằng `PasswordHasher` (Argon2id) **trước** transaction.
3. Transaction:
   1. `consume(token.id, now)`; không trả dòng → `410 TOKEN_USED`.
   2. `UPDATE users SET password_hash = $hash, failed_login_count = 0, failed_login_window_start = NULL, locked_until = NULL, email_verified_at = COALESCE(email_verified_at, $now)`. Mở được liên kết trong email tức là đã chứng minh sở hữu email.
   3. `deleteAllForUser(userId)`: xóa **mọi** phiên (FR-AUTH-009).
4. Trả `204`, kèm Set-Cookie xóa `__Host-ph_sid` (`Max-Age=0`) phòng khi trình duyệt đang giữ phiên của chính tài khoản này. Không tự đăng nhập: người dùng đăng nhập lại bằng mật khẩu mới.

### Tệp
`modules/identity/adapters/http/password-reset-routes.ts`, `modules/identity/application/{request-password-reset,reset-password}.ts`. Sinh lại `openapi.yaml`, `api-client`.

## Giao diện
Không có (SCR-03, SCR-04 ở [S1-07](S1-07-auth-ui.md)).

## Tiêu chí chấp nhận
- [ ] `forgot` với email có tài khoản và email không có tài khoản trả cùng `202`, cùng header (trừ `Date`, request id) và body rỗng.
- [ ] Email có tài khoản → thư "Đặt lại mật khẩu Pet Health" tới Mailpit trong 1 phút, liên kết `/reset-password#token=...`; email không có tài khoản → không có job.
- [ ] Lần `forgot` thứ 6 trong 1 giờ cho cùng email (kể cả khác hoa thường) → `429`; email khác không bị ảnh hưởng.
- [ ] Gửi `forgot` 2 lần → liên kết thứ nhất trả `400 TOKEN_INVALID`, liên kết thứ hai dùng được.
- [ ] `reset` với token hợp lệ và mật khẩu 8 ký tự → `204`; đăng nhập bằng mật khẩu mới thành công, mật khẩu cũ trả `401`.
- [ ] Liên kết dùng một lần: `reset` lần 2 cùng token → `410 TOKEN_USED`.
- [ ] Liên kết quá 60 phút (`FakeClock` +60 phút) → `410 TOKEN_EXPIRED`; 59 phút 59 giây vẫn hợp lệ.
- [ ] Đặt lại thành công thì mọi phiên của tài khoản bị hủy: 2 phiên đang mở trên 2 "thiết bị" đều nhận `401` ở `GET /auth/session`.
- [ ] Tài khoản đang bị khóa tạm được mở khóa sau khi đặt lại.
- [ ] `newPassword` 7 hoặc 129 ký tự → `422`, token chưa bị tiêu.
- [ ] Không có `email`, `token`, `newPassword` trong log.

## Kiểm thử
- **Unit:** `ResetPassword` với `FakeClock`: biên 60 phút, sai kind (token `VERIFY_EMAIL`), mật khẩu không hợp lệ không tiêu token. `RequestPasswordReset`: email không tồn tại không gọi queue.
- **Integration (Testcontainers):**
  - So sánh toàn bộ phản hồi `forgot` của email có/không có tài khoản.
  - Luồng đầy đủ: đăng ký → đăng nhập 2 phiên → forgot → lấy token → reset → cả 2 phiên `401` → đăng nhập bằng mật khẩu mới.
  - Rate limit 5/6; reset song song cùng token → 1 cái `204`, 1 cái `410`.

## Ghi chú
- Nhánh "có tài khoản" chạy thêm một transaction nên chậm hơn vài ms. Chấp nhận được: rate limit 5/giờ/email và rule Cloudflare làm việc dò bằng thời gian không thực tế. Nếu muốn đồng đều tuyệt đối, chuyển bước 2–3 vào một job.
