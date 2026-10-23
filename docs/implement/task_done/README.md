# Task đã làm

Mỗi task làm xong có một tệp kết quả trong thư mục này, cùng tên với tệp task trong [../tasks/](../tasks/README.md). Bảng dưới đây là tiến độ tổng; mới nhất ở cuối.

**Tiến độ:** 18 / 51 task

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
| S1-08 | Bộ test IDOR dùng chung: phủ route, deny-by-default, RLS | Xong (code), chưa chạy (cần Docker) | 2026-10-24 | — | [S1-08](S1-08-idor-suite.md) |
