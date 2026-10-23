# S0-03 · Khung backend: Fastify, Zod, OpenAPI, Kysely Migrator, pg-boss, `api`/`worker`, `/healthz` `/readyz`

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S0 · T1–2 |
| Story | — |
| Yêu cầu | AD-001, AD-003, AD-006, NFR-MNT-001, NFR-MNT-004 (G-17), SAD §2.3, §2.4.1, §3.1.1, §4.2.2, §4.2.3 |
| Phụ thuộc | [S0-02](S0-02-dev-environment.md) |
| Ước lượng | 1,5 |
| Màn hình Figma | — |

## Mục tiêu
`apps/api` có 3 entrypoint chạy được (`main-api.ts`, `main-worker.ts`, `main-migrate.ts`), Fastify 5 với Zod type provider, `openapi.yaml` sinh từ schema và được commit, Kysely + Migrator, pg-boss enqueue được trong cùng transaction, `/healthz` `/readyz` và tắt máy êm. Từ S1 mỗi mô-đun chỉ cần thêm route, use case và migration.

## Phạm vi
**Trong phạm vi:**
- Cấu trúc thư mục, đọc config, kết nối DB, Migrator, pg-boss, `JobQueuePort`, `buildApp()`, health, shutdown, script sinh OpenAPI.

**Ngoài phạm vi:**
- `ClockPort`, logging redact, request id `ref`, lỗi problem+json, `public: true` → [S0-04](S0-04-platform-core.md).
- `Idempotency-Key`, `rate_limits` → [S0-05](S0-05-idempotency-ratelimit.md).
- Handler job thật (email, ảnh, dọn dẹp) → S1-02, S2-02, S6-06.

## Chi tiết kỹ thuật
1. **Cấu trúc** (SAD §1.2.1, §4.4.2):
   ```
   apps/api/
     src/main-api.ts  src/main-worker.ts  src/main-migrate.ts
     src/app.ts                 # buildApp(deps): FastifyInstance — không listen, dùng chung cho test và sinh OpenAPI
     src/config.ts              # đọc process.env bằng Zod, sai thì thoát ngay với danh sách biến lỗi
     src/composition-root.ts    # tạo db, boss, clock, logger rồi tiêm vào use case
     src/platform/db/{kysely.ts,database.types.ts,migrator.ts,retry.ts}
     src/platform/queue/{job-queue.port.ts,pg-boss.adapter.ts,queues.ts}
     src/platform/http/{health.routes.ts,openapi.ts}
     src/modules/               # trống, mỗi mô-đun: domain/ application/ adapters/{http,persistence,jobs}
     migrations/
     scripts/gen-openapi.ts
   ```
2. **Config** (`config.ts`): `NODE_ENV` (`development|test|production`), `LOG_LEVEL`, `PORT` (mặc định 3000), `APP_ORIGIN`, `DATABASE_URL`, `WORKER_DATABASE_URL`, `MIGRATION_DATABASE_URL`, `DB_POOL_MAX` (10), `WORKER_DB_POOL_MAX` (5), `HEARTBEAT_FILE` (`/tmp/alive`). Script dev chạy bằng `tsx watch --env-file=.env`.
3. **Kysely** (`platform/db/kysely.ts`): `new Kysely<Database>({ dialect: new PostgresDialect({ pool }) })`, `pg.Pool` với `max` theo vai trò, `connectionTimeoutMillis: 2000`, `options: '-c statement_timeout=5000 -c idle_in_transaction_session_timeout=10000'` (SAD §2.3, §4.2.3). Ép kiểu `date` trả về chuỗi `YYYY-MM-DD` (`pg.types.setTypeParser(1082, v => v)`), `numeric` giữ chuỗi. `retry.ts`: `withRetryOnConflict(fn)` thử lại đúng 1 lần khi lỗi `40001` hoặc `40P01`. `database.types.ts` sinh bằng `kysely-codegen` từ DB đã migrate (script `db:types`), commit.
4. **Migration** (SAD §3.1.1 mục 7): `Migrator` + `FileMigrationProvider` đọc `apps/api/migrations/`, tên tệp `YYYYMMDDHHmm_<tên>.ts`. Quy ước expand → migrate → contract: mỗi migration phải chạy được khi phiên bản code cũ còn đang chạy (thêm bảng/cột nullable trước, backfill sau, xóa cột cũ ở bản phát hành sau). Không sửa migration đã merge. Hàm `down` chỉ dùng ở dev. Migration đầu tiên:
   ```sql
   CREATE EXTENSION IF NOT EXISTS citext;   -- users.email (S1-01)
   ```
