# S1-04 · API đăng nhập, đăng xuất, phiên, CSRF, khóa tạm — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S1-04](../tasks/S1-04-login-session-api.md) |
| Trạng thái | Xong (code), chưa gọi thử |
| Ngày hoàn thành | 2026-10-24 |
| Commit | `cc36008` |

## Kết quả

- **`POST /api/v1/auth/login`** (`public`) → `200 { user, csrfToken }` + cookie.
  - Lỗi `401 INVALID_CREDENTIALS` dùng chung một thông điệp "Email hoặc mật khẩu không đúng".
  - Lỗi `423 ACCOUNT_LOCKED` kèm `retryAfter` và header `Retry-After`.
- **`POST /api/v1/auth/logout`** (phiên + CSRF) → xóa dòng `sessions`, xóa cookie, `204`.
- **`GET /api/v1/auth/session`** (phiên) → `{ user, csrfToken, userIdHash }`, trong đó `userIdHash` = HMAC-SHA256(`ANALYTICS_HMAC_KEY`, userId).
- **Use case `login`:**
  - Mọi nhánh đều chạy Argon2: không có user hoặc đang khóa thì chạy `verifyDummy`, nên thời gian phản hồi như nhau.
  - Đang khóa → luôn trả `423`, kể cả khi mật khẩu đúng.
  - Mật khẩu > 128 ký tự xử lý như sai mật khẩu.
  - Đăng nhập sai → `SELECT … FOR UPDATE` dòng user, tính lại trạng thái đếm bằng hàm thuần `nextFailedState` (5 lần trong 15 phút → khóa 15 phút).
  - Đăng nhập đúng → đếm về 0, tạo phiên.
- **`CookieSessionResolver`:** đọc `__Host-ph_sid` và tìm phiên còn hạn (JOIN users).
  - Phiên không hợp lệ → xóa cookie.
  - Từ 5 phút kể từ lần ghi trước → gia hạn trượt 30 ngày và đặt lại cookie; dưới 5 phút không ghi DB.
- **CSRF (`platform/http/csrf.ts`)**, áp cho `POST/PUT/PATCH/DELETE`:
  - `Origin` phải bằng `APP_ORIGIN`, kể cả route `public`.
  - Route có phiên: `X-CSRF-Token` phải khớp, so sánh `timingSafeEqual`.
  - Sai → `403 CSRF_INVALID`.
- **`SessionResolverPort`** nhận thêm `reply`; `AuthContext` có `csrfSecret`.
- **`buildApp`:** thêm cờ `csrf` (mặc định bật; `testDeps` của S0 tắt vì các test đó không liên quan CSRF). `main-api` dùng `CookieSessionResolver`.
- **Test:** `login-state.test.ts` 4 ca cho `nextFailedState`.

## Tiêu chí chấp nhận

Đã kiểm: typecheck, lint; 4 ca đếm sai và khóa (lần 1 mở cửa sổ, lần 4 chưa khóa, lần 5 khóa 15 phút, quá 15 phút mở cửa sổ mới). 100 unit test hiện có vẫn qua.

**Chưa kiểm** (cần DB): luồng đăng nhập → session → logout → `401`; body `401` giống nhau cho sai email và sai mật khẩu; chênh lệch thời gian < 20%; lần thứ 6 → `423`; mở khóa sau 15 phút; gia hạn trượt; CSRF thiếu/sai → `403`; `Origin` lạ → `403`.

## Khác với file task

- **Thông tin phiên gắn vào `request.auth`** (`userId`, `sessionId`, `csrfSecret`) thay vì `req.ctx`. `GET /auth/session` đọc lại user bằng một truy vấn theo id.
- **Kiểm phiên chạy ở hook `preHandler`** (sau khi parse body), không ở `onRequest`, theo khung deny-by-default đã có từ S0-04.
- **`clientIp` dùng `request.ip`:** đã có từ S0-05, tương đương `socket.remoteAddress` vì `trustProxy: false`.
