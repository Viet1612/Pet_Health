# S6-01 · API múi giờ, đổi mật khẩu, đổi email, xóa tài khoản

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S6 · T13–14 |
| Story | US-005 (P2), US-008 (P1) |
| Yêu cầu | FR-AUTH-010, FR-AUTH-011, FR-AUTH-015, FR-AUTH-016, NFR-SEC-001, NFR-SEC-005, NFR-SEC-009 |
| Phụ thuộc | [S1-04](S1-04-login-session-api.md), [S2-02](S2-02-media-pipeline.md) |
| Ước lượng | 1,5 |
| Màn hình Figma | — (giao diện ở [S6-02](S6-02-settings-ui.md)) |

## Mục tiêu

Hoàn thiện nhóm endpoint `/me` của mô-đun `identity` (SAD §2.4.2): xem và đổi múi giờ, đổi mật khẩu, đổi email có xác minh, xóa tài khoản cùng toàn bộ dữ liệu và ảnh.

## Phạm vi

**Trong phạm vi:** `GET /me`, `PATCH /me`, `POST /me/password`, `POST /me/email`, `DELETE /me`; xử lý token `CHANGE_EMAIL` trong `POST /auth/verify-email`; 2 template email mới; schema Zod + `openapi.yaml` + `api-client`; integration test.

**Ngoài phạm vi:** màn hình SCR-18 và menu tài khoản ([S6-02](S6-02-settings-ui.md)); job xóa thư mục ảnh đã có ở [S2-02](S2-02-media-pipeline.md); dọn `auth_tokens`, `sessions` hết hạn ([S6-06](S6-06-maintenance-job.md)).

## Chi tiết kỹ thuật

Mã đặt tại `apps/api/src/modules/identity/`: use case trong `application/` (`get-me.ts`, `update-timezone.ts`, `change-password.ts`, `request-email-change.ts`, `delete-account.ts`), route trong `adapters/http/me.routes.ts`. Mọi route dùng `requireSession`; method ghi kiểm `X-CSRF-Token` + `Origin` (S1-04).

**1. `GET /me` → `200 { user }`**

```ts
type Me = {
  id: string; email: string; emailVerified: boolean;
  timezone: string;            // IANA
  pendingEmail: string | null; // từ token CHANGE_EMAIL chưa dùng, chưa hết hạn
  createdAt: string;
};
```

**2. `PATCH /me` `{ timezone }` → `200 { user }`**

1. Kiểm `timezone` bằng `IANAZone.isValidZone()` (Luxon) **và** có trong `Intl.supportedValuesOf('timeZone')` hoặc là `UTC`. Sai → `422 INVALID_TIMEZONE` (`errors[0].field = "timezone"`).
2. `UPDATE users SET timezone = $1, notifications_synced_on = NULL WHERE id = $userId`. Đặt `NULL` để lần đọc kế tiếp `syncNotifications` (S4-03) tính lại theo "hôm nay" mới.
3. Không sửa thông báo đã tạo (FR-AUTH-011).

**3. `POST /me/password` `{ currentPassword, newPassword }` → `204`**

1. `newPassword` 8–128 ký tự, không chỉ toàn khoảng trắng → nếu sai `422 VALIDATION_FAILED`.
2. Rate limit bucket `pwcheck:{userId}`: 5 lần sai / 15 phút → `429 RATE_LIMITED` + `retryAfter` (dùng chung cho `/me/email`, `DELETE /me`).
3. `argon2.verify(user.password_hash, currentPassword)` sai → `401 WRONG_PASSWORD`, tăng bộ đếm.
4. Transaction: cập nhật `password_hash` (Argon2id `m=19MiB,t=2,p=1`); `DELETE FROM sessions WHERE user_id = $1 AND id <> $currentSessionId`; đánh dấu `used_at = now()` cho token `RESET_PASSWORD` chưa dùng.
5. Phiên hiện tại giữ nguyên, không đổi cookie.

**4. `POST /me/email` `{ newEmail, password }` → `202`**

1. Chuẩn hóa `newEmail` (trim, lowercase); định dạng sai → `422`; trùng email hiện tại → `422 SAME_EMAIL`.
2. Kiểm rate limit như bước 3.2, thêm bucket `email-change:{userId}` 5 lần/giờ → `429`.
3. Sai mật khẩu → `401 WRONG_PASSWORD`.
4. `SELECT 1 FROM users WHERE email = $newEmail` có → `409 EMAIL_TAKEN`.
5. Transaction: đánh dấu `used_at` cho token `CHANGE_EMAIL` cũ chưa dùng (giữ partial unique `(user_id, kind) WHERE used_at IS NULL`); tạo token 256 bit, lưu `SHA-256`, `kind = 'CHANGE_EMAIL'`, `payload = { newEmail }`, `expires_at = now + 60 min`; enqueue `email.transactional` template `change-email-verify` tới **email mới**, liên kết `https://app.pethealth.example/verify-email#token=...`.
6. Email cũ chưa đổi ở bước này.

**5. Xác minh đổi email — mở rộng `POST /auth/verify-email` (S1-05)**

Tìm token theo hash; nếu `kind = 'CHANGE_EMAIL'`:
1. Hết hạn → `410 TOKEN_EXPIRED`; đã dùng → `410 TOKEN_USED`.
2. Transaction: kiểm lại `newEmail` chưa có user khác (`409 EMAIL_TAKEN`, bắt cả lỗi unique `23505`); `UPDATE users SET email = newEmail, email_verified_at = now()`; `used_at = now()`; enqueue template `email-changed-notice` tới **email cũ**, tiêu đề "Email tài khoản vừa được đổi", nội dung chỉ gồm email mới đã che (`vi***@example.com`), thời điểm và câu "Nếu không phải bạn, hãy đặt lại mật khẩu ngay".
3. Trả `200 { user, purpose: "CHANGE_EMAIL" }` (token `VERIFY_EMAIL` trả `purpose: "VERIFY_EMAIL"`).

