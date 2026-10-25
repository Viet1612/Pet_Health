# S6-01 · API múi giờ, đổi mật khẩu, đổi email, xóa tài khoản — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S6-01](../tasks/S6-01-settings-api.md) |
| Trạng thái | Xong, test E2E API Pass (gồm email thật qua Mailpit) |
| Ngày hoàn thành | 2026-10-25 |
| Commit | xem [README](README.md) |

## Kết quả

- **Route `/me`** (`adapters/http/me-routes.ts`, body `strictObject` nên trường lạ bị từ chối):
  - `GET /me` → `{ user + pendingEmail }` (email từ token `CHANGE_EMAIL` chưa dùng, chưa hết hạn).
  - `PATCH /me { timezone }` → kiểm `isSelectableTimezone` (IANA hợp lệ và có trong `Intl.supportedValuesOf` hoặc `UTC`), sai → `422 INVALID_TIMEZONE`. Đặt `notifications_synced_on = NULL`.
  - `POST /me/password` → `204`. Đổi hash, hủy mọi phiên khác (giữ phiên hiện tại), vô hiệu token `RESET_PASSWORD` đang chờ.
  - `POST /me/email` → `202`. Có `SAME_EMAIL` (422), `EMAIL_TAKEN` (409), giới hạn `email-change` 5 lần/giờ. Tạo token 60 phút với `payload.newEmail`, gửi `CHANGE_EMAIL` tới email mới.
  - `DELETE /me` → `204`. Xóa `users` (FK cascade) + `media.purge-prefix u/{userId}/` trong cùng transaction, xóa cookie, log `identity.account_deleted` (không có định danh).
- **Mật khẩu sai** ở 3 thao tác nhạy cảm → `401 WRONG_PASSWORD` và đếm vào `pwcheck:{userId}` (5 lần / 15 phút, lần thứ 6 → `429`).
- **`POST /auth/verify-email`** nhận cả `VERIFY_EMAIL` và `CHANGE_EMAIL`, trả thêm `purpose`. Với đổi email:
  - Khóa user, kiểm lại email chưa có ai dùng (bắt cả lỗi unique `23505` → `409`).
  - Đặt email mới đã xác minh, gửi `EMAIL_CHANGED_NOTICE` tới email cũ (email mới đã che `vi***@…`, thời điểm theo múi giờ tài khoản).
- **Email** (`packages/email-templates`): mẫu `ChangeEmail` (dùng `ActionEmail`) và `EmailChanged` (không liên kết), cả vi/en; `renderEmailChangedNotice`. Worker gửi `EMAIL_CHANGED_NOTICE` cả khi hạn mức SMTP > 80% (`PRIORITY_TEMPLATES`).
- **Migration** `202610251300_idempotency_owner_fk`: dọn dòng mồ côi, thêm FK `idempotency_keys.owner_id → users ON DELETE CASCADE`. Các bảng khác đã cascade sẵn. Đã chạy trên DB dev.
- **Khác:**
  - Redact log thêm `newEmail`, `maskedNewEmail`.
  - `zNewPassword` từ chối mật khẩu chỉ có khoảng trắng.
  - IDOR đăng ký body hợp lệ cho 4 route ghi `/me`.
  - `en.apiErrors` thêm `WRONG_PASSWORD`, `SAME_EMAIL`.
  - Sinh lại `openapi.yaml`, `api-client`.

## Tiêu chí chấp nhận

Đã kiểm bằng `e2e/api/account.api.spec.ts` (5 ca):
- **Múi giờ:** `America/New_York` đổi `today` của Dashboard ngay. `GMT+7`, `Asia/Hanoi`, chuỗi rỗng → `422 INVALID_TIMEZONE`. Trường lạ → `422`.
- **Đổi mật khẩu:** 2 thiết bị → phiên A còn, phiên B nhận `401`. Sai → `401 WRONG_PASSWORD`; lần sai thứ 6 → `429`.
- **Đổi email:**
  - `SAME_EMAIL`; email đã có người dùng → `409`.
  - Gửi đúng → `202`, `GET /me` vẫn email cũ và có `pendingEmail`.
  - Mở liên kết (lấy từ Mailpit) → email đổi + đã xác minh; mở lại → `TOKEN_USED`. Email cũ nhận "Email tài khoản vừa được đổi".
  - Qua 61 phút → `TOKEN_EXPIRED`.
- **Xóa tài khoản:** sai mật khẩu → `401`, dữ liệu còn. Đúng → `204` + cookie `Max-Age=0`, phiên cũ `401`, đăng nhập lại `401`.

Ngoài ra:
- Unit: `isSelectableTimezone`, `maskEmail`, render 2 mẫu email mới.
- IDOR 97/97, unit tổng 192, E2E toàn bộ 36/36, typecheck, lint.

## Khác với file task

- **Use case gộp trong `application/account.ts`** thay vì 5 file riêng.
- **Mã template:** dùng `CHANGE_EMAIL` / `EMAIL_CHANGED_NOTICE` theo quy ước tên job hiện có (thay vì `change-email-verify` / `email-changed-notice`).
- **`isSelectableTimezone` so theo tên đã chuẩn hóa**, vì ICU của Node liệt kê `Asia/Saigon` chứ không có `Asia/Ho_Chi_Minh`.
- **Đếm sai mật khẩu chỉ tính lần sai.** Sau 5 lần sai, nhập đúng vẫn qua.
- **Chưa kiểm bằng test riêng:**
  - Đếm dòng 0 ở mọi bảng sau khi xóa (dựa vào FK cascade).
  - Thư mục ảnh bị xóa sau `purge-prefix`.
  - Hai user cùng xin đổi sang một email.
