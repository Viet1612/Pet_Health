# S1-05 · API xác minh email và gửi lại — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S1-05](../tasks/S1-05-verify-email-api.md) |
| Trạng thái | Xong (code), chưa gọi thử |
| Ngày hoàn thành | 2026-10-24 |
| Commit | `e5010da` |

## Kết quả

- **`POST /api/v1/auth/verify-email`** (`public`, kiểm `Origin`): `{ token }` → `200 { user }` với `emailVerified: true`.
  - `400 TOKEN_INVALID`: sai dạng, không có, hoặc sai loại.
  - `410 TOKEN_USED`: token đã dùng.
  - `410 TOKEN_EXPIRED`: token hết hạn.
- **`POST /api/v1/auth/verify-email/resend`** (phiên + CSRF) → `202`.
  - Rate limit 5/giờ/user; đã xác minh thì không làm gì.
  - Ngược lại thay token cũ bằng token mới 24 h (liên kết cũ thành `TOKEN_INVALID`) và enqueue email trong cùng transaction.
- **`application/email-token.ts`** (dùng chung với S1-06):
  - `findUsableToken`: thứ tự kiểm sai dạng/không có/sai loại → đã dùng → hết hạn, nên token vừa đã dùng vừa hết hạn báo "đã được sử dụng".
  - `consumeToken`: `UPDATE … WHERE used_at IS NULL`; request song song dùng trước → `410 TOKEN_USED`.
- **Xác minh** đặt `email_verified_at = COALESCE(email_verified_at, now)`, không tạo phiên.

## Tiêu chí chấp nhận

Đã kiểm: typecheck, lint, depcruise; `openapi.yaml` có 2 endpoint mới.

**Chưa kiểm** (cần DB): biên 24 h − 1 s / 24 h + 1 s; dùng lại lần 2 → `TOKEN_USED`; token ngẫu nhiên / rỗng / loại `RESET_PASSWORD` → `TOKEN_INVALID`; verify song song; resend làm vô hiệu liên kết cũ; lần resend thứ 6 → `429`; resend không phiên → `401`, thiếu CSRF → `403`.

## Khác với file task

- **Phản hồi `202` có body `null`** thay vì body rỗng: schema phản hồi Zod `z.null()` buộc gửi giá trị.
