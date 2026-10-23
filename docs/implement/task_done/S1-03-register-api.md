# S1-03 · API đăng ký — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S1-03](../tasks/S1-03-register-api.md) |
| Trạng thái | Xong (code), chưa gọi thử |
| Ngày hoàn thành | 2026-10-24 |
| Commit | `e6e28c3` |

## Kết quả

- **`POST /api/v1/auth/register`** (`public`): `{ email, password, timezone? }` → `201 { user, csrfToken }` + cookie `__Host-ph_sid`.
  - Lỗi: `409 EMAIL_TAKEN` (kèm `errors[]` cho trường email), `422 VALIDATION_FAILED`, `429 RATE_LIMITED`.
- **Use case `registerUser`:**
  - Rate limit 10/giờ/IP.
  - Kiểm múi giờ → `422 INVALID_TIMEZONE`.
  - Băm Argon2id trước transaction.
  - Trong một transaction: tạo user → token `VERIFY_EMAIL` 24 h → job email → phiên.
  - Bắt lỗi `23505` trên `users_email_key` → `409`.
- **Dịch vụ dùng chung cho S1-04 → S1-06:**
  - `PasswordHasher`: Argon2id m=19456, t=2, p=1; `verifyDummy` để đồng đều thời gian.
  - `tokenService`: 256 bit base64url, lưu SHA-256.
  - `createSession`: phiên 30 ngày, CSRF secret 256 bit.
  - `cookies.ts`: `__Host-ph_sid`, HttpOnly, Secure, SameSite=Strict, Path=/, 30 ngày.
  - `schemas.ts`: `zEmail` (trim, chữ thường, ≤ 254), `zNewPassword` (8–128 code point), `zUser`, `toUserDto`.
- **Nối mô-đun:**
  - `modules/identity/index.ts`, `modules/index.ts` (`registerModules`) dùng chung cho `main-api` và script sinh OpenAPI.
  - `main-api` dựng `IdentityDeps` gồm `RateLimiter` và `PasswordHasher`.
  - `buildApp` đăng ký `@fastify/cookie`.
- **Contract:** `openapi.yaml` có `/auth/register`; `api-client` sinh lại.

## Tiêu chí chấp nhận

Đã kiểm: typecheck, lint, depcruise; hash Argon2 ra đúng tiền tố `$argon2id$v=19$m=19456,t=2,p=1$`; `openapi.yaml` có endpoint mới.

**Chưa kiểm** (cần DB và Mailpit): `201` kèm cookie, thư xác minh tới Mailpit; email trùng (khác hoa thường, có khoảng trắng) → `409`; biên mật khẩu 7/8/128/129; múi giờ mặc định, `Europe/Berlin`, `Mars/Base`; token 24 h; rate limit 10/11; rollback toàn bộ khi lỗi; đăng ký song song cùng email.

## Khác với file task

- **Route chưa kiểm `Origin`:** CSRF và `Origin` làm ở S1-04, áp chung cho mọi route ghi.
- **`openapi.yaml` chỉ liệt kê mã `201`:** các mã lỗi (`409`, `422`, `429`) chưa khai báo trong schema phản hồi. Error handler chung trả `problem+json` cho mọi lỗi.
