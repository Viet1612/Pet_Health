# S0-03 · Khung backend — Kết quả

| Thuộc tính | Giá trị |
|---|---|
| Task | [S0-03](../tasks/S0-03-backend-skeleton.md) |
| Trạng thái | Xong |
| Ngày hoàn thành | 2026-10-23 |
| Commit | xem [README](README.md) |

## Kết quả

`apps/api` có 3 entrypoint chạy được: `main-api.ts` (Fastify 5, cổng 3000), `main-worker.ts` (pg-boss + heartbeat) và `main-migrate.ts` (Kysely Migrator + schema `pgboss` + 4 queue). Kèm theo: config đọc bằng Zod, `JobQueuePort` ghi job trong cùng transaction, `/api/v1/healthz` và `/readyz`, tắt êm, `openapi.yaml` sinh từ schema Zod. 24 test (unit + integration với Testcontainers) đều qua.

## Tiêu chí chấp nhận

| Tiêu chí | Kết quả |
|---|---|
| `pnpm db:migrate` trên DB trống chạy hết migration, tạo `pgboss` + 4 queue; lần hai không làm gì, exit 0 | Đạt (DB ServBay và Testcontainers) |
| `pnpm --filter @ph/api dev` chạy `api` cổng 3000 và `worker`; healthz 200; readyz 200 khi DB chạy, 503 khi dừng DB | Đạt; case 503 kiểm bằng cách dừng container PostgreSQL trong integration test |
| Mọi phản hồi `/api/*` có `Cache-Control: no-store` | Đạt, kể cả 404 |
| Body JSON 64 KB + 1 byte → 413; body không phải JSON → 415 | Đạt (64 KB đúng thì 200) |
| Enqueue trong transaction rollback → 0 job; commit → đúng 1 job | Đạt |
| `SIGTERM` khi có request chậm 2 s: request đó vẫn 200, request đến sau bị từ chối | Đạt ở mức `app.close()` (test `shutdown.test.ts`). Chưa kiểm thoát mã 0 bằng tín hiệu thật vì Windows không gửi `SIGTERM`; kiểm lại trong Docker ở [S0-10](../tasks/S0-10-docker-images.md) |
| Worker ghi heartbeat mỗi 30 s; `healthcheck-worker` trả 1 khi tệp cũ hơn 90 s | Đạt |
| `pnpm openapi:gen` tạo OpenAPI 3.1, `servers[0].url = /api/v1`, có `/healthz` `/readyz`; chạy hai lần không có diff | Đạt |
| Thiếu `DATABASE_URL` thì `api` thoát ngay, nêu tên biến | Đạt (exit 1, "DATABASE_URL: Invalid input…") |

## Tệp đã tạo / sửa

- `apps/api/src`: `main-api.ts`, `main-worker.ts`, `main-migrate.ts`, `healthcheck-worker.ts`, `app.ts`, `config.ts`, `composition-root.ts`
- `apps/api/src/platform/db`: `kysely.ts`, `migrator.ts`, `retry.ts`, `database.types.ts` (sinh bằng kysely-codegen)
- `apps/api/src/platform/queue`: `job-queue.port.ts`, `pg-boss.adapter.ts`, `queues.ts`
- `apps/api/src/platform/http`: `health.routes.ts`, `openapi.ts`, `route-config.ts` (khai báo `config.public`)
- `apps/api/src/platform/heartbeat.ts`, `apps/api/src/modules/.gitkeep`
- `apps/api/migrations/202610231700_init.ts` (`CREATE EXTENSION citext`)
- `apps/api/scripts/gen-openapi.ts`, `openapi.yaml` ở gốc repo
- `apps/api/test`: `config`, `retry`, `heartbeat`, `app`, `shutdown`, `db.int`
- `apps/api/package.json`: script `dev`, `dev:api`, `dev:worker`, `migrate`, `openapi:gen`, `db:types`
- Gốc: script `openapi:gen`; `pnpm-workspace.yaml` thêm `allowBuilds`; `.prettierignore` thêm `openapi.yaml`; `eslint.config.js` bỏ qua `database.types.ts`

## Phiên bản đã ghim

| Thư viện | Phiên bản |
|---|---|
| fastify | 5.12.7 |
| fastify-type-provider-zod | 7.0.0 |
| @fastify/swagger | 9.9.2 |
| zod | 4.6.7 |
| kysely | 0.29.7 |
| pg | 8.23.1 |
| pg-boss | 12.38.0 |
| tsx | 4.23.15 |
| kysely-codegen | 0.20.0 |
| testcontainers / @testcontainers/postgresql | 12.2.1 |

## Khác với file task

- **pg-boss 12 thay vì 10:** `send(..., { db })` vẫn ghi job trong transaction của Kysely như thiết kế.
- **Kysely 0.29:** `Migrator` import từ `kysely/migration`.
- **Migration provider:** viết `FolderMigrationProvider` riêng thay cho `FileMigrationProvider`, vì `import()` trên Windows cần file URL.
- **Thêm handler `error` cho mọi pool PostgreSQL** (`createPool`): khi DB khởi động lại, kết nối rảnh phát lỗi; không có handler thì tiến trình Node bị dừng.
- **Khi đang tắt, mọi phản hồi gắn `Connection: close`:** nếu không, kết nối keep-alive giữ `app.close()` chờ quá 15 s và `api` thoát mã 1 thay vì 0.
- **Migration và pg-boss ở vai trò `migrate` không đặt `statement_timeout`**, để migration dài không bị cắt ở 5 s.
- `pnpm-workspace.yaml` dùng `allowBuilds` (pnpm 12): chỉ cho `esbuild` chạy script cài đặt.

## Ghi chú môi trường

- `apps/api/.env` đã tạo từ `.env.example` trên máy dev (không commit).
- `api` nghe trên `0.0.0.0:3000` theo task (cần cho Docker); ở máy dev, máy khác trong LAN cũng gọi được cổng này.
- Integration test cần Docker Desktop đang chạy (Testcontainers kéo `postgres:16`).
