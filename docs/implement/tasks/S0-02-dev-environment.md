# S0-02 · Môi trường dev: `compose.dev.yml` (PostgreSQL, Mailpit), `.env.example`

| Thuộc tính | Giá trị |
|---|---|
| Sprint | S0 · T1–2 |
| Story | — |
| Yêu cầu | AD-005, NFR-SEC-010, SAD §4.4.1, §4.1.6 |
| Phụ thuộc | [S0-01](S0-01-monorepo.md) |
| Ước lượng | 0,5 |
| Màn hình Figma | — |

## Mục tiêu
Một lệnh dựng được PostgreSQL 16 và Mailpit trên máy dev; mọi biến môi trường có mẫu trong `*.env.example`, không bí mật thật nào nằm trong repository. Đây là điều kiện của mốc M1.

## Phạm vi
**Trong phạm vi:**
- `infra/compose.dev.yml` với `postgres` và `mailpit`.
- `apps/api/.env.example`, `apps/web/.env.example`, `infra/env/app.env.example` (mẫu cho staging/production).
- Script pnpm để bật, tắt, reset môi trường và chạy app ở chế độ dev.

**Ngoài phạm vi:**
- Đọc và kiểm env bằng Zod → [S0-03](S0-03-backend-skeleton.md).
- Role `app_rw` / `app_worker` và RLS → S1-01.
- Profile `full` (api, worker, caddy chạy bằng image) → [S0-10](S0-10-docker-images.md).
- Compose staging/production → S2-06, S7-01.

## Chi tiết kỹ thuật
1. **`infra/compose.dev.yml`**:
   ```yaml
   name: ph-dev
   services:
     postgres:
       image: postgres:16            # ghim digest ở compose staging/prod (SAD §2.0)
       environment:
         POSTGRES_DB: pethealth
         POSTGRES_USER: ph_owner
         POSTGRES_PASSWORD: ph_owner_dev
       ports: ["127.0.0.1:5432:5432"]   # chỉ localhost
       volumes: [pgdata-dev:/var/lib/postgresql/data]
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U ph_owner -d pethealth"]
         interval: 5s
         retries: 10
     mailpit:
       image: axllent/mailpit:<ghim bản>
       ports: ["127.0.0.1:1025:1025", "127.0.0.1:8025:8025"]   # SMTP, giao diện web
   volumes:
     pgdata-dev:
   ```
   Không publish cổng ra `0.0.0.0`. Không cấu hình `shared_buffers` ở dev (giữ mặc định); `statement_timeout` đặt ở pool kết nối ([S0-03](S0-03-backend-skeleton.md)).
2. **`apps/api/.env.example`** (giá trị dev giả, đọc bằng `node --env-file=.env`):
   ```
   NODE_ENV=development
   LOG_LEVEL=debug
   PORT=3000
   APP_ORIGIN=http://localhost:5173
   DATABASE_URL=postgres://ph_owner:ph_owner_dev@localhost:5432/pethealth
   WORKER_DATABASE_URL=postgres://ph_owner:ph_owner_dev@localhost:5432/pethealth
   MIGRATION_DATABASE_URL=postgres://ph_owner:ph_owner_dev@localhost:5432/pethealth
   DB_POOL_MAX=10
   WORKER_DB_POOL_MAX=5
   TRUST_CF_CONNECTING_IP=false
   HEARTBEAT_FILE=./.data/alive
   SMTP_HOST=localhost
   SMTP_PORT=1025
   SMTP_SECURE=false
   SMTP_USER=
   SMTP_PASS=
   SMTP_FROM=Pet Health <dev@pethealth.local>
   SMTP_DAILY_LIMIT=400
   MEDIA_ROOT=./.data/media
   MEDIA_SIGNING_KEY=dev-only-not-secret-change-me-0000000000
   ANALYTICS_HMAC_KEY=dev-only-not-secret-change-me-1111111111
   ```
   Ở S0 cả 3 URL dùng chung `ph_owner`; S1-01 đổi `DATABASE_URL` sang `app_rw` và `WORKER_DATABASE_URL` sang `app_worker`. Biến SMTP/MEDIA/ANALYTICS chỉ được kiểm ở task dùng chúng (S1-02, S2-02, S6-05).
