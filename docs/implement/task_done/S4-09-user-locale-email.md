# S4-09 · Ngôn ngữ theo tài khoản và email 2 ngôn ngữ — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S4-09](../tasks/S4-09-user-locale-email.md) |
| Trạng thái | Xong, đã gọi thử trên server dev (email trong Mailpit) |
| Ngày hoàn thành | 2026-10-25 |
| Commit | xem [README](README.md) |

## Kết quả

**API**
- Migration `202610251100_user_locale`: `users.locale text NOT NULL DEFAULT 'vi' CHECK (locale IN ('vi','en'))`. Đã chạy trên DB dev; DB E2E tự migrate.
- `PATCH /api/v1/me/locale { locale }` → `200 { locale }`. Cần phiên + CSRF (`me-routes.ts`).
- `user.locale` có trong phản hồi của register, login, `GET /auth/session`. `POST /auth/register` nhận `locale?` (mặc định `vi`).
- Job `email.transactional` mang `locale` lấy từ `users.locale` lúc tạo job (đăng ký, gửi lại xác minh, quên mật khẩu). Job cũ không có `locale` → `vi`.
- IDOR: `__idor__/me.idor.ts` đăng ký body hợp lệ cho deny-by-default.

**Email** (`packages/email-templates`)
- `messages.ts`: từ điển `vi` / `en` (layout, verifyEmail, resetPassword); thiếu key là lỗi typecheck.
- `Layout`, `VerifyEmail`, `ResetPassword` nhận `locale`; `<html lang>` theo ngôn ngữ.
- `renderEmail(template, link, locale = 'vi')`.
- `tsconfig.build.json` bỏ qua `*.test.ts`.

**Web**
- `SessionUser.locale`.
- `adoptAccountLocale` (tài khoản thắng thiết bị): sau `GET /auth/session`, login, register, nếu `user.locale` khác ngôn ngữ đang dùng thì ghi `localStorage` rồi tải lại. Chỉ tải lại khi ghi được, tránh lặp vô hạn khi storage bị chặn.
- Đăng ký gửi `locale` đang dùng.
- Cài đặt → Ngôn ngữ: `useChangeLocale` gọi `PATCH /me/locale` rồi `setLocale` (tải lại + toast). Lỗi thì toast + "Thử lại", giữ ngôn ngữ cũ.

## Tiêu chí chấp nhận

**Đã kiểm trên server dev:**
- Đăng ký với `locale: en` → Mailpit nhận "Verify your Pet Health email".
- `PATCH /me/locale { vi }` → 200, gửi lại xác minh → "Xác minh email Pet Health".
- `{ locale: 'fr' }` → 422; không có phiên → 401.

**Test:** unit 177 (gồm 3 ca render email 2 ngôn ngữ), IDOR 80/80, E2E 17/17, typecheck, lint, depcruise, build, size-limit (129,7 KB).

**Chưa kiểm** (cần bấm thử): đổi English trên máy A rồi đăng nhập máy B; email đặt lại mật khẩu tiếng Anh (cùng đường code với email xác minh).

## Khác với file task

- Không có mã lỗi riêng cho `locale` sai: dùng `INVALID_FORMAT` của Zod.
