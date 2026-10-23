# S1-02 · Worker email — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S1-02](../tasks/S1-02-email-worker.md) |
| Trạng thái | Xong (code), chưa gửi thử |
| Ngày hoàn thành | 2026-10-24 |
| Commit | xem [README](README.md) |

## Kết quả

- **`packages/email-templates`** (React Email, `lang="vi"`, nút `#C2185B`):
  - Template `VerifyEmail`, `ResetPassword` đúng subject, câu giải thích, nút, dòng hạn; có liên kết dạng chữ và dòng "Nếu bạn không yêu cầu, hãy bỏ qua email này."
  - `renderEmail(template, link)` → `{ subject, html, text }`.
  - Build ra `dist/` (ESM NodeNext). Script `preview` mở `email dev`.
- **`platform/email/`:** `EmailPort`, `EmailRejectedError`; `SmtpEmailAdapter` (nodemailer: pool, 1 kết nối, timeout 10 s / 30 s; mã ≥ 500 → `EmailRejectedError`, lỗi khác ném lại để retry); `FakeEmailAdapter` cho test; `jobs.ts` (schema Zod payload, đường dẫn `/verify-email`, `/reset-password`).
- **Hàng đợi:** `ensureQueues` tạo hoặc cập nhật tùy chọn từng queue; `email.transactional` thử lại 5 lần, chờ 30 s × 2ⁿ, xóa job xong sau 1 ngày.
- **Handler `modules/identity/adapters/jobs/send-transactional-email.ts`:**
  - Payload sai → log `error`, kết thúc job.
  - Đếm hạn mức ngày (`smtp:daily`, cửa sổ UTC): vượt 100% → không gửi; vượt 80% → chỉ còn gửi `RESET_PASSWORD`, log `warn`.
  - Liên kết `${APP_ORIGIN}/verify-email#token=…` hoặc `/reset-password#token=…`.
  - SMTP từ chối (5xx) → log `warn` kèm `responseCode`, kết thúc job; lỗi khác → ném để pg-boss thử lại.
  - Log không chứa địa chỉ, token, link.
- **`main-worker.ts`:** `boss.work('email.transactional', { batchSize: 1 })`; khi tắt, chờ job xong rồi đóng SMTP.
- **Config:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_DAILY_LIMIT`, `ANALYTICS_HMAC_KEY` (bắt buộc, ≥ 16 ký tự).
- **Redact log** thêm `to`, `link` (ở gốc và lồng một cấp).
- **`incrementCounter()`** tách khỏi `RateLimiter` để dùng chung.
- **Build:** `pnpm --filter @ph/api build` và `dev:worker` tự build `email-templates` trước; `tsconfig` của API bật `jsx`.

## Tiêu chí chấp nhận

Đã kiểm: typecheck, lint; render thử `VERIFY_EMAIL` ra đúng subject và nội dung plain text. **Chưa kiểm** (cần DB và Mailpit): rollback không có job; thư tới Mailpit trong 1 phút; retry 4xx / không retry 5xx; hạn mức 80% và 100%; log không chứa email; worker tắt êm.

## Khác với file task

- **Hàm enqueue vẫn tên `enqueue(trx, …)`** (đã có từ S0-03, cùng chức năng `enqueueInTx`).
- **Bộ đếm ngày lấy giờ từ `ClockPort`** thay vì `now()` của DB, để test được bằng `FakeClock`.
- **Queue `media.*`, `maintenance.daily`** cũng có tùy chọn retry riêng theo SAD §2.2.4.
- Chưa có unit test handler và template, chưa có integration test với container Mailpit.
