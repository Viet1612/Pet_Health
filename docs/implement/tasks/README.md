# Danh sách task — Pet Health Web, Giai đoạn 1

2026-10-23 · Việt

[Implement_plan.md](../Implement_plan.md) được chia thành **51 task** trong 8 sprint, cộng **3 task bổ sung** (S4-07 → S4-09, đa ngôn ngữ, thêm ngày 2026-10-25) — tổng **54 task**. Mỗi task là một file trong thư mục này, gồm mục tiêu, phạm vi, chi tiết kỹ thuật, giao diện, tiêu chí chấp nhận và cách kiểm thử. Làm task theo thứ tự trong bảng; cột "Phụ thuộc" cho biết task nào phải xong trước.

Quy ước tên file: `S<sprint>-<số>-<tên-ngắn>.md`. Ước lượng tính theo ngày công (1 ngày ≈ 6–8 giờ tập trung).

## S0 · T1–2 — Nền tảng

| Task | Tên | Story / FR | Phụ thuộc | Ước lượng |
|---|---|---|---|---|
| [S0-01](S0-01-monorepo.md) | Khởi tạo monorepo pnpm, lint, tsconfig, pre-commit | AD-002 | — | 0,5 |
| [S0-02](S0-02-dev-environment.md) | Môi trường dev: `compose.dev.yml` (PostgreSQL, Mailpit), `.env.example` | SAD §4.4.1 | S0-01 | 0,5 |
| [S0-03](S0-03-backend-skeleton.md) | Khung backend: Fastify, Zod, OpenAPI, Kysely Migrator, pg-boss, `api`/`worker`, `/healthz` `/readyz` | AD-001, 003, 006 | S0-02 | 1,5 |
| [S0-04](S0-04-platform-core.md) | Platform: `ClockPort`/`FakeClock`, logging `pino` redact, lỗi `problem+json` có `ref` | FR-GEN-011, NFR-SEC-009 | S0-03 | 1 |
| [S0-05](S0-05-idempotency-ratelimit.md) | Platform: `Idempotency-Key`, bảng `idempotency_keys`, `rate_limits` | FR-GEN-005, NFR-SEC-005 | S0-04 | 1 |
| [S0-06](S0-06-calendar-domain.md) | Hàm thuần lịch và mức nhắc, viết test trước | SAD §2.2.3, SRS §2.6, §2.10 | S0-01 | 1,5 |
| [S0-07](S0-07-web-shell.md) | Khung web: Vite, React 19, Tailwind token Figma, Router, Query, layout và component lõi | UXD-001→009 | S0-01 | 2 |
| [S0-08](S0-08-api-client.md) | Package `api-client`: sinh type, wrapper fetch (timeout, lỗi, idempotency) | SAD §2.1.3 | S0-03, S0-07 | 0,5 |
| [S0-09](S0-09-ci-pipeline.md) | CI GitHub Actions: lint, test, contract diff, audit, size-limit | SAD §4.4.3 | S0-03, S0-07 | 1 |
| [S0-10](S0-10-docker-images.md) | Dockerfile app (libvips + libheif) và Caddy | SAD §2.2.4, §4.1.5 | S0-03, S0-07 | 1 |

## S1 · T3–4 — Tài khoản và phân quyền

| Task | Tên | Story / FR | Phụ thuộc | Ước lượng |
|---|---|---|---|---|
| [S1-01](S1-01-identity-schema-rls.md) | Schema `users`, `sessions`, `auth_tokens`; RLS và role `app_rw`/`app_worker` | US-006, AD-011 | S0-05 | 1 |
| [S1-02](S1-02-email-worker.md) | Worker email: `email.transactional`, `nodemailer`, React Email, hạn mức ngày | FR-AUTH-002, AD-008 | S1-01 | 1 |
| [S1-03](S1-03-register-api.md) | API đăng ký | US-001 | S1-01, S1-02 | 1 |
| [S1-04](S1-04-login-session-api.md) | API đăng nhập, đăng xuất, phiên, CSRF, khóa tạm | US-003 | S1-01 | 1,5 |
| [S1-05](S1-05-verify-email-api.md) | API xác minh email và gửi lại | US-002 | S1-03 | 0,5 |
| [S1-06](S1-06-password-reset-api.md) | API quên và đặt lại mật khẩu | US-004 | S1-02, S1-04 | 1 |
| [S1-07](S1-07-auth-ui.md) | Giao diện SCR-01→05, route guard | US-001→004 | S1-03→06, S0-08 | 2 |
| [S1-08](S1-08-idor-suite.md) | Bộ test IDOR dùng chung | US-006, G-9 | S1-04 | 1 |