5. **`main-migrate.ts`** (lệnh `docker compose run --rm api migrate`, SAD §4.4.3): chạy `migrateToLatest()` bằng `MIGRATION_DATABASE_URL`, in kết quả từng migration, lỗi thì exit 1; sau đó khởi động pg-boss với `migrate: true` để tạo/nâng schema `pgboss`, tạo các queue ở `queues.ts` nếu chưa có (pg-boss 10 yêu cầu `createQueue` trước `send`/`work`), rồi `stop()`.
6. **pg-boss** (`pg-boss.adapter.ts`, AD-006): `schema: 'pgboss'`, giữ job hoàn thành 7 ngày (SAD §2.3). `api` khởi động với `supervise: false, schedule: false, migrate: false` (chỉ gửi job); `worker` với `supervise: true, schedule: true, migrate: false`. `queues.ts` khai báo tên: `email.transactional`, `media.process`, `media.purge-prefix`, `maintenance.daily`.
   ```ts
   export interface JobQueuePort {
     enqueue<T extends object>(trx: Transaction<Database>, queue: QueueName, data: T,
       opts?: { singletonKey?: string; retryLimit?: number; retryDelay?: number; retryBackoff?: boolean }): Promise<string>;
   }
   ```
   Adapter gọi `boss.send(queue, data, { ...opts, db: { executeSql: (text, values) => trx.executeQuery(CompiledQuery.raw(text, values)) } })` (`CompiledQuery` của Kysely, câu SQL do pg-boss sinh, tham số truyền riêng), để job được ghi trong **cùng transaction** với dữ liệu nghiệp vụ; rollback thì không có job.
7. **`buildApp(deps)`** (`app.ts`):
   - `Fastify({ bodyLimit: 65_536, requestIdHeader: false, trustProxy: false })` + `.withTypeProvider<ZodTypeProvider>()` (`fastify-type-provider-zod`), `setValidatorCompiler`, `setSerializerCompiler`.
   - `@fastify/swagger` với `openapi: { openapi: '3.1.0', info: { title: 'Pet Health API', version: '1.0.0' }, servers: [{ url: '/api/v1' }] }`, `stripBasePath: true`, `transform: jsonSchemaTransform`. Đường dẫn trong `openapi.yaml` tương đối với base URL (`/healthz`, `/pets/{petId}`…), khớp cách SAD §2.4.2 liệt kê endpoint.
   - Mọi route mô-đun đăng ký dưới prefix `/api/v1`. Mỗi route **bắt buộc** khai báo `schema.response` (serializer loại bỏ trường không khai báo, tránh lộ dữ liệu).
   - Hook `onSend`: mọi phản hồi `/api/*` có `Cache-Control: no-store` (SAD §2.4.1). Chỉ nhận `application/json` (thêm multipart ở S2-02).
