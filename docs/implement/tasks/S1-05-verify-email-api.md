# S1-05 · API xác minh email và gửi lại

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S1 · T3–4 |
| Story | US-002 |
| Yêu cầu | FR-AUTH-002, FR-AUTH-003, FR-AUTH-004, SD-002, NFR-SEC-005 |
| Phụ thuộc | [S1-03](S1-03-register-api.md) |
| Ước lượng | 0,5 |
| Màn hình Figma | SCR-05 · Xác minh email (14:1906), liên kết hết hạn (23:2902) |

## Mục tiêu
Liên kết trong email xác minh chuyển tài khoản sang *đã xác minh*; liên kết hết hạn, đã dùng hoặc sai trả mã lỗi riêng để SPA hiển thị đúng trạng thái; người dùng đã đăng nhập gửi lại được email xác minh tối đa 5 lần/giờ.

## Phạm vi
**Trong phạm vi:** `POST /auth/verify-email`, `POST /auth/verify-email/resend`, use case tương ứng, `openapi.yaml`.

**Ngoài phạm vi:**
- Màn hình SCR-05: [S1-07](S1-07-auth-ui.md).
- Banner "Xác minh email để có thể lấy lại mật khẩu khi quên" trên Dashboard (dùng `account.emailVerified` của `GET /dashboard`): [S5-03](S5-03-dashboard-api.md), [S5-04](S5-04-dashboard-ui.md).
- Xác minh email mới khi đổi email (`CHANGE_EMAIL`): [S6-01](S6-01-settings-api.md).

## Chi tiết kỹ thuật

### Endpoint

| Method + Path | Bảo vệ | Input | Thành công | Lỗi |
|---|---|---|---|---|
| `POST /api/v1/auth/verify-email` | `public`, kiểm `Origin` | `{ token: string }` (base64url, 43 ký tự) | `200 { user }` | `400 TOKEN_INVALID`, `410 TOKEN_EXPIRED`, `410 TOKEN_USED` |
| `POST /api/v1/auth/verify-email/resend` | phiên + CSRF | — | `202` (body rỗng) | `401`, `429 RATE_LIMITED` |

Thông điệp (`title`): `TOKEN_INVALID` "Liên kết không hợp lệ", `TOKEN_EXPIRED` "Liên kết đã hết hạn", `TOKEN_USED` "Liên kết đã được sử dụng".

### Use case `VerifyEmail` — `modules/identity/application/verify-email.ts`
Không cần phiên: liên kết có thể mở trên thiết bị chưa đăng nhập.
1. Token không đúng dạng base64url 43 ký tự → `400 TOKEN_INVALID` (Zod).
2. `row = findByHash(sha256(token))`; không có hoặc `kind ≠ 'VERIFY_EMAIL'` → `400 TOKEN_INVALID`.
3. `row.used_at IS NOT NULL` → `410 TOKEN_USED`.
4. `row.expires_at ≤ now` → `410 TOKEN_EXPIRED`.
5. Transaction: `consume(row.id, now)` (`UPDATE ... WHERE used_at IS NULL RETURNING`); không trả dòng (bị dùng song song) → `410 TOKEN_USED`. `UPDATE users SET email_verified_at = COALESCE(email_verified_at, now) WHERE id = row.user_id`.
6. Trả `200 { user }` với `emailVerified: true`.

Thứ tự 3 trước 4: token vừa đã dùng vừa hết hạn thì báo "đã được sử dụng".

### Use case `ResendVerification` — `modules/identity/application/resend-verification.ts`
1. Rate limit `hit('verify-resend:user:' + userId, 5, 3600)`; vượt → `429` + `Retry-After`.
2. User đã xác minh → `202`, không làm gì (giao diện không phân biệt).
3. Transaction: `replaceActive(userId, 'VERIFY_EMAIL', { expires_at: now + 24h, ... })` = `DELETE` token `VERIFY_EMAIL` chưa dùng của user + `INSERT` token mới; `enqueueInTx(tx, 'email.transactional', { template: 'VERIFY_EMAIL', to: user.email, token })`.
4. `202`.

Token cũ bị xóa nên liên kết cũ sau đó trả `400 TOKEN_INVALID` (FR-AUTH-003 "gửi lại thì vô hiệu hóa liên kết cũ"). Rate limit đếm cả khi user đã xác minh.

### Tệp
`modules/identity/adapters/http/verify-email-routes.ts`, `modules/identity/application/{verify-email,resend-verification}.ts`. Sinh lại `openapi.yaml`, `api-client`.

## Giao diện
Không có (SCR-05 ở [S1-07](S1-07-auth-ui.md)).

## Tiêu chí chấp nhận
- [ ] **Given** tài khoản chưa xác minh, **When** gửi token trong vòng 24 giờ, **Then** `200`, `user.emailVerified = true`, `users.email_verified_at` được đặt, `auth_tokens.used_at` được đặt.
- [ ] **Given** token đã quá 24 giờ (`FakeClock` +24 h +1 s), **When** gửi token, **Then** `410 TOKEN_EXPIRED`; tài khoản vẫn chưa xác minh.
- [ ] Token đúng 24 giờ trừ 1 giây vẫn hợp lệ.
- [ ] Gửi lại cùng token lần 2 → `410 TOKEN_USED`.
- [ ] Token ngẫu nhiên, token rỗng, token `RESET_PASSWORD` → `400 TOKEN_INVALID`.
- [ ] Hai request cùng token chạy song song → đúng 1 cái `200`, cái kia `410 TOKEN_USED`.
- [ ] `resend` khi đã đăng nhập → `202`, thư mới tới Mailpit; liên kết cũ trả `400 TOKEN_INVALID`, liên kết mới hợp lệ.
- [ ] Lần `resend` thứ 6 trong 1 giờ → `429` có `Retry-After`.
- [ ] `resend` không có phiên → `401`; thiếu `X-CSRF-Token` → `403`.
- [ ] `resend` khi đã xác minh → `202`, không có job email.
- [ ] Token không xuất hiện trong log (body request không được log; `*.token` bị redact).

## Kiểm thử
- **Unit:** `VerifyEmail` với `FakeClock`: biên hết hạn 24 h − 1 s / 24 h / 24 h + 1 s; thứ tự TOKEN_USED trước TOKEN_EXPIRED; sai `kind`.
- **Integration (Testcontainers):** đăng ký → lấy token từ job (hoặc từ Mailpit) → verify → verify lần 2; resend 5 lần `202`, lần 6 `429`; resend làm vô hiệu token cũ; verify song song.

## Ghi chú
- Không tạo phiên khi xác minh: SPA tự quyết định đi Dashboard (đã có phiên) hay trang đăng nhập.
- Bảng `auth_tokens` giữ token đã dùng tới khi job dọn dẹp xóa (hết hạn + 7 ngày, [S6-06](S6-06-maintenance-job.md)), nên phân biệt được TOKEN_USED với TOKEN_INVALID trong khoảng đó.