## S2 · T5–6 — Thú cưng, ảnh, staging

| Task | Tên | Story / FR | Phụ thuộc | Ước lượng |
|---|---|---|---|---|
| [S2-01](S2-01-pets-api.md) | Schema `pets`, API CRUD, giới hạn 10, tuổi | US-010, 011, 013, 015 | S1-08 | 1,5 |
| [S2-02](S2-02-media-pipeline.md) | Pipeline ảnh: tải lên, `media.process`, URL ký, `GET /media`, `purge-prefix` | FR-VIS-005→008, NFR-SEC-006 | S1-01, S0-10 | 2,5 |
| [S2-03](S2-03-pet-avatar-api.md) | API ảnh đại diện | US-012 | S2-01, S2-02 | 0,5 |
| [S2-04](S2-04-pets-ui.md) | Giao diện SCR-07, 08, 09 và PetSwitcher | US-010→013, 015 | S2-01, S2-03 | 2 |
| [S2-05](S2-05-delete-pet.md) | Xóa thú cưng (API + giao diện) | US-014 | S2-04 | 0,5 |
| [S2-06](S2-06-server-staging.md) | Cài máy chủ, staging, `deploy.sh`, build image lên GHCR | SAD §4.1.5, §4.4 | S0-10 | 2 |

## S3 · T7–8 — Cân nặng và sổ y tế

| Task | Tên | Story / FR | Phụ thuộc | Ước lượng |
|---|---|---|---|---|
| [S3-01](S3-01-weights-api.md) | API cân nặng và mục tiêu | US-020→023 | S2-01 | 1 |
| [S3-02](S3-02-weights-ui.md) | Giao diện SCR-10, FLW-02, biểu đồ uPlot | US-020→023 | S3-01 | 2 |
| [S3-03](S3-03-visits-api.md) | API bản ghi khám | US-030→032 | S2-01 | 1 |
| [S3-04](S3-04-visit-photos-api.md) | API ảnh bản ghi khám | US-033, 034 | S3-03, S2-02 | 1 |
| [S3-05](S3-05-visits-ui.md) | Giao diện SCR-11, 12, 13, ảnh, lightbox | US-030→034 | S3-03, S3-04 | 2,5 |

## S4 · T9–10 — Mốc y tế và nhắc nhở

| Task | Tên | Story / FR | Phụ thuộc | Ước lượng |
|---|---|---|---|---|
| [S4-01](S4-01-milestones-api.md) | Schema `milestones`, `notifications`; API tạo, xem, sửa, hủy mốc | US-040, 044, 046, 047 | S2-01, S0-06 | 1,5 |
| [S4-02](S4-02-complete-undo-api.md) | Đánh dấu đã thực hiện, mốc kế tiếp, hoàn tác | US-042, 043 | S4-01 | 1,5 |
| [S4-03](S4-03-notifications-api.md) | `syncNotifications` và API Thông báo | US-041, 048, 049 | S4-01 | 2 |
| [S4-04](S4-04-milestones-ui.md) | Giao diện SCR-14, 15, sheet tạo/sửa/hủy, FLW-04, toast hoàn tác | US-040→048 | S4-02 | 2 |
| [S4-05](S4-05-notifications-ui.md) | Giao diện SCR-17 và chuông trên TopBar | US-049 | S4-03 | 1 |
| [S4-06](S4-06-e2e-core-flow.md) | E2E luồng cốt lõi với `FakeClock`, test song song | G-3, G-15, G-18 | S4-02, S4-03, S4-04, S4-05 | 1,5 |
| [S4-07](S4-07-i18n-web.md) | Đa ngôn ngữ web: từ điển `en.ts`, định dạng ngày/số, chọn ngôn ngữ trong Cài đặt *(bổ sung 2026-10-25)* | FR-GEN-002, UXD-001 | S4-05 | 1,5 |
| [S4-08](S4-08-i18n-api.md) | API trung lập ngôn ngữ: mã lỗi + tham số, `ageMonths`, `daysUntilDue` *(bổ sung)* | SAD §2.4.3 | S4-07 | 1 |
| [S4-09](S4-09-user-locale-email.md) | Ngôn ngữ theo tài khoản (`users.locale`) và email 2 ngôn ngữ *(bổ sung)* | FR-AUTH-002, 010 | S4-07 | 0,5 |