8. **Health** (`health.routes.ts`, `config: { public: true }`): `GET /api/v1/healthz` → `200 { status: "ok" }`, không chạm DB. `GET /api/v1/readyz` → `SELECT 1` (timeout 2 s) → `200 { status: "ok" }`; DB lỗi hoặc đang tắt → `503`.
9. **`main-api.ts`**: tạo deps → `buildApp` → `listen({ host: '0.0.0.0', port })`. Tắt êm (SAD §4.2.2): nhận `SIGTERM`/`SIGINT` → đặt cờ `shuttingDown` (readyz trả 503) → `app.close()` (ngừng nhận kết nối, chờ request đang chạy) với hạn 15 s, quá hạn thì `process.exit(1)` → `boss.stop({ graceful: true })` → `db.destroy()` → exit 0.
10. **`main-worker.ts`**: khởi động pg-boss, đăng ký handler từ `modules/*/adapters/jobs` (chưa có), ghi `Date.now()` vào `HEARTBEAT_FILE` mỗi 30 s; `SIGTERM` → `boss.stop({ graceful: true, timeout: 15_000 })` → `db.destroy()`. Kèm `src/healthcheck-worker.ts`: exit 0 nếu tệp heartbeat có tuổi < 90 s.
11. **OpenAPI** (SAD P2): `scripts/gen-openapi.ts` gọi `buildApp` với deps giả (không kết nối DB), `await app.ready()`, ghi `app.swagger({ yaml: true })` ra `openapi.yaml` ở gốc repo. Script `pnpm openapi:gen`. Kết quả phải ổn định giữa hai lần chạy (không chứa thời gian, thứ tự route cố định).

## Giao diện
Không có.

## Tiêu chí chấp nhận
- [ ] `pnpm db:migrate` trên DB trống chạy hết migration và tạo schema `pgboss` cùng 4 queue; chạy lại lần hai không làm gì và exit 0.
- [ ] `pnpm --filter @ph/api dev` khởi động `api` ở cổng 3000 và `worker`; `GET /api/v1/healthz` → 200; `GET /api/v1/readyz` → 200 khi DB chạy, 503 khi dừng container `postgres`.
- [ ] Mọi phản hồi `/api/*` có `Cache-Control: no-store`.
- [ ] Body JSON 64 KB + 1 byte → 413; body không phải JSON → 415.
- [ ] `JobQueuePort.enqueue` trong transaction bị rollback không để lại job nào trong `pgboss.job`; transaction commit thì có đúng 1 job.
- [ ] `SIGTERM` khi đang có request chậm 2 s: request đó vẫn trả 200, tiến trình thoát mã 0; request đến sau tín hiệu bị từ chối.
- [ ] Worker cập nhật tệp heartbeat mỗi 30 s; `healthcheck-worker` trả 1 khi tệp cũ hơn 90 s.
- [ ] `pnpm openapi:gen` tạo `openapi.yaml` (OpenAPI 3.1) có `servers[0].url = /api/v1` và path `/healthz`, `/readyz`; chạy hai lần không có diff.
- [ ] Thiếu `DATABASE_URL` thì `api` thoát ngay với thông báo nêu tên biến.

## Kiểm thử
- **Integration (Vitest + Testcontainers `postgres:16`)**: migrate từ DB trống; readyz 200/503 (dừng container giữa test); enqueue + rollback/commit; `withRetryOnConflict` thử lại đúng 1 lần với lỗi `40001` giả lập và không thử lại lỗi khác.
- **Unit**: `config.ts` với env thiếu/sai kiểu; hook `Cache-Control`; giới hạn body (dùng `app.inject`).
- **Integration**: graceful shutdown với route test chờ 2 s (chỉ đăng ký trong test).
- **Contract**: so sánh `openapi.yaml` sinh hai lần liên tiếp.

## Ghi chú
- `/healthz` `/readyz` nằm dưới `/api/v1` để đi qua Caddy (client dùng `GET /api/v1/healthz` ở ST-06 của UI Blueprint); healthcheck Docker gọi thẳng `http://localhost:3000/api/v1/readyz`.
- Đánh dấu `public: true` ở bước 8 có hiệu lực khi [S0-04](S0-04-platform-core.md) bật deny-by-default.
- Executor pg-boss dùng `CompiledQuery.raw(text, values)` (có tham số), không dùng `sql.raw`, nên không cần ngoại lệ ESLint.
