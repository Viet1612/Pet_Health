# S4-09 · Ngôn ngữ theo tài khoản và email 2 ngôn ngữ

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S4 · T9–10 (bổ sung, làm trước S5) |
| Story | — (yêu cầu bổ sung của chủ dự án, 2026-10-25) |
| Yêu cầu | FR-AUTH-002 (email xác minh), FR-AUTH-010 (email đặt lại mật khẩu); mở rộng đa ngôn ngữ |
| Phụ thuộc | [S4-07](S4-07-i18n-web.md) |
| Ước lượng | 0,5 ngày |
| Màn hình Figma | — |

## Mục tiêu

Ngôn ngữ chọn trong **Cài đặt** được lưu theo tài khoản: đăng nhập trên thiết bị khác vẫn đúng ngôn ngữ. Email xác minh và đặt lại mật khẩu gửi theo ngôn ngữ của tài khoản.

## Phạm vi

**Trong phạm vi:**
- Cột `users.locale`.
- Endpoint đổi ngôn ngữ.
- `GET /auth/session` trả `locale`.
- Mục Ngôn ngữ trong Cài đặt gọi API.
- Mẫu email tiếng Anh.
- Worker chọn mẫu theo ngôn ngữ.

**Ngoài phạm vi:** các mục khác của Cài đặt (S6-01).

## Chi tiết kỹ thuật

**Migration:** `ALTER TABLE users ADD COLUMN locale text NOT NULL DEFAULT 'vi' CHECK (locale IN ('vi','en'))`.

**API**

- `PATCH /api/v1/me/locale { locale: 'vi' | 'en' }` → `200 { locale }`. Cần phiên + CSRF.
- `GET /auth/session`, `POST /auth/login`, `POST /auth/register` trả thêm `user.locale`.
- `POST /auth/register` nhận `locale?` (web gửi ngôn ngữ đang dùng); mặc định `vi`.

**Web**

- Mục Ngôn ngữ (S4-07): chọn → `PATCH /me/locale` → `setLocale` (lưu `localStorage` + tải lại trang).
- Khi có phiên và `user.locale` khác ngôn ngữ đang dùng → ghi `user.locale` vào `localStorage` và tải lại một lần. Tài khoản thắng thiết bị.

**Email**

- `packages/email-templates`: mỗi mẫu (`VerifyEmail`, `ResetPassword`, `Layout`) nhận `locale` và lấy chuỗi từ từ điển `vi` / `en` của package.
- Job `email.transactional` mang `locale` (lấy từ `users.locale` lúc gửi job). Job cũ không có `locale` → `vi`.

## Giao diện

Mục Ngôn ngữ trong Cài đặt (S4-07), giờ lưu theo tài khoản.

## Tiêu chí chấp nhận

- [ ] **Given** chọn English trong Cài đặt trên máy A, **When** đăng nhập trên máy B, **Then** máy B hiển thị tiếng Anh.
- [ ] Tài khoản tiếng Anh nhận email xác minh và email đặt lại mật khẩu bằng tiếng Anh; tài khoản tiếng Việt như cũ.
- [ ] `PATCH /me/locale` giá trị khác `vi`/`en` → `422`; không có phiên → `401`; có trong IDOR deny-by-default.

## Kiểm thử

- **Unit:** render 2 mẫu email ở cả 2 ngôn ngữ (có link, không còn chuỗi của ngôn ngữ kia).
- **Thủ công:** đổi ngôn ngữ, gửi lại email xác minh, xem trong Mailpit.