**6. `DELETE /me` `{ password }` → `204`** (SAD §3.2.3)

1. Kiểm rate limit, sai mật khẩu → `401 WRONG_PASSWORD`.
2. Transaction: `DELETE FROM users WHERE id = $userId`. Mọi bảng nghiệp vụ có `owner_id`/`user_id` FK `ON DELETE CASCADE` tới `users`: `sessions`, `auth_tokens`, `pets` → `weight_entries`, `visits`, `visit_photos`, `milestones`, `notifications`, `routine_tasks`, `routine_completions`; cùng `uploads`, `idempotency_keys`. Migration kiểm và bổ sung FK còn thiếu.
3. Trong cùng transaction enqueue `media.purge-prefix` `{ prefix: "u/{userId}/" }`.
4. Phản hồi kèm `Set-Cookie: __Host-ph_sid=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict`.
5. Sau commit, mọi request bằng cookie cũ → `401`; không còn URL ký nào được cấp vì không còn phiên và bản ghi. Job `media.process` đang chờ của user phải bỏ qua khi `uploads` không còn (không retry).
6. `analytics_events` không xóa: chỉ chứa `user_id_hash`, không còn liên kết được với người dùng.

**Log:** thêm `*.newEmail` vào `redact` của `pino`; log sự kiện `identity.account_deleted` chỉ với `userIdHash`.

## Giao diện

Không có.

## Tiêu chí chấp nhận

- [ ] **Given** đã đăng nhập, **When** `PATCH /me { timezone: "America/New_York" }`, **Then** `200`, `users.notifications_synced_on = NULL`, `GET /dashboard` kế tiếp tính "hôm nay" theo múi mới; thông báo cũ không đổi.
- [ ] `timezone` sai (`"Asia/Hanoi"`, `"GMT+7"`) → `422 INVALID_TIMEZONE`.
- [ ] **Given** đăng nhập trên 2 thiết bị, **When** đổi mật khẩu đúng trên thiết bị A, **Then** `204`, phiên A còn dùng được, phiên B nhận `401`.
- [ ] Mật khẩu hiện tại sai → `401 WRONG_PASSWORD`, `password_hash` không đổi; lần sai thứ 6 trong 15 phút → `429`.
- [ ] **Given** mở Cài đặt, **When** gửi email mới chưa dùng + mật khẩu đúng, **Then** `202`, email mới nhận liên kết 60 phút; `GET /me` vẫn trả email cũ và `pendingEmail` = email mới.
- [ ] **When** mở liên kết trong 60 phút, **Then** email tài khoản đổi, trạng thái *đã xác minh*, email cũ nhận thư "Email tài khoản vừa được đổi". Mở lại liên kết → `410 TOKEN_USED`; sau 60 phút → `410 TOKEN_EXPIRED`.
- [ ] Email mới đã có tài khoản → `409 EMAIL_TAKEN` (cả lúc yêu cầu và lúc xác minh).
- [ ] **Given** tài khoản có 3 thú cưng, số đo, khám, ảnh, mốc, thông báo, việc, **When** `DELETE /me` với mật khẩu đúng, **Then** `204`, đếm dòng theo `owner_id` ở mọi bảng = 0, mọi phiên bị hủy, `media/u/{userId}/` bị xóa trong ≤ 1 phút, đăng nhập lại → `401 INVALID_CREDENTIALS`.
- [ ] `DELETE /me` sai mật khẩu → `401`, không dữ liệu nào bị xóa.
- [ ] Log không chứa `password`, `currentPassword`, `newPassword`, token hay email mới.
- [ ] `openapi.yaml` và `api-client` cập nhật; CI contract diff xanh.

## Kiểm thử

- **Unit:** validate múi giờ (`Asia/Ho_Chi_Minh`, `UTC`, `Europe/London` hợp lệ; `GMT+7`, chuỗi rỗng sai); che email trong thư thông báo.
- **Integration (Testcontainers):** từng ca AC ở trên; `FakeClock` tiến 61 phút để thử token hết hạn; 2 user cùng xin đổi sang một email, user xác minh sau nhận `409`.
- **Xóa dây chuyền:** seed đủ 13 bảng cho user A và B, xóa A, dùng role `app_worker` đếm: A = 0 dòng, B giữ nguyên; job `media.purge-prefix` chạy xong thì thư mục A không còn, thư mục B còn.
- **IDOR suite ([S1-08](S1-08-idor-suite.md)):** thêm 5 route `/me*` vào nhóm "không có path param": body chèn `userId`/`id` của B bị bỏ qua (Zod `strict`), dữ liệu B không đổi; không phiên → `401`.
- **Email (Mailpit):** 2 template render đúng tiếng Việt, có bản plain-text.

## Ghi chú

- US-005 là P2: nếu thiếu thời gian, ưu tiên `PATCH /me`, `/me/password`, `/me/email`; `DELETE /me` làm sau nhưng vẫn trong S6.
- Không xác nhận lại email cũ trước khi đổi (theo FR-AUTH-015); thư thông báo tới email cũ là lớp phát hiện.
- `email-changed-notice` vẫn gửi khi hạn mức SMTP vượt 80% (cùng nhóm ưu tiên với đặt lại mật khẩu, SAD §2.2.4).
