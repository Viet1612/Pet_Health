# S1-06 · API quên và đặt lại mật khẩu — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S1-06](../tasks/S1-06-password-reset-api.md) |
| Trạng thái | Xong (code), chưa gọi thử |
| Ngày hoàn thành | 2026-10-24 |
| Commit | xem [README](README.md) (chung commit với S1-05) |

## Kết quả

- **`POST /api/v1/auth/password/forgot`** (`public`): `{ email }` → luôn `202` giống nhau.
  - Rate limit 5/giờ theo hash email, đếm cả khi email không có tài khoản.
  - Có tài khoản → thay token `RESET_PASSWORD` cũ bằng token mới 60 phút và enqueue email trong cùng transaction.
- **`POST /api/v1/auth/password/reset`** (`public`): `{ token, newPassword }` → `204` kèm xóa cookie phiên.
  - Kiểm token bằng `findUsableToken` của S1-05 (`TOKEN_INVALID` / `TOKEN_USED` / `TOKEN_EXPIRED`).
  - Băm mật khẩu mới trước transaction.
  - Trong transaction: tiêu token → đặt mật khẩu, mở khóa đăng nhập, xác nhận email → xóa **mọi** phiên của tài khoản. Không tự đăng nhập.
  - `newPassword` 8–128 ký tự; sai thì `422`, token chưa bị tiêu vì Zod kiểm trước khi vào use case.

## Tiêu chí chấp nhận

Đã kiểm: typecheck, lint, depcruise; `openapi.yaml` có 2 endpoint mới.

**Chưa kiểm** (cần DB và Mailpit): phản hồi `forgot` giống nhau cho email có/không có tài khoản; thư tới Mailpit; lần `forgot` thứ 6 → `429`; liên kết cũ thành `TOKEN_INVALID` sau khi gửi lại; đặt lại → đăng nhập bằng mật khẩu mới, mật khẩu cũ `401`; dùng lại token → `TOKEN_USED`; biên 60 phút; 2 phiên đều nhận `401` sau khi đặt lại; tài khoản đang khóa được mở khóa.

## Khác với file task

- **`forgot` trả `202` có body `null`** (giống S1-05).