3. **`apps/web/.env.example`**: `DEV_API_TARGET=http://localhost:3000`. Không dùng tiền tố `VITE_` để giá trị không bị nhúng vào bundle (NFR-SEC-010); `vite.config.ts` đọc qua `process.env` để cấu hình proxy `/api` và `/media` ([S0-07](S0-07-web-shell.md)).
4. **`infra/env/app.env.example`**: liệt kê đủ biến của `api`/`worker` cho staging/production kèm chú thích, mọi giá trị bí mật để trống: `POSTGRES_PASSWORD`, `SMTP_USER` (tài khoản Gmail riêng), `SMTP_PASS` (Gmail App Password), `MEDIA_SIGNING_KEY` (≥ 32 byte ngẫu nhiên), `ANALYTICS_HMAC_KEY`, `TUNNEL_TOKEN`. Ghi rõ tệp thật nằm ở `/srv/pethealth/secrets/*.env`, quyền `600`, chủ `root` (SAD §4.1.6).
5. **Script ở `package.json` gốc**:
   | Script | Lệnh |
   |---|---|
   | `dev:up` | `docker compose -f infra/compose.dev.yml up -d --wait` |
   | `dev:down` | `docker compose -f infra/compose.dev.yml down` |
   | `dev:reset` | `docker compose -f infra/compose.dev.yml down -v` rồi `dev:up` |
   | `db:migrate` | `pnpm --filter @ph/api migrate` (có từ [S0-03](S0-03-backend-skeleton.md)) |
   | `dev` | `pnpm --parallel --filter @ph/api --filter @ph/web dev` (api, worker dùng `tsx watch --env-file=.env`; web dùng `vite`) |
6. Thư mục `.data/` (heartbeat, media dev) đã nằm trong `.gitignore` từ [S0-01](S0-01-monorepo.md).
7. `README.md` gốc thêm mục "Chạy trên máy dev": cài Docker Desktop, `corepack enable`, `pnpm install`, sao chép `.env.example` → `.env`, `pnpm dev:up`, `pnpm db:migrate`, `pnpm dev`; Mailpit ở `http://localhost:8025`.

## Giao diện
Không có.

## Tiêu chí chấp nhận
- [ ] `docker compose -f infra/compose.dev.yml up -d --wait` dựng `postgres` và `mailpit`, cả hai ở trạng thái healthy/running.
- [ ] `psql postgres://ph_owner:ph_owner_dev@localhost:5432/pethealth -c 'select version()'` trả PostgreSQL 16.x.
- [ ] Gửi một email thử tới `localhost:1025` (ví dụ bằng `swaks` hoặc script Node) thấy ngay trong giao diện Mailpit `http://localhost:8025`.
- [ ] Cổng 5432, 1025, 8025 chỉ lắng nghe trên `127.0.0.1`.
- [ ] `pnpm dev:reset` xóa sạch dữ liệu DB dev.
- [ ] Repository không có tệp `.env` nào; `gitleaks` không báo lỗi trên các tệp `*.env.example`.
- [ ] Không biến nào có tiền tố `VITE_` chứa giá trị bí mật.

## Kiểm thử
- Kiểm thủ công theo các tiêu chí trên trên Windows (Docker Desktop) và trong CI không cần (CI dùng Testcontainers).

## Ghi chú
- Integration test không dùng DB của compose dev mà dùng Testcontainers ([S0-09](S0-09-ci-pipeline.md)), để test không phụ thuộc trạng thái máy dev.
- SAD §4.4.1 ghi lệnh `docker compose -f compose.dev.yml`; tệp đặt trong `infra/` theo SAD §4.4.2.
