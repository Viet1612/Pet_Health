# Task đã làm

Mỗi task làm xong có một tệp kết quả trong thư mục này, cùng tên với tệp task trong [../tasks/](../tasks/README.md). Bảng dưới đây là tiến độ tổng; mới nhất ở cuối.

**Tiến độ:** 31 / 51 task

Cột Commit được điền ở lần commit kế tiếp (một commit không chứa được mã của chính nó).

| Task | Tên | Trạng thái | Ngày | Commit | Kết quả |
|---|---|---|---|---|---|
| S0-01 | Khởi tạo monorepo pnpm, lint, tsconfig, pre-commit | Xong | 2026-10-23 | `845e00a` | [S0-01](S0-01-monorepo.md) |
| S0-02 | Môi trường dev: PostgreSQL (ServBay), Mailpit, `.env.example` | Xong | 2026-10-23 | `5eae5a9` | [S0-02](S0-02-dev-environment.md) |
| S0-03 | Khung backend: Fastify, Zod, OpenAPI, Kysely, pg-boss, health, tắt êm | Xong | 2026-10-23 | `341fe67` | [S0-03](S0-03-backend-skeleton.md) |
| S0-04 | Platform: Clock, logging redact, lỗi problem+json, deny-by-default | Xong | 2026-10-23 | `31d5db2` | [S0-04](S0-04-platform-core.md) |
| S0-05 | Idempotency-Key, rate limit | Xong (code), chưa kiểm thử tích hợp | 2026-10-23 | `28c1343` | [S0-05](S0-05-idempotency-ratelimit.md) |
| S0-06 | Hàm thuần lịch và mức nhắc | Xong | 2026-10-23 | `35b1779` | [S0-06](S0-06-calendar-domain.md) |
| S0-07 | Khung web: Vite, React, Tailwind token, Router, Query, AppShell, component lõi | Xong (code), chưa kiểm thử giao diện | 2026-10-23 | `3b31b89` | [S0-07](S0-07-web-shell.md) |
| S0-08 | Package api-client: type sinh từ OpenAPI, timeout, CSRF, problem+json, idempotency | Xong (code), chưa có unit test | 2026-10-24 | `8d27fd4` | [S0-08](S0-08-api-client.md) |
| S0-09 | CI GitHub Actions: lint, test, contract, security, size; dependency-cruiser | Xong (code), chưa chạy trên GitHub | 2026-10-24 | `d90326a` | [S0-09](S0-09-ci-pipeline.md) |
| S0-10 | Dockerfile ph-app (libvips + libheif), ph-caddy, Caddyfile, profile `full` | Xong (code), chưa build image | 2026-10-24 | `1e6818a` | [S0-10](S0-10-docker-images.md) |
| S1-01 | Schema users/sessions/auth_tokens, role CSDL, RLS helper, withTx | Xong (code), chưa chạy migration | 2026-10-24 | `731f0af` | [S1-01](S1-01-identity-schema-rls.md) |
| S1-02 | Worker email: React Email, SMTP, retry, hạn mức ngày | Xong (code), chưa gửi thử | 2026-10-24 | `11efaf3` | [S1-02](S1-02-email-worker.md) |
| S1-03 | API đăng ký, Argon2id, phiên, cookie | Xong (code), chưa gọi thử | 2026-10-24 | `e6e28c3` | [S1-03](S1-03-register-api.md) |
| S1-04 | Đăng nhập, đăng xuất, phiên, CSRF, khóa tạm | Xong (code), chưa gọi thử | 2026-10-24 | `cc36008` | [S1-04](S1-04-login-session-api.md) |
| S1-05 | Xác minh email và gửi lại | Xong (code), chưa gọi thử | 2026-10-24 | `e5010da` | [S1-05](S1-05-verify-email-api.md) |
| S1-06 | Quên và đặt lại mật khẩu | Xong (code), chưa gọi thử | 2026-10-24 | `e5010da` | [S1-06](S1-06-password-reset-api.md) |
| S1-07 | Giao diện đăng nhập, đăng ký, quên/đặt lại mật khẩu, xác minh email; route guard | Xong (code), chưa chạy thử trên trình duyệt | 2026-10-24 | `3d0ed02` | [S1-07](S1-07-auth-ui.md) |
| S1-08 | Bộ test IDOR dùng chung: phủ route, deny-by-default, RLS | Xong (code), chưa chạy (cần Docker) | 2026-10-24 | `c61f4ad` | [S1-08](S1-08-idor-suite.md) |
| S2-01 | Schema `pets`, API CRUD, giới hạn 10, tuổi | Xong, đã gọi thử trên DB dev | 2026-10-24 | `c5ec824` | [S2-01](S2-01-pets-api.md) |
| S2-02 | Pipeline ảnh: tải lên, `media.process`, URL ký, `GET /media`, `purge-prefix` | Xong (code), chưa chạy với ảnh HEIC thật | 2026-10-24 | `7e4e10d` | [S2-02](S2-02-media-pipeline.md) |
| S2-03 | API ảnh đại diện | Xong, đã chạy đầu-cuối trên server dev (chưa thử HEIC) | 2026-10-24 | `889d2d8` | [S2-03](S2-03-pet-avatar-api.md) |
| S2-04 | Giao diện SCR-07, 08, 09 và PetSwitcher | Xong (code), chưa bấm thử trên trình duyệt | 2026-10-24 | `d715749` | [S2-04](S2-04-pets-ui.md) |
| S2-05 | Xóa thú cưng (API + giao diện) | Xong; API đã chạy thử, hộp thoại chưa bấm thử | 2026-10-24 | `911ca12` | [S2-05](S2-05-delete-pet.md) |
| S2-06 | Cài máy chủ, staging, `deploy.sh`, image lên GHCR | Bỏ qua: chỉ phát triển và kiểm thử trên máy dev | 2026-10-24 | — | — |
| S3-01 | API cân nặng và mục tiêu | Xong, đã gọi thử trên server dev | 2026-10-24 | `07ba216` | [S3-01](S3-01-weights-api.md) |
| S3-02 | Giao diện cân nặng: tóm tắt, biểu đồ uPlot, lịch sử, sheet thêm/sửa, mục tiêu, Thêm nhanh | Xong (code), chưa bấm thử trên trình duyệt | 2026-10-24 | `6f52199` | [S3-02](S3-02-weights-ui.md) |
| S3-03 | API bản ghi khám (phân trang keyset, xóa kèm ảnh) | Xong, đã gọi thử trên server dev | 2026-10-25 | `c696fbf` | [S3-03](S3-03-visits-api.md) |
| S3-04 | API ảnh bản ghi khám (tối đa 5 ảnh, xử lý nền, xóa từng ảnh) | Xong, đã chạy đầu-cuối trên server dev (chưa thử HEIC) | 2026-10-25 | `c0d825b` | [S3-04](S3-04-visit-photos-api.md) |
| S3-05 | Giao diện sổ y tế: danh sách cuộn, chi tiết, thêm/sửa, tải ảnh có tiến trình, lightbox | Xong (code), anh đã bấm thử | 2026-10-25 | `2cb543e` | [S3-05](S3-05-visits-ui.md) |
| S4-01 | Schema `milestones`, `notifications`; API tạo, xem, sửa, hủy mốc | Xong, đã gọi thử trên server dev | 2026-10-25 | `565b679` | [S4-01](S4-01-milestones-api.md) |
| S4-02 | Đánh dấu đã thực hiện, mốc kế tiếp, hoàn tác | Xong, đã gọi thử trên server dev | 2026-10-25 | `81fce8a` | [S4-02](S4-02-complete-undo-api.md) |
| S4-03 | `syncNotifications` và API Thông báo | Xong, đã gọi thử trên server dev | 2026-10-25 | — | [S4-03](S4-03-notifications-api.md) |