## S5 · T11–12 — Việc hằng ngày và Dashboard

| Task | Tên | Story / FR | Phụ thuộc | Ước lượng |
|---|---|---|---|---|
| [S5-01](S5-01-routines-api.md) | API việc hằng ngày | US-045, 050, 052, 053 | S2-01 | 1 |
| [S5-02](S5-02-routines-ui.md) | Giao diện SCR-16 và sheet | US-045, 050, 052 | S5-01 | 1 |
| [S5-03](S5-03-dashboard-api.md) | `GET /dashboard` | US-047, 051, 060→062 | S5-01, S4-03, S3-01 | 1,5 |
| [S5-04](S5-04-dashboard-ui.md) | Giao diện SCR-06: banner, panel, lọc, skeleton, empty state, nút "+" | US-051, 060→062 | S5-03 | 2,5 |

## S6 · T13–14 — Cài đặt, trạng thái hệ thống, analytics

| Task | Tên | Story / FR | Phụ thuộc | Ước lượng |
|---|---|---|---|---|
| [S6-01](S6-01-settings-api.md) | API múi giờ, đổi mật khẩu, đổi email, xóa tài khoản | US-005, 008 | S1-04, S2-02 | 1,5 |
| [S6-02](S6-02-settings-ui.md) | Giao diện SCR-18, menu tài khoản | US-005, 008 | S6-01 | 1,5 |
| [S6-03](S6-03-system-states.md) | Mất mạng, timeout, hết phiên giữ bản nháp, 404/5xx, nhất quán đa thiết bị | US-007, FR-GEN-003→011 | S5-04 | 1,5 |
| [S6-04](S6-04-dark-mode-a11y.md) | Dark mode và rà soát trợ năng | UXD-001, NFR-USA | S5-04 | 1 |
| [S6-05](S6-05-analytics.md) | Analytics tự lưu | FR-ANL-001→005 | S5-04 | 1 |
| [S6-06](S6-06-maintenance-job.md) | Job dọn dẹp `maintenance.daily` | FR-NTF-011 | S4-03 | 0,5 |

## S7 · T15–16 — Production và phát hành

| Task | Tên | Story / FR | Phụ thuộc | Ước lượng |
|---|---|---|---|---|
| [S7-01](S7-01-production-stack.md) | Stack production: compose, CSP, autoheal, `ops/status.sh`, UPS | NFR-REL-001, G-10 | S2-06 | 1,5 |
| [S7-02](S7-02-cloudflare-email.md) | Cloudflare (tunnel, WAF, rate limit, cache) và Gmail | G-10, G-14 | S7-01 | 1 |
| [S7-03](S7-03-performance-test.md) | Kiểm thử hiệu năng: k6, Lighthouse | G-6, G-7, G-8 | S7-01 | 1,5 |
| [S7-04](S7-04-security-test.md) | Kiểm thử bảo mật: ZAP, IDOR, dependency | G-9, G-11, G-12 | S7-01 | 1 |
| [S7-05](S7-05-contract-device-test.md) | Contract test Schemathesis, kiểm thử thiết bị và thời gian | G-4, G-5, G-17 | S7-01 | 1,5 |
| [S7-06](S7-06-release.md) | Phát hành production và smoke test | G-1→G-18 | S7-02→05 | 0,5 |
